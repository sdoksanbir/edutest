/**
 * Offline debug harness: QD geometric core on a screenshot PNG (no DOM/OCR).
 * Usage: node scripts/debug-qd-on-png.mjs <path-to.png>
 */
import fs from 'node:fs'
import sharp from 'sharp'

const MAX_W = 1200
const INK_LUM = 190
const ROI_RATIO = 0.18
const ANCHOR_MIN_GAP = 0.055
const BLOB_MIN_H = 0.004
const BLOB_MAX_H = 0.036

function isNumberColor(r, g, b) {
  const lum = (r + g + b) / 3
  const distWhite = Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2)
  if (distWhite < 28 || lum > 245) return false
  const sat = Math.max(r, g, b) - Math.min(r, g, b)
  if (sat < 18) return false
  if (b > r + 20 && b > g + 8) return false
  return (r >= g + 8 && r >= b - 15) || (r > 90 && b > 70 && g < (r + b) / 2 - 5)
}

function movingAverage(src, r) {
  const n = src.length
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    let s = 0
    let c = 0
    for (let d = -r; d <= r; d++) {
      const j = i + d
      if (j < 0 || j >= n) continue
      s += src[j]
      c++
    }
    out[i] = s / Math.max(1, c)
  }
  return out
}

function detectContent(ink, w, h) {
  const rowInk = new Float32Array(h)
  for (let y = 0; y < h; y++) {
    let s = 0
    const off = y * w
    for (let x = 0; x < w; x++) s += ink[off + x]
    rowInk[y] = s / w
  }
  let contentTop = Math.floor(h * 0.1)
  let y = 0
  let lastHeaderEnd = -1
  const headerMax = Math.floor(h * 0.24)
  while (y < headerMax) {
    while (y < h && rowInk[y] <= 0.008) y++
    if (y >= headerMax) break
    const a = y
    while (y < h && rowInk[y] > 0.008) y++
    const b = y - 1
    let minX = w
    let maxX = 0
    for (let yy = a; yy <= b; yy++) {
      for (let x = 0; x < w; x++) {
        if (!ink[yy * w + x]) continue
        if (x < minX) minX = x
        if (x > maxX) maxX = x
      }
    }
    if ((maxX - minX + 1) / w > 0.52 && a < h * 0.2) lastHeaderEnd = b
    else if (lastHeaderEnd >= 0 && a - lastHeaderEnd > h * 0.006) break
  }
  if (lastHeaderEnd >= 0) {
    contentTop = Math.min(Math.floor(h * 0.22), lastHeaderEnd + Math.max(4, Math.round(h * 0.006)))
  }
  contentTop = Math.max(Math.floor(h * 0.05), Math.min(contentTop, Math.floor(h * 0.22)))

  let contentBottom = Math.floor(h * 0.93)
  y = h - 1
  const footerMin = Math.floor(h * 0.78)
  while (y > footerMin) {
    while (y > 0 && rowInk[y] <= 0.008) y--
    if (y <= footerMin) break
    const b = y
    while (y > 0 && rowInk[y] > 0.008) y--
    const a = y + 1
    const hh = b - a + 1
    let minX = w
    let maxX = 0
    for (let yy = a; yy <= b; yy++) {
      for (let x = 0; x < w; x++) {
        if (!ink[yy * w + x]) continue
        if (x < minX) minX = x
        if (x > maxX) maxX = x
      }
    }
    const span = (maxX - minX + 1) / w
    if (hh < h * 0.07 && span > 0.48 && a > h * 0.8) {
      contentBottom = Math.max(Math.floor(h * 0.75), a - 3)
      continue
    }
    break
  }
  contentBottom = Math.min(h - 1, Math.max(contentBottom, Math.floor(h * 0.75)))
  return { contentTop, contentBottom }
}

function detectColumns(ink, w, contentTop, contentBottom) {
  const bodyH = Math.max(1, contentBottom - contentTop + 1)
  const colScore = new Float32Array(w)
  for (let x = 0; x < w; x++) {
    let s = 0
    for (let y = contentTop; y <= contentBottom; y++) s += ink[y * w + x]
    colScore[x] = s / bodyH
  }
  const smooth = movingAverage(colScore, Math.max(2, Math.round(w * 0.004)))
  let leftSum = 0
  let leftN = 0
  let rightSum = 0
  let rightN = 0
  for (let x = Math.floor(w * 0.05); x < Math.floor(w * 0.38); x++) {
    leftSum += smooth[x]
    leftN++
  }
  for (let x = Math.floor(w * 0.62); x < Math.floor(w * 0.95); x++) {
    rightSum += smooth[x]
    rightN++
  }
  const leftAvg = leftN ? leftSum / leftN : 0
  const rightAvg = rightN ? rightSum / rightN : 0
  const sideAvg = (leftAvg + rightAvg) / 2

  let splitX = -1
  let bestVal = Infinity
  for (let x = Math.floor(w * 0.35); x <= Math.floor(w * 0.55); x++) {
    if (smooth[x] < bestVal) {
      bestVal = smooth[x]
      splitX = x
    }
  }
  // Prefer earliest near-zero valley (gutter) over later empty band
  for (let x = Math.floor(w * 0.35); x <= Math.floor(w * 0.55); x++) {
    if (smooth[x] <= bestVal + 0.002) {
      splitX = x
      break
    }
  }
  if (!(leftAvg > 0.015 && rightAvg > 0.015 && bestVal < sideAvg * 0.7)) {
    if (leftAvg > 0.018 && rightAvg > 0.018) splitX = Math.floor(w * 0.5)
    else return [{ x: 0, width: w, confidence: 0.55, index: 0 }]
  }

  const gap = Math.max(8, Math.round(w * 0.018))
  const leftW = Math.max(1, splitX - Math.floor(gap / 2))
  const rightX = Math.min(w - 1, splitX + Math.ceil(gap / 2))
  return [
    { x: 0, width: leftW, confidence: 0.85, index: 0 },
    { x: rightX, width: Math.max(1, w - rightX), confidence: 0.85, index: 1 },
  ]
}

function columnNumberSearchLeft(numberColorFg, ink, w, col, y0, y1) {
  const bodyH = Math.max(1, y1 - y0 + 1)
  const start = col.x + Math.max(2, Math.round(col.width * 0.02))
  let inkLeft = col.x
  for (let x = start; x < col.x + col.width; x++) {
    let s = 0
    for (let y = y0; y <= y1; y++) s += ink[y * w + x]
    if (s / bodyH > 0.035) {
      inkLeft = x
      break
    }
  }
  const searchStart = col.x + Math.max(2, Math.round(col.width * 0.01))
  const xEnd = Math.min(col.x + col.width, searchStart + Math.round(col.width * 0.4))
  const scores = []
  let bestScore = 0
  for (let x = searchStart; x < xEnd; x++) {
    let s = 0
    for (let y = y0; y <= y1; y++) s += numberColorFg[y * w + x]
    const score = s / bodyH
    scores.push(score)
    if (score > bestScore) bestScore = score
  }
  if (bestScore <= 0.0015) return inkLeft
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] >= bestScore * 0.7) {
      return Math.max(col.x, searchStart + i - Math.max(6, Math.round(col.width * 0.03)))
    }
  }
  return inkLeft
}

function geometric(numberColorFg, ink, w, h, contentTop, contentBottom, columns) {
  const out = []
  const debug = []
  for (const col of columns) {
    const inkLeft = columnNumberSearchLeft(numberColorFg, ink, w, col, contentTop, contentBottom)
    const usableW = Math.max(1, col.x + col.width - inkLeft)
    const stripW = Math.max(12, Math.round(usableW * ROI_RATIO))
    const roiX0 = inkLeft
    const roiX1 = Math.min(col.x + col.width - 1, inkLeft + stripW)
    console.log('ROI', { col: col.index, inkLeft, roiX0, roiX1, stripW })
    const roiW = Math.max(1, roiX1 - roiX0 + 1)
    const leftScore = new Float32Array(h)
    for (let y = contentTop; y <= contentBottom; y++) {
      let left = 0
      const off = y * w
      for (let x = roiX0; x <= roiX1; x++) left += numberColorFg[off + x]
      leftScore[y] = left / roiW
    }
    const thresh = 0.015
    let y = contentTop
    while (y <= contentBottom) {
      while (y <= contentBottom && leftScore[y] <= thresh) y++
      if (y > contentBottom) break
      const a = y
      while (y <= contentBottom && leftScore[y] > thresh) y++
      const b = y - 1
      const hh = b - a + 1
      let minX = roiX1
      let maxX = roiX0
      for (let yy = a; yy <= b; yy++) {
        const off = yy * w
        for (let x = roiX0; x <= roiX1; x++) {
          if (numberColorFg[off + x] !== 1) continue
          if (x < minX) minX = x
          if (x > maxX) maxX = x
        }
      }
      if (maxX < minX) continue
      let reason = ''
      if (hh < Math.max(2, Math.round(h * BLOB_MIN_H))) reason = 'too_short'
      else if (hh > Math.max(28, Math.round(h * BLOB_MAX_H))) reason = 'too_tall'
      else {
        let gap = 0
        for (let yy = a - 1; yy >= contentTop && gap < h * 0.12; yy--) {
          if (leftScore[yy] > 0.008) break
          gap++
        }
        if (gap < Math.max(3, Math.round(h * 0.006)) && a > contentTop + 8) reason = 'no_gap'
      }
      debug.push({ column: col.index, y: a, x: minX, hh, accepted: !reason, reason })
      if (!reason) {
        out.push({
          columnIndex: col.index,
          x: minX,
          y: a,
          width: maxX - minX + 1,
          height: hh,
        })
      }
    }
  }
  const minGap = Math.max(18, Math.round(h * ANCHOR_MIN_GAP))
  const filtered = []
  for (const col of columns) {
    const list = out.filter((a) => a.columnIndex === col.index).sort((a, b) => a.y - b.y)
    if (!list.length) continue
    const medX = [...list].map((a) => a.x).sort((a, b) => a - b)[Math.floor(list.length / 2)]
    for (const a of list) {
      if (Math.abs(a.x - medX) > col.width * 0.12) continue
      const prev = filtered.filter((f) => f.columnIndex === col.index).at(-1)
      if (prev && a.y - prev.y < minGap) continue
      filtered.push(a)
    }
  }
  return { anchors: filtered, debug }
}

const input = process.argv[2]
if (!input || !fs.existsSync(input)) {
  console.error('Usage: node scripts/debug-qd-on-png.mjs <png>')
  process.exit(1)
}

const meta = await sharp(input).metadata()
const scale = Math.min(1, MAX_W / Math.max(1, meta.width))
const w = Math.max(32, Math.round(meta.width * scale))
const h = Math.max(32, Math.round(meta.height * scale))
const { data } = await sharp(input).resize(w, h).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

const ink = new Uint8Array(w * h)
const numberColorFg = new Uint8Array(w * h)
let pinkCount = 0
for (let i = 0, p = 0; i < data.length; i += 4, p++) {
  const r = data[i]
  const g = data[i + 1]
  const b = data[i + 2]
  const lum = (r + g + b) / 3
  ink[p] = lum < INK_LUM ? 1 : 0
  numberColorFg[p] = isNumberColor(r, g, b) ? 1 : 0
  if (numberColorFg[p]) pinkCount++
}

const { contentTop, contentBottom } = detectContent(ink, w, h)
const columns = detectColumns(ink, w, contentTop, contentBottom)
const { anchors, debug } = geometric(numberColorFg, ink, w, h, contentTop, contentBottom, columns)

console.log('=== PAGE ===')
console.table({
  imageWidth: meta.width,
  imageHeight: meta.height,
  analyzeWidth: w,
  analyzeHeight: h,
  contentTop,
  contentBottom,
  detectedColumnCount: columns.length,
  pinkPixels: pinkCount,
})
console.log('=== COLUMNS ===')
console.table(
  columns.map((c) => ({
    index: c.index,
    x: c.x,
    width: c.width,
    leftNorm: +(c.x / w).toFixed(3),
    rightNorm: +((c.x + c.width) / w).toFixed(3),
  })),
)
console.log('=== GEO accepted ===')
console.table(debug.filter((d) => d.accepted))
console.log('=== GEO rejected (sample) ===')
console.table(debug.filter((d) => !d.accepted).slice(0, 25))
console.log('=== ANCHORS ===')
console.table(anchors.map((a, i) => ({ i, ...a, normY: +(a.y / h).toFixed(3) })))
console.log('anchor count', anchors.length)
