/**
 * PDF soru alanı geometrisi — backend `desktop_export._compute_layout_geometry` ile uyumlu.
 * Önizleme sütun seçimi ve dikey dağıtım sınırları için kullanılır.
 */

import {
  approxWrittenHeaderHeightPt,
  emptyWrittenHeaderFieldHidden,
  emptyWrittenHeaderFieldLines,
  type WrittenHeaderFieldHidden,
  type WrittenHeaderFieldLines,
} from "../constants/writtenHeaderFields";

const PT_PER_INCH = 72;
const MM_PER_INCH = 25.4;

/** Backend `_FIRST_PAGE_BANNER_H_PT` */
export const FIRST_PAGE_BANNER_H_PT = 22;
/** Backend `_FIRST_PAGE_BANNER_GAP_PT` */
export const FIRST_PAGE_BANNER_GAP_PT = 2;
/** Backend `_OTHER_PAGES_BANNER_BELOW_GAP_PT` */
export const OTHER_PAGES_BANNER_BELOW_GAP_PT = 4;
/** Backend `_OTHER_PAGES_HEADER_H_PT` */
export const OTHER_PAGES_HEADER_H_PT = 4;
/** Backend `_OTHER_PAGES_HEADER_GAP_PT` */
export const OTHER_PAGES_HEADER_GAP_PT = 8;
/** Backend `ExportOptions.footer_top_offset_mm` */
export const FOOTER_TOP_OFFSET_MM = 12.35;
/** Alt dekoratif şerit — sayfa alt kenarından (mm) */
export const FOOTER_BOTTOM_OFFSET_MM = 3.0;
/** Sayfa numarası — şeritler arası dikey boşluk (mm) */
export const FOOTER_NUMBER_PAD_MM = 0.8;

/** Başlık altı — ilk soru boşluğu varsayılanı (mm) */
export const DEFAULT_HEADER_BOTTOM_GAP_MM = 1.5;
/** Diğer sayfalar — üst çizgi altı boşluk varsayılanı (mm) */
export const DEFAULT_OTHER_PAGE_HEADER_BOTTOM_GAP_MM = 1.0;
export const DEFAULT_QUESTION_NUMBER_LEFT_OFFSET_MM = 0.5;
export const DEFAULT_QUESTION_NUMBER_IMAGE_GAP_MM = 0.3;

import {
  CLASSIC_BANNER_AND_INFO_H_PT,
  CLASSIC_INFO_BAR_BADGE_INSET_PT,
  CLASSIC_INFO_BAR_H_PT,
  DESC_BANNER_GAP_PT,
  DESC_BANNER_H_PT,
  DESC_BOX_GAP_BELOW_PT,
  descriptionHeaderBlockHeightPt,
} from "./descriptionBoxLayout";
import {
  isCorporateHeader,
  type HeaderConfig,
} from "./corporateHeaderLayout";
import { themeFirstPageHeaderTotalPt, themeRunningGapBelowPt, themeRunningHeaderTotalPt } from "./headerStyles";
import { mergeHeaderBadgeConfig } from "./headerBadgeByStyle";

export function mmToPdfPt(mm: number): number {
  return (mm * PT_PER_INCH) / MM_PER_INCH;
}

function classicBannerAndInfoHeightPt(input: LayoutGeometryInput): number {
  if (!input.headerConfig) return CLASSIC_BANNER_AND_INFO_H_PT
  const cfg = mergeHeaderBadgeConfig(input.headerConfig, input.headerStyleId)
  const mode = cfg.bannerRightMode
  let badgeH = 0
  if (mode === "testNo") badgeH = Number(cfg.testNoHeightPt) || 22
  else if (mode === "score") badgeH = Number(cfg.scoreBoxHeightPt) || 37
  else if (mode === "examType") badgeH = Number(cfg.examTypeBoxManualHeightPt) || 36
  const infoH = Math.max(
    CLASSIC_INFO_BAR_H_PT,
    badgeH + CLASSIC_INFO_BAR_BADGE_INSET_PT * 2,
  )
  return DESC_BANNER_H_PT + DESC_BANNER_GAP_PT + infoH
}

export type LayoutGeometryInput = {
  pageWpt: number;
  pageHpt: number;
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  columns: number;
  columnGapMm: number;
  /** 1-based sayfa */
  pageNum: number;
  writtenPaperHeader: boolean;
  writtenPaperTitle?: string;
  writtenPaperFieldLines?: WrittenHeaderFieldLines;
  writtenPaperFieldHidden?: WrittenHeaderFieldHidden;
  includeDescription: boolean;
  descriptionColumnCount: number;
  descriptionTexts: string[];
  headerStyleId?: string;
  /** Tema 1 dinamik banner yüksekliği için */
  headerConfig?: HeaderConfig;
  /** Başlık bitişi ile 1. soru arası (mm) — yalnızca 1. sayfa */
  headerBottomGapMm?: number;
  /** Diğer sayfalar — üst çizgi ile sorular arası (mm) */
  otherPageHeaderBottomGapMm?: number;
  /** Soru numarası sol boşluk kaydırması (mm, −15…+15) — tüm sütunlar birlikte */
  questionNumberLeftOffsetMm?: number;
  /** Soru numarası ile görsel arası yatay boşluk (mm) */
  questionNumberImageGapMm?: number;
};

export type PdfColumnBand = {
  /** Soru paketleme üst sınırı (PDF pt, y yukarı) — backend `content_top_*` */
  contentTopPt: number;
  /**
   * Footer bandının üst çizgisi (PDF pt) — backend `content_bottom`, Canvas `footerTopPt`.
   * Mod 2 alt boşluk: son soru görsel altı ile bu çizgi arası mesafe.
   */
  contentBottomPt: number;
  columnXPt: number[];
  colWidthPt: number;
  colGapPt: number;
};

function headerBottomGapPt(input: LayoutGeometryInput): number {
  const mm = input.headerBottomGapMm ?? DEFAULT_HEADER_BOTTOM_GAP_MM;
  return mmToPdfPt(Math.max(0, Math.min(50, mm)));
}

export function otherPageHeaderBottomGapPtFromMm(mm?: number): number {
  const v = mm ?? DEFAULT_OTHER_PAGE_HEADER_BOTTOM_GAP_MM;
  return mmToPdfPt(Math.max(0, Math.min(50, v)));
}

function otherPageHeaderBottomGapPt(input: LayoutGeometryInput): number {
  return otherPageHeaderBottomGapPtFromMm(input.otherPageHeaderBottomGapMm);
}

/** 2+ sayfa running header toplam yüksekliği (ayarlanabilir alt boşluk dahil). */
export function corporateOtherPageHeaderLayoutPt(
  styleId?: string,
  otherPageGapMm?: number,
): number {
  const base = otherPageRunningHeaderStripeBottomPt(styleId);
  return base + otherPageHeaderBottomGapPtFromMm(otherPageGapMm);
}

/** 2+ sayfa running header — alt dekoratif şerit alt kenarı (üst boşluk hariç). */
export function otherPageRunningHeaderStripeBottomPt(styleId?: string): number {
  return themeRunningHeaderTotalPt(styleId) - themeRunningGapBelowPt(styleId);
}

/** Sütun ayırıcı üst sınırı — sayfa üstünden itibaren pt (yalnızca 2+ sayfa). */
export function otherPageColumnDividerStartFromTopPt(input: {
  pageNum: number;
  headerStyleId?: string;
  writtenPaperHeader?: boolean;
}): number | null {
  if (input.pageNum <= 1) return null;
  if (input.writtenPaperHeader) return 2;
  if (isCorporateHeader(input.headerStyleId)) {
    return otherPageRunningHeaderStripeBottomPt(input.headerStyleId);
  }
  return FIRST_PAGE_BANNER_H_PT;
}

export function questionNumberImageGapPt(
  input: Pick<LayoutGeometryInput, "questionNumberImageGapMm">
): number {
  const mm = input.questionNumberImageGapMm ?? DEFAULT_QUESTION_NUMBER_IMAGE_GAP_MM;
  return mmToPdfPt(Math.max(0, Math.min(20, mm)));
}

function contentTopFirstBasePt(input: LayoutGeometryInput): number {
  const { pageHpt, marginTopMm } = input;
  const mt = mmToPdfPt(marginTopMm);
  if (input.writtenPaperHeader) {
    const h = approxWrittenHeaderHeightPt(
      input.writtenPaperFieldLines ?? emptyWrittenHeaderFieldLines(),
      input.writtenPaperTitle ?? "",
      Math.max(100, input.pageWpt - mmToPdfPt(input.marginLeftMm) - mmToPdfPt(input.marginRightMm) - 8),
      input.writtenPaperFieldHidden ?? emptyWrittenHeaderFieldHidden()
    );
    return pageHpt - mt - h;
  }
  const contentW =
    input.pageWpt - mmToPdfPt(input.marginLeftMm) - mmToPdfPt(input.marginRightMm);
  if (isCorporateHeader(input.headerStyleId)) {
    return (
      pageHpt -
      mt -
      themeFirstPageHeaderTotalPt(
        input.headerStyleId,
        input.headerConfig,
        input.pageWpt,
        input.marginLeftMm,
        input.marginRightMm,
      )
    );
  }
  const classicBannerH = classicBannerAndInfoHeightPt(input);
  if (input.includeDescription) {
    const headerBlock = descriptionHeaderBlockHeightPt(
      {
        includeDescription: true,
        descriptionColumnCount: input.descriptionColumnCount,
        descriptionTexts: input.descriptionTexts,
      },
      contentW,
      undefined,
      classicBannerH,
    );
    return pageHpt - mt - headerBlock;
  }
  return pageHpt - mt - classicBannerH - DESC_BOX_GAP_BELOW_PT;
}

function contentTopFirstPt(input: LayoutGeometryInput): number {
  return contentTopFirstBasePt(input) - headerBottomGapPt(input);
}

/** 1. sayfada kenar sütunlar boşluk alır; orta sütun(lar) banner altından başlar. */
export function contentTopPtForColumn(input: LayoutGeometryInput, colIdx: number): number {
  if (input.pageNum > 1) return contentTopOtherPt(input);
  const cols = Math.max(1, Math.min(6, input.columns));
  const isMiddleColumn = cols >= 3 && colIdx > 0 && colIdx < cols - 1;
  if (isMiddleColumn) return contentTopFirstBasePt(input);
  return contentTopFirstPt(input);
}

function contentTopOtherPt(input: LayoutGeometryInput): number {
  const { pageHpt, marginTopMm } = input;
  const mt = mmToPdfPt(marginTopMm);
  const gapPt = otherPageHeaderBottomGapPt(input);
  if (input.writtenPaperHeader) {
    return pageHpt - mt - OTHER_PAGES_HEADER_H_PT - gapPt;
  }
  if (isCorporateHeader(input.headerStyleId)) {
    return pageHpt - mt - corporateOtherPageHeaderLayoutPt(input.headerStyleId, input.otherPageHeaderBottomGapMm);
  }
  return pageHpt - mt - FIRST_PAGE_BANNER_H_PT - gapPt;
}

/**
 * Belirli sayfa için içerik bandı ve sütun x konumları (PDF pt).
 */
export function computePageColumnBand(input: LayoutGeometryInput): PdfColumnBand {
  const ml = mmToPdfPt(input.marginLeftMm);
  const mr = mmToPdfPt(input.marginRightMm);
  const mb = mmToPdfPt(input.marginBottomMm);
  const cols = Math.max(1, Math.min(6, input.columns));
  const colGap = mmToPdfPt(input.columnGapMm);
  const contentW = input.pageWpt - ml - mr;
  const colW =
    cols > 1 ? (contentW - (cols - 1) * colGap) / cols : contentW;
  const columnXPt = Array.from({ length: cols }, (_, i) => ml + i * (colW + colGap));
  const contentBottomPt = mb + mmToPdfPt(FOOTER_TOP_OFFSET_MM);
  const contentTopPt =
    input.pageNum <= 1 ? contentTopFirstPt(input) : contentTopOtherPt(input);
  return {
    contentTopPt,
    contentBottomPt,
    columnXPt,
    colWidthPt: colW,
    colGapPt: colGap,
  };
}

const X_MATCH_EPS_PT = 1.5;

/**
 * Soru kutusunun `x_pt` değerinden sütun indeksi (0-based).
 */
export function columnIndexFromQuestionXPt(
  xPt: number,
  band: PdfColumnBand
): number {
  const { columnXPt, colWidthPt } = band;
  if (columnXPt.length <= 1) return 0;
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < columnXPt.length; i++) {
    const d = Math.abs(xPt - columnXPt[i]);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  if (bestD > colWidthPt + band.colGapPt) {
    for (let i = 0; i < columnXPt.length; i++) {
      if (xPt >= columnXPt[i] - X_MATCH_EPS_PT && xPt <= columnXPt[i] + colWidthPt + X_MATCH_EPS_PT) {
        return i;
      }
    }
  }
  return best;
}

/** Canlı banner boşluk önizlemesi — layout commit edilmeden sorulara uygulanacak Y kayması (PDF pt). */
export function liveAlignmentYShiftPtForItem(
  item: { x_pt: number; page_num?: number },
  input: {
    pageNum: number;
    columns: number;
    band: PdfColumnBand;
    live?: { headerBottomGapMm?: number; otherPageHeaderBottomGapMm?: number } | null;
    committedHeaderBottomGapMm: number;
    committedOtherPageHeaderBottomGapMm: number;
  },
): number {
  if (input.pageNum <= 1) {
    const liveGap = input.live?.headerBottomGapMm;
    if (
      liveGap == null ||
      Math.abs(liveGap - input.committedHeaderBottomGapMm) < 0.0001
    ) {
      return 0;
    }
    const colIdx = columnIndexFromQuestionXPt(item.x_pt, input.band);
    const cols = Math.max(1, input.columns);
    const isMiddleColumn = cols >= 3 && colIdx > 0 && colIdx < cols - 1;
    if (isMiddleColumn) return 0;
    const committedPt = mmToPdfPt(
      Math.max(0, Math.min(50, input.committedHeaderBottomGapMm)),
    );
    const livePt = mmToPdfPt(Math.max(0, Math.min(50, liveGap)));
    return committedPt - livePt;
  }
  const liveGap = input.live?.otherPageHeaderBottomGapMm;
  if (
    liveGap == null ||
    Math.abs(liveGap - input.committedOtherPageHeaderBottomGapMm) < 0.0001
  ) {
    return 0;
  }
  return (
    otherPageHeaderBottomGapPtFromMm(input.committedOtherPageHeaderBottomGapMm) -
    otherPageHeaderBottomGapPtFromMm(liveGap)
  );
}

export type ColumnContentRectPx = {
  leftPx: number;
  topPx: number;
  widthPx: number;
  heightPx: number;
};

/**
 * Önizleme canvas'ında sütun tıklama alanı (CSS px, canvas ile aynı ölçek).
 */
export function columnContentRectsPx(
  band: PdfColumnBand,
  pageHpt: number,
  canvasScale: number,
  contentTopByColumn?: number[]
): ColumnContentRectPx[] {
  const bottomPt = band.contentBottomPt;
  return band.columnXPt.map((x, colIdx) => {
    const topPt = contentTopByColumn?.[colIdx] ?? band.contentTopPt;
    const heightPt = Math.max(0, topPt - bottomPt);
    const topPx = (pageHpt - topPt) * canvasScale;
    const heightPx = heightPt * canvasScale;
    return {
      leftPx: x * canvasScale,
      topPx,
      widthPx: band.colWidthPt * canvasScale,
      heightPx,
    };
  });
}
