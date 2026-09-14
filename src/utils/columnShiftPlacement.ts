/**
 * Sütun okları: soru sırasını değiştirmeden sayfa/sütun yerleşimi + boşluk sıkıştırma.
 */

import type { LayoutItem } from "../api/client";
import type { QuestionItem } from "../types";
import { getColumnItemsSortedTopFirst, shiftLayoutItemYTop } from "./columnRedistribute";
import { computeColumnGapSizesPt } from "./columnGapDistribution";
import { fasikulMinScratchGapPt, fasikulOneLineGapPt, fasikulTrailingGapFloorPt, scratchCellPt, scratchOccupiedHeightPt, FASIKUL_MIN_SCRATCH_ROWS } from "./questionScratchGrid";
import { fasikulFrameShowsScratchGrid } from "./fasikulQuestionFrame";
import { layoutItemOccupiedBottomPt } from "./questionVerticalDrag";
import { estimateQuestionNumberTextWidthPt } from "./questionNumberMetrics";
import {
  columnIndexFromQuestionXPt,
  computePageColumnBand,
  contentTopPtForColumn,
  isLayoutItemFullWidth,
  mmToPdfPt,
  pageContentWidthFromBand,
  questionNumberImageGapPt,
  type LayoutGeometryInput,
  type PdfColumnBand,
} from "./pdfLayoutGeometry";
import {
  getPageColumnShiftMeta,
  nextColumnSlot,
  prevColumnSlot,
  resolveShiftTargetForBottom,
  type ColumnShiftDirection,
} from "./columnShift";
import { reapplyDisplayNumbersByReadingOrder } from "./layoutDisplayNumbers";
import { reflowLayoutForFasikulBadgeTopReserve } from "./fasikulFrameBadgeLayout";

export type { ColumnShiftDirection };

/** Sütun yerleşiminde alt banner ile son soru arası minimum boşluk (mm). */
export const COLUMN_PLACEMENT_MIN_BOTTOM_GAP_MM = 6;

const LAYOUT_EPS = 0.01;
const PT_TO_MM = 25.4 / 72;

function questionLayoutMode(
  questions: QuestionItem[],
  orderIndex: number,
): string | null | undefined {
  return questions.find((q) => q.order_index === orderIndex)?.layoutMode;
}

function isFullWidthLayoutItem(
  item: LayoutItem,
  questions: QuestionItem[],
  band?: PdfColumnBand,
): boolean {
  return isLayoutItemFullWidth(item, {
    questionLayoutMode: questionLayoutMode(questions, item.order_index),
    colWidthPt: band?.colWidthPt,
  });
}

function placementMinBottomGapMm(questions: QuestionItem[]): number {
  const fasikul = questions.some((q) => q.fasikulFrame?.enabled);
  if (!fasikul) return COLUMN_PLACEMENT_MIN_BOTTOM_GAP_MM;
  const anyScratch = questions.some((q) => {
    const f = q.fasikulFrame;
    if (f?.enabled === true) return f.showScratchGrid === true;
    return true;
  });
  const pt = anyScratch ? fasikulMinScratchGapPt() : fasikulOneLineGapPt();
  return Math.ceil(pt * PT_TO_MM * 10) / 10;
}

function placementMinInterGapPt(questionGapMinMm: number, questions: QuestionItem[]): number {
  const base = mmToPdfPt(Math.max(0, questionGapMinMm));
  const fasikul = questions.some((q) => q.fasikulFrame?.enabled);
  if (!fasikul) return base;
  const floors = questions.map((q) =>
    fasikulTrailingGapFloorPt(q.fasikulFrame ?? null),
  );
  const floor = floors.length > 0 ? Math.max(...floors) : fasikulOneLineGapPt();
  return Math.max(base, floor);
}

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

  const sorted = [...items].sort((a, b) => a.order_index - b.order_index);
  const topOrders = new Set<number>();
  const bottomOrders = new Set<number>();
  for (const it of items) {
    const id = questionIdForOrder(questions, it.order_index);
    if (!id || !overrides[id]) continue;
    if (overrides[id].insert_at === "top") topOrders.add(it.order_index);
    if (overrides[id].insert_at === "bottom") bottomOrders.add(it.order_index);
  }

  const byYThenOrder = (a: LayoutItem, b: LayoutItem) => {
    const dy = yFor(b) - yFor(a);
    if (Math.abs(dy) > LAYOUT_EPS) return dy;
    return a.order_index - b.order_index;
  };

  // insert_at her zaman öncelikli — Y override yalnızca grup içi sırayı belirler
  const tops = sorted
    .filter((it) => topOrders.has(it.order_index))
    .sort(byYThenOrder);
  const bottoms = sorted
    .filter((it) => bottomOrders.has(it.order_index))
    .sort(byYThenOrder);
  const mids = sorted
    .filter((it) => !topOrders.has(it.order_index) && !bottomOrders.has(it.order_index))
    .sort(byYThenOrder);
  return [...tops, ...mids, ...bottoms];
}

function scratchBelowPtForQuestion(q: QuestionItem | undefined): number {
  if (!fasikulFrameShowsScratchGrid(q?.fasikulFrame)) return 0;
  return scratchOccupiedHeightPt(
    Math.max(
      FASIKUL_MIN_SCRATCH_ROWS,
      q?.scratchGridRows != null && Number.isFinite(q.scratchGridRows)
        ? Math.round(q.scratchGridRows)
        : FASIKUL_MIN_SCRATCH_ROWS,
    ),
    scratchCellPt(),
  );
}

/** Sütun paketleme yüksekliği: blok + kareli alan (yalnızca h_pt değil). */
function itemColumnPackHeightPt(item: LayoutItem, questions: QuestionItem[]): number {
  const q = questions.find((x) => x.order_index === item.order_index);
  const scratch = scratchBelowPtForQuestion(q);
  const occupied = item.y_top_pt - layoutItemOccupiedBottomPt(item, scratch);
  if (Number.isFinite(occupied) && occupied > LAYOUT_EPS) return occupied;
  return Math.max(item.h_pt, 1) + scratch;
}

function setItemColumnGeometry(
  item: LayoutItem,
  pageNum: number,
  colIdx: number,
  band: PdfColumnBand,
  imageGapPt: number,
  questionNumberFontPt = 10,
  questions?: QuestionItem[],
): LayoutItem {
  const numTextW = estimateQuestionNumberTextWidthPt(item.display_number, questionNumberFontPt);
  // Geniş soru: sütun taşıma / override sonrası tek sütuna düşmesin
  if (
    isLayoutItemFullWidth(item, {
      questionLayoutMode: questions
        ? questionLayoutMode(questions, item.order_index)
        : undefined,
      colWidthPt: band.colWidthPt,
    })
  ) {
    const x = band.columnXPt[0] ?? item.x_pt;
    const contentW = pageContentWidthFromBand(band);
    const maxImgW = Math.max(1, contentW - numTextW - imageGapPt);
    return {
      ...item,
      page_num: pageNum,
      x_pt: x,
      w_pt: contentW,
      span_full_width: true,
      layout_mode: "full-width",
      num_slot_w_pt: numTextW,
      img_x_pt: x + numTextW + imageGapPt,
      img_w_pt:
        item.img_w_pt != null ? Math.min(item.img_w_pt, maxImgW) : item.img_w_pt,
    };
  }
  const x = band.columnXPt[colIdx] ?? band.columnXPt[0] ?? item.x_pt;
  return {
    ...item,
    page_num: pageNum,
    x_pt: x,
    w_pt: band.colWidthPt,
    num_slot_w_pt: numTextW,
    img_x_pt: x + numTextW + imageGapPt,
  };
}

type FwOccupiedInterval = {
  yTop: number;
  yBottom: number;
  orderIndex: number;
};

/** Sayfadaki geniş soruların gerçek Y bantları (üstten alta). */
function fullWidthOccupiedIntervalsOnPage(
  fwItems: LayoutItem[],
  pageNum: number,
  questions: QuestionItem[],
  placementOverrides: Record<string, LayoutPlacementOverride>,
  yOverridesByQuestionId: Record<string, number>,
): FwOccupiedInterval[] {
  const out: FwOccupiedInterval[] = [];
  for (const item of fwItems) {
    const qid = questionIdForOrder(questions, item.order_index);
    const ov = qid ? placementOverrides[qid] : undefined;
    const page = ov?.page_num ?? item.page_num ?? 1;
    if (page !== pageNum) continue;
    const q = questions.find((x) => x.order_index === item.order_index);
    const scratchBelow = fasikulFrameShowsScratchGrid(q?.fasikulFrame)
      ? scratchOccupiedHeightPt(
          Math.max(
            FASIKUL_MIN_SCRATCH_ROWS,
            q?.scratchGridRows != null && Number.isFinite(q.scratchGridRows)
              ? Math.round(q.scratchGridRows)
              : FASIKUL_MIN_SCRATCH_ROWS,
          ),
          scratchCellPt(),
        )
      : 0;
    const yTop =
      qid != null && yOverridesByQuestionId[qid] != null
        ? yOverridesByQuestionId[qid]!
        : item.y_top_pt;
    const dy = yTop - item.y_top_pt;
    const shifted = dy === 0 ? item : shiftLayoutItemYTop(item, yTop);
    const yBottom = layoutItemOccupiedBottomPt(shifted, scratchBelow);
    out.push({ yTop, yBottom, orderIndex: item.order_index });
  }
  return out.sort((a, b) => b.yTop - a.yTop);
}

/**
 * Geniş bantların üstü/altı — dar paketleme bu segmentlerde yapılır
 * (layout-engine colYTops senkronu ile aynı model).
 */
function narrowPackSegmentsForPage(
  contentTopPt: number,
  contentBottomPt: number,
  fwIntervals: FwOccupiedInterval[],
  gapAboveFwPt: number,
): Array<{ top: number; bottom: number }> {
  const segs: Array<{ top: number; bottom: number }> = [];
  let cursor = contentTopPt;
  for (const fw of fwIntervals) {
    // Dar soru altı ≥ fw.yTop + gap → segment tabanı fw.yTop + gap
    const segBottom = fw.yTop + Math.max(0, gapAboveFwPt);
    if (cursor > segBottom + LAYOUT_EPS) {
      segs.push({ top: cursor, bottom: segBottom });
    }
    // FW altından sonra devam
    cursor = Math.min(cursor, fw.yBottom - Math.max(0, gapAboveFwPt));
  }
  if (cursor > contentBottomPt + LAYOUT_EPS) {
    segs.push({ top: cursor, bottom: contentBottomPt });
  }
  return segs;
}

/** Dar soruları geniş bantları delmeden segment segment yerleştir. */
function packNarrowIntoSegments(
  items: LayoutItem[],
  segments: Array<{ top: number; bottom: number }>,
  minGapPt: number,
  minBottomGapPt: number,
  fixedInterGaps: boolean,
  force: boolean,
  questions: QuestionItem[],
): { ok: true; items: LayoutItem[] } | { ok: false; error: string } {
  if (items.length === 0) return { ok: true, items: [] };
  if (segments.length === 0) {
    return {
      ok: false,
      error: "Hedef sütunda geniş soru nedeniyle dikey alan kalmadı. Taşıma iptal edildi.",
    };
  }

  const remaining = [...items];
  const placed: LayoutItem[] = [];

  for (let si = 0; si < segments.length; si += 1) {
    if (remaining.length === 0) break;
    const seg = segments[si]!;
    const isLast = si === segments.length - 1;
    const bottomReserve = isLast ? minBottomGapPt : 0;

    let fitCount = 0;
    for (let n = remaining.length; n >= 1; n -= 1) {
      const trial = remaining.slice(0, n);
      if (
        columnFitsWithStandardGaps(
          trial,
          seg.top,
          seg.bottom,
          minGapPt,
          bottomReserve,
          questions,
        )
      ) {
        fitCount = n;
        break;
      }
    }

    if (fitCount === 0) {
      if (force) {
        // Zorla: tek soruyu bile sığdırmaya çalış (eşit boşluk)
        const one = remaining.slice(0, 1);
        const packedOne = repackColumnItems(
          one,
          seg.top,
          seg.bottom,
          minGapPt,
          true,
          questions,
        );
        if (packedOne.ok) {
          placed.push(...packedOne.items);
          remaining.shift();
          continue;
        }
      }
      continue;
    }

    const batch = remaining.splice(0, fitCount);
    const packed = force
      ? repackColumnItems(batch, seg.top, seg.bottom, minGapPt, true, questions)
      : repackColumnWithStandardGaps(
          batch,
          seg.top,
          seg.bottom,
          minGapPt,
          bottomReserve,
          fixedInterGaps,
          questions,
        );
    if (!packed.ok) return packed;
    placed.push(...packed.items);
  }

  if (remaining.length > 0) {
    return {
      ok: false,
      error:
        "Hedef sütunda geniş soru bantları nedeniyle yeterli dikey alan yok. Taşıma iptal edildi.",
    };
  }
  return { ok: true, items: placed };
}

function repackColumnItems(
  items: LayoutItem[],
  contentTopPt: number,
  contentBottomPt: number,
  minGapPt: number,
  force = false,
  questions: QuestionItem[] = [],
): { ok: true; items: LayoutItem[] } | { ok: false; error: string } {
  if (items.length === 0) return { ok: true, items: [] };
  const heights = items.map((l) => itemColumnPackHeightPt(l, questions));
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
  questions: QuestionItem[] = [],
): boolean {
  if (items.length === 0) return true;
  const totalH = items.reduce((s, l) => s + itemColumnPackHeightPt(l, questions), 0);
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
  fixedInterGaps = false,
  questions: QuestionItem[] = [],
): { ok: true; items: LayoutItem[] } | { ok: false; error: string } {
  if (items.length === 0) return { ok: true, items: [] };

  if (
    !columnFitsWithStandardGaps(
      items,
      contentTopPt,
      contentBottomPt,
      standardGapPt,
      minBottomGapPt,
      questions,
    )
  ) {
    const minMm = Math.round((minBottomGapPt * 25.4) / 72);
    return {
      ok: false,
      error: `Hedef sütunda yeterli alan yok (alt boşluk en az ${minMm} mm). Taşıma iptal edildi.`,
    };
  }

  const heights = items.map((l) => itemColumnPackHeightPt(l, questions));
  const totalH = heights.reduce((s, h) => s + h, 0);
  const gapBudget = contentTopPt - contentBottomPt - totalH;
  const gaps = computeColumnGapSizesPt(
    gapBudget,
    items.length,
    standardGapPt,
    minBottomGapPt,
    { fixedInterGaps },
  );
  const out: LayoutItem[] = [];
  let y = contentTopPt;
  for (let i = 0; i < items.length; i++) {
    out.push(shiftLayoutItemYTop(items[i]!, y));
    y -= heights[i]! + (gaps[i] ?? 0);
  }
  return { ok: true, items: out };
}

function layoutModeByOrder(
  questions: QuestionItem[],
): Map<number, string | null | undefined> {
  return new Map(questions.map((q) => [q.order_index, q.layoutMode] as const));
}

function getColumnItemsAtSlot(
  layout: LayoutItem[],
  pageNum: number,
  colIdx: number,
  bandForPage: (page: number) => PdfColumnBand,
  modeByOrder?: Map<number, string | null | undefined>,
): LayoutItem[] {
  const band = bandForPage(pageNum);
  return getColumnItemsSortedTopFirst(layout, pageNum, colIdx, band, {
    questionLayoutModeByOrder: modeByOrder,
  });
}

/**
 * Önceki sütuna zincirleme taşıma: kaynak sütunun üstünden başlayarak,
 * standart aralık + min alt pay ile sığan tüm ardışık soruları hedefe ekler.
 */
export function computePrevColumnCascadeMoves(input: {
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
  const modeByOrder = layoutModeByOrder(input.questions);
  const sourceItems = getColumnItemsAtSlot(
    effectiveLayout,
    pageNum,
    colIdx,
    bandForPage,
    modeByOrder,
  );

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
  const targetBand = bandForPage(targetSlot.pageNum);
  const contentTop = contentTopPtForColumn(gi, targetSlot.columnIndex);
  const contentBottom = targetBand.contentBottomPt;
  // Geniş bantların gerçek Y aralıkları — alttan “bütçe” ile yer ayırmak yetmez
  const fwOnPage = effectiveLayout.filter(
    (l) =>
      l.page_num === targetSlot.pageNum &&
      l.kind !== "answer_key_page" &&
      isFullWidthLayoutItem(l, input.questions, targetBand),
  );
  const fwIntervals = fullWidthOccupiedIntervalsOnPage(
    fwOnPage,
    targetSlot.pageNum,
    input.questions,
    {},
    {},
  );
  const segments = narrowPackSegmentsForPage(
    contentTop,
    contentBottom,
    fwIntervals,
    standardGapPt,
  );

  let targetItems = getColumnItemsAtSlot(
    effectiveLayout,
    targetSlot.pageNum,
    targetSlot.columnIndex,
    bandForPage,
    modeByOrder,
  );
  const movedOrderIndices: number[] = [];

  for (const candidate of sourceItems) {
    const trial = [...targetItems, candidate];
    const fits =
      fwIntervals.length === 0
        ? columnFitsWithStandardGaps(
            trial,
            contentTop,
            contentBottom,
            standardGapPt,
            minBottomGapPt,
            input.questions,
          )
        : packNarrowIntoSegments(
            trial,
            segments,
            standardGapPt,
            minBottomGapPt,
            false,
            false,
            input.questions,
          ).ok;
    if (!fits) break;
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
  sections?: import("../types").SectionRange[] | null;
};

export type ApplyPlacementOk = {
  ok: true;
  layout: LayoutItem[];
  yTopUpdatesByQuestionId: Record<string, number>;
};

export type ApplyPlacementErr = { ok: false; error: string };

/** Dar soruları geniş bantla kesişiyorsa FW altına sırayla it. */
function nudgeNarrowItemsBelowFullWidth(input: {
  byOrder: Map<number, LayoutItem>;
  questions: QuestionItem[];
  bandForPage: (page: number) => PdfColumnBand;
  minGapPt: number;
  yTopUpdates: Record<string, number>;
}): { byOrder: Map<number, LayoutItem>; yTopUpdates: Record<string, number> } {
  const byOrder = new Map(input.byOrder);
  const yTopUpdates = { ...input.yTopUpdates };
  const cellPt = scratchCellPt();
  const all = [...byOrder.values()];
  const fws = all
    .filter((it) =>
      isFullWidthLayoutItem(
        it,
        input.questions,
        input.bandForPage(it.page_num ?? 1),
      ),
    )
    .sort((a, b) => b.y_top_pt - a.y_top_pt);

  for (const fw of fws) {
    const qid = questionIdForOrder(input.questions, fw.order_index);
    const q = qid ? input.questions.find((x) => x.id === qid) : undefined;
    const scratchBelow = fasikulFrameShowsScratchGrid(q?.fasikulFrame)
      ? scratchOccupiedHeightPt(
          Math.max(
            FASIKUL_MIN_SCRATCH_ROWS,
            q?.scratchGridRows != null && Number.isFinite(q.scratchGridRows)
              ? Math.round(q.scratchGridRows)
              : FASIKUL_MIN_SCRATCH_ROWS,
          ),
          cellPt,
        )
      : 0;
    const fwLive = byOrder.get(fw.order_index) ?? fw;
    const fwBottom = layoutItemOccupiedBottomPt(fwLive, scratchBelow);
    const fwTop = fwLive.y_top_pt;
    const others = [...byOrder.values()]
      .filter(
        (it) =>
          it.order_index !== fw.order_index &&
          it.page_num === fwLive.page_num &&
          !isFullWidthLayoutItem(
            it,
            input.questions,
            input.bandForPage(fwLive.page_num ?? 1),
          ),
      )
      .sort((a, b) => b.y_top_pt - a.y_top_pt);

    let nextTop = fwBottom - input.minGapPt;
    for (const it of others) {
      const live = byOrder.get(it.order_index) ?? it;
      const itemBottom = layoutItemOccupiedBottomPt(live, 0);
      const overlaps =
        live.y_top_pt > fwBottom + LAYOUT_EPS &&
        itemBottom < fwTop - LAYOUT_EPS;
      if (!overlaps) continue;
      const moved = shiftLayoutItemYTop(live, nextTop);
      byOrder.set(moved.order_index, moved);
      const oqid = questionIdForOrder(input.questions, moved.order_index);
      if (oqid) yTopUpdates[oqid] = moved.y_top_pt;
      nextTop = layoutItemOccupiedBottomPt(moved, 0) - input.minGapPt;
    }
  }
  return { byOrder, yTopUpdates };
}

/** Yerleşim override'larına göre sütun grupla + boşlukları sıkıştırarak yeniden yerleştir. */
export function applyColumnPlacementToLayout(
  input: ApplyPlacementInput
): ApplyPlacementOk | ApplyPlacementErr {
  const { baseLayout, questions, placementOverrides, geometry, columns, questionGapMinMm, force = false, questionNumberingEnabled, questionNumberStart, questionNumberFontPt = 10, yOverridesByQuestionId = {}, sections } =
    input;
  const minGapPt = placementMinInterGapPt(questionGapMinMm, questions);
  const minBottomGapPt = mmToPdfPt(placementMinBottomGapMm(questions));
  const fixedInterGaps = questions.some((q) => q.fasikulFrame?.enabled);
  const imageGapPt = questionNumberImageGapPt(geometry);
  const cols = Math.max(1, columns);
  const bandForPage = (page: number) => computePageColumnBand({ ...geometry, pageNum: page });

  const questionItems = baseLayout.filter((l) => l.kind !== "answer_key_page");
  const passthrough = baseLayout.filter((l) => l.kind === "answer_key_page");

  const groups = new Map<string, LayoutItem[]>();
  const fullWidthPass: LayoutItem[] = [];

  for (const item of questionItems) {
    const band = bandForPage(item.page_num ?? 1);
    // Geniş sorular sütun paketlemesine girmesin — tek sütuna düşer / çizgi kayar
    if (isFullWidthLayoutItem(item, questions, band)) {
      fullWidthPass.push(item);
      continue;
    }
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
      const pageBand = bandForPage(page);
      col = columnIndexFromQuestionXPt(item.x_pt, pageBand);
    }
    const key = columnKey(page, col);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  const fwIntervalsByPage = new Map<number, FwOccupiedInterval[]>();
  const pagesNeeded = new Set<number>();
  for (const key of groups.keys()) {
    pagesNeeded.add(Number(key.split(":")[0]));
  }
  for (const item of fullWidthPass) {
    const qid = questionIdForOrder(questions, item.order_index);
    const ov = qid ? placementOverrides[qid] : undefined;
    pagesNeeded.add(ov?.page_num ?? item.page_num ?? 1);
  }
  for (const pageNum of pagesNeeded) {
    fwIntervalsByPage.set(
      pageNum,
      fullWidthOccupiedIntervalsOnPage(
        fullWidthPass,
        pageNum,
        questions,
        placementOverrides,
        yOverridesByQuestionId,
      ),
    );
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
    const fwIntervals = fwIntervalsByPage.get(pageNum) ?? [];
    const segments = narrowPackSegmentsForPage(
      contentTop,
      contentBottom,
      fwIntervals,
      minGapPt,
    );

    const ordered = orderItemsInColumn(
      rawItems,
      placementOverrides,
      questions,
      yOverridesByQuestionId,
    );
    const placed = ordered.map((it) => {
      const geo = setItemColumnGeometry(
        it,
        pageNum,
        colIdx,
        band,
        imageGapPt,
        questionNumberFontPt,
        questions,
      );
      const qid = questionIdForOrder(questions, it.order_index);
      return qid ? { ...geo, question_id: qid } : geo;
    });

    // Geniş yoksa eski tek-segment paketleme
    const packed =
      fwIntervals.length === 0
        ? force
          ? repackColumnItems(placed, contentTop, contentBottom, minGapPt, true, questions)
          : repackColumnWithStandardGaps(
              placed,
              contentTop,
              contentBottom,
              minGapPt,
              minBottomGapPt,
              fixedInterGaps,
              questions,
            )
        : packNarrowIntoSegments(
            placed,
            segments,
            minGapPt,
            minBottomGapPt,
            fixedInterGaps,
            force,
            questions,
          );
    if (!packed.ok) return packed;

    for (const it of packed.items) {
      byOrder.set(it.order_index, it);
      const qid = questionIdForOrder(questions, it.order_index);
      if (qid) yTopUpdates[qid] = it.y_top_pt;
    }
  }

  // Geniş: genişlik/geometriyi koru, Y override veya mevcut konum
  for (const item of fullWidthPass) {
    const qid = questionIdForOrder(questions, item.order_index);
    const ov = qid ? placementOverrides[qid] : undefined;
    const pageNum = ov?.page_num ?? item.page_num ?? 1;
    const band = bandForPage(pageNum);
    const geo = setItemColumnGeometry(
      item,
      pageNum,
      0,
      band,
      imageGapPt,
      questionNumberFontPt,
      questions,
    );
    const yt =
      qid != null && yOverridesByQuestionId[qid] != null
        ? yOverridesByQuestionId[qid]!
        : item.y_top_pt;
    const dy = yt - item.y_top_pt;
    const placedFw: LayoutItem = {
      ...geo,
      y_top_pt: yt,
      img_y_top_pt: (item.img_y_top_pt ?? item.y_top_pt) + dy,
      h_pt: item.h_pt,
      img_h_pt: item.img_h_pt,
      ...(qid ? { question_id: qid } : {}),
    };
    byOrder.set(item.order_index, placedFw);
    if (qid) yTopUpdates[qid] = yt;
  }

  // Güvenlik ağı: hâlâ çakışan dar → FW altına it (segment sonrası / Y override sonrası)
  const nudged = nudgeNarrowItemsBelowFullWidth({
    byOrder,
    questions,
    bandForPage,
    minGapPt,
    yTopUpdates,
  });
  for (const [oi, it] of nudged.byOrder) byOrder.set(oi, it);
  Object.assign(yTopUpdates, nudged.yTopUpdates);

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
      sections,
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
  sections?: import("../types").SectionRange[] | null;
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
    sections?: import("../types").SectionRange[] | null;
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
    sections?: import("../types").SectionRange[] | null;
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
    sections: input.sections,
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
    sections,
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
  if (direction === "prev_column" && !force && !shiftMeta?.showPrevColumnArrow) {
    return { ok: false, error: "Bu soru önceki sütuna taşınamaz." };
  }
  if (direction === "next_column" && !force && !shiftMeta?.showNextColumnArrow) {
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
        standardGapPt: placementMinInterGapPt(questionGapMinMm, questions),
        minBottomGapPt: mmToPdfPt(placementMinBottomGapMm(questions)),
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
    const colItems = getColumnItemsSortedTopFirst(effectiveLayout, pageNum, colIdx, band, {
      questionLayoutModeByOrder: layoutModeByOrder(questions),
    });
    const isTopOfColumn = colItems[0]?.order_index === orderIndex;
    const effectiveMaxPage = force
      ? Math.max(maxQuestionPage, pageNum) + 1
      : maxQuestionPage;
    const target = resolveShiftTargetForBottom(pageNum, colIdx, cols, effectiveMaxPage, {
      layout: effectiveLayout,
      bottomOrderIndex: orderIndex,
      isTopOfColumn: force ? false : isTopOfColumn,
    });
    if (!target) {
      // Son sütun/sayfa: zorla yeni sayfa
      if (force) {
        targetSlot = { pageNum: pageNum + 1, columnIndex: 0 };
        insertAt = "top";
      } else {
        return { ok: false, error: "Hedef sütun bulunamadı." };
      }
    } else {
      targetSlot = { pageNum: target.pageNum, columnIndex: target.columnIndex };
      insertAt = target.insertAt;
    }
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
    sections,
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

/**
 * Boş kalan sütunlara sonraki sütunun üst sorusunu kurallara göre otomatik çek.
 * Sığmazsa dokunma — kullanıcı zorla ok ile taşır.
 * `skipOrderIndices`: az önce elle taşınan sorular (geri alma / ping-pong önleme).
 */
export function tryAutoPullTopsIntoEmptyPrevColumns(input: {
  baseLayout: LayoutItem[];
  effectiveLayout: LayoutItem[];
  questions: QuestionItem[];
  columns: number;
  maxQuestionPage: number;
  geometry: LayoutGeometryInput;
  questionGapMinMm: number;
  placementOverrides: Record<string, LayoutPlacementOverride>;
  questionNumberingEnabled?: boolean;
  questionNumberStart?: number;
  questionNumberFontPt?: number;
  skipOrderIndices?: ReadonlySet<number>;
}): TryColumnShiftOk | null {
  let layout = input.effectiveLayout;
  let placement = { ...input.placementOverrides };
  let lastOk: TryColumnShiftOk | null = null;
  const cols = Math.max(1, input.columns);
  const skip = input.skipOrderIndices ?? new Set<number>();

  for (let guard = 0; guard < 64; guard += 1) {
    const layoutMaxPage = Math.max(
      1,
      input.maxQuestionPage,
      ...layout.filter((l) => l.kind !== "answer_key_page").map((l) => l.page_num ?? 1),
    );
    const pageNums = [
      ...new Set(
        layout
          .filter((l) => l.kind !== "answer_key_page")
          .map((l) => l.page_num)
          .filter((p): p is number => typeof p === "number" && p > 0),
      ),
    ].sort((a, b) => a - b);
    if (pageNums.length === 0) break;

    let pulled = false;
    const modeByOrder = layoutModeByOrder(input.questions);
    for (const pageNum of pageNums) {
      const bandForPage = (p: number) =>
        computePageColumnBand({ ...input.geometry, pageNum: p, columns: cols });
      for (let colIdx = 0; colIdx < cols; colIdx += 1) {
        const items = getColumnItemsAtSlot(
          layout,
          pageNum,
          colIdx,
          bandForPage,
          modeByOrder,
        );
        if (items.length > 0) continue;

        const next = nextColumnSlot(pageNum, colIdx, cols, layoutMaxPage);
        if (!next) continue;
        // Sayfalar arası otomatik çekme yok — kareli alan/ sürükleme sonrası
        // soru önceki sayfanın aynı sütununa “kaymasın”; kullanıcı zorla ok kullanır.
        if (next.pageNum !== pageNum) continue;
        const nextItems = getColumnItemsAtSlot(
          layout,
          next.pageNum,
          next.columnIndex,
          bandForPage,
          modeByOrder,
        );
        if (nextItems.length === 0) continue;

        const top = nextItems[0]!;
        if (skip.has(top.order_index)) continue;

        const result = tryColumnShiftPlacement({
          baseLayout: input.baseLayout,
          effectiveLayout: layout,
          questions: input.questions,
          pageNum: next.pageNum,
          columns: cols,
          maxQuestionPage: layoutMaxPage,
          orderIndex: top.order_index,
          direction: "prev_column",
          geometry: { ...input.geometry, pageNum: next.pageNum },
          questionGapMinMm: input.questionGapMinMm,
          placementOverrides: placement,
          force: false,
          questionNumberingEnabled: input.questionNumberingEnabled,
          questionNumberStart: input.questionNumberStart,
          questionNumberFontPt: input.questionNumberFontPt,
        });
        if (!result.ok) continue;

        layout = result.layout;
        placement = result.placementOverrides;
        lastOk = result;
        pulled = true;
        break;
      }
      if (pulled) break;
    }
    if (!pulled) break;
  }

  return lastOk;
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
  sections?: import("../types").SectionRange[] | null;
}): LayoutItem[] {
  const baseLayout = input.baseLayout ?? input.rawLayout;
  let layout = input.rawLayout;
  /** Yerleşim override ile repack edilen sorular — eski mutlak Y tekrar uygulanmaz */
  const packedQuestionIds = new Set<string>();
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
      // insert_at öncelikli sıra; eski Y ile sırayı ezme
      yOverridesByQuestionId: {},
      sections: input.sections,
    });
    if (placed.ok) {
      layout = placed.layout;
      for (const id of Object.keys(placed.yTopUpdatesByQuestionId)) {
        packedQuestionIds.add(id);
      }
    }
  }

  const yToApply = input.yOverridesByQuestionId;

  if (Object.keys(yToApply).length > 0) {
    layout = layout.map((item) => {
      const q = input.questions.find((x) => x.order_index === item.order_index);
      if (!q) return item;
      // Sütun taşıma ile yeniden paketlenmiş sorularda stale Y çakışma yaratır
      if (packedQuestionIds.has(q.id)) return item;
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

  // Soru layoutMode ile layout bayraklarını senkron tut (ayırıcı / genişlik)
  layout = layout.map((item) => {
    const q = input.questions.find((x) => x.order_index === item.order_index);
    if (!q || q.layoutMode !== "full-width") return item;
    if (item.span_full_width === true && item.layout_mode === "full-width") return item;
    const band = computePageColumnBand({
      ...input.geometry,
      pageNum: item.page_num ?? 1,
      columns: input.columns,
    });
    return {
      ...item,
      span_full_width: true,
      layout_mode: "full-width" as const,
      w_pt: Math.max(item.w_pt ?? 0, pageContentWidthFromBand(band)),
      x_pt: band.columnXPt[0] ?? item.x_pt,
    };
  });

  // Y override sonrası dar/geniş çakışmasını temizle
  {
    const minGapPt = placementMinInterGapPt(
      input.questionGapMinMm,
      input.questions,
    );
    const byOrder = new Map(
      layout
        .filter((l) => l.kind !== "answer_key_page")
        .map((l) => [l.order_index, l] as const),
    );
    const nudged = nudgeNarrowItemsBelowFullWidth({
      byOrder,
      questions: input.questions,
      bandForPage: (p) =>
        computePageColumnBand({
          ...input.geometry,
          pageNum: p,
          columns: input.columns,
        }),
      minGapPt,
      yTopUpdates: {},
    });
    layout = layout.map((it) => nudged.byOrder.get(it.order_index) ?? it);
  }

  // Dış başlık rezervi — banner / kareli alan çakışmasını önle
  layout = reflowLayoutForFasikulBadgeTopReserve({
    layout,
    questions: input.questions,
    geometry: input.geometry,
    columns: input.columns,
    questionGapMinMm: input.questionGapMinMm,
  });

  // Her zaman: sütun sütun okuma sırası + içerik kutularını numarasız bırak
  return reapplyDisplayNumbersByReadingOrder(layout, {
    columns: input.columns,
    geometry: input.geometry,
    questionNumberingEnabled: input.questionNumberingEnabled,
    questionNumberStart: input.questionNumberStart,
    questionNumberFontPt: input.questionNumberFontPt,
    questions: input.questions,
    sections: input.sections,
  });
}
