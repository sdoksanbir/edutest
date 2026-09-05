/** Tema 1 — banner sağ alanı modu (sınav türü / D-Y-B / test no / kapalı) */

import type { PDFFont, PDFPage, RGB } from 'pdf-lib'
import { rgb } from 'pdf-lib'
import type { HeaderConfig } from './corporate-header-layout.js'
import { isHeaderFieldVisible } from './header-field-visibility.js'
import { clampPublicationLineFontPt } from './header-left-column.js'

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
export const STYLE_1_TEST_NO_H_PT = STYLE_1_TEST_NO_H_DEFAULT_PT

const SCORE_LABELS = ['DOĞRU', 'YANLIŞ', 'BOŞ'] as const

function hexToRgb(hex: string): RGB {
  const s = (hex || '').trim().replace(/^#/, '')
  if (s.length !== 6) return rgb(0.04, 0.1, 0.19)
  return rgb(
    parseInt(s.slice(0, 2), 16) / 255,
    parseInt(s.slice(2, 4), 16) / 255,
    parseInt(s.slice(4, 6), 16) / 255,
  )
}

export function parseBannerRightMode(raw: unknown): BannerRightMode | undefined {
  if (raw === 'examType' || raw === 'score' || raw === 'testNo' || raw === 'hidden') return raw
  return undefined
}

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

export function drawStyle1ScoreBoxPdf(
  page: PDFPage,
  font: PDFFont,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  config: HeaderConfig,
) {
  const fillColor = hexToRgb(resolveScoreBoxFillColor(config))
  const borderColor = hexToRgb(resolveScoreBoxBorderColor(config))
  const labelColor = hexToRgb(resolveScoreBoxLabelColor(config))
  const muted = rgb(0.42, 0.45, 0.5)
  const borderW = resolveScoreBoxBorderWidthPt(config)
  const underlineW = resolveScoreBoxLineWidthPt(config)

  page.drawRectangle({
    x: boxX,
    y: boxY,
    width: boxW,
    height: boxH,
    color: fillColor,
    borderColor,
    borderWidth: borderW,
  })

  const cellW = boxW / 3
  const labelSize = resolveScoreBoxLabelFontPt(config)
  const fontRatio = labelSize / STYLE_1_SCORE_LABEL_PT
  const lineStroke = underlineW * fontRatio

  for (let i = 0; i < SCORE_LABELS.length; i++) {
    const label = SCORE_LABELS[i]!
    const cx = boxX + cellW * i + cellW / 2
    const labelW = font.widthOfTextAtSize(label, labelSize)
    page.drawText(label, {
      x: cx - labelW / 2,
      y: boxY + boxH * 0.58,
      size: labelSize,
      font,
      color: labelColor,
    })

    const lineW = Math.min(cellW * 0.92, cellW * 0.55 * fontRatio)
    const ly = boxY + boxH * 0.28
    page.drawLine({
      start: { x: cx - lineW / 2, y: ly },
      end: { x: cx + lineW / 2, y: ly },
      thickness: lineStroke,
      color: muted,
    })
  }
}

/** Dikdörtgen: solda dolgulu etiket (sağ köşeler radius), sağda numara */
export function drawStyle1TestNoPdf(
  page: PDFPage,
  font: PDFFont,
  rightEdgeX: number,
  bodyBottom: number,
  bodyH: number,
  config: HeaderConfig,
) {
  const label = resolveTestNoLabelText(config).slice(0, 12)
  const num = resolveTestNoNumText(config)
  const labelSize = resolveTestNoLabelFontPt(config)
  const numSize = resolveTestNoNumFontPt(config)
  const padX = STYLE_1_TEST_NO_PAD_X_PT
  const boxH = resolveTestNoHeightPt(config)
  const boxW = resolveTestNoWidthPt(config)
  const borderW = STYLE_1_TEST_NO_BORDER_PT
  const fillColor = hexToRgb(resolveTestNoFillColor(config))
  const borderColor = hexToRgb(resolveTestNoBorderColor(config))
  const labelColor = hexToRgb(resolveTestNoLabelColor(config))
  const numColor = hexToRgb(resolveTestNoNumColor(config))

  const labelW = font.widthOfTextAtSize(label, labelSize)
  const numW = font.widthOfTextAtSize(num, numSize)
  const naturalLeft = labelW + padX * 2
  const leftW =
    naturalLeft + STYLE_1_TEST_NO_NUM_MIN_W_PT <= boxW
      ? naturalLeft
      : Math.max(boxW * 0.42, boxW - STYLE_1_TEST_NO_NUM_MIN_W_PT)
  const rightW = boxW - leftW
  const boxX = rightEdgeX - boxW
  const boxY = bodyBottom + (bodyH - boxH) / 2

  page.drawRectangle({
    x: boxX,
    y: boxY,
    width: boxW,
    height: boxH,
    color: rgb(1, 1, 1),
    borderColor,
    borderWidth: borderW,
  })
  page.drawRectangle({
    x: boxX,
    y: boxY,
    width: leftW,
    height: boxH,
    color: fillColor,
  })

  const midY = boxY + boxH / 2
  page.drawText(label, {
    x: boxX + (leftW - labelW) / 2,
    y: midY - labelSize * 0.36,
    size: labelSize,
    font,
    color: labelColor,
  })

  page.drawText(num, {
    x: boxX + leftW + (rightW - numW) / 2,
    y: midY - numSize * 0.36,
    size: numSize,
    font,
    color: numColor,
  })
}
