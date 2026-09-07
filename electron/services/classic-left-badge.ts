/**
 * Minimal (style_2) sol kutu içi — kurum adı / logo rozeti
 * (src/utils/classicLeftBadge.ts ile eşleşmeli)
 */

import type { PDFDocument, PDFFont, PDFPage, RGB } from 'pdf-lib'
import { clampPublicationLineFontPt } from './header-left-column.js'
import { classicTextBaselinePdf } from './classic-banner-top-row.js'
import {
  clampTestNoHeightPt,
  clampTestNoWidthPt,
  resolveTestNoBorderColor,
  resolveTestNoFillColor,
  resolveTestNoLabelColor,
  resolveTestNoLabelFontPt,
  STYLE_1_TEST_NO_BORDER_PT,
  STYLE_1_TEST_NO_PAD_X_PT,
  STYLE_1_TEST_NO_RADIUS_PT,
  STYLE_1_TEST_NO_W_MAX_PT,
} from './banner-right-mode.js'
import {
  embedLogoImage,
  fitLogoDimensions,
  parseLogoBytes,
  resolveLogoPadYPt,
  resolveLogoPadLeftPt,
} from './header-logo.js'

export {
  LOGO_PAD_MIN_PT,
  LOGO_PAD_MAX_PT,
  LOGO_PAD_Y_DEFAULT_PT,
  LOGO_PAD_LEFT_DEFAULT_PT,
  clampLogoPadPt,
  resolveLogoPadYPt,
  resolveLogoPadLeftPt,
} from './header-logo.js'

export const INSTITUTION_BADGE_PAD_X_MIN_PT = 0
export const INSTITUTION_BADGE_PAD_X_MAX_PT = 24
export const INSTITUTION_BADGE_PAD_X_DEFAULT_PT = STYLE_1_TEST_NO_PAD_X_PT
export const INSTITUTION_BADGE_RADIUS_MIN_PT = 0
export const INSTITUTION_BADGE_RADIUS_MAX_PT = 16
export const INSTITUTION_BADGE_RADIUS_DEFAULT_PT = STYLE_1_TEST_NO_RADIUS_PT

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

export function clampInstitutionBadgePadXPt(pt: number): number {
  const n = Number.isFinite(pt) ? pt : INSTITUTION_BADGE_PAD_X_DEFAULT_PT
  return Math.max(
    INSTITUTION_BADGE_PAD_X_MIN_PT,
    Math.min(INSTITUTION_BADGE_PAD_X_MAX_PT, Math.round(n * 2) / 2),
  )
}

export function clampInstitutionBadgeRadiusPt(pt: number): number {
  const n = Number.isFinite(pt) ? pt : INSTITUTION_BADGE_RADIUS_DEFAULT_PT
  return Math.max(
    INSTITUTION_BADGE_RADIUS_MIN_PT,
    Math.min(INSTITUTION_BADGE_RADIUS_MAX_PT, Math.round(n * 2) / 2),
  )
}

export function resolveInstitutionBadgeMaxWidthPt(config: {
  institutionBadgeWidthPt?: number
  testNoWidthPt?: number
}): number {
  const n = Number(config.institutionBadgeWidthPt)
  if (Number.isFinite(n) && n > 0) return clampTestNoWidthPt(n)
  const fallback = Number(config.testNoWidthPt)
  return clampTestNoWidthPt(
    Number.isFinite(fallback) && fallback > 0 ? fallback : STYLE_1_TEST_NO_W_MAX_PT,
  )
}

export function resolveInstitutionBadgeWidthPt(config: {
  institutionBadgeWidthPt?: number
  testNoWidthPt?: number
}): number {
  return resolveInstitutionBadgeMaxWidthPt(config)
}

export function resolveInstitutionBadgeHeightPt(config: {
  institutionBadgeHeightPt?: number
  testNoHeightPt?: number
}): number {
  const n = Number(config.institutionBadgeHeightPt)
  if (Number.isFinite(n) && n > 0) return clampTestNoHeightPt(n)
  const fallback = Number(config.testNoHeightPt)
  return clampTestNoHeightPt(
    Number.isFinite(fallback) && fallback > 0 ? fallback : 18,
  )
}

export function resolveInstitutionBadgePadXPt(config: {
  institutionBadgePadXPt?: number
}): number {
  const n = Number(config.institutionBadgePadXPt)
  if (Number.isFinite(n)) return clampInstitutionBadgePadXPt(n)
  return INSTITUTION_BADGE_PAD_X_DEFAULT_PT
}

export function resolveInstitutionBadgeRadiusPt(config: {
  institutionBadgeRadiusPt?: number
}): number {
  const n = Number(config.institutionBadgeRadiusPt)
  if (Number.isFinite(n)) return clampInstitutionBadgeRadiusPt(n)
  return INSTITUTION_BADGE_RADIUS_DEFAULT_PT
}

export function resolveClassicLeftFillColor(
  config: {
    headerLeftFillColor?: string
    testNoFillColor?: string
    testNoBorderColor?: string
    primaryColor?: string
    accentColor?: string
  },
  themeFallback = '#0A1931',
): string {
  const custom = (config.headerLeftFillColor ?? '').trim()
  if (/^#[0-9A-Fa-f]{6}$/i.test(custom)) return custom
  const fromTest = resolveTestNoFillColor(config as never)
  if (fromTest) return fromTest
  return themeFallback
}

export function resolveClassicLeftBorderColor(
  config: {
    headerLeftFillColor?: string
    testNoBorderColor?: string
    testNoFillColor?: string
    primaryColor?: string
    accentColor?: string
  },
): string {
  const custom = (config.headerLeftFillColor ?? '').trim()
  if (/^#[0-9A-Fa-f]{6}$/i.test(custom)) return custom
  return resolveTestNoBorderColor(config as never)
}

export function resolveClassicLeftTextColor(config: {
  institutionLine1Color?: string
  testNoLabelColor?: string
}): string {
  const custom = (config.institutionLine1Color ?? '').trim()
  if (/^#[0-9A-Fa-f]{6}$/i.test(custom)) return custom
  return resolveTestNoLabelColor(config as never)
}

export function resolveClassicLeftFontPt(config: {
  institutionLine1FontPt?: number
  testNoLabelFontPt?: number
}): number {
  const n = Number(config.institutionLine1FontPt)
  if (Number.isFinite(n) && n > 0) return clampPublicationLineFontPt(n)
  return resolveTestNoLabelFontPt(config as never)
}

/** Başlık bilgilerindeki Kurum Adı (brandName) */
export function classicLeftInstitutionText(config: {
  institutionLine1?: string
  schoolName?: string
  brandName?: string
}): string {
  const t = String(
    config.brandName?.trim() ||
      config.schoolName?.trim() ||
      config.institutionLine1?.trim() ||
      'KURUM',
  )
  return t.slice(0, 28)
}

function drawFilledBadgePdf(
  page: PDFPage,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  radius: number,
  fillColor: RGB,
  borderColor: RGB,
  borderW: number,
) {
  page.drawSvgPath(roundRectPath(boxW, boxH, radius), {
    x: boxX,
    y: boxY + boxH,
    color: fillColor,
    borderWidth: 0,
  })
  page.drawSvgPath(roundRectPath(boxW, boxH, radius), {
    x: boxX,
    y: boxY + boxH,
    borderColor,
    borderWidth: borderW,
  })
}

export function drawClassicInstitutionBadgePdf(
  page: PDFPage,
  font: PDFFont,
  leftX: number,
  bodyBottom: number,
  bodyH: number,
  config: {
    headerLeftFillColor?: string
    primaryColor?: string
    accentColor?: string
    institutionLine1?: string
    institutionLine1Color?: string
    institutionLine1FontPt?: number
    institutionBadgeWidthPt?: number
    institutionBadgeHeightPt?: number
    institutionBadgePadXPt?: number
    institutionBadgeRadiusPt?: number
    schoolName?: string
    brandName?: string
    testNoWidthPt?: number
    testNoHeightPt?: number
    testNoFillColor?: string
    testNoBorderColor?: string
    testNoLabelColor?: string
    testNoLabelFontPt?: number
  },
  _themeHex: string,
  hexToRgb: (hex: string) => RGB,
  maxBoxWPt?: number,
) {
  const label = classicLeftInstitutionText(config)
  if (!label) return
  const fontPt = resolveClassicLeftFontPt(config)
  const fillColor = hexToRgb(resolveClassicLeftFillColor(config))
  const borderColor = hexToRgb(resolveClassicLeftBorderColor(config))
  const textColor = hexToRgb(resolveClassicLeftTextColor(config))
  const boxH = resolveInstitutionBadgeHeightPt(config)
  const padX = resolveInstitutionBadgePadXPt(config)
  const borderW = STYLE_1_TEST_NO_BORDER_PT
  const maxW = resolveInstitutionBadgeMaxWidthPt(config)
  const cap = maxBoxWPt != null && maxBoxWPt > 0 ? Math.min(maxW, maxBoxWPt) : maxW
  const textW = font.widthOfTextAtSize(label, fontPt)
  const boxW = Math.max(padX * 2 + 4, Math.min(cap, textW + padX * 2))
  const radius = Math.min(resolveInstitutionBadgeRadiusPt(config), boxW / 2, boxH / 2)
  const boxX = leftX
  const boxY = bodyBottom + (bodyH - boxH) / 2

  drawFilledBadgePdf(page, boxX, boxY, boxW, boxH, radius, fillColor, borderColor, borderW)

  const midY = boxY + boxH / 2
  const textMaxW = Math.max(0, boxW - padX * 2)
  const drawW = Math.min(textW, textMaxW)
  const textX = boxX + padX + (textMaxW - drawW) / 2
  page.drawText(label, {
    x: textX,
    y: classicTextBaselinePdf(midY, fontPt),
    size: fontPt,
    font,
    color: textColor,
    maxWidth: textMaxW > 0 ? textMaxW : undefined,
  })
}

export async function drawClassicLogoBadgePdf(
  pdf: PDFDocument,
  page: PDFPage,
  logoUrl: string,
  leftX: number,
  bodyBottom: number,
  bodyH: number,
  availW: number,
  config: {
    headerLeftFillColor?: string
    primaryColor?: string
    accentColor?: string
    institutionBadgeHeightPt?: number
    institutionBadgePadXPt?: number
    institutionBadgeRadiusPt?: number
    testNoHeightPt?: number
    testNoFillColor?: string
    testNoBorderColor?: string
    logoSizePct?: number
    logoPadYPt?: number
    logoPadTopPt?: number
    logoPadBottomPt?: number
    logoPadLeftPt?: number
  },
  _hexToRgb: (hex: string) => RGB,
): Promise<boolean> {
  const bytes = parseLogoBytes(logoUrl)
  if (!bytes || availW <= 0 || bodyH <= 0) return false
  try {
    const img = await embedLogoImage(pdf, bytes)
    const padY = resolveLogoPadYPt(config)
    const padLeft = resolveLogoPadLeftPt(config)
    const logoSizePct = config.logoSizePct ?? 100
    const innerW = Math.max(1, availW - padLeft)
    const innerH = Math.max(1, bodyH - padY * 2)
    const { w: logoW, h: logoH } = fitLogoDimensions(
      img.width,
      img.height,
      innerW,
      innerH,
      logoSizePct,
    )
    page.drawImage(img, {
      x: leftX + padLeft,
      y: bodyBottom + padY + (innerH - logoH) / 2,
      width: logoW,
      height: logoH,
    })
    return true
  } catch {
    return false
  }
}
