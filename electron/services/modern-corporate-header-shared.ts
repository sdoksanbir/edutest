/** Modern Kurumsal (Tema 1) — electron PDF ile uyumlu sabitler */

export const MM_TO_PT = 72 / 25.4

export const MODERN_PRIMARY = '#0A1931'
export const MODERN_ACCENT = '#DC2626'
export const MODERN_GOLD = '#C59B27'
export const MODERN_GOLD_LIGHT = '#D4AF37'
export const MODERN_GOLD_DARK = '#9A7518'

export const MODERN_FOOTER_RED_RATIO = 0.45
export const MODERN_BOX_BORDER_PT = 1.5
export const MODERN_DIVIDER_V_PT = 1.2
export const MODERN_TOPIC_LINE_PT = 1.0
export const MODERN_TOPIC_COL_PAD_PT = 2
export const MODERN_TOPIC_TEXT_GAP_PT = 6
export const MODERN_BOX_DIVIDER_PT = 1.0

/** Tema 1 — ders adı dolgu bandı */
export const SUBJECT_PILL_PAD_X_DEFAULT_PT = 8
export const SUBJECT_PILL_PAD_X_MIN_PT = 0
export const SUBJECT_PILL_PAD_X_MAX_PT = 24
export const SUBJECT_PILL_PAD_Y_DEFAULT_PT = 4
export const SUBJECT_PILL_PAD_Y_MIN_PT = 0
export const SUBJECT_PILL_PAD_Y_MAX_PT = 16
export const SUBJECT_PILL_RADIUS_PT = 3
export const SUBJECT_PILL_TEXT_OFFSET_Y_DEFAULT_PT = -2
export const SUBJECT_PILL_TEXT_OFFSET_Y_MIN_PT = -12
export const SUBJECT_PILL_TEXT_OFFSET_Y_MAX_PT = 12
export const SUBJECT_TOPIC_GAP_DEFAULT_PT = 3
export const SUBJECT_TOPIC_GAP_MIN_PT = 0
export const SUBJECT_TOPIC_GAP_MAX_PT = 16
export const TOPIC_SUBTOPIC_GAP_DEFAULT_PT = 1
export const TOPIC_SUBTOPIC_GAP_MIN_PT = 0
export const TOPIC_SUBTOPIC_GAP_MAX_PT = 16

export const SUBJECT_PILL_PAD_X_PT = SUBJECT_PILL_PAD_X_DEFAULT_PT
export const SUBJECT_PILL_PAD_Y_PT = SUBJECT_PILL_PAD_Y_DEFAULT_PT

export function clampSubjectPillPadXPt(pt: number): number {
  return Math.max(
    SUBJECT_PILL_PAD_X_MIN_PT,
    Math.min(SUBJECT_PILL_PAD_X_MAX_PT, Math.round(pt)),
  )
}

export function clampSubjectPillPadYPt(pt: number): number {
  return Math.max(
    SUBJECT_PILL_PAD_Y_MIN_PT,
    Math.min(SUBJECT_PILL_PAD_Y_MAX_PT, Math.round(pt)),
  )
}

export function resolveSubjectPillPadXPt(config: {
  subjectPillPadXPt?: number
  subjectPillPadPt?: number
}): number {
  return clampSubjectPillPadXPt(
    config.subjectPillPadXPt ?? config.subjectPillPadPt ?? SUBJECT_PILL_PAD_X_DEFAULT_PT,
  )
}

export function resolveSubjectPillPadYPt(config: {
  subjectPillPadYPt?: number
  subjectPillPadPt?: number
}): number {
  return clampSubjectPillPadYPt(
    config.subjectPillPadYPt ?? config.subjectPillPadPt ?? SUBJECT_PILL_PAD_Y_DEFAULT_PT,
  )
}

export function clampSubjectPillPadPt(pt: number): number {
  return clampSubjectPillPadXPt(pt)
}

export function clampSubjectTopicGapPt(pt: number): number {
  return Math.max(
    SUBJECT_TOPIC_GAP_MIN_PT,
    Math.min(SUBJECT_TOPIC_GAP_MAX_PT, Math.round(pt)),
  )
}

export function clampTopicSubTopicGapPt(pt: number): number {
  return Math.max(
    TOPIC_SUBTOPIC_GAP_MIN_PT,
    Math.min(TOPIC_SUBTOPIC_GAP_MAX_PT, Math.round(pt)),
  )
}

export function subjectPillHeightPt(fontPt: number, padYPt = SUBJECT_PILL_PAD_Y_DEFAULT_PT): number {
  return fontPt + padYPt * 2
}

export const SUBJECT_PILL_TEXT_COLOR_DEFAULT = '#FFFFFF'

export function resolveSubjectPillFillColor(config: {
  subjectPillFillColor?: string
  accentColor?: string
}): string {
  const custom = config.subjectPillFillColor?.trim()
  return custom || config.accentColor || MODERN_ACCENT
}

export function resolveSubjectPillTextColor(config: {
  subjectPillTextColor?: string
}): string {
  const custom = config.subjectPillTextColor?.trim()
  return custom || SUBJECT_PILL_TEXT_COLOR_DEFAULT
}

export function clampSubjectPillTextOffsetYPt(pt: number): number {
  return Math.max(
    SUBJECT_PILL_TEXT_OFFSET_Y_MIN_PT,
    Math.min(SUBJECT_PILL_TEXT_OFFSET_Y_MAX_PT, Math.round(pt)),
  )
}

export function resolveSubjectPillTextOffsetYPt(config: {
  subjectPillTextOffsetYPt?: number
}): number {
  return clampSubjectPillTextOffsetYPt(
    config.subjectPillTextOffsetYPt ?? SUBJECT_PILL_TEXT_OFFSET_Y_DEFAULT_PT,
  )
}

export type TopicDecorativeLines = {
  leftStart: number
  leftEnd: number
  rightStart: number
  rightEnd: number
}

export function topicDecorativeLineGeometry(
  colLeft: number,
  colRight: number,
  centerX: number,
  textWidth: number,
  scale = 1,
): TopicDecorativeLines {
  const pad = MODERN_TOPIC_COL_PAD_PT * scale
  const gap = MODERN_TOPIC_TEXT_GAP_PT * scale
  const edgeLeft = colLeft + pad
  const edgeRight = colRight - pad
  const textLeft = centerX - textWidth / 2
  const textRight = centerX + textWidth / 2
  return {
    leftStart: edgeLeft,
    leftEnd: Math.max(edgeLeft, textLeft - gap),
    rightStart: Math.min(edgeRight, textRight + gap),
    rightEnd: edgeRight,
  }
}

/** 2+ sayfa — metin satırı ile alt şerit arası */
export const RUNNING_TEXT_STRIPE_GAP_MM = 0.3
export const STYLE_1_RUNNING_BODY_PT = 7.2 * MM_TO_PT
export const STYLE_1_RUNNING_STRIPE_GAP_PT = RUNNING_TEXT_STRIPE_GAP_MM * MM_TO_PT
export const STYLE_1_RUNNING_STRIPE_PT = 0.6 * MM_TO_PT
export const STYLE_1_RUNNING_GAP_BELOW_PT = 1.0 * MM_TO_PT
export const STYLE_1_RUNNING_TOTAL_PT =
  STYLE_1_RUNNING_STRIPE_PT +
  STYLE_1_RUNNING_STRIPE_GAP_PT +
  STYLE_1_RUNNING_BODY_PT +
  STYLE_1_RUNNING_STRIPE_GAP_PT +
  STYLE_1_RUNNING_STRIPE_PT +
  STYLE_1_RUNNING_GAP_BELOW_PT
export const STYLE_1_RUNNING_TOTAL_MM = STYLE_1_RUNNING_TOTAL_PT / MM_TO_PT

export const STYLE_1_RUNNING_LOGO_PT = 10
export const STYLE_1_RUNNING_FONT_PT = 7
export const STYLE_1_RUNNING_FONT_RIGHT_PT = 6.5

export function spacedLetters(text: string): string {
  return text.replace(/\s+/g, '').split('').join(' ')
}

export function publisherBrandLines(config: {
  publisherLine?: string
  brandName?: string
}): { main: string; subSpaced: string } {
  const line = (config.publisherLine || '').trim()
  const yayinIdx = line.indexOf('YAYIN')
  if (yayinIdx > 0) {
    return {
      main: line.slice(0, yayinIdx).trim(),
      subSpaced: spacedLetters(line.slice(yayinIdx).trim()),
    }
  }
  return {
    main: (config.brandName || 'EDUMATH').trim(),
    subSpaced: spacedLetters('YAYINLARI'),
  }
}

export function slantedBarGeometry(
  ml: number,
  contentW: number,
  stripeH: number,
  redRatio = MODERN_FOOTER_RED_RATIO,
): { redEnd: number; slantW: number } {
  const redEnd = ml + contentW * redRatio
  const slantW = Math.max(stripeH * 1.1, contentW * 0.018)
  return { redEnd, slantW }
}
