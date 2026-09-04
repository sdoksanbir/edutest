/** Tema 1 — sağ kutu (sınav / test türü) */

import { rgb, type PDFPage, type PDFFont, type RGB } from 'pdf-lib'
import type { HeaderConfig } from './corporate-header-layout.js'
import {
  clampPublicationLineFontPt,
  type PublicationLineSpec,
} from './header-left-column.js'
import { isHeaderFieldVisible } from './header-field-visibility.js'

export type ExamTypeBoxBorderStyle = 'none' | 'solid' | 'dashed' | 'dotted'
export type ExamTypeTextAlign = 'left' | 'center' | 'right'

export const EXAM_TYPE_BOX_BORDER_MIN_PT = 0.5
export const EXAM_TYPE_BOX_BORDER_MAX_PT = 4
export const EXAM_TYPE_BOX_BORDER_DEFAULT_PT = 1.5
export const EXAM_TYPE_DIVIDER_MIN_PT = 0.5
export const EXAM_TYPE_DIVIDER_MAX_PT = 3
export const EXAM_TYPE_DIVIDER_DEFAULT_PT = 0.75
export const EXAM_TYPE_BOX_RADIUS_PT = 4
export const EXAM_TYPE_BOX_PAD_X_PT = 4
export const EXAM_TYPE_BOX_PAD_X_MIN_PT = 0
export const EXAM_TYPE_BOX_PAD_X_MAX_PT = 16
export const EXAM_TYPE_BOX_PAD_Y_PT = 4
export const EXAM_TYPE_BOX_PAD_Y_MIN_PT = 0
export const EXAM_TYPE_BOX_PAD_Y_MAX_PT = 16
export const EXAM_TYPE_BOX_MIN_W_PT = 32
export const EXAM_TYPE_BOX_MANUAL_MIN_W_PT = 32
export const EXAM_TYPE_BOX_MANUAL_MAX_W_PT = 160
export const EXAM_TYPE_BOX_MANUAL_DEFAULT_W_PT = 96
export const EXAM_TYPE_BOX_MANUAL_MIN_H_PT = 20
export const EXAM_TYPE_BOX_MANUAL_MAX_H_PT = 72
export const EXAM_TYPE_BOX_MANUAL_DEFAULT_H_PT = 36
export const EXAM_TYPE_BOX_CENTER_GAP_PT = 6
export const EXAM_TYPE_LINE1_FONT_DEFAULT_PT = 9
export const EXAM_TYPE_LINE2_FONT_DEFAULT_PT = 10

export function parseExamTypeBoxBorderStyle(raw: unknown): ExamTypeBoxBorderStyle {
  if (raw === 'none' || raw === 'solid' || raw === 'dashed' || raw === 'dotted') return raw
  return 'solid'
}

export function parseExamTypeDividerStyle(raw: unknown): ExamTypeBoxBorderStyle {
  if (raw === 'none' || raw === 'solid' || raw === 'dashed' || raw === 'dotted') return raw
  return 'none'
}

export function parseExamTypeTextAlign(raw: unknown): ExamTypeTextAlign {
  if (raw === 'left' || raw === 'center' || raw === 'right') return raw
  return 'center'
}

export function clampExamTypeBoxBorderWidthPt(pt: number): number {
  return Math.max(
    EXAM_TYPE_BOX_BORDER_MIN_PT,
    Math.min(EXAM_TYPE_BOX_BORDER_MAX_PT, Math.round(pt * 10) / 10),
  )
}

export function clampExamTypeDividerWidthPt(pt: number): number {
  return Math.max(
    EXAM_TYPE_DIVIDER_MIN_PT,
    Math.min(EXAM_TYPE_DIVIDER_MAX_PT, Math.round(pt * 10) / 10),
  )
}

function splitExamTypeToLines(examType: string): { line1: string; line2: string } {
  const t = examType.trim()
  if (!t) return { line1: 'TYT-AYT', line2: 'TEST' }
  const idx = t.lastIndexOf(' ')
  if (idx > 0) return { line1: t.slice(0, idx).trim(), line2: t.slice(idx + 1).trim() }
  return { line1: t, line2: '' }
}

export function examTypeLineSpecs(config: HeaderConfig): PublicationLineSpec[] {
  if (
    config.bannerRightMode === 'score' ||
    config.bannerRightMode === 'testNo' ||
    config.bannerRightMode === 'hidden'
  ) {
    return []
  }
  if (config.bannerRightMode !== 'examType' && !isHeaderFieldVisible(config, 'examType')) return []
  const fallback = splitExamTypeToLines(config.examType || '')
  const specs: PublicationLineSpec[] = []
  const l1 = String(config.examTypeLine1 ?? '').trim() || fallback.line1
  const l2 = String(config.examTypeLine2 ?? '').trim() || fallback.line2
  const primary = config.primaryColor || '#0A1931'
  const accent = config.accentColor || '#DC2626'

  if (l1) {
    specs.push({
      text: l1,
      fontPt: clampPublicationLineFontPt(
        config.examTypeLine1FontPt ?? EXAM_TYPE_LINE1_FONT_DEFAULT_PT,
      ),
      color: (config.examTypeLine1Color || primary).trim(),
    })
  }
  if (l2) {
    specs.push({
      text: l2,
      fontPt: clampPublicationLineFontPt(
        config.examTypeLine2FontPt ?? EXAM_TYPE_LINE2_FONT_DEFAULT_PT,
      ),
      color: (config.examTypeLine2Color || accent).trim(),
    })
  }
  return specs.slice(0, 2)
}

export function examTypeDisplayText(config: HeaderConfig): string {
  return examTypeLineSpecs(config)
    .map((l) => l.text)
    .join(' ')
    .trim()
}

export function measureExamTypeBoxWidthPt(
  config: HeaderConfig,
  measureTextWidthPt: (text: string, fontPt: number) => number,
  maxAvailablePt?: number,
): number {
  const lines = examTypeLineSpecs(config)
  if (lines.length === 0) return 0

  let contentW = 0
  for (const line of lines) {
    contentW = Math.max(contentW, measureTextWidthPt(line.text.slice(0, 28), line.fontPt))
  }

  let w = contentW + resolveExamTypeBoxPadXPt(config) * 2
  w = Math.max(EXAM_TYPE_BOX_MIN_W_PT, Math.ceil(w * 10) / 10)
  if (maxAvailablePt != null && maxAvailablePt > 0) {
    w = Math.min(w, maxAvailablePt)
  }
  return w
}

export function clampExamTypeBoxManualWidthPt(pt: number): number {
  return Math.max(
    EXAM_TYPE_BOX_MANUAL_MIN_W_PT,
    Math.min(EXAM_TYPE_BOX_MANUAL_MAX_W_PT, Math.round(pt)),
  )
}

export function resolveExamTypeBoxWidthPt(
  config: HeaderConfig,
  maxAvailablePt?: number,
): number {
  let w = clampExamTypeBoxManualWidthPt(
    config.examTypeBoxManualWidthPt ?? EXAM_TYPE_BOX_MANUAL_DEFAULT_W_PT,
  )
  if (maxAvailablePt != null && maxAvailablePt > 0) {
    w = Math.min(w, maxAvailablePt)
  }
  return Math.max(w, EXAM_TYPE_BOX_MIN_W_PT)
}

export function clampExamTypeBoxManualHeightPt(pt: number): number {
  return Math.max(
    EXAM_TYPE_BOX_MANUAL_MIN_H_PT,
    Math.min(EXAM_TYPE_BOX_MANUAL_MAX_H_PT, Math.round(pt)),
  )
}

export function resolveExamTypeBoxHeightPt(config: HeaderConfig): number {
  return clampExamTypeBoxManualHeightPt(
    config.examTypeBoxManualHeightPt ?? EXAM_TYPE_BOX_MANUAL_DEFAULT_H_PT,
  )
}

export function clampExamTypeBoxPadXPt(pt: number): number {
  return Math.max(
    EXAM_TYPE_BOX_PAD_X_MIN_PT,
    Math.min(EXAM_TYPE_BOX_PAD_X_MAX_PT, Math.round(pt)),
  )
}

export function clampExamTypeBoxPadYPt(pt: number): number {
  return Math.max(
    EXAM_TYPE_BOX_PAD_Y_MIN_PT,
    Math.min(EXAM_TYPE_BOX_PAD_Y_MAX_PT, Math.round(pt)),
  )
}

export function resolveExamTypeBoxPadXPt(config: HeaderConfig): number {
  return clampExamTypeBoxPadXPt(config.examTypeBoxPadXPt ?? EXAM_TYPE_BOX_PAD_X_PT)
}

export function resolveExamTypeBoxPadYPt(config: HeaderConfig): number {
  return clampExamTypeBoxPadYPt(config.examTypeBoxPadYPt ?? EXAM_TYPE_BOX_PAD_Y_PT)
}

export function examTypeBoxBorderStyle(config: HeaderConfig): ExamTypeBoxBorderStyle {
  return parseExamTypeBoxBorderStyle(config.examTypeBoxBorderStyle)
}

export function examTypeBoxBorderWidthPt(config: HeaderConfig): number {
  return clampExamTypeBoxBorderWidthPt(
    config.examTypeBoxBorderWidthPt ?? EXAM_TYPE_BOX_BORDER_DEFAULT_PT,
  )
}

export function examTypeBoxBorderColor(config: HeaderConfig): string {
  return (config.examTypeBoxBorderColor || config.primaryColor || '#0A1931').trim()
}

export function examTypeBoxFillEnabled(config: HeaderConfig): boolean {
  const raw: unknown = config.examTypeBoxFillEnabled
  if (raw === true || raw === 1) return true
  if (raw === false || raw === 0) return false
  if (typeof raw === 'string') return raw.toLowerCase() === 'true'
  return false
}

export function examTypeBoxFillColor(config: HeaderConfig): string {
  return (config.examTypeBoxFillColor || '#F3F4F6').trim()
}

export function examTypeTextAlign(config: HeaderConfig): ExamTypeTextAlign {
  return parseExamTypeTextAlign(config.examTypeTextAlign)
}

export function examTypeDividerStyle(config: HeaderConfig): ExamTypeBoxBorderStyle {
  return parseExamTypeDividerStyle(config.examTypeDividerStyle)
}

export function examTypeDividerWidthPt(config: HeaderConfig): number {
  return clampExamTypeDividerWidthPt(
    config.examTypeDividerWidthPt ?? EXAM_TYPE_DIVIDER_DEFAULT_PT,
  )
}

export function examTypeDividerColor(config: HeaderConfig): string {
  return (config.examTypeDividerColor || config.accentColor || '#DC2626').trim()
}

function hexToRgb(hex: string): RGB {
  const s = (hex || '').trim().replace(/^#/, '')
  if (s.length !== 6) return rgb(0.04, 0.1, 0.19)
  return rgb(
    parseInt(s.slice(0, 2), 16) / 255,
    parseInt(s.slice(2, 4), 16) / 255,
    parseInt(s.slice(4, 6), 16) / 255,
  )
}

function roundRectPath(w: number, h: number, r: number): string {
  const rad = Math.min(r, w / 2, h / 2)
  return [
    `M ${rad},0`,
    `L ${w - rad},0`,
    `Q ${w},0 ${w},${rad}`,
    `L ${w},${h - rad}`,
    `Q ${w},${h} ${w - rad},${h}`,
    `L ${rad},${h}`,
    `Q 0,${h} 0,${h - rad}`,
    `L 0,${rad}`,
    `Q 0,0 ${rad},0`,
    'Z',
  ].join(' ')
}

function pdfDashArray(style: ExamTypeBoxBorderStyle): number[] | undefined {
  if (style === 'dashed') return [4, 3]
  if (style === 'dotted') return [1, 2]
  return undefined
}

function examTypeTextPdfX(
  align: ExamTypeTextAlign,
  boxX: number,
  boxW: number,
  pad: number,
  textW: number,
): number {
  if (align === 'left') return boxX + pad
  if (align === 'right') return boxX + boxW - pad - textW
  return boxX + (boxW - textW) / 2
}

/** PDF — kutu arka plan dolgusu (boxY alt kenar, çerçeve ile aynı yuvarlatılmış köşe) */
export function drawExamTypeBoxFillPdf(
  page: PDFPage,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  config: HeaderConfig,
) {
  if (!examTypeBoxFillEnabled(config) || boxW <= 0 || boxH <= 0) return
  page.drawSvgPath(roundRectPath(boxW, boxH, EXAM_TYPE_BOX_RADIUS_PT), {
    x: boxX,
    y: boxY + boxH,
    color: hexToRgb(examTypeBoxFillColor(config)),
    borderWidth: 0,
  })
}

/** PDF — kutu çerçevesi (boxY alt kenar) */
export function drawExamTypeBoxBorderPdf(
  page: PDFPage,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  config: HeaderConfig,
) {
  const style = examTypeBoxBorderStyle(config)
  if (style === 'none') return
  const borderColor = hexToRgb(examTypeBoxBorderColor(config))
  const borderWidth = examTypeBoxBorderWidthPt(config)
  const dash = pdfDashArray(style)

  if (style === 'solid') {
    page.drawSvgPath(roundRectPath(boxW, boxH, EXAM_TYPE_BOX_RADIUS_PT), {
      x: boxX,
      y: boxY + boxH,
      borderColor,
      borderWidth,
    })
    return
  }

  page.drawRectangle({
    x: boxX,
    y: boxY,
    width: boxW,
    height: boxH,
    borderColor,
    borderWidth,
    borderDashArray: dash,
  })
}

/** PDF — hizalama, ara çizgi, tek satırda dikey ortalama (boxY alt kenar) */
export function drawExamTypeTextInBoxPdf(
  page: PDFPage,
  font: PDFFont,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  config: HeaderConfig,
) {
  const lines = examTypeLineSpecs(config)
  if (lines.length === 0 || boxW <= 0 || boxH <= 0) return

  const padX = resolveExamTypeBoxPadXPt(config)
  const padY = resolveExamTypeBoxPadYPt(config)
  const lineGap = 2
  const dividerGap = 1.5
  const divInset = padX
  const align = examTypeTextAlign(config)
  const divStyle = examTypeDividerStyle(config)
  const showDivider = lines.length === 2 && divStyle !== 'none'
  const divThickness = examTypeDividerWidthPt(config)

  const sizesPt = lines.map((l) => l.fontPt)
  let blockH = sizesPt[0]!
  if (lines.length === 2) {
    blockH += showDivider ? dividerGap + divThickness + dividerGap : lineGap
    blockH += sizesPt[1]!
  }
  let shrink = 1
  if (blockH > boxH) shrink = Math.max(0.5, boxH / blockH)

  const topY = boxY + boxH - padY - (boxH - padY * 2 - blockH * shrink) / 2
  let yTop = topY

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const fontSize = sizesPt[i]! * shrink
    yTop -= fontSize * 0.78
    const txt = line.text.slice(0, 28)
    const tw = font.widthOfTextAtSize(txt, fontSize)
    page.drawText(txt, {
      x: examTypeTextPdfX(align, boxX, boxW, padX, tw),
      y: yTop,
      size: fontSize,
      font,
      color: hexToRgb(line.color),
    })
    yTop -= fontSize * 0.22

    if (i === 0 && lines.length === 2) {
      if (showDivider) {
        yTop -= dividerGap * shrink
        const divY = yTop - divThickness / 2
        page.drawLine({
          start: { x: boxX + divInset, y: divY },
          end: { x: boxX + boxW - divInset, y: divY },
          thickness: divThickness,
          color: hexToRgb(examTypeDividerColor(config)),
          dashArray: pdfDashArray(divStyle),
        })
        yTop -= divThickness + dividerGap * shrink
      } else {
        yTop -= lineGap * shrink
      }
    }
  }
}
