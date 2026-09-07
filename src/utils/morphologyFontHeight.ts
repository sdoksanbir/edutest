/**
 * OpenCV morphology lab port — connected-component body glyph height.
 * Browser/Electron canvas only; no native OpenCV binding.
 */

export type MorphologyFontEstimate = {
  canonicalPx: number
  sampleCount: number
  spreadMin: number
  spreadMax: number
  componentCount: number
  filteredCount: number
}

export type MorphologyFontFailure =
  | 'image-unreadable'
  | 'insufficient-components'
  | 'insufficient-after-filter'

function otsuThreshold(gray: Uint8ClampedArray): number {
  const hist = new Array<number>(256).fill(0)
  for (let i = 0; i < gray.length; i++) hist[gray[i]!]!++
  const total = gray.length
  let sum = 0
  for (let t = 0; t < 256; t++) sum += t * hist[t]!
  let sumB = 0
  let wB = 0
  let maxVar = -1
  let threshold = 127
  for (let t = 0; t < 256; t++) {
    wB += hist[t]!
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break
    sumB += t * hist[t]!
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const between = wB * wF * (mB - mF) * (mB - mF)
    if (between > maxVar) {
      maxVar = between
      threshold = t
    }
  }
  return threshold
}

type BlobStat = { w: number; h: number; area: number }

/** 8-connected components on binary ink (1 = ink). Skips background label. */
function connectedComponentStats(binary: Uint8Array, width: number, height: number): BlobStat[] {
  const labels = new Int32Array(width * height)
  const stats: BlobStat[] = []
  let nextLabel = 1
  const qx: number[] = []
  const qy: number[] = []

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (binary[idx] !== 1 || labels[idx] !== 0) continue
      const label = nextLabel++
      let minX = x
      let maxX = x
      let minY = y
      let maxY = y
      let area = 0
      qx.length = 0
      qy.length = 0
      qx.push(x)
      qy.push(y)
      labels[idx] = label
      while (qx.length > 0) {
        const cx = qx.pop()!
        const cy = qy.pop()!
        area++
        if (cx < minX) minX = cx
        if (cx > maxX) maxX = cx
        if (cy < minY) minY = cy
        if (cy > maxY) maxY = cy
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            const nx = cx + dx
            const ny = cy + dy
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
            const nidx = ny * width + nx
            if (binary[nidx] !== 1 || labels[nidx] !== 0) continue
            labels[nidx] = label
            qx.push(nx)
            qy.push(ny)
          }
        }
      }
      stats.push({
        w: maxX - minX + 1,
        h: maxY - minY + 1,
        area,
      })
    }
  }
  return stats
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0
  const idx = Math.max(
    0,
    Math.min(sortedAsc.length - 1, Math.round(((sortedAsc.length - 1) * p) / 100)),
  )
  return sortedAsc[idx]!
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!
}

/** RGBA ImageData → body-text canonical height in px (lab morphology). */
export function estimateCanonicalFontHeightFromRgba(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): { ok: true; value: MorphologyFontEstimate } | { ok: false; reason: MorphologyFontFailure } {
  if (width < 8 || height < 8 || data.length < width * height * 4) {
    return { ok: false, reason: 'image-unreadable' }
  }

  const gray = new Uint8ClampedArray(width * height)
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    const a = data[p + 3]! / 255
    const r = data[p]!
    const g = data[p + 1]!
    const b = data[p + 2]!
    // Premultiply onto white so transparent = paper
    const rr = r * a + 255 * (1 - a)
    const gg = g * a + 255 * (1 - a)
    const bb = b * a + 255 * (1 - a)
    gray[i] = Math.round(0.299 * rr + 0.587 * gg + 0.114 * bb)
  }

  const thr = otsuThreshold(gray)
  const binary = new Uint8Array(width * height)
  for (let i = 0; i < gray.length; i++) {
    // THRESH_BINARY_INV: dark ink → 1
    binary[i] = gray[i]! < thr ? 1 : 0
  }

  const comps = connectedComponentStats(binary, width, height)
  if (comps.length < 5) {
    return { ok: false, reason: 'insufficient-components' }
  }

  const filtered = comps.filter(
    (c) =>
      c.h >= 8 &&
      c.h <= 80 &&
      c.w >= 3 &&
      c.w <= 120 &&
      c.area >= 20 &&
      c.w / c.h < 3.0 &&
      c.h / c.w < 3.5,
  )
  if (filtered.length < 5) {
    return { ok: false, reason: 'insufficient-after-filter' }
  }

  const heights = filtered.map((c) => c.h)
  const sorted = [...heights].sort((a, b) => a - b)
  const q25 = percentile(sorted, 25)
  const q75 = percentile(sorted, 75)
  const iqr = q75 - q25
  const lower = Math.max(8, q25 - 1.0 * iqr)
  const upper = q75 + 1.0 * iqr
  let body = heights.filter((h) => h >= lower && h <= upper)
  if (body.length === 0) body = heights

  return {
    ok: true,
    value: {
      canonicalPx: Math.round(median(body) * 10) / 10,
      sampleCount: body.length,
      spreadMin: Math.min(...body),
      spreadMax: Math.max(...body),
      componentCount: comps.length,
      filteredCount: filtered.length,
    },
  }
}

export function questionImageToDataUrl(imageBase64: string): string {
  const s = imageBase64.trim()
  if (s.startsWith('data:')) return s
  return `data:image/png;base64,${s}`
}

export async function loadImageDataFromBase64(imageBase64: string): Promise<ImageData | null> {
  const url = questionImageToDataUrl(imageBase64)
  const img = await new Promise<HTMLImageElement | null>((resolve) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => resolve(null)
    el.src = url
  })
  if (!img || img.naturalWidth < 1 || img.naturalHeight < 1) return null
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(img, 0, 0)
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

export const FONT_EQUALIZE_SCALE_MIN = 0.4
export const FONT_EQUALIZE_SCALE_MAX = 1.5

export function clampFontEqualizeScale(scale: number): number {
  if (!Number.isFinite(scale) || scale <= 0) return 1
  return Math.min(FONT_EQUALIZE_SCALE_MAX, Math.max(FONT_EQUALIZE_SCALE_MIN, scale))
}
