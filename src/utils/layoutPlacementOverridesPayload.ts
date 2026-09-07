import type { QuestionItem } from "../types";
import type { LayoutPlacementOverride } from "./columnShiftPlacement";

export function layoutPlacementOverridesApiPayload(
  overridesByQuestionId: Record<string, LayoutPlacementOverride>,
  questions: QuestionItem[]
): {
  layout_placement_overrides?: Array<{
    order_index: number;
    page_num: number;
    column_index: number;
    insert_at: "top" | "bottom";
  }>;
} {
  const list: Array<{
    order_index: number;
    page_num: number;
    column_index: number;
    insert_at: "top" | "bottom";
  }> = [];
  for (const [id, ov] of Object.entries(overridesByQuestionId)) {
    const q = questions.find((x) => x.id === id);
    if (!q) continue;
    list.push({
      order_index: q.order_index,
      page_num: ov.page_num,
      column_index: ov.column_index,
      insert_at: ov.insert_at,
    });
  }
  return list.length > 0 ? { layout_placement_overrides: list } : {};
}
