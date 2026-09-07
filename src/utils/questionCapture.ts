/**
 * PDF.js kırpma yakalama metadata — fiziksel pt hesabı için.
 * devicePixelRatio: crop export canvas’ı CSS değil PDF viewport pikseli kullanır → genelde 1.
 */

export type QuestionCaptureMeta = {
  sourcePageWidthPt: number
  sourcePageHeightPt: number
  viewportScale: number
  devicePixelRatio: number
  cropWidthPx: number
  cropHeightPx: number
  cropWidthPt: number
  cropHeightPt: number
  /** canvasPx / PDF pt (viewportScale * devicePixelRatio) */
  pixelsPerPdfPoint: number
}

export const LEGACY_LAYOUT_ZOOM = 600 / 72

export type NativeSizePtResult = {
  nativeWidthPt: number
  nativeHeightPt: number
  pixelsPerPdfPoint: number
  metadataSource: 'capture' | 'legacy-fallback'
}

export type CaptureSyncDiagnostics = {
  questionId: string
  naturalWidth: number
  naturalHeight: number
  cropWidthPx: number
  cropHeightPx: number
  cropWidthPt: number
  cropHeightPt: number
  pixelsPerPdfPoint: number
  pppFromWidth: number
  pppFromHeight: number
  captureSyncOk: boolean
}

export function pixelsPerPdfPointFromViewport(
  viewportScale: number,
  devicePixelRatio: number = 1,
): number {
  const vs = Number(viewportScale)
  const dpr = Number(devicePixelRatio)
  if (!(vs > 0)) return LEGACY_LAYOUT_ZOOM
  return vs * (dpr > 0 ? dpr : 1)
}

export function buildQuestionCaptureMeta(opts: {
  sourcePageWidthPt: number
  sourcePageHeightPt: number
  viewportScale: number
  devicePixelRatio?: number
  cropNorm: { x: number; y: number; width: number; height: number }
  /** Render edilmiş sayfa canvas boyutları (px) */
  pageWidthPx: number
  pageHeightPx: number
}): QuestionCaptureMeta {
  const dpr = opts.devicePixelRatio ?? 1
  const ppp = pixelsPerPdfPointFromViewport(opts.viewportScale, dpr)
  const cropWidthPx = Math.max(1, Math.floor(opts.cropNorm.width * opts.pageWidthPx))
  const cropHeightPx = Math.max(1, Math.floor(opts.cropNorm.height * opts.pageHeightPx))
  const cropWidthPt = opts.cropNorm.width * opts.sourcePageWidthPt
  const cropHeightPt = opts.cropNorm.height * opts.sourcePageHeightPt
  return {
    sourcePageWidthPt: opts.sourcePageWidthPt,
    sourcePageHeightPt: opts.sourcePageHeightPt,
    viewportScale: opts.viewportScale,
    devicePixelRatio: dpr,
    cropWidthPx,
    cropHeightPx,
    cropWidthPt,
    cropHeightPt,
    pixelsPerPdfPoint: ppp,
  }
}

/** Yeni crop bitmap boyutlarını mevcut PDF ölçeğiyle atomik capture metadata'ya çevirir. */
export function syncQuestionCaptureToBitmap(
  capture: QuestionCaptureMeta,
  naturalWidth: number,
  naturalHeight: number,
): QuestionCaptureMeta {
  const width = Math.max(1, Math.floor(naturalWidth))
  const height = Math.max(1, Math.floor(naturalHeight))
  const ppp = Number(capture.pixelsPerPdfPoint)
  if (!(ppp > 0)) return capture
  return {
    ...capture,
    cropWidthPx: width,
    cropHeightPx: height,
    cropWidthPt: width / ppp,
    cropHeightPt: height / ppp,
  }
}

export function inspectQuestionCaptureSync(
  questionId: string,
  capture: QuestionCaptureMeta,
  naturalWidth: number,
  naturalHeight: number,
  tolerance = 1e-6,
): CaptureSyncDiagnostics {
  const pppFromWidth =
    capture.cropWidthPt > 0 ? naturalWidth / capture.cropWidthPt : 0
  const pppFromHeight =
    capture.cropHeightPt > 0 ? naturalHeight / capture.cropHeightPt : 0
  const captureSyncOk =
    capture.cropWidthPx === naturalWidth &&
    capture.cropHeightPx === naturalHeight &&
    Math.abs(pppFromWidth - capture.pixelsPerPdfPoint) <= tolerance &&
    Math.abs(pppFromHeight - capture.pixelsPerPdfPoint) <= tolerance
  return {
    questionId,
    naturalWidth,
    naturalHeight,
    cropWidthPx: capture.cropWidthPx,
    cropHeightPx: capture.cropHeightPx,
    cropWidthPt: capture.cropWidthPt,
    cropHeightPt: capture.cropHeightPt,
    pixelsPerPdfPoint: capture.pixelsPerPdfPoint,
    pppFromWidth,
    pppFromHeight,
    captureSyncOk,
  }
}

export function nativeSizePtFromCapture(
  capture: QuestionCaptureMeta | null | undefined,
  imageWidthPx: number,
  imageHeightPx: number,
  logMissingForOrder?: number | string,
): NativeSizePtResult {
  const c = capture
  const ppp = c?.pixelsPerPdfPoint
  if (c && typeof ppp === 'number' && ppp > 0) {
    const wPx = c.cropWidthPx > 0 ? c.cropWidthPx : imageWidthPx
    const hPx = c.cropHeightPx > 0 ? c.cropHeightPx : imageHeightPx
    const nativeWidthPt =
      c.cropWidthPt > 0 ? c.cropWidthPt : wPx / ppp
    const nativeHeightPt =
      c.cropHeightPt > 0 ? c.cropHeightPt : hPx / ppp
    if (nativeWidthPt > 0 && nativeHeightPt > 0) {
      return {
        nativeWidthPt,
        nativeHeightPt,
        pixelsPerPdfPoint: ppp,
        metadataSource: 'capture',
      }
    }
  }

  if (logMissingForOrder != null) {
    console.log(
      `[CAPTURE_SCALE_METADATA_MISSING] q=${logMissingForOrder} → legacy 600DPI (pt=px/${LEGACY_LAYOUT_ZOOM})`,
    )
  }
  return {
    nativeWidthPt: imageWidthPx / LEGACY_LAYOUT_ZOOM,
    nativeHeightPt: imageHeightPx / LEGACY_LAYOUT_ZOOM,
    pixelsPerPdfPoint: LEGACY_LAYOUT_ZOOM,
    metadataSource: 'legacy-fallback',
  }
}
