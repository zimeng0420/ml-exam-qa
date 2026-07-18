// Per-question "Ask AI" tutor. Adds a 💬 button to every question's study row;
// clicking opens an inline chat panel scoped to that question, seeded with the
// question text + reference answer + tags as context. Uses the shared BYO key
// (ai.ts / Knowledge Base settings). No key → an inline mini-setup appears.

import { aiChat, aiReady, getAi, saveAi, DEFAULT_MODEL, type ChatMsg } from "./ai";
import { url } from "../paths";

interface Session {
  panel: HTMLElement;
  log: HTMLElement;
  msgs: ChatMsg[];
  system: string;
}
const sessions = new WeakMap<HTMLElement, Session>();

function ctxOf(q: HTMLElement): string {
  const qText = (q.querySelector(".q-text") as HTMLElement | null)?.innerText.trim() || "";
  const ans = (q.querySelector(".answer") as HTMLElement | null)?.innerText.replace(/^\s*Answer\s*/i, "").trim() || "";
  const tags = Array.from(q.querySelectorAll(".tag")).map((t) => t.textContent?.trim()).filter(Boolean).join(", ");
  return (
    'You are a friendly, precise teaching assistant for the university course ' +
    '"Machine Learning for EDA". Help the student understand this exam question / ' +
    'knowledge point and answer follow-ups. Be concise and exam-focused; use small ' +
    'examples. Reply in the SAME language the student writes in (Chinese is fine). ' +
    'If the reference answer is present, stay consistent with it.\n\n' +
    "QUESTION:\n" + qText + "\n\n" +
    (ans ? "REFERENCE ANSWER:\n" + ans + "\n\n" : "") +
    (tags ? "TAGS: " + tags + "\n" : "")
  );
}

function bubble(log: HTMLElement, role: "user" | "assistant" | "sys", text: string): HTMLElement {
  const b = document.createElement("div");
  b.className = "chat-msg chat-" + role;
  b.textContent = text;
  log.appendChild(b);
  log.scrollTop = log.scrollHeight;
  return b;
}

async function send(q: HTMLElement, s: Session, text: string): Promise<void> {
  if (!text.trim()) return;
  if (!aiReady()) return;
  bubble(s.log, "user", text);
  s.msgs.push({ role: "user", content: text });
  const pending = bubble(s.log, "assistant", "Thinking…");
  try {
    const reply = await aiChat(s.msgs, s.system);
    pending.textContent = reply || "(empty response)";
    s.msgs.push({ role: "assistant", content: reply });
  } catch (e) {
    pending.classList.add("chat-err");
    pending.textContent = "Error: " + (e instanceof Error ? e.message : String(e));
  }
  s.log.scrollTop = s.log.scrollHeight;
}

function keySetup(q: HTMLElement, s: Session, onReady: () => void): HTMLElement {
  const cfg = getAi();
  const wrap = document.createElement("div");
  wrap.className = "chat-setup";
  wrap.innerHTML =
    '<p>To use the AI tutor, enter your own API key once (stored only in this browser). You can also set it in ' +
    '<a href="' + url("/knowledge") + '">🧠 Knowledge Base</a>.</p>' +
    '<label>Provider <select class="cs-prov">' +
    '<option value="anthropic">Anthropic (Claude)</option>' +
    '<option value="openai">OpenAI</option></select></label>' +
    '<label>API Key <input class="cs-key" type="password" placeholder="sk-…"></label>' +
    '<label>Model (optional) <input class="cs-model" type="text"></label>' +
    '<button type="button" class="cs-save">Save &amp; start</button>';
  const prov = wrap.querySelector(".cs-prov") as HTMLSelectElement;
  const keyIn = wrap.querySelector(".cs-key") as HTMLInputElement;
  const modelIn = wrap.querySelector(".cs-model") as HTMLInputElement;
  prov.value = cfg.provider;
  modelIn.placeholder = DEFAULT_MODEL[cfg.provider];
  prov.addEventListener("change", () => (modelIn.placeholder = DEFAULT_MODEL[prov.value as "anthropic" | "openai"]));
  wrap.querySelector(".cs-save")?.addEventListener("click", () => {
    saveAi({ provider: prov.value as "anthropic" | "openai", key: keyIn.value.trim(), model: modelIn.value.trim() });
    if (aiReady()) { wrap.remove(); onReady(); }
  });
  return wrap;
}

function buildPanel(q: HTMLElement): Session {
  const panel = document.createElement("div");
  panel.className = "chat-panel";
  const log = document.createElement("div");
  log.className = "chat-log";
  const s: Session = { panel, log, msgs: [], system: ctxOf(q) };

  const explainBtn = document.createElement("button");
  explainBtn.type = "button";
  explainBtn.className = "chat-quick";
  explainBtn.textContent = "✨ Explain this knowledge point";

  const row = document.createElement("div");
  row.className = "chat-input-row";
  const ta = document.createElement("textarea");
  ta.className = "chat-in";
  ta.rows = 1;
  ta.placeholder = "Not sure about something? Just ask… (Enter to send)";
  const sendBtn = document.createElement("button");
  sendBtn.type = "button";
  sendBtn.className = "chat-send";
  sendBtn.textContent = "Send";
  row.append(ta, sendBtn);

  panel.append(log, explainBtn, row);

  const ensureKey = (after: () => void): void => {
    if (aiReady()) { after(); return; }
    if (!panel.querySelector(".chat-setup")) panel.insertBefore(keySetup(q, s, after), log.nextSibling);
  };
  explainBtn.addEventListener("click", () =>
    ensureKey(() => void send(q, s, "Explain the knowledge point behind this question in a concise, exam-focused way, with a small example.")),
  );
  const submit = (): void => {
    const t = ta.value.trim();
    if (!t) return;
    ta.value = "";
    ensureKey(() => void send(q, s, t));
  };
  sendBtn.addEventListener("click", submit);
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  });
  return s;
}

function toggle(q: HTMLElement, btn: HTMLButtonElement): void {
  let s = sessions.get(q);
  if (!s) {
    s = buildPanel(q);
    sessions.set(q, s);
    (q.querySelector(".q-body") || q).appendChild(s.panel);
  }
  const open = s.panel.classList.toggle("open");
  btn.classList.toggle("on", open);
  if (open) (s.panel.querySelector(".chat-in") as HTMLElement | null)?.focus();
}

export function initChatbot(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("details.q").forEach((q) => {
    const study = q.querySelector(".study");
    if (!study || study.querySelector(".ask-ai-btn")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ask-ai-btn";
    btn.textContent = "💬 Ask AI";
    btn.title = "Summon an AI tutor for this question";
    study.appendChild(btn);
    btn.addEventListener("click", () => toggle(q, btn));
  });
}
