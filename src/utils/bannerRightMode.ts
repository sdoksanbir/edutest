/** Tema 1 — banner sağ alanı modu (sınav türü / D-Y-B / test no / kapalı) */

import type { HeaderConfig } from './corporateHeaderLayout'
import { isHeaderFieldVisible } from './headerFieldVisibility'
import { HEADER_FONT_FAMILY_CANVAS } from './corporateHeaderConstants'
import { clampPublicationLineFontPt } from './headerLeftColumn'

const CLASSIC_INFO_BAR_MIN_H_PT = 28
const CLASSIC_INFO_BAR_BADGE_INSET_PT = 6
const CLASSIC_BANNER_H_PT = 22
const CLASSIC_BANNER_GAP_PT = 2

export type BannerRightMode = 'examType' | 'score' | 'testNo' | 'hidden'

export const STYLE_1_SCORE_BOX_W_PT = 113
export const STYLE_1_SCORE_BOX_H_PT = 37
export const STYLE_1_SCORE_BOX_W_MIN_PT = 60
export const STYLE_1_SCORE_BOX_W_MAX_PT = 180
export const STYLE_1_SCORE_BOX_H_MIN_PT = 20
export const STYLE_1_SCORE_BOX_H_MAX_PT = 56
export const STYLE_1_SCORE_BOX_RADIUS_PT = 3
export const STYLE_1_SCORE_BOX_BORDER_PT = 1.25
export const STYLE_1_SCORE_BOX_BORDER_MIN_PT = 0.25
export const STYLE_1_SCORE_BOX_BORDER_MAX_PT = 4
export const STYLE_1_SCORE_LINE_PT = 0.75
export const STYLE_1_SCORE_LINE_MIN_PT = 0.25
export const STYLE_1_SCORE_LINE_MAX_PT = 4
export const STYLE_1_SCORE_LABEL_PT = 7
export const STYLE_1_SCORE_LABEL_MIN_PT = 4
export const STYLE_1_SCORE_LABEL_MAX_PT = 12

export const STYLE_1_TEST_NO_H_MIN_PT = 16
export const STYLE_1_TEST_NO_H_MAX_PT = 64
export const STYLE_1_TEST_NO_H_DEFAULT_PT = 22
export const STYLE_1_TEST_NO_W_MIN_PT = 40
export const STYLE_1_TEST_NO_W_MAX_PT = 160
export const STYLE_1_TEST_NO_W_DEFAULT_PT = 72
export const STYLE_1_TEST_NO_LABEL_PT = 8
export const STYLE_1_TEST_NO_NUM_PT = 10
export const STYLE_1_TEST_NO_PAD_X_PT = 6
export const STYLE_1_TEST_NO_PAD_Y_PT = 5
export const STYLE_1_TEST_NO_NUM_MIN_W_PT = 24
export const STYLE_1_TEST_NO_BORDER_PT = 1.25
export const STYLE_1_TEST_NO_RADIUS_PT = 2.5

const SCORE_LABELS = ['DOĞRU', 'YANLIŞ', 'BOŞ'] as const

export function parseBannerRightMode(raw: unknown): BannerRightMode | undefined {
  if (raw === 'examType' || raw === 'score' || raw === 'testNo' || raw === 'hidden') return raw
  return undefined
}

/** Açıkça kaydedilmişse onu kullan; yoksa eski fieldHidden.examType ile uyumlu. */
export function resolveBannerRightMode(config: HeaderConfig): BannerRightMode {
  const explicit = parseBannerRightMode(config.bannerRightMode)
  if (explicit) return explicit
  return isHeaderFieldVisible(config, 'examType') ? 'examType' : 'hidden'
}

export function resolveTestNoLabelFontPt(config: HeaderConfig): number {
  return clampPublicationLineFontPt(config.testNoLabelFontPt ?? STYLE_1_TEST_NO_LABEL_PT)
}

export function resolveTestNoNumFontPt(config: HeaderConfig): number {
  return clampPublicationLineFontPt(config.testNoNumFontPt ?? STYLE_1_TEST_NO_NUM_PT)
}

export function resolveTestNoLabelText(config: HeaderConfig): string {
  return String(config.testType ?? '').trim() || 'TEST'
}

export function resolveTestNoNumText(config: HeaderConfig): string {
  return (String(config.testNumber ?? '').trim() || '01').slice(0, 6)
}

export function resolveTestNoFillColor(config: HeaderConfig): string {
  return (config.testNoFillColor || config.accentColor || '#DC2626').trim()
}

export function resolveTestNoBorderColor(config: HeaderConfig): string {
  return (config.testNoBorderColor || config.accentColor || '#DC2626').trim()
}

export function resolveTestNoLabelColor(config: HeaderConfig): string {
  return (config.testNoLabelColor || '#FFFFFF').trim()
}

export function resolveTestNoNumColor(config: HeaderConfig): string {
  return (config.testNoNumColor || config.primaryColor || '#0A1931').trim()
}

export function clampScoreBoxWidthPt(pt: number): number {
  const n = Number.isFinite(pt) ? pt : STYLE_1_SCORE_BOX_W_PT
  return Math.max(STYLE_1_SCORE_BOX_W_MIN_PT, Math.min(STYLE_1_SCORE_BOX_W_MAX_PT, Math.round(n)))
}

export function clampScoreBoxHeightPt(pt: number): number {
  const n = Number.isFinite(pt) ? pt : STYLE_1_SCORE_BOX_H_PT
  return Math.max(STYLE_1_SCORE_BOX_H_MIN_PT, Math.min(STYLE_1_SCORE_BOX_H_MAX_PT, Math.round(n)))
}

export function clampScoreBoxLabelFontPt(pt: number): number {
  const n = Number.isFinite(pt) ? pt : STYLE_1_SCORE_LABEL_PT
  const stepped = Math.round(n * 2) / 2
  return Math.max(STYLE_1_SCORE_LABEL_MIN_PT, Math.min(STYLE_1_SCORE_LABEL_MAX_PT, stepped))
}

export function resolveScoreBoxWidthPt(config: HeaderConfig): number {
  return clampScoreBoxWidthPt(config.scoreBoxWidthPt ?? STYLE_1_SCORE_BOX_W_PT)
}

export function resolveScoreBoxHeightPt(config: HeaderConfig): number {
  return clampScoreBoxHeightPt(config.scoreBoxHeightPt ?? STYLE_1_SCORE_BOX_H_PT)
}

export function resolveScoreBoxLabelFontPt(config: HeaderConfig): number {
  return clampScoreBoxLabelFontPt(config.scoreBoxLabelFontPt ?? STYLE_1_SCORE_LABEL_PT)
}

export function resolveScoreBoxFillColor(config: HeaderConfig): string {
  return (config.scoreBoxFillColor || '#FFFFFF').trim()
}

export function resolveScoreBoxBorderColor(config: HeaderConfig): string {
  return (config.scoreBoxBorderColor || config.primaryColor || '#0A1931').trim()
}

export function resolveScoreBoxLabelColor(config: HeaderConfig): string {
  return (config.scoreBoxLabelColor || config.primaryColor || '#0A1931').trim()
}

export function clampScoreBoxBorderWidthPt(pt: number): number {
  const n = Number.isFinite(pt) ? pt : STYLE_1_SCORE_BOX_BORDER_PT
  const stepped = Math.round(n * 4) / 4
  return Math.max(STYLE_1_SCORE_BOX_BORDER_MIN_PT, Math.min(STYLE_1_SCORE_BOX_BORDER_MAX_PT, stepped))
}

export function clampScoreBoxLineWidthPt(pt: number): number {
  const n = Number.isFinite(pt) ? pt : STYLE_1_SCORE_LINE_PT
  const stepped = Math.round(n * 4) / 4
  return Math.max(STYLE_1_SCORE_LINE_MIN_PT, Math.min(STYLE_1_SCORE_LINE_MAX_PT, stepped))
}

export function resolveScoreBoxBorderWidthPt(config: HeaderConfig): number {
  return clampScoreBoxBorderWidthPt(config.scoreBoxBorderWidthPt ?? STYLE_1_SCORE_BOX_BORDER_PT)
}

export function resolveScoreBoxLineWidthPt(config: HeaderConfig): number {
  return clampScoreBoxLineWidthPt(config.scoreBoxLineWidthPt ?? STYLE_1_SCORE_LINE_PT)
}

export function clampTestNoWidthPt(pt: number): number {
  const n = Number.isFinite(pt) ? pt : STYLE_1_TEST_NO_W_DEFAULT_PT
  return Math.max(STYLE_1_TEST_NO_W_MIN_PT, Math.min(STYLE_1_TEST_NO_W_MAX_PT, Math.round(n)))
}

export function clampTestNoHeightPt(pt: number): number {
  const n = Number.isFinite(pt) ? pt : STYLE_1_TEST_NO_H_DEFAULT_PT
  return Math.max(STYLE_1_TEST_NO_H_MIN_PT, Math.min(STYLE_1_TEST_NO_H_MAX_PT, Math.round(n)))
}

export function resolveTestNoWidthPt(config: HeaderConfig): number {
  return clampTestNoWidthPt(config.testNoWidthPt ?? STYLE_1_TEST_NO_W_DEFAULT_PT)
}

export function resolveTestNoHeightPt(config: HeaderConfig): number {
  return clampTestNoHeightPt(config.testNoHeightPt ?? STYLE_1_TEST_NO_H_DEFAULT_PT)
}

export function style1TestNoHeightPt(config: HeaderConfig): number {
  return resolveTestNoHeightPt(config)
}

export function classicBadgeInnerHeightPt(config: HeaderConfig): number {
  const mode = resolveBannerRightMode(config)
  if (mode === 'testNo') return resolveTestNoHeightPt(config)
  if (mode === 'score') return resolveScoreBoxHeightPt(config)
  if (mode === 'examType') {
    const n = Number(config.examTypeBoxManualHeightPt)
    return Number.isFinite(n) ? Math.max(16, Math.min(64, Math.round(n))) : 36
  }
  return 0
}

export function resolveClassicInfoBarHeightPt(config: HeaderConfig): number {
  return Math.max(
    CLASSIC_INFO_BAR_MIN_H_PT,
    classicBadgeInnerHeightPt(config) + CLASSIC_INFO_BAR_BADGE_INSET_PT * 2,
  )
}

export function resolveClassicBannerAndInfoHeightPt(config: HeaderConfig): number {
  return CLASSIC_BANNER_H_PT + CLASSIC_BANNER_GAP_PT + resolveClassicInfoBarHeightPt(config)
}

/** Geriye uyumluluk — sabit yükseklik yerine dinamik */
export const STYLE_1_TEST_NO_H_PT = STYLE_1_TEST_NO_H_DEFAULT_PT

export function drawStyle1ScoreBoxCanvas(
  ctx: CanvasRenderingContext2D,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  config: HeaderConfig,
  scale: number,
  fontFamily = HEADER_FONT_FAMILY_CANVAS,
) {
  const fillColor = resolveScoreBoxFillColor(config)
  const borderColor = resolveScoreBoxBorderColor(config)
  const labelColor = resolveScoreBoxLabelColor(config)
  const muted = '#6B7280'
  const r = STYLE_1_SCORE_BOX_RADIUS_PT * scale
  const borderW = Math.max(0.5, resolveScoreBoxBorderWidthPt(config) * scale)
  const underlineW = Math.max(0.5, resolveScoreBoxLineWidthPt(config) * scale)

  ctx.fillStyle = fillColor
  ctx.beginPath()
  ctx.roundRect(boxX, boxY, boxW, boxH, r)
  ctx.fill()

  ctx.strokeStyle = borderColor
  ctx.lineWidth = borderW
  ctx.beginPath()
  ctx.roundRect(boxX, boxY, boxW, boxH, r)
  ctx.stroke()

  const cellW = boxW / 3
  const labelPx = resolveScoreBoxLabelFontPt(config) * scale
  const fontRatio = resolveScoreBoxLabelFontPt(config) / STYLE_1_SCORE_LABEL_PT
  const lineStroke = underlineW * fontRatio

  for (let i = 0; i < SCORE_LABELS.length; i++) {
    const label = SCORE_LABELS[i]!
    const cx = boxX + cellW * i + cellW / 2

    ctx.fillStyle = labelColor
    ctx.font = `700 ${labelPx}px ${fontFamily}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, cx, boxY + boxH * 0.32)

    const lineW = Math.min(cellW * 0.92, cellW * 0.55 * fontRatio)
    const ly = boxY + boxH * 0.72
    ctx.strokeStyle = muted
    ctx.lineWidth = lineStroke
    ctx.beginPath()
    ctx.moveTo(cx - lineW / 2, ly)
    ctx.lineTo(cx + lineW / 2, ly)
    ctx.stroke()
  }
}

/** Dikdörtgen: solda dolgulu etiket (sağ köşeler radius), sağda numara */
export function drawStyle1TestNoCanvas(
  ctx: CanvasRenderingContext2D,
  rightEdgeX: number,
  bodyY: number,
  bodyH: number,
  config: HeaderConfig,
  scale: number,
  fontFamily = HEADER_FONT_FAMILY_CANVAS,
) {
  const label = resolveTestNoLabelText(config).slice(0, 12)
  const num = resolveTestNoNumText(config)
  const labelPx = resolveTestNoLabelFontPt(config) * scale
  const numPx = resolveTestNoNumFontPt(config) * scale
  const padX = STYLE_1_TEST_NO_PAD_X_PT * scale
  const boxH = resolveTestNoHeightPt(config) * scale
  const boxW = resolveTestNoWidthPt(config) * scale
  const borderW = Math.max(1, STYLE_1_TEST_NO_BORDER_PT * scale)
  const radius = STYLE_1_TEST_NO_RADIUS_PT * scale
  const fillColor = resolveTestNoFillColor(config)
  const borderColor = resolveTestNoBorderColor(config)
  const labelColor = resolveTestNoLabelColor(config)
  const numColor = resolveTestNoNumColor(config)

  ctx.font = `700 ${labelPx}px ${fontFamily}`
  const labelW = ctx.measureText(label).width

  const naturalLeft = labelW + padX * 2
  const numMin = STYLE_1_TEST_NO_NUM_MIN_W_PT * scale
  const leftW =
    naturalLeft + numMin <= boxW ? naturalLeft : Math.max(boxW * 0.42, boxW - numMin)
  const rightW = boxW - leftW
  const boxX = rightEdgeX - boxW
  const boxY = bodyY + (bodyH - boxH) / 2

  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(boxX, boxY, boxW, boxH, radius)
  ctx.fill()

  // Etiket dolgusu — dört köşe radius (sağ üst/alt dahil)
  ctx.fillStyle = fillColor
  ctx.beginPath()
  ctx.roundRect(boxX, boxY, leftW, boxH, radius)
  ctx.fill()

  ctx.strokeStyle = borderColor
  ctx.lineWidth = borderW
  ctx.beginPath()
  ctx.roundRect(boxX, boxY, boxW, boxH, radius)
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const glyphCenterY = (text: string, fontPx: number) => {
    ctx.font = `700 ${fontPx}px ${fontFamily}`
    const m = ctx.measureText(text)
    const ascent = m.actualBoundingBoxAscent ?? fontPx * 0.72
    const descent = m.actualBoundingBoxDescent ?? fontPx * 0.2
    return boxY + (boxH + ascent - descent) / 2
  }
  ctx.fillStyle = labelColor
  ctx.fillText(label, boxX + leftW / 2, glyphCenterY(label, labelPx))

  ctx.fillStyle = numColor
  ctx.fillText(num, boxX + leftW + rightW / 2, glyphCenterY(num, numPx))
}
