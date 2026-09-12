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
  isLayoutItemFullWidth,
  mmToPdfPt,
  pageContentWidthFromBand,
  questionNumberImageGapPt,
  type LayoutGeometryInput,
  type PdfColumnBand,
} from "./pdfLayoutGeometry";
import {
  applyColumnPlacementToLayout,
  COLUMN_PLACEMENT_MIN_BOTTOM_GAP_MM,
  computePrevColumnCascadeMoves,
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
  opts?: { fullWidth?: boolean },
): number {
  const contentW = opts?.fullWidth
    ? pageContentWidthFromBand(band)
    : band.colWidthPt;
  const numTextW = estimateQuestionNumberTextWidthPt(displayNumber, questionNumberFontPt);
  return Math.max(0, contentW - numTextW - imageGapPt - IMG_COL_RIGHT_PAD_PT);
}

/** Mevcut ölçekteki görsel genişliğinden (tek sütun veya geniş) üst yüzde sınırı. */
export function maxDisplayScalePctForLayoutItem(
  item: LayoutItem,
  currentScale: number,
  band: PdfColumnBand,
  imageGapPt: number,
  questionNumberFontPt: number,
  opts?: { questionLayoutMode?: string | null },
): number {
  const imgW = item.img_w_pt;
  if (imgW == null || imgW <= 0 || !Number.isFinite(currentScale) || currentScale <= 0) {
    return DISPLAY_SCALE_MAX_PCT;
  }
  const fullWidth = isLayoutItemFullWidth(item, {
    questionLayoutMode: opts?.questionLayoutMode,
    colWidthPt: band.colWidthPt,
  });
  const availW = availableImageWidthPt(
    band,
    item.display_number,
    imageGapPt,
    questionNumberFontPt,
    { fullWidth },
  );
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
  opts?: { questionLayoutMode?: string | null },
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
    opts,
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

function isFullWidthQuestion(
  item: LayoutItem | undefined,
  questions: QuestionItem[],
  orderIndex: number,
  band?: PdfColumnBand,
): boolean {
  const q = questions.find((x) => x.order_index === orderIndex);
  return isLayoutItemFullWidth(item ?? {}, {
    questionLayoutMode: q?.layoutMode,
    colWidthPt: band?.colWidthPt,
  });
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

  // Geniş: sayfa içeriği — sütun listesine bakma (FW orada yok)
  if (isFullWidthQuestion(item, questions, orderIndex, band)) {
    const minBottomPt = mmToPdfPt(COLUMN_PLACEMENT_MIN_BOTTOM_GAP_MM);
    return layoutItemVisualBottomPt(item) < band.contentBottomPt + minBottomPt - LAYOUT_EPS;
  }

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

  // Geniş soru asla tek sütuna sıkıştırılmaz — yalnız sonraki sayfaya (col 0)
  if (isFullWidthQuestion(item, questions, orderIndex, band)) {
    const nextPage = pageNum + 1;
    if (nextPage > maxQuestionPage + 8) {
      return { ok: false, error: "Soru sonraki sayfaya taşınamadı." };
    }
    return {
      overrides: {
        ...overrides,
        [questionId]: {
          page_num: nextPage,
          column_index: 0,
          insert_at: "top",
        },
      },
    };
  }

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
 * Tek soru büyütüldükten sonra sığmıyorsa ileri taşıyıp yeniden dizer.
 * Geniş soru: yalnızca sonraki sayfa (tek sütuna düşürülmez).
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
    error: `Soru bu boyutta sayfaya sığmıyor (alt boşluk en az ${minMm} mm).`,
  };
}

/**
 * Küçültme sonrası: sonraki sütun/sayfadaki dar sorular önceki sütuna sığıyorsa geri taşı.
 * Geniş sorular taşınmaz / tek sütuna sıkıştırılmaz.
 */
export function tryCompactColumnsAfterScale(input: {
  rawLayout: LayoutItem[];
  questions: QuestionItem[];
  geometry: LayoutGeometryInput;
  columns: number;
  questionGapMinMm: number;
  placementOverrides: Record<string, LayoutPlacementOverride>;
  questionNumberingEnabled?: boolean;
  questionNumberStart?: number;
  questionNumberFontPt?: number;
}): ReflowAfterScaleOk | ReflowAfterScaleErr {
  const cols = Math.max(1, input.columns);
  let overrides = { ...input.placementOverrides };
  const standardGapPt = mmToPdfPt(Math.max(0, input.questionGapMinMm));
  const minBottomGapPt = mmToPdfPt(COLUMN_PLACEMENT_MIN_BOTTOM_GAP_MM);

  let lastOk: ReflowAfterScaleOk | null = null;

  for (let guard = 0; guard < MAX_REFLOW_ATTEMPTS; guard += 1) {
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
    if (!applied.ok) {
      if (lastOk) return lastOk;
      return applied;
    }
    lastOk = {
      ok: true,
      layout: applied.layout,
      placementOverrides: overrides,
      yTopUpdatesByQuestionId: applied.yTopUpdatesByQuestionId,
    };

    const bandForPage = (p: number) =>
      computePageColumnBand({ ...input.geometry, pageNum: p, columns: cols });
    const slotKeys = new Set<string>();
    const slots: { page: number; col: number }[] = [];
    for (const item of applied.layout) {
      if (item.kind === "answer_key_page") continue;
      if (
        isFullWidthQuestion(
          item,
          input.questions,
          item.order_index,
          bandForPage(item.page_num ?? 1),
        )
      ) {
        continue;
      }
      const page = item.page_num ?? 1;
      const col = columnIndexFromQuestionXPt(item.x_pt, bandForPage(page));
      const key = `${page}:${col}`;
      if (slotKeys.has(key)) continue;
      slotKeys.add(key);
      slots.push({ page, col });
    }
    slots.sort((a, b) => a.page - b.page || a.col - b.col);

    let moved = false;
    for (let i = 1; i < slots.length; i += 1) {
      const slot = slots[i]!;
      const items = getColumnItemsSortedTopFirst(
        applied.layout,
        slot.page,
        slot.col,
        bandForPage(slot.page),
      );
      if (items.length === 0) continue;
      const top = items[0]!;
      if (isFullWidthQuestion(top, input.questions, top.order_index, bandForPage(slot.page))) {
        continue;
      }
      const cascade = computePrevColumnCascadeMoves({
        effectiveLayout: applied.layout,
        questions: input.questions,
        pageNum: slot.page,
        colIdx: slot.col,
        orderIndex: top.order_index,
        columns: cols,
        geometry: input.geometry,
        standardGapPt,
        minBottomGapPt,
      });
      if (!cascade.ok) continue;

      for (const oi of cascade.movedOrderIndices) {
        if (
          isFullWidthQuestion(
            applied.layout.find((l) => l.order_index === oi),
            input.questions,
            oi,
            bandForPage(slot.page),
          )
        ) {
          continue;
        }
        const qid = input.questions.find((q) => q.order_index === oi)?.id;
        if (!qid) continue;
        overrides[qid] = {
          page_num: cascade.targetSlot.pageNum,
          column_index: cascade.targetSlot.columnIndex,
          insert_at: "bottom",
        };
      }
      moved = true;
      break;
    }

    if (!moved) return lastOk;
  }

  return lastOk ?? { ok: false, error: "Sütun sıkıştırma tamamlanamadı." };
}

/**
 * Büyüt: sığmazsa ileri taşı. Küçült: önceki sütuna geri paketle.
 */
export function tryReflowAfterQuestionScaleChange(input: {
  rawLayout: LayoutItem[];
  questions: QuestionItem[];
  orderIndex: number;
  geometry: LayoutGeometryInput;
  columns: number;
  maxQuestionPage: number;
  questionGapMinMm: number;
  placementOverrides: Record<string, LayoutPlacementOverride>;
  previousScale: number;
  newScale: number;
  questionNumberingEnabled?: boolean;
  questionNumberStart?: number;
  questionNumberFontPt?: number;
}): ReflowAfterScaleOk | ReflowAfterScaleErr {
  const growing = input.newScale > input.previousScale + 1e-6;
  const shrinking = input.newScale < input.previousScale - 1e-6;

  if (growing) {
    return tryReflowAfterQuestionScale(input);
  }

  if (shrinking) {
    return tryCompactColumnsAfterScale(input);
  }

  const applied = applyColumnPlacementToLayout({
    baseLayout: input.rawLayout,
    questions: input.questions,
    placementOverrides: input.placementOverrides,
    geometry: input.geometry,
    columns: input.columns,
    questionGapMinMm: input.questionGapMinMm,
    questionNumberingEnabled: input.questionNumberingEnabled,
    questionNumberStart: input.questionNumberStart,
    questionNumberFontPt: input.questionNumberFontPt,
  });
  if (!applied.ok) return applied;
  return {
    ok: true,
    layout: applied.layout,
    placementOverrides: input.placementOverrides,
    yTopUpdatesByQuestionId: applied.yTopUpdatesByQuestionId,
  };
}
