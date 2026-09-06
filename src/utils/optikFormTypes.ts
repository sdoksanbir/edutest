import type { OptikChoice } from "./optikFormStats";
import type { OptikFormBookletType, OptikFormNetRule } from "./optikFormSettings";

/** Tek baloncuk — OMR tarayıcı koordinatları (mm, form-local). */
export type OptikBubbleMeta = {
  questionNumber: number;
  choice: OptikChoice;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  radiusMm: number;
};

/** Hizalama referans karesi. */
export type OptikMarkerMeta = {
  id: string;
  xMm: number;
  yMm: number;
  sizeMm: number;
};

/** Kitapçık seçim baloncuğu. */
export type OptikBookletBubbleMeta = {
  booklet: string;
  xMm: number;
  yMm: number;
  radiusMm: number;
};

/** Puanlama altyapısı — ileride genişletilebilir. */
export type OptikScoringState = {
  penaltyRatio: number | null;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  net: number;
  score: number | null;
};

/** Makine tarafından okunabilir tam form metadata. */
export type OptikFormMetadata = {
  formId: string;
  testId?: string;
  questionCount: number;
  choiceCount: number;
  bookletType: OptikFormBookletType;
  scoringRule: OptikFormNetRule;
  pageWidthMm: number;
  pageHeightMm: number;
  formOriginXMm: number;
  formOriginYMm: number;
  formWidthMm: number;
  formHeightMm: number;
  compact: boolean;
  markers: OptikMarkerMeta[];
  bookletBubbles: OptikBookletBubbleMeta[];
  questions: {
    number: number;
    bubbles: OptikBubbleMeta[];
  }[];
};

/** Canvas çizimi için px koordinatları (layout engine tek kaynaktan üretir). */
export type OptikBubblePx = {
  questionNumber: number;
  choice: OptikChoice;
  cx: number;
  cy: number;
  r: number;
};

export type OptikMarkerPx = { id: string; x: number; y: number; size: number };

export type OptikBookletBubblePx = {
  booklet: string;
  cx: number;
  cy: number;
  r: number;
};

export type OptikAnswerRowPx = {
  number: number;
  y: number;
  /** Soru numarası metni — textAnchor end. */
  numX: number;
  timingMark: { x: number; y: number; w: number; h: number };
  bubbles: OptikBubblePx[];
};

export type OptikColumnPx = {
  x: number;
  w: number;
  /** Kenar/orta çizgiden içeride kalan alan — satır zeminleri. */
  innerX: number;
  innerW: number;
  headerY: number;
  rows: OptikAnswerRowPx[];
};

export type OptikStudentIdBubblePx = {
  column: number;
  digit: number;
  cx: number;
  cy: number;
  r: number;
};

export type OptikTimingMarkPx = {
  questionNumber: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type OptikFormLayoutResult = {
  widthPx: number;
  heightPx: number;
  widthMm: number;
  heightMm: number;
  markers: OptikMarkerPx[];
  header: {
    titleY: number;
    subtitleY: number;
    titleX?: number;
    subtitleX?: number;
    examTag: string;
    showFullHeader: boolean;
    dividerY: number;
  };
  studentIdGrid: {
    x: number;
    y: number;
    w: number;
    h: number;
    headerH: number;
    writeRowH: number;
    colCount: number;
    rowCount: number;
    borderW: number;
    bodyBorderW: number;
    headerLineW: number;
    bubbles: OptikStudentIdBubblePx[];
    writeCells: { x: number; y: number; w: number; h: number; column: number }[];
  };
  answersBox: {
    x: number;
    y: number;
    w: number;
    h: number;
    headerH: number;
    borderW: number;
    bodyBorderW: number;
    headerLineW: number;
    /** İki sütunlu grid — dikey ayırıcı (header altından kutu dibine). */
    columnDivider: { x: number; y1: number; y2: number } | null;
  };
  booklet: {
    x: number;
    y: number;
    w: number;
    h: number;
    borderW: number;
    /** Siyah rozet üzerindeki sabit metin ("KİTAPÇIK TÜRÜ"). */
    typeLabel: string;
    /** Rozet metni — baloncuk harfleriyle aynı punto. */
    typeLabelFontPx: number;
    /** Siyah etiket rozeti — metin merkezi. */
    labelX: number;
    labelY: number;
    labelW: number;
    labelH: number;
    bubbles: OptikBookletBubblePx[];
  } | null;
  qr: {
    frame: { x: number; y: number; size: number; borderW: number };
    code: { x: number; y: number; size: number };
    labelY: number;
  };
  columns: OptikColumnPx[];
  timingMarks: OptikTimingMarkPx[];
  formId: string;
  rowHeightPx: number;
  bubbleDiameterPx: number;
  bubbleLabelFontPx: number;
  questionNumFontPx: number;
  formTitleFontPx: number;
  formSubtitleFontPx: number;
  answersHeaderFontPx: number;
  metadata: OptikFormMetadata;
};
