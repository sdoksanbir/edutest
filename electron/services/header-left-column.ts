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

  if (l1) {
    specs.push({
      text: l1,
      fontPt: clampPublicationLineFontPt(config.institutionLine1FontPt ?? PUBLICATION_LINE1_FONT_DEFAULT_PT),
      color: (config.institutionLine1Color || fallbackColor).trim(),
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
  if (!config.showHeaderLeft || config.headerLeftMode !== 'logo') return false
  return hasLogoBytes && !!String(config.logoUrl ?? '').trim()
}

export function shouldDrawPublicationText(config: HeaderConfig): boolean {
  if (!config.showHeaderLeft || config.headerLeftMode !== 'publicationText') return false
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

/** PDF — boxY alt kenar */
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
  const lineGap = 2
  const sizesPt = lines.map((l) => l.fontPt)
  const blockH = sizesPt.reduce((a, b) => a + b, 0) + Math.max(0, lines.length - 1) * lineGap
  let shrink = 1
  if (blockH > boxH) shrink = boxH / blockH

  const cx = boxX + boxW / 2
  let yTop = boxY + boxH - (boxH - blockH * shrink) / 2

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const fontSize = sizesPt[i]! * shrink
    yTop -= fontSize * 0.78
    const tw = font.widthOfTextAtSize(line.text.slice(0, 28), fontSize)
    page.drawText(line.text.slice(0, 28), {
      x: cx - tw / 2,
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
