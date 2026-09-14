/**
 * Compatibility wrapper — delegates to the new hybrid questionDetection module.
 * Old ink-only heuristics are NOT used as a silent fallback.
 */
import type { CropBox } from '../types'
import { detectQuestions } from './questionDetection/detectQuestions'
import type { QuestionDetectionDebug } from './questionDetection/questionDetectionTypes'

export type DetectQuestionRectsOptions = {
  maxAnalyzeWidth?: number
  enableOcr?: boolean
  debug?: boolean
  /** Populated after async detect when using detectQuestionRectsFromImageAsync */
  lastDebug?: QuestionDetectionDebug
}

let lastDebug: QuestionDetectionDebug | null = null

export function getLastQuestionDetectionDebug(): QuestionDetectionDebug | null {
  return lastDebug
}

/**
 * @deprecated Prefer detectQuestionRectsFromImageAsync — sync path cannot run OCR.
 * Returns [] and logs a warning; use the async API from CropWorkspace.
 */
export function detectQuestionRectsFromImage(
  _img: HTMLImageElement,
  _options?: DetectQuestionRectsOptions,
): CropBox[] {
  console.warn(
    '[QUESTION DETECTION] Sync detectQuestionRectsFromImage is disabled. Use detectQuestionRectsFromImageAsync.',
  )
  return []
}

export async function detectQuestionRectsFromImageAsync(
  img: HTMLImageElement,
  options?: DetectQuestionRectsOptions,
): Promise<CropBox[]> {
  const result = await detectQuestions(img, {
    maxAnalyzeWidth: options?.maxAnalyzeWidth,
    enableOcr: options?.enableOcr,
    debug: options?.debug,
  })
  lastDebug = result.debug
  return result.crops
}

export function filterNewQuestionRects(
  detected: CropBox[],
  existing: CropBox[],
  maxOverlap = 0.45,
): CropBox[] {
  return detected.filter(
    (d) => !existing.some((e) => overlapRatio(d, e) > maxOverlap || overlapRatio(e, d) > maxOverlap),
  )
}

function overlapRatio(a: CropBox, b: CropBox): number {
  const ax2 = a.x + a.width
  const ay2 = a.y + a.height
  const bx2 = b.x + b.width
  const by2 = b.y + b.height
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(a.x, b.x))
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(a.y, b.y))
  const inter = ix * iy
  if (inter <= 0) return 0
  const areaA = a.width * a.height
  return areaA > 0 ? inter / areaA : 0
}
