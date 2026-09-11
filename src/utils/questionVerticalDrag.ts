/**
 * Sütun içi dikey soru sürükleme — önizleme + PDF export (layout_y_top_overrides).
 */

import type { LayoutItem } from "../api/client";
import {
  DEFAULT_QUESTION_NUMBER_IMAGE_GAP_MM,
  mmToPdfPt,
  columnIndexFromQuestionXPt,
  computePageColumnBand,
  contentTopPtForColumn,
  type LayoutGeometryInput,
  type PdfColumnBand,
} from "./pdfLayoutGeometry";
import { estimateQuestionNumberTextWidthPt } from "./questionNumberMetrics";
import {
  getColumnItemsSortedTopFirst,
  layoutItemVisualBottomPt,
  shiftLayoutItemYTop,
} from "./columnRedistribute";
import {
  SCRATCH_PAD_BOTTOM_PT,
  scratchOccupiedHeightPt,
  scratchPadTopPt,
} from "./questionScratchGrid";

export const MIN_VERTICAL_GAP_MM = 5;
export const MIN_VERTICAL_GAP_PT = (MIN_VERTICAL_GAP_MM * 72) / 25.4;

export type QuestionDragLive = {
  orderIndex: number;
  imgYTopPt: number;
  pageNum: number;
};

const PT_TO_MM = 25.4 / 72;

export function ptToMm(pt: number): number {
  return Math.round(pt * PT_TO_MM * 10) / 10;
}

export function getItemTopPt(item: LayoutItem): number {
  return item.img_y_top_pt ?? item.y_top_pt;
}

export function getItemHeightPt(item: LayoutItem): number {
  if (item.img_h_pt != null && item.img_h_pt > 0) return item.img_h_pt;
  return item.h_pt;
}

/** Blok üstü = ÖRNEK / çerçeve rozeti üst kenarı (img üstünden yukarıda olabilir) */
export function layoutItemBlockTopPt(item: LayoutItem): number {
  return item.y_top_pt ?? getItemTopPt(item);
}

/** Rozet rezervi (pt) — y_top − img_y_top */
export function layoutItemBadgeReservePt(item: LayoutItem): number {
  if (item.img_y_top_pt != null && Number.isFinite(item.y_top_pt)) {
    return Math.max(0, item.y_top_pt - item.img_y_top_pt);
  }
  if (item.img_h_pt != null && item.img_h_pt > 0 && item.h_pt > item.img_h_pt) {
    return item.h_pt - item.img_h_pt;
  }
  return 0;
}

/**
 * Önceki öğenin işgal ettiği alt kenar (görsel altı − kareli alan).
 * PDF y aşağı doğru azalır.
 */
export function layoutItemOccupiedBottomPt(
  item: LayoutItem,
  scratchBelowPt = 0,
): number {
  return layoutItemVisualBottomPt(item) - Math.max(0, scratchBelowPt);
}

/** Sütunun en üst sorusu sabit; orta ve alt sorular dikey sürüklenebilir. */
export function isVerticallyDraggableInColumn(
  itemsTopFirst: LayoutItem[],
  orderIndex: number
): boolean {
  if (itemsTopFirst.length === 0) return false;
  const idx = itemsTopFirst.findIndex((l) => l.order_index === orderIndex);
  if (idx < 0) return false;
  return idx > 0 || itemsTopFirst.length === 1;
}

export function getColumnNeighbors(
  itemsTopFirst: LayoutItem[],
  orderIndex: number
): { prev: LayoutItem | null; next: LayoutItem | null; index: number } {
  const index = itemsTopFirst.findIndex((l) => l.order_index === orderIndex);
  if (index < 0) return { prev: null, next: null, index: -1 };
  return {
    prev: index > 0 ? itemsTopFirst[index - 1]! : null,
    next: index < itemsTopFirst.length - 1 ? itemsTopFirst[index + 1]! : null,
    index,
  };
}

export type ClampDraggedYTopOpts = {
  /** Önceki öğenin altındaki kareli alan yüksekliği (pt) */
  prevScratchBelowPt?: number;
  /** Sonraki öğenin blok üstü; verilmezse y_top_pt kullanılır */
  nextBlockTopPt?: number | null;
  /**
   * Sürükleme başlangıç img_y_top.
   * Mevcut konum zaten sınır dışıysa tıklamada aşağı/yukarı “snap” olmasın;
   * yalnızca daha fazla ihlali engelle.
   */
  startYTopPt?: number;
  /**
   * Sütun içerik tavanı (contentTop). Yoksa soru önceki sayfa boşluğuna taşar.
   * img_y_top + badge ≤ ceilingTopPt.
   */
  ceilingTopPt?: number | null;
};

/**
 * Sürüklenen görsel üst kenarını komşulara çarpmayacak şekilde sınırla.
 * Fasikül: sonraki için blok üstü (rozet), önceki için görsel+kareli alan.
 */
export function clampDraggedYTopPt(
  newYTop: number,
  item: LayoutItem,
  prevItem: LayoutItem | null,
  nextItem: LayoutItem | null,
  minGapPt: number = MIN_VERTICAL_GAP_PT,
  floorTopPt?: number | null,
  opts?: ClampDraggedYTopOpts,
): number {
  const h = getItemHeightPt(item);
  const badge = layoutItemBadgeReservePt(item);
  const startY = opts?.startYTopPt;
  let y = newYTop;

  // Sayfa/sütun tavanı — üst soru önceki sayfaya “kaymasın”
  const ceiling = opts?.ceilingTopPt;
  if (ceiling != null && Number.isFinite(ceiling)) {
    const maxY = ceiling - badge;
    const effectiveMax =
      startY != null && Number.isFinite(startY) ? Math.max(maxY, startY) : maxY;
    if (y > effectiveMax) y = effectiveMax;
  }

  if (prevItem) {
    const prevBottom = layoutItemOccupiedBottomPt(
      prevItem,
      opts?.prevScratchBelowPt ?? 0,
    );
    const maxY = prevBottom - minGapPt - badge;
    const effectiveMax =
      startY != null && Number.isFinite(startY) ? Math.max(maxY, startY) : maxY;
    if (y > effectiveMax) y = effectiveMax;
  }
  if (nextItem) {
    const nextTop =
      opts?.nextBlockTopPt ?? layoutItemBlockTopPt(nextItem);
    const minY = nextTop + minGapPt + h;
    const effectiveMin =
      startY != null && Number.isFinite(startY) ? Math.min(minY, startY) : minY;
    if (y < effectiveMin) y = effectiveMin;
  } else if (floorTopPt != null) {
    const minY = floorTopPt + minGapPt + h;
    const effectiveMin =
      startY != null && Number.isFinite(startY) ? Math.min(minY, startY) : minY;
    if (y < effectiveMin) y = effectiveMin;
  }
  return y;
}

export function gapMmAbove(item: LayoutItem, prevItem: LayoutItem | null): number | null {
  if (!prevItem) return null;
  return ptToMm(
    layoutItemOccupiedBottomPt(prevItem) - layoutItemBlockTopPt(item),
  );
}

export function gapMmBelow(
  item: LayoutItem,
  nextItem: LayoutItem | null,
  floorTopPt?: number | null
): number | null {
  if (nextItem) {
    return ptToMm(
      layoutItemOccupiedBottomPt(item) - layoutItemBlockTopPt(nextItem),
    );
  }
  if (floorTopPt != null) {
    return ptToMm(layoutItemOccupiedBottomPt(item) - floorTopPt);
  }
  return null;
}

/** Sütun içi ardışık sorular arası ortalama boşluk (mm) — slider göstergesi için */
export function averageInterQuestionGapMm(
  layout: LayoutItem[],
  geometry: LayoutGeometryInput,
): number | null {
  const gaps: number[] = [];
  const band = computePageColumnBand(geometry);
  const pageNums = [...new Set(layout.map((l) => l.page_num))].sort((a, b) => a - b);
  for (const pageNum of pageNums) {
    for (let col = 0; col < geometry.columns; col++) {
      const items = getColumnItemsSortedTopFirst(layout, pageNum, col, band);
      for (let i = 0; i < items.length - 1; i++) {
        const above = items[i]!;
        const below = items[i + 1]!;
        if (above.img_y_top_pt == null || below.img_y_top_pt == null) continue;
        const gapPt = layoutItemVisualBottomPt(above) - getItemTopPt(below);
        if (gapPt > 1e-4) gaps.push(ptToMm(gapPt));
      }
    }
  }
  if (gaps.length === 0) return null;
  return Math.round((gaps.reduce((a, b) => a + b, 0) / gaps.length) * 10) / 10;
}

export function questionNumberLeftPt(item: LayoutItem, leftOffsetMm: number): number {
  return item.x_pt + mmToPdfPt(leftOffsetMm);
}

export function questionImageLeftPt(
  item: LayoutItem,
  leftOffsetMm: number,
  imageGapMm: number
): number {
  const numTextW = estimateQuestionNumberTextWidthPt(item.display_number);
  return questionNumberLeftPt(item, leftOffsetMm) + numTextW + mmToPdfPt(imageGapMm);
}

/**
 * Çerçeve / görsel sol kenarı — layout img_x_pt tek kaynak (HTML chrome ↔ canvas hizası).
 * Canlı numara boşluğu önizlemesinde yeniden hesaplanır.
 */
export function resolveLayoutItemImageXPt(
  item: LayoutItem,
  leftOffsetMm: number,
  imageGapMm: number,
  opts?: { committedLeftOffsetMm?: number; committedImageGapMm?: number },
): number {
  const committedLeft =
    opts?.committedLeftOffsetMm ?? leftOffsetMm;
  const committedGap = opts?.committedImageGapMm ?? imageGapMm;
  const liveOffsets =
    Math.abs(leftOffsetMm - committedLeft) > 1e-6 ||
    Math.abs(imageGapMm - committedGap) > 1e-6;
  if (!liveOffsets && item.img_x_pt != null && Number.isFinite(item.img_x_pt)) {
    return item.img_x_pt;
  }
  return questionImageLeftPt(item, leftOffsetMm, imageGapMm);
}

export function layoutItemToCanvasRect(
  item: LayoutItem,
  pageHpt: number,
  scale: number,
  leftOffsetMm = 0,
  imageGapMm?: number,
  yShiftPt = 0,
  opts?: {
    stretchWidthToColumn?: boolean;
    committedLeftOffsetMm?: number;
    committedImageGapMm?: number;
  },
): { left: number; top: number; width: number; height: number } | null {
  if (
    item.img_x_pt == null ||
    item.img_y_top_pt == null ||
    item.img_w_pt == null ||
    item.img_h_pt == null
  ) {
    return null;
  }
  const gapMm = imageGapMm ?? DEFAULT_QUESTION_NUMBER_IMAGE_GAP_MM;
  const imgYTop = item.img_y_top_pt + yShiftPt;
  const leftPt = resolveLayoutItemImageXPt(item, leftOffsetMm, gapMm, {
    committedLeftOffsetMm: opts?.committedLeftOffsetMm,
    committedImageGapMm: opts?.committedImageGapMm,
  });
  const widthPt = opts?.stretchWidthToColumn
    ? Math.max(0, item.x_pt + item.w_pt - leftPt)
    : item.img_w_pt;
  return {
    left: leftPt * scale,
    top: (pageHpt - imgYTop) * scale,
    width: widthPt * scale,
    height: item.img_h_pt * scale,
  };
}

/** clientY delta → PDF y_top değişimi (canvas Y aşağı, PDF Y yukarı). */
export function clientDeltaToYTopDelta(deltaClientY: number, scale: number): number {
  return -deltaClientY / scale;
}

/** PDF y_top değişimi → clientY delta (overlay transform ile uyumlu). */
export function yTopDeltaToClientDelta(yTopDeltaPt: number, scale: number): number {
  return -yTopDeltaPt * scale;
}

/** Canvas üzerindeki imleç konumundan PDF y_top (üst kenar). */
export function canvasPointerToYTopPt(
  clientY: number,
  pageTopPx: number,
  pageHpt: number,
  scale: number
): number {
  const yPx = clientY - pageTopPx;
  return pageHpt - yPx / scale;
}

/** Canvas X konumundan sütun indeksi (0-based). */
export function canvasPointerToColumnIndex(
  clientX: number,
  pageLeftPx: number,
  scale: number,
  band: PdfColumnBand
): number {
  const xPt = (clientX - pageLeftPx) / scale;
  return columnIndexFromQuestionXPt(xPt, band);
}

export function shiftLayoutItemToImgYTop(item: LayoutItem, newImgYTopPt: number): LayoutItem {
  const currentImg = item.img_y_top_pt ?? item.y_top_pt;
  const dy = newImgYTopPt - currentImg;
  return shiftLayoutItemYTop(item, item.y_top_pt + dy);
}

export function applyImgYTopToLayoutItem(
  layout: LayoutItem[],
  orderIndex: number,
  newImgYTopPt: number
): LayoutItem[] {
  return layout.map((l) =>
    l.order_index === orderIndex ? shiftLayoutItemToImgYTop(l, newImgYTopPt) : l
  );
}

/**
 * Kareli alan satır sayısına göre aynı sütundaki alttaki soruları kaydırır.
 * (Tutamaç ile büyüt/küçült — +/- butonları bunu çağırmaz.)
 */
export function reflowColumnForScratchRows(args: {
  layout: LayoutItem[];
  orderIndex: number;
  rows: number;
  cellPt: number;
  band: PdfColumnBand;
  pageNum: number;
  footerTopPt: number;
  /** Sütun içerik tavanı — küçültünce sorular önceki sayfaya taşmasın */
  contentTopPt?: number;
  padBottomPt?: number;
}): { layout: LayoutItem[]; rows: number; yUpdatesByOrderIndex: Map<number, number> } {
  const padBottom = args.padBottomPt ?? SCRATCH_PAD_BOTTOM_PT;
  const cellPt = args.cellPt;
  const col = columnIndexFromQuestionXPt(
    args.layout.find((l) => l.order_index === args.orderIndex)?.x_pt ?? 0,
    args.band,
  );
  const items = getColumnItemsSortedTopFirst(args.layout, args.pageNum, col, args.band);
  const idx = items.findIndex((i) => i.order_index === args.orderIndex);
  const emptyUpdates = new Map<number, number>();
  if (idx < 0 || cellPt <= 0) {
    return { layout: args.layout, rows: Math.max(1, Math.round(args.rows)), yUpdatesByOrderIndex: emptyUpdates };
  }
  const item = items[idx]!;
  const questionBottom =
    (item.img_y_top_pt ?? item.y_top_pt) - (item.img_h_pt ?? item.h_pt);
  const padTop = scratchPadTopPt(cellPt);
  const spaceToFooter = questionBottom - args.footerTopPt - padTop - padBottom;
  const absoluteMaxRows = Math.max(1, Math.floor(spaceToFooter / cellPt));
  let rows = Math.max(1, Math.min(absoluteMaxRows, Math.round(args.rows)));

  const next = items[idx + 1];
  if (!next) {
    return { layout: args.layout, rows, yUpdatesByOrderIndex: emptyUpdates };
  }

  const spaceNeeded = scratchOccupiedHeightPt(rows, cellPt, padBottom);
  const desiredNextTop = questionBottom - spaceNeeded;
  // Sonraki bloğun üstü (badge dahil) — kareli alan ÖRNEK'e binmesin
  const nextTop = next.y_top_pt ?? next.img_y_top_pt ?? 0;
  let delta = nextTop - desiredNextTop; // + → alta it (y azalt)

  const last = items[items.length - 1]!;
  const lastTop = last.y_top_pt ?? last.img_y_top_pt ?? 0;
  const lastH = last.h_pt ?? last.img_h_pt ?? 0;
  const lastBottomAfter = lastTop - delta - lastH;
  if (lastBottomAfter < args.footerTopPt - 0.01) {
    delta -= args.footerTopPt - lastBottomAfter;
  }

  // Küçültünce yukarı çekme: hiçbir alttaki soru sütun tavanını aşmasın
  const ceiling = args.contentTopPt ?? args.band.contentTopPt;
  if (delta < -0.01 && Number.isFinite(ceiling)) {
    const below = items.slice(idx + 1);
    // delta ≥ blockTop - ceiling  (her öğe için); en sıkı alt sınır = max(...)
    let minDelta = delta;
    for (const it of below) {
      const blockTop = layoutItemBlockTopPt(it);
      minDelta = Math.max(minDelta, blockTop - ceiling);
    }
    if (delta < minDelta) delta = minDelta;
  }

  if (Math.abs(delta) < 0.05) {
    return { layout: args.layout, rows, yUpdatesByOrderIndex: emptyUpdates };
  }

  const shiftOrders = new Set(items.slice(idx + 1).map((i) => i.order_index));
  const yUpdatesByOrderIndex = new Map<number, number>();
  const layout = args.layout.map((l) => {
    if (!shiftOrders.has(l.order_index)) return l;
    const cur = l.img_y_top_pt ?? l.y_top_pt;
    const moved = shiftLayoutItemToImgYTop(l, cur - delta);
    yUpdatesByOrderIndex.set(l.order_index, moved.y_top_pt);
    return moved;
  });

  return { layout, rows, yUpdatesByOrderIndex };
}

/** Slider önizlemesi — üst hizadan orantılı büyüt/küçült (layout API beklemeden). */
export function applyDisplayScalePreviewToLayoutItem(
  item: LayoutItem,
  baseItem: LayoutItem,
  scaleFactor: number
): LayoutItem {
  if (!Number.isFinite(scaleFactor) || scaleFactor <= 0) return item;
  const dim = (v: number | undefined) => (v != null ? v * scaleFactor : v);
  return {
    ...item,
    h_pt: baseItem.h_pt * scaleFactor,
    img_w_pt: dim(baseItem.img_w_pt),
    img_h_pt: dim(baseItem.img_h_pt),
    height_pt: baseItem.height_pt != null ? baseItem.height_pt * scaleFactor : item.height_pt,
  };
}

export function applyDisplayScalePreviewToLayout(
  layout: LayoutItem[],
  orderIndex: number,
  baseItem: LayoutItem,
  scaleFactor: number
): LayoutItem[] {
  return layout.map((l) =>
    l.order_index === orderIndex
      ? applyDisplayScalePreviewToLayoutItem(l, baseItem, scaleFactor)
      : l
  );
}

/** @deprecated use applyImgYTopToLayoutItem for drag */
export function applyYTopToLayoutItem(
  layout: LayoutItem[],
  orderIndex: number,
  newYTopPt: number
): LayoutItem[] {
  return layout.map((l) =>
    l.order_index === orderIndex ? shiftLayoutItemYTop(l, newYTopPt) : l
  );
}

export function getPageColumnDraggableMeta(
  layout: LayoutItem[],
  pageNum: number,
  band: PdfColumnBand,
  geometry?: LayoutGeometryInput,
): Map<
  number,
  {
    draggable: boolean;
    prev: LayoutItem | null;
    next: LayoutItem | null;
    floorTopPt: number | null;
    ceilingTopPt: number | null;
  }
> {
  const out = new Map<
    number,
    {
      draggable: boolean;
      prev: LayoutItem | null;
      next: LayoutItem | null;
      floorTopPt: number | null;
      ceilingTopPt: number | null;
    }
  >();
  const cols = Math.max(1, band.columnXPt.length);
  for (let col = 0; col < cols; col += 1) {
    const items = getColumnItemsSortedTopFirst(layout, pageNum, col, band);
    const ceiling = geometry
      ? contentTopPtForColumn({ ...geometry, pageNum }, col)
      : band.contentTopPt;
    items.forEach((item, idx) => {
      const isBottom = idx === items.length - 1;
      out.set(item.order_index, {
        draggable: idx > 0 || items.length === 1,
        prev: idx > 0 ? items[idx - 1]! : null,
        next: idx < items.length - 1 ? items[idx + 1]! : null,
        floorTopPt: isBottom ? band.contentBottomPt : null,
        ceilingTopPt: ceiling,
      });
    });
  }
  return out;
}
