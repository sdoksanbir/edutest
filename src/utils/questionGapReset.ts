import type { LayoutItem } from "../api/client";

const POSITION_EPS_PT = 0.05;

/** Önizleme açılışındaki layout ile mevcut layout (konum/sayfa) farklı mı? */
export function isQuestionGapLayoutDirty(
  current: LayoutItem[],
  initial: LayoutItem[] | null,
): boolean {
  if (!initial || initial.length === 0) return false;

  const initialByOrder = new Map(
    initial
      .filter((l) => l.kind !== "answer_key_page")
      .map((l) => [l.order_index, l] as const),
  );
  const currentQuestions = current.filter((l) => l.kind !== "answer_key_page");
  if (currentQuestions.length !== initialByOrder.size) return true;

  for (const item of currentQuestions) {
    const base = initialByOrder.get(item.order_index);
    if (!base) return true;
    if ((item.page_num ?? 0) !== (base.page_num ?? 0)) return true;
    if (Math.abs(item.y_top_pt - base.y_top_pt) > POSITION_EPS_PT) return true;
    const imgY = item.img_y_top_pt ?? item.y_top_pt;
    const baseImgY = base.img_y_top_pt ?? base.y_top_pt;
    if (Math.abs(imgY - baseImgY) > POSITION_EPS_PT) return true;
  }
  return false;
}
