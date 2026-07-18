// "Exam" dimension repurposed as the source *lecture* for this ML4EDA deck.
// Concept cards cite the lecture they come from (e.g. "L03"); code cards cite
// the matching lab ("Lab03"); "AI-generated" marks model-written practice.

export const EXAM_NAMES: Record<string, string> = {
  Mock: "Mock Exam (official)",
  L01: "Preliminaries", L02: "Classical Algorithms", L03: "Neural Networks I",
  L04: "Neural Networks II", L05: "Neural Networks III", L06: "CNNs",
  L07: "RNNs & Embeddings", L08: "Language & Vision-Language Models",
  L09: "GNNs & PINNs", L10: "Generative AI", L11: "Reinforcement Learning",
  L12: "ML & Agentic AI in EDA",
};

const EXAM_CODE = /^(Mock|L\d{2})\b/;

/** Lecture code from a source string ("L03 S12" -> "L03"), or null. */
export function examOf(source: string): string | null {
  const m = source.match(EXAM_CODE);
  return m ? m[1] : null;
}

/** The label without the lecture code ("L03 S12" -> "S12"). */
export function labelOf(source: string): string {
  return source.replace(/^(Mock|L\d{2})\s*/, "");
}
