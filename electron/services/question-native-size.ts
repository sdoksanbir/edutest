/**
 * Electron: requestedScale + capture native pt (src/utils ile aynı kurallar).
 */

export const LEGACY_LAYOUT_ZOOM = 600 / 72

export type QuestionCaptureMeta = {
  sourcePageWidthPt: number
  sourcePageHeightPt: number
  viewportScale: number
  devicePixelRatio: number
  cropWidthPx: number
  cropHeightPx: number
  cropWidthPt: number
  cropHeightPt: number
  pixelsPerPdfPoint: number
}

function finitePositive(n: unknown): number | null {
  const v = Number(n)
  if (!Number.isFinite(v) || v <= 0) return null
  return v
}

export function resolveRequestedScale(q: Record<string, unknown>): number {
  const manual = finitePositive(q.manualScale) ?? finitePositive(q.manual_scale)
  const norm =
    finitePositive(q.normalizationScale) ?? finitePositive(q.normalization_scale)
  if (manual != null || norm != null) {
    return (manual ?? 1) * (norm ?? 1)
  }
  return finitePositive(q.display_scale) ?? 1
}

export function resolveManualScale(q: Record<string, unknown>): number {
  return finitePositive(q.manualScale) ?? finitePositive(q.manual_scale) ?? 1
}

export function resolveNormalizationScale(q: Record<string, unknown>): number {
  return (
    finitePositive(q.normalizationScale) ??
    finitePositive(q.normalization_scale) ??
    1
  )
}

export function parseCapture(q: Record<string, unknown>): QuestionCaptureMeta | null {
  const c = q.capture as QuestionCaptureMeta | undefined
  if (!c || typeof c !== 'object') return null
  if (!(Number(c.pixelsPerPdfPoint) > 0)) return null
  return c
}

export function nativeSizePtFromQuestion(
  q: Record<string, unknown>,
  imageWidthPx: number,
  imageHeightPx: number,
): {
  nativeWidthPt: number
  nativeHeightPt: number
  pixelsPerPdfPoint: number
  metadataSource: 'capture' | 'legacy-fallback'
  manualScale: number
  normalizationScale: number
  requestedScale: number
} {
  const capture = parseCapture(q)
  const requestedScale = resolveRequestedScale(q)
  const manualScale = resolveManualScale(q)
  const normalizationScale = resolveNormalizationScale(q)

  if (capture) {
    const ppp = capture.pixelsPerPdfPoint
    const wPx = capture.cropWidthPx > 0 ? capture.cropWidthPx : imageWidthPx
    const hPx = capture.cropHeightPx > 0 ? capture.cropHeightPx : imageHeightPx
    const nativeWidthPt =
      capture.cropWidthPt > 0 ? capture.cropWidthPt : wPx / ppp
    let nativeHeightPt =
      capture.cropHeightPt > 0 ? capture.cropHeightPt : hPx / ppp
    if (!(nativeHeightPt > 0) && imageWidthPx > 0 && nativeWidthPt > 0) {
      nativeHeightPt = (imageHeightPx / imageWidthPx) * nativeWidthPt
    }
    if (nativeWidthPt > 0 && nativeHeightPt > 0) {
      return {
        nativeWidthPt,
        nativeHeightPt,
        pixelsPerPdfPoint: ppp,
        metadataSource: 'capture',
        manualScale,
        normalizationScale,
        requestedScale,
      }
    }
  }

  console.log(
    `[CAPTURE_SCALE_METADATA_MISSING] q=${q.order_index ?? '?'} → legacy 600DPI (pt=px/${LEGACY_LAYOUT_ZOOM})`,
  )
  return {
    nativeWidthPt: imageWidthPx / LEGACY_LAYOUT_ZOOM,
    nativeHeightPt: imageHeightPx / LEGACY_LAYOUT_ZOOM,
    pixelsPerPdfPoint: LEGACY_LAYOUT_ZOOM,
    metadataSource: 'legacy-fallback',
    manualScale,
    normalizationScale,
    requestedScale,
  }
}
