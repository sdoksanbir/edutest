import { QD_CONFIG } from './questionDetectionConfig'
import type { DetectedColumn } from './questionDetectionTypes'
import { rowSpanRatio } from './inkMap'

export type ContentBand = {
  y0: number
  y1: number
  columnIndex: number
}

/**
 * Primary segmentation: split each column by LARGE whitespace gaps.
 * Internal math line-gaps are merged; inter-question gaps become cuts.
 * This avoids treating equation strokes as question-number anchors.
 */
export function splitColumnsIntoQuestionBands(
  ink: Uint8Array,
  w: number,
  h: number,
  contentTop: number,
  contentBottom: number,
  columns: DetectedColumn[],
): ContentBand[] {
  const bands: ContentBand[] = []
  // Merge gaps inside a question (shape ↔ text ↔ choices)
  const mergeGap = Math.max(14, Math.round(h * 0.028))
  // Split only on larger gaps between questions
  const splitGap = Math.max(mergeGap + 10, Math.round(h * 0.048))

  for (const col of columns) {
    const x0 = col.x
    const x1 = col.x + col.width - 1
    const colW = Math.max(1, col.width)
    const rowScore = new Float32Array(h)
    for (let y = contentTop; y <= contentBottom; y++) {
      let s = 0
      const off = y * w
      for (let x = x0; x <= x1; x++) s += ink[off + x]!
      rowScore[y] = s / colW
    }

    const raw: Array<{ y0: number; y1: number }> = []
    let y = contentTop
    while (y <= contentBottom) {
      while (y <= contentBottom && rowScore[y]! <= 0.012) y++
      if (y > contentBottom) break
      const a = y
      while (y <= contentBottom && rowScore[y]! > 0.012) y++
      raw.push({ y0: a, y1: y - 1 })
    }
    if (raw.length === 0) continue

    const merged: Array<{ y0: number; y1: number }> = []
    let acc = raw[0]!
    for (let i = 1; i < raw.length; i++) {
      const cur = raw[i]!
      const gap = cur.y0 - acc.y1 - 1
      const curH = cur.y1 - cur.y0 + 1
      const span = rowSpanRatio(ink, w, x0, x1, cur.y0, cur.y1)
      const looksLikeChoices =
        curH < h * 0.07 && (span > 0.4 || curH < h * 0.045)

      if (gap <= mergeGap || looksLikeChoices) {
        acc = { y0: acc.y0, y1: cur.y1 }
      } else if (gap >= splitGap) {
        merged.push(acc)
        acc = { ...cur }
      } else {
        // Ambiguous gap: merge if either block is still short (same question)
        const accH = acc.y1 - acc.y0 + 1
        if (accH < h * 0.1 || curH < h * 0.08) {
          acc = { y0: acc.y0, y1: cur.y1 }
        } else {
          merged.push(acc)
          acc = { ...cur }
        }
      }
    }
    merged.push(acc)

    // If still one giant band, force-split on largest gaps
    const colBands =
      merged.length === 1 && (merged[0]!.y1 - merged[0]!.y0) / h > 0.45
        ? forceSplitByLargestGaps(rowScore, merged[0]!, h, splitGap)
        : merged

    for (const b of colBands) {
      const hh = b.y1 - b.y0 + 1
      if (hh < h * QD_CONFIG.minQuestionHeightFrac * 0.7) continue
      if (hh > h * QD_CONFIG.maxQuestionHeightFrac) {
        // Still too tall — force split once more
        const parts = forceSplitByLargestGaps(rowScore, b, h, Math.max(10, Math.round(h * 0.035)))
        for (const p of parts) {
          if (p.y1 - p.y0 + 1 >= h * QD_CONFIG.minQuestionHeightFrac * 0.7) {
            bands.push({ y0: p.y0, y1: p.y1, columnIndex: col.index })
          }
        }
      } else {
        bands.push({ y0: b.y0, y1: b.y1, columnIndex: col.index })
      }
    }
  }

  return bands.sort((a, b) =>
    a.columnIndex !== b.columnIndex ? a.columnIndex - b.columnIndex : a.y0 - b.y0,
  )
}

function forceSplitByLargestGaps(
  rowScore: Float32Array,
  seg: { y0: number; y1: number },
  h: number,
  minGap: number,
): Array<{ y0: number; y1: number }> {
  const gaps: Array<{ y: number; len: number }> = []
  let y = seg.y0
  while (y <= seg.y1) {
    if (rowScore[y]! > 0.012) {
      y++
      continue
    }
    const a = y
    while (y <= seg.y1 && rowScore[y]! <= 0.012) y++
    const len = y - a
    if (len >= minGap) gaps.push({ y: a + Math.floor(len / 2), len })
  }
  gaps.sort((a, b) => b.len - a.len)
  // Aim for ~2–4 questions → take top 2–3 cuts
  const cuts = gaps
    .slice(0, 3)
    .map((g) => g.y)
    .sort((a, b) => a - b)
  if (cuts.length === 0) return [seg]

  const parts: Array<{ y0: number; y1: number }> = []
  let start = seg.y0
  for (const cut of cuts) {
    if (cut - start >= h * 0.05) {
      parts.push({ y0: start, y1: cut - 1 })
      start = cut
    }
  }
  if (seg.y1 - start >= h * 0.05) parts.push({ y0: start, y1: seg.y1 })
  return parts.length >= 2 ? parts : [seg]
}
