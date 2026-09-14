import { QD_CONFIG } from './questionDetectionConfig'

export type InkMap = {
  ink: Uint8Array
  /** Dark ink OR saturated color — legacy/debug */
  anchorFg: Uint8Array
  /** Colored question-number pixels ONLY (pink/magenta) — geometric ROI search */
  numberColorFg: Uint8Array
  w: number
  h: number
}

/** True if pixel looks like a colored question number (pink/magenta/red), not black body ink. */
export function isQuestionNumberColorPixel(r: number, g: number, b: number): boolean {
  const lum = (r + g + b) / 3
  const distWhite = Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2)
  if (distWhite < 28 || lum > 245) return false
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const sat = max - min
  if (sat < 18) return false
  // Exclude strong blue/cyan (selection overlays, teal banners)
  if (b > r + 20 && b > g + 8) return false
  // Pink / magenta / red (Mikro-style) — allow mild anti-alias
  const isReddish = r >= g + 8 && r >= b - 15
  const isMagenta = r > 90 && b > 70 && g < (r + b) / 2 - 5
  return isReddish || isMagenta
}

/** Dark ink OR colored number — used only for optional debug; geometric search uses color map. */
export function isAnchorForegroundPixel(r: number, g: number, b: number): boolean {
  const lum = (r + g + b) / 3
  if (lum < QD_CONFIG.inkLuminanceThreshold) return true
  return isQuestionNumberColorPixel(r, g, b)
}

/** Downscale image → content ink + anchor foreground. */
export function imageToInkMap(
  img: HTMLImageElement,
  maxAnalyzeWidth = QD_CONFIG.maxAnalyzeWidth,
): InkMap & { rgba: Uint8ClampedArray } {
  const nw = img.naturalWidth || img.width
  const nh = img.naturalHeight || img.height
  const scale = Math.min(1, maxAnalyzeWidth / Math.max(1, nw))
  const w = Math.max(32, Math.round(nw * scale))
  const h = Math.max(32, Math.round(nh * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    return {
      ink: new Uint8Array(w * h),
      anchorFg: new Uint8Array(w * h),
      numberColorFg: new Uint8Array(w * h),
      w,
      h,
      rgba: new Uint8ClampedArray(w * h * 4),
    }
  }
  ctx.drawImage(img, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)
  const ink = new Uint8Array(w * h)
  const anchorFg = new Uint8Array(w * h)
  const numberColorFg = new Uint8Array(w * h)
  const thr = QD_CONFIG.inkLuminanceThreshold
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i]!
    const g = data[i + 1]!
    const b = data[i + 2]!
    const lum = (r + g + b) / 3
    ink[p] = lum < thr ? 1 : 0
    const colored = isQuestionNumberColorPixel(r, g, b)
    numberColorFg[p] = colored ? 1 : 0
    anchorFg[p] = ink[p] || colored ? 1 : 0
  }
  return { ink, anchorFg, numberColorFg, w, h, rgba: data }
}

export function rowInkProjection(ink: Uint8Array, w: number, h: number, x0: number, x1: number): Float32Array {
  const colW = Math.max(1, x1 - x0 + 1)
  const out = new Float32Array(h)
  for (let y = 0; y < h; y++) {
    let s = 0
    const off = y * w
    for (let x = x0; x <= x1; x++) s += ink[off + x]!
    out[y] = s / colW
  }
  return out
}

export function colInkProjection(
  ink: Uint8Array,
  w: number,
  y0: number,
  y1: number,
): Float32Array {
  const bodyH = Math.max(1, y1 - y0 + 1)
  const out = new Float32Array(w)
  for (let x = 0; x < w; x++) {
    let s = 0
    for (let y = y0; y <= y1; y++) s += ink[y * w + x]!
    out[x] = s / bodyH
  }
  return out
}

export function movingAverage(src: Float32Array, r: number): Float32Array {
  const n = src.length
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    let s = 0
    let c = 0
    for (let d = -r; d <= r; d++) {
      const j = i + d
      if (j < 0 || j >= n) continue
      s += src[j]!
      c++
    }
    out[i] = s / Math.max(1, c)
  }
  return out
}

export function tightInkBounds(
  ink: Uint8Array,
  w: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): { x0: number; x1: number; y0: number; y1: number } | null {
  let minX = x1
  let maxX = x0
  let minY = y1
  let maxY = y0
  let found = false
  for (let y = y0; y <= y1; y++) {
    const off = y * w
    for (let x = x0; x <= x1; x++) {
      if (ink[off + x] !== 1) continue
      found = true
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (!found) return null
  return { x0: minX, x1: maxX, y0: minY, y1: maxY }
}

export function rowSpanRatio(
  ink: Uint8Array,
  w: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): number {
  let minX = x1
  let maxX = x0
  let found = false
  for (let y = y0; y <= y1; y++) {
    const off = y * w
    for (let x = x0; x <= x1; x++) {
      if (ink[off + x] !== 1) continue
      found = true
      if (x < minX) minX = x
      if (x > maxX) maxX = x
    }
  }
  if (!found) return 0
  return (maxX - minX + 1) / Math.max(1, x1 - x0 + 1)
}

export function countHorizontalBlobs(
  ink: Uint8Array,
  w: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): number {
  const colW = Math.max(1, x1 - x0 + 1)
  const col = new Uint8Array(colW)
  for (let y = y0; y <= y1; y++) {
    const off = y * w
    for (let x = x0; x <= x1; x++) {
      if (ink[off + x] === 1) col[x - x0] = 1
    }
  }
  let blobs = 0
  let inBlob = false
  for (let i = 0; i < colW; i++) {
    if (col[i]) {
      if (!inBlob) {
        blobs++
        inBlob = true
      }
    } else inBlob = false
  }
  return blobs
}

export function cropRgbaToCanvas(
  rgba: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): HTMLCanvasElement {
  const cw = Math.max(1, x1 - x0 + 1)
  const ch = Math.max(1, y1 - y0 + 1)
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const img = ctx.createImageData(cw, ch)
  for (let y = 0; y < ch; y++) {
    const sy = y0 + y
    if (sy < 0 || sy >= srcH) continue
    for (let x = 0; x < cw; x++) {
      const sx = x0 + x
      if (sx < 0 || sx >= srcW) continue
      const si = (sy * srcW + sx) * 4
      const di = (y * cw + x) * 4
      img.data[di] = rgba[si]!
      img.data[di + 1] = rgba[si + 1]!
      img.data[di + 2] = rgba[si + 2]!
      img.data[di + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

/** Left question-number ROI for a column (analysis pixels).
 * Starts at first ink/content edge inside the column (skips empty page margin).
 */
export function columnNumberRoi(
  col: { x: number; width: number },
  ratio = QD_CONFIG.questionNumberRoiRatio,
  contentLeftX?: number,
): { x0: number; x1: number } {
  const left = contentLeftX != null ? Math.max(col.x, contentLeftX) : col.x
  const usableW = Math.max(1, col.x + col.width - left)
  const stripW = Math.max(QD_CONFIG.numberStripMinPx, Math.round(usableW * ratio))
  return { x0: left, x1: Math.min(col.x + col.width - 1, left + stripW) }
}

/** First X with meaningful ink inside a column (skips thin edge chrome). */
export function columnInkLeft(
  ink: Uint8Array,
  w: number,
  col: { x: number; width: number },
  y0: number,
  y1: number,
): number {
  const bodyH = Math.max(1, y1 - y0 + 1)
  const xEnd = col.x + col.width
  // Ignore outermost ~2% of column (page edge / decorative stripe)
  const start = col.x + Math.max(2, Math.round(col.width * 0.02))
  for (let x = start; x < xEnd; x++) {
    let s = 0
    for (let y = y0; y <= y1; y++) s += ink[y * w + x]!
    if (s / bodyH > 0.035) return x
  }
  return col.x
}

/**
 * Preferred left edge for question-number ROI:
 * pink/magenta ridge in the left portion of the column, else ink left.
 */
export function columnNumberSearchLeft(
  numberColorFg: Uint8Array,
  ink: Uint8Array,
  w: number,
  col: { x: number; width: number },
  y0: number,
  y1: number,
): number {
  const bodyH = Math.max(1, y1 - y0 + 1)
  const inkLeft = columnInkLeft(ink, w, col, y0, y1)
  const searchStart = col.x + Math.max(2, Math.round(col.width * 0.01))
  const xEnd = Math.min(col.x + col.width, searchStart + Math.round(col.width * 0.4))
  const scores = new Float32Array(Math.max(0, xEnd - searchStart))
  let bestScore = 0
  for (let x = searchStart; x < xEnd; x++) {
    let s = 0
    for (let y = y0; y <= y1; y++) s += numberColorFg[y * w + x]!
    const score = s / bodyH
    scores[x - searchStart] = score
    if (score > bestScore) bestScore = score
  }
  if (bestScore <= 0.0015) return inkLeft
  // Leftmost x within 70% of peak (true number column, not mid-column pink noise)
  for (let i = 0; i < scores.length; i++) {
    if (scores[i]! >= bestScore * 0.7) {
      const peakX = searchStart + i
      return Math.max(col.x, peakX - Math.max(6, Math.round(col.width * 0.03)))
    }
  }
  return inkLeft
}
