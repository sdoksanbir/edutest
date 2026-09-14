import { QD_CONFIG } from './questionDetectionConfig'
import type { DetectedColumn, QuestionAnchor } from './questionDetectionTypes'
import {
  columnNumberSearchLeft,
  columnNumberRoi,
  countHorizontalBlobs,
  rowSpanRatio,
} from './inkMap'

export type GeometricCandidateDebug = {
  x: number
  y: number
  width: number
  height: number
  column: number
  geometryScore: number
  accepted: boolean
  rejectReason: string
  pixelX: number
  pixelY: number
  normX: number
  normY: number
}

/**
 * Geometric anchors ONLY inside each column's LEFT number ROI.
 * Uses numberColorFg (pink/magenta) — never black math strokes.
 */
export function detectGeometricAnchors(
  numberColorFg: Uint8Array,
  contentInk: Uint8Array,
  w: number,
  h: number,
  contentTop: number,
  contentBottom: number,
  columns: DetectedColumn[],
): { anchors: QuestionAnchor[]; debug: GeometricCandidateDebug[] } {
  const debug: GeometricCandidateDebug[] = []
  const out: QuestionAnchor[] = []
  const roiRatio = QD_CONFIG.questionNumberRoiRatio

  for (const col of columns) {
    const inkLeft = columnNumberSearchLeft(
      numberColorFg,
      contentInk,
      w,
      col,
      contentTop,
      contentBottom,
    )
    const { x0: roiX0, x1: roiX1 } = columnNumberRoi(col, roiRatio, inkLeft)
    const colX0 = col.x
    const colX1 = col.x + col.width - 1
    const colW = Math.max(1, col.width)
    const roiW = Math.max(1, roiX1 - roiX0 + 1)

    const leftScore = new Float32Array(h)
    for (let y = contentTop; y <= contentBottom; y++) {
      let left = 0
      const off = y * w
      for (let x = roiX0; x <= roiX1; x++) left += numberColorFg[off + x]!
      leftScore[y] = left / roiW
    }

    const thresh = 0.015
    let y = contentTop
    while (y <= contentBottom) {
      while (y <= contentBottom && leftScore[y]! <= thresh) y++
      if (y > contentBottom) break
      const a = y
      while (y <= contentBottom && leftScore[y]! > thresh) y++
      const b = y - 1
      const hh = b - a + 1

      const pushReject = (reason: string, minX: number, maxX: number) => {
        debug.push({
          x: minX,
          y: a,
          width: Math.max(1, maxX - minX + 1),
          height: hh,
          column: col.index,
          geometryScore: 0,
          accepted: false,
          rejectReason: reason,
          pixelX: minX,
          pixelY: a,
          normX: minX / w,
          normY: a / h,
        })
      }

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
      if (maxX < minX) {
        pushReject('empty_blob', roiX0, roiX1)
        continue
      }

      if (hh < Math.max(2, Math.round(h * QD_CONFIG.numberBlobMinH))) {
        pushReject('too_short', minX, maxX)
        continue
      }
      if (hh > Math.max(28, Math.round(h * QD_CONFIG.numberBlobMaxH))) {
        pushReject('too_tall_math_stack', minX, maxX)
        continue
      }

      // Footer / answer-key strip — never an anchor
      if (a > contentBottom - Math.max(20, Math.round(h * 0.04))) {
        pushReject('near_footer', minX, maxX)
        continue
      }

      let gap = 0
      for (let yy = a - 1; yy >= contentTop && gap < h * 0.12; yy--) {
        if (leftScore[yy]! > 0.008) break
        gap++
      }
      const minGap = Math.max(3, Math.round(h * 0.006))
      if (gap < minGap && a > contentTop + 8) {
        pushReject('no_number_gap_above', minX, maxX)
        continue
      }

      const relX = (minX - inkLeft) / Math.max(1, colX1 - inkLeft + 1)
      if (relX > roiRatio * 1.15) {
        pushReject('not_left_aligned', minX, maxX)
        continue
      }

      const blobW = maxX - minX + 1
      if (blobW > colW * QD_CONFIG.numberBlobMaxWFracOfCol) {
        pushReject('blob_too_wide', minX, maxX)
        continue
      }

      const span = rowSpanRatio(contentInk, w, colX0, colX1, a, b)
      if (span > 0.55) {
        pushReject('choice_row_span', minX, maxX)
        continue
      }
      const blobs = countHorizontalBlobs(contentInk, w, colX0, colX1, a, Math.min(b, a + 4))
      if (blobs >= 3 && span > 0.35) {
        pushReject('multi_choice_blobs', minX, maxX)
        continue
      }

      let rightContent = 0
      for (let yy = a; yy <= Math.min(contentBottom, b + Math.round(h * 0.025)); yy++) {
        let sum = 0
        const off = yy * w
        for (let x = roiX1 + 1; x <= colX1; x++) sum += contentInk[off + x]!
        if (sum / Math.max(1, colX1 - roiX1) > 0.02) {
          rightContent = 1
          break
        }
      }
      if (!rightContent) {
        pushReject('no_right_content', minX, maxX)
        continue
      }

      const leftProx = 1 - Math.min(1, relX / Math.max(0.01, roiRatio))
      const geometryScore =
        leftProx * 0.65 + rightContent * 0.2 + Math.min(1, gap / (h * 0.03)) * 0.15
      if (geometryScore < 0.35) {
        pushReject('low_geometry_score', minX, maxX)
        continue
      }

      debug.push({
        x: minX,
        y: a,
        width: blobW,
        height: hh,
        column: col.index,
        geometryScore,
        accepted: true,
        rejectReason: '',
        pixelX: minX,
        pixelY: a,
        normX: minX / w,
        normY: a / h,
      })

      out.push({
        y: a,
        x: minX,
        width: blobW,
        height: hh,
        columnIndex: col.index,
        confidence: geometryScore * 0.8,
        source: 'geometry',
        geometryScore,
      })
    }
  }

  const minGap = Math.max(18, Math.round(h * QD_CONFIG.anchorMinGapFrac))
  const filtered: QuestionAnchor[] = []
  for (const col of columns) {
    const list = out.filter((a) => a.columnIndex === col.index).sort((a, b) => a.y - b.y)
    if (list.length === 0) continue
    const medX =
      [...list].map((a) => a.x).sort((a, b) => a - b)[Math.floor(list.length / 2)] ?? list[0]!.x
    for (const a of list) {
      if (Math.abs(a.x - medX) > col.width * 0.12) {
        debug.push({
          x: a.x,
          y: a.y,
          width: a.width,
          height: a.height,
          column: col.index,
          geometryScore: a.geometryScore ?? 0,
          accepted: false,
          rejectReason: 'x_misaligned',
          pixelX: a.x,
          pixelY: a.y,
          normX: a.x / w,
          normY: a.y / h,
        })
        continue
      }
      const prev = filtered.filter((f) => f.columnIndex === col.index).at(-1)
      if (prev && a.y - prev.y < minGap) {
        if (a.confidence > prev.confidence) {
          filtered[filtered.indexOf(prev)] = a
        }
        continue
      }
      filtered.push(a)
    }
  }

  return { anchors: filtered, debug }
}
