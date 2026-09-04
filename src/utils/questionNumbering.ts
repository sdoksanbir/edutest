import type { QuestionContentType, QuestionItem, SectionRange } from "../types";

export function normalizeContentType(v?: string | null): QuestionContentType {
  return v === "explanation" ? "explanation" : "question";
}

/**
 * Görünür sıra korunur; yalnızca content_type === "question" numaralanır.
 * Bölüm başında restart_numbering: true ise sayaç 1'e döner (PDF ile aynı sıra).
 */
export function buildQuestionNumberMap(
  questions: QuestionItem[],
  sections?: SectionRange[] | null
): Map<string, number | null> {
  const sorted = [...questions].sort((a, b) => a.order_index - b.order_index);
  const restartAt = new Set<number>();
  for (const sec of sections ?? []) {
    if (sec.restart_numbering) {
      restartAt.add(sec.start_idx);
    }
  }
  let counter = 1;
  const map = new Map<string, number | null>();
  for (const q of sorted) {
    if (restartAt.has(q.order_index)) {
      counter = 1;
    }
    if (normalizeContentType(q.content_type) === "explanation") {
      map.set(q.id, null);
    } else {
      map.set(q.id, counter);
      counter += 1;
    }
  }
  return map;
}
