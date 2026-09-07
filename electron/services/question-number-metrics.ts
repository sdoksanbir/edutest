/** Soru numarası fontu — canvas önizleme + PDF export ile aynı */
export const QUESTION_NUM_FONT_PT = 10
export const QUESTION_NUMBER_FONT_PT_MIN = 7
export const QUESTION_NUMBER_FONT_PT_MAX = 18

export function clampQuestionNumberFontPt(value: number): number {
  if (!Number.isFinite(value)) return QUESTION_NUM_FONT_PT
  return Math.max(
    QUESTION_NUMBER_FONT_PT_MIN,
    Math.min(QUESTION_NUMBER_FONT_PT_MAX, Math.round(value * 2) / 2),
  )
}

export function questionNumberLabel(displayNumber: number): string {
  return `${displayNumber}.`
}

/** Bold Helvetica/Arial — numara metni genişliği (pt). */
export function estimateQuestionNumberTextWidthPt(
  displayNumber: number | null | undefined,
  fontPt: number = QUESTION_NUM_FONT_PT,
): number {
  if (displayNumber == null) return 0
  const scale = clampQuestionNumberFontPt(fontPt) / QUESTION_NUM_FONT_PT
  const digits = String(Math.max(1, displayNumber)).length
  const dotPt = 2.5 * scale
  const digitPt = 5.5 * scale
  return dotPt + digits * digitPt + 0.5 * scale
}

export function maxQuestionNumberTextWidthPt(
  maxDisplayNum: number,
  fontPt: number = QUESTION_NUM_FONT_PT,
): number {
  return estimateQuestionNumberTextWidthPt(Math.max(1, maxDisplayNum), fontPt)
}
