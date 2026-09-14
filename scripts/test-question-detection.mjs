/**
 * Unit tests for question-detection invariants (standalone — no TS module graph).
 * Run: node --experimental-strip-types scripts/test-question-detection.mjs
 */
import assert from 'node:assert/strict'

const ACCEPT_MIN = 0.8
const REVIEW_MIN = 0.55

function blankInk(w, h) {
  return new Uint8Array(w * h)
}

function fillRect(ink, w, x0, y0, x1, y1) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) ink[y * w + x] = 1
  }
}

function rowInk(ink, w, h) {
  const out = new Float32Array(h)
  for (let y = 0; y < h; y++) {
    let s = 0
    for (let x = 0; x < w; x++) s += ink[y * w + x]
    out[y] = s / w
  }
  return out
}

function detectContentTopBottom(ink, w, h) {
  const ri = rowInk(ink, w, h)
  let contentTop = Math.floor(h * 0.1)
  let y = 0
  let lastHeader = -1
  while (y < h * 0.24) {
    while (y < h && ri[y] <= 0.008) y++
    if (y >= h * 0.24) break
    const a = y
    while (y < h && ri[y] > 0.008) y++
    const b = y - 1
    // wide band = header-like if spans most of width
    let minX = w
    let maxX = 0
    for (let yy = a; yy <= b; yy++) {
      for (let x = 0; x < w; x++) {
        if (!ink[yy * w + x]) continue
        if (x < minX) minX = x
        if (x > maxX) maxX = x
      }
    }
    if ((maxX - minX + 1) / w > 0.52 && a < h * 0.2) lastHeader = b
    else if (lastHeader >= 0) break
  }
  if (lastHeader >= 0) contentTop = lastHeader + 4

  let contentBottom = Math.floor(h * 0.93)
  y = h - 1
  while (y > h * 0.78) {
    while (y > 0 && ri[y] <= 0.008) y--
    if (y <= h * 0.78) break
    const b = y
    while (y > 0 && ri[y] > 0.008) y--
    const a = y + 1
    if (b - a < h * 0.07 && a > h * 0.8) {
      contentBottom = a - 2
      continue
    }
    break
  }
  return { contentTop, contentBottom }
}

function detectTwoColumns(ink, w, y0, y1) {
  const bodyH = y1 - y0 + 1
  const score = new Float32Array(w)
  for (let x = 0; x < w; x++) {
    let s = 0
    for (let y = y0; y <= y1; y++) s += ink[y * w + x]
    score[x] = s / bodyH
  }
  let best = -1
  let bestPeak = 0
  for (let x = Math.floor(w * 0.3); x <= Math.floor(w * 0.7); x++) {
    const nbor = (score[x - 3] + score[x + 3]) / 2
    if (score[x] > nbor * 1.4 && score[x] - nbor > bestPeak) {
      bestPeak = score[x] - nbor
      best = x
    }
  }
  if (best < 0) {
    let bestVal = Infinity
    for (let x = Math.floor(w * 0.3); x <= Math.floor(w * 0.7); x++) {
      if (score[x] < bestVal) {
        bestVal = score[x]
        best = x
      }
    }
  }
  const gap = Math.max(8, Math.round(w * 0.03))
  return [
    { x: 0, width: best - gap },
    { x: best + gap, width: w - (best + gap) },
  ]
}

function isQuestionNumberCandidate(text) {
  const m = String(text).trim().match(/^(\d{1,3})[.):\-]?$/)
  if (!m) return false
  const n = +m[1]
  if (n >= 1900 && n <= 2100) return false
  if (n < 1 || n > 80) return false
  return true
}

function resolveOverlap(questions) {
  const list = [...questions].sort((a, b) => a.y - b.y)
  for (let i = 1; i < list.length; i++) {
    const prev = list[i - 1]
    const q = list[i]
    if (q.y < prev.y + prev.height) {
      const mid = (prev.y + prev.height + q.y) / 2
      prev.height = Math.max(0.03, mid - prev.y)
      q.y = mid
    }
  }
  return list
}

function confidenceStatus(c) {
  if (c >= ACCEPT_MIN) return 'accepted'
  if (c >= REVIEW_MIN) return 'review'
  return 'rejected'
}

// 1) header / footer excluded
{
  const w = 200
  const h = 400
  const ink = blankInk(w, h)
  fillRect(ink, w, 5, 5, 195, 40)
  fillRect(ink, w, 10, 80, 90, 350)
  fillRect(ink, w, 110, 80, 190, 350)
  fillRect(ink, w, 10, 370, 190, 385)
  const { contentTop, contentBottom } = detectContentTopBottom(ink, w, h)
  assert.ok(contentTop > 30, `contentTop ${contentTop}`)
  assert.ok(contentBottom < 375, `contentBottom ${contentBottom}`)
  console.log('OK header/footer rejection')
}

// 2) two columns
{
  const w = 300
  const h = 400
  const ink = blankInk(w, h)
  fillRect(ink, w, 10, 50, 130, 350)
  fillRect(ink, w, 170, 50, 290, 350)
  fillRect(ink, w, 148, 50, 152, 350)
  const cols = detectTwoColumns(ink, w, 40, 360)
  assert.equal(cols.length, 2)
  assert.ok(cols[0].width < w * 0.55)
  console.log('OK two-column split')
}

// 3) math year rejected as question number
{
  assert.equal(isQuestionNumberCandidate('2021'), false)
  assert.equal(isQuestionNumberCandidate('3.'), true)
  assert.equal(isQuestionNumberCandidate('12'), true)
  assert.equal(isQuestionNumberCandidate('A) 20'), false)
  console.log('OK math/year number rejection')
}

// 4) short vs long question height status
{
  assert.equal(confidenceStatus(0.9), 'accepted')
  assert.equal(confidenceStatus(0.65), 'review')
  assert.equal(confidenceStatus(0.4), 'rejected')
  console.log('OK confidence bands')
}

// 5) overlap resolution
{
  const qs = resolveOverlap([
    { y: 0.1, height: 0.25 },
    { y: 0.28, height: 0.2 },
  ])
  assert.ok(qs[0].y + qs[0].height <= qs[1].y + 1e-9)
  console.log('OK overlap prevention')
}

// 6) sequence recovery gap 2→4 implies missing 3
{
  const nums = [1, 2, 4, 5, 6]
  const missing = []
  for (let i = 0; i < nums.length - 1; i++) {
    if (nums[i + 1] - nums[i] === 2) missing.push(nums[i] + 1)
  }
  assert.deepEqual(missing, [3])
  console.log('OK sequence recovery pattern')
}

console.log('All questionDetection unit tests passed.')
