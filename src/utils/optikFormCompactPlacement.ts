/**
 * end_of_test optik formu — son sayfa sağ sütuna sığmazsa ayrı sayfaya taşınır.
 */

import type { LayoutItem } from "../api/client";
import type { HeaderConfig } from "./corporateHeaderLayout";
import { estimateCompactOptikFormHeight } from "./drawOptikFormCanvas";
import {
  contentTopPtForColumn,
  FOOTER_TOP_OFFSET_MM,
  mmToPdfPt,
} from "./pdfLayoutGeometry";
import type { OptikFormBookletType } from "./optikFormSettings";
import { resolveOptikFormPageCount } from "./optikFormLayoutEngine";

const OPTIK_GAP_PT = 6;
const OPTIK_MIN_GAP_PT = 2;
const FOOTER_PAD_PT = 8;

export { OPTIK_GAP_PT, OPTIK_MIN_GAP_PT, FOOTER_PAD_PT };

/** Başlık altı içerik üstü — çağıranlar header alanlarını geçmeli */
export type OptikHeaderGeomInput = {
  contentTopPt?: number;
  headerStyleId?: string;
  headerConfig?: HeaderConfig;
  headerBottomGapMm?: number;
  otherPageHeaderBottomGapMm?: number;
  writtenPaperHeader?: boolean;
  includeDescription?: boolean;
};

export type EndOfTestOptikGeom = {
  colWPt: number;
  rightColX: number;
  /** Son sütundaki soruların en alçak görsel altı (PDF y); yoksa null */
  lowestImgBottomPt: number | null;
  footerTopPt: number;
  contentTopPt: number;
};

export function resolveEndOfTestContentTopPt(
  input: {
    layout: LayoutItem[];
    pageWpt: number;
    pageHpt: number;
    marginTopMm: number;
    marginBottomMm: number;
    marginLeftMm: number;
    marginRightMm: number;
    columns: number;
    columnGapMm?: number;
  } & OptikHeaderGeomInput,
): number {
  if (input.contentTopPt != null && Number.isFinite(input.contentTopPt)) {
    return input.contentTopPt;
  }
  const pageNum = Math.max(1, maxQuestionPageFromLayout(input.layout));
  const lastCol = Math.max(0, input.columns - 1);
  return contentTopPtForColumn(
    {
      pageWpt: input.pageWpt,
      pageHpt: input.pageHpt,
      marginTopMm: input.marginTopMm,
      marginBottomMm: input.marginBottomMm,
      marginLeftMm: input.marginLeftMm,
      marginRightMm: input.marginRightMm,
      columns: input.columns,
      columnGapMm: input.columnGapMm ?? 8,
      pageNum,
      writtenPaperHeader: input.writtenPaperHeader ?? false,
      includeDescription: input.includeDescription ?? false,
      descriptionColumnCount: 1,
      descriptionTexts: [],
      headerStyleId: input.headerStyleId,
      headerConfig: input.headerConfig,
      headerBottomGapMm: input.headerBottomGapMm,
      otherPageHeaderBottomGapMm: input.otherPageHeaderBottomGapMm,
    },
    lastCol,
  );
}

export function lastColumnOptikGeom(
  input: {
    pageWpt: number;
    pageHpt: number;
    marginTopMm: number;
    marginBottomMm: number;
    marginLeftMm: number;
    marginRightMm: number;
    columns: number;
    columnGapMm?: number;
    layout?: LayoutItem[];
  } & OptikHeaderGeomInput,
): Omit<EndOfTestOptikGeom, "lowestImgBottomPt"> {
  const ml = mmToPdfPt(input.marginLeftMm);
  const mr = mmToPdfPt(input.marginRightMm);
  const contentW = input.pageWpt - ml - mr;
  const cols = Math.max(1, input.columns);
  const gap = mmToPdfPt(input.columnGapMm ?? 8);
  const colWPt = (contentW - (cols - 1) * gap) / cols;
  const lastColIndex = cols - 1;
  const rightColX = ml + lastColIndex * (colWPt + gap);
  const footerTopPt = mmToPdfPt(input.marginBottomMm) + mmToPdfPt(FOOTER_TOP_OFFSET_MM);
  const contentTopPt = resolveEndOfTestContentTopPt({
    ...input,
    layout: input.layout ?? [],
  });
  return { colWPt, rightColX, footerTopPt, contentTopPt };
}

export function lowestImgBottomInLastCol(
  layout: LayoutItem[],
  pageNum: number,
  rightColX: number,
  colWPt: number,
): number | null {
  const lastColRight = rightColX + colWPt;
  let lowestBottom: number | null = null;
  for (const item of layout) {
    if (item.page_num !== pageNum) continue;
    if (item.kind === "answer_key_page") continue;
    if (item.img_y_top_pt == null || item.img_h_pt == null) continue;
    const cx = item.x_pt + (item.w_pt ?? colWPt) * 0.5;
    if (cx < rightColX - 1 || cx > lastColRight + 1) continue;
    const bottom = item.img_y_top_pt - item.img_h_pt;
    lowestBottom = lowestBottom == null ? bottom : Math.min(lowestBottom, bottom);
  }
  return lowestBottom;
}

export function maxQuestionPageFromLayout(layout: LayoutItem[]): number {
  const pages = layout
    .filter((l) => l.kind !== "answer_key_page")
    .map((l) => l.page_num ?? 1);
  return pages.length > 0 ? Math.max(...pages) : 1;
}

/** Son sütunda optik için kalan dikey alan (pt). */
export function availableHeightForEndOfTestOptikPt(input: {
  lowestImgBottomPt: number | null;
  contentTopPt: number;
  footerTopPt: number;
  /** Cevap anahtarı vb. footer üstünde ayrılan yükseklik */
  reservedAboveFooterPt?: number;
}): number {
  const reserved = Math.max(0, input.reservedAboveFooterPt ?? 0);
  const floorPt = input.footerTopPt + FOOTER_PAD_PT + reserved;
  const ceilingPt =
    input.lowestImgBottomPt != null
      ? Math.min(input.lowestImgBottomPt - OPTIK_GAP_PT, input.contentTopPt)
      : input.contentTopPt;
  return Math.max(0, ceilingPt - floorPt);
}

export function endOfTestOptikCompactFits(
  input: {
    layout: LayoutItem[];
    pageWpt: number;
    pageHpt: number;
    marginTopMm: number;
    marginBottomMm: number;
    marginLeftMm: number;
    marginRightMm: number;
    columns: number;
    columnGapMm?: number;
    rowCount: number;
    bookletType?: OptikFormBookletType;
    optionCount?: number;
    reservedAboveFooterPt?: number;
  } & OptikHeaderGeomInput,
): boolean {
  if (input.rowCount <= 0) return true;
  const mq = maxQuestionPageFromLayout(input.layout);
  const geom = lastColumnOptikGeom(input);
  const lowest = lowestImgBottomInLastCol(
    input.layout,
    mq,
    geom.rightColX,
    geom.colWPt,
  );
  const available = availableHeightForEndOfTestOptikPt({
    lowestImgBottomPt: lowest,
    contentTopPt: geom.contentTopPt,
    footerTopPt: geom.footerTopPt,
    reservedAboveFooterPt: input.reservedAboveFooterPt,
  });
  const hPt = estimateCompactOptikFormHeight(
    input.rowCount,
    1,
    geom.colWPt,
    input.bookletType ?? "none",
    input.optionCount ?? 5,
  );
  return hPt <= available + 0.5;
}

/** end_of_test sığmazsa 1 ekstra sayfa; separate_page her zaman 1. */
export function countOptikFormPagesForLayout(
  input: {
    enabled: boolean;
    placement: string;
    rowCount: number;
    layout: LayoutItem[];
    pageWpt: number;
    pageHpt: number;
    marginTopMm: number;
    marginBottomMm: number;
    marginLeftMm: number;
    marginRightMm: number;
    columns: number;
    columnGapMm?: number;
    bookletType?: OptikFormBookletType;
    optionCount?: number;
    reservedAboveFooterPt?: number;
  } & OptikHeaderGeomInput,
): number {
  if (!input.enabled || input.rowCount <= 0) return 0;
  if (input.placement === "separate_page") return 1;
  if (input.placement !== "end_of_test") return 0;
  const fits = endOfTestOptikCompactFits(input);
  return resolveOptikFormPageCount(true, "end_of_test", input.rowCount, fits);
}

export type CompactOptikFormPlacement = {
  pageNum: number;
  xPt: number;
  wPt: number;
  hPt: number;
  /** Form üst kenarı (PDF y, yukarı artar) */
  yTopPt: number;
  /** Form alt kenarı (PDF y) — drawImage y */
  yBottomPt: number;
  naturalYTopPt: number;
  /** offsetYPt: pozitif = sayfada aşağı (canvas Y artar) */
  offsetYPt: number;
  minOffsetYPt: number;
  maxOffsetYPt: number;
};

/**
 * Kompakt optik form dikey konumu.
 * offsetYPt > 0 → formu aşağı kaydır (sorulardan uzaklaştır / footera yaklaştır).
 */
export function resolveCompactOptikFormPlacement(
  input: {
    layout: LayoutItem[];
    pageWpt: number;
    pageHpt: number;
    marginTopMm: number;
    marginBottomMm: number;
    marginLeftMm: number;
    marginRightMm: number;
    columns: number;
    columnGapMm?: number;
    rowCount: number;
    bookletType?: OptikFormBookletType;
    optionCount?: number;
    reservedAboveFooterPt?: number;
    /** Kullanıcı sürükleme ofseti (pt, aşağı pozitif) */
    offsetYPt?: number;
  } & OptikHeaderGeomInput,
): CompactOptikFormPlacement | null {
  if (input.rowCount <= 0) return null;
  if (!endOfTestOptikCompactFits(input)) return null;

  const mq = maxQuestionPageFromLayout(input.layout);
  const geom = lastColumnOptikGeom(input);
  const lowest = lowestImgBottomInLastCol(
    input.layout,
    mq,
    geom.rightColX,
    geom.colWPt,
  );
  const hPt = estimateCompactOptikFormHeight(
    input.rowCount,
    1,
    geom.colWPt,
    input.bookletType ?? "none",
    input.optionCount ?? 5,
  );
  const reserved = Math.max(0, input.reservedAboveFooterPt ?? 0);
  const floorTop = geom.footerTopPt + FOOTER_PAD_PT + reserved + hPt;
  const contentTop = geom.contentTopPt;
  const ceilingTop =
    lowest != null
      ? Math.min(lowest - OPTIK_MIN_GAP_PT, contentTop)
      : contentTop;
  const naturalYTop =
    lowest != null
      ? Math.min(lowest - OPTIK_GAP_PT, contentTop)
      : contentTop;

  // offset>0 → yTop azalır (aşağı); offset<0 → yukarı (sorulara yaklaş)
  const minOffsetYPt = naturalYTop - ceilingTop;
  const maxOffsetYPt = Math.max(0, naturalYTop - floorTop);

  let offset = Number(input.offsetYPt ?? 0);
  if (!Number.isFinite(offset)) offset = 0;
  offset = Math.max(minOffsetYPt, Math.min(maxOffsetYPt, offset));

  const yTopPt = naturalYTop - offset;
  return {
    pageNum: mq,
    xPt: geom.rightColX,
    wPt: geom.colWPt,
    hPt,
    yTopPt,
    yBottomPt: yTopPt - hPt,
    naturalYTopPt: naturalYTop,
    offsetYPt: offset,
    minOffsetYPt,
    maxOffsetYPt,
  };
}

/** clientY delta (aşağı pozitif) → offsetYPt değişimi */
export function clientDeltaToOptikOffsetDelta(clientDy: number, scale: number): number {
  if (!(scale > 0)) return 0;
  return clientDy / scale;
}
