export const HEADER_FONT_SIZE_OFFSET_MIN_PT = -5
export const HEADER_FONT_SIZE_OFFSET_MAX_PT = 5
export const HEADER_FONT_SIZE_OFFSET_STEP_PT = 0.5

export function clampHeaderFontSizeOffsetPt(value: number): number {
  const stepped = Math.round(value / HEADER_FONT_SIZE_OFFSET_STEP_PT) * HEADER_FONT_SIZE_OFFSET_STEP_PT
  return Math.max(
    HEADER_FONT_SIZE_OFFSET_MIN_PT,
    Math.min(HEADER_FONT_SIZE_OFFSET_MAX_PT, stepped)
  )
}

export function headerFontPt(basePt: number, offsetPt: number): number {
  return Math.max(1, basePt + offsetPt)
}

export function parseHeaderFontSizeOffsetPt(raw: unknown): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 0
  return clampHeaderFontSizeOffsetPt(n)
}
