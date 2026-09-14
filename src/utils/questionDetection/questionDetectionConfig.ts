/**
 * Tunable constants for question detection — keep magic numbers here.
 */
export const QD_CONFIG = {
  maxAnalyzeWidth: 1200,
  inkLuminanceThreshold: 190,

  /** Header/footer search bands (fraction of page height) */
  headerScanMax: 0.24,
  footerScanMin: 0.78,
  minContentTop: 0.05,
  maxContentTop: 0.22,
  minContentBottom: 0.75,

  /** Column gutter: mid-page valley / rule search */
  columnMidBandLeft: 0.28,
  columnMidBandRight: 0.72,
  columnGutterMinFrac: 0.025,
  columnMinSideInk: 0.012,
  maxColumns: 3,

  /** Left strip for number ROI (fraction of column width) */
  numberStripFrac: 0.16,
  numberStripMinPx: 12,
  ocrStripFrac: 0.18,
  /** QUESTION_NUMBER_ROI_RATIO — geometric+OCR search only in left strip of column */
  questionNumberRoiRatio: 0.18,

  /** Geometric number blob height limits (fraction of page) */
  numberBlobMinH: 0.004,
  numberBlobMaxH: 0.036,
  numberBlobMaxWFracOfCol: 0.22,
  /** Min whitespace above a number candidate (frac of page) — keep high to avoid math strokes */
  numberGapAboveMin: 0.018,
  /** Min vertical gap between successive anchors */
  anchorMinGapFrac: 0.055,

  /** Question-top expansion (badge above number) */
  topExpandMaxGapFrac: 0.035,
  topExpandMaxHeightFrac: 0.055,
  topExpandMinOverlapX: 0.15,

  /** Margins around ink union (frac of analyze size) */
  marginXFrac: 0.004,
  marginTopFrac: 0.003,
  marginBottomFrac: 0.006,

  /** Gap before next anchor when building candidate region */
  gapBeforeNextAnchorFrac: 0.008,

  /** Confidence thresholds */
  acceptMin: 0.8,
  reviewMin: 0.55,

  /** Validation */
  minQuestionHeightFrac: 0.04,
  maxQuestionHeightFrac: 0.55,
  minQuestionWidthFracOfCol: 0.35,
  maxOverlapFrac: 0.08,

  /** Tesseract */
  ocrEnabledDefault: true,
  ocrWhitelist: '0123456789.):-',
  ocrUseWhitelist: true,
  ocrMinConfidence: 40,
  ocrLang: 'eng',

  /** Scoring weights for anchors */
  score: {
    leftProximity: 0.25,
    rightContent: 0.2,
    sequence: 0.3,
    geometry: 0.15,
    ocr: 0.1,
  },
} as const

export type QdConfig = typeof QD_CONFIG
