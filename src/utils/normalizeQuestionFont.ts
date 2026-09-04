import { createWorker, type Page, type Worker } from 'tesseract.js'

/** layout-engine.ts / CROP_EXPORT_DPI=600 ile aynı: px → pt (TEXT_SCALE yok). */
const LAYOUT_ZOOM = 600 / 72

/** PDF’de varsayılan hedef gövde yazı yüksekliği (punto). */
export const DEFAULT_TARGET_QUESTION_LINE_PT = 10

/** @deprecated DEFAULT_TARGET_QUESTION_LINE_PT kullanın */
export const TARGET_QUESTION_LINE_PT = DEFAULT_TARGET_QUESTION_LINE_PT

export const TARGET_QUESTION_LINE_PT_MIN = 6
export const TARGET_QUESTION_LINE_PT_MAX = 14

export function clampTargetQuestionLinePt(pt: number): number {
  if (!Number.isFinite(pt)) return DEFAULT_TARGET_QUESTION_LINE_PT
  return Math.max(
    TARGET_QUESTION_LINE_PT_MIN,
    Math.min(TARGET_QUESTION_LINE_PT_MAX, Math.round(pt * 2) / 2),
  )
}

const MIN_WORD_H_PX = 6
const MIN_WORDS = 3
/** Şık etiketinden satır üretmek için en az bu kadar A–E */
const MIN_OPTION_LABELS = 2
const SCALE_MIN = 0.35
const SCALE_MAX = 2.4
/** Orijinal LAYOUT boyutuna göre güvenli eşitleme çarpanı. */
export const EQUALIZE_SCALE_MIN = 0.7
export const EQUALIZE_SCALE_MAX = 1.3
/** Şık satırı ölçümü — diyagramlı kırpmalarda daha geniş tolerans. */
export const EQUALIZE_SCALE_MIN_OPTIONS = 0.55
export const EQUALIZE_SCALE_MAX_OPTIONS = 1.55
/** Alt metin bandı — üstteki diyagram/şekil OCR dışı. */
const TEXT_BAND_TOP_FRAC = 0.42
/** Şık araması: birden fazla bant (şıklar ortada/altta olabilir). */
const OPTIONS_BAND_TOP_FRACS = [0.38, 0.5, 0.62] as const
/** Üst yarı mürekkep / alt yarı > bu → şekil ağırlıklı. */
const FIGURE_INK_RATIO = 1.35
export const FONT_MATCH_FACTOR_MIN = 0.82
export const FONT_MATCH_FACTOR_MAX = 1.22

let workerPromise: Promise<Worker> | null = null

export function dataUrlToRawBase64(dataUrl: string): string {
  return dataUrl.includes(',') ? dataUrl.split(',', 2)[1]! : dataUrl
}

export function questionImageToDataUrl(imageBase64: string): string {
  const raw = dataUrlToRawBase64(imageBase64)
  return `data:image/png;base64,${raw}`
}

export type QuestionFontMeasure = {
  linePx: number | null
  imgW: number
  imgH: number
  ratio: number | null
  matched: boolean
  source?: 'ocr-options' | 'ink-options' | 'ocr-words' | 'ink' | 'trusted-median' | 'layout-identity'
  figureHeavy?: boolean
}

type BBox = { x0: number; y0: number; x1: number; y1: number }
type OcrWord = { text?: string; bbox?: BBox; confidence?: number }

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]!
}

function iqrFilter(heights: number[]): number[] {
  if (heights.length < 4) return heights
  const sorted = [...heights].sort((a, b) => a - b)
  const q1 = sorted[Math.floor(sorted.length * 0.25)]!
  const q3 = sorted[Math.floor(sorted.length * 0.75)]!
  const lo = q1 - 1.5 * (q3 - q1)
  const hi = q3 + 1.5 * (q3 - q1)
  const filtered = heights.filter((h) => h >= lo && h <= hi)
  return filtered.length > 0 ? filtered : heights
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

async function getOcrWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker('tur+eng', undefined, {
      logger: () => {},
    }).catch((err) => {
      workerPromise = null
      throw err
    })
  }
  return workerPromise
}

/** Matematiksel / sembolik gürültü — eşitlemede kullanılmaz. */
function isNoiseToken(text: string): boolean {
  const t = text.trim()
  if (!t) return true
  if (/^[|‖\[\]{}()⟨⟩〈〉\/\\=_+\-−·•°′″]+$/.test(t)) return true
  if (/^[0-9]+$/.test(t) && t.length <= 2) return true
  if (/^[√∑∏∫±≤≥≠≈∞]+$/.test(t)) return true
  return false
}

function isOptionLabel(text: string): boolean {
  const t = text.trim().replace(/\s+/g, '')
  if (!t) return false
  // A) A. A: A- veya tek harf A–E (OCR gürültülü ekler)
  if (/^[A-Ea-e]$/.test(t)) return true
  if (/^[A-Ea-e][\)\]\.\:：\-–—|]/.test(t)) return true
  if (/^[A-Ea-e][\)\.\:].+/.test(t) && t.length <= 4) return true
  return false
}

function wordHeight(w: OcrWord): number {
  const b = w.bbox
  if (!b) return 0
  return Math.max(0, b.y1 - b.y0)
}

function detectFigureHeavy(img: HTMLImageElement): boolean {
  const w = img.naturalWidth
  const h = img.naturalHeight
  if (w < 8 || h < 8) return false
  const canvas = document.createElement('canvas')
  const maxW = 160
  const scale = Math.min(1, maxW / w)
  canvas.width = Math.max(1, Math.round(w * scale))
  canvas.height = Math.max(1, Math.round(h * scale))
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return false
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const mid = Math.floor(canvas.height / 2)
  let topInk = 0
  let botInk = 0
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4
      const lum = (data[i]! + data[i + 1]! + data[i + 2]!) / 3
      if (lum < 200) {
        if (y < mid) topInk++
        else botInk++
      }
    }
  }
  if (botInk < 80) return topInk > botInk * FIGURE_INK_RATIO
  return topInk / Math.max(1, botInk) > FIGURE_INK_RATIO
}

function bandCanvas(img: HTMLImageElement, topFrac: number): HTMLCanvasElement {
  const srcW = img.naturalWidth
  const srcH = img.naturalHeight
  const y0 = Math.floor(srcH * topFrac)
  const bandH = Math.max(1, srcH - y0)
  const canvas = document.createElement('canvas')
  const maxW = 900
  const scale = Math.min(1, maxW / Math.max(1, srcW))
  canvas.width = Math.max(1, Math.round(srcW * scale))
  canvas.height = Math.max(1, Math.round(bandH * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas yok')
  ctx.drawImage(img, 0, y0, srcW, bandH, 0, 0, canvas.width, canvas.height)
  return canvas
}

async function runOcr(canvas: HTMLCanvasElement): Promise<OcrWord[]> {
  const worker = await getOcrWorker()
  const result = await worker.recognize(canvas)
  const data = result.data as Page & { words?: OcrWord[] }
  return data.words ?? []
}

/**
 * A–E şık satırı yüksekliği: etiket + aynı satırdaki metin.
 * Birkaç dikey bant dener (şekil altı / sayfa ortası şıklar).
 */
async function estimateOptionLineHeightFromOcrBand(img: HTMLImageElement): Promise<number | null> {
  let bestHeights: number[] = []

  for (const topFrac of OPTIONS_BAND_TOP_FRACS) {
    const canvas = bandCanvas(img, topFrac)
    const words = await runOcr(canvas)
    const scaleY = (img.naturalHeight * (1 - topFrac)) / canvas.height
    const usable = words.filter((w) => {
      if (!w.bbox) return false
      if ((w.confidence ?? 0) < 35) return false
      return wordHeight(w) * scaleY >= MIN_WORD_H_PX
    })
    if (usable.length === 0) continue

    const labels = usable.filter((w) => isOptionLabel(String(w.text ?? '')))
    if (labels.length < MIN_OPTION_LABELS) continue

    const lineHeights: number[] = []
    for (const label of labels) {
      const lb = label.bbox!
      const labelH = Math.max(1, lb.y1 - lb.y0)
      const cy = (lb.y0 + lb.y1) / 2
      const onLine = usable.filter((w) => {
        const b = w.bbox!
        const wcy = (b.y0 + b.y1) / 2
        return Math.abs(wcy - cy) <= labelH * 0.75
      })
      const heights = onLine
        .map((w) => wordHeight(w) * scaleY)
        .filter((h) => h >= MIN_WORD_H_PX && h <= img.naturalHeight * 0.2)
      if (heights.length === 0) continue
      // Satırda şık harfi + metin varsa metin yüksekliğini tercih et
      const nonLabel = onLine.filter((w) => !isOptionLabel(String(w.text ?? '')))
      if (nonLabel.length > 0) {
        const textH = nonLabel
          .map((w) => wordHeight(w) * scaleY)
          .filter((h) => h >= MIN_WORD_H_PX)
        if (textH.length > 0) {
          lineHeights.push(median(textH))
          continue
        }
      }
      lineHeights.push(median(heights))
    }

    if (lineHeights.length >= MIN_OPTION_LABELS && lineHeights.length > bestHeights.length) {
      bestHeights = lineHeights
    }
    // Yeterli şık bulundu — erken çık
    if (bestHeights.length >= 4) break
  }

  if (bestHeights.length < MIN_OPTION_LABELS) return null
  return median(iqrFilter(bestHeights))
}

/** Alt bant gövde kelimeleri — sembol/matematik filtresiyle. */
async function estimateWordHeightFromOcrBand(img: HTMLImageElement): Promise<number | null> {
  const canvas = bandCanvas(img, TEXT_BAND_TOP_FRAC)
  const words = await runOcr(canvas)
  const scaleY = img.naturalHeight * (1 - TEXT_BAND_TOP_FRAC) / canvas.height
  const heights: number[] = []
  for (const w of words) {
    const text = String(w.text ?? '')
    if (isNoiseToken(text)) continue
    if (isOptionLabel(text)) continue
    if (text.trim().length < 2) continue
    if ((w.confidence ?? 0) < 45) continue
    const h = wordHeight(w) * scaleY
    if (h >= MIN_WORD_H_PX) heights.push(h)
  }
  if (heights.length < MIN_WORDS) return null
  return median(iqrFilter(heights))
}

/** Son çare: alt bant mürekkep satır yüksekliği (şekil değil metin bandı). */
function collectInkLineRunsPx(
  img: HTMLImageElement,
  topFrac: number,
): { runs: number[]; scaleY: number } | null {
  const canvas = bandCanvas(img, topFrac)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  const width = canvas.width
  const height = canvas.height
  const data = ctx.getImageData(0, 0, width, height).data
  const rowInk: number[] = []
  for (let y = 0; y < height; y++) {
    let ink = 0
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if ((data[i]! + data[i + 1]! + data[i + 2]!) / 3 < 200) ink++
    }
    rowInk.push(ink)
  }
  const thresh = Math.max(3, width * 0.02)
  const runs: number[] = []
  let run = 0
  for (const ink of rowInk) {
    if (ink >= thresh) {
      run++
    } else if (run > 0) {
      if (run >= 3 && run <= height * 0.22) runs.push(run)
      run = 0
    }
  }
  if (run >= 3 && run <= height * 0.22) runs.push(run)
  if (runs.length < 2) return null
  const scaleY = (img.naturalHeight * (1 - topFrac)) / height
  return { runs, scaleY }
}

function estimateLineHeightFromInkBand(img: HTMLImageElement): number | null {
  const collected = collectInkLineRunsPx(img, TEXT_BAND_TOP_FRAC)
  if (!collected) return null
  return median(iqrFilter(collected.runs)) * collected.scaleY
}

export function apparentLinePtFromPx(linePx: number): number {
  if (linePx <= 0) return 0
  return linePx / LAYOUT_ZOOM
}

/**
 * Ölçülen satır yüksekliği makul bir sınav yazısı mı? (hedef puntoya bağlı değil)
 * 600 DPI kırpmada ~5–20 pt gövde/şık yazısı.
 */
export function isApparentLinePtPlausible(
  linePx: number,
  fromOptions: boolean = false,
): boolean {
  const pt = apparentLinePtFromPx(linePx)
  if (!(pt > 0)) return false
  const lo = fromOptions ? 4 : 5
  const hi = fromOptions ? 24 : 20
  return pt >= lo && pt <= hi
}

/** Ölçülen satır → hedef punto için display_scale. */
export function displayScaleForTargetLinePt(
  measuredLinePx: number,
  targetLinePt: number,
): number | null {
  const apparent = apparentLinePtFromPx(measuredLinePx)
  if (!(apparent > 0)) return null
  const target = clampTargetQuestionLinePt(targetLinePt)
  const scale = target / apparent
  if (!Number.isFinite(scale) || scale <= 0) return null
  return Math.max(SCALE_MIN, Math.min(SCALE_MAX, scale))
}

export function layoutIdentityFontLinePx(
  targetLinePt: number = DEFAULT_TARGET_QUESTION_LINE_PT,
): number {
  return clampTargetQuestionLinePt(targetLinePt) * LAYOUT_ZOOM
}

/** @deprecated Mutlak pt aralığı için isApparentLinePtPlausible kullanın */
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

/**
 * Güvenli ölçüm → linePx.
 * Başarısız / şekil ağırlıklı gövdede null (identity(target) YOK — ters ölçek üretiyordu).
 */
export function resolveMatchedLinePx(
  linePx: number | null,
  imgW: number,
  _medianRatio: number,
  ok: boolean,
  figureHeavy: boolean = false,
  fromOptions: boolean = false,
  _targetLinePt: number = DEFAULT_TARGET_QUESTION_LINE_PT,
): number | null {
  if (imgW <= 0) return null
  if (!ok || linePx == null || linePx <= 0) return null
  if (figureHeavy && !fromOptions) return null
  if (!isApparentLinePtPlausible(linePx, fromOptions)) return null
  return linePx
}

/**
 * 1) A–E şık OCR (şekilli sorularda tek güvenilir kaynak)
 * 2) Gövde OCR / ink — yalnızca şekil-ağırlıklı DEĞİLSE
 * Not: mürekkep “şık bloğu” kaldırıldı — diyagram satırlarını şık sanıyordu.
 */
export async function measureQuestionFontScale(imageSrc: string): Promise<QuestionFontMeasure> {
  try {
    const img = await loadImage(imageSrc)
    const imgW = img.naturalWidth
    const imgH = img.naturalHeight
    if (imgW <= 0 || imgH <= 0) {
      return { linePx: null, imgW: 0, imgH: 0, ratio: null, matched: false }
    }

    const figureHeavy = detectFigureHeavy(img)
    let linePx: number | null = null
    let source: QuestionFontMeasure['source']

    try {
      linePx = await estimateOptionLineHeightFromOcrBand(img)
      if (linePx != null) source = 'ocr-options'
    } catch {
      /* şık OCR başarısız */
    }

    // Şekil ağırlıklı: gövde/ink kullanma — diyagram ölçümü yazıyı bozar
    if (!figureHeavy) {
      if (linePx == null) {
        try {
          linePx = await estimateWordHeightFromOcrBand(img)
          if (linePx != null) source = 'ocr-words'
        } catch {
          /* gövde OCR başarısız */
        }
      }

      if (linePx == null) {
        linePx = estimateLineHeightFromInkBand(img)
        if (linePx != null) source = 'ink'
      }
    }

    if (linePx == null || linePx <= 0) {
      return { linePx: null, imgW, imgH, ratio: null, matched: false, figureHeavy }
    }

    return {
      linePx,
      imgW,
      imgH,
      ratio: linePx / imgW,
      matched: true,
      source,
      figureHeavy,
    }
  } catch {
    return { linePx: null, imgW: 0, imgH: 0, ratio: null, matched: false }
  }
}

/** Şık OCR kaynağı mı? */
export function isOptionFontSource(source: string | undefined): boolean {
  return source === 'ocr-options'
}
