/**
 * Minimal (style_2) sol kutu içi — kurum adı / logo rozeti
 * (sol panel arka planı beyaz kalır; dolgu yalnızca rozette)
 */

import { clampPublicationLineFontPt } from './headerLeftColumn'
import { classicTextBaselineCanvas } from './classicBannerTopRow'
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
} from './bannerRightMode'
import { fitLogoDimensions, HEADER_LOGO_SIZE_DEFAULT_PCT, resolveLogoPadYPt, resolveLogoPadLeftPt } from './headerLogo'

export const INSTITUTION_BADGE_PAD_X_MIN_PT = 0
export const INSTITUTION_BADGE_PAD_X_MAX_PT = 24
export const INSTITUTION_BADGE_PAD_X_DEFAULT_PT = STYLE_1_TEST_NO_PAD_X_PT
export const INSTITUTION_BADGE_RADIUS_MIN_PT = 0
export const INSTITUTION_BADGE_RADIUS_MAX_PT = 16
export const INSTITUTION_BADGE_RADIUS_DEFAULT_PT = STYLE_1_TEST_NO_RADIUS_PT

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

/** Max genişlik tavanı (responsive genişlik buna kadar büyür) */
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

/** @deprecated — max genişlik için resolveInstitutionBadgeMaxWidthPt kullan */
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

/** Rozet dolgusu — özel renk yoksa Test No / primary (lacivert) */
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

export {
  LOGO_PAD_MIN_PT,
  LOGO_PAD_MAX_PT,
  LOGO_PAD_Y_DEFAULT_PT,
  LOGO_PAD_LEFT_DEFAULT_PT,
  clampLogoPadPt,
  resolveLogoPadYPt,
  resolveLogoPadLeftPt,
} from './headerLogo'

type InstitutionBadgeDrawConfig = {
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
  logoSizePct?: number
  logoPadYPt?: number
  logoPadTopPt?: number
  logoPadBottomPt?: number
  logoPadLeftPt?: number
}

function drawFilledBadgeRect(
  ctx: CanvasRenderingContext2D,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  radius: number,
  fillColor: string,
  borderColor: string,
  borderW: number,
) {
  ctx.fillStyle = fillColor
  ctx.beginPath()
  ctx.roundRect(boxX, boxY, boxW, boxH, radius)
  ctx.fill()

  ctx.strokeStyle = borderColor
  ctx.lineWidth = borderW
  ctx.beginPath()
  ctx.roundRect(boxX, boxY, boxW, boxH, radius)
  ctx.stroke()
}

/**
 * Kurum adı rozeti — genişlik metne göre (pad dahil), max genişlik tavanı uygulanır.
 */
export function drawClassicInstitutionBadgeCanvas(
  ctx: CanvasRenderingContext2D,
  leftX: number,
  bodyY: number,
  bodyH: number,
  config: InstitutionBadgeDrawConfig,
  _themeRgb: string,
  scale: number,
  fontFamily = 'Arial, Helvetica',
  maxBoxWPx?: number,
) {
  const label = classicLeftInstitutionText(config)
  if (!label) return
  const fontPx = resolveClassicLeftFontPt(config) * scale
  const fillColor = resolveClassicLeftFillColor(config)
  const borderColor = resolveClassicLeftBorderColor(config)
  const textColor = resolveClassicLeftTextColor(config)
  const boxH = resolveInstitutionBadgeHeightPt(config) * scale
  const padX = resolveInstitutionBadgePadXPt(config) * scale
  const borderW = Math.max(1, STYLE_1_TEST_NO_BORDER_PT * scale)
  const maxW = resolveInstitutionBadgeMaxWidthPt(config) * scale
  const cap = maxBoxWPx != null && maxBoxWPx > 0 ? Math.min(maxW, maxBoxWPx) : maxW

  ctx.font = `bold ${fontPx}px ${fontFamily}`
  const textW = ctx.measureText(label).width
  const boxW = Math.max(padX * 2 + 4 * scale, Math.min(cap, textW + padX * 2))
  const radius = Math.min(
    resolveInstitutionBadgeRadiusPt(config) * scale,
    boxW / 2,
    boxH / 2,
  )
  const boxX = leftX
  const boxY = bodyY + (bodyH - boxH) / 2

  drawFilledBadgeRect(ctx, boxX, boxY, boxW, boxH, radius, fillColor, borderColor, borderW)

  const midY = boxY + boxH / 2
  const textMaxW = Math.max(0, boxW - padX * 2)
  ctx.fillStyle = textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `bold ${fontPx}px ${fontFamily}`
  ctx.save()
  ctx.beginPath()
  ctx.rect(boxX + padX, boxY, textMaxW, boxH)
  ctx.clip()
  ctx.fillText(label, boxX + boxW / 2, classicTextBaselineCanvas(midY, fontPx))
  ctx.restore()
}

/**
 * Logo — dikey boşluk dış kutuyu büyütür; sol boşluk logo ile kenar arası.
 */
export function drawClassicLogoBadgeCanvas(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  leftX: number,
  bodyY: number,
  bodyH: number,
  availW: number,
  config: InstitutionBadgeDrawConfig,
  scale: number,
) {
  if (!img.complete || (img.naturalWidth ?? 0) <= 0 || availW <= 0 || bodyH <= 0) return
  const padY = resolveLogoPadYPt(config) * scale
  const padLeft = resolveLogoPadLeftPt(config) * scale
  const logoSizePct = config.logoSizePct ?? HEADER_LOGO_SIZE_DEFAULT_PCT
  const innerW = Math.max(1, availW - padLeft)
  const innerH = Math.max(1, bodyH - padY * 2)
  const { w: logoW, h: logoH } = fitLogoDimensions(
    img.naturalWidth,
    img.naturalHeight,
    innerW,
    innerH,
    logoSizePct,
  )
  const logoX = leftX + padLeft
  const logoY = bodyY + padY + (innerH - logoH) / 2
  const prevSmooth = ctx.imageSmoothingEnabled
  const prevQuality = ctx.imageSmoothingQuality
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, logoX, logoY, logoW, logoH)
  ctx.imageSmoothingEnabled = prevSmooth
  ctx.imageSmoothingQuality = prevQuality
}
