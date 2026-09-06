/**
 * Ortak soru çizim metrikleri — CANVAS_PREVIEW ve PDF_EXPORT aynı sonucu kullanır.
 * Tek sütun: drawWidth asla singleAvailW'yi aşmaz (GROW_OVERFLOW_TOLERANCE kaldırıldı).
 */

import { nativeSizePtFromQuestion } from './question-native-size.js'

/**
 * @deprecated Eski %10 taşma; varsayılan yolda kullanılmaz (değer 1 = availW).
 * allow_slight_overflow=true olsa bile sütun sınırını aşmaz.
 */
export const GROW_OVERFLOW_TOLERANCE = 1

export const IMG_COL_RIGHT_PAD_PT = 2

export type RenderPipeline = 'CANVAS_PREVIEW' | 'PDF_EXPORT' | 'PRINT_EXPORT'

export type QuestionDrawMetrics = {
  requestedScale: number
  appliedScale: number
  drawWidth: number
  drawHeight: number
  fulfillment: number
  limitation: 'WIDTH_LIMIT' | 'HEIGHT_LIMIT' | 'NONE'
  nativeWidthPt: number
  nativeHeightPt: number
  manualScale: number
  normalizationScale: number
  widthLimit: number
  metadataSource: 'capture' | 'legacy-fallback'
  pixelsPerPdfPoint: number
  availWPt: number
  maxAllowedWPt: number
  allowSlightOverflow: boolean
  layoutMode: 'single-column' | 'full-width' | 'auto'
  singleColumnFulfillment: number
  fullWidthAvailW: number
  fullWidthAppliedScale: number
  fullWidthFulfillment: number
}

export type QuestionDrawLayoutContext = {
  singleAvailWPt: number
  fullWidthAvailWPt: number
  preferFullWidth?: boolean
  /** false (varsayılan): maxAllowedW = availW. true: yine sütun güvenli sınırı (availW). */
  allowSlightOverflow?: boolean
}

export type ColumnImageBoundsDiag = {
  columnLeftPt: number
  columnRightPt: number
  imageXPt: number
  safeRightPt: number
  drawRightPt: number
  overflowPt: number
  columnBoundsValid: boolean
}

/**
 * Tek sütun max çizim genişliği — her zaman availW (görsel net alan).
 * allowSlightOverflow true olsa bile komşu sütuna taşmaz.
 */
export function resolveSingleColumnMaxAllowedW(
  singleAvailW: number,
  _allowSlightOverflow: boolean = false,
): number {
  if (!(singleAvailW > 0)) return Number.POSITIVE_INFINITY
  return singleAvailW
}

/** imageX + drawW ≤ safeRight; imageX ≥ columnLeft */
export function computeColumnImageBounds(opts: {
  columnXPt: number
  columnContentWidthPt: number
  rightPaddingPt?: number
  imageXPt: number
  drawWidthPt: number
}): ColumnImageBoundsDiag {
  const rightPad = opts.rightPaddingPt ?? IMG_COL_RIGHT_PAD_PT
  const columnLeftPt = opts.columnXPt
  const columnRightPt = opts.columnXPt + opts.columnContentWidthPt
  const safeRightPt = columnRightPt - rightPad
  const imageXPt = opts.imageXPt
  const drawRightPt = imageXPt + opts.drawWidthPt
  const overflowPt = Math.max(0, drawRightPt - safeRightPt)
  const leftOk = imageXPt >= columnLeftPt - 0.01
  const rightOk = drawRightPt <= safeRightPt + 0.01
  return {
    columnLeftPt,
    columnRightPt,
    imageXPt,
    safeRightPt,
    drawRightPt,
    overflowPt,
    columnBoundsValid: leftOk && rightOk,
  }
}

export function logColumnOverflowIfNeeded(
  bounds: ColumnImageBoundsDiag,
  questionNo: number,
  pipeline: string,
): void {
  if (bounds.overflowPt <= 0.01) return
  const isDev =
    typeof process !== 'undefined' &&
    process.env &&
    process.env.NODE_ENV !== 'production'
  if (!isDev) return
  console.warn(
    `COLUMN_OVERFLOW | pipeline=${pipeline} | Soru ${questionNo} | ` +
      `overflowPt=${bounds.overflowPt.toFixed(3)} | ` +
      `imageX=${bounds.imageXPt.toFixed(2)} drawRight=${bounds.drawRightPt.toFixed(2)} ` +
      `safeRight=${bounds.safeRightPt.toFixed(2)}`,
  )
}

function resolveLayoutMode(q: Record<string, unknown>): 'single-column' | 'full-width' | 'auto' {
  const raw = String(q.layoutMode ?? q.layout_mode ?? 'single-column')
  if (raw === 'full-width' || raw === 'auto') return raw
  return 'single-column'
}

/**
 * Tek kaynak: requested → clamp → draw W/H.
 * imageSizePx zorunlu (PNG boyutu çağıran tarafta çözülür).
 */
export function calculateQuestionDrawMetrics(
  question: Record<string, unknown>,
  layoutContext: QuestionDrawLayoutContext,
  imageSizePx: { w: number; h: number },
): QuestionDrawMetrics | null {
  if (!(imageSizePx.w > 0 && imageSizePx.h > 0)) return null

  const sized = nativeSizePtFromQuestion(question, imageSizePx.w, imageSizePx.h)
  const requestedScale = Math.max(0.01, sized.requestedScale)
  const layoutMode = resolveLayoutMode(question)
  const useFullWidth = layoutMode === 'full-width' && layoutContext.preferFullWidth !== false
  const allowSlightOverflow = layoutContext.allowSlightOverflow === true

  const nativeWidthPt = sized.nativeWidthPt
  const nativeHeightPt = sized.nativeHeightPt
  const aspect =
    nativeWidthPt > 0 && nativeHeightPt > 0
      ? nativeHeightPt / nativeWidthPt
      : imageSizePx.w > 0
        ? imageSizePx.h / imageSizePx.w
        : 1

  const singleAvailW = layoutContext.singleAvailWPt
  const maxAllowedW = resolveSingleColumnMaxAllowedW(singleAvailW, allowSlightOverflow)
  let singleDrawW = nativeWidthPt * requestedScale
  if (Number.isFinite(maxAllowedW) && singleDrawW > maxAllowedW) {
    singleDrawW = maxAllowedW
  }
  const singleDrawH = singleDrawW * aspect
  const singleApplied = nativeWidthPt > 0 ? singleDrawW / nativeWidthPt : requestedScale
  const singleColumnFulfillment = requestedScale > 0 ? singleApplied / requestedScale : 1

  const fullWidthAvailW = layoutContext.fullWidthAvailWPt
  const fullWidthLimit = nativeWidthPt > 0 ? fullWidthAvailW / nativeWidthPt : requestedScale
  const fullWidthAppliedScale = Math.min(requestedScale, fullWidthLimit)
  const fullWidthDrawW = nativeWidthPt * fullWidthAppliedScale
  const fullWidthDrawH = nativeHeightPt * fullWidthAppliedScale
  const fullWidthFulfillment =
    requestedScale > 0 ? fullWidthAppliedScale / requestedScale : 1

  const drawWidth = useFullWidth ? fullWidthDrawW : singleDrawW
  const drawHeight = useFullWidth ? fullWidthDrawH : singleDrawH
  const appliedScale = useFullWidth ? fullWidthAppliedScale : singleApplied
  const availWPt = useFullWidth ? fullWidthAvailW : singleAvailW
  const widthLimit = nativeWidthPt > 0 && availWPt > 0 ? availWPt / nativeWidthPt : 999
  const fulfillment = requestedScale > 0 ? appliedScale / requestedScale : 1
  const limitation: QuestionDrawMetrics['limitation'] =
    nativeWidthPt * requestedScale - drawWidth > 0.05 ? 'WIDTH_LIMIT' : 'NONE'

  return {
    requestedScale,
    appliedScale,
    drawWidth,
    drawHeight,
    fulfillment,
    limitation,
    nativeWidthPt,
    nativeHeightPt,
    manualScale: sized.manualScale,
    normalizationScale: sized.normalizationScale,
    widthLimit: Number.isFinite(widthLimit) ? widthLimit : 999,
    metadataSource: sized.metadataSource,
    pixelsPerPdfPoint: sized.pixelsPerPdfPoint,
    availWPt,
    maxAllowedWPt: useFullWidth ? fullWidthAvailW : maxAllowedW,
    allowSlightOverflow,
    layoutMode: useFullWidth ? 'full-width' : 'single-column',
    singleColumnFulfillment,
    fullWidthAvailW,
    fullWidthAppliedScale,
    fullWidthFulfillment,
  }
}

export type PipelineDrawLogRow = {
  pipeline: RenderPipeline
  questionNo: number
  normalizationScale: number
  manualScale: number
  requestedScale: number
  nativeWidthPt: number
  widthLimit: number
  appliedScale: number
  drawWidth: number
  drawHeight: number
  x: number
  y: number
  metadataSource: string
  fulfillment: number
  limitation: string
  columnLeftPt?: number
  columnRightPt?: number
  imageXPt?: number
  safeRightPt?: number
  drawRightPt?: number
  overflowPt?: number
  columnBoundsValid?: boolean
}

export function logPipelineDrawTable(
  rows: PipelineDrawLogRow[],
  opts?: { equalizeRunId?: string | null },
): void {
  if (rows.length === 0) return
  const pipeline = rows[0]!.pipeline
  const equalizeRunId = opts?.equalizeRunId ?? null
  const stage = pipeline === 'PDF_EXPORT' ? 'PDF_EXPORT' : pipeline
  console.log(
    `[ScaleDiag:${stage}] equalizeRunId=${equalizeRunId ?? 'none'} | stage=${stage} | ` +
      `kesin metrikler (drawImage / canvas çizim öncesi)`,
  )
  console.table(
    rows.map((r) => ({
      equalizeRunId: equalizeRunId ?? 'none',
      stage,
      pipeline: r.pipeline,
      questionNo: r.questionNo,
      normalizationScale: +r.normalizationScale.toFixed(4),
      manualScale: +r.manualScale.toFixed(4),
      requestedScale: +r.requestedScale.toFixed(4),
      nativeWidthPt: +r.nativeWidthPt.toFixed(2),
      widthLimit: +r.widthLimit.toFixed(4),
      appliedScale: +r.appliedScale.toFixed(4),
      drawWidth: +r.drawWidth.toFixed(2),
      drawHeight: +r.drawHeight.toFixed(2),
      x: +r.x.toFixed(2),
      y: +r.y.toFixed(2),
      columnLeftPt: r.columnLeftPt != null ? +r.columnLeftPt.toFixed(2) : null,
      columnRightPt: r.columnRightPt != null ? +r.columnRightPt.toFixed(2) : null,
      imageXPt: r.imageXPt != null ? +r.imageXPt.toFixed(2) : null,
      safeRightPt: r.safeRightPt != null ? +r.safeRightPt.toFixed(2) : null,
      drawRightPt: r.drawRightPt != null ? +r.drawRightPt.toFixed(2) : null,
      overflowPt: r.overflowPt != null ? +r.overflowPt.toFixed(3) : null,
      columnBoundsValid: r.columnBoundsValid ?? null,
      metadataSource: r.metadataSource,
      fulfillment: +(r.fulfillment * 100).toFixed(1),
      limitation: r.limitation,
    })),
  )
  for (const r of rows) {
    console.log(
      `Soru ${r.questionNo} | equalizeRunId=${equalizeRunId ?? 'none'} | stage=${stage} | ` +
        `requested=${r.requestedScale.toFixed(4)} | applied=${r.appliedScale.toFixed(4)} | ` +
        `draw=${r.drawWidth.toFixed(1)}x${r.drawHeight.toFixed(1)} | meta=${r.metadataSource} | ${r.pipeline}` +
        (r.overflowPt != null ? ` | overflowPt=${r.overflowPt.toFixed(3)}` : ''),
    )
  }
}

export function comparePreviewAndPdfExport(
  previewRows: Array<{
    questionNo: number
    appliedScale: number
    drawWidth: number
    drawHeight: number
  }>,
  pdfRows: PipelineDrawLogRow[],
): void {
  if (previewRows.length === 0) {
    console.log('[ScaleDiag] preview_draw_metrics yok — RENDER_PIPELINE_MISMATCH karşılaştırması atlandı')
    return
  }
  const byNo = new Map(previewRows.map((r) => [r.questionNo, r]))
  let mismatches = 0
  for (const pdf of pdfRows) {
    const prev = byNo.get(pdf.questionNo)
    if (!prev) continue
    const scaleDiff = Math.abs(prev.appliedScale - pdf.appliedScale)
    const wDiff = Math.abs(prev.drawWidth - pdf.drawWidth)
    if (scaleDiff > 0.01 || wDiff > 0.5) {
      mismatches += 1
      console.warn(
        `Soru ${pdf.questionNo} | preview applied=${prev.appliedScale.toFixed(4)} | pdf applied=${pdf.appliedScale.toFixed(4)} | RENDER_PIPELINE_MISMATCH`,
      )
    }
  }
  if (mismatches === 0) {
    console.log('[ScaleDiag] CANVAS_PREVIEW ↔ PDF_EXPORT: eşleşme OK (RENDER_PIPELINE_MISMATCH yok)')
  }
}
