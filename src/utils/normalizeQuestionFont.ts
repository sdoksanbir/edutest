/**
 * Soru yazı eşitleme:
 * 1) Alt %20 şık bandı — OCR ile A–E) Cap-Height medyanı (öncelik)
 * 2) Üst %25 kök — OCR satır yüksekliği (text.length > 3)
 * 3) Mürekkep yedek
 * Fiziksel scale: fontEqualizeMath / fontPhysicalScale (pt), ANALYSIS_WIDTH yalnızca ölçüm.
 */

import { createWorker, PSM, type Line, type Page, type Worker } from 'tesseract.js'
import {
  ANALYSIS_WIDTH,
  ANOMALY_FONT_HEIGHT_PX,
  AVERAGE_BODY_FONT_HEIGHT_PX,
  DEFAULT_TARGET_QUESTION_LINE_PT,
  FONT_SCALE_CLAMP_MAX,
  FONT_SCALE_CLAMP_MIN,
  OCR_MIN_CONFIDENCE,
  TARGET_FONT_HEIGHT_PX,
  TARGET_QUESTION_LINE_PT_MAX,
  TARGET_QUESTION_LINE_PT_MIN,
  clampFontScale as clampFontScaleSilent,
  clampTargetQuestionLinePt,
  sanitizeDetectedFontHeightPx,
  targetFontHeightPxForLinePt,
} from './fontEqualizeMath'

export {
  ANALYSIS_WIDTH,
  ANOMALY_FONT_HEIGHT_PX,
  AVERAGE_BODY_FONT_HEIGHT_PX,
  DEFAULT_TARGET_QUESTION_LINE_PT,
  FONT_SCALE_CLAMP_MAX,
  FONT_SCALE_CLAMP_MIN,
  OCR_MIN_CONFIDENCE,
  TARGET_FONT_HEIGHT_PX,
  TARGET_QUESTION_LINE_PT_MAX,
  TARGET_QUESTION_LINE_PT_MIN,
  clampTargetQuestionLinePt,
  sanitizeDetectedFontHeightPx,
  targetFontHeightPxForLinePt,
}

/** layout-engine.ts / CROP_EXPORT_DPI=600 ile aynı. */
const LAYOUT_ZOOM = 600 / 72

const STEM_BAND_FRAC = 0.25
const OPTIONS_BAND_FRAC = 0.2
/** En az bu kadar A–E şık harfi → Cap-Height güvenilir. */
const MIN_OPTION_LABELS = 3

/** @deprecated */
export const TARGET_QUESTION_LINE_PT = DEFAULT_TARGET_QUESTION_LINE_PT

export const EQUALIZE_SCALE_MIN = FONT_SCALE_CLAMP_MIN
export const EQUALIZE_SCALE_MAX = FONT_SCALE_CLAMP_MAX
export const EQUALIZE_SCALE_MIN_OPTIONS = FONT_SCALE_CLAMP_MIN
export const EQUALIZE_SCALE_MAX_OPTIONS = FONT_SCALE_CLAMP_MAX
export const FONT_MATCH_FACTOR_MIN = FONT_SCALE_CLAMP_MIN
export const FONT_MATCH_FACTOR_MAX = FONT_SCALE_CLAMP_MAX

const SCALE_MIN = 0.35
const SCALE_MAX = 2.4

export function clampFontScale(scale: number): number {
  const after = clampFontScaleSilent(scale)
  if (Number.isFinite(scale) && scale > 0 && Math.abs(after - scale) > 1e-9) {
    console.log(
      `[ScaleLimit] normalizeQuestionFont.ts:clampFontScale before=${scale.toFixed(4)} after=${after.toFixed(4)} (min=${FONT_SCALE_CLAMP_MIN} max=${FONT_SCALE_CLAMP_MAX})`,
    )
  }
  return after
}

export function dataUrlToRawBase64(dataUrl: string): string {
  return dataUrl.includes(',') ? dataUrl.split(',', 2)[1]! : dataUrl
}

export function questionImageToDataUrl(imageBase64: string): string {
  const raw = dataUrlToRawBase64(imageBase64)
  return `data:image/png;base64,${raw}`
}

export type FontMeasurementSource =
  | 'ocr-options-cap'
  | 'ocr-stem-lines'
  | 'ink-stem'
  | 'ink-options'
  | 'trusted-median'
  | 'layout-identity'

export type QuestionFontMeasure = {
  /** @deprecated alias: originalFontHeightPx (sanitize sonrası × scaleToOriginal) */
  linePx: number | null
  /** sanitize sonrası analiz canvas Cap-Height / satır (px @ ANALYSIS_WIDTH) */
  detectedFontHeightPx: number | null
  rawDetectedAnalysisPx: number | null
  sanitizedDetectedAnalysisPx: number | null
  analysisWidthPx: number
  sourceImageWidthPx: number
  scaleToOriginal: number | null
  originalFontHeightPx: number | null
  measurementSource?: FontMeasurementSource
  anomaly: boolean
  imgW: number
  imgH: number
  ratio: number | null
  matched: boolean
  confidence: number
  /** @deprecated alias measurementSource */
  source?: FontMeasurementSource
  figureHeavy?: boolean
  /**
   * Fiziksel ölçek store’da ppp ile hesaplanır.
   * Ölçüm aşamasında her zaman null (ANALYSIS_WIDTH hatasına düşülmesin).
   */
  fontScale?: number | null
}

type BBox = { x0: number; y0: number; x1: number; y1: number }
type OcrSymbol = { text?: string; bbox?: BBox; confidence?: number }
type OcrWord = {
  text?: string
  bbox?: BBox
  confidence?: number
  symbols?: OcrSymbol[]
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]!
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Görsel yüklenemedi'))
    img.src = src
  })
}

function tesseractPublicUrl(relPath: string): string {
  const base = import.meta.env.BASE_URL || './'
  const prefix = base.endsWith('/') ? base : `${base}/`
  const relative = `${prefix}tesseract/${relPath.replace(/^\//, '')}`
  if (typeof window !== 'undefined' && window.location?.href) {
    try {
      return new URL(relative, window.location.href).href
    } catch {
      /* fall through */
    }
  }
  return relative
}

const TESSERACT_OPTS = {
  workerPath: tesseractPublicUrl('worker.min.js'),
  corePath: tesseractPublicUrl(''),
  langPath: tesseractPublicUrl('lang'),
  workerBlobURL: false,
  logger: () => {},
  errorHandler: () => {},
} as const

let workerPromise: Promise<Worker> | null = null

async function getOcrWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker('eng', undefined, { ...TESSERACT_OPTS })
      .then(async (w) => {
        await w.setParameters({
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
          preserve_interword_spaces: '1',
        })
        return w
      })
      .catch((err) => {
        workerPromise = null
        throw err
      })
  }
  return workerPromise
}

function bandCanvas(
  img: HTMLImageElement,
  region: 'stem' | 'options',
): HTMLCanvasElement | null {
  const srcW = img.naturalWidth
  const srcH = img.naturalHeight
  if (srcW < 16 || srcH < 16) return null

  let y0: number
  let bandH: number
  if (region === 'stem') {
    y0 = 0
    bandH = Math.max(8, Math.floor(srcH * STEM_BAND_FRAC))
  } else {
    bandH = Math.max(8, Math.floor(srcH * OPTIONS_BAND_FRAC))
    y0 = Math.max(0, srcH - bandH)
  }

  const scale = ANALYSIS_WIDTH / srcW
  const canvas = document.createElement('canvas')
  canvas.width = ANALYSIS_WIDTH
  canvas.height = Math.max(8, Math.round(bandH * scale))
  if (canvas.width < 48 || canvas.height < 8) return null
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, y0, srcW, bandH, 0, 0, canvas.width, canvas.height)
  return canvas
}

function inkDetectedFontHeightPx(canvas: HTMLCanvasElement): number | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  const w = canvas.width
  const h = canvas.height
  const { data } = ctx.getImageData(0, 0, w, h)
  const rowFrac: number[] = []
  for (let y = 0; y < h; y++) {
    let ink = 0
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const lum = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!
      if (lum < 185) ink++
    }
    rowFrac.push(ink / w)
  }
  const thresh = 0.01
  const runs: number[] = []
  let run = 0
  for (const f of rowFrac) {
    if (f >= thresh) {
      run++
    } else if (run > 0) {
      if (run >= 4 && run <= h * 0.35) runs.push(run)
      run = 0
    }
  }
  if (run >= 4 && run <= h * 0.35) runs.push(run)
  if (runs.length < 1) return null
  return median(runs)
}

function wordHeight(w: OcrWord): number {
  const b = w.bbox
  if (!b) return 0
  return Math.max(0, b.y1 - b.y0)
}

/** Yalnızca A) / B) … glifi — kesirli şık içeriği (3/2, 9/4) hariç. */
function isStrictOptionCapLabel(text: string): boolean {
  const t = text.trim().replace(/\s+/g, '')
  if (!t) return false
  if (/[0-9\/⁄]/.test(t)) return false
  if (t.length > 3) return false
  return /^[A-Ea-e]\)$/.test(t) || /^[A-Ea-e]\.$/.test(t) || /^[A-Ea-e]$/.test(t)
}

type OcrBandResult = {
  words: OcrWord[]
  lines: Line[]
}

async function runOcrBand(canvas: HTMLCanvasElement): Promise<OcrBandResult | null> {
  if (canvas.width < 48 || canvas.height < 12) return null
  try {
    const worker = await getOcrWorker()
    const result = await worker.recognize(canvas)
    const data = result.data as Page & { words?: OcrWord[]; lines?: Line[] }
    return {
      words: data.words ?? [],
      lines: data.lines ?? [],
    }
  } catch {
    return null
  }
}

/**
 * Alt şık: yalnızca A–E) harf glifi Cap-Height (≥3).
 * Kesir blokları / şişmiş bbox elenir; mümkünse symbol bbox kullanılır.
 */
function optionCapHeightFromWords(
  words: OcrWord[],
  canvasH: number,
): { heightPx: number; confidence: number } | null {
  const caps: { h: number; conf: number }[] = []
  for (const w of words) {
    const text = String(w.text ?? '')
    if (!isStrictOptionCapLabel(text)) continue
    const conf = w.confidence ?? 0
    if (conf < 40) continue

    let h = 0
    const letterSym = (w.symbols ?? []).find((s) =>
      /^[A-Ea-e]$/.test(String(s.text ?? '').trim()),
    )
    if (letterSym?.bbox) {
      h = Math.max(0, letterSym.bbox.y1 - letterSym.bbox.y0)
    } else {
      h = wordHeight(w)
    }
    // Cap harfi bandın %28’inden uzun olamaz (kesir sapması ~25px)
    if (h < 4 || h > canvasH * 0.28) continue
    caps.push({ h, conf })
  }
  if (caps.length < MIN_OPTION_LABELS) return null

  const minH = Math.min(...caps.map((c) => c.h))
  const tight = caps.filter((c) => c.h <= minH * 1.35)
  const use = tight.length >= MIN_OPTION_LABELS ? tight : caps

  return {
    heightPx: median(use.map((c) => c.h)),
    confidence: Math.max(OCR_MIN_CONFIDENCE, median(use.map((c) => c.conf))),
  }
}

/**
 * Üst kök: OCR satır yüksekliği; kısa/izole şekil harfleri (A, D) hariç.
 * text.trim().length > 3
 */
function stemLineHeightFromLines(
  lines: Line[],
  canvasH: number,
): { heightPx: number; confidence: number } | null {
  const heights: number[] = []
  const confs: number[] = []
  for (const line of lines) {
    const text = String(line.text ?? '').trim()
    if (text.length <= 3) continue
    const conf = line.confidence ?? 0
    if (conf < 40) continue
    const b = line.bbox
    if (!b) continue
    const h = Math.max(0, b.y1 - b.y0)
    if (h < 5 || h > canvasH * 0.55) continue
    heights.push(h)
    confs.push(conf)
  }
  if (heights.length < 1) return null
  return {
    heightPx: median(heights),
    confidence: Math.max(55, median(confs)),
  }
}

type BandMeasure = {
  heightPx: number
  confidence: number
  source: FontMeasurementSource
}

async function measureOptionsCapHeight(img: HTMLImageElement): Promise<BandMeasure | null> {
  const canvas = bandCanvas(img, 'options')
  if (!canvas) return null
  const ocr = await runOcrBand(canvas)
  if (ocr) {
    const cap = optionCapHeightFromWords(ocr.words, canvas.height)
    if (cap) {
      return { heightPx: cap.heightPx, confidence: cap.confidence, source: 'ocr-options-cap' }
    }
  }
  const inkH = inkDetectedFontHeightPx(canvas)
  if (inkH != null && inkH >= 5 && inkH <= canvas.height * 0.4) {
    return { heightPx: inkH, confidence: 55, source: 'ink-options' }
  }
  return null
}

async function measureStemLineHeight(img: HTMLImageElement): Promise<BandMeasure | null> {
  const canvas = bandCanvas(img, 'stem')
  if (!canvas) return null
  const ocr = await runOcrBand(canvas)
  if (ocr) {
    const stem = stemLineHeightFromLines(ocr.lines, canvas.height)
    if (stem) {
      return { heightPx: stem.heightPx, confidence: stem.confidence, source: 'ocr-stem-lines' }
    }
  }
  const inkH = inkDetectedFontHeightPx(canvas)
  if (inkH != null && inkH >= 5 && inkH <= canvas.height * 0.4) {
    return { heightPx: inkH, confidence: 55, source: 'ink-stem' }
  }
  return null
}

export function apparentLinePtFromPx(linePx: number): number {
  if (linePx <= 0) return 0
  return linePx / LAYOUT_ZOOM
}

export function isApparentLinePtPlausible(
  linePx: number,
  _fromOptions: boolean = false,
): boolean {
  const pt = apparentLinePtFromPx(linePx)
  return pt >= 4 && pt <= 22
}

export function displayScaleForTargetLinePt(
  measuredLinePx: number,
  targetLinePt: number,
): number | null {
  const apparent = apparentLinePtFromPx(measuredLinePx)
  if (!(apparent > 0)) return null
  const target = clampTargetQuestionLinePt(targetLinePt)
  const scale = target / apparent
  if (!Number.isFinite(scale) || scale <= 0) return null
  return clampFontScale(scale)
}

/**
 * @deprecated ANALYSIS_WIDTH koordinat hatası — kullanmayın.
 * Yerine: fontPhysicalScale.normalizationScaleFromPhysicalFont / computePhysicalFontEqualize
 */
export function fontScaleFromDetectedHeight(
  _detectedFontHeightPx: number,
  _targetLinePt: number = DEFAULT_TARGET_QUESTION_LINE_PT,
): number | null {
  throw new Error(
    'fontScaleFromDetectedHeight kaldırıldı (ANALYSIS_WIDTH hatası). ' +
      'normalizationScaleFromPhysicalFont / computePhysicalFontEqualize kullanın.',
  )
}

/**
 * @deprecated Fiziksel pt kullanın: reconcileEqualizeScalesFromPhysicalPt (fontPhysicalScale.ts)
 */
export function reconcileEqualizeScales(
  _entries: Array<{ id: string; detectedFontHeightPx: number; confidence: number }>,
  _targetLinePt: number,
): Map<string, number> {
  throw new Error(
    'reconcileEqualizeScales (analiz-px) kaldırıldı. reconcileEqualizeScalesFromPhysicalPt kullanın.',
  )
}

/**
 * Orijinal görüntü px (linePx) + legacy 600 DPI → fiziksel eşitleme.
 * capture.ppp için store / computePhysicalFontEqualize kullanın.
 */
export function reconcileEqualizeScalesFromLinePx(
  entries: Array<{ id: string; linePx: number }>,
  targetLinePt: number,
): Map<string, number> {
  const out = new Map<string, number>()
  const target = clampTargetQuestionLinePt(targetLinePt)
  const scales: number[] = []
  for (const e of entries) {
    if (!(e.linePx > 0)) continue
    const apparent = apparentLinePtFromPx(e.linePx)
    if (!(apparent > 0)) continue
    scales.push(clampFontScale(target / apparent))
  }
  if (scales.length === 0) return out
  const avg = scales.reduce((a, b) => a + b, 0) / scales.length
  for (const e of entries) {
    if (!(e.linePx > 0)) {
      out.set(e.id, clampFontScale(avg))
      continue
    }
    const apparent = apparentLinePtFromPx(e.linePx)
    out.set(
      e.id,
      apparent > 0 ? clampFontScale(target / apparent) : clampFontScale(avg),
    )
  }
  return out
}

export function layoutIdentityFontLinePx(
  targetLinePt: number = DEFAULT_TARGET_QUESTION_LINE_PT,
): number {
  return clampTargetQuestionLinePt(targetLinePt) * LAYOUT_ZOOM
}

export function isMeasuredScaleInSafeRange(
  measuredLinePx: number,
  fromOptions: boolean = false,
  _targetLinePt: number = DEFAULT_TARGET_QUESTION_LINE_PT,
): boolean {
  return isApparentLinePtPlausible(measuredLinePx, fromOptions)
}

export function fontLinePxForTargetVisualPt(
  measuredLinePx: number,
  targetVisualPt: number,
  layoutTargetPt: number = DEFAULT_TARGET_QUESTION_LINE_PT,
): number {
  if (measuredLinePx <= 0 || targetVisualPt <= 0) return measuredLinePx
  return (measuredLinePx * layoutTargetPt) / targetVisualPt
}

export function equalizedNaturalDrawSizePt(
  imgWpx: number,
  imgHpx: number,
  fontLinePx: number,
  displayScale: number = 1,
  targetLinePt: number = DEFAULT_TARGET_QUESTION_LINE_PT,
): { w: number; h: number } {
  if (fontLinePx <= 0 || imgWpx <= 0 || imgHpx <= 0) return { w: 0, h: 0 }
  const s = Math.max(SCALE_MIN, Math.min(SCALE_MAX, displayScale))
  const target = clampTargetQuestionLinePt(targetLinePt)
  return {
    w: (imgWpx * target * s) / fontLinePx,
    h: (imgHpx * target * s) / fontLinePx,
  }
}

export function resolveMatchedLinePx(
  linePx: number | null,
  imgW: number,
  _medianRatio: number,
  ok: boolean,
  _figureHeavy: boolean = false,
  fromOptions: boolean = false,
  _targetLinePt: number = DEFAULT_TARGET_QUESTION_LINE_PT,
): number | null {
  if (imgW <= 0) return null
  if (!ok || linePx == null || linePx <= 0) return null
  if (!isApparentLinePtPlausible(linePx, fromOptions)) return null
  return linePx
}

export type MeasureQuestionFontOpts = {
  /** Konsol debug: Soru ${id} | analysis=… */
  debugId?: string
  /** @deprecated Fiziksel hedef store’da targetQuestionLinePt ile uygulanır */
  targetLinePt?: number
}

function emptyMeasure(partial?: Partial<QuestionFontMeasure>): QuestionFontMeasure {
  return {
    linePx: null,
    detectedFontHeightPx: null,
    rawDetectedAnalysisPx: null,
    sanitizedDetectedAnalysisPx: null,
    analysisWidthPx: ANALYSIS_WIDTH,
    sourceImageWidthPx: 0,
    scaleToOriginal: null,
    originalFontHeightPx: null,
    anomaly: false,
    imgW: 0,
    imgH: 0,
    ratio: null,
    matched: false,
    confidence: 0,
    fontScale: null,
    ...partial,
  }
}

/**
 * 1) Şık Cap-Height (A–E)  2) Kök OCR satır  3) Mürekkep
 * Ölçek üretmez — originalFontHeightPx döner; fiziksel scale store’da.
 */
export async function measureQuestionFontScale(
  imageSrc: string,
  opts?: MeasureQuestionFontOpts,
): Promise<QuestionFontMeasure> {
  try {
    const img = await loadImage(imageSrc)
    const imgW = img.naturalWidth
    const imgH = img.naturalHeight
    if (imgW <= 0 || imgH <= 0) {
      return emptyMeasure()
    }

    // Öncelik: şık Cap-Height (şekil rakamlarından etkilenmez)
    const options = await measureOptionsCapHeight(img)
    const stem = options?.source === 'ocr-options-cap' ? null : await measureStemLineHeight(img)

    let best: BandMeasure | null = null
    if (options?.source === 'ocr-options-cap') {
      best = options
    } else if (stem?.source === 'ocr-stem-lines') {
      best = stem
    } else {
      best = options ?? stem
    }

    if (best == null) {
      if (opts?.debugId != null) {
        console.log(
          `Soru ${opts.debugId} | analysis=null | sourceWidth=${imgW}px | matched=false`,
        )
      }
      return emptyMeasure({
        imgW,
        imgH,
        sourceImageWidthPx: imgW,
        analysisWidthPx: ANALYSIS_WIDTH,
      })
    }

    const rawDetectedAnalysisPx = best.heightPx
    const anomaly = rawDetectedAnalysisPx > ANOMALY_FONT_HEIGHT_PX
    const sanitizedDetectedAnalysisPx = sanitizeDetectedFontHeightPx(rawDetectedAnalysisPx)
    const scaleToOriginal = imgW / ANALYSIS_WIDTH
    const originalFontHeightPx = sanitizedDetectedAnalysisPx * scaleToOriginal
    const linePx = originalFontHeightPx

    if (opts?.debugId != null) {
      console.log(
        `Soru ${opts.debugId} | ` +
          `analysis=${rawDetectedAnalysisPx.toFixed(2)}px` +
          `${anomaly ? `→${sanitizedDetectedAnalysisPx}px(anomali)` : ''} | ` +
          `sourceWidth=${imgW}px | original=${originalFontHeightPx.toFixed(2)}px | ` +
          `source=${best.source}`,
      )
    }

    return {
      linePx,
      detectedFontHeightPx: sanitizedDetectedAnalysisPx,
      rawDetectedAnalysisPx,
      sanitizedDetectedAnalysisPx,
      analysisWidthPx: ANALYSIS_WIDTH,
      sourceImageWidthPx: imgW,
      scaleToOriginal,
      originalFontHeightPx,
      measurementSource: best.source,
      anomaly,
      imgW,
      imgH,
      ratio: linePx / imgW,
      matched: true,
      confidence: best.confidence,
      source: best.source,
      fontScale: null,
    }
  } catch {
    if (opts?.debugId != null) {
      console.log(`Soru ${opts.debugId} | analysis=null | matched=false [error]`)
    }
    return emptyMeasure()
  }
}

export function isOptionFontSource(source: string | undefined): boolean {
  return source === 'ocr-options-cap' || source === 'ink-options'
}

export const FONT_SCALE_NUDGE_STEP = 0.05

export function nudgeFontScale(current: number, direction: 1 | -1): number {
  const next = (Number.isFinite(current) && current > 0 ? current : 1) + direction * FONT_SCALE_NUDGE_STEP
  return Math.max(SCALE_MIN, Math.min(SCALE_MAX, Math.round(next * 100) / 100))
}
