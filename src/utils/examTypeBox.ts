/** Tema 1 — sağ kutu (sınav / test türü) */

import type { HeaderConfig } from './corporateHeaderLayout'
import {
  clampPublicationLineFontPt,
  PUBLICATION_LINE1_COLOR_DEFAULT,
  PUBLICATION_LINE2_COLOR_DEFAULT,
  type PublicationLineSpec,
} from './headerLeftColumn'
import { HEADER_FONT_FAMILY_CANVAS } from './corporateHeaderConstants'
import { isHeaderFieldVisible } from './headerFieldVisibility'

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
/** Orta sütun ile sağ kutu arası minimum boşluk */
export const EXAM_TYPE_BOX_CENTER_GAP_PT = 6
/** Sınav türü 1. satır varsayılan punto */
export const EXAM_TYPE_LINE1_FONT_DEFAULT_PT = 9
/** Ders adı (2. satır) varsayılan punto */
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

export function splitExamTypeToLines(examType: string): { line1: string; line2: string } {
  const t = examType.trim()
  if (!t) return { line1: 'TYT-AYT', line2: 'TEST' }
  const idx = t.lastIndexOf(' ')
  if (idx > 0) return { line1: t.slice(0, idx).trim(), line2: t.slice(idx + 1).trim() }
  return { line1: t, line2: '' }
}

export function examTypeLineSpecs(config: HeaderConfig): PublicationLineSpec[] {
  // score / testNo / hidden: sınav türü kutusu çizilmez
  if (
    config.bannerRightMode === 'score' ||
    config.bannerRightMode === 'testNo' ||
    config.bannerRightMode === 'hidden'
  ) {
    return []
  }
  // examType modu veya legacy: görünürlük kontrolü
  if (config.bannerRightMode !== 'examType' && !isHeaderFieldVisible(config, 'examType')) return []
  const fallback = splitExamTypeToLines(config.examType || '')
  const specs: PublicationLineSpec[] = []
  const l1 = String(config.examTypeLine1 ?? '').trim() || fallback.line1
  const l2 = String(config.examTypeLine2 ?? '').trim() || fallback.line2
  const primary = config.primaryColor || PUBLICATION_LINE1_COLOR_DEFAULT
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

export function shouldDrawExamTypeBoxContent(config: HeaderConfig): boolean {
  return examTypeLineSpecs(config).length > 0
}

/** İçeriğe göre kutu genişliği (pt) */
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

/** Slider ile ayarlanan kutu genişliği (pt) */
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

/** Slider ile ayarlanan kutu yüksekliği (pt) */
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
  return (config.examTypeBoxBorderColor || config.primaryColor || PUBLICATION_LINE1_COLOR_DEFAULT).trim()
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
  return (config.examTypeDividerColor || config.accentColor || PUBLICATION_LINE2_COLOR_DEFAULT).trim()
}

function canvasDashPattern(style: ExamTypeBoxBorderStyle, scale: number): number[] {
  if (style === 'dashed') return [5 * scale, 3 * scale]
  if (style === 'dotted') return [1.5 * scale, 2.5 * scale]
  return []
}

/** Canvas — yuvarlatılmış kutu arka plan dolgusu */
export function drawExamTypeBoxFillCanvas(
  ctx: CanvasRenderingContext2D,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  config: HeaderConfig,
  scale: number,
) {
  if (!examTypeBoxFillEnabled(config) || boxW <= 0 || boxH <= 0) return
  const r = EXAM_TYPE_BOX_RADIUS_PT * scale
  ctx.save()
  ctx.fillStyle = examTypeBoxFillColor(config)
  ctx.beginPath()
  ctx.roundRect(boxX, boxY, boxW, boxH, r)
  ctx.fill()
  ctx.restore()
}

/** Canvas — yuvarlatılmış kutu çerçevesi */
export function drawExamTypeBoxBorderCanvas(
  ctx: CanvasRenderingContext2D,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  config: HeaderConfig,
  scale: number,
) {
  const style = examTypeBoxBorderStyle(config)
  if (style === 'none') return
  const borderW = examTypeBoxBorderWidthPt(config) * scale
  const r = EXAM_TYPE_BOX_RADIUS_PT * scale
  ctx.save()
  ctx.strokeStyle = examTypeBoxBorderColor(config)
  ctx.lineWidth = borderW
  const dash = canvasDashPattern(style, scale)
  if (dash.length) ctx.setLineDash(dash)
  ctx.beginPath()
  ctx.roundRect(boxX, boxY, boxW, boxH, r)
  ctx.stroke()
  ctx.restore()
}

function examTypeTextX(
  align: ExamTypeTextAlign,
  boxX: number,
  boxW: number,
  pad: number,
): number {
  if (align === 'left') return boxX + pad
  if (align === 'right') return boxX + boxW - pad
  return boxX + boxW / 2
}

/** Canvas — hizalama, ara çizgi, tek satırda dikey ortalama */
export function drawExamTypeTextInBox(
  ctx: CanvasRenderingContext2D,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  config: HeaderConfig,
  scale: number,
  fontFamily = HEADER_FONT_FAMILY_CANVAS,
) {
  const lines = examTypeLineSpecs(config)
  if (lines.length === 0 || boxW <= 0 || boxH <= 0) return

  const padX = resolveExamTypeBoxPadXPt(config) * scale
  const padY = resolveExamTypeBoxPadYPt(config) * scale
  const lineGap = 2 * scale
  const dividerGap = 1.5 * scale
  const divInset = padX
  const align = examTypeTextAlign(config)
  const divStyle = examTypeDividerStyle(config)
  const showDivider = lines.length === 2 && divStyle !== 'none'
  const divThickness = examTypeDividerWidthPt(config) * scale

  const sizesPx = lines.map((l) => l.fontPt * scale)
  let blockH = sizesPx[0]!
  if (lines.length === 2) {
    blockH += showDivider ? dividerGap + divThickness + dividerGap : lineGap
    blockH += sizesPx[1]!
  }
  let shrink = 1
  if (blockH > boxH) shrink = Math.max(0.5, boxH / blockH)

  const tx = examTypeTextX(align, boxX, boxW, padX)

  ctx.save()
  ctx.textAlign = align
  ctx.textBaseline = 'alphabetic'

  let y = boxY + padY + (boxH - padY * 2 - blockH * shrink) / 2

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const fontPx = sizesPx[i]! * shrink
    y += fontPx * 0.78
    ctx.fillStyle = line.color
    ctx.font = `700 ${fontPx}px ${fontFamily}`
    ctx.fillText(line.text.slice(0, 28), tx, y)
    y += fontPx * 0.22

    if (i === 0 && lines.length === 2) {
      if (showDivider) {
        y += dividerGap * shrink
        const divY = y + divThickness / 2
        ctx.strokeStyle = examTypeDividerColor(config)
        ctx.lineWidth = divThickness
        const dash = canvasDashPattern(divStyle, scale)
        if (dash.length) ctx.setLineDash(dash)
        ctx.beginPath()
        ctx.moveTo(boxX + divInset, divY)
        ctx.lineTo(boxX + boxW - divInset, divY)
        ctx.stroke()
        ctx.setLineDash([])
        y += divThickness + dividerGap * shrink
      } else {
        y += lineGap * shrink
      }
    }
  }
  ctx.restore()
}

export function combineExamTypeLines(line1: string, line2: string): string {
  return [line1.trim(), line2.trim()].filter(Boolean).join(' ')
}
