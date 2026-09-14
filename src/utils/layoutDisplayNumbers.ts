import type { LayoutItem } from "../api/client";
import type { QuestionItem, SectionRange } from "../types";
import { getLayoutItemsInReadingOrder } from "./columnRedistribute";
import { estimateQuestionNumberTextWidthPt } from "./questionNumberMetrics";
import {
  computePageColumnBand,
  questionNumberImageGapPt,
  type LayoutGeometryInput,
} from "./pdfLayoutGeometry";
import { isOptikAnswerableQuestion } from "./optikFormOrder";

export type DisplayNumberLayoutInput = {
  columns: number;
  geometry: LayoutGeometryInput;
  questionNumberingEnabled?: boolean;
  questionNumberStart?: number;
  questionNumberFontPt?: number;
  questions?: QuestionItem[];
  /** Bölüm başında restart_numbering → sayaç 1 */
  sections?: SectionRange[] | null;
};

function shouldSkipDisplayNumber(
  item: LayoutItem,
  questions?: QuestionItem[],
): boolean {
  const q = questions?.find((x) => x.order_index === item.order_index);
  if (q) return !isOptikAnswerableQuestion(q);
  if (item.content_type === "explanation") return true;
  return false;
}

function restartOrderIndices(
  sections?: SectionRange[] | null,
  layout?: LayoutItem[],
): Set<number> {
  const out = new Set<number>();
  for (const sec of sections ?? []) {
    if (sec.restart_numbering) out.add(sec.start_idx);
  }
  for (const item of layout ?? []) {
    if (item.section?.restart_numbering) out.add(item.order_index);
  }
  return out;
}

/** Yerleşim / dikey taşıma sonrası soru numaralarını okuma sırasına göre yeniden ata. */
export function reapplyDisplayNumbersByReadingOrder(
  layout: LayoutItem[],
  input: DisplayNumberLayoutInput
): LayoutItem[] {
  const enabled = input.questionNumberingEnabled !== false;
  const start = Math.max(1, input.questionNumberStart ?? 1);
  const fontPt = input.questionNumberFontPt ?? 10;
  const cols = Math.max(1, input.columns);
  const imageGapPt = questionNumberImageGapPt(input.geometry);
  const modeByOrder = new Map(
    (input.questions ?? []).map((q) => [q.order_index, q.layoutMode] as const),
  );
  const restartAt = restartOrderIndices(input.sections, layout);

  if (!enabled) {
    return layout.map((item) =>
      item.kind === "answer_key_page" ? item : { ...item, display_number: null }
    );
  }

  const pageNums = [
    ...new Set(
      layout
        .filter((l) => l.kind !== "answer_key_page")
        .map((l) => l.page_num)
        .filter((p) => p > 0)
    ),
  ].sort((a, b) => a - b);

  const displayByOrder = new Map<number, number | null>();
  let counter = start;

  for (const pageNum of pageNums) {
    const band = computePageColumnBand({ ...input.geometry, pageNum });
    const items = getLayoutItemsInReadingOrder(layout, pageNum, cols, band, {
      questionLayoutModeByOrder: modeByOrder,
    });
    for (const item of items) {
      if (restartAt.has(item.order_index) || item.section?.restart_numbering) {
        counter = 1;
      }
      if (shouldSkipDisplayNumber(item, input.questions)) {
        displayByOrder.set(item.order_index, null);
      } else {
        displayByOrder.set(item.order_index, counter);
        counter += 1;
      }
    }
  }

  return layout.map((item) => {
    if (item.kind === "answer_key_page") return item;
    if (!displayByOrder.has(item.order_index)) return item;
    const display_number = displayByOrder.get(item.order_index) ?? null;
    const numTextW = estimateQuestionNumberTextWidthPt(display_number, fontPt);
    return {
      ...item,
      display_number,
      num_slot_w_pt: numTextW,
      img_x_pt: item.x_pt + numTextW + imageGapPt,
    };
  });
}
