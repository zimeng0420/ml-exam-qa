// Shared code fill-in-the-blank helpers, used by the chapter cloze (cloze.ts)
// and the flashcard deck. Pure DOM builders — no framework dependency.

export interface ClozeBlank { label: string; accept: string[]; hint?: string }
export interface ClozeVariant { code: string; blanks: ClozeBlank[]; note?: string }

const LAST = (id: string): string => "ml_cv_" + id;

export const norm = (v: string): string =>
  v.trim().toLowerCase().replace(/\s+/g, "").replace(/^['"]|['"]$/g, "");

export function stripFence(code: string): string {
  return code.replace(/^\s*```[a-zA-Z0-9]*\n?/, "").replace(/```\s*$/, "").replace(/\n$/, "");
}

/** Random variant index, never the same as last time (tracked per key). */
export function pickVariant(key: string, n: number): number {
  if (n <= 1) return 0;
  let last = -1;
  try { last = parseInt(localStorage.getItem(LAST(key)) || "-1", 10); } catch { /* ignore */ }
  let i = last;
  while (i === last) i = Math.floor(Math.random() * n);
  try { localStorage.setItem(LAST(key), String(i)); } catch { /* ignore */ }
  return i;
}

export const accepted = (inp: HTMLInputElement): string[] => {
  try { return JSON.parse(inp.dataset.accept || "[]"); } catch { return []; }
};
export const isOk = (inp: HTMLInputElement): boolean =>
  inp.value.trim() !== "" && accepted(inp).some((a) => norm(a) === norm(inp.value));

/** Mark one blank ✓/✗ immediately (used on blur). Does not lock the field. */
export function markOne(inp: HTMLInputElement): void {
  const filled = inp.value.trim() !== "";
  const ok = isOk(inp);
  inp.classList.toggle("ok", ok);
  inp.classList.toggle("bad", filled && !ok);
  const mk = inp.nextElementSibling as HTMLElement | null;
  if (mk && mk.classList.contains("calc-mark")) {
    mk.textContent = !filled ? "" : ok ? "✓" : "✗";
    mk.style.color = ok ? "#40c057" : "#ff6b6b";
  }
}

/** Build the code block with inline <input> boxes replacing each ____(n). */
export function renderInto(mount: HTMLElement, v: ClozeVariant, idx: number, n: number): void {
  mount.innerHTML = "";
  const bar = document.createElement("div");
  bar.className = "cv-label";
  bar.textContent = (v.note ? "Variant: " + v.note : "Code fill-in") + (n > 1 ? `  ·  ${idx + 1}/${n}` : "");

  const pre = document.createElement("pre");
  pre.className = "code cv-code cv-inline";

  const byNum = new Map<string, ClozeBlank>();
  v.blanks.forEach((b) => byNum.set(String(b.label).replace(/\D/g, ""), b));

  const parts = stripFence(v.code).split(/____\((\d+)\)/);
  let seq = 0;
  for (let k = 0; k < parts.length; k++) {
    if (k % 2 === 0) { pre.appendChild(document.createTextNode(parts[k])); continue; }
    const num = parts[k];
    const b = byNum.get(num) || v.blanks[seq];
    seq++;
    const inp = document.createElement("input");
    inp.type = "text";
    inp.className = "blank-in blank-inline";
    inp.autocomplete = "off";
    inp.spellcheck = false;
    inp.dataset.accept = JSON.stringify(b ? b.accept : []);
    if (b?.hint) inp.title = b.hint;
    inp.setAttribute("aria-label", b?.hint || "blank " + num);
    inp.placeholder = num;
    const widest = b ? Math.max(...b.accept.map((a) => a.replace(/['"]/g, "").length), 3) : 6;
    inp.style.width = Math.min(24, widest + 2) + "ch";
    inp.addEventListener("blur", () => markOne(inp));
    const mk = document.createElement("span");
    mk.className = "calc-mark cv-mark";
    pre.appendChild(inp);
    pre.appendChild(mk);
  }
  mount.append(bar, pre);

  if (v.blanks.some((b) => b.hint)) {
    const leg = document.createElement("div");
    leg.className = "cv-hints";
    leg.textContent = v.blanks
      .map((b) => "(" + String(b.label).replace(/\D/g, "") + ") " + (b.hint || ""))
      .join("    ");
    mount.append(leg);
  }
}

/** Mark all blanks; return whether any filled blank is wrong. */
export function checkAll(mount: HTMLElement): { anyWrong: boolean; allFilled: boolean } {
  const inputs = Array.from(mount.querySelectorAll<HTMLInputElement>(".blank-in"));
  let anyWrong = false, allFilled = true;
  inputs.forEach((inp) => {
    markOne(inp);
    if (inp.value.trim() === "") allFilled = false;
    else if (!isOk(inp)) anyWrong = true;
  });
  return { anyWrong, allFilled };
}
