import { QD_CONFIG } from './questionDetectionConfig'
import { rowInkProjection, rowSpanRatio } from './inkMap'

/** Find contentTop / contentBottom in analysis pixels (exclude header/footer/answer key). */
export function detectContentArea(
  ink: Uint8Array,
  w: number,
  h: number,
): { contentTop: number; contentBottom: number } {
  const rowInk = rowInkProjection(ink, w, h, 0, w - 1)
  const rowSpan = new Float32Array(h)
  for (let y = 0; y < h; y++) {
    rowSpan[y] = rowSpanRatio(ink, w, 0, w - 1, y, y)
  }

  let contentTop = Math.floor(h * 0.1)
  let y = 0
  let lastHeaderEnd = -1
  const headerMax = Math.floor(h * QD_CONFIG.headerScanMax)
  while (y < headerMax) {
    while (y < h && rowInk[y]! <= 0.008) y++
    if (y >= headerMax) break
    const a = y
    while (y < h && rowInk[y]! > 0.008) y++
    const b = y - 1
    const mid = Math.floor((a + b) / 2)
    if (rowSpan[mid]! > 0.52 && a < h * 0.2) lastHeaderEnd = b
    else if (lastHeaderEnd >= 0 && a - lastHeaderEnd > h * 0.006) break
  }
  if (lastHeaderEnd >= 0) {
    contentTop = Math.min(
      Math.floor(h * QD_CONFIG.maxContentTop),
      lastHeaderEnd + Math.max(4, Math.round(h * 0.006)),
    )
  }
  contentTop = Math.max(
    Math.floor(h * QD_CONFIG.minContentTop),
    Math.min(contentTop, Math.floor(h * QD_CONFIG.maxContentTop)),
  )

  let contentBottom = Math.floor(h * 0.93)
  y = h - 1
  const footerMin = Math.floor(h * QD_CONFIG.footerScanMin)
  while (y > footerMin) {
    while (y > 0 && rowInk[y]! <= 0.008) y--
    if (y <= footerMin) break
    const b = y
    while (y > 0 && rowInk[y]! > 0.008) y--
    const a = y + 1
    const hh = b - a + 1
    const mid = Math.floor((a + b) / 2)
    // Short wide band near bottom = answer key / footer
    if (hh < h * 0.07 && rowSpan[mid]! > 0.48 && a > h * 0.8) {
      contentBottom = Math.max(Math.floor(h * QD_CONFIG.minContentBottom), a - 3)
      continue
    }
    break
  }
  contentBottom = Math.min(h - 1, Math.max(contentBottom, Math.floor(h * QD_CONFIG.minContentBottom)))

  return { contentTop, contentBottom }
}
