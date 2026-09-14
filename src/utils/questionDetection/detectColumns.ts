import { QD_CONFIG } from './questionDetectionConfig'
import type { DetectedColumn } from './questionDetectionTypes'
import { colInkProjection, movingAverage } from './inkMap'

/**
 * Vertical ink projection → 1–3 columns with gutter rejection (logo/separator out).
 */
export function detectColumns(
  ink: Uint8Array,
  w: number,
  h: number,
  contentTop: number,
  contentBottom: number,
): DetectedColumn[] {
  const colScore = colInkProjection(ink, w, contentTop, contentBottom)
  const smooth = movingAverage(colScore, Math.max(2, Math.round(w * 0.004)))
  const mid0 = Math.floor(w * QD_CONFIG.columnMidBandLeft)
  const mid1 = Math.floor(w * QD_CONFIG.columnMidBandRight)

  let leftSum = 0
  let leftN = 0
  let rightSum = 0
  let rightN = 0
  for (let x = Math.floor(w * 0.05); x < Math.floor(w * 0.38); x++) {
    leftSum += smooth[x]!
    leftN++
  }
  for (let x = Math.floor(w * 0.62); x < Math.floor(w * 0.95); x++) {
    rightSum += smooth[x]!
    rightN++
  }
  const leftAvg = leftN ? leftSum / leftN : 0
  const rightAvg = rightN ? rightSum / rightN : 0
  const sideAvg = (leftAvg + rightAvg) / 2

  // Vertical rule (peak) or valley
  let splitX = -1
  let bestPeak = 0
  for (let x = mid0; x <= mid1; x++) {
    const v = colScore[x]!
    const nbor = (smooth[Math.max(0, x - 4)]! + smooth[Math.min(w - 1, x + 4)]!) / 2
    if (v >= 0.14 && v > nbor * 1.4) {
      const score = v - nbor
      if (score > bestPeak) {
        bestPeak = score
        splitX = x
      }
    }
  }

  if (splitX < 0) {
    let bestVal = Infinity
    let valleyX = -1
    for (let x = mid0; x <= mid1; x++) {
      if (smooth[x]! < bestVal) {
        bestVal = smooth[x]!
        valleyX = x
      }
    }
    if (valleyX > 0 && sideAvg > 0.015 && bestVal < sideAvg * 0.5) {
      splitX = valleyX
    }
  }

  if (splitX < 0) {
    if (leftAvg > 0.018 && rightAvg > 0.018) splitX = Math.floor(w * 0.5)
    else {
      return [{ x: 0, width: w, confidence: 0.55, index: 0 }]
    }
  }

  // Prefer mid-page valley for classic 2-col (gutter), avoid locking on side chrome
  if (leftAvg > 0.015 && rightAvg > 0.015) {
    let bestVal = Infinity
    let valleyX = splitX
    const c0 = Math.floor(w * 0.35)
    const c1 = Math.floor(w * 0.55)
    for (let x = c0; x <= c1; x++) {
      if (smooth[x]! < bestVal) {
        bestVal = smooth[x]!
        valleyX = x
      }
    }
    if (bestVal < sideAvg * 0.7) {
      // Prefer earliest near-min valley (true gutter) over later empty bands
      for (let x = c0; x <= c1; x++) {
        if (smooth[x]! <= bestVal + 0.002) {
          splitX = x
          break
        }
      }
    } else if (Math.abs(splitX - Math.floor(w * 0.5)) > w * 0.12) {
      splitX = Math.floor(w * 0.5)
    }
  }

  // Validate both sides have content
  let lInk = 0
  let rInk = 0
  for (let x = 0; x < splitX; x++) lInk += colScore[x]!
  for (let x = splitX + 1; x < w; x++) rInk += colScore[x]!
  const lMean = lInk / Math.max(1, splitX)
  const rMean = rInk / Math.max(1, w - splitX - 1)
  if (lMean < QD_CONFIG.columnMinSideInk || rMean < QD_CONFIG.columnMinSideInk) {
    return [{ x: 0, width: w, confidence: 0.5, index: 0 }]
  }

  // Narrow gutter so right-column number strip is not eaten
  const gap = Math.max(8, Math.round(w * Math.min(QD_CONFIG.columnGutterMinFrac, 0.018)))
  const leftW = Math.max(1, splitX - Math.floor(gap / 2))
  const rightX = Math.min(w - 1, splitX + Math.ceil(gap / 2))
  const rightW = Math.max(1, w - rightX)

  return [
    { x: 0, width: leftW, confidence: 0.85, index: 0 },
    { x: rightX, width: rightW, confidence: 0.85, index: 1 },
  ]
}
