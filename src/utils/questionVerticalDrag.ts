/**
 * Sütun içi dikey soru sürükleme — önizleme + PDF export (layout_y_top_overrides).
 */

import type { LayoutItem } from "../api/client";
import {
  DEFAULT_QUESTION_NUMBER_IMAGE_GAP_MM,
  mmToPdfPt,
  columnIndexFromQuestionXPt,
  computePageColumnBand,
  type LayoutGeometryInput,
  type PdfColumnBand,
} from "./pdfLayoutGeometry";
import { estimateQuestionNumberTextWidthPt } from "./questionNumberMetrics";
import {
  getColumnItemsSortedTopFirst,
  layoutItemVisualBottomPt,
  shiftLayoutItemYTop,
} from "./columnRedistribute";

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

export function clampDraggedYTopPt(
  newYTop: number,
  item: LayoutItem,
  prevItem: LayoutItem | null,
  nextItem: LayoutItem | null,
  minGapPt: number = MIN_VERTICAL_GAP_PT,
  floorTopPt?: number | null
): number {
  const h = getItemHeightPt(item);
  let y = newYTop;
  if (prevItem) {
    const maxY = layoutItemVisualBottomPt(prevItem) - minGapPt;
    if (y > maxY) y = maxY;
  }
  if (nextItem) {
    const minY = getItemTopPt(nextItem) + minGapPt + h;
    if (y < minY) y = minY;
  } else if (floorTopPt != null) {
    const minY = floorTopPt + minGapPt + h;
    if (y < minY) y = minY;
  }
  return y;
}

export function gapMmAbove(item: LayoutItem, prevItem: LayoutItem | null): number | null {
  if (!prevItem) return null;
  return ptToMm(layoutItemVisualBottomPt(prevItem) - getItemTopPt(item));
}

export function gapMmBelow(
  item: LayoutItem,
  nextItem: LayoutItem | null,
  floorTopPt?: number | null
): number | null {
  if (nextItem) return ptToMm(layoutItemVisualBottomPt(item) - getItemTopPt(nextItem));
  if (floorTopPt != null) return ptToMm(layoutItemVisualBottomPt(item) - floorTopPt);
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

export function layoutItemToCanvasRect(
  item: LayoutItem,
  pageHpt: number,
  scale: number,
  leftOffsetMm = 0,
  imageGapMm?: number,
  yShiftPt = 0,
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
  return {
    left: questionImageLeftPt(item, leftOffsetMm, gapMm) * scale,
    top: (pageHpt - imgYTop) * scale,
    width: item.img_w_pt * scale,
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
  band: PdfColumnBand
): Map<
  number,
  {
    draggable: boolean;
    prev: LayoutItem | null;
    next: LayoutItem | null;
    floorTopPt: number | null;
  }
> {
  const out = new Map<
    number,
    {
      draggable: boolean;
      prev: LayoutItem | null;
      next: LayoutItem | null;
      floorTopPt: number | null;
    }
  >();
  const cols = Math.max(1, band.columnXPt.length);
  for (let col = 0; col < cols; col += 1) {
    const items = getColumnItemsSortedTopFirst(layout, pageNum, col, band);
    items.forEach((item, idx) => {
      const isBottom = idx === items.length - 1;
      out.set(item.order_index, {
        draggable: idx > 0 || items.length === 1,
        prev: idx > 0 ? items[idx - 1]! : null,
        next: idx < items.length - 1 ? items[idx + 1]! : null,
        floorTopPt: isBottom ? band.contentBottomPt : null,
      });
    });
  }
  return out;
}
