import { QD_CONFIG } from './questionDetectionConfig'
import type { DetectedColumn, DetectedQuestion, QuestionAnchor } from './questionDetectionTypes'
import { tightInkBounds } from './inkMap'

/**
 * Build question rectangles from anchors.
 * INCLUDES question number. Expands top for related badges.
 * Uses full ink union in candidate region so diagrams are not clipped.
 */
export function buildQuestionRegions(
  ink: Uint8Array,
  w: number,
  h: number,
  contentTop: number,
  contentBottom: number,
  columns: DetectedColumn[],
  anchors: QuestionAnchor[],
): DetectedQuestion[] {
  const questions: DetectedQuestion[] = []
  const gapBeforeNext = Math.max(4, Math.round(h * QD_CONFIG.gapBeforeNextAnchorFrac))
  const marginX = Math.max(2, Math.round(w * QD_CONFIG.marginXFrac))
  const marginTop = Math.max(2, Math.round(h * QD_CONFIG.marginTopFrac))
  const marginBottom = Math.max(3, Math.round(h * QD_CONFIG.marginBottomFrac))

  for (const col of columns) {
    const colAnchors = anchors
      .filter((a) => a.columnIndex === col.index)
      .sort((a, b) => a.y - b.y)
    if (colAnchors.length === 0) continue

    const colX0 = col.x
    const colX1 = col.x + col.width - 1

    for (let i = 0; i < colAnchors.length; i++) {
      const anchor = colAnchors[i]!
      const next = colAnchors[i + 1]
      const candY0 = anchor.y
      const candY1 = next
        ? Math.max(candY0 + 1, next.y - gapBeforeNext)
        : contentBottom

      // Question-top expansion: badges above number
      let top = expandQuestionTop(ink, w, h, colX0, colX1, anchor, contentTop, colAnchors[i - 1], candY0)

      // Ink refine inside anchor→nextAnchor span ONLY (does not create new questions)
      const tight = tightInkBounds(ink, w, colX0, colX1, top, candY1)
      if (!tight) continue

      // finalLeft = min(anchor.left, content.left) - margin  (number MUST be inside)
      let x0 = Math.min(anchor.x, tight.x0) - marginX
      let y0 = Math.max(contentTop, Math.min(top, tight.y0, anchor.y) - marginTop)
      let x1 = Math.min(colX1, Math.max(tight.x1, anchor.x + anchor.width) + marginX)
      let y1 = Math.min(
        contentBottom,
        Math.max(tight.y1, findLastInkRow(ink, w, colX0, colX1, top, candY1)) + marginBottom,
      )

      x0 = Math.max(colX0, x0)
      x1 = Math.min(colX1, x1)

      // Span floor: keep nearly full candidate height so Q doesn't shrink to one equation line
      const spanH = candY1 - top + 1
      if (y1 - y0 + 1 < spanH * 0.75) {
        y0 = top
        y1 = candY1
      }

      if (next) {
        y1 = Math.min(y1, next.y - Math.max(2, Math.round(h * 0.004)))
      }

      if (x1 <= x0 + 4 || y1 <= y0 + 4) continue

      const heightFrac = (y1 - y0 + 1) / h
      const widthFracOfCol = (x1 - x0 + 1) / Math.max(1, col.width)
      let contentConfidence = 0.55
      if (heightFrac >= QD_CONFIG.minQuestionHeightFrac) contentConfidence += 0.2
      if (widthFracOfCol >= QD_CONFIG.minQuestionWidthFracOfCol) contentConfidence += 0.15
      contentConfidence = Math.min(0.98, contentConfidence)

      const finalConfidence = Math.min(
        0.99,
        anchor.confidence * 0.55 + contentConfidence * 0.45,
      )

      let status: DetectedQuestion['status'] = 'rejected'
      if (finalConfidence >= QD_CONFIG.acceptMin) status = 'accepted'
      else if (finalConfidence >= QD_CONFIG.reviewMin) status = 'review'
      // Valid anchor + reasonable span → at least review
      if (status === 'rejected' && anchor.number != null && heightFrac >= 0.05 && widthFracOfCol >= 0.45) {
        status = 'review'
      }
      if (heightFrac < 0.035 || widthFracOfCol < 0.35) status = 'rejected'

      if (status === 'rejected') continue

      questions.push({
        number: anchor.number,
        columnIndex: col.index,
        x: x0 / w,
        y: y0 / h,
        width: (x1 - x0 + 1) / w,
        height: (y1 - y0 + 1) / h,
        anchorConfidence: anchor.confidence,
        contentConfidence,
        finalConfidence: Math.max(finalConfidence, status === 'review' ? QD_CONFIG.reviewMin : finalConfidence),
        status,
        source: anchor.source,
      })
    }
  }

  // One question per anchor (already), drop duplicate overlaps
  return dedupeOnePerAnchor(questions)
}

function dedupeOnePerAnchor(questions: DetectedQuestion[]): DetectedQuestion[] {
  const byKey = new Map<string, DetectedQuestion>()
  for (const q of questions) {
    const key = `${q.columnIndex}:${q.number ?? q.y.toFixed(3)}`
    const prev = byKey.get(key)
    if (!prev || q.finalConfidence > prev.finalConfidence) byKey.set(key, q)
  }
  return [...byKey.values()]
}

function findLastInkRow(
  ink: Uint8Array,
  w: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): number {
  const colW = Math.max(1, x1 - x0 + 1)
  let last = y0
  for (let y = y0; y <= y1; y++) {
    let s = 0
    const off = y * w
    for (let x = x0; x <= x1; x++) s += ink[off + x]!
    if (s / colW > 0.01) last = y
  }
  return last
}

/**
 * Expand upward for "Çıkmış Soru" / ÖSYM style badges above the number.
 */
function expandQuestionTop(
  ink: Uint8Array,
  w: number,
  h: number,
  colX0: number,
  colX1: number,
  anchor: QuestionAnchor,
  contentTop: number,
  prevAnchor: QuestionAnchor | undefined,
  defaultTop: number,
): number {
  const maxGap = Math.max(6, Math.round(h * QD_CONFIG.topExpandMaxGapFrac))
  const maxH = Math.max(10, Math.round(h * QD_CONFIG.topExpandMaxHeightFrac))
  const floor = prevAnchor
    ? Math.max(contentTop, prevAnchor.y + prevAnchor.height + 2)
    : contentTop

  let y = anchor.y - 1
  let gap = 0
  // Skip small whitespace above number
  while (y >= floor && gap < maxGap) {
    let s = 0
    const off = y * w
    for (let x = colX0; x <= colX1; x++) s += ink[off + x]!
    if (s / Math.max(1, colX1 - colX0 + 1) > 0.012) break
    gap++
    y--
  }
  if (y < floor) return defaultTop

  // Collect ink band above
  const bandBottom = y
  let bandTop = y
  let rows = 0
  while (bandTop > floor && rows < maxH) {
    let s = 0
    const off = bandTop * w
    for (let x = colX0; x <= colX1; x++) s += ink[off + x]!
    if (s / Math.max(1, colX1 - colX0 + 1) <= 0.01) {
      // allow tiny holes
      let hole = 0
      let yy = bandTop - 1
      while (yy > floor && hole < 3) {
        let s2 = 0
        const off2 = yy * w
        for (let x = colX0; x <= colX1; x++) s2 += ink[off2 + x]!
        if (s2 / Math.max(1, colX1 - colX0 + 1) > 0.01) break
        hole++
        yy--
      }
      if (hole >= 3) break
    }
    bandTop--
    rows++
  }
  bandTop = Math.max(floor, bandTop)

  if (bandBottom - bandTop < 3) return defaultTop

  // Horizontal overlap with question body / number zone
  let minX = colX1
  let maxX = colX0
  for (let yy = bandTop; yy <= bandBottom; yy++) {
    const off = yy * w
    for (let x = colX0; x <= colX1; x++) {
      if (ink[off + x] !== 1) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
    }
  }
  const bandMid = (minX + maxX) / 2
  const qLeft = anchor.x
  const qRight = Math.min(colX1, anchor.x + Math.round((colX1 - colX0) * 0.7))
  const overlap =
    Math.max(0, Math.min(maxX, qRight) - Math.max(minX, qLeft)) /
    Math.max(1, maxX - minX + 1)
  // Badge often spans near left of column
  const nearLeft = (bandMid - colX0) / Math.max(1, colX1 - colX0) < 0.55
  if (overlap < QD_CONFIG.topExpandMinOverlapX && !nearLeft) return defaultTop

  // Reject if looks like full-width header remnant
  if ((maxX - minX + 1) / w > 0.55) return defaultTop

  return bandTop
}
