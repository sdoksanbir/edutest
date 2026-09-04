/**
 * Ayrı sayfa cevap anahtarı için sayfa sayısı — backend `export_from_payload` çizim akışı
 * ile aynı sabitler (önizleme küçük resim sayısı).
 */
import { FOOTER_TOP_OFFSET_MM, mmToPdfPt } from "./pdfLayoutGeometry";

const AK_HEADER_PT = 14;
const AK_ROW_PT = 14;
const AK_BOTTOM_PAD_PT = 2;

function nextChunk(
  maxH: number,
  itemCount: number,
  entriesPerRow: number
): { used: number; consumed: number } {
  const colCount = Math.max(1, Math.floor(entriesPerRow) || 1);
  const available = Math.max(0, maxH - AK_HEADER_PT - AK_BOTTOM_PAD_PT);
  const maxRows = available > AK_ROW_PT ? Math.floor(available / AK_ROW_PT) : 0;
  if (maxRows <= 0 || itemCount <= 0) return { used: 0, consumed: 0 };
  const capacity = maxRows * colCount;
  const consumed = Math.min(capacity, itemCount);
  const rows = Math.ceil(consumed / colCount);
  let tableH = AK_HEADER_PT + rows * AK_ROW_PT + AK_BOTTOM_PAD_PT;
  tableH = Math.min(tableH, maxH);
  return { used: tableH + 5, consumed };
}

export function countSeparateAnswerKeyPages(params: {
  itemCount: number;
  pageHpt: number;
  marginTopMm: number;
  marginBottomMm: number;
}): number {
  const { itemCount, pageHpt, marginTopMm, marginBottomMm } = params;
  if (itemCount <= 0) return 0;
  const mt = mmToPdfPt(marginTopMm);
  const mb = mmToPdfPt(marginBottomMm);
  const footerTop = mb + mmToPdfPt(FOOTER_TOP_OFFSET_MM);
  const effectiveBottom = footerTop + mmToPdfPt(2);
  const top = pageHpt - mt - 10;
  let y0 = top - 8;
  let pages = 1;
  let remaining = itemCount;
  while (remaining > 0) {
    const maxH = Math.max(0, y0 - effectiveBottom);
    const { used, consumed } = nextChunk(maxH, remaining, 4);
    if (used <= 0) {
      pages += 1;
      y0 = top - 8;
      continue;
    }
    y0 -= used + 10;
    remaining -= consumed;
  }
  return pages;
}
