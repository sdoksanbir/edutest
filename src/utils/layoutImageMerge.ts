import type { LayoutItem } from "../api/client";
import type { QuestionItem } from "../types";

/** skipImages layout yanıtına güncel soru sırasındaki görselleri bağlar (order_index kayması sonrası). */
export function mergeLayoutImagesFromQuestions(
  layout: LayoutItem[],
  questions: QuestionItem[]
): LayoutItem[] {
  const imageByOrder = new Map<number, string>();
  for (const q of questions) {
    if (q.image_base64) imageByOrder.set(q.order_index, q.image_base64);
  }
  return layout.map((item) => {
    const img = imageByOrder.get(item.order_index);
    if (img && !item.image_base64) {
      return { ...item, image_base64: img };
    }
    return item;
  });
}
