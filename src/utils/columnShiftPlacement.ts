/**
 * Sütun okları: soru sırasını değiştirmeden sayfa/sütun yerleşimi + boşluk sıkıştırma.
 */

import type { LayoutItem } from "../api/client";
import type { QuestionItem } from "../types";
import { getColumnItemsSortedTopFirst, shiftLayoutItemYTop } from "./columnRedistribute";
import { computeColumnGapSizesPt } from "./columnGapDistribution";
import { estimateQuestionNumberTextWidthPt } from "./questionNumberMetrics";
import {
  columnIndexFromQuestionXPt,
  computePageColumnBand,
  contentTopPtForColumn,
  mmToPdfPt,
  questionNumberImageGapPt,
  type LayoutGeometryInput,
  type PdfColumnBand,
} from "./pdfLayoutGeometry";
import {
  getPageColumnShiftMeta,
  prevColumnSlot,
  resolveShiftTargetForBottom,
  type ColumnShiftDirection,
} from "./columnShift";
import { filterYTopOverridesForPlacementSave } from "./layoutYTopOverridesPayload";
import { reapplyDisplayNumbersByReadingOrder } from "./layoutDisplayNumbers";

export type { ColumnShiftDirection };

/** Sütun yerleşiminde alt banner ile son soru arası minimum boşluk (mm). */
export const COLUMN_PLACEMENT_MIN_BOTTOM_GAP_MM = 6;

const LAYOUT_EPS = 0.01;

export type LayoutPlacementOverride = {
  page_num: number;
  column_index: number;
  insert_at: "top" | "bottom";
};

function columnKey(page: number, col: number): string {
  return `${page}:${col}`;
}

function questionIdForOrder(questions: QuestionItem[], orderIndex: number): string | null {
  return questions.find((q) => q.order_index === orderIndex)?.id ?? null;
}

function orderItemsInColumn(
  items: LayoutItem[],
  overrides: Record<string, LayoutPlacementOverride>,
  questions: QuestionItem[],
  yOverridesByQuestionId: Record<string, number> = {}
): LayoutItem[] {
  const yFor = (it: LayoutItem) => {
    const id = questionIdForOrder(questions, it.order_index);
    if (id && yOverridesByQuestionId[id] != null) return yOverridesByQuestionId[id]!;
    return it.y_top_pt;
  };

  const hasStoredY = items.some((it) => {
    const id = questionIdForOrder(questions, it.order_index);
    return id != null && yOverridesByQuestionId[id] != null;
  });

  if (hasStoredY) {
    return [...items].sort((a, b) => yFor(b) - yFor(a));
  }

  const sorted = [...items].sort((a, b) => a.order_index - b.order_index);
  const topOrders = new Set<number>();
  const bottomOrders = new Set<number>();
  for (const it of items) {
    const id = questionIdForOrder(questions, it.order_index);
    if (!id || !overrides[id]) continue;
    if (overrides[id].insert_at === "top") topOrders.add(it.order_index);
    if (overrides[id].insert_at === "bottom") bottomOrders.add(it.order_index);
  }
  const tops = sorted
    .filter((it) => topOrders.has(it.order_index))
    .sort((a, b) => b.order_index - a.order_index);
  const bottoms = sorted.filter((it) => bottomOrders.has(it.order_index));
  const mids = sorted.filter(
    (it) => !topOrders.has(it.order_index) && !bottomOrders.has(it.order_index)
  );
  return [...tops, ...mids, ...bottoms];
}

function setItemColumnGeometry(
  item: LayoutItem,
  pageNum: number,
  colIdx: number,
  band: PdfColumnBand,
  imageGapPt: number,
  questionNumberFontPt = 10,
): LayoutItem {
  const x = band.columnXPt[colIdx] ?? band.columnXPt[0] ?? item.x_pt;
  const numTextW = estimateQuestionNumberTextWidthPt(item.display_number, questionNumberFontPt);
  return {
    ...item,
    page_num: pageNum,
    x_pt: x,
    w_pt: band.colWidthPt,
    num_slot_w_pt: numTextW,
    img_x_pt: x + numTextW + imageGapPt,
  };
}

function repackColumnItems(
  items: LayoutItem[],
  contentTopPt: number,
  contentBottomPt: number,
  minGapPt: number,
  force = false
): { ok: true; items: LayoutItem[] } | { ok: false; error: string } {
  if (items.length === 0) return { ok: true, items: [] };
  const heights = items.map((l) => l.h_pt);
  const totalH = heights.reduce((s, h) => s + h, 0);
  const usable = contentTopPt - contentBottomPt;
  const remaining = usable - totalH;
  const n = items.length;
  const equalGap = remaining / n;

  if (equalGap <= 0.01) {
    return {
      ok: false,
      error:
        remaining < -0.5
          ? "Hedef sütunda yeterli dikey alan yok. Taşıma iptal edildi."
          : force
            ? "Zorla taşıma: sorular arası boşluk sıfırın altına inemez. Taşıma iptal edildi."
            : "Hedef sütunda yeterli boşluk yok. Taşıma iptal edildi.",
    };
  }
  if (!force && equalGap + 0.01 < minGapPt) {
    const minMm = Math.round((minGapPt * 25.4) / 72);
    return {
      ok: false,
      error: `Soru sığmıyor: boşluklar ${minMm} mm altına inemez. Taşıma iptal edildi.`,
    };
  }
  const out: LayoutItem[] = [];
  let y = contentTopPt;
  for (let i = 0; i < n; i++) {
    out.push(shiftLayoutItemYTop(items[i]!, y));
    y -= heights[i]! + equalGap;
  }
  return { ok: true, items: out };
}

/** Standart soru arası boşluk + esnek alt pay (≥ minBottomGapPt) ile sütuna sığar mı? */
export function columnFitsWithStandardGaps(
  items: LayoutItem[],
  contentTopPt: number,
  contentBottomPt: number,
  standardGapPt: number,
  minBottomGapPt: number,
): boolean {
  if (items.length === 0) return true;
  const totalH = items.reduce((s, l) => s + l.h_pt, 0);
  const usable = contentTopPt - contentBottomPt;
  const interGaps = Math.max(0, items.length - 1) * standardGapPt;
  return totalH + interGaps + minBottomGapPt <= usable + LAYOUT_EPS;
}

/** Sorular arası standart boşluk; alt banner payı kalan alan (en az minBottomGapPt). */
function repackColumnWithStandardGaps(
  items: LayoutItem[],
  contentTopPt: number,
  contentBottomPt: number,
  standardGapPt: number,
  minBottomGapPt: number,
): { ok: true; items: LayoutItem[] } | { ok: false; error: string } {
  if (items.length === 0) return { ok: true, items: [] };

  if (!columnFitsWithStandardGaps(items, contentTopPt, contentBottomPt, standardGapPt, minBottomGapPt)) {
    const minMm = Math.round((minBottomGapPt * 25.4) / 72);
    return {
      ok: false,
      error: `Hedef sütunda yeterli alan yok (alt boşluk en az ${minMm} mm). Taşıma iptal edildi.`,
    };
  }

  const heights = items.map((l) => l.h_pt);
  const totalH = heights.reduce((s, h) => s + h, 0);
  const gapBudget = contentTopPt - contentBottomPt - totalH;
  const gaps = computeColumnGapSizesPt(
    gapBudget,
    items.length,
    standardGapPt,
    minBottomGapPt,
  );
  const out: LayoutItem[] = [];
  let y = contentTopPt;
  for (let i = 0; i < items.length; i++) {
    out.push(shiftLayoutItemYTop(items[i]!, y));
    y -= heights[i]! + (gaps[i] ?? 0);
  }
  return { ok: true, items: out };
}

function getColumnItemsAtSlot(
  layout: LayoutItem[],
  pageNum: number,
  colIdx: number,
  bandForPage: (page: number) => PdfColumnBand,
): LayoutItem[] {
  const band = bandForPage(pageNum);
  return getColumnItemsSortedTopFirst(layout, pageNum, colIdx, band);
}

/**
 * Önceki sütuna zincirleme taşıma: kaynak sütunun üstünden başlayarak,
 * standart aralık + min alt pay ile sığan tüm ardışık soruları hedefe ekler.
 */
function computePrevColumnCascadeMoves(input: {
  effectiveLayout: LayoutItem[];
  questions: QuestionItem[];
  pageNum: number;
  colIdx: number;
  orderIndex: number;
  columns: number;
  geometry: LayoutGeometryInput;
  standardGapPt: number;
  minBottomGapPt: number;
}): { ok: true; targetSlot: { pageNum: number; columnIndex: number }; movedOrderIndices: number[] } | { ok: false; error: string } {
  const {
    effectiveLayout,
    pageNum,
    colIdx,
    orderIndex,
    columns,
    geometry,
    standardGapPt,
    minBottomGapPt,
  } = input;

  const cols = Math.max(1, columns);
  const bandForPage = (p: number) => computePageColumnBand({ ...geometry, pageNum: p, columns: cols });
  const sourceItems = getColumnItemsAtSlot(effectiveLayout, pageNum, colIdx, bandForPage);

  if (sourceItems.length === 0) {
    return { ok: false, error: "Kaynak sütun boş." };
  }
  if (sourceItems[0]!.order_index !== orderIndex) {
    return { ok: false, error: "Yalnızca sütunun en üst sorusu taşınabilir." };
  }

  const targetSlot = prevColumnSlot(pageNum, colIdx, cols);
  if (!targetSlot) {
    return { ok: false, error: "Önceki sütun yok." };
  }

  const gi: LayoutGeometryInput = {
    ...geometry,
    pageNum: targetSlot.pageNum,
    columns: cols,
  };
  const contentTop = contentTopPtForColumn(gi, targetSlot.columnIndex);
  const contentBottom = bandForPage(targetSlot.pageNum).contentBottomPt;

  let targetItems = getColumnItemsAtSlot(
    effectiveLayout,
    targetSlot.pageNum,
    targetSlot.columnIndex,
    bandForPage,
  );
  const movedOrderIndices: number[] = [];

  for (const candidate of sourceItems) {
    const trial = [...targetItems, candidate];
    if (
      !columnFitsWithStandardGaps(trial, contentTop, contentBottom, standardGapPt, minBottomGapPt)
    ) {
      break;
    }
    movedOrderIndices.push(candidate.order_index);
    targetItems = trial;
  }

  if (movedOrderIndices.length === 0) {
    const minMm = Math.round((minBottomGapPt * 25.4) / 72);
    return {
      ok: false,
      error: `Önceki sütuna sığmıyor: alt boşluk en az ${minMm} mm kalmalı. Taşıma iptal edildi.`,
    };
  }

  return { ok: true, targetSlot, movedOrderIndices };
}

export type ApplyPlacementInput = {
  baseLayout: LayoutItem[];
  questions: QuestionItem[];
  placementOverrides: Record<string, LayoutPlacementOverride>;
  geometry: LayoutGeometryInput;
  columns: number;
  questionGapMinMm: number;
  /** true ise minimum boşluk sınırı uygulanmaz */
  force?: boolean;
  questionNumberingEnabled?: boolean;
  questionNumberStart?: number;
  questionNumberFontPt?: number;
  yOverridesByQuestionId?: Record<string, number>;
};

export type ApplyPlacementOk = {
  ok: true;
  layout: LayoutItem[];
  yTopUpdatesByQuestionId: Record<string, number>;
};

export type ApplyPlacementErr = { ok: false; error: string };

/** Yerleşim override'larına göre sütun grupla + boşlukları sıkıştırarak yeniden yerleştir. */
export function applyColumnPlacementToLayout(
  input: ApplyPlacementInput
): ApplyPlacementOk | ApplyPlacementErr {
  const { baseLayout, questions, placementOverrides, geometry, columns, questionGapMinMm, force = false, questionNumberingEnabled, questionNumberStart, questionNumberFontPt = 10, yOverridesByQuestionId = {} } =
    input;
  const minGapPt = mmToPdfPt(Math.max(0, questionGapMinMm));
  const minBottomGapPt = mmToPdfPt(COLUMN_PLACEMENT_MIN_BOTTOM_GAP_MM);
  const imageGapPt = questionNumberImageGapPt(geometry);
  const cols = Math.max(1, columns);
  const bandForPage = (page: number) => computePageColumnBand({ ...geometry, pageNum: page });

  const questionItems = baseLayout.filter((l) => l.kind !== "answer_key_page");
  const passthrough = baseLayout.filter((l) => l.kind === "answer_key_page");

  const groups = new Map<string, LayoutItem[]>();

  for (const item of questionItems) {
    const qid = questionIdForOrder(questions, item.order_index);
    if (!qid) continue;
    const ov = placementOverrides[qid];
    let page: number;
    let col: number;
    if (ov) {
      page = ov.page_num;
      col = ov.column_index;
    } else {
      page = item.page_num ?? 1;
      const band = bandForPage(page);
      col = columnIndexFromQuestionXPt(item.x_pt, band);
    }
    const key = columnKey(page, col);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  const byOrder = new Map<number, LayoutItem>();
  const yTopUpdates: Record<string, number> = {};

  for (const [key, rawItems] of groups) {
    const [pageStr, colStr] = key.split(":");
    const pageNum = Number(pageStr);
    const colIdx = Number(colStr);
    const gi: LayoutGeometryInput = { ...geometry, pageNum, columns: cols };
    const band = bandForPage(pageNum);
    const contentTop = contentTopPtForColumn(gi, colIdx);
    const contentBottom = band.contentBottomPt;

    const ordered = orderItemsInColumn(rawItems, placementOverrides, questions, yOverridesByQuestionId);
    const placed = ordered.map((it) =>
      setItemColumnGeometry(it, pageNum, colIdx, band, imageGapPt, questionNumberFontPt)
    );
    const packed = force
      ? repackColumnItems(placed, contentTop, contentBottom, minGapPt, true)
      : repackColumnWithStandardGaps(placed, contentTop, contentBottom, minGapPt, minBottomGapPt);
    if (!packed.ok) return packed;

    for (const it of packed.items) {
      byOrder.set(it.order_index, it);
      const qid = questionIdForOrder(questions, it.order_index);
      if (qid) yTopUpdates[qid] = it.y_top_pt;
    }
  }

  const layout = [
    ...questionItems.map((it) => byOrder.get(it.order_index) ?? it),
    ...passthrough,
  ];

  return {
    ok: true,
    layout: reapplyDisplayNumbersByReadingOrder(layout, {
      columns: cols,
      geometry,
      questions,
      questionNumberingEnabled,
      questionNumberStart,
      questionNumberFontPt,
    }),
    yTopUpdatesByQuestionId: yTopUpdates,
  };
}

export type TryColumnShiftInput = {
  baseLayout: LayoutItem[];
  effectiveLayout: LayoutItem[];
  questions: QuestionItem[];
  pageNum: number;
  columns: number;
  maxQuestionPage: number;
  orderIndex: number;
  direction: ColumnShiftDirection;
  geometry: LayoutGeometryInput;
  questionGapMinMm: number;
  placementOverrides: Record<string, LayoutPlacementOverride>;
  /** true ise minimum boşluk sınırı uygulanmaz */
  force?: boolean;
  questionNumberingEnabled?: boolean;
  questionNumberStart?: number;
  questionNumberFontPt?: number;
};

export type TryColumnShiftOk = {
  ok: true;
  layout: LayoutItem[];
  questionId: string;
  placementOverride: LayoutPlacementOverride;
  placementOverrides: Record<string, LayoutPlacementOverride>;
  yTopUpdatesByQuestionId: Record<string, number>;
};

export type TryColumnShiftErr = { ok: false; error: string };

function commitPlacementOverrides(
  input: {
    baseLayout: LayoutItem[];
    questions: QuestionItem[];
    geometry: LayoutGeometryInput;
    columns: number;
    questionGapMinMm: number;
    placementOverrides: Record<string, LayoutPlacementOverride>;
    force?: boolean;
    questionNumberingEnabled?: boolean;
    questionNumberStart?: number;
    questionNumberFontPt?: number;
  },
  questionId: string,
  placementOverride: LayoutPlacementOverride
): TryColumnShiftOk | TryColumnShiftErr {
  return commitMultiplePlacementOverrides(input, { [questionId]: placementOverride }, questionId);
}

function commitMultiplePlacementOverrides(
  input: {
    baseLayout: LayoutItem[];
    questions: QuestionItem[];
    geometry: LayoutGeometryInput;
    columns: number;
    questionGapMinMm: number;
    placementOverrides: Record<string, LayoutPlacementOverride>;
    force?: boolean;
    questionNumberingEnabled?: boolean;
    questionNumberStart?: number;
    questionNumberFontPt?: number;
  },
  addedOverrides: Record<string, LayoutPlacementOverride>,
  focusQuestionId: string,
): TryColumnShiftOk | TryColumnShiftErr {
  const nextOverrides = {
    ...input.placementOverrides,
    ...addedOverrides,
  };

  const applied = applyColumnPlacementToLayout({
    baseLayout: input.baseLayout,
    questions: input.questions,
    placementOverrides: nextOverrides,
    geometry: input.geometry,
    columns: input.columns,
    questionGapMinMm: input.questionGapMinMm,
    force: input.force,
    questionNumberingEnabled: input.questionNumberingEnabled,
    questionNumberStart: input.questionNumberStart,
    questionNumberFontPt: input.questionNumberFontPt,
  });

  if (!applied.ok) return applied;

  const placementOverride = addedOverrides[focusQuestionId];
  if (!placementOverride) {
    return { ok: false, error: "Taşıma uygulanamadı." };
  }

  return {
    ok: true,
    layout: applied.layout,
    questionId: focusQuestionId,
    placementOverride,
    placementOverrides: nextOverrides,
    yTopUpdatesByQuestionId: applied.yTopUpdatesByQuestionId,
  };
}

export function tryQuestionGripDropPlacement(input: {
  baseLayout: LayoutItem[];
  effectiveLayout: LayoutItem[];
  questions: QuestionItem[];
  columns: number;
  orderIndex: number;
  sourcePageNum: number;
  targetPageNum: number;
  targetColumnIndex: number;
  dropYTopPt: number;
  geometry: LayoutGeometryInput;
  questionGapMinMm: number;
  placementOverrides: Record<string, LayoutPlacementOverride>;
  force?: boolean;
}): TryColumnShiftOk | TryColumnShiftErr {
  const {
    baseLayout,
    effectiveLayout,
    questions,
    columns,
    orderIndex,
    sourcePageNum,
    targetPageNum,
    targetColumnIndex,
    dropYTopPt,
    geometry,
    questionGapMinMm,
    placementOverrides,
    force = false,
  } = input;

  const cols = Math.max(1, columns);
  const item = effectiveLayout.find(
    (l) =>
      l.order_index === orderIndex &&
      l.page_num === sourcePageNum &&
      l.kind !== "answer_key_page"
  );
  if (!item) return { ok: false, error: "Soru bulunamadı." };

  const questionId = questionIdForOrder(questions, orderIndex);
  if (!questionId) return { ok: false, error: "Soru bulunamadı." };

  const sourceBand = computePageColumnBand({ ...geometry, pageNum: sourcePageNum, columns: cols });
  const sourceCol = columnIndexFromQuestionXPt(item.x_pt, sourceBand);
  if (targetPageNum === sourcePageNum && targetColumnIndex === sourceCol) {
    return { ok: false, error: "__same_column__" };
  }

  const targetCol = Math.max(0, Math.min(cols - 1, targetColumnIndex));
  const gi: LayoutGeometryInput = { ...geometry, pageNum: targetPageNum, columns: cols };
  const targetBand = computePageColumnBand(gi);
  const contentTop = contentTopPtForColumn(gi, targetCol);
  const contentBottom = targetBand.contentBottomPt;
  const insertAt: "top" | "bottom" =
    dropYTopPt >= (contentTop + contentBottom) / 2 ? "top" : "bottom";

  return commitPlacementOverrides(
    {
      baseLayout,
      questions,
      geometry,
      columns: cols,
      questionGapMinMm,
      placementOverrides,
      force,
    },
    questionId,
    {
      page_num: targetPageNum,
      column_index: targetCol,
      insert_at: insertAt,
    }
  );
}

export function tryColumnShiftPlacement(
  input: TryColumnShiftInput
): TryColumnShiftOk | TryColumnShiftErr {
  const {
    baseLayout,
    effectiveLayout,
    questions,
    pageNum,
    columns,
    maxQuestionPage,
    orderIndex,
    direction,
    geometry,
    questionGapMinMm,
    placementOverrides,
    force = false,
    questionNumberingEnabled,
    questionNumberStart,
    questionNumberFontPt,
  } = input;

  const cols = Math.max(1, columns);
  const bandForPage = (p: number) => computePageColumnBand({ ...geometry, pageNum: p });
  const band = bandForPage(pageNum);
  const item = effectiveLayout.find(
    (l) => l.order_index === orderIndex && l.page_num === pageNum && l.kind !== "answer_key_page"
  );
  if (!item) return { ok: false, error: "Soru bulunamadı." };

  const questionId = questionIdForOrder(questions, orderIndex);
  if (!questionId) return { ok: false, error: "Soru bulunamadı." };

  const colIdx = columnIndexFromQuestionXPt(item.x_pt, band);
  const shiftMeta = getPageColumnShiftMeta(
    effectiveLayout,
    pageNum,
    cols,
    maxQuestionPage,
    bandForPage
  ).get(orderIndex);
  if (direction === "prev_column" && !shiftMeta?.showPrevColumnArrow) {
    return { ok: false, error: "Bu soru önceki sütuna taşınamaz." };
  }
  if (direction === "next_column" && !shiftMeta?.showNextColumnArrow) {
    return { ok: false, error: "Bu soru sonraki sütuna taşınamaz." };
  }

  let targetSlot: { pageNum: number; columnIndex: number } | null = null;
  let insertAt: "top" | "bottom";
  let cascadeOverrides: Record<string, LayoutPlacementOverride> | null = null;

  if (direction === "prev_column") {
    if (!force) {
      const cascade = computePrevColumnCascadeMoves({
        effectiveLayout,
        questions,
        pageNum,
        colIdx,
        orderIndex,
        columns: cols,
        geometry,
        standardGapPt: mmToPdfPt(Math.max(0, questionGapMinMm)),
        minBottomGapPt: mmToPdfPt(COLUMN_PLACEMENT_MIN_BOTTOM_GAP_MM),
      });
      if (!cascade.ok) return cascade;

      targetSlot = cascade.targetSlot;
      insertAt = "bottom";
      cascadeOverrides = {};
      for (const movedOi of cascade.movedOrderIndices) {
        const qid = questionIdForOrder(questions, movedOi);
        if (!qid) continue;
        cascadeOverrides[qid] = {
          page_num: targetSlot.pageNum,
          column_index: targetSlot.columnIndex,
          insert_at: "bottom",
        };
      }
    } else {
      targetSlot = prevColumnSlot(pageNum, colIdx, cols);
      insertAt = "bottom";
    }
  } else {
    const colItems = getColumnItemsSortedTopFirst(effectiveLayout, pageNum, colIdx, band);
    const isTopOfColumn = colItems[0]?.order_index === orderIndex;
    const target = resolveShiftTargetForBottom(pageNum, colIdx, cols, maxQuestionPage, {
      layout: effectiveLayout,
      bottomOrderIndex: orderIndex,
      isTopOfColumn,
    });
    if (!target) return { ok: false, error: "Hedef sütun bulunamadı." };
    targetSlot = { pageNum: target.pageNum, columnIndex: target.columnIndex };
    insertAt = target.insertAt;
  }
  if (!targetSlot) return { ok: false, error: "Hedef sütun bulunamadı." };

  const commitInput = {
    baseLayout,
    questions,
    geometry,
    columns: cols,
    questionGapMinMm,
    placementOverrides,
    force,
    questionNumberingEnabled,
    questionNumberStart,
    questionNumberFontPt,
  };

  if (cascadeOverrides && Object.keys(cascadeOverrides).length > 0) {
    return commitMultiplePlacementOverrides(commitInput, cascadeOverrides, questionId);
  }

  const placementOverride: LayoutPlacementOverride = {
    page_num: targetSlot.pageNum,
    column_index: targetSlot.columnIndex,
    insert_at: insertAt,
  };

  return commitPlacementOverrides(commitInput, questionId, placementOverride);
}

/** Ham API layout → yerleşim override + dikey override uygulanmış önizleme layout. */
export function finalizePreviewLayout(input: {
  rawLayout: LayoutItem[];
  baseLayout?: LayoutItem[];
  questions: QuestionItem[];
  placementOverrides: Record<string, LayoutPlacementOverride>;
  yOverridesByQuestionId: Record<string, number>;
  geometry: LayoutGeometryInput;
  columns: number;
  questionGapMinMm: number;
  questionNumberingEnabled?: boolean;
  questionNumberStart?: number;
  questionNumberFontPt?: number;
}): LayoutItem[] {
  const baseLayout = input.baseLayout ?? input.rawLayout;
  let layout = input.rawLayout;
  if (Object.keys(input.placementOverrides).length > 0) {
    const placed = applyColumnPlacementToLayout({
      baseLayout,
      questions: input.questions,
      placementOverrides: input.placementOverrides,
      geometry: input.geometry,
      columns: input.columns,
      questionGapMinMm: input.questionGapMinMm,
      questionNumberingEnabled: input.questionNumberingEnabled,
      questionNumberStart: input.questionNumberStart,
      questionNumberFontPt: input.questionNumberFontPt,
      yOverridesByQuestionId: input.yOverridesByQuestionId,
    });
    if (placed.ok) layout = placed.layout;
  }

  const filteredY =
    Object.keys(input.placementOverrides).length > 0
      ? filterYTopOverridesForPlacementSave({
          overridesByQuestionId: input.yOverridesByQuestionId,
          placementOverrides: input.placementOverrides,
          questions: input.questions,
          layout,
          baseLayout,
          columns: input.columns,
          pageWpt: input.geometry.pageWpt,
          pageHpt: input.geometry.pageHpt,
          marginTopMm: input.geometry.marginTopMm,
          marginBottomMm: input.geometry.marginBottomMm,
          marginLeftMm: input.geometry.marginLeftMm,
          marginRightMm: input.geometry.marginRightMm,
        })
      : input.yOverridesByQuestionId;

  const yToApply = input.yOverridesByQuestionId;

  if (Object.keys(yToApply).length > 0) {
    layout = layout.map((item) => {
      const q = input.questions.find((x) => x.order_index === item.order_index);
      if (!q) return item;
      const yt = yToApply[q.id];
      if (yt == null) return item;
      const dy = yt - item.y_top_pt;
      return {
        ...item,
        y_top_pt: yt,
        img_y_top_pt: (item.img_y_top_pt ?? item.y_top_pt) + dy,
      };
    });
  }

  const hasManualLayout =
    Object.keys(input.placementOverrides).length > 0 ||
    Object.keys(filteredY).length > 0;
  if (!hasManualLayout) return layout;

  return reapplyDisplayNumbersByReadingOrder(layout, {
    columns: input.columns,
    geometry: input.geometry,
    questionNumberingEnabled: input.questionNumberingEnabled,
    questionNumberStart: input.questionNumberStart,
    questionNumberFontPt: input.questionNumberFontPt,
    questions: input.questions,
  });
}
