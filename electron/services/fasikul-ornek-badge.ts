/**
 * Fasikül — “Örnek N” rozeti (PDF).
 * Rozet soru görselinin üstünde; tema rengine uyumlu.
 */
import type { PDFFont, PDFPage } from 'pdf-lib'
import { rgb } from 'pdf-lib'

export const ORNEK_BADGE_BORDER_LEFT_PT = 3.2
export const ORNEK_BADGE_PAD_X_PT = 7
export const ORNEK_BADGE_FONT_PT = 10
export const ORNEK_BADGE_HEIGHT_PT = 15.5
export const ORNEK_BADGE_RADIUS_PT = 5.5
export const ORNEK_BADGE_GAP_ABOVE_IMAGE_PT = 1.5
/** Yerleşim img_y_top = rozet üstü; görsel BLOCK kadar aşağıda */
export const ORNEK_BADGE_BLOCK_PT =
  ORNEK_BADGE_HEIGHT_PT + ORNEK_BADGE_GAP_ABOVE_IMAGE_PT
export const ORNEK_BADGE_BAR_WIDTH_PT = ORNEK_BADGE_BORDER_LEFT_PT
export const ORNEK_BADGE_BAR_GAP_PT = 0

export function ornekBadgeLabel(displayNumber: number): string {
  return `Örnek ${Math.max(1, Math.round(displayNumber))}`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim())
  if (!m) return { r: 10, g: 25, b: 49 }
  const n = parseInt(m[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function colorFromHex(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  return rgb(r / 255, g / 255, b / 255)
}

function fillFromTheme(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const mix = (c: number) => (c * 0.16 + 255 * 0.84) / 255
  return rgb(mix(r), mix(g), mix(b))
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

export function drawOrnekBadgeOnPdfPage(
  page: PDFPage,
  args: {
    x: number
    /** Rozet üst kenarı (PDF y) — soru görseli üstünün biraz altı */
    yTop: number
    displayNumber: number
    accentHex?: string
    font: PDFFont
  },
): void {
  const theme = (args.accentHex || '').trim() || '#0A1931'
  const label = ornekBadgeLabel(args.displayNumber)
  const fontPt = ORNEK_BADGE_FONT_PT
  const textW = args.font.widthOfTextAtSize(label, fontPt)
  const pillH = ORNEK_BADGE_HEIGHT_PT
  const contentW = Math.max(textW + ORNEK_BADGE_PAD_X_PT * 2, 42)
  const pillW = contentW + ORNEK_BADGE_BORDER_LEFT_PT
  const accentColor = colorFromHex(theme)
  const fillColor = fillFromTheme(theme)
  const yBottom = args.yTop - pillH
  const r = Math.min(ORNEK_BADGE_RADIUS_PT, pillW / 2, pillH / 2)
  const borderL = ORNEK_BADGE_BORDER_LEFT_PT

  page.drawSvgPath(roundRectPath(pillW, pillH, r), {
    x: args.x,
    y: args.yTop,
    color: fillColor,
  })

  const barInsetY = Math.min(r * 0.35, 1.2)
  page.drawRectangle({
    x: args.x,
    y: yBottom + barInsetY,
    width: borderL,
    height: pillH - barInsetY * 2,
    color: accentColor,
  })

  page.drawText(label, {
    x: args.x + borderL + (contentW - textW) / 2,
    y: yBottom + (pillH - fontPt) / 2 + fontPt * 0.12,
    size: fontPt,
    font: args.font,
    color: accentColor,
  })
}
