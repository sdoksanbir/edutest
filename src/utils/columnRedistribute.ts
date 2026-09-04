/**
 * Sütun içi dikey yeniden dağıtım — önizleme ve export aynı `y_top_pt` değerlerini kullanır.
 */

import type { LayoutItem } from "../api/client";
import {
  columnIndexFromQuestionXPt,
  computePageColumnBand,
  contentTopPtForColumn,
  mmToPdfPt,
  type LayoutGeometryInput,
  type PdfColumnBand,
} from "./pdfLayoutGeometry";
import {
  COLUMN_LAYOUT_BOTTOM_MIN_PT,
  computeColumnGapSizesPt,
} from "./columnGapDistribution";

const ORDER_EPS = 1e-4;

/**
 * Footer üst çizgisine kadar ölçülen “alt boşluk” ile uyum: soru görselinin alt kenarı (PDF pt).
 * Görsel yoksa blok altı (y_top − h_pt) — Canvas gap göstergesi ile aynı mantık.
 */
export function layoutItemVisualBottomPt(item: LayoutItem): number {
  if (
    item.img_y_top_pt != null &&
    item.img_h_pt != null &&
    item.img_h_pt > ORDER_EPS
  ) {
    return item.img_y_top_pt - item.img_h_pt;
  }
  return item.y_top_pt - item.h_pt;
}

export type ColumnRedistributeOk = { ok: true; layout: LayoutItem[] };
export type ColumnRedistributeErr = { ok: false; error: string };
export type ColumnRedistributeResult = ColumnRedistributeOk | ColumnRedistributeErr;

/** Tek LayoutItem için y_top_pt kaydırması; img ve bölüm hizası korunur. */
export function shiftLayoutItemYTop(item: LayoutItem, newYTopPt: number): LayoutItem {
  const dy = newYTopPt - item.y_top_pt;
  const baseImg = item.img_y_top_pt ?? item.y_top_pt;
  return {
    ...item,
    y_top_pt: newYTopPt,
    img_y_top_pt: baseImg + dy,
  };
}

/**
 * Mevcut sayfa/sütun atamasını koruyarak sabit soru arası boşlukla Y konumlarını günceller (IPC yok).
 */
export function reflowLayoutWithFixedGapMm(
  layout: LayoutItem[],
  gapMm: number,
  geometry: LayoutGeometryInput
): LayoutItem[] {
  const gapPt = mmToPdfPt(Math.max(0, gapMm));
  const cols = Math.max(1, Math.min(6, geometry.columns));
  const pageNums = [
    ...new Set(
      layout
        .filter((l) => l.kind !== "answer_key_page")
        .map((l) => l.page_num)
        .filter((p) => p > 0)
    ),
  ].sort((a, b) => a - b);
  const updates = new Map<number, LayoutItem>();

  for (const pageNum of pageNums) {
    const geo = { ...geometry, pageNum };
    const band = computePageColumnBand(geo);
    for (let colIdx = 0; colIdx < cols; colIdx++) {
      const items = getColumnItemsSortedTopFirst(layout, pageNum, colIdx, band);
      if (items.length === 0) continue;
      const contentTop = contentTopPtForColumn(geo, colIdx);
      const contentBottom = band.contentBottomPt;
      const totalH = items.reduce((s, it) => s + it.h_pt, 0);
      const gapBudget = contentTop - contentBottom - totalH;
      const n = items.length;
      const gaps = computeColumnGapSizesPt(
        gapBudget,
        n,
        gapPt,
        COLUMN_LAYOUT_BOTTOM_MIN_PT,
      );

      let y = contentTop;
      for (let i = 0; i < n; i++) {
        const item = items[i]!;
        updates.set(item.order_index, shiftLayoutItemYTop(item, y));
        y -= item.h_pt + (gaps[i] ?? 0);
      }
    }
  }

  return layout.map((l) => updates.get(l.order_index) ?? l);
}

/**
 * 1. sayfa sorularını banner + bilgi şeridi altına indirir (sütun içi aralık korunur).
 */
export function shiftLayoutBelowFirstPageHeader(
  layout: LayoutItem[],
  geometry: LayoutGeometryInput,
  columns: number,
): LayoutItem[] {
  const geo = { ...geometry, pageNum: 1 };
  const band = computePageColumnBand(geo);
  const cols = Math.max(1, Math.min(6, columns));
  const byOrder = new Map<number, LayoutItem>();
  let changed = false;

  for (let colIdx = 0; colIdx < cols; colIdx++) {
    const items = getColumnItemsSortedTopFirst(layout, 1, colIdx, band);
    if (items.length === 0) continue;
    const contentTop = contentTopPtForColumn(geo, colIdx);
    const first = items[0]!;
    if (first.y_top_pt <= contentTop + 0.25) continue;
    const dy = contentTop - first.y_top_pt;
    for (const item of items) {
      byOrder.set(item.order_index, shiftLayoutItemYTop(item, item.y_top_pt + dy));
    }
    changed = true;
  }
  if (!changed) return layout;
  return layout.map((l) => byOrder.get(l.order_index) ?? l);
}

export function getColumnItemsSortedTopFirst(
  layout: LayoutItem[],
  pageNum: number,
  columnIndex: number,
  band: PdfColumnBand
): LayoutItem[] {
  const inCol = layout.filter((l) => {
    if (l.page_num !== pageNum) return false;
    if (l.kind === "answer_key_page") return false;
    return columnIndexFromQuestionXPt(l.x_pt, band) === columnIndex;
  });
  return inCol.sort((a, b) => b.y_top_pt - a.y_top_pt);
}

/**
 * Mod 1: Sütundaki kalan dikey alan = toplam soru yüksekliği + n eşit boşluk (her sorunun altında bir,
 * son sorunun altı ile sütun tabanı arasında da aynı boşluk).
 */
export function calculateEqualVerticalDistribution(input: {
  fullLayout: LayoutItem[];
  itemsTopFirst: LayoutItem[];
  contentTopPt: number;
  contentBottomPt: number;
}): ColumnRedistributeResult {
  const { fullLayout, itemsTopFirst, contentTopPt, contentBottomPt } = input;
  const n = itemsTopFirst.length;
  if (n === 0) {
    return { ok: false, error: "Bu sütunda soru yok." };
  }
  const heights = itemsTopFirst.map((l) => l.h_pt);
  const totalH = heights.reduce((s, h) => s + h, 0);
  const usable = contentTopPt - contentBottomPt;
  const remaining = usable - totalH;
  if (remaining < -ORDER_EPS) {
    return {
      ok: false,
      error: "Bu sütunda sorular eşit dağıtılamıyor, yeterli alan yok.",
    };
  }
  const equalGap = remaining / n;
  const byOrder = new Map<number, LayoutItem>();
  let y = contentTopPt;
  for (let i = 0; i < n; i++) {
    const it = itemsTopFirst[i];
    byOrder.set(it.order_index, shiftLayoutItemYTop(it, y));
    y -= heights[i] + equalGap;
  }
  return { ok: true, layout: mergeLayoutByOrder(fullLayout, byOrder) };
}

/**
 * Mod 2: İlk sabit; son soruda alt boşluk = görsel alt kenarı − footer üst çizgisi (contentBottomPt);
 * aradaki sorular eşit blok aralığıyla yerleşir.
 */
export function calculateAnchoredBottomGapDistribution(input: {
  fullLayout: LayoutItem[];
  itemsTopFirst: LayoutItem[];
  /** Footer bandının üst çizgisi (PDF y), backend `content_bottom` / Canvas `footerTopPt` */
  contentBottomPt: number;
  bottomGapPt: number;
}): ColumnRedistributeResult {
  const { fullLayout, itemsTopFirst, contentBottomPt, bottomGapPt } = input;
  const footerTopPt = contentBottomPt;
  const n = itemsTopFirst.length;
  if (n < 3) {
    return {
      ok: false,
      error: "Bu seçenek için sütunda en az 3 soru olmalı.",
    };
  }
  if (bottomGapPt < 0 || !Number.isFinite(bottomGapPt)) {
    return { ok: false, error: "Geçerli bir alt boşluk değeri girin." };
  }
  const heights = itemsTopFirst.map((l) => l.h_pt);
  const y0 = itemsTopFirst[0].y_top_pt;
  const lastItem = itemsTopFirst[n - 1];
  const lastVisualBottom0 = layoutItemVisualBottomPt(lastItem);
  /** Son sorunun y_top değeri: görsel altı ile footer üstü arası tam bottomGapPt olur. */
  const targetLastTop =
    lastItem.y_top_pt + footerTopPt + bottomGapPt - lastVisualBottom0;
  const sumMidHeights = heights.slice(0, n - 1).reduce((s, h) => s + h, 0);
  const numerator = y0 - sumMidHeights - targetLastTop;
  const g = numerator / (n - 1);
  if (g < -ORDER_EPS) {
    return {
      ok: false,
      error:
        "Girilen alt boşluk değeri ile bu sütunda eşit dağıtım yapılamıyor.",
    };
  }
  const byOrder = new Map<number, LayoutItem>();
  let y = y0;
  byOrder.set(itemsTopFirst[0].order_index, { ...itemsTopFirst[0] });
  for (let i = 1; i < n; i++) {
    y = y - heights[i - 1] - g;
    byOrder.set(itemsTopFirst[i].order_index, shiftLayoutItemYTop(itemsTopFirst[i], y));
  }
  const last = byOrder.get(itemsTopFirst[n - 1].order_index)!;
  const lastVisualBottom = layoutItemVisualBottomPt(last);
  if (lastVisualBottom < footerTopPt - ORDER_EPS) {
    return {
      ok: false,
      error:
        "Girilen alt boşluk değeri ile bu sütunda eşit dağıtım yapılamıyor.",
    };
  }
  return { ok: true, layout: mergeLayoutByOrder(fullLayout, byOrder) };
}

function mergeLayoutByOrder(
  fullLayout: LayoutItem[],
  updates: Map<number, LayoutItem>
): LayoutItem[] {
  return fullLayout.map((l) => updates.get(l.order_index) ?? l);
}

type RedistributeMode = "equal" | "anchored";

export function redistributeColumnQuestions(args: {
  fullLayout: LayoutItem[];
  pageNum: number;
  columnIndex: number;
  geometry: LayoutGeometryInput;
  mode: RedistributeMode;
  /** Mod 2: PDF pt */
  bottomGapPt?: number;
}): ColumnRedistributeResult {
  const band = computePageColumnBand(args.geometry);
  const items = getColumnItemsSortedTopFirst(
    args.fullLayout,
    args.pageNum,
    args.columnIndex,
    band
  );
  const contentTopPt = contentTopPtForColumn(args.geometry, args.columnIndex);
  if (args.mode === "equal") {
    return calculateEqualVerticalDistribution({
      fullLayout: args.fullLayout,
      itemsTopFirst: items,
      contentTopPt,
      contentBottomPt: band.contentBottomPt,
    });
  }
  return calculateAnchoredBottomGapDistribution({
    fullLayout: args.fullLayout,
    itemsTopFirst: items,
    contentBottomPt: band.contentBottomPt,
    bottomGapPt: args.bottomGapPt ?? 0,
  });
}

/** Seçili soru sıraları için dikey konumu snapshot'tan birebir geri yükler (önizleme sıfırla). */
export function restoreLayoutItemsByOrderIndices(
  currentLayout: LayoutItem[],
  snapshotLayout: LayoutItem[],
  orderIndices: number[]
): LayoutItem[] {
  if (orderIndices.length === 0) return currentLayout;
  const snapByOrder = new Map(snapshotLayout.map((l) => [l.order_index, l]));
  const set = new Set(orderIndices);
  return currentLayout.map((l) => {
    if (!set.has(l.order_index)) return l;
    const s = snapByOrder.get(l.order_index);
    if (!s) return l;
    return {
      ...l,
      y_top_pt: s.y_top_pt,
      img_y_top_pt: s.img_y_top_pt ?? s.y_top_pt,
    };
  });
}

/** Tam layout üzerinde sütun Y'lerini snapshot'tan geri yükler. */
export function restoreColumnFromSnapshot(
  currentLayout: LayoutItem[],
  snapshotLayout: LayoutItem[],
  pageNum: number,
  columnIndex: number,
  band: PdfColumnBand
): LayoutItem[] {
  const snapInCol = new Set(
    snapshotLayout
      .filter(
        (l) =>
          l.page_num === pageNum &&
          columnIndexFromQuestionXPt(l.x_pt, band) === columnIndex
      )
      .map((l) => l.order_index)
  );
  const orderList = [...snapInCol];
  return restoreLayoutItemsByOrderIndices(currentLayout, snapshotLayout, orderList);
}

/** Uygulanan sonuçtan order_index → y_top_pt haritası (export / store). */
export function extractYOverridesFromLayouts(
  before: LayoutItem[],
  after: LayoutItem[]
): Record<number, number> {
  const beforeMap = new Map(before.map((l) => [l.order_index, l.y_top_pt]));
  const out: Record<number, number> = {};
  for (const a of after) {
    const prev = beforeMap.get(a.order_index);
    if (prev !== undefined && Math.abs(a.y_top_pt - prev) > ORDER_EPS) {
      out[a.order_index] = a.y_top_pt;
    }
  }
  return out;
}

export function applyYTopOverridesToLayout(
  layout: LayoutItem[],
  overrides: Record<number, number>
): LayoutItem[] {
  if (!overrides || Object.keys(overrides).length === 0) return layout;
  return layout.map((l) => {
    const y = overrides[l.order_index];
    if (y === undefined) return l;
    return shiftLayoutItemYTop(l, y);
  });
}

export function clearYOverridesForOrders(
  overrides: Record<number, number>,
  orderIndices: number[]
): Record<number, number> {
  const next = { ...overrides };
  for (const oi of orderIndices) delete next[oi];
  return next;
}
