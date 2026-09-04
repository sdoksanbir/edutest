import type { OptikChoice } from "./optikFormStats";
import type { OptikFormBookletType, OptikFormNetRule } from "./optikFormSettings";
import type {
  OptikBookletBubbleMeta,
  OptikBubbleMeta,
  OptikFormLayoutResult,
  OptikFormMetadata,
  OptikMarkerMeta,
  OptikStudentIdBubblePx,
  OptikTimingMarkPx,
} from "./optikFormTypes";

export const OPTIK_FORM_COLORS = {
  bg: "#FFFFFF",
  text: "#0F172A",
  textMuted: "#94A3B8",
  bubbleBorder: "#94A3B8",
  marker: "#000000",
  border: "#0F172A",
  panelHeader: "#F1F5F9",
  rowStripe: "#F8FAFC",
  borderLight: "#CBD5E1",
} as const;

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

const MM_PER_PT = 25.4 / 72;

export function ptToMm(pt: number): number {
  return pt * MM_PER_PT;
}

export function mmToPt(mm: number): number {
  return mm / MM_PER_PT;
}

/** Şık harfi (A–E) yazı boyutu — punto. */
export const OPTIK_CHOICE_LABEL_PT = 8;
/** Soru numarası yazı boyutu (punto). */
export const OPTIK_QUESTION_NUM_PT = 8;
/** Form üst başlığı — CEVAP FORMU (punto). */
export const OPTIK_FORM_TITLE_PT = 9;
/** Form üst başlığı — sağ bilgi satırı (punto). */
export const OPTIK_FORM_SUBTITLE_PT = 7.5;
/** Cevap kutusu başlığı — CEVAPLAR (punto). */
export const OPTIK_ANSWERS_HEADER_PT = 9;

/** Harfin daire içine tam oturması için minimum baloncuk çapı (mm). */
export function choiceBubbleDiameterForLabelPt(labelPt: number, compact: boolean): number {
  const emMm = labelPt * MM_PER_PT;
  const innerPad = compact ? 0.34 : 0.46;
  return emMm * 1.18 + innerPad * 2;
}

function ptToLayoutPx(pt: number, scale: number, pxPerMm?: number): number {
  const mm = pt * (25.4 / 72);
  if (pxPerMm != null) return mm * pxPerMm;
  return mmToCanvasPx(mm, scale);
}

export function mmToCanvasPx(mm: number, scale: number): number {
  return mmToPt(mm) * scale;
}

/** YKS optik kağıdı — baloncuk çapı yazı boyutundan türetilir. */
export const YKS_BUBBLE_D_MM = {
  compact: choiceBubbleDiameterForLabelPt(OPTIK_CHOICE_LABEL_PT, true),
  full: choiceBubbleDiameterForLabelPt(OPTIK_CHOICE_LABEL_PT, false),
} as const;
export const YKS_BUBBLE_GAP_MM = { compact: 0.68, full: 0.82 } as const;
export const YKS_COL_PAD_MM = { compact: 1, full: 1.3 } as const;
/** ÖĞR. NO rakam satırları — satırlar arası boşluk (mm). */
export const YKS_DIGIT_ROW_GAP_MM = { compact: 0.75, full: 0.95 } as const;
/** ÖĞR. NO başlık şeridi yüksekliği (mm) — üst/alt iç boşluk. */
export const YKS_STUDENT_ID_HEADER_H_MM = { compact: 7, full: 7 } as const;
/** Cevap satırları — sorular arası ek dikey boşluk. */
export const YKS_ANSWER_ROW_GAP_MM = { compact: 0.6, full: 0.8 } as const;
/** Cevap satırı — baloncuk üst/alt iç boşluk (mm, tek taraf). */
export const YKS_ANSWER_ROW_PAD_MM = { compact: 0.35, full: 0.55 } as const;
/** Cevap grid — üst/alt dış boşluk (mm, tek taraf). */
export const YKS_ANSWERS_GRID_PAD_MM = { compact: 1.2, full: 1.55 } as const;
/** Cevap kutusu — header altı ve alt kenar boşluğu (mm, tek taraf). */
export const YKS_ANSWERS_BOX_PAD_MM = { compact: 2.5, full: 3.5 } as const;
/** CEVAPLAR başlık şeridi yüksekliği (mm) — üst/alt iç boşluk. */
export const YKS_ANSWERS_HEADER_H_MM = { compact: 7, full: 7 } as const;
/** ÖĞR. NO alanı ile CEVAPLAR kutusu arası dikey boşluk (mm). */
export const YKS_IDENTITY_ANSWERS_GAP_MM = { compact: 5.5, full: 7 } as const;
/** Üst başlık altı ile ÖĞR. NO kutusu arası dikey boşluk (mm). */
export const YKS_IDENTITY_TOP_GAP_MM = 3.6;
/** QR kod — çerçeve iç boşluğu (mm, tek taraf). */
export const YKS_QR_PAD_MM = 0.7;
/** QR kod — çerçeve çizgi kalınlığı (mm). */
export const YKS_QR_BORDER_W_MM = { compact: 0.22, full: 0.3 } as const;
/** QR altı — "tara" etiketi için ayrılan yükseklik (mm). */
export const YKS_QR_TARA_RESERVE_MM = { compact: 3.5, full: 5 } as const;
/** ÖĞR. NO ile kitapçık kutusu arası yatay boşluk (mm). */
export const YKS_IDENTITY_BOOKLET_GAP_MM = { compact: 1.2, full: 1.8 } as const;
/** Kitapçık kutusu ile QR sütunu arası yatay boşluk (mm). */
export const YKS_QR_BOOKLET_GAP_MM = { compact: 1, full: 1.5 } as const;
/** Kitapçık kutusu — minimum yükseklik (mm); baloncuk çapına göre büyür. */
export const YKS_BOOKLET_BOX_H_MM = { compact: 5, full: 6.5 } as const;
/** Kitapçık kutusu — iç boşluk (mm, tek taraf). */
export const YKS_BOOKLET_BOX_PAD_MM = { compact: 1, full: 1.3 } as const;
/** Kitapçık türü rozeti — minimum genişlik (mm). */
export const YKS_BOOKLET_LABEL_W_MM = { compact: 15, full: 18.5 } as const;
/** Kitapçık türü rozeti — metin yatay iç boşluk (mm, tek taraf). */
export const YKS_BOOKLET_LABEL_PAD_MM = { compact: 0.9, full: 1.2 } as const;
/** Siyah rozet üzerindeki sabit metin. */
export const BOOKLET_TYPE_BADGE_LABEL = "KİTAPÇIK TÜRÜ";
/** ÖĞR. NO kutusu — dış kenarlık kalınlığı (mm). */
export const YKS_STUDENT_ID_BORDER_W_MM = { compact: 0.5, full: 0.5 } as const;
/** CEVAPLAR kutusu — üst kenarlık kalınlığı (mm). */
export const YKS_ANSWERS_BORDER_W_MM = { compact: 0.5, full: 0.5 } as const;
/** CEVAPLAR cevap alanı — sol/sağ/alt çerçeve kalınlığı (mm). */
export const YKS_ANSWERS_BODY_BORDER_W_MM = { compact: 0.5, full: 0.5 } as const;
/** CEVAPLAR başlığı altı çizgi kalınlığı (mm). */
export const YKS_ANSWERS_HEADER_LINE_W_MM = { compact: 0.22, full: 0.3 } as const;
/** Cevap sütunu — kenar ve orta çizgiden iç boşluk (mm, tek taraf). */
export const YKS_ANSWERS_COL_INSET_MM = { compact: 1, full: 0.8 } as const;
/** Timing mark genişliği (mm) — yükseklikten dar, dikey dikdörtgen. */
export const YKS_TIMING_W_MM = { compact: 0.95, full: 1.45 } as const;
/** Timing mark ile soru numarası arası boşluk (mm) — tüm sorularda aynı. */
export const YKS_TIMING_NUM_GAP_MM = { compact: 2.6, full: 2.7 } as const;
/** Timing mark — sütun içinde sağa kaydırma (mm). */
export const YKS_TIMING_MARK_OFFSET_MM = { compact: 1.4, full: 1.4 } as const;
/** Timing mark yüksekliği — satır iç yüksekliğine oran. */
export const YKS_TIMING_H_RATIO = 0.68;

const MARKER_SIZE_PX = 32;
const COMPACT_MARKER_PX = 18;
const MAX_ANSWER_COLUMNS = 2;

/** Compact mod — sidebar / PDF sütun genişliği (mm). */
export const COMPACT_FORM_WIDTH_MM = 72;
export const COMPACT_PX_PER_MM = 2.5;

export function compactMarkerSizePx(_pxPerMm?: number): number {
  return COMPACT_MARKER_PX;
}

/** YKS hedef çapı; cevap sütununa sığmazsa hafif küçültülür. */
function resolveYksBubbleDiameterMm(
  optionCount: number,
  answerColWmm: number,
  compact: boolean,
): number {
  const targetFromLabel = choiceBubbleDiameterForLabelPt(OPTIK_CHOICE_LABEL_PT, compact);
  const target = Math.max(YKS_BUBBLE_D_MM[compact ? "compact" : "full"], targetFromLabel);
  const gap = YKS_BUBBLE_GAP_MM[compact ? "compact" : "full"];
  const timingW = YKS_TIMING_W_MM[compact ? "compact" : "full"];
  const timingNumGap = YKS_TIMING_NUM_GAP_MM[compact ? "compact" : "full"];
  const timingOffset = YKS_TIMING_MARK_OFFSET_MM[compact ? "compact" : "full"];
  const numW = compact ? 2.8 : 4.5;
  const pad = compact ? 0.3 : 0.6;
  const avail = answerColWmm - pad - timingW - timingNumGap - numW - 0.2 - timingOffset;
  const maxD =
    optionCount > 0 ? (avail - (optionCount - 1) * gap) / optionCount : target;
  return Math.max(compact ? 2.2 : 2.8, Math.min(target, maxD));
}

function studentColWidthMm(bubbleD: number, compact: boolean): number {
  return bubbleD + YKS_COL_PAD_MM[compact ? "compact" : "full"] * 2;
}

/** Kitapçık kutusu yüksekliği (mm) — kenarlık + rozet + baloncuklar dahil. */
function bookletBoxHeightMm(
  sharedBubbleD: number,
  compact: boolean,
  borderWmm: number,
): number {
  const pad = YKS_BOOKLET_BOX_PAD_MM[compact ? "compact" : "full"];
  const innerHmm = Math.max(
    YKS_BOOKLET_BOX_H_MM[compact ? "compact" : "full"] - 2 * borderWmm,
    sharedBubbleD + pad * 2,
  );
  return innerHmm + 2 * borderWmm;
}

function bookletBoxWidthMm(
  letterCount: number,
  bubbleDmm: number,
  bubbleGapMm: number,
  labelWMm: number,
  padMm: number,
  borderWmm: number,
): number {
  const bubblesWMm =
    letterCount * bubbleDmm + Math.max(0, letterCount - 1) * bubbleGapMm;
  return 2 * borderWmm + labelWMm + padMm + bubblesWMm + padMm;
}

let bookletLabelMeasureCtx: CanvasRenderingContext2D | null | undefined;

function measureBookletLabelTextWidthMm(
  text: string,
  fontPt: number,
  scale: number,
  pxPerMm?: number,
): number {
  const fontPx = ptToLayoutPx(fontPt, scale, pxPerMm);
  const emMm = fontPt * MM_PER_PT;
  let widthPx = text.length * fontPx * 0.58;

  if (typeof document !== "undefined") {
    if (bookletLabelMeasureCtx === undefined) {
      const canvas = document.createElement("canvas");
      bookletLabelMeasureCtx = canvas.getContext("2d");
    }
    if (bookletLabelMeasureCtx) {
      bookletLabelMeasureCtx.font = `600 ${fontPx}px Arial, Helvetica, sans-serif`;
      widthPx = bookletLabelMeasureCtx.measureText(text).width;
    }
  }

  if (pxPerMm != null) return widthPx / pxPerMm;
  return (widthPx / fontPx) * emMm;
}

function bookletLabelWidthMm(
  text: string,
  compact: boolean,
  scale: number,
  pxPerMm?: number,
): number {
  const pad = YKS_BOOKLET_LABEL_PAD_MM[compact ? "compact" : "full"];
  const textWMm = measureBookletLabelTextWidthMm(
    text,
    OPTIK_CHOICE_LABEL_PT,
    scale,
    pxPerMm,
  );
  const minW = YKS_BOOKLET_LABEL_W_MM[compact ? "compact" : "full"];
  return Math.max(minW, textWMm + pad * 2);
}

function bubbleRowContentH(sharedBubbleD: number, compact: boolean): number {
  const rowPad = YKS_ANSWER_ROW_PAD_MM[compact ? "compact" : "full"];
  return sharedBubbleD + rowPad * 2;
}

type CompactMetrics = {
  markerSizeMm: number;
  markerGapMm: number;
  contentW: number;
  studentIdWmm: number;
  sharedBubbleD: number;
  colCount: number;
  colGapMm: number;
};

function resolveCompactMetrics(
  formWidthMm: number,
  rowCount: number,
  optionCount: number,
  compact: boolean,
  pxPerMm?: number,
): CompactMetrics {
  const markerSizeMm = compact
    ? pxPerMm != null
      ? COMPACT_MARKER_PX / pxPerMm
      : 2.2
    : pxPerMm != null
      ? MARKER_SIZE_PX / pxPerMm
      : 4.5;
  const markerGapMm = compact ? 0.45 : 1;
  const contentW = Math.max(20, formWidthMm - (markerSizeMm + markerGapMm) * 2);
  const colCount = rowCount <= 8 ? 1 : Math.min(MAX_ANSWER_COLUMNS, 2);
  const colGapMm = colCount === 2 ? 0 : compact ? 1.2 : 3.5;
  const colInsetMm = YKS_ANSWERS_COL_INSET_MM[compact ? "compact" : "full"];
  const answerColW = contentW / Math.max(1, colCount);
  const sharedBubbleD = resolveYksBubbleDiameterMm(
    optionCount,
    answerColW - colInsetMm * 2,
    compact,
  );
  const studentColW = studentColWidthMm(sharedBubbleD, compact);
  const studentIdWmm = studentColW * 4;

  return {
    markerSizeMm,
    markerGapMm,
    contentW,
    studentIdWmm,
    sharedBubbleD,
    colCount,
    colGapMm,
  };
}

type LayoutInput = {
  formWidthMm: number;
  formHeightMm: number;
  scale: number;
  /** SVG önizleme: mm → px doğrudan çarpım. PDF: pt tabanlı dönüşüm. */
  pxPerMm?: number;
  rowCount: number;
  activeOptions: OptikChoice[];
  formId: string;
  compact: boolean;
  bookletType: OptikFormBookletType;
  scoringRule: OptikFormNetRule;
  testTitle?: string;
  testId?: string;
};

function toLayoutPx(mm: number, scale: number, pxPerMm?: number): number {
  if (pxPerMm != null) return mm * pxPerMm;
  return mmToCanvasPx(mm, scale);
}

function netRuleExamTag(rule: OptikFormNetRule): string {
  if (rule === "4") return "TYT-AYT";
  if (rule === "3") return "LGS";
  if (rule === "none") return "OKUL";
  return "SINAV";
}

function bookletLetters(type: OptikFormBookletType): string[] {
  if (type === "2") return ["A", "B"];
  if (type === "3") return ["A", "B", "C"];
  if (type === "4") return ["A", "B", "C", "D"];
  return [];
}

/** Form üzerindeki kitapçık türü rozeti metni. */
export function bookletTypeDisplayLabel(type: OptikFormBookletType): string {
  if (type === "2") return "2 (A–B)";
  if (type === "3") return "3 (A–C)";
  if (type === "4") return "4 (A–D)";
  return "";
}

function cornerMarkersMm(w: number, h: number, m: number): OptikMarkerMeta[] {
  const ids = ["tl", "tr", "bl", "br"] as const;
  const coords = [
    { x: 0, y: 0 },
    { x: w - m, y: 0 },
    { x: 0, y: h - m },
    { x: w - m, y: h - m },
  ];
  return ids.map((id, i) => ({
    id,
    xMm: coords[i]!.x,
    yMm: coords[i]!.y,
    sizeMm: m,
  }));
}

function buildStudentIdGridMm(
  xMm: number,
  yMm: number,
  _wMm: number,
  sharedBubbleD: number,
  compact: boolean,
  _pxPerMm?: number,
): {
  headerH: number;
  writeRowH: number;
  colCount: number;
  rowCount: number;
  bubbleD: number;
  digitRowH: number;
  h: number;
  actualW: number;
  bubbles: { column: number; digit: number; cx: number; cy: number; r: number }[];
  writeCells: { column: number; x: number; y: number; w: number; h: number }[];
} {
  const colCount = 4;
  const digitRowCount = 10;
  const headerH = YKS_STUDENT_ID_HEADER_H_MM[compact ? "compact" : "full"];
  const rowContentH = bubbleRowContentH(sharedBubbleD, compact);
  const writeRowH = rowContentH;
  const rowGap = YKS_DIGIT_ROW_GAP_MM[compact ? "compact" : "full"];
  const digitRowPitch = rowContentH + rowGap;
  const gridH = digitRowCount * digitRowPitch;
  const h = headerH + writeRowH + gridH;
  const gridTop = yMm + headerH + writeRowH;
  const colW = sharedBubbleD + YKS_COL_PAD_MM[compact ? "compact" : "full"] * 2;
  const actualW = colW * colCount;
  const bubbles: { column: number; digit: number; cx: number; cy: number; r: number }[] = [];
  const writeCells: { column: number; x: number; y: number; w: number; h: number }[] = [];

  for (let col = 0; col < colCount; col += 1) {
    writeCells.push({
      column: col,
      x: xMm + col * colW,
      y: yMm + headerH,
      w: colW,
      h: writeRowH,
    });
    const colCenter = xMm + col * colW + colW / 2;
    for (let digit = 0; digit < digitRowCount; digit += 1) {
      bubbles.push({
        column: col,
        digit,
        cx: colCenter,
        cy: gridTop + digit * digitRowPitch + rowContentH / 2,
        r: sharedBubbleD / 2,
      });
    }
  }

  return {
    headerH,
    writeRowH,
    colCount,
    rowCount: digitRowCount,
    bubbleD: sharedBubbleD,
    digitRowH: rowContentH,
    h,
    actualW,
    bubbles,
    writeCells,
  };
}

/** 2 sütunlu cevap grid — baloncuk çapı ÖĞR. NO ile aynı */
function computeAnswerColumnPlan(
  rowCount: number,
  sharedBubbleD: number,
  compact: boolean,
) {
  if (rowCount <= 0) {
    return { colCount: 0, rowsPerCol: 0, rowPitch: 0, rowContentH: 0, bubbleD: 0 };
  }

  const colCount = rowCount <= 8 ? 1 : Math.min(MAX_ANSWER_COLUMNS, 2);
  const rowsPerCol = colCount === 2 ? Math.ceil(rowCount / 2) : rowCount;
  const answerRowGap = YKS_ANSWER_ROW_GAP_MM[compact ? "compact" : "full"];
  const rowContentH = bubbleRowContentH(sharedBubbleD, compact);
  const rowPitch = rowContentH + answerRowGap;

  return { colCount, rowsPerCol, rowPitch, rowContentH, bubbleD: sharedBubbleD };
}

function questionNumberForCell(
  col: number,
  row: number,
  rowsPerCol: number,
  colCount: number,
  rowCount: number,
): number | null {
  let q: number;
  if (colCount === 1) {
    q = row + 1;
  } else if (col === 0) {
    q = row + 1;
  } else {
    q = rowsPerCol + row + 1;
  }
  return q <= rowCount ? q : null;
}

/** Tek kaynak layout engine — mm geometri + canvas px türevleri. */
export function computeOptikFormLayout(input: LayoutInput): OptikFormLayoutResult {
  const {
    formWidthMm,
    scale,
    pxPerMm,
    rowCount,
    activeOptions,
    formId,
    compact,
    bookletType,
    scoringRule,
    testId,
  } = input;

  const toPx = (mm: number) => toLayoutPx(mm, scale, pxPerMm);
  const metrics = resolveCompactMetrics(
    formWidthMm,
    rowCount,
    activeOptions.length,
    compact,
    pxPerMm,
  );
  const { markerSizeMm, markerGapMm, contentW, studentIdWmm, sharedBubbleD } = metrics;
  const contentX = markerSizeMm + markerGapMm;
  const contentY = markerSizeMm + markerGapMm;

  const headerHmm = compact ? 4.5 : 8;
  const instructionReserve = compact ? 1.5 : 4;
  const answersHeaderHmm = YKS_ANSWERS_HEADER_H_MM[compact ? "compact" : "full"];

  const identityTopMm = contentY + headerHmm + YKS_IDENTITY_TOP_GAP_MM;

  const studentIdGridMm = buildStudentIdGridMm(
    contentX,
    identityTopMm,
    studentIdWmm,
    sharedBubbleD,
    compact,
    pxPerMm,
  );

  const qrPadMm = YKS_QR_PAD_MM;
  const qrBorderWmm = YKS_QR_BORDER_W_MM[compact ? "compact" : "full"];
  const qrFrameTopMm = identityTopMm;
  const qrCodeMaxMm =
    studentIdGridMm.h - (compact ? 0.5 : 2) - 2 * qrPadMm - 2 * qrBorderWmm;
  const qrBaseSizeMm = Math.min(qrCodeMaxMm, Math.max(8, contentW * 0.35));
  const qrCodeSizeMm = qrBaseSizeMm * 0.98;
  const qrFrameSizeMm = qrCodeSizeMm + 2 * qrPadMm + 2 * qrBorderWmm;
  const qrFrameXMm = contentX + contentW - qrFrameSizeMm;
  const qrCodeXMm = qrFrameXMm + qrBorderWmm + qrPadMm;
  const qrCodeYMm = qrFrameTopMm + qrBorderWmm + qrPadMm;
  const qrTaraReserveMm = YKS_QR_TARA_RESERVE_MM[compact ? "compact" : "full"];

  const bookletLettersList = bookletLetters(bookletType);
  const qrColumnBottomMm = qrFrameTopMm + qrFrameSizeMm + qrTaraReserveMm;
  const identityHmm = Math.max(studentIdGridMm.h, qrColumnBottomMm - identityTopMm);

  const plan = computeAnswerColumnPlan(rowCount, sharedBubbleD, compact);
  const boxPadMm = YKS_ANSWERS_BOX_PAD_MM[compact ? "compact" : "full"];
  const gridPadMm = YKS_ANSWERS_GRID_PAD_MM[compact ? "compact" : "full"];
  const answersBoxHmm =
    answersHeaderHmm +
    boxPadMm +
    gridPadMm +
    plan.rowsPerCol * plan.rowPitch +
    gridPadMm +
    boxPadMm;
  const answersBoxTopMm =
    identityTopMm + identityHmm + YKS_IDENTITY_ANSWERS_GAP_MM[compact ? "compact" : "full"];
  const gridTopMm = answersBoxTopMm + answersHeaderHmm + boxPadMm;

  const colGapMm = metrics.colCount === 2 ? 0 : metrics.colGapMm;
  const colInsetMm = YKS_ANSWERS_COL_INSET_MM[compact ? "compact" : "full"];
  const timingOffsetMm = YKS_TIMING_MARK_OFFSET_MM[compact ? "compact" : "full"];
  const colW = contentW / Math.max(1, plan.colCount);
  const bubbleGapMm = YKS_BUBBLE_GAP_MM[compact ? "compact" : "full"];
  const timingWmm = YKS_TIMING_W_MM[compact ? "compact" : "full"];
  const timingNumGapMm = YKS_TIMING_NUM_GAP_MM[compact ? "compact" : "full"];
  const timingHmm = plan.rowContentH * YKS_TIMING_H_RATIO;
  const numWmm = compact ? 2.8 : 4.5;
  const rowPaddingMm = gridPadMm;

  const columns: OptikFormLayoutResult["columns"] = [];
  const timingMarks: OptikTimingMarkPx[] = [];
  const questionMeta: OptikFormMetadata["questions"] = [];

  for (let col = 0; col < plan.colCount; col += 1) {
    const colXMm = contentX + col * (colW + colGapMm);
    const headerYMm = gridTopMm + 1;
    const rows: OptikFormLayoutResult["columns"][0]["rows"] = [];

    for (let r = 0; r < plan.rowsPerCol; r += 1) {
      const qNum = questionNumberForCell(col, r, plan.rowsPerCol, plan.colCount, rowCount);
      if (qNum == null) continue;

      const rowYMm = gridTopMm + rowPaddingMm + r * plan.rowPitch;
      const cyMm = rowYMm + plan.rowContentH / 2;
      const rowContentLeftMm = colXMm + colInsetMm;
      const timingLeftMm = rowContentLeftMm + timingOffsetMm;
      const numStartMm = timingLeftMm + timingWmm + timingNumGapMm;
      const bubbleStartMm = numStartMm + numWmm + 0.35;

      const timingMarkPx = {
        x: toPx(timingLeftMm),
        y: toPx(rowYMm + (plan.rowContentH - timingHmm) / 2),
        w: toPx(timingWmm),
        h: toPx(timingHmm),
      };

      timingMarks.push({
        questionNumber: qNum,
        ...timingMarkPx,
      });

      const bubblesPx: OptikFormLayoutResult["columns"][0]["rows"][0]["bubbles"] = [];
      const bubblesMeta: OptikBubbleMeta[] = [];

      activeOptions.forEach((letter, oi) => {
        const cxMm = bubbleStartMm + oi * (plan.bubbleD + bubbleGapMm) + plan.bubbleD / 2;
        bubblesPx.push({
          questionNumber: qNum,
          choice: letter,
          cx: toPx(cxMm),
          cy: toPx(cyMm),
          r: toPx(plan.bubbleD / 2),
        });
        bubblesMeta.push({
          questionNumber: qNum,
          choice: letter,
          xMm: cxMm - plan.bubbleD / 2,
          yMm: cyMm - plan.bubbleD / 2,
          widthMm: plan.bubbleD,
          heightMm: plan.bubbleD,
          radiusMm: plan.bubbleD / 2,
        });
      });

      rows.push({
        number: qNum,
        y: toPx(rowYMm),
        numX: toPx(numStartMm + numWmm),
        timingMark: timingMarkPx,
        bubbles: bubblesPx,
      });
      questionMeta.push({ number: qNum, bubbles: bubblesMeta });
    }

    columns.push({
      x: toPx(colXMm),
      w: toPx(colW),
      innerX: toPx(colXMm + colInsetMm),
      innerW: toPx(colW - colInsetMm * 2),
      headerY: toPx(headerYMm),
      rows,
    });
  }

  const bookletBubblesMeta: OptikBookletBubbleMeta[] = [];
  const bookletBubblesPx: NonNullable<OptikFormLayoutResult["booklet"]>["bubbles"] = [];
  let bookletLayout: OptikFormLayoutResult["booklet"] = null;

  const bubbleLabelFontPx = ptToLayoutPx(OPTIK_CHOICE_LABEL_PT, scale, pxPerMm);

  if (bookletLettersList.length > 0) {
    const bookletBorderWmm = YKS_STUDENT_ID_BORDER_W_MM[compact ? "compact" : "full"];
    const bookletBoxPadMm = YKS_BOOKLET_BOX_PAD_MM[compact ? "compact" : "full"];
    const bubbleDmm = sharedBubbleD;
    const bubbleGapMm = YKS_BUBBLE_GAP_MM[compact ? "compact" : "full"];
    const labelWMm = bookletLabelWidthMm(
      BOOKLET_TYPE_BADGE_LABEL,
      compact,
      scale,
      pxPerMm,
    );
    const bookletBoxHmm = bookletBoxHeightMm(sharedBubbleD, compact, bookletBorderWmm);
    const innerHmm = bookletBoxHmm - 2 * bookletBorderWmm;
    const bookletBoxWMm = bookletBoxWidthMm(
      bookletLettersList.length,
      bubbleDmm,
      bubbleGapMm,
      labelWMm,
      bookletBoxPadMm,
      bookletBorderWmm,
    );
    const identityBookletGapMm = YKS_IDENTITY_BOOKLET_GAP_MM[compact ? "compact" : "full"];
    const bookletBoxBottomMm = identityTopMm + studentIdGridMm.h;
    const bookletBoxTopMm = bookletBoxBottomMm - bookletBoxHmm;
    const bookletBoxXMm = contentX + studentIdGridMm.actualW + identityBookletGapMm;
    const innerTopMm = bookletBoxTopMm + bookletBorderWmm;
    const centerYMm = innerTopMm + innerHmm / 2;
    const labelLeftMm = bookletBoxXMm + bookletBorderWmm;
    const labelCenterXMm = labelLeftMm + labelWMm / 2;
    let bubbleCxMm = labelLeftMm + labelWMm + bookletBoxPadMm + bubbleDmm / 2;

    bookletLettersList.forEach((letter) => {
      bookletBubblesMeta.push({
        booklet: letter,
        xMm: bubbleCxMm,
        yMm: centerYMm,
        radiusMm: bubbleDmm / 2,
      });
      bookletBubblesPx.push({
        booklet: letter,
        cx: toPx(bubbleCxMm),
        cy: toPx(centerYMm),
        r: toPx(bubbleDmm / 2),
      });
      bubbleCxMm += bubbleDmm + bubbleGapMm;
    });

    bookletLayout = {
      x: toPx(bookletBoxXMm),
      y: toPx(bookletBoxTopMm),
      w: toPx(bookletBoxWMm),
      h: toPx(bookletBoxHmm),
      borderW: toPx(bookletBorderWmm),
      typeLabel: BOOKLET_TYPE_BADGE_LABEL,
      typeLabelFontPx: bubbleLabelFontPx,
      labelX: toPx(labelCenterXMm),
      labelY: toPx(centerYMm),
      labelW: toPx(labelWMm),
      labelH: toPx(innerHmm),
      bubbles: bookletBubblesPx,
    };
  }

  const studentIdBubblesPx: OptikStudentIdBubblePx[] = studentIdGridMm.bubbles.map((b) => ({
    column: b.column,
    digit: b.digit,
    cx: toPx(b.cx),
    cy: toPx(b.cy),
    r: toPx(b.r),
  }));

  const writeCellsPx = studentIdGridMm.writeCells.map((c) => ({
    column: c.column,
    x: toPx(c.x),
    y: toPx(c.y),
    w: toPx(c.w),
    h: toPx(c.h),
  }));

  const actualHeightMm =
    answersBoxTopMm + answersBoxHmm + instructionReserve + markerSizeMm + markerGapMm;
  const markersMm = cornerMarkersMm(formWidthMm, actualHeightMm, markerSizeMm);

  const metadata: OptikFormMetadata = {
    formId,
    testId,
    questionCount: rowCount,
    choiceCount: activeOptions.length,
    bookletType,
    scoringRule,
    pageWidthMm: A4_WIDTH_MM,
    pageHeightMm: A4_HEIGHT_MM,
    formOriginXMm: 0,
    formOriginYMm: 0,
    formWidthMm,
    formHeightMm: actualHeightMm,
    compact,
    markers: markersMm,
    bookletBubbles: bookletBubblesMeta,
    questions: questionMeta,
  };

  return {
    widthPx: toPx(formWidthMm),
    heightPx: toPx(actualHeightMm),
    widthMm: formWidthMm,
    heightMm: actualHeightMm,
    markers: markersMm.map((mk) => ({
      id: mk.id,
      x: toPx(mk.xMm),
      y: toPx(mk.yMm),
      size: toPx(mk.sizeMm),
    })),
    header: {
      titleY: toPx(contentY + headerHmm * 0.45),
      subtitleY: toPx(contentY + headerHmm * 0.45),
      titleX: toPx(contentX),
      subtitleX: toPx(contentX + contentW),
      examTag: netRuleExamTag(scoringRule),
      showFullHeader: !compact,
      dividerY: toPx(contentY + headerHmm),
    },
    studentIdGrid: {
      x: toPx(contentX),
      y: toPx(identityTopMm),
      w: toPx(studentIdGridMm.actualW),
      h: toPx(studentIdGridMm.h),
      headerH: toPx(studentIdGridMm.headerH),
      writeRowH: toPx(studentIdGridMm.writeRowH),
      colCount: studentIdGridMm.colCount,
      rowCount: studentIdGridMm.rowCount,
      borderW: toPx(YKS_STUDENT_ID_BORDER_W_MM[compact ? "compact" : "full"]),
      bodyBorderW: toPx(YKS_STUDENT_ID_BORDER_W_MM[compact ? "compact" : "full"]),
      headerLineW: toPx(YKS_STUDENT_ID_BORDER_W_MM[compact ? "compact" : "full"]),
      bubbles: studentIdBubblesPx,
      writeCells: writeCellsPx,
    },
    answersBox: {
      x: toPx(contentX),
      y: toPx(answersBoxTopMm),
      w: toPx(contentW),
      h: toPx(answersBoxHmm),
      headerH: toPx(answersHeaderHmm),
      borderW: toPx(YKS_ANSWERS_BORDER_W_MM[compact ? "compact" : "full"]),
      bodyBorderW: toPx(YKS_ANSWERS_BODY_BORDER_W_MM[compact ? "compact" : "full"]),
      headerLineW: toPx(YKS_ANSWERS_HEADER_LINE_W_MM[compact ? "compact" : "full"]),
      columnDivider:
        plan.colCount === 2
          ? {
              x: toPx(contentX + contentW / 2),
              y1: toPx(answersBoxTopMm + answersHeaderHmm),
              y2: toPx(answersBoxTopMm + answersBoxHmm),
            }
          : null,
    },
    booklet: bookletLayout,
    qr: {
      frame: {
        x: toPx(qrFrameXMm),
        y: toPx(qrFrameTopMm),
        size: toPx(qrFrameSizeMm),
        borderW: toPx(qrBorderWmm),
      },
      code: {
        x: toPx(qrCodeXMm),
        y: toPx(qrCodeYMm),
        size: toPx(qrCodeSizeMm),
      },
      labelY: toPx(qrFrameTopMm + qrFrameSizeMm + qrTaraReserveMm * 0.45),
    },
    columns,
    timingMarks,
    formId,
    rowHeightPx: toPx(plan.rowContentH),
    bubbleDiameterPx: toPx(plan.bubbleD),
    bubbleLabelFontPx,
    questionNumFontPx: ptToLayoutPx(OPTIK_QUESTION_NUM_PT, scale, pxPerMm),
    formTitleFontPx: ptToLayoutPx(OPTIK_FORM_TITLE_PT, scale, pxPerMm),
    formSubtitleFontPx: ptToLayoutPx(OPTIK_FORM_SUBTITLE_PT, scale, pxPerMm),
    answersHeaderFontPx: ptToLayoutPx(OPTIK_ANSWERS_HEADER_PT, scale, pxPerMm),
    metadata,
  };
}

export function estimateOptikFormHeightMm(
  rowCount: number,
  formWidthMm: number,
  compact: boolean,
  _bookletType: OptikFormBookletType = "none",
  pxPerMm?: number,
  optionCount = 5,
): number {
  const metrics = resolveCompactMetrics(formWidthMm, rowCount, optionCount, compact, pxPerMm);
  const headerHmm = compact ? 4.5 : 8;
  const instructionReserve = compact ? 1.5 : 4;
  const answersHeaderHmm = YKS_ANSWERS_HEADER_H_MM[compact ? "compact" : "full"];

  const studentGrid = buildStudentIdGridMm(
    0,
    0,
    metrics.studentIdWmm,
    metrics.sharedBubbleD,
    compact,
    pxPerMm,
  );
  const contentW = Math.max(20, formWidthMm - (metrics.markerSizeMm + metrics.markerGapMm) * 2);
  const qrTaraReserveMm = YKS_QR_TARA_RESERVE_MM[compact ? "compact" : "full"];
  const qrPadMm = YKS_QR_PAD_MM;
  const qrBorderWmm = YKS_QR_BORDER_W_MM[compact ? "compact" : "full"];
  const qrCodeMaxMm =
    studentGrid.h - (compact ? 0.5 : 2) - 2 * qrPadMm - 2 * qrBorderWmm;
  const qrBaseSizeMm = Math.min(qrCodeMaxMm, Math.max(8, contentW * 0.35));
  const qrFrameSizeMm = qrBaseSizeMm * 0.98 + 2 * qrPadMm + 2 * qrBorderWmm;
  const qrColumnBottomMm = qrFrameSizeMm + qrTaraReserveMm;
  const identityHmm = Math.max(studentGrid.h, qrColumnBottomMm);
  const plan = computeAnswerColumnPlan(rowCount, metrics.sharedBubbleD, compact);
  const boxPadMm = YKS_ANSWERS_BOX_PAD_MM[compact ? "compact" : "full"];
  const gridPadMm = YKS_ANSWERS_GRID_PAD_MM[compact ? "compact" : "full"];
  const answersHmm =
    answersHeaderHmm +
    boxPadMm +
    gridPadMm +
    plan.rowsPerCol * plan.rowPitch +
    gridPadMm +
    boxPadMm;

  return (
    metrics.markerSizeMm * 2 +
    metrics.markerGapMm * 2 +
    headerHmm +
    YKS_IDENTITY_TOP_GAP_MM +
    identityHmm +
    YKS_IDENTITY_ANSWERS_GAP_MM[compact ? "compact" : "full"] +
    answersHmm +
    instructionReserve
  );
}

export function estimateCompactOptikFormHeightPx(
  rowCount: number,
  formWidthMm: number,
  scale: number,
  bookletType: OptikFormBookletType = "none",
  pxPerMm?: number,
  optionCount = 5,
): number {
  const heightMm = estimateOptikFormHeightMm(
    rowCount,
    formWidthMm,
    true,
    bookletType,
    pxPerMm,
    optionCount,
  );
  if (pxPerMm != null) return heightMm * pxPerMm;
  return mmToCanvasPx(heightMm, scale);
}

export function estimateCompactOptikFits(
  rowCount: number,
  formWidthMm: number,
  scale: number,
  availableHeightPx: number,
  bookletType: OptikFormBookletType = "none",
): boolean {
  const needed = estimateCompactOptikFormHeightPx(rowCount, formWidthMm, scale, bookletType);
  return needed <= availableHeightPx;
}

export function estimateCompactFitsInArea(
  rowCount: number,
  columnWidthPt: number,
  availableHeightPt: number,
  bookletType: OptikFormBookletType = "none",
): boolean {
  if (rowCount <= 0) return true;
  const formWidthMm = ptToMm(columnWidthPt * 1.12);
  const neededMm = estimateOptikFormHeightMm(rowCount, formWidthMm, true, bookletType);
  return neededMm <= ptToMm(Math.max(20, availableHeightPt));
}

export function resolveOptikFormPageCount(
  enabled: boolean,
  placement: string,
  rowCount: number,
  compactFits: boolean,
): number {
  if (!enabled || rowCount <= 0) return 0;
  if (placement === "separate_page") return 1;
  if (placement === "end_of_test" && !compactFits) return 1;
  return 0;
}
