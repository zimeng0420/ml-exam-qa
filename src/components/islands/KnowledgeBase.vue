<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { Store, onChange } from "../../lib/client/store";
import { url } from "../../lib/paths";

interface KP {
  id: string; chId: string; chapter: string; kp: string;
  recap: string; tags: string[]; qids: string[]; total: number; ref: string;
}
interface KBState { status: "weak" | "improving" | "cleared"; score: number; attempts: number; lows: number; ts: number; }

const kps = ref<KP[]>([]);
const loaded = ref(false);
const version = ref(0);
const kbState = ref<Record<string, KBState>>({});

// --- AI settings (BYO key, stored locally) ---
const AI_KEY = "ml_kb_ai";
const ai = ref<{ provider: "anthropic" | "openai"; key: string; model: string }>({
  provider: "anthropic", key: "", model: "",
});
const showSettings = ref(false);
const DEFAULT_MODEL = { anthropic: "claude-3-5-haiku-latest", openai: "gpt-4o-mini" };

function loadAi() {
  try { const s = JSON.parse(localStorage.getItem(AI_KEY) || "{}"); if (s && typeof s === "object") ai.value = { ...ai.value, ...s }; } catch { /* ignore */ }
}
function saveAi() {
  try { localStorage.setItem(AI_KEY, JSON.stringify(ai.value)); } catch { /* ignore */ }
  showSettings.value = false;
}
const aiReady = computed(() => ai.value.key.trim().length > 8);

const KB_STATE = "ml_kb_state";
function loadState() { try { kbState.value = JSON.parse(localStorage.getItem(KB_STATE) || "{}") || {}; } catch { kbState.value = {}; } }
function saveState() { try { localStorage.setItem(KB_STATE, JSON.stringify(kbState.value)); } catch { /* ignore */ } }

let off: (() => void) | null = null;
onMounted(async () => {
  loadAi(); loadState();
  try {
    const res = await fetch(url("/knowledge.json"));
    kps.value = await res.json();
  } catch { kps.value = []; }
  loaded.value = true;
  off = onChange(() => (version.value++));
});
onUnmounted(() => off?.());

const wrongSet = computed(() => { void version.value; return new Set(Store.wrongIds()); });

// weak knowledge points = KPs with >=1 wrong question, ranked by wrong count
const weakKps = computed(() => {
  const ws = wrongSet.value;
  return kps.value
    .map((k) => ({ k, wrong: k.qids.filter((q) => ws.has(q)).length }))
    .filter((x) => x.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong || b.wrong / b.k.total - a.wrong / a.k.total);
});

// weak concepts = tags aggregated across weak KPs, weighted by wrong count
const weakTags = computed(() => {
  const m = new Map<string, number>();
  for (const { k, wrong } of weakKps.value)
    for (const t of k.tags) m.set(t, (m.get(t) || 0) + wrong);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16);
});

const totalWrong = computed(() => weakKps.value.reduce((n, x) => n + x.wrong, 0));

function kpAnchor(k: KP) { return url(`/chapters/${k.chId}`) + "#" + k.id.split(":")[1]; }
function statusOf(id: string) { return kbState.value[id]?.status; }

// --- recall + grading ---
const openId = ref<string | null>(null);
const recall = ref<Record<string, string>>({});
const result = ref<Record<string, string>>({});
const busy = ref<Record<string, boolean>>({});

function toggle(id: string) { openId.value = openId.value === id ? null : id; }

function setState(id: string, score: number) {
  const prev = kbState.value[id];
  const status: KBState["status"] = score >= 80 ? "cleared" : score >= 50 ? "improving" : "weak";
  kbState.value[id] = {
    status, score,
    attempts: (prev?.attempts || 0) + 1,
    lows: (prev?.lows || 0) + (score < 50 ? 1 : 0),
    ts: Date.now(),
  };
  saveState();
}

// offline self-check: overlap of meaningful words with the reference
function selfCheck(k: KP) {
  const mine = new Set((recall.value[k.id] || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4));
  const refWords = new Set(k.ref.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4));
  let hit = 0; refWords.forEach((w) => { if (mine.has(w)) hit++; });
  const score = refWords.size ? Math.round((hit / Math.min(refWords.size, 40)) * 100) : 0;
  const capped = Math.min(100, score);
  setState(k.id, capped);
  result.value[k.id] =
    `SCORE: ${capped}/100 (offline keyword overlap)\n\nReference (fill any gaps):\n${k.recap}`;
}

function buildPrompt(k: KP, text: string) {
  return `You are a strict but encouraging exam tutor grading a student's recall of ONE knowledge point.\n\n` +
    `Knowledge point: "${k.kp}" (chapter: ${k.chapter}).\n` +
    `Reference material (ground truth):\n${k.ref}\n\n` +
    `The student's written recall:\n"""${text}"""\n\n` +
    `Grade it: (1) a score out of 100 for completeness & correctness; (2) what they got right; ` +
    `(3) key points missed or wrong; (4) the correct version of those missed points so they can fill the gap. ` +
    `Be concise. Reply in the SAME language the student used. ` +
    `The VERY FIRST line must be exactly "SCORE: <number>".`;
}

async function aiGrade(k: KP) {
  const text = (recall.value[k.id] || "").trim();
  if (!text) { result.value[k.id] = "Write your recall of this knowledge point first, then grade."; return; }
  if (!aiReady.value) { selfCheck(k); return; }
  busy.value[k.id] = true;
  result.value[k.id] = "AI grading…";
  try {
    const prompt = buildPrompt(k, text);
    const model = ai.value.model.trim() || DEFAULT_MODEL[ai.value.provider];
    let out = "";
    if (ai.value.provider === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": ai.value.key.trim(),
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({ model, max_tokens: 900, messages: [{ role: "user", content: prompt }] }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error?.message || ("HTTP " + r.status));
      out = j?.content?.[0]?.text || "";
    } else {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer " + ai.value.key.trim() },
        body: JSON.stringify({ model, max_tokens: 900, messages: [{ role: "user", content: prompt }] }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error?.message || ("HTTP " + r.status));
      out = j?.choices?.[0]?.message?.content || "";
    }
    const m = out.match(/SCORE:\s*(\d+)/i);
    setState(k.id, m ? Math.max(0, Math.min(100, parseInt(m[1], 10))) : 60);
    result.value[k.id] = out || "(empty response)";
  } catch (e) {
    result.value[k.id] = "AI grading failed: " + (e instanceof Error ? e.message : String(e)) +
      "\n(Check API key / provider / model in settings top-right, or use offline self-check.)";
  } finally {
    busy.value[k.id] = false;
  }
}
</script>

<template>
  <div class="kb">
    <div class="kb-head">
      <div>
        <h1>🧠 Knowledge Base</h1>
        <p class="kb-sub">
          Turns your <b>wrong-answer book</b> into a map of weak <b>knowledge points</b> and
          <b>concepts</b>: recall → AI grading → fill the gaps. Wrong answers are collected
          <b>automatically</b> when you miss an interactive question; you can also add/remove any
          question manually with <b>★ Wrong book</b>.
        </p>
      </div>
      <button class="kb-gear" type="button" @click="showSettings = !showSettings" :title="aiReady ? 'AI grading configured' : 'AI not configured (offline self-check)'">
        ⚙ {{ aiReady ? "AI ✓" : "AI not set" }}
      </button>
    </div>

    <div v-if="showSettings" class="kb-settings">
      <p class="kb-note">Enter your own API key (stored only in this browser's localStorage — never uploaded or committed). Leave empty to use offline keyword self-check.</p>
      <label>Provider
        <select v-model="ai.provider">
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="openai">OpenAI</option>
        </select>
      </label>
      <label>API Key <input type="password" v-model="ai.key" placeholder="sk-… / paste your key" /></label>
      <label>Model (optional, uses default)
        <input type="text" v-model="ai.model" :placeholder="DEFAULT_MODEL[ai.provider]" />
      </label>
      <button class="kb-save" type="button" @click="saveAi">Save</button>
    </div>

    <p v-if="!loaded" class="kb-empty">Loading…</p>
    <p v-else-if="weakKps.length === 0" class="kb-empty">
      🎉 Your wrong-answer book is empty. Do <b>interactive questions</b> (multiple-choice /
      calculation / code fill-in) in the chapters — missed ones are collected here automatically
      and turned into a weak-point analysis.
    </p>

    <template v-else>
      <div class="kb-stats">
        <span class="kb-chip">Weak points <b>{{ weakKps.length }}</b></span>
        <span class="kb-chip">Wrong <b>{{ totalWrong }}</b></span>
        <span class="kb-chip">Cleared <b>{{ Object.values(kbState).filter(s => s.status === 'cleared').length }}</b></span>
      </div>

      <section class="kb-tags">
        <h2>Weak concepts (weighted by wrong count)</h2>
        <div class="kb-tagcloud">
          <span v-for="[t, n] in weakTags" :key="t" class="kb-tag">
            {{ t }} <b>{{ n }}</b>
          </span>
        </div>
      </section>

      <section class="kb-list">
        <h2>Weak knowledge points · recall &amp; fill the gaps</h2>
        <article v-for="{ k, wrong } in weakKps" :key="k.id" class="kb-item" :data-status="statusOf(k.id)">
          <header class="kb-item-head" @click="toggle(k.id)">
            <span class="kb-badge" :data-s="statusOf(k.id) || 'weak'">
              {{ statusOf(k.id) === 'cleared' ? '✓ Cleared' : statusOf(k.id) === 'improving' ? '↗ Improving' : '● To review' }}
            </span>
            <span class="kb-item-title">{{ k.kp }}</span>
            <span class="kb-item-meta">{{ k.chapter }} · wrong {{ wrong }}/{{ k.total }}
              <template v-if="kbState[k.id]?.lows >= 2"> · <b class="kb-flag">missed repeatedly · priority</b></template>
            </span>
            <span class="kb-toggle">{{ openId === k.id ? '▲' : '▼' }}</span>
          </header>

          <div v-show="openId === k.id" class="kb-body">
            <p class="kb-recap"><b>Recall prompt:</b> {{ k.recap }}</p>
            <textarea v-model="recall[k.id]" rows="4" placeholder="Without looking at the answer, write the key points of this knowledge point in your own words…"></textarea>
            <div class="kb-actions">
              <button class="kb-grade" type="button" :disabled="busy[k.id]" @click="aiGrade(k)">
                {{ aiReady ? '🤖 AI grade' : '📝 Self-check' }}
              </button>
              <button v-if="aiReady" class="kb-self" type="button" @click="selfCheck(k)">Offline self-check</button>
              <a class="kb-jump" :href="kpAnchor(k)">↗ Open this point's questions</a>
            </div>
            <pre v-if="result[k.id]" class="kb-result">{{ result[k.id] }}</pre>
          </div>
        </article>
      </section>
    </template>
  </div>
</template>

<style scoped>
.kb { max-width: 900px; margin: 0 auto; padding: 8px 4px 60px; }
.kb-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.kb h1 { margin: 0 0 4px; font-size: 1.5rem; }
.kb-sub { color: var(--muted); margin: 0; max-width: 640px; line-height: 1.5; }
.kb-gear { border: 1px solid var(--line); background: #fffdf7; border-radius: 999px; padding: 7px 13px; cursor: pointer; white-space: nowrap; font-size: .85rem; }
.kb-settings { border: 1px solid var(--line); border-radius: 12px; padding: 14px; margin: 14px 0; display: flex; flex-direction: column; gap: 9px; background: #fbfbf8; }
.kb-settings label { display: flex; flex-direction: column; gap: 4px; font-size: .85rem; font-weight: 600; }
.kb-settings input, .kb-settings select { border: 1px solid var(--line); border-radius: 8px; padding: 7px 9px; font: inherit; font-weight: 400; }
.kb-note { color: var(--muted); font-size: .82rem; margin: 0; }
.kb-save { align-self: flex-start; background: var(--tum); color: #fff; border: 0; border-radius: 8px; padding: 8px 18px; cursor: pointer; font-weight: 600; }
.kb-empty { color: var(--muted); padding: 24px 0; line-height: 1.6; }
.kb-stats { display: flex; gap: 8px; margin: 16px 0; flex-wrap: wrap; }
.kb-chip { background: #fff; border: 1px solid var(--line); border-radius: 999px; padding: 5px 12px; font-size: .85rem; }
.kb-tags h2, .kb-list h2 { font-size: 1.05rem; margin: 22px 0 10px; }
.kb-tagcloud { display: flex; flex-wrap: wrap; gap: 7px; }
.kb-tag { background: #fff5f5; border: 1px solid #ffc9c9; color: #c92a2a; border-radius: 999px; padding: 4px 11px; font-size: .82rem; }
.kb-tag b { color: #e03131; }
.kb-item { border: 1px solid var(--line); border-radius: 12px; margin-bottom: 10px; overflow: hidden; background: #fff; }
.kb-item[data-status="cleared"] { border-color: #b2f2bb; }
.kb-item[data-status="improving"] { border-color: #ffe066; }
.kb-item-head { display: flex; align-items: center; gap: 10px; padding: 12px 14px; cursor: pointer; }
.kb-item-head:hover { background: #fbfbf8; }
.kb-badge { font-size: .72rem; font-weight: 700; padding: 3px 8px; border-radius: 999px; white-space: nowrap; }
.kb-badge[data-s="weak"] { background: #fff0f0; color: #c92a2a; }
.kb-badge[data-s="improving"] { background: #fff9db; color: #b08900; }
.kb-badge[data-s="cleared"] { background: #ebfbee; color: #2b8a3e; }
.kb-item-title { font-weight: 600; flex: 1 1 auto; }
.kb-item-meta { color: var(--muted); font-size: .8rem; white-space: nowrap; }
.kb-flag { color: #e03131; }
.kb-toggle { color: var(--muted); font-size: .75rem; }
.kb-body { padding: 0 14px 14px; border-top: 1px dashed var(--line); }
.kb-recap { font-size: .9rem; line-height: 1.55; margin: 12px 0; }
.kb-body textarea { width: 100%; border: 1px solid var(--line); border-radius: 8px; padding: 9px; font: inherit; resize: vertical; box-sizing: border-box; }
.kb-actions { display: flex; gap: 8px; align-items: center; margin: 10px 0; flex-wrap: wrap; }
.kb-grade { background: var(--tum); color: #fff; border: 0; border-radius: 8px; padding: 8px 16px; cursor: pointer; font-weight: 600; }
.kb-grade:disabled { opacity: .6; cursor: default; }
.kb-self { background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 8px 14px; cursor: pointer; }
.kb-jump { margin-left: auto; color: var(--tum); font-size: .85rem; text-decoration: none; }
.kb-result { white-space: pre-wrap; background: #fbfbf8; border: 1px solid var(--line); border-radius: 8px; padding: 12px; font: inherit; font-size: .88rem; line-height: 1.55; margin: 8px 0 0; }
</style>
