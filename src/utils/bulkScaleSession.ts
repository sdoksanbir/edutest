/**
 * Toplu yeniden ölçeklendirme — WIDTH_LIMIT dead-zone düzeltmesi.
 * Küçültmede hedef = baseline.appliedScale × relativeFactor (requestedScale değil).
 * Formül değişmez; commit/state/export teşhisi burada.
 */

export type BulkScaleLayoutMode = 'single-column' | 'full-width' | 'auto'

/** Oturum başında immutable snapshot */
export type BulkScaleBaseline = {
  questionId: string
  questionNo: number
  orderIndex: number
  normalizationScale: number
  manualScale: number
  requestedScale: number
  appliedScale: number
  drawWidth: number
  drawHeight: number
  widthLimit: number
  layoutMode: BulkScaleLayoutMode
  fullWidthLimit: number
  singleColumnWidthLimit: number
}

export type BulkPendingScale = {
  manualScale: number
  normalizationScale: number
  requestedScale: number
  desiredAppliedScale: number
  desiredDrawWidth?: number
}

/** Zustand’a atomik yazılacak alanlar */
export type BulkScaleStoreUpdate = {
  manualScale: number
  normalizationScale: number
  display_scale: number
}

export type BulkScaleApplyResult = {
  questionId: string
  questionNo: number
  relativeFactor: number
  desiredAppliedScale: number
  safeAppliedScale: number
  newManualScale: number
  resultingRequestedScale: number
  resultingAppliedScale: number
  resultingDrawWidth: number
  resultingDrawHeight: number
  actualWidthRatio: number
  previewScaleFactor: number
}

export type BulkScaleDiagStage =
  | 'BULK_SCALE_SESSION_START'
  | 'BULK_SCALE_PREVIEW'
  | 'BULK_SCALE_COMMIT'
  | 'BULK_SCALE_STATE_READBACK'
  | 'BULK_SCALE_EXPORT_PAYLOAD'
  | 'PDF_EXPORT'

let activeBulkScaleRunId: string | null = null

export function beginBulkScaleRun(): string {
  activeBulkScaleRunId = `bulk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  return activeBulkScaleRunId
}

export function getBulkScaleRunId(): string | null {
  return activeBulkScaleRunId
}

export function endBulkScaleRun(): void {
  activeBulkScaleRunId = null
}

export function bulkRelativeFactor(
  currentBulkPercent: number,
  sessionStartPercent: number,
): number {
  const start = sessionStartPercent > 0 ? sessionStartPercent : 100
  return currentBulkPercent / start
}

/**
 * Küçültme: applied × factor.
 * Büyütme: aynı, ama sütun/full-width tavanıyla clamp.
 */
export function applyBulkScaleToBaseline(
  baseline: BulkScaleBaseline,
  relativeFactor: number,
): BulkScaleApplyResult {
  const factor = Number.isFinite(relativeFactor) && relativeFactor > 0 ? relativeFactor : 1
  const norm =
    baseline.normalizationScale > 0 && Number.isFinite(baseline.normalizationScale)
      ? baseline.normalizationScale
      : 1
  const applied0 =
    baseline.appliedScale > 0 && Number.isFinite(baseline.appliedScale)
      ? baseline.appliedScale
      : baseline.requestedScale > 0
        ? baseline.requestedScale
        : 1

  const desiredAppliedScale = applied0 * factor
  const maxAppliedScale =
    baseline.layoutMode === 'full-width'
      ? baseline.fullWidthLimit > 0
        ? baseline.fullWidthLimit
        : Number.POSITIVE_INFINITY
      : baseline.singleColumnWidthLimit > 0
        ? baseline.singleColumnWidthLimit
        : baseline.widthLimit > 0
          ? baseline.widthLimit
          : Number.POSITIVE_INFINITY

  const safeAppliedScale =
    factor >= 1 && Number.isFinite(maxAppliedScale)
      ? Math.min(desiredAppliedScale, maxAppliedScale)
      : desiredAppliedScale

  const newManualScale = safeAppliedScale / norm
  const resultingRequestedScale = norm * newManualScale
  const resultingAppliedScale = safeAppliedScale
  const resultingDrawWidth = baseline.drawWidth * (safeAppliedScale / applied0)
  const resultingDrawHeight = baseline.drawHeight * (safeAppliedScale / applied0)
  const actualWidthRatio =
    baseline.drawWidth > 0 ? resultingDrawWidth / baseline.drawWidth : factor
  const previewScaleFactor = applied0 > 0 ? safeAppliedScale / applied0 : factor

  return {
    questionId: baseline.questionId,
    questionNo: baseline.questionNo,
    relativeFactor: factor,
    desiredAppliedScale,
    safeAppliedScale,
    newManualScale,
    resultingRequestedScale,
    resultingAppliedScale,
    resultingDrawWidth,
    resultingDrawHeight,
    actualWidthRatio,
    previewScaleFactor,
  }
}

export function pendingFromBulkApply(
  baseline: BulkScaleBaseline,
  result: BulkScaleApplyResult,
): BulkPendingScale {
  return {
    manualScale: result.newManualScale,
    normalizationScale: baseline.normalizationScale,
    requestedScale: result.resultingRequestedScale,
    desiredAppliedScale: result.desiredAppliedScale,
    desiredDrawWidth: result.resultingDrawWidth,
  }
}

export function storeUpdateFromBulkApply(
  baseline: BulkScaleBaseline,
  result: BulkScaleApplyResult,
): BulkScaleStoreUpdate {
  const normalizationScale =
    baseline.normalizationScale > 0 ? baseline.normalizationScale : 1
  return {
    manualScale: result.newManualScale,
    normalizationScale,
    display_scale: normalizationScale * result.newManualScale,
  }
}

export function storeUpdateFromPending(p: BulkPendingScale): BulkScaleStoreUpdate {
  const normalizationScale = p.normalizationScale > 0 ? p.normalizationScale : 1
  return {
    manualScale: p.manualScale,
    normalizationScale,
    display_scale: normalizationScale * p.manualScale,
  }
}

export function pendingFromRequestedProduct(
  product: number,
  normalizationScale: number,
  desiredAppliedScale?: number,
): BulkPendingScale {
  const norm = normalizationScale > 0 ? normalizationScale : 1
  const req = product > 0 ? product : 1
  return {
    manualScale: req / norm,
    normalizationScale: norm,
    requestedScale: req,
    desiredAppliedScale: desiredAppliedScale ?? req,
  }
}

export function logBulkScaleStage(
  stage: BulkScaleDiagStage,
  rows: Array<Record<string, unknown>>,
  extra?: string,
): void {
  const runId = activeBulkScaleRunId ?? 'none'
  console.log(
    `[ScaleDiag:${stage}] bulkScaleRunId=${runId} | stage=${stage}` +
      (extra ? ` | ${extra}` : ''),
  )
  if (rows.length > 0) console.table(rows)
}

export function logBulkScaleSessionStart(baselines: BulkScaleBaseline[]): void {
  logBulkScaleStage(
    'BULK_SCALE_SESSION_START',
    baselines.map((b) => ({
      bulkScaleRunId: activeBulkScaleRunId ?? 'none',
      questionNo: b.questionNo,
      questionId: b.questionId,
      baselineNormalizationScale: +b.normalizationScale.toFixed(4),
      baselineManualScale: +b.manualScale.toFixed(4),
      baselineRequestedScale: +b.requestedScale.toFixed(4),
      baselineAppliedScale: +b.appliedScale.toFixed(4),
      baselineDrawWidth: +b.drawWidth.toFixed(2),
      widthLimit: Number.isFinite(b.widthLimit) ? +b.widthLimit.toFixed(4) : null,
      layoutMode: b.layoutMode,
    })),
  )
}

export function logBulkScalePreview(
  relativeFactor: number,
  results: BulkScaleApplyResult[],
): void {
  logBulkScaleStage(
    'BULK_SCALE_PREVIEW',
    results.map((r) => ({
      bulkScaleRunId: activeBulkScaleRunId ?? 'none',
      questionNo: r.questionNo,
      relativeFactor: +r.relativeFactor.toFixed(4),
      desiredAppliedScale: +r.desiredAppliedScale.toFixed(4),
      newManualScale: +r.newManualScale.toFixed(4),
      resultingRequestedScale: +r.resultingRequestedScale.toFixed(4),
      resultingDrawWidth: +r.resultingDrawWidth.toFixed(2),
      actualWidthRatio: +r.actualWidthRatio.toFixed(4),
    })),
    `relativeFactor=${relativeFactor.toFixed(4)}`,
  )
}

export function logBulkScaleCommit(
  relativeFactor: number,
  rows: Array<{
    questionId: string
    questionNo: number
    normalizationScale: number
    previousManualScale: number
    newManualScale: number
    previousDisplayScale: number
    newDisplayScale: number
    desiredAppliedScale: number
    desiredDrawWidth: number
  }>,
): void {
  logBulkScaleStage(
    'BULK_SCALE_COMMIT',
    rows.map((r) => ({
      bulkScaleRunId: activeBulkScaleRunId ?? 'none',
      questionId: r.questionId,
      questionNo: r.questionNo,
      normalizationScale: +r.normalizationScale.toFixed(4),
      previousManualScale: +r.previousManualScale.toFixed(4),
      newManualScale: +r.newManualScale.toFixed(4),
      previousDisplayScale: +r.previousDisplayScale.toFixed(4),
      newDisplayScale: +r.newDisplayScale.toFixed(4),
      desiredAppliedScale: +r.desiredAppliedScale.toFixed(4),
      desiredDrawWidth: +r.desiredDrawWidth.toFixed(2),
    })),
    `relativeFactor=${relativeFactor.toFixed(4)}`,
  )
}

export function logBulkScaleStateReadback(
  questions: Array<{
    questionId: string
    questionNo: number
    manualScale: number
    normalizationScale: number
    display_scale: number
    resolvedRequestedScale: number
  }>,
): void {
  const bad = questions.filter((q) => Math.abs(q.manualScale - 1) < 1e-9 && q.normalizationScale < 0.99)
  logBulkScaleStage(
    'BULK_SCALE_STATE_READBACK',
    questions.map((q) => ({
      bulkScaleRunId: activeBulkScaleRunId ?? 'none',
      questionId: q.questionId,
      questionNo: q.questionNo,
      manualScale: +q.manualScale.toFixed(4),
      normalizationScale: +q.normalizationScale.toFixed(4),
      display_scale: +q.display_scale.toFixed(4),
      resolvedRequestedScale: +q.resolvedRequestedScale.toFixed(4),
    })),
    bad.length > 0
      ? `WARN: ${bad.length} soruda manualScale=1 (commit kaybolmuş olabilir)`
      : undefined,
  )
  if (bad.length > 0) {
    console.warn(
      `[ScaleDiag:BULK_SCALE_STATE_READBACK] bulkScaleRunId=${activeBulkScaleRunId ?? 'none'} | ` +
        `manualScale hâlâ 1 — setQuestionsBulkScales / overlay yazımı kontrol et`,
      bad.map((q) => q.questionId),
    )
  }
}

export function logBulkScaleExportPayload(
  questions: Array<{
    questionId: string
    questionNo: number
    manualScale: number
    normalizationScale: number
    display_scale: number
    resolvedRequestedScale: number
  }>,
): void {
  logBulkScaleStage(
    'BULK_SCALE_EXPORT_PAYLOAD',
    questions.map((q) => ({
      bulkScaleRunId: activeBulkScaleRunId ?? 'none',
      questionId: q.questionId,
      questionNo: q.questionNo,
      manualScale: +q.manualScale.toFixed(4),
      normalizationScale: +q.normalizationScale.toFixed(4),
      display_scale: +q.display_scale.toFixed(4),
      resolvedRequestedScale: +q.resolvedRequestedScale.toFixed(4),
    })),
  )
}

/** @deprecated — PREVIEW/COMMIT logları tercih edin */
export function logBulkScaleApply(
  relativeFactor: number,
  results: BulkScaleApplyResult[],
): void {
  logBulkScalePreview(relativeFactor, results)
}

/** LayoutItem + soru alanlarından immutable baseline */
export function captureBulkScaleBaseline(opts: {
  questionId: string
  questionNo: number
  orderIndex: number
  normalizationScale: number
  manualScale: number
  requestedScale: number
  imgWPt?: number | null
  imgHPt?: number | null
  layoutMode?: BulkScaleLayoutMode | string | null
  scaleDiag?: {
    naturalWidthPt?: number
    appliedScale?: number
    widthLimitScale?: number
    availWPt?: number
    finalDrawWidthPt?: number
    finalDrawHeightPt?: number
    layoutMode?: BulkScaleLayoutMode | string
    fullWidthAvailW?: number
    fullWidthAppliedScale?: number
  } | null
}): BulkScaleBaseline {
  const diag = opts.scaleDiag ?? null
  const nativeW =
    diag?.naturalWidthPt != null && diag.naturalWidthPt > 0 ? diag.naturalWidthPt : 0
  const drawWidth =
    opts.imgWPt != null && opts.imgWPt > 0
      ? opts.imgWPt
      : diag?.finalDrawWidthPt != null && diag.finalDrawWidthPt > 0
        ? diag.finalDrawWidthPt
        : 0
  const drawHeight =
    opts.imgHPt != null && opts.imgHPt > 0
      ? opts.imgHPt
      : diag?.finalDrawHeightPt != null && diag.finalDrawHeightPt > 0
        ? diag.finalDrawHeightPt
        : 0

  const appliedScale =
    diag?.appliedScale != null && diag.appliedScale > 0
      ? diag.appliedScale
      : nativeW > 0 && drawWidth > 0
        ? drawWidth / nativeW
        : opts.requestedScale > 0
          ? opts.requestedScale
          : 1

  const widthLimit =
    diag?.widthLimitScale != null && diag.widthLimitScale > 0
      ? diag.widthLimitScale
      : nativeW > 0 && diag?.availWPt != null && diag.availWPt > 0
        ? diag.availWPt / nativeW
        : Number.POSITIVE_INFINITY

  const rawMode = String(diag?.layoutMode ?? opts.layoutMode ?? 'single-column')
  const layoutMode: BulkScaleLayoutMode =
    rawMode === 'full-width' || rawMode === 'auto' ? rawMode : 'single-column'

  const fullWidthLimit =
    nativeW > 0 && diag?.fullWidthAvailW != null && diag.fullWidthAvailW > 0
      ? diag.fullWidthAvailW / nativeW
      : widthLimit

  return {
    questionId: opts.questionId,
    questionNo: opts.questionNo,
    orderIndex: opts.orderIndex,
    normalizationScale: opts.normalizationScale > 0 ? opts.normalizationScale : 1,
    manualScale: opts.manualScale > 0 ? opts.manualScale : 1,
    requestedScale: opts.requestedScale > 0 ? opts.requestedScale : 1,
    appliedScale,
    drawWidth,
    drawHeight,
    widthLimit,
    layoutMode,
    fullWidthLimit,
    singleColumnWidthLimit: widthLimit,
  }
}
