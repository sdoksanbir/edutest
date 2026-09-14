import { QD_CONFIG } from './questionDetectionConfig'
import type { DetectedColumn, QuestionAnchor } from './questionDetectionTypes'
import { columnNumberSearchLeft, columnNumberRoi, cropRgbaToCanvas } from './inkMap'
import { getOcrWorker } from './ocrWorker'

export type OcrCandidateDebug = {
  text: string
  parsedNumber: number | null
  x: number
  y: number
  width: number
  height: number
  column: number
  ocrConfidence: number
  accepted: boolean
  rejectReason: string
  pixelX: number
  pixelY: number
  normX: number
  normY: number
}

const NUM_RE = /^\s*(\d{1,3})\s*[.):\-–]?\s*$/

/**
 * OCR ONLY left number ROI of each column. Failures return empty (no crash).
 */
export async function detectOcrAnchors(
  rgba: Uint8ClampedArray,
  ink: Uint8Array,
  numberColorFg: Uint8Array,
  w: number,
  h: number,
  contentTop: number,
  contentBottom: number,
  columns: DetectedColumn[],
): Promise<{
  hits: QuestionAnchor[]
  debug: OcrCandidateDebug[]
  meta: { workerOk: boolean; rawTexts: string[] }
}> {
  const debug: OcrCandidateDebug[] = []
  const rawTexts: string[] = []
  try {
    console.log('[QUESTION DETECTION OCR] requesting worker…')
    const worker = await getOcrWorker()
    if (!worker) {
      console.warn('[QUESTION DETECTION OCR] worker unavailable')
      return { hits: [], debug, meta: { workerOk: false, rawTexts } }
    }
    console.log('[QUESTION DETECTION OCR] worker ready')

    const hits: QuestionAnchor[] = []
    for (const col of columns) {
      const inkLeft = columnNumberSearchLeft(
        numberColorFg,
        ink,
        w,
        col,
        contentTop,
        contentBottom,
      )
      const { x0, x1 } = columnNumberRoi(col, QD_CONFIG.questionNumberRoiRatio, inkLeft)
      const y0 = contentTop
      const y1 = contentBottom
      console.log('[QUESTION DETECTION OCR] ROI', {
        column: col.index,
        inkLeft,
        x0,
        x1,
        y0,
        y1,
        width: x1 - x0 + 1,
        height: y1 - y0 + 1,
      })

      const canvas = cropRgbaToCanvas(rgba, w, h, x0, y0, x1, y1)
      const scale = 2
      const big = document.createElement('canvas')
      big.width = canvas.width * scale
      big.height = canvas.height * scale
      const bctx = big.getContext('2d')
      if (!bctx) continue
      bctx.imageSmoothingEnabled = false
      bctx.drawImage(canvas, 0, 0, big.width, big.height)

      const result = await worker.recognize(big)
      const raw = (result.data.text || '').trim()
      rawTexts.push(`col${col.index}: ${raw}`)
      console.log('[QUESTION DETECTION OCR] raw text col', col.index, raw)

      const words = result.data.words ?? []
      for (const word of words) {
        const text = (word.text || '').trim()
        const conf = typeof word.confidence === 'number' ? word.confidence : 0
        const bx0 = x0 + Math.round((word.bbox?.x0 ?? 0) / scale)
        const by0 = y0 + Math.round((word.bbox?.y0 ?? 0) / scale)
        const bx1 = x0 + Math.round((word.bbox?.x1 ?? 0) / scale)
        const by1 = y0 + Math.round((word.bbox?.y1 ?? 0) / scale)
        const base = {
          text,
          x: bx0,
          y: by0,
          width: Math.max(1, bx1 - bx0),
          height: Math.max(1, by1 - by0),
          column: col.index,
          ocrConfidence: conf / 100,
          pixelX: bx0,
          pixelY: by0,
          normX: bx0 / w,
          normY: by0 / h,
        }

        const m = text.match(NUM_RE)
        if (!m) {
          debug.push({
            ...base,
            parsedNumber: null,
            accepted: false,
            rejectReason: 'not_number_pattern',
          })
          continue
        }
        if (conf < QD_CONFIG.ocrMinConfidence) {
          debug.push({
            ...base,
            parsedNumber: parseInt(m[1]!, 10),
            accepted: false,
            rejectReason: 'low_ocr_confidence',
          })
          continue
        }
        const num = parseInt(m[1]!, 10)
        if (!Number.isFinite(num) || num < 1 || num > 80) {
          debug.push({
            ...base,
            parsedNumber: num,
            accepted: false,
            rejectReason: 'number_out_of_range',
          })
          continue
        }
        if (num >= 1900 && num <= 2100) {
          debug.push({
            ...base,
            parsedNumber: num,
            accepted: false,
            rejectReason: 'year_like',
          })
          continue
        }

        debug.push({
          ...base,
          parsedNumber: num,
          accepted: true,
          rejectReason: '',
        })
        hits.push({
          number: num,
          x: bx0,
          y: by0,
          width: Math.max(1, bx1 - bx0),
          height: Math.max(1, by1 - by0),
          columnIndex: col.index,
          confidence: (conf / 100) * 0.8,
          source: 'ocr',
          ocrText: text,
          ocrConfidence: conf / 100,
        })
      }
    }
    return { hits, debug, meta: { workerOk: true, rawTexts } }
  } catch (err) {
    console.warn('[QUESTION DETECTION OCR] failed — geometric continues', err)
    return { hits: [], debug, meta: { workerOk: false, rawTexts } }
  }
}
