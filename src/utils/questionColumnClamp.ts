/**
 * Tek sütun genişlik clamp + sütun sınır teşhisi (saf matematik).
 * Electron question-draw-metrics ile aynı kurallar.
 */

export const IMG_COL_RIGHT_PAD_PT = 2

/** Tek sütun: maxAllowedW her zaman availW (1.1 GROW kaldırıldı). */
export function resolveSingleColumnMaxAllowedW(
  singleAvailW: number,
  _allowSlightOverflow: boolean = false,
): number {
  if (!(singleAvailW > 0)) return Number.POSITIVE_INFINITY
  return singleAvailW
}

export function clampSingleColumnDrawWidth(
  nativeWidthPt: number,
  requestedScale: number,
  singleAvailW: number,
  allowSlightOverflow: boolean = false,
): { drawWidth: number; maxAllowedW: number; appliedScale: number } {
  const maxAllowedW = resolveSingleColumnMaxAllowedW(singleAvailW, allowSlightOverflow)
  let drawWidth = nativeWidthPt * Math.max(0.01, requestedScale)
  if (Number.isFinite(maxAllowedW) && drawWidth > maxAllowedW) drawWidth = maxAllowedW
  const appliedScale = nativeWidthPt > 0 ? drawWidth / nativeWidthPt : requestedScale
  return { drawWidth, maxAllowedW, appliedScale }
}

/**
 * availW = colW - numTextW - imageGap - rightPad - numOffset
 * (görsel X → güvenli sağ kenar net genişliği)
 */
export function computeImageAvailWPt(opts: {
  colW: number
  numTextWPt: number
  numImageGapPt: number
  numOffsetPt?: number
  rightPaddingPt?: number
}): number {
  const rightPad = opts.rightPaddingPt ?? IMG_COL_RIGHT_PAD_PT
  const numOffset = opts.numOffsetPt ?? 0
  return opts.colW - opts.numTextWPt - opts.numImageGapPt - rightPad - numOffset
}

export function computeColumnImageBounds(opts: {
  columnXPt: number
  columnContentWidthPt: number
  rightPaddingPt?: number
  imageXPt: number
  drawWidthPt: number
}): {
  columnLeftPt: number
  columnRightPt: number
  imageXPt: number
  safeRightPt: number
  drawRightPt: number
  overflowPt: number
  columnBoundsValid: boolean
} {
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
