/**
 * Electron tarafı ölçek teşhisi — yerleşim matematiğini değiştirmez.
 * requestedScale = manualScale × normalizationScale
 */

export const DIAG_LAYOUT_ZOOM = 600 / 72

export type ScaleLimitation = 'WIDTH_LIMIT' | 'HEIGHT_LIMIT' | 'NONE'

export type LayoutScaleDiagMeta = {
  naturalWidthPt: number
  nativeHeightPt: number
  naturalHeightPt: number
  sourceWidthPx: number
  sourceHeightPx: number
  availWPt: number
  availHPt: number | null
  requestedScale: number
  manualScale: number
  normalizationScale: number
  pixelsPerPdfPoint: number
  metadataSource: 'capture' | 'legacy-fallback'
  requestedScaleField: 'manualScale*normalizationScale'
  maxAllowedWPt: number
  widthLimitScale: number
  heightLimitScale: number | null
  appliedScale: number
  limitation: ScaleLimitation
  limitSite: string
  finalDrawWidthPt: number
  finalDrawHeightPt: number
  layoutMode?: 'single-column' | 'full-width' | 'auto'
  singleColumnFulfillment?: number
  fullWidthAvailW?: number
  fullWidthAppliedScale?: number
  fullWidthFulfillment?: number
  fullWidthDrawHeight?: number
  pageRemainingHeight?: number
  pageBreakBefore?: boolean
  layoutRecommendation?: 'FULL_WIDTH' | 'SINGLE_COLUMN'
}

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
  layoutMode?: 'single-column' | 'full-width' | 'auto'
  singleColumnFulfillment?: number
  fullWidthAvailW?: number
  fullWidthAppliedScale?: number
  fullWidthFulfillment?: number
  fullWidthDrawHeight?: number
  layoutRecommendation?: 'FULL_WIDTH' | 'SINGLE_COLUMN'
}): LayoutScaleDiagMeta {
  const naturalWidthPt =
    opts.nativeWidthPt != null && opts.nativeWidthPt > 0
      ? opts.nativeWidthPt
      : opts.sourceWpx / DIAG_LAYOUT_ZOOM
  const naturalHeightPt =
    opts.nativeHeightPt != null && opts.nativeHeightPt > 0
      ? opts.nativeHeightPt
      : opts.sourceHpx / DIAG_LAYOUT_ZOOM
  const requestedScale = opts.requestedScale > 0 ? opts.requestedScale : 1
  // Sütun güvenliği: maxAllowedW = availW (GROW_OVERFLOW_TOLERANCE kaldırıldı)
  const maxAllowedWPt =
    opts.maxAllowedWPt != null && opts.maxAllowedWPt > 0
      ? opts.maxAllowedWPt
      : opts.availWPt
  const widthLimitScale =
    naturalWidthPt > 0 && maxAllowedWPt > 0 ? maxAllowedWPt / naturalWidthPt : 999
  const appliedScale = naturalWidthPt > 0 ? opts.finalDrawWPt / naturalWidthPt : requestedScale

  let limitation: ScaleLimitation = 'NONE'
  let limitSite = 'NONE'
  if (naturalWidthPt * requestedScale - opts.finalDrawWPt > 0.05) {
    limitation = 'WIDTH_LIMIT'
    limitSite = 'question-draw-metrics.ts:calculateQuestionDrawMetrics maxAllowedW=availW'
  }

  return {
    naturalWidthPt,
    nativeHeightPt: naturalHeightPt,
    naturalHeightPt,
    sourceWidthPx: opts.sourceWpx,
    sourceHeightPx: opts.sourceHpx,
    availWPt: opts.availWPt,
    availHPt: opts.availHPt ?? null,
    requestedScale,
    manualScale: opts.manualScale ?? 1,
    normalizationScale: opts.normalizationScale ?? 1,
    pixelsPerPdfPoint: opts.pixelsPerPdfPoint ?? DIAG_LAYOUT_ZOOM,
    metadataSource: opts.metadataSource ?? 'legacy-fallback',
    requestedScaleField: 'manualScale*normalizationScale',
    maxAllowedWPt,
    widthLimitScale: Number.isFinite(widthLimitScale) ? widthLimitScale : 999,
    heightLimitScale: null,
    appliedScale,
    limitation,
    limitSite,
    finalDrawWidthPt: opts.finalDrawWPt,
    finalDrawHeightPt: opts.finalDrawHPt,
    layoutMode: opts.layoutMode,
    singleColumnFulfillment: opts.singleColumnFulfillment,
    fullWidthAvailW: opts.fullWidthAvailW,
    fullWidthAppliedScale: opts.fullWidthAppliedScale,
    fullWidthFulfillment: opts.fullWidthFulfillment,
    fullWidthDrawHeight: opts.fullWidthDrawHeight,
    layoutRecommendation: opts.layoutRecommendation,
  }
}

let lastExportFingerprint = ''

export function flushLayoutScaleDiagForExport(
  rows: Array<{ questionNo: number; meta: LayoutScaleDiagMeta }>,
  fingerprint: string,
): void {
  if (rows.length === 0) return
  if (fingerprint === lastExportFingerprint) return
  lastExportFingerprint = fingerprint

  console.log(
    `[ScaleDiag:pdf-export] requestedScale = manualScale × normalizationScale | native pt from capture|legacy`,
  )
  console.table(
    rows.map(({ questionNo, meta }) => {
      const fulfillment =
        meta.requestedScale > 0 ? (meta.appliedScale / meta.requestedScale) * 100 : 100
      return {
        questionNo,
        normalizationScale: +meta.normalizationScale.toFixed(4),
        manualScale: +meta.manualScale.toFixed(4),
        requestedScale: +meta.requestedScale.toFixed(4),
        nativeWidthPt: +meta.naturalWidthPt.toFixed(2),
        nativeHeightPt: +meta.nativeHeightPt.toFixed(2),
        pixelsPerPdfPoint: +meta.pixelsPerPdfPoint.toFixed(4),
        widthLimit: +meta.widthLimitScale.toFixed(4),
        appliedScale: +meta.appliedScale.toFixed(4),
        fulfillment: +fulfillment.toFixed(1),
        limitation: meta.limitation,
        metadataSource: meta.metadataSource,
        finalDrawWidth: +meta.finalDrawWidthPt.toFixed(2),
        finalDrawHeight: +meta.finalDrawHeightPt.toFixed(2),
      }
    }),
  )

  for (const { questionNo, meta } of rows) {
    const fulfillment =
      meta.requestedScale > 0 ? (meta.appliedScale / meta.requestedScale) * 100 : 100
    console.log(
      `Soru ${questionNo} | requested=${meta.requestedScale.toFixed(4)} | applied=${meta.appliedScale.toFixed(4)} | fulfillment=${fulfillment.toFixed(1)}% | ${meta.limitation} | final=${meta.finalDrawWidthPt.toFixed(2)} x ${meta.finalDrawHeightPt.toFixed(2)} pt | meta=${meta.metadataSource}`,
    )
  }
}
