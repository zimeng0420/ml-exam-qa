// Rotating code fill-in-the-blank on chapter pages. Uses the shared cloze-core
// helpers. Each blank auto-checks on blur and stays editable; "Check / reveal"
// shows the full solution and (if wrong) adds the question to the wrong book.

import { Store } from "./store";
import { applyAllStudy } from "./study";
import { renderInto, checkAll, pickVariant, type ClozeVariant } from "./cloze-core";

export function initCloze(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>(".clozevar").forEach((cv) => {
    if (cv.dataset.wired) return;
    cv.dataset.wired = "1";
    let variants: ClozeVariant[] = [];
    try { variants = JSON.parse(cv.dataset.variants || "[]"); } catch { variants = []; }
    if (!variants.length) return;

    const qel = cv.closest("details.q") as HTMLElement | null;
    const id = qel?.id || "";
    const mount = cv.querySelector<HTMLElement>(".cloze-mount");
    const checkBtn = cv.querySelector<HTMLButtonElement>(".cv-check");
    const againBtn = cv.querySelector<HTMLButtonElement>(".cv-again");
    const reveal = cv.querySelector<HTMLElement>(".cv-reveal");
    const assess = cv.querySelector<HTMLElement>(".self-assess");
    if (!mount || !checkBtn || !againBtn || !reveal) return;

    let done = false;

    const runFull = (): void => {
      if (done) return;
      done = true;
      const { anyWrong } = checkAll(mount);
      mount.querySelectorAll<HTMLInputElement>(".blank-in").forEach((inp) => (inp.readOnly = true));
      if (anyWrong && id) {
        Store.setWrong(id, true);
        qel?.querySelector(".wrong-btn")?.classList.add("on");
      }
      reveal.hidden = false;
      if (assess) assess.hidden = false;
      checkBtn.hidden = true;
    };

    const show = (): void => {
      done = false;
      const idx = pickVariant(id, variants.length);
      renderInto(mount, variants[idx], idx, variants.length);
      reveal.hidden = true;
      if (assess) { assess.hidden = true; delete assess.dataset.done; }
      checkBtn.hidden = false;
      againBtn.hidden = false;
    };
    show();

    checkBtn.addEventListener("click", runFull);
    againBtn.addEventListener("click", show);

    const choose = (kind: "got" | "miss"): void => {
      if (!id) return;
      if (kind === "got") Store.setReviewed(id, true);
      else Store.setWrong(id, true);
      if (assess) assess.dataset.done = kind;
      applyAllStudy();
    };
    assess?.querySelector(".got-btn")?.addEventListener("click", () => choose("got"));
    assess?.querySelector(".miss-btn")?.addEventListener("click", () => choose("miss"));
  });
}
