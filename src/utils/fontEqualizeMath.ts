/**
 * Font eşitleme saf matematiği (DOM / Tesseract yok).
 * ANALYSIS_WIDTH yalnızca ölçüm ara uzayı; scale fiziksel pt üzerinden.
 */

/** questionCapture.LEGACY_LAYOUT_ZOOM ile aynı */
export const LEGACY_LAYOUT_ZOOM = 600 / 72

export const ANALYSIS_WIDTH = 320
export const ANOMALY_FONT_HEIGHT_PX = 16
export const AVERAGE_BODY_FONT_HEIGHT_PX = 11.5
export const FONT_SCALE_CLAMP_MIN = 0.65
export const FONT_SCALE_CLAMP_MAX = 1.5
export const DEFAULT_TARGET_QUESTION_LINE_PT = 10
export const TARGET_QUESTION_LINE_PT_MIN = 6
export const TARGET_QUESTION_LINE_PT_MAX = 14
export const OCR_MIN_CONFIDENCE = 70

/** @deprecated Eski analiz-uzayı hedef kalibrasyonu (~1900px kırpma). */
export const TARGET_FONT_HEIGHT_PX = 14

function pixelsPerPdfPointFromViewport(
  viewportScale: number,
  devicePixelRatio: number = 1,
): number {
  const vs = Number(viewportScale)
  const dpr = Number(devicePixelRatio)
  if (!(vs > 0)) return LEGACY_LAYOUT_ZOOM
  return vs * (dpr > 0 ? dpr : 1)
}

export function clampTargetQuestionLinePt(pt: number): number {
  if (!Number.isFinite(pt)) return DEFAULT_TARGET_QUESTION_LINE_PT
  return Math.max(
    TARGET_QUESTION_LINE_PT_MIN,
    Math.min(TARGET_QUESTION_LINE_PT_MAX, Math.round(pt * 2) / 2),
  )
}

export function targetFontHeightPxForLinePt(targetLinePt: number): number {
  const t = clampTargetQuestionLinePt(targetLinePt)
  return TARGET_FONT_HEIGHT_PX * (t / DEFAULT_TARGET_QUESTION_LINE_PT)
}

export function clampFontScale(scale: number): number {
  if (!Number.isFinite(scale) || scale <= 0) return 1
  return Math.min(Math.max(scale, FONT_SCALE_CLAMP_MIN), FONT_SCALE_CLAMP_MAX)
}

export function sanitizeDetectedFontHeightPx(detectedFontHeightPx: number): number {
  if (!(detectedFontHeightPx > 0)) return detectedFontHeightPx
  if (detectedFontHeightPx > ANOMALY_FONT_HEIGHT_PX) return AVERAGE_BODY_FONT_HEIGHT_PX
  return detectedFontHeightPx
}

export type FontPixelsPerPdfPointResolution = {
  pixelsPerPdfPoint: number
  metadataSource: 'capture' | 'legacy-fallback'
}

export type QuestionCaptureLike = {
  capture?: {
    pixelsPerPdfPoint?: number
    viewportScale?: number
    devicePixelRatio?: number
  } | null
}

/** capture.ppp → viewportScale → legacy 600/72 */
export function resolveQuestionPixelsPerPdfPoint(
  q: QuestionCaptureLike,
): FontPixelsPerPdfPointResolution {
  const c = q.capture
  if (c && typeof c === 'object') {
    const ppp = Number(c.pixelsPerPdfPoint)
    if (Number.isFinite(ppp) && ppp > 0) {
      return { pixelsPerPdfPoint: ppp, metadataSource: 'capture' }
    }
    const vs = Number(c.viewportScale)
    if (Number.isFinite(vs) && vs > 0) {
      const fromViewport = pixelsPerPdfPointFromViewport(
        vs,
        Number(c.devicePixelRatio) > 0 ? Number(c.devicePixelRatio) : 1,
      )
      if (fromViewport > 0) {
        return { pixelsPerPdfPoint: fromViewport, metadataSource: 'capture' }
      }
    }
  }
  return { pixelsPerPdfPoint: LEGACY_LAYOUT_ZOOM, metadataSource: 'legacy-fallback' }
}

export function originalFontHeightFromAnalysis(opts: {
  sanitizedDetectedAnalysisPx: number
  sourceImageWidthPx: number
  analysisWidthPx?: number
}): { scaleToOriginal: number; originalFontHeightPx: number } {
  const analysisW = opts.analysisWidthPx ?? ANALYSIS_WIDTH
  const scaleToOriginal =
    analysisW > 0 && opts.sourceImageWidthPx > 0
      ? opts.sourceImageWidthPx / analysisW
      : 0
  return {
    scaleToOriginal,
    originalFontHeightPx: opts.sanitizedDetectedAnalysisPx * scaleToOriginal,
  }
}

export function detectedFontHeightPtFromOriginal(
  originalFontHeightPx: number,
  pixelsPerPdfPoint: number,
): number {
  if (!(originalFontHeightPx > 0) || !(pixelsPerPdfPoint > 0)) return 0
  return originalFontHeightPx / pixelsPerPdfPoint
}

export type PhysicalNormalizationResult = {
  detectedFontHeightPt: number
  rawNormalizationScale: number
  normalizationScale: number
}

export function normalizationScaleFromPhysicalFont(opts: {
  detectedFontHeightPt: number
  targetQuestionLinePt: number
}): PhysicalNormalizationResult | null {
  const detected = opts.detectedFontHeightPt
  if (!(detected > 0)) return null
  const target = clampTargetQuestionLinePt(opts.targetQuestionLinePt)
  const rawNormalizationScale = target / detected
  if (!Number.isFinite(rawNormalizationScale) || rawNormalizationScale <= 0) return null
  return {
    detectedFontHeightPt: detected,
    rawNormalizationScale,
    normalizationScale: clampFontScale(rawNormalizationScale),
  }
}

export function computePhysicalFontEqualize(opts: {
  rawDetectedAnalysisPx: number
  sourceImageWidthPx: number
  pixelsPerPdfPoint: number
  targetQuestionLinePt?: number
  analysisWidthPx?: number
}): {
  sanitizedDetectedAnalysisPx: number
  anomaly: boolean
  scaleToOriginal: number
  originalFontHeightPx: number
  detectedFontHeightPt: number
  rawNormalizationScale: number
  normalizationScale: number
} | null {
  if (!(opts.rawDetectedAnalysisPx > 0) || !(opts.sourceImageWidthPx > 0)) return null
  if (!(opts.pixelsPerPdfPoint > 0)) return null

  const anomaly = opts.rawDetectedAnalysisPx > ANOMALY_FONT_HEIGHT_PX
  const sanitizedDetectedAnalysisPx = sanitizeDetectedFontHeightPx(opts.rawDetectedAnalysisPx)
  const { scaleToOriginal, originalFontHeightPx } = originalFontHeightFromAnalysis({
    sanitizedDetectedAnalysisPx,
    sourceImageWidthPx: opts.sourceImageWidthPx,
    analysisWidthPx: opts.analysisWidthPx,
  })
  const detectedFontHeightPt = detectedFontHeightPtFromOriginal(
    originalFontHeightPx,
    opts.pixelsPerPdfPoint,
  )
  const scale = normalizationScaleFromPhysicalFont({
    detectedFontHeightPt,
    targetQuestionLinePt: opts.targetQuestionLinePt ?? DEFAULT_TARGET_QUESTION_LINE_PT,
  })
  if (!scale) return null
  return {
    sanitizedDetectedAnalysisPx,
    anomaly,
    scaleToOriginal,
    originalFontHeightPx,
    detectedFontHeightPt: scale.detectedFontHeightPt,
    rawNormalizationScale: scale.rawNormalizationScale,
    normalizationScale: scale.normalizationScale,
  }
}

export function reconcileEqualizeScalesFromPhysicalPt(
  entries: Array<{ id: string; detectedFontHeightPt: number; confidence: number }>,
  targetLinePt: number,
): Map<string, number> {
  const out = new Map<string, number>()
  if (entries.length === 0) return out

  const trusted = entries.filter((e) => e.confidence >= OCR_MIN_CONFIDENCE)
  const pool = trusted.length > 0 ? trusted : entries
  const scales = pool
    .map((e) =>
      normalizationScaleFromPhysicalFont({
        detectedFontHeightPt: e.detectedFontHeightPt,
        targetQuestionLinePt: targetLinePt,
      }),
    )
    .filter((s): s is PhysicalNormalizationResult => s != null)
    .map((s) => s.normalizationScale)
  if (scales.length === 0) return out

  const globalAvg = scales.reduce((a, b) => a + b, 0) / scales.length

  for (const e of entries) {
    if (e.confidence >= OCR_MIN_CONFIDENCE) {
      const s = normalizationScaleFromPhysicalFont({
        detectedFontHeightPt: e.detectedFontHeightPt,
        targetQuestionLinePt: targetLinePt,
      })
      out.set(e.id, s?.normalizationScale ?? globalAvg)
    } else {
      out.set(e.id, clampFontScale(globalAvg))
    }
  }
  return out
}
