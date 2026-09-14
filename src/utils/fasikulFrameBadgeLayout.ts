/**
 * Fasikül çerçeve başlığı (kutu dışı) için sütun Y rezervi —
 * üstteki banner / kareli alan ile çakışmayı önler.
 */
import type { LayoutItem } from "../api/client";
import type { QuestionItem } from "../types";
import {
  getColumnItemsSortedTopFirst,
  shiftLayoutItemYTop,
} from "./columnRedistribute";
import {
  COLUMN_LAYOUT_BOTTOM_MIN_PT,
  computeColumnGapSizesPt,
} from "./columnGapDistribution";
import {
  computePageColumnBand,
  contentTopPtForColumn,
  mmToPdfPt,
  type LayoutGeometryInput,
} from "./pdfLayoutGeometry";
import { fasikulFrameBadgeTopReservePt } from "./fasikulQuestionFrame";
import { fasikulMinScratchGapPt } from "./questionScratchGrid";

/** Fasikül: sütun altında en az 3 kare satırı (+ pad) */
const FASIKUL_MIN_BOTTOM_SCRATCH_PT = fasikulMinScratchGapPt();

/**
 * Her sorunun h_pt / img_y_top ofsetini başlık rezervine göre ayarlar,
 * sütunu standart boşlukla yeniden dizer.
 * Bölüm başlığı (section) rezervi korunur — yalnızca fasikül rozeti değil.
 */
export function reflowLayoutForFasikulBadgeTopReserve(input: {
  layout: LayoutItem[];
  questions: QuestionItem[];
  geometry: LayoutGeometryInput;
  columns: number;
  questionGapMinMm: number;
}): LayoutItem[] {
  const { layout, questions, geometry, columns, questionGapMinMm } = input;
  if (layout.length === 0) return layout;

  const qByOrder = new Map(questions.map((q) => [q.order_index, q]));
  const gapPt = Math.max(
    mmToPdfPt(Math.max(0, questionGapMinMm)),
    fasikulMinScratchGapPt(),
  );
  const cols = Math.max(1, Math.min(6, columns));
  const pageNums = [
    ...new Set(
      layout
        .filter((l) => l.kind !== "answer_key_page")
        .map((l) => l.page_num)
        .filter((p) => p > 0),
    ),
  ].sort((a, b) => a - b);

  const updates = new Map<number, LayoutItem>();

  for (const pageNum of pageNums) {
    const geo = { ...geometry, pageNum };
    const band = computePageColumnBand(geo);
    for (let colIdx = 0; colIdx < cols; colIdx++) {
      const items = getColumnItemsSortedTopFirst(layout, pageNum, colIdx, band);
      if (items.length === 0) continue;

      let colNeeds = false;
      const prepared = items.map((item) => {
        const q = qByOrder.get(item.order_index);
        const badgeReserve = fasikulFrameBadgeTopReservePt(q?.fasikulFrame);
        const sectionReserve = layoutItemSectionReservePt(item);
        const reserve = badgeReserve + sectionReserve;
        const currentReserve = Math.max(
          0,
          item.y_top_pt - (item.img_y_top_pt ?? item.y_top_pt),
        );
        const imgH =
          item.img_h_pt != null && item.img_h_pt > 0
            ? item.img_h_pt
            : Math.max(1, item.h_pt - currentReserve);
        if (
          Math.abs(reserve - currentReserve) > 0.05 ||
          Math.abs(item.h_pt - (imgH + reserve)) > 0.05
        ) {
          colNeeds = true;
        }
        return {
          ...item,
          h_pt: imgH + reserve,
          img_h_pt: imgH,
          img_y_top_pt: item.y_top_pt - reserve,
        };
      });

      if (!colNeeds) continue;

      const contentTop = contentTopPtForColumn(geo, colIdx);
      const contentBottom = band.contentBottomPt;
      const totalH = prepared.reduce((s, it) => s + it.h_pt, 0);
      const gapBudget = contentTop - contentBottom - totalH;
      const gaps = computeColumnGapSizesPt(
        gapBudget,
        prepared.length,
        gapPt,
        Math.max(COLUMN_LAYOUT_BOTTOM_MIN_PT, FASIKUL_MIN_BOTTOM_SCRATCH_PT),
        { fixedInterGaps: true },
      );

      let y = contentTop;
      for (let i = 0; i < prepared.length; i++) {
        const item = prepared[i]!;
        updates.set(item.order_index, shiftLayoutItemYTop(item, y));
        y -= item.h_pt + (gaps[i] ?? 0);
      }
    }
  }

  if (updates.size === 0) return layout;
  return layout.map((l) => updates.get(l.order_index) ?? l);
}

/** Bölüm kutusu + alt boşluk (layout-engine SECTION_BOX_H + GAP ile uyumlu) */
export function layoutItemSectionReservePt(item: LayoutItem): number {
  const sec = item.section;
  if (!sec) return 0;
  const boxH = Number(sec.box_h);
  const gapAfter = Number(sec.gap_after);
  return (
    (Number.isFinite(boxH) && boxH > 0 ? boxH : 22) +
    (Number.isFinite(gapAfter) && gapAfter >= 0 ? gapAfter : 6)
  );
}
