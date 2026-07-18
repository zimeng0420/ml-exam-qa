// "Write it in your own words" grader for concept questions. Appears under the
// revealed answer. Grades the student's own-words recall against the reference
// answer: with the shared BYO AI key if set, otherwise an offline keyword check
// that lists the key terms they missed. A low score adds the question to the
// wrong book so it feeds the Knowledge Base gap analysis.

import { aiChat, aiReady } from "./ai";
import { Store } from "./store";

const STOP = new Set([
  "the","a","an","of","to","is","are","and","or","in","on","for","with","as","it","its","by",
  "be","that","this","which","not","no","also","can","used","use","using","via","your","you",
  "we","they","their","from","at","any","all","one","each","per","must","may","only","more",
  "less","but","if","so","than","then","into","over","out","up","do","does","has","when","how",
  "what","why","because","these","those","such","will","would","should",
]);
const words = (s: string): string[] =>
  [...new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !STOP.has(w)))];

function offline(ref: string, text: string): { score: number; body: string } {
  const rw = words(ref), mine = new Set(words(text));
  const missing = rw.filter((w) => !mine.has(w));
  const score = rw.length ? Math.round(((rw.length - missing.length) / Math.min(rw.length, 30)) * 100) : 0;
  const capped = Math.min(100, score);
  const miss = missing.slice(0, 14).join(", ");
  return {
    score: capped,
    body:
      `SCORE: ${capped}/100 (offline keyword check)\n\n` +
      (miss ? "Key terms you did not mention (check whether you missed them):\n" + miss : "Nice — you touched most key terms.") +
      "\n\nCompare with the reference answer above to confirm nothing is wrong.",
  };
}

function refOf(rg: HTMLElement): string {
  const reveal = rg.closest(".open-reveal");
  const ans = (reveal?.querySelector(".answer") as HTMLElement | null)?.innerText || "";
  const ext = (reveal?.querySelector(".extend") as HTMLElement | null)?.innerText || "";
  return (ans.replace(/^\s*Answer\s*/i, "") + "\n" + ext).trim();
}

export function initRecallGrade(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>(".recall-grade").forEach((rg) => {
    if (rg.dataset.wired) return;
    rg.dataset.wired = "1";
    const btn = rg.querySelector<HTMLButtonElement>(".rg-btn");
    const area = rg.querySelector<HTMLTextAreaElement>(".rg-area");
    const out = rg.querySelector<HTMLPreElement>(".rg-result");
    const qel = rg.closest("details.q") as HTMLElement | null;
    if (!btn || !area || !out) return;

    btn.addEventListener("click", async () => {
      const text = area.value.trim();
      out.hidden = false;
      if (!text) { out.textContent = "Write your own-words version first, then grade."; return; }
      const ref = refOf(rg);
      const markLow = (score: number): void => {
        if (score < 60 && qel?.id) {
          Store.setWrong(qel.id, true);
          qel.querySelector(".wrong-btn")?.classList.add("on");
        }
      };
      if (!aiReady()) {
        const r = offline(ref, text);
        out.textContent = r.body;
        markLow(r.score);
        return;
      }
      out.textContent = "AI grading…";
      btn.disabled = true;
      try {
        const prompt =
          "You are an exam tutor. A student is recalling a concept in their OWN words. " +
          "Check it against the reference answer for correctness and completeness.\n\n" +
          "REFERENCE ANSWER (ground truth):\n" + ref + "\n\n" +
          'STUDENT\'S OWN-WORDS VERSION:\n"""' + text + '"""\n\n' +
          "Reply concisely with: (1) what they got right, (2) anything MISSING or WRONG with the " +
          "correct point to fix it. Reply in the same language the student used. " +
          'The VERY FIRST line must be exactly "SCORE: <number>" (0-100 for correctness & completeness).';
        const reply = await aiChat([{ role: "user", content: text }], prompt);
        out.textContent = reply || "(empty response)";
        const m = reply.match(/SCORE:\s*(\d+)/i);
        markLow(m ? parseInt(m[1], 10) : 100);
      } catch (e) {
        out.textContent = "AI grading failed: " + (e instanceof Error ? e.message : String(e)) +
          "\n(Set your API key in Knowledge Base ⚙, or it falls back to the offline keyword check.)";
      } finally {
        btn.disabled = false;
      }
    });
  });
}
