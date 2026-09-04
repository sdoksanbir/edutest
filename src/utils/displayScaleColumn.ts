import type { LayoutItem } from "../api/client";
import type { QuestionItem } from "../types";
import {
  DISPLAY_SCALE_MAX_PCT,
  DISPLAY_SCALE_MIN_PCT,
  clampDisplayScalePct,
} from "./displayScale";
import { estimateQuestionNumberTextWidthPt } from "./questionNumberMetrics";
import {
  columnIndexFromQuestionXPt,
  computePageColumnBand,
  mmToPdfPt,
  questionNumberImageGapPt,
  type LayoutGeometryInput,
  type PdfColumnBand,
} from "./pdfLayoutGeometry";
import {
  applyColumnPlacementToLayout,
  COLUMN_PLACEMENT_MIN_BOTTOM_GAP_MM,
  type LayoutPlacementOverride,
} from "./columnShiftPlacement";
import { resolveShiftTargetForBottom } from "./columnShift";
import { getColumnItemsSortedTopFirst, layoutItemVisualBottomPt } from "./columnRedistribute";

/** layout-engine ile aynı sağ padding */
const IMG_COL_RIGHT_PAD_PT = 2;
const MAX_REFLOW_ATTEMPTS = 48;

export function availableImageWidthPt(
  band: PdfColumnBand,
  displayNumber: number | null | undefined,
  imageGapPt: number,
  questionNumberFontPt: number,
): number {
  const numTextW = estimateQuestionNumberTextWidthPt(displayNumber, questionNumberFontPt);
  return Math.max(0, band.colWidthPt - numTextW - imageGapPt - IMG_COL_RIGHT_PAD_PT);
}

/** Mevcut ölçekteki görsel genişliğinden sütun genişliğine göre üst yüzde sınırı. */
export function maxDisplayScalePctForLayoutItem(
  item: LayoutItem,
  currentScale: number,
  band: PdfColumnBand,
  imageGapPt: number,
  questionNumberFontPt: number,
): number {
  const imgW = item.img_w_pt;
  if (imgW == null || imgW <= 0 || !Number.isFinite(currentScale) || currentScale <= 0) {
    return DISPLAY_SCALE_MAX_PCT;
  }
  const availW = availableImageWidthPt(band, item.display_number, imageGapPt, questionNumberFontPt);
  if (availW <= 0) return DISPLAY_SCALE_MIN_PCT;
  const naturalW = imgW / currentScale;
  if (naturalW <= 0) return DISPLAY_SCALE_MAX_PCT;
  return clampDisplayScalePct(Math.round((availW / naturalW) * 100));
}

export function clampDisplayScalePctToColumn(
  sizePct: number,
  item: LayoutItem,
  currentScale: number,
  geometry: LayoutGeometryInput,
  columns: number,
  questionNumberFontPt: number,
): number {
  const pageNum = item.page_num ?? 1;
  const band = computePageColumnBand({ ...geometry, pageNum, columns });
  const imageGapPt = questionNumberImageGapPt(geometry);
  const maxPct = maxDisplayScalePctForLayoutItem(
    item,
    currentScale,
    band,
    imageGapPt,
    questionNumberFontPt,
  );
  return Math.max(DISPLAY_SCALE_MIN_PCT, Math.min(maxPct, Math.round(sizePct)));
}

export type ReflowAfterScaleOk = {
  ok: true;
  layout: LayoutItem[];
  placementOverrides: Record<string, LayoutPlacementOverride>;
  yTopUpdatesByQuestionId: Record<string, number>;
};

export type ReflowAfterScaleErr = { ok: false; error: string };

const LAYOUT_EPS = 0.01;

function questionIdForOrder(questions: QuestionItem[], orderIndex: number): string | null {
  return questions.find((q) => q.order_index === orderIndex)?.id ?? null;
}

/** Büyütülen soru alt banner alanına taşıyor mu? */
function scaledQuestionOverlapsBanner(
  layout: LayoutItem[],
  orderIndex: number,
  questions: QuestionItem[],
  geometry: LayoutGeometryInput,
  columns: number,
  placementOverrides: Record<string, LayoutPlacementOverride>,
): boolean {
  const item = layout.find((l) => l.order_index === orderIndex);
  if (!item) return false;

  const questionId = questionIdForOrder(questions, orderIndex);
  const cols = Math.max(1, columns);
  const pageNum =
    (questionId ? placementOverrides[questionId]?.page_num : undefined) ?? item.page_num ?? 1;
  const band = computePageColumnBand({ ...geometry, pageNum, columns: cols });
  const colIdx =
    (questionId ? placementOverrides[questionId]?.column_index : undefined) ??
    columnIndexFromQuestionXPt(item.x_pt, band);
  const colItems = getColumnItemsSortedTopFirst(layout, pageNum, colIdx, band);
  const scaledInCol = colItems.find((l) => l.order_index === orderIndex);
  if (!scaledInCol) return false;

  const minBottomPt = mmToPdfPt(COLUMN_PLACEMENT_MIN_BOTTOM_GAP_MM);
  const visualBottom = layoutItemVisualBottomPt(scaledInCol);
  return visualBottom < band.contentBottomPt + minBottomPt - LAYOUT_EPS;
}

function shiftScaledQuestionToNextColumn(
  rawLayout: LayoutItem[],
  orderIndex: number,
  questions: QuestionItem[],
  geometry: LayoutGeometryInput,
  columns: number,
  maxQuestionPage: number,
  overrides: Record<string, LayoutPlacementOverride>,
): { overrides: Record<string, LayoutPlacementOverride> } | { ok: false; error: string } {
  const questionId = questionIdForOrder(questions, orderIndex);
  if (!questionId) return { ok: false, error: "Soru bulunamadı." };

  const item = rawLayout.find((l) => l.order_index === orderIndex);
  if (!item) return { ok: false, error: "Soru bulunamadı." };

  const cols = Math.max(1, columns);
  const bandForPage = (page: number) =>
    computePageColumnBand({ ...geometry, pageNum: page, columns: cols });

  const ov = overrides[questionId];
  const pageNum = ov?.page_num ?? item.page_num ?? 1;
  const band = bandForPage(pageNum);
  const colIdx = ov?.column_index ?? columnIndexFromQuestionXPt(item.x_pt, band);

  const target = resolveShiftTargetForBottom(pageNum, colIdx, cols, maxQuestionPage, {
    layout: rawLayout,
    bottomOrderIndex: orderIndex,
  });
  if (!target) {
    return { ok: false, error: "Soru sonraki sütuna taşınamadı." };
  }

  return {
    overrides: {
      ...overrides,
      [questionId]: {
        page_num: target.pageNum,
        column_index: target.columnIndex,
        insert_at: target.insertAt,
      },
    },
  };
}

/**
 * Tek soru büyütüldükten sonra sütuna sığmıyorsa sonraki sütuna taşıyıp yeniden dizer.
 */
export function tryReflowAfterQuestionScale(input: {
  rawLayout: LayoutItem[];
  questions: QuestionItem[];
  orderIndex: number;
  geometry: LayoutGeometryInput;
  columns: number;
  maxQuestionPage: number;
  questionGapMinMm: number;
  placementOverrides: Record<string, LayoutPlacementOverride>;
  questionNumberingEnabled?: boolean;
  questionNumberStart?: number;
  questionNumberFontPt?: number;
}): ReflowAfterScaleOk | ReflowAfterScaleErr {
  const questionId = input.questions.find((q) => q.order_index === input.orderIndex)?.id;
  if (!questionId) return { ok: false, error: "Soru bulunamadı." };

  const cols = Math.max(1, input.columns);

  let overrides = { ...input.placementOverrides };

  for (let attempt = 0; attempt < MAX_REFLOW_ATTEMPTS; attempt += 1) {
    const applied = applyColumnPlacementToLayout({
      baseLayout: input.rawLayout,
      questions: input.questions,
      placementOverrides: overrides,
      geometry: input.geometry,
      columns: cols,
      questionGapMinMm: input.questionGapMinMm,
      questionNumberingEnabled: input.questionNumberingEnabled,
      questionNumberStart: input.questionNumberStart,
      questionNumberFontPt: input.questionNumberFontPt,
    });

    const placementFailed = !applied.ok;
    const bannerOverlap =
      applied.ok &&
      scaledQuestionOverlapsBanner(
        applied.layout,
        input.orderIndex,
        input.questions,
        input.geometry,
        cols,
        overrides,
      );

    if (!placementFailed && !bannerOverlap) {
      return {
        ok: true,
        layout: applied.layout,
        placementOverrides: overrides,
        yTopUpdatesByQuestionId: applied.yTopUpdatesByQuestionId,
      };
    }

    const shift = shiftScaledQuestionToNextColumn(
      input.rawLayout,
      input.orderIndex,
      input.questions,
      input.geometry,
      cols,
      input.maxQuestionPage,
      overrides,
    );
    if ("error" in shift) return shift;
    overrides = shift.overrides;
  }

  const minMm = Math.round((mmToPdfPt(COLUMN_PLACEMENT_MIN_BOTTOM_GAP_MM) * 25.4) / 72);
  return {
    ok: false,
    error: `Soru bu boyutta hiçbir sütuna sığmıyor (alt boşluk en az ${minMm} mm).`,
  };
}
