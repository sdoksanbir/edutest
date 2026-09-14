import { QD_CONFIG } from './questionDetectionConfig'
import type {
  DetectedColumn,
  DetectedQuestion,
  QuestionAnchor,
} from './questionDetectionTypes'
import type { ContentBand } from './splitColumnBands'
import { tightInkBounds } from './inkMap'

/**
 * Build one question box per whitespace band.
 * Includes question number (left of band). Expands slightly for badges above.
 */
export function buildQuestionsFromBands(
  ink: Uint8Array,
  w: number,
  h: number,
  contentTop: number,
  contentBottom: number,
  columns: DetectedColumn[],
  bands: ContentBand[],
  anchors: QuestionAnchor[],
): DetectedQuestion[] {
  const marginX = Math.max(2, Math.round(w * QD_CONFIG.marginXFrac))
  const marginTop = Math.max(2, Math.round(h * QD_CONFIG.marginTopFrac))
  const marginBottom = Math.max(4, Math.round(h * QD_CONFIG.marginBottomFrac))
  const questions: DetectedQuestion[] = []

  for (const band of bands) {
    const col = columns.find((c) => c.index === band.columnIndex)
    if (!col) continue
    const colX0 = col.x
    const colX1 = col.x + col.width - 1

    // Badge above: small expansion into whitespace / short ink above band
    let top = expandBandTop(ink, w, h, colX0, colX1, band, contentTop, bands)

    const tight = tightInkBounds(ink, w, colX0, colX1, top, band.y1)
    if (!tight) continue

    let x0 = Math.max(colX0, tight.x0 - marginX)
    let y0 = Math.max(contentTop, Math.min(top, tight.y0) - marginTop)
    let x1 = Math.min(colX1, tight.x1 + marginX)
    let y1 = Math.min(contentBottom, tight.y1 + marginBottom)

    // Always keep full band vertically (don't shrink to a single equation line)
    y0 = Math.min(y0, band.y0)
    y1 = Math.max(y1, band.y1)
    // Include leftmost ink in column (question number)
    x0 = colX0
    // But trim empty right if needed — keep at least 70% of column when content is wide
    const minW = Math.round(col.width * 0.55)
    if (x1 - x0 + 1 < minW) x1 = Math.min(colX1, x0 + minW)

    // Clip to column
    x0 = Math.max(colX0, x0)
    x1 = Math.min(colX1, x1)

    if (x1 <= x0 + 8 || y1 <= y0 + 8) continue

    const heightFrac = (y1 - y0 + 1) / h
    const widthFracOfCol = (x1 - x0 + 1) / Math.max(1, col.width)
    if (heightFrac < QD_CONFIG.minQuestionHeightFrac * 0.75) continue
    if (widthFracOfCol < 0.4) continue // reject skinny vertical slices

    const anchor = findAnchorForBand(anchors, band)
    let contentConfidence = 0.55
    if (heightFrac >= QD_CONFIG.minQuestionHeightFrac) contentConfidence += 0.2
    if (widthFracOfCol >= 0.55) contentConfidence += 0.15
    contentConfidence = Math.min(0.95, contentConfidence)

    const anchorConf = anchor?.confidence ?? 0.65
    const finalConfidence = Math.min(0.98, anchorConf * 0.4 + contentConfidence * 0.6)

    let status: DetectedQuestion['status'] = 'rejected'
    if (finalConfidence >= QD_CONFIG.acceptMin) status = 'accepted'
    else if (finalConfidence >= QD_CONFIG.reviewMin) status = 'review'
    // Band-based boxes are usually good enough for review even without OCR
    if (status === 'rejected' && heightFrac >= QD_CONFIG.minQuestionHeightFrac && widthFracOfCol >= 0.5) {
      status = 'review'
    }

    questions.push({
      number: anchor?.number,
      columnIndex: col.index,
      x: x0 / w,
      y: y0 / h,
      width: (x1 - x0 + 1) / w,
      height: (y1 - y0 + 1) / h,
      anchorConfidence: anchorConf,
      contentConfidence,
      finalConfidence: status === 'review' && finalConfidence < QD_CONFIG.reviewMin ? QD_CONFIG.reviewMin : finalConfidence,
      status,
      source: anchor?.source ?? 'geometry',
    })
  }

  return questions
}

function findAnchorForBand(anchors: QuestionAnchor[], band: ContentBand): QuestionAnchor | undefined {
  const inBand = anchors
    .filter(
      (a) =>
        a.columnIndex === band.columnIndex &&
        a.y >= band.y0 - 8 &&
        a.y <= band.y0 + Math.max(20, (band.y1 - band.y0) * 0.25),
    )
    .sort((a, b) => a.y - b.y)
  return inBand[0]
}

function expandBandTop(
  ink: Uint8Array,
  w: number,
  h: number,
  colX0: number,
  colX1: number,
  band: ContentBand,
  contentTop: number,
  allBands: ContentBand[],
): number {
  const prev = allBands
    .filter((b) => b.columnIndex === band.columnIndex && b.y1 < band.y0)
    .sort((a, b) => b.y1 - a.y1)[0]
  const floor = prev ? prev.y1 + 2 : contentTop
  const maxGap = Math.max(6, Math.round(h * QD_CONFIG.topExpandMaxGapFrac))
  const maxH = Math.max(10, Math.round(h * QD_CONFIG.topExpandMaxHeightFrac))

  let y = band.y0 - 1
  let gap = 0
  while (y >= floor && gap < maxGap) {
    let s = 0
    const off = y * w
    for (let x = colX0; x <= colX1; x++) s += ink[off + x]!
    if (s / Math.max(1, colX1 - colX0 + 1) > 0.012) break
    gap++
    y--
  }
  if (y < floor) return band.y0

  let top = y
  let rows = 0
  while (top > floor && rows < maxH) {
    let s = 0
    const off = top * w
    for (let x = colX0; x <= colX1; x++) s += ink[off + x]!
    if (s / Math.max(1, colX1 - colX0 + 1) <= 0.01) {
      // stop after small hole
      break
    }
    // reject page-wide header remnant
    let minX = colX1
    let maxX = colX0
    for (let x = colX0; x <= colX1; x++) {
      if (ink[off + x] !== 1) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
    }
    if ((maxX - minX + 1) / w > 0.55) break
    top--
    rows++
  }
  return Math.max(floor, top)
}
