import type { LayoutItem } from "../api/client";
import type { QuestionItem } from "../types";

/** PDF okuma sırasına göre soru listesi (display_number / layout konumu). */
export function questionsInLayoutReadingOrder(
  questions: QuestionItem[],
  layout: LayoutItem[]
): QuestionItem[] {
  const rankById = new Map<string, number>();

  for (const item of layout) {
    if (item.kind === "answer_key_page") continue;
    const q = questions.find((x) => x.order_index === item.order_index);
    if (!q) continue;
    if (item.display_number != null) {
      rankById.set(q.id, item.display_number);
      continue;
    }
    rankById.set(q.id, item.page_num * 100000 + item.order_index);
  }

  return [...questions].sort((a, b) => {
    const ra = rankById.get(a.id) ?? a.order_index + 1;
    const rb = rankById.get(b.id) ?? b.order_index + 1;
    return ra - rb;
  });
}

/** Okuma sırasında iki sorunun yerini değiştirir. */
export function swapReadingOrderIds(
  readingOrderIds: string[],
  idA: string,
  idB: string
): string[] {
  const i = readingOrderIds.indexOf(idA);
  const j = readingOrderIds.indexOf(idB);
  if (i < 0 || j < 0 || i === j) return readingOrderIds;
  const next = [...readingOrderIds];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

/** Okuma sırasındaki id listesini sürükle-bırak sonrası günceller. */
export function readingOrderIdsAfterMove(
  readingOrderIds: string[],
  activeId: string,
  overId: string
): string[] {
  const from = readingOrderIds.indexOf(activeId);
  const to = readingOrderIds.indexOf(overId);
  if (from < 0 || to < 0 || from === to) return readingOrderIds;
  const next = [...readingOrderIds];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}
