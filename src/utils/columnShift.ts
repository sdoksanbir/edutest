/**
 * Sütun başı / sonu sorularını komşu sütuna kaydırma — önizleme sıra değişimi.
 */

import type { LayoutItem } from "../api/client";
import type { QuestionItem } from "../types";
import { getColumnItemsSortedTopFirst } from "./columnRedistribute";
import {
  columnIndexFromQuestionXPt,
  computePageColumnBand,
  type LayoutGeometryInput,
  type PdfColumnBand,
} from "./pdfLayoutGeometry";

export type ColumnSlot = {
  pageNum: number;
  columnIndex: number;
};

export type ColumnShiftArrowMeta = {
  showPrevColumnArrow: boolean;
  showNextColumnArrow: boolean;
};

export type ShiftTargetForBottom = {
  pageNum: number;
  columnIndex: number;
  insertAt: "top" | "bottom";
};

export type ShiftTargetForBottomOptions = {
  layout?: LayoutItem[];
  bottomOrderIndex?: number;
  /** Alt soru aynı zamanda sütunun en üst sorusu mu */
  isTopOfColumn?: boolean;
};

/** Layout'taki en yüksek order_index (testin son sorusu). */
export function getGlobalLastQuestionOrderIndex(layout: LayoutItem[]): number | null {
  const questionItems = layout.filter((l) => l.kind !== "answer_key_page");
  if (questionItems.length === 0) return null;
  return Math.max(...questionItems.map((l) => l.order_index ?? 0));
}

function shouldSuppressCrossPageNextForGlobalLastAtRightColumnTop(
  layout: LayoutItem[],
  pageNum: number,
  colIdx: number,
  columns: number,
  bottomOrderIndex: number,
  target: ShiftTargetForBottom
): boolean {
  const cols = Math.max(1, columns);
  const globalLastOi = getGlobalLastQuestionOrderIndex(layout);
  if (globalLastOi == null || bottomOrderIndex !== globalLastOi) return false;
  if (colIdx !== cols - 1) return false;
  return target.insertAt === "top" && target.pageNum > pageNum && target.columnIndex === 0;
}

/**
 * Sütun alt sorusu için hedef: önce sonraki sütun (boş olsa da), yoksa önceki sütunun altı.
 * Testin son sorusu sağ sütunun en üstündeyse sonraki sayfa hedefi gösterilmez.
 */
export function resolveShiftTargetForBottom(
  pageNum: number,
  colIdx: number,
  columns: number,
  maxQuestionPage: number,
  options?: ShiftTargetForBottomOptions
): ShiftTargetForBottom | null {
  const cols = Math.max(1, columns);
  const next = nextColumnSlot(pageNum, colIdx, cols, maxQuestionPage);
  if (next) {
    const target: ShiftTargetForBottom = {
      pageNum: next.pageNum,
      columnIndex: next.columnIndex,
      insertAt: "top",
    };
    const suppress =
      options?.layout &&
      options.bottomOrderIndex != null &&
      options.isTopOfColumn &&
      shouldSuppressCrossPageNextForGlobalLastAtRightColumnTop(
        options.layout,
        pageNum,
        colIdx,
        cols,
        options.bottomOrderIndex,
        target
      );
    if (!suppress) return target;
  }
  const prev = prevColumnSlot(pageNum, colIdx, cols);
  if (prev) {
    return { pageNum: prev.pageNum, columnIndex: prev.columnIndex, insertAt: "bottom" };
  }
  return null;
}

export function prevColumnSlot(
  pageNum: number,
  colIdx: number,
  columns: number
): ColumnSlot | null {
  if (colIdx > 0) return { pageNum, columnIndex: colIdx - 1 };
  if (pageNum > 1) return { pageNum: pageNum - 1, columnIndex: columns - 1 };
  return null;
}

export function nextColumnSlot(
  pageNum: number,
  colIdx: number,
  columns: number,
  maxQuestionPage: number
): ColumnSlot | null {
  if (colIdx < columns - 1) return { pageNum, columnIndex: colIdx + 1 };
  if (pageNum < maxQuestionPage) return { pageNum: pageNum + 1, columnIndex: 0 };
  return null;
}

function columnItemsAt(
  layout: LayoutItem[],
  slot: ColumnSlot,
  band: PdfColumnBand
): LayoutItem[] {
  return getColumnItemsSortedTopFirst(
    layout,
    slot.pageNum,
    slot.columnIndex,
    band
  );
}

/** Sayfadaki sütun uç soruları için ok görünürlüğü. */
export function getPageColumnShiftMeta(
  layout: LayoutItem[],
  pageNum: number,
  columns: number,
  maxQuestionPage: number,
  bandForPage: (page: number) => PdfColumnBand
): Map<number, ColumnShiftArrowMeta> {
  const meta = new Map<number, ColumnShiftArrowMeta>();
  const cols = Math.max(1, columns);

  for (let colIdx = 0; colIdx < cols; colIdx += 1) {
    const band = bandForPage(pageNum);
    const items = getColumnItemsSortedTopFirst(layout, pageNum, colIdx, band);
    if (items.length === 0) continue;

    const top = items[0]!;
    const bottom = items[items.length - 1]!;

    const prevSlot = prevColumnSlot(pageNum, colIdx, cols);
    if (prevSlot) {
      const prevItems = columnItemsAt(layout, prevSlot, bandForPage(prevSlot.pageNum));
      if (prevItems.length > 0) {
        const oi = top.order_index ?? 0;
        const cur = meta.get(oi) ?? {
          showPrevColumnArrow: false,
          showNextColumnArrow: false,
        };
        cur.showPrevColumnArrow = true;
        meta.set(oi, cur);
      }
    }

    const bottomIsTop = (top.order_index ?? 0) === (bottom.order_index ?? 0);
    const bottomTarget = resolveShiftTargetForBottom(pageNum, colIdx, cols, maxQuestionPage, {
      layout,
      bottomOrderIndex: bottom.order_index ?? 0,
      isTopOfColumn: bottomIsTop,
    });
    if (bottomTarget) {
      const oi = bottom.order_index ?? 0;
      const cur = meta.get(oi) ?? {
        showPrevColumnArrow: false,
        showNextColumnArrow: false,
      };
      cur.showNextColumnArrow = true;
      meta.set(oi, cur);
    }
  }

  return meta;
}

export type ColumnShiftDirection = "prev_column" | "next_column";

export type ColumnShiftSwapOk = { ok: true; orderA: number; orderB: number };
export type ColumnShiftSwapErr = { ok: false; reason: string };
export type ColumnShiftSwapResult = ColumnShiftSwapOk | ColumnShiftSwapErr;

/**
 * Sütun uç sorusunu komşu sütunun uç sorusu ile yer değiştirir (global sıra).
 * Üst soru → önceki sütunun alt sorusu; alt soru → sonraki sütunun üst sorusu.
 */
export function resolveColumnShiftSwap(
  layout: LayoutItem[],
  pageNum: number,
  columns: number,
  maxQuestionPage: number,
  orderIndex: number,
  direction: ColumnShiftDirection,
  bandForPage: (page: number) => PdfColumnBand
): ColumnShiftSwapResult {
  const band = bandForPage(pageNum);
  const item = layout.find(
    (l) => l.order_index === orderIndex && l.page_num === pageNum && l.kind !== "answer_key_page"
  );
  if (!item) return { ok: false, reason: "Soru bulunamadı." };

  const colIdx = columnIndexFromQuestionXPt(item.x_pt, band);
  const colItems = getColumnItemsSortedTopFirst(layout, pageNum, colIdx, band);
  if (colItems.length === 0) return { ok: false, reason: "Sütun boş." };

  const cols = Math.max(1, columns);

  if (direction === "prev_column") {
    const top = colItems[0]!;
    if (top.order_index !== orderIndex) {
      return { ok: false, reason: "Yalnızca sütunun en üst sorusu taşınabilir." };
    }
    const prevSlot = prevColumnSlot(pageNum, colIdx, cols);
    if (!prevSlot) return { ok: false, reason: "Önceki sütun yok." };
    const prevItems = columnItemsAt(layout, prevSlot, bandForPage(prevSlot.pageNum));
    if (prevItems.length === 0) return { ok: false, reason: "Önceki sütun boş." };
    const bottomPrev = prevItems[prevItems.length - 1]!;
    return { ok: true, orderA: orderIndex, orderB: bottomPrev.order_index ?? 0 };
  }

  const bottom = colItems[colItems.length - 1]!;
  if (bottom.order_index !== orderIndex) {
    return { ok: false, reason: "Yalnızca sütunun en alt sorusu taşınabilir." };
  }
  const nextSlot = nextColumnSlot(pageNum, colIdx, cols, maxQuestionPage);
  if (!nextSlot) return { ok: false, reason: "Sonraki sütun yok." };
  const nextItems = columnItemsAt(layout, nextSlot, bandForPage(nextSlot.pageNum));
  if (nextItems.length === 0) return { ok: false, reason: "Sonraki sütun boş." };
  const topNext = nextItems[0]!;
  return { ok: true, orderA: orderIndex, orderB: topNext.order_index ?? 0 };
}

export function bandForGeometry(input: LayoutGeometryInput, pageNum: number): PdfColumnBand {
  return computePageColumnBand({ ...input, pageNum });
}

/** İki sorunun global sırasını değiştirir (sütun uçları arası taşıma). */
export function swapQuestionsByOrderIndex(
  questions: QuestionItem[],
  orderA: number,
  orderB: number
): QuestionItem[] {
  if (orderA === orderB) return questions;
  const sorted = [...questions].sort((a, b) => a.order_index - b.order_index);
  const iA = sorted.findIndex((q) => q.order_index === orderA);
  const iB = sorted.findIndex((q) => q.order_index === orderB);
  if (iA < 0 || iB < 0) return questions;
  [sorted[iA], sorted[iB]] = [sorted[iB]!, sorted[iA]!];
  return sorted.map((q, i) => ({ ...q, order_index: i }));
}
