import type { LayoutItem } from "../api/client";
import type { QuestionItem } from "../types";

/** skipImages layout yanıtına güncel soru görsellerini bağlar (id tercih; order fallback). */
export function mergeLayoutImagesFromQuestions(
  layout: LayoutItem[],
  questions: QuestionItem[]
): LayoutItem[] {
  const imageById = new Map<string, string>();
  const imageByOrder = new Map<number, string>();
  const emptyIds = new Set<string>();
  const emptyOrders = new Set<number>();
  for (const q of questions) {
    if ((q.fasikulEmptyRows ?? 0) > 0) {
      emptyIds.add(q.id);
      emptyOrders.add(q.order_index);
      continue;
    }
    if (q.image_base64) {
      imageById.set(q.id, q.image_base64);
      imageByOrder.set(q.order_index, q.image_base64);
    }
  }
  return layout.map((item) => {
    const qid = item.question_id;
    if ((qid && emptyIds.has(qid)) || emptyOrders.has(item.order_index)) {
      return { ...item, image_base64: undefined };
    }
    const img =
      (qid ? imageById.get(qid) : undefined) ?? imageByOrder.get(item.order_index);
    if (img && !item.image_base64) {
      return { ...item, image_base64: img };
    }
    return item;
  });
}

/**
 * Sütun taşıma / yerleşim sonrası: store’da base64 yoksa önceki layout’taki görselleri koru.
 * Aksi halde önizleme gri/boş kutu + getImage hatasına düşer.
 */
export function preserveLayoutImagesFromPrior(
  layout: LayoutItem[],
  priorLayout: LayoutItem[],
  questions: QuestionItem[],
): LayoutItem[] {
  const priorByOrder = new Map<number, string>();
  const priorById = new Map<string, string>();
  for (const item of priorLayout) {
    const b64 = item.image_base64;
    if (!b64) continue;
    priorByOrder.set(item.order_index, b64);
    if (item.question_id) priorById.set(item.question_id, b64);
  }
  const merged = mergeLayoutImagesFromQuestions(layout, questions);
  return merged.map((item) => {
    if (item.image_base64) return item;
    const q = questions.find((x) => x.order_index === item.order_index);
    if (q && (q.fasikulEmptyRows ?? 0) > 0) {
      return { ...item, image_base64: undefined };
    }
    const fromPrior =
      (item.question_id ? priorById.get(item.question_id) : undefined) ??
      (q ? priorById.get(q.id) : undefined) ??
      priorByOrder.get(item.order_index);
    if (fromPrior) {
      return {
        ...item,
        image_base64: fromPrior,
        question_id: item.question_id ?? q?.id,
      };
    }
    if (q?.id && !item.question_id) return { ...item, question_id: q.id };
    return item;
  });
}
