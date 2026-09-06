/**
 * Re-export: font eşitleme fiziksel dönüşüm (fontEqualizeMath).
 * normalizeQuestionFont ölçer; bu modül pt ölçeği üretir.
 */
export {
  ANALYSIS_WIDTH,
  ANOMALY_FONT_HEIGHT_PX,
  AVERAGE_BODY_FONT_HEIGHT_PX,
  FONT_SCALE_CLAMP_MIN,
  FONT_SCALE_CLAMP_MAX,
  DEFAULT_TARGET_QUESTION_LINE_PT,
  OCR_MIN_CONFIDENCE,
  TARGET_FONT_HEIGHT_PX,
  clampFontScale,
  clampTargetQuestionLinePt,
  sanitizeDetectedFontHeightPx,
  targetFontHeightPxForLinePt,
  resolveQuestionPixelsPerPdfPoint,
  originalFontHeightFromAnalysis,
  detectedFontHeightPtFromOriginal,
  normalizationScaleFromPhysicalFont,
  computePhysicalFontEqualize,
  reconcileEqualizeScalesFromPhysicalPt,
  type FontPixelsPerPdfPointResolution,
  type QuestionCaptureLike,
  type PhysicalNormalizationResult,
} from './fontEqualizeMath'
