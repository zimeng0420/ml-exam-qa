// Shared browser-side LLM caller. Uses the same BYO key the Knowledge Base
// stores (localStorage "ml_kb_ai"). Keys never leave the browser.

export interface AiCfg {
  provider: "anthropic" | "openai";
  key: string;
  model: string;
}
const AI_KEY = "ml_kb_ai";
export const DEFAULT_MODEL = {
  anthropic: "claude-3-5-haiku-latest",
  openai: "gpt-4o-mini",
} as const;

export function getAi(): AiCfg {
  try {
    const s = JSON.parse(localStorage.getItem(AI_KEY) || "{}");
    return {
      provider: s.provider === "openai" ? "openai" : "anthropic",
      key: typeof s.key === "string" ? s.key : "",
      model: typeof s.model === "string" ? s.model : "",
    };
  } catch {
    return { provider: "anthropic", key: "", model: "" };
  }
}

export function saveAi(cfg: AiCfg): void {
  try {
    localStorage.setItem(AI_KEY, JSON.stringify(cfg));
  } catch {
    /* ignore quota / private mode */
  }
}

export function aiReady(): boolean {
  return getAi().key.trim().length > 8;
}

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

/** Send a chat completion with a system prompt; returns assistant text. */
export async function aiChat(messages: ChatMsg[], system: string): Promise<string> {
  const cfg = getAi();
  const model = cfg.model.trim() || DEFAULT_MODEL[cfg.provider];
  if (cfg.provider === "anthropic") {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": cfg.key.trim(),
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({ model, max_tokens: 1024, system, messages }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error?.message || "HTTP " + r.status);
    return j?.content?.[0]?.text || "";
  }
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + cfg.key.trim() },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || "HTTP " + r.status);
  return j?.choices?.[0]?.message?.content || "";
}
