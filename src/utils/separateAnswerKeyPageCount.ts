/**
 * Ayrı sayfa cevap anahtarı için sayfa sayısı — ayrı sayfa tablo ölçüleriyle uyumlu.
 */
import { FOOTER_TOP_OFFSET_MM, mmToPdfPt } from "./pdfLayoutGeometry";
import { SEPARATE_AK, separateAnswerKeyCapacity } from "./separateAnswerKeyTable";

function nextChunk(
  maxH: number,
  itemCount: number,
  pairsPerRow: number
): { used: number; consumed: number } {
  const { maxRows, capacity } = separateAnswerKeyCapacity({
    availableHeightPt: maxH,
    pairsPerRow,
  });
  if (maxRows <= 0 || itemCount <= 0) return { used: 0, consumed: 0 };
  const consumed = Math.min(capacity, itemCount);
  const rows = Math.ceil(consumed / pairsPerRow);
  const tableH =
    SEPARATE_AK.HEADER_H_PT + rows * SEPARATE_AK.ROW_H_PT + SEPARATE_AK.BOTTOM_PAD_PT;
  return { used: Math.min(tableH, maxH) + 5, consumed };
}

export function countSeparateAnswerKeyPages(params: {
  itemCount: number;
  pageHpt: number;
  marginTopMm: number;
  marginBottomMm: number;
  pairsPerRow?: number;
}): number {
  const { itemCount, pageHpt, marginTopMm, marginBottomMm } = params;
  if (itemCount <= 0) return 0;
  const mt = mmToPdfPt(marginTopMm);
  const mb = mmToPdfPt(marginBottomMm);
  const footerTop = mb + mmToPdfPt(FOOTER_TOP_OFFSET_MM);
  const effectiveBottom = footerTop + mmToPdfPt(2);
  const top = pageHpt - mt - SEPARATE_AK.TOP_GAP_PT;
  let y0 = top - 8;
  let pages = 1;
  let remaining = itemCount;
  const pairs = Math.max(1, params.pairsPerRow ?? SEPARATE_AK.PAIRS_PER_ROW);
  while (remaining > 0) {
    const maxH = Math.max(0, y0 - effectiveBottom);
    const { used, consumed } = nextChunk(maxH, remaining, pairs);
    if (used <= 0 || consumed <= 0) {
      pages += 1;
      y0 = top - 8;
      continue;
    }
    y0 -= used + 10;
    remaining -= consumed;
  }
  return pages;
}
