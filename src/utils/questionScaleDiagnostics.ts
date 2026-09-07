/**
 * Soru ölçek teşhisi (yalnızca log) — yerleşim / çizim davranışını değiştirmez.
 * requestedScale = manualScale × normalizationScale
 */

import { getEqualizeRunIdForLogs } from './equalizeRunDiagnostics'
import type { CropBox } from '../types'

const DEFAULT_TARGET_QUESTION_LINE_PT = 10

/** layout-engine LAYOUT_ZOOM ile aynı: 600 DPI → pt (yalnızca legacy) */
export const DIAG_LAYOUT_ZOOM = 600 / 72

export type ScaleLimitation = 'WIDTH_LIMIT' | 'HEIGHT_LIMIT' | 'NONE'

export type QuestionScaleDiagRow = {
  questionNo: number
  detectedFontPx: number | null
  targetFontPx: number | null
  sourceWidth: number
  sourceHeight: number
  croppedWidth: number
  croppedHeight: number
  availW: number
  availH: number | null
  normalizationScale: number
  manualScale: number
  requestedScale: number
  requestedScaleField: 'manualScale*normalizationScale'
  nativeWidthPt: number
  nativeHeightPt: number
  pixelsPerPdfPoint: number
  metadataSource: 'capture' | 'legacy-fallback'
  widthLimit: number
  heightLimit: number | null
  appliedScale: number
  fulfillment: number
  limitation: ScaleLimitation
  finalDrawWidth: number
  finalDrawHeight: number
  originalBoundsW: number
  originalBoundsH: number
  inkBoundsW: number | null
  inkBoundsH: number | null
  inkPadL: number | null
  inkPadR: number | null
  inkPadT: number | null
  inkPadB: number | null
  limitSite: string
  columnLeftPt?: number | null
  columnRightPt?: number | null
  imageXPt?: number | null
  safeRightPt?: number | null
  drawRightPt?: number | null
  overflowPt?: number | null
  columnBoundsValid?: boolean | null
}

export type FontEqualizeDiagEntry = {
  detectedFontPx: number | null
  /** Fiziksel hedef pt (analiz px değil) */
  targetFontPt: number
  requestedScale: number
  questionId: string
  detected_font_analysis_px: number | null
  detected_font_original_px: number | null
  detected_font_pt: number | null
  font_measurement_source: string | null
  font_measurement_confidence: number | null
  normalization_scale_raw: number | null
  normalization_scale_clamped: number | null
  pixels_per_pdf_point_used: number | null
  font_metadata_source: 'capture' | 'legacy-fallback' | null
  hasValidatedOptions?: boolean
  optionLabelCount?: number
  optionLabels?: string[]
  optionsPatternValid?: boolean
  selectedMeasurementRegion?: 'options' | 'stem' | 'none'
  optionsMetricFallback?: boolean
  referenceRectNorm?: CropBox
  detectedReferenceHeightPx?: number | null
  manualMeasurementFailureReason?: string
  appliedScale?: number | null
  widthLimitApplied?: boolean
}

type MeasureCacheEntry = FontEqualizeDiagEntry

const measureByOrder = new Map<number, MeasureCacheEntry>()
const clampSites: Array<{ site: string; before: number; after: number; questionNo?: number }> = []
const inkCacheByOrder = new Map<number, { x: number; y: number; w: number; h: number } | null>()
let lastFlushFingerprint = ''

/** Eşitleme sonrası ölçüm → çizim / export teşhisinde kullanılır */
export function recordQuestionFontMeasureForDiag(opts: {
  orderIndex: number
  questionId: string
  detectedFontPx: number | null
  detected_font_analysis_px?: number | null
  detected_font_original_px?: number | null
  detected_font_pt?: number | null
  font_measurement_source?: string | null
  font_measurement_confidence?: number | null
  normalization_scale_raw?: number | null
  normalization_scale_clamped?: number | null
  pixels_per_pdf_point_used?: number | null
  font_metadata_source?: 'capture' | 'legacy-fallback' | null
  targetLinePt?: number
  requestedScale: number
  hasValidatedOptions?: boolean
  optionLabelCount?: number
  optionLabels?: string[]
  optionsPatternValid?: boolean
  selectedMeasurementRegion?: 'options' | 'stem' | 'none'
  optionsMetricFallback?: boolean
  referenceRectNorm?: CropBox
  detectedReferenceHeightPx?: number | null
  manualMeasurementFailureReason?: string
  appliedScale?: number | null
  widthLimitApplied?: boolean
}): void {
  measureByOrder.set(opts.orderIndex, {
    detectedFontPx: opts.detectedFontPx,
    targetFontPt: opts.targetLinePt ?? DEFAULT_TARGET_QUESTION_LINE_PT,
    requestedScale: opts.requestedScale,
    questionId: opts.questionId,
    detected_font_analysis_px: opts.detected_font_analysis_px ?? opts.detectedFontPx,
    detected_font_original_px: opts.detected_font_original_px ?? null,
    detected_font_pt: opts.detected_font_pt ?? null,
    font_measurement_source: opts.font_measurement_source ?? null,
    font_measurement_confidence: opts.font_measurement_confidence ?? null,
    normalization_scale_raw: opts.normalization_scale_raw ?? null,
    normalization_scale_clamped: opts.normalization_scale_clamped ?? null,
    pixels_per_pdf_point_used: opts.pixels_per_pdf_point_used ?? null,
    font_metadata_source: opts.font_metadata_source ?? null,
    hasValidatedOptions: opts.hasValidatedOptions,
    optionLabelCount: opts.optionLabelCount,
    optionLabels: opts.optionLabels,
    optionsPatternValid: opts.optionsPatternValid,
    selectedMeasurementRegion: opts.selectedMeasurementRegion,
    optionsMetricFallback: opts.optionsMetricFallback,
    referenceRectNorm: opts.referenceRectNorm,
    detectedReferenceHeightPx: opts.detectedReferenceHeightPx,
    manualMeasurementFailureReason: opts.manualMeasurementFailureReason,
    appliedScale: opts.appliedScale,
    widthLimitApplied: opts.widthLimitApplied,
  })
}

export function clearQuestionFontMeasureForDiag(orderIndex: number): void {
  measureByOrder.delete(orderIndex)
}

export function getQuestionFontMeasureForDiag(orderIndex: number): MeasureCacheEntry | undefined {
  return measureByOrder.get(orderIndex)
}

/** Export payload teşhisi — order_index → fiziksel ölçüm alanları */
export function getAllFontEqualizeDiagsForExport(): Array<
  FontEqualizeDiagEntry & { order_index: number }
> {
  return [...measureByOrder.entries()].map(([order_index, entry]) => ({
    order_index,
    ...entry,
  }))
}

export function logScaleClampSite(opts: {
  site: string
  before: number
  after: number
  questionNo?: number
}): void {
  if (!(opts.before > 0) || Math.abs(opts.before - opts.after) < 1e-9) return
  clampSites.push(opts)
  console.log(
    `[ScaleLimit] ${opts.site} before=${opts.before.toFixed(4)} after=${opts.after.toFixed(4)}` +
      (opts.questionNo != null ? ` q=${opts.questionNo}` : ''),
  )
}

export function pxToLayoutPt(px: number): number {
  return px / DIAG_LAYOUT_ZOOM
}

export type LayoutScaleDiagMeta = {
  naturalWidthPt: number
  naturalHeightPt: number
  nativeHeightPt?: number
  sourceWidthPx: number
  sourceHeightPx: number
  availWPt: number
  availHPt: number | null
  requestedScale: number
  manualScale?: number
  normalizationScale?: number
  pixelsPerPdfPoint?: number
  metadataSource?: 'capture' | 'legacy-fallback'
  maxAllowedWPt: number
  widthLimitScale: number
  heightLimitScale: number | null
  appliedScale: number
  limitation: ScaleLimitation
  limitSite: string
  finalDrawWidthPt: number
  finalDrawHeightPt: number
}

/** layout-engine ile aynı formül — sadece meta; drawW’yi yeniden hesaplamaz */
export function buildLayoutScaleDiagMeta(opts: {
  sourceWpx: number
  sourceHpx: number
  availWPt: number
  availHPt?: number | null
  requestedScale: number
  finalDrawWPt: number
  finalDrawHPt: number
  growOverflowTolerance?: number
  allowSlightOverflow?: boolean
  maxAllowedWPt?: number
  nativeWidthPt?: number
  nativeHeightPt?: number
  pixelsPerPdfPoint?: number
  manualScale?: number
  normalizationScale?: number
  metadataSource?: 'capture' | 'legacy-fallback'
}): LayoutScaleDiagMeta {
  const naturalWidthPt =
    opts.nativeWidthPt != null && opts.nativeWidthPt > 0
      ? opts.nativeWidthPt
      : pxToLayoutPt(opts.sourceWpx)
  const naturalHeightPt =
    opts.nativeHeightPt != null && opts.nativeHeightPt > 0
      ? opts.nativeHeightPt
      : pxToLayoutPt(opts.sourceHpx)
  const requestedScale = opts.requestedScale > 0 ? opts.requestedScale : 1
  // Sütun güvenliği: maxAllowedW = availW (1.1 GROW_OVERFLOW kaldırıldı)
  const maxAllowedWPt =
    opts.maxAllowedWPt != null && opts.maxAllowedWPt > 0
      ? opts.maxAllowedWPt
      : opts.availWPt
  const widthLimitScale =
    naturalWidthPt > 0 && maxAllowedWPt > 0 ? maxAllowedWPt / naturalWidthPt : Infinity
  const heightLimitScale =
    opts.availHPt != null && opts.availHPt > 0 && naturalHeightPt > 0
      ? opts.availHPt / naturalHeightPt
      : null
  const appliedScale = naturalWidthPt > 0 ? opts.finalDrawWPt / naturalWidthPt : requestedScale

  let limitation: ScaleLimitation = 'NONE'
  let limitSite = 'NONE'
  if (naturalWidthPt * requestedScale - opts.finalDrawWPt > 0.05) {
    limitation = 'WIDTH_LIMIT'
    limitSite = 'question-draw-metrics.ts:calculateQuestionDrawMetrics maxAllowedW=availW'
  } else if (
    heightLimitScale != null &&
    requestedScale > heightLimitScale + 1e-6 &&
    Math.abs(appliedScale - heightLimitScale) < 0.02
  ) {
    limitation = 'HEIGHT_LIMIT'
    limitSite = 'height clamp (not currently applied in layout-engine)'
  }

  return {
    naturalWidthPt,
    naturalHeightPt,
    nativeHeightPt: naturalHeightPt,
    sourceWidthPx: opts.sourceWpx,
    sourceHeightPx: opts.sourceHpx,
    availWPt: opts.availWPt,
    availHPt: opts.availHPt ?? null,
    requestedScale,
    manualScale: opts.manualScale ?? 1,
    normalizationScale: opts.normalizationScale ?? 1,
    pixelsPerPdfPoint: opts.pixelsPerPdfPoint ?? DIAG_LAYOUT_ZOOM,
    metadataSource: opts.metadataSource ?? 'legacy-fallback',
    maxAllowedWPt,
    widthLimitScale: Number.isFinite(widthLimitScale) ? widthLimitScale : 999,
    heightLimitScale,
    appliedScale,
    limitation,
    limitSite,
    finalDrawWidthPt: opts.finalDrawWPt,
    finalDrawHeightPt: opts.finalDrawHPt,
  }
}

export function measureInkBoundsFromImage(
  img: HTMLImageElement,
  cacheKey?: number,
): { x: number; y: number; w: number; h: number } | null {
  if (cacheKey != null && inkCacheByOrder.has(cacheKey)) {
    return inkCacheByOrder.get(cacheKey) ?? null
  }
  const w = img.naturalWidth
  const h = img.naturalHeight
  if (!(w > 0 && h > 0)) return null
  try {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(img, 0, 0)
    const { data } = ctx.getImageData(0, 0, w, h)
    let minX = w
    let minY = h
    let maxX = -1
    let maxY = -1
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        const a = data[i + 3]!
        if (a < 8) continue
        const r = data[i]!
        const g = data[i + 1]!
        const b = data[i + 2]!
        if (r > 248 && g > 248 && b > 248) continue
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
    const bounds =
      maxX < minX || maxY < minY ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
    if (cacheKey != null) inkCacheByOrder.set(cacheKey, bounds)
    return bounds
  } catch {
    if (cacheKey != null) inkCacheByOrder.set(cacheKey, null)
    return null
  }
}

export function composeQuestionScaleDiagRow(opts: {
  questionNo: number
  meta: LayoutScaleDiagMeta
  detectedFontPx?: number | null
  targetFontPx?: number | null
  ink?: { x: number; y: number; w: number; h: number } | null
  columnBounds?: {
    columnLeftPt: number
    columnRightPt: number
    imageXPt: number
    safeRightPt: number
    drawRightPt: number
    overflowPt: number
    columnBoundsValid: boolean
  } | null
}): QuestionScaleDiagRow {
  const { meta } = opts
  const fulfillment =
    meta.requestedScale > 0 ? (meta.appliedScale / meta.requestedScale) * 100 : 100
  const ink = opts.ink ?? null
  const nativeH = meta.nativeHeightPt ?? meta.naturalHeightPt
  const cb = opts.columnBounds ?? null
  return {
    questionNo: opts.questionNo,
    detectedFontPx: opts.detectedFontPx ?? null,
    targetFontPx: opts.targetFontPx ?? DEFAULT_TARGET_QUESTION_LINE_PT,
    sourceWidth: meta.sourceWidthPx,
    sourceHeight: meta.sourceHeightPx,
    croppedWidth: meta.sourceWidthPx,
    croppedHeight: meta.sourceHeightPx,
    availW: +meta.availWPt.toFixed(2),
    availH: meta.availHPt != null ? +meta.availHPt.toFixed(2) : null,
    normalizationScale: +(meta.normalizationScale ?? 1).toFixed(4),
    manualScale: +(meta.manualScale ?? 1).toFixed(4),
    requestedScale: +meta.requestedScale.toFixed(4),
    requestedScaleField: 'manualScale*normalizationScale',
    nativeWidthPt: +meta.naturalWidthPt.toFixed(2),
    nativeHeightPt: +nativeH.toFixed(2),
    pixelsPerPdfPoint: +(meta.pixelsPerPdfPoint ?? DIAG_LAYOUT_ZOOM).toFixed(4),
    metadataSource: meta.metadataSource ?? 'legacy-fallback',
    widthLimit: +meta.widthLimitScale.toFixed(4),
    heightLimit: meta.heightLimitScale != null ? +meta.heightLimitScale.toFixed(4) : null,
    appliedScale: +meta.appliedScale.toFixed(4),
    fulfillment: +fulfillment.toFixed(1),
    limitation: meta.limitation,
    finalDrawWidth: +meta.finalDrawWidthPt.toFixed(2),
    finalDrawHeight: +meta.finalDrawHeightPt.toFixed(2),
    originalBoundsW: meta.sourceWidthPx,
    originalBoundsH: meta.sourceHeightPx,
    inkBoundsW: ink?.w ?? null,
    inkBoundsH: ink?.h ?? null,
    inkPadL: ink ? ink.x : null,
    inkPadR: ink ? meta.sourceWidthPx - (ink.x + ink.w) : null,
    inkPadT: ink ? ink.y : null,
    inkPadB: ink ? meta.sourceHeightPx - (ink.y + ink.h) : null,
    limitSite: meta.limitSite,
    columnLeftPt: cb ? +cb.columnLeftPt.toFixed(2) : null,
    columnRightPt: cb ? +cb.columnRightPt.toFixed(2) : null,
    imageXPt: cb ? +cb.imageXPt.toFixed(2) : null,
    safeRightPt: cb ? +cb.safeRightPt.toFixed(2) : null,
    drawRightPt: cb ? +cb.drawRightPt.toFixed(2) : null,
    overflowPt: cb != null ? +cb.overflowPt.toFixed(3) : null,
    columnBoundsValid: cb?.columnBoundsValid ?? null,
  }
}

export function flushQuestionScaleDiagnostics(
  rows: QuestionScaleDiagRow[],
  fingerprint: string,
  source: 'canvas-preview' | 'pdf-export',
): void {
  if (rows.length === 0) return
  if (fingerprint === lastFlushFingerprint) return
  lastFlushFingerprint = fingerprint

  const equalizeRunId = getEqualizeRunIdForLogs()
  // Rutin önizleme / export — eşitleme aşaması gibi gösterilmez
  const stage = source === 'canvas-preview' ? 'ROUTINE_CANVAS_PREVIEW' : 'PDF_EXPORT'
  const label = source === 'canvas-preview' ? 'ROUTINE_CANVAS_PREVIEW' : 'PDF_EXPORT'

  console.log(
    `[ScaleDiag:${label}] equalizeRunId=${equalizeRunId ?? 'none'} | stage=${stage} | ` +
      `requestedScale = manualScale × normalizationScale | native pt = capture|legacy | ` +
      `(rutin çizim — font eşitleme STATE_COMMITTED değil)`,
  )
  console.table(
    rows.map((r) => ({
      equalizeRunId: equalizeRunId ?? 'none',
      stage,
      questionNo: r.questionNo,
      detectedFontPx: r.detectedFontPx,
      targetFontPx: r.targetFontPx,
      normalizationScale: r.normalizationScale,
      manualScale: r.manualScale,
      requestedScale: r.requestedScale,
      nativeWidthPt: r.nativeWidthPt,
      nativeHeightPt: r.nativeHeightPt,
      pixelsPerPdfPoint: r.pixelsPerPdfPoint,
      widthLimit: r.widthLimit,
      appliedScale: r.appliedScale,
      fulfillment: r.fulfillment,
      limitation: r.limitation,
      metadataSource: r.metadataSource,
      finalDrawWidth: r.finalDrawWidth,
      finalDrawHeight: r.finalDrawHeight,
      availW: r.availW,
      columnLeftPt: r.columnLeftPt ?? null,
      columnRightPt: r.columnRightPt ?? null,
      imageXPt: r.imageXPt ?? null,
      safeRightPt: r.safeRightPt ?? null,
      drawRightPt: r.drawRightPt ?? null,
      overflowPt: r.overflowPt ?? null,
      columnBoundsValid: r.columnBoundsValid ?? null,
      inkPad: r.inkPadL != null ? `L${r.inkPadL}/R${r.inkPadR}/T${r.inkPadT}/B${r.inkPadB}` : null,
      limitSite: r.limitSite,
    })),
  )

  for (const r of rows) {
    console.log(
      `Soru ${r.questionNo} | equalizeRunId=${equalizeRunId ?? 'none'} | stage=${stage} | ` +
        `requested=${r.requestedScale} | applied=${r.appliedScale} | fulfillment=${r.fulfillment}% | ` +
        `${r.limitation} | final=${r.finalDrawWidth} x ${r.finalDrawHeight} pt | meta=${r.metadataSource}` +
        (r.overflowPt != null ? ` | overflowPt=${r.overflowPt}` : ''),
    )
    if (
      import.meta.env.DEV &&
      r.overflowPt != null &&
      r.overflowPt > 0.01
    ) {
      console.warn(
        `COLUMN_OVERFLOW | pipeline=CANVAS_PREVIEW | Soru ${r.questionNo} | ` +
          `overflowPt=${r.overflowPt} | imageX=${r.imageXPt} drawRight=${r.drawRightPt} ` +
          `safeRight=${r.safeRightPt}`,
      )
    }
  }

  if (clampSites.length > 0) {
    console.log(`[ScaleDiag:${stage}] equalizeRunId=${equalizeRunId ?? 'none'} clamp siteleri:`, [
      ...clampSites,
    ])
    clampSites.length = 0
  }
}

export function resetQuestionScaleDiagFlush(): void {
  lastFlushFingerprint = ''
}
