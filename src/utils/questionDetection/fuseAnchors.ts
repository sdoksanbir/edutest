import { QD_CONFIG } from './questionDetectionConfig'
import type { DetectedColumn, QuestionAnchor } from './questionDetectionTypes'

function medianX(anchors: QuestionAnchor[]): number {
  if (anchors.length === 0) return 0
  const xs = anchors.map((a) => a.x).sort((a, b) => a - b)
  return xs[Math.floor(xs.length / 2)]!
}

/**
 * Merge OCR + geometric anchors, score, assign numbers, sequence-recover gaps.
 * Strongly prefers left-aligned X-consistent candidates; rejects mid-column junk.
 */
export function fuseAnchors(
  geometric: QuestionAnchor[],
  ocr: QuestionAnchor[],
  columns: DetectedColumn[],
  h: number,
  ink: Uint8Array,
  w: number,
): QuestionAnchor[] {
  const minGap = Math.max(14, Math.round(h * QD_CONFIG.anchorMinGapFrac))
  const perColumn: QuestionAnchor[][] = []

  for (const col of columns) {
    const geo = geometric.filter((a) => a.columnIndex === col.index)
    const ocrs = ocr.filter((a) => a.columnIndex === col.index)
    const pool: QuestionAnchor[] = [...geo, ...ocrs].sort((a, b) => a.y - b.y)

    const clusters: QuestionAnchor[][] = []
    for (const a of pool) {
      const last = clusters[clusters.length - 1]
      if (last && a.y - last[0]!.y < minGap * 0.7) last.push(a)
      else clusters.push([a])
    }

    const colAnchors: QuestionAnchor[] = []
    for (const cluster of clusters) {
      const hasOcr = cluster.find((c) => c.source === 'ocr' || c.number != null)
      const hasGeo = cluster.find((c) => c.source === 'geometry')
      const bestOcr = cluster
        .filter((c) => c.number != null)
        .sort((a, b) => (b.ocrConfidence ?? 0) - (a.ocrConfidence ?? 0))[0]
      const bestGeo = cluster
        .filter((c) => c.source === 'geometry')
        .sort((a, b) => (b.geometryScore ?? 0) - (a.geometryScore ?? 0))[0]

      const base = bestOcr ?? bestGeo ?? cluster[0]!
      const number = bestOcr?.number
      const leftProx = 1 - Math.min(1, (base.x - col.x) / Math.max(1, col.width * 0.22))
      // Mid/right of column → crush confidence
      const relX = (base.x - col.x) / Math.max(1, col.width)
      if (relX > QD_CONFIG.questionNumberRoiRatio * 1.15 && !bestOcr) {
        continue
      }

      let rightContent = 0.5
      {
        const sx1 = Math.min(col.x + col.width - 1, base.x + base.width + 4)
        let sum = 0
        let n = 0
        for (let yy = base.y; yy <= base.y + base.height + 4 && yy < h; yy++) {
          const off = yy * w
          for (let x = sx1; x < col.x + col.width; x++) {
            sum += ink[off + x]!
            n++
          }
        }
        rightContent = n && sum / n > 0.015 ? 1 : 0.2
      }

      let source: QuestionAnchor['source'] = 'geometry'
      if (hasOcr && hasGeo) source = 'ocr+geometry'
      else if (hasOcr) source = 'ocr'

      const ocrScore = bestOcr?.ocrConfidence ?? 0
      const geoScore = bestGeo?.geometryScore ?? leftProx
      const conf =
        leftProx * QD_CONFIG.score.leftProximity +
        rightContent * QD_CONFIG.score.rightContent +
        geoScore * QD_CONFIG.score.geometry +
        ocrScore * QD_CONFIG.score.ocr +
        0.1

      colAnchors.push({
        ...base,
        number,
        confidence: Math.min(0.98, conf * (relX > 0.2 ? 0.35 : 1)),
        source,
        ocrText: bestOcr?.ocrText,
        ocrConfidence: bestOcr?.ocrConfidence,
        geometryScore: geoScore,
      })
    }

    colAnchors.sort((a, b) => a.y - b.y)
    const withSeq = assignAndRecoverSequence(colAnchors, col, h, ink, w, minGap)
    perColumn.push(withSeq)
  }

  // Optional global continuity: col0 max+1 ≈ col1 min
  applyCrossColumnContinuity(perColumn)

  return perColumn.flat().sort((a, b) =>
    a.columnIndex !== b.columnIndex ? a.columnIndex - b.columnIndex : a.y - b.y,
  )
}

function applyCrossColumnContinuity(perColumn: QuestionAnchor[][]) {
  if (perColumn.length < 2) return
  const left = perColumn[0]!
  const right = perColumn[1]!
  if (left.length === 0 || right.length === 0) return
  const leftNums = left.map((a) => a.number).filter((n): n is number => n != null)
  const rightNums = right.map((a) => a.number).filter((n): n is number => n != null)
  if (leftNums.length === 0 || rightNums.length === 0) return
  const maxL = Math.max(...leftNums)
  const minR = Math.min(...rightNums)
  if (minR === maxL + 1) {
    for (const a of left) a.confidence = Math.min(0.99, a.confidence + 0.08)
    for (const a of right) a.confidence = Math.min(0.99, a.confidence + 0.08)
    for (const a of [...left, ...right]) {
      a.sequenceScore = Math.max(a.sequenceScore ?? 0, 0.95)
    }
  }
}

function assignAndRecoverSequence(
  anchors: QuestionAnchor[],
  col: DetectedColumn,
  h: number,
  ink: Uint8Array,
  w: number,
  minGap: number,
): QuestionAnchor[] {
  if (anchors.length === 0) return []

  // Strong X-alignment filter
  const med = medianX(anchors)
  let list = anchors.filter((a) => Math.abs(a.x - med) < col.width * 0.1)
  if (list.length === 0) list = anchors.filter((a) => Math.abs(a.x - med) < col.width * 0.18)
  if (list.length === 0) list = anchors

  // Boost anchors near median X
  list = list.map((a) => {
    const align = 1 - Math.min(1, Math.abs(a.x - med) / Math.max(1, col.width * 0.1))
    return {
      ...a,
      confidence: Math.min(0.99, a.confidence + align * 0.12),
      sequenceScore: a.sequenceScore,
    }
  })

  const ocrNums = list.map((a) => a.number).filter((n): n is number => n != null)
  let startNum = 1
  if (ocrNums.length > 0) {
    startNum = Math.min(...ocrNums)
  }

  // Reject nonsense sequences (e.g. many duplicate OCR numbers)
  const uniqueOcr = new Set(ocrNums)
  if (ocrNums.length >= 3 && uniqueOcr.size === 1) {
    // All same number — trust geometry order, reassign sequentially
    list = list.map((a) => ({ ...a, number: undefined }))
  }

  let expected = startNum
  const numbered: QuestionAnchor[] = []
  for (let i = 0; i < list.length; i++) {
    const a = list[i]!
    if (a.number != null) {
      // If OCR jumps wildly vs expected, demote
      const jump = Math.abs(a.number - expected)
      if (jump > 2 && numbered.length > 0) {
        numbered.push({
          ...a,
          number: expected,
          sequenceScore: 0.45,
          confidence: Math.min(0.75, a.confidence),
        })
      } else {
        numbered.push({
          ...a,
          sequenceScore: 1,
          confidence: Math.min(0.99, a.confidence + 0.12),
        })
        expected = a.number + 1
        continue
      }
      expected++
    } else {
      numbered.push({
        ...a,
        number: expected,
        sequenceScore: 0.7,
        confidence: Math.min(0.95, a.confidence + 0.05),
      })
      expected++
    }
  }

  // Recover missing numbers between OCR-confirmed anchors
  const recovered: QuestionAnchor[] = []
  for (let i = 0; i < numbered.length; i++) {
    recovered.push(numbered[i]!)
    if (i + 1 >= numbered.length) continue
    const cur = numbered[i]!
    const next = numbered[i + 1]!
    if (cur.number == null || next.number == null) continue
    const gap = next.number - cur.number
    if (gap !== 2) continue
    const yMid0 = cur.y + cur.height + Math.round(minGap * 0.5)
    const yMid1 = next.y - Math.round(minGap * 0.5)
    if (yMid1 - yMid0 < minGap * 0.6) continue
    const stripW = Math.max(
      QD_CONFIG.numberStripMinPx,
      Math.round(col.width * QD_CONFIG.questionNumberRoiRatio),
    )
    const sx1 = col.x + stripW
    let bestY = -1
    let bestScore = 0
    for (let y = yMid0; y < yMid1; y++) {
      let left = 0
      const off = y * w
      for (let x = col.x; x <= sx1; x++) left += ink[off + x]!
      const score = left / (stripW + 1)
      if (score > 0.05 && score > bestScore) {
        bestScore = score
        bestY = y
      }
    }
    if (bestY < 0) continue
    recovered.push({
      number: cur.number + 1,
      x: med,
      y: bestY,
      width: Math.round(col.width * 0.08),
      height: Math.max(8, Math.round(h * 0.012)),
      columnIndex: col.index,
      confidence: 0.62,
      source: 'sequence-recovered',
      sequenceScore: 0.85,
      geometryScore: 0.6,
    })
  }

  recovered.sort((a, b) => a.y - b.y)

  // Sequence consistency: prefer monotonic consecutive runs
  const seen = new Set<number>()
  const final: QuestionAnchor[] = []
  for (const a of recovered) {
    const n = a.number
    if (n != null && seen.has(n)) continue
    if (n != null) seen.add(n)
    final.push(a)
  }

  // If sequence looks like noise (non-monotonic wild jumps), keep only left-aligned top-N by Y with sequential renumber from min OCR or 1
  const nums = final.map((a) => a.number).filter((n): n is number => n != null)
  let crazy = false
  for (let i = 1; i < nums.length; i++) {
    if (nums[i]! < nums[i - 1]!) crazy = true
    if (nums[i]! - nums[i - 1]! > 3) crazy = true
  }
  if (crazy && final.length >= 2) {
    const start = ocrNums.length ? Math.min(...ocrNums) : 1
    return final.map((a, i) => ({
      ...a,
      number: start + i,
      sequenceScore: 0.55,
      confidence: Math.min(0.85, a.confidence),
    }))
  }

  return final
}
