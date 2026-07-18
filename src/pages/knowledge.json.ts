import type { APIRoute } from "astro";
import { getOrderedChapters, sortedQuestions } from "../lib/content";
import { qid } from "../lib/qid";
import { plain } from "../lib/md";

// One entry per knowledge point: enough for the Knowledge Base island to map
// wrong-book question ids -> weak knowledge points, and to give the AI grader a
// clean reference (recap + answer key points) to grade a user's recall against.
export const GET: APIRoute = async () => {
  const chapters = await getOrderedChapters();
  const out: unknown[] = [];
  for (const ch of chapters) {
    for (const kp of ch.data.knowledge_points) {
      const qs = sortedQuestions(kp.questions);
      const qids = qs.map((q) => qid(kp.id, q.q));
      const tags = [...new Set(qs.flatMap((q) => q.tags ?? []))];
      const ref = plain(kp.recap + " " + qs.map((q) => q.answer).join("  ")).slice(0, 2000);
      out.push({
        id: ch.data.id + ":" + kp.id,
        chId: ch.data.id,
        chapter: ch.data.title,
        kp: kp.title,
        recap: kp.recap,
        tags,
        qids,
        total: qs.length,
        ref,
      });
    }
  }
  return new Response(JSON.stringify(out), {
    headers: { "content-type": "application/json" },
  });
};
