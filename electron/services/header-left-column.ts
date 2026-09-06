/**
 * Başlık sol sütunu — yayın adı (PDF)
 */

import { rgb, type PDFDocument, type PDFPage, type PDFFont, type RGB } from 'pdf-lib'
import type { HeaderConfig } from './corporate-header-layout.js'
import { drawHeaderLogoPdfInBox, parseLogoBytes } from './header-logo.js'

export type HeaderLeftMode = 'logo' | 'publicationText'

export type PublicationLineSpec = {
  text: string
  fontPt: number
  color: string
}

export const PUBLICATION_LINE_FONT_MIN_PT = 5
export const PUBLICATION_LINE_FONT_MAX_PT = 14
export const PUBLICATION_LINE1_FONT_DEFAULT_PT = 9
export const PUBLICATION_LINE2_FONT_DEFAULT_PT = 7

export function parseHeaderLeftMode(raw: unknown): HeaderLeftMode {
  if (
    raw === 'publicationText' ||
    raw === 'publication_text' ||
    raw === 'institutionText' ||
    raw === 'institution_text'
  ) {
    return 'publicationText'
  }
  return 'logo'
}

export function clampPublicationLineFontPt(pt: number): number {
  return Math.max(
    PUBLICATION_LINE_FONT_MIN_PT,
    Math.min(PUBLICATION_LINE_FONT_MAX_PT, Math.round(pt * 10) / 10),
  )
}

export function publicationLineSpecs(config: HeaderConfig): PublicationLineSpec[] {
  const specs: PublicationLineSpec[] = []
  const l1 = String(config.institutionLine1 ?? '').trim()
  const l2 = String(config.institutionLine2 ?? '').trim()
  const fallbackColor = config.primaryColor || '#0A1931'
  const resolveLine1Color = (raw: string) => {
    const c = raw.trim()
    if (!c || /^#([fF]{6}|[fF]{3})$/.test(c)) return fallbackColor.trim()
    return c
  }

  if (l1) {
    specs.push({
      text: l1,
      fontPt: clampPublicationLineFontPt(config.institutionLine1FontPt ?? PUBLICATION_LINE1_FONT_DEFAULT_PT),
      color: resolveLine1Color(config.institutionLine1Color || fallbackColor),
    })
  }
  if (l2) {
    specs.push({
      text: l2,
      fontPt: clampPublicationLineFontPt(config.institutionLine2FontPt ?? PUBLICATION_LINE2_FONT_DEFAULT_PT),
      color: (config.institutionLine2Color || '#C59B27').trim(),
    })
  }
  return specs.slice(0, 2)
}

export function shouldDrawHeaderLogo(config: HeaderConfig, hasLogoBytes: boolean): boolean {
  if (config.showHeaderLeft === false) return false
  if (parseHeaderLeftMode(config.headerLeftMode) !== 'logo') return false
  return hasLogoBytes && !!String(config.logoUrl ?? '').trim()
}

export function shouldDrawPublicationText(config: HeaderConfig): boolean {
  if (config.showHeaderLeft === false) return false
  if (parseHeaderLeftMode(config.headerLeftMode) !== 'publicationText') return false
  return publicationLineSpecs(config).length > 0
}

export function headerLeftColumnActive(config: HeaderConfig, hasLogoBytes: boolean): boolean {
  return shouldDrawHeaderLogo(config, hasLogoBytes) || shouldDrawPublicationText(config)
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

/** Kutuya sığdır: önce küçült, yetmezse … */
function fitPublicationLineTextPdf(
  font: PDFFont,
  text: string,
  maxW: number,
  fontPt: number,
  minFontPt: number,
): { text: string; fontPt: number } {
  const raw = text.trim()
  if (!raw || maxW <= 0) return { text: '', fontPt }
  let size = fontPt
  if (font.widthOfTextAtSize(raw, size) <= maxW) return { text: raw, fontPt: size }

  while (size > minFontPt && font.widthOfTextAtSize(raw, size) > maxW) {
    size = Math.max(minFontPt, Math.round((size - 0.5) * 10) / 10)
  }
  if (font.widthOfTextAtSize(raw, size) <= maxW) return { text: raw, fontPt: size }

  let t = raw
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > maxW) {
    t = t.slice(0, -1)
  }
  return { text: t.length < raw.length ? `${t}…` : t, fontPt: size }
}

/** PDF — sol kutu: 1. satır + altında 2. satır; yatay taşma yok. boxY = alt kenar. */
export function drawPublicationTextPdf(
  page: PDFPage,
  font: PDFFont,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  lines: PublicationLineSpec[],
) {
  if (lines.length === 0 || boxW <= 0 || boxH <= 0) return

  const padX = Math.min(2, boxW * 0.06)
  const maxTextW = Math.max(4, boxW - padX * 2)
  const lineGap = 2
  const minFontPt = PUBLICATION_LINE_FONT_MIN_PT

  const fitted = lines.slice(0, 2).map((line) => {
    const fit = fitPublicationLineTextPdf(font, line.text, maxTextW, line.fontPt, minFontPt)
    return { ...line, text: fit.text, fontPt: fit.fontPt }
  })

  const blockH =
    fitted.reduce((a, l) => a + l.fontPt, 0) + Math.max(0, fitted.length - 1) * lineGap
  let shrink = 1
  if (blockH > boxH) shrink = boxH / blockH

  let yTop = boxY + boxH - (boxH - blockH * shrink) / 2

  for (let i = 0; i < fitted.length; i++) {
    const line = fitted[i]!
    const fontSize = line.fontPt * shrink
    yTop -= fontSize * 0.78
    const tw = Math.min(font.widthOfTextAtSize(line.text, fontSize), maxTextW)
    const x = boxX + padX + Math.max(0, (maxTextW - tw) / 2)
    page.drawText(line.text, {
      x,
      y: yTop,
      size: fontSize,
      font,
      color: hexToRgb(line.color),
    })
    yTop -= fontSize * 0.22 + lineGap * shrink
  }
}

/** Sol sütun — logo veya yayın adı (PDF). boxY = alt kenar. */
export async function drawHeaderLeftColumnPdf(
  pdf: PDFDocument,
  page: PDFPage,
  config: HeaderConfig,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  font: PDFFont,
): Promise<boolean> {
  const hasLogoBytes = !!parseLogoBytes(config.logoUrl)
  if (shouldDrawHeaderLogo(config, hasLogoBytes)) {
    return drawHeaderLogoPdfInBox(
      pdf,
      page,
      config.logoUrl,
      config.logoSizePct,
      boxX,
      boxY,
      boxW,
      boxH,
    )
  }
  if (shouldDrawPublicationText(config)) {
    drawPublicationTextPdf(page, font, boxX, boxY, boxW, boxH, publicationLineSpecs(config))
    return true
  }
  return false
}
