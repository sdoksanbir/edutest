/**
 * Başlık logosu — PDF çizimi (boyut ölçekleme + şeffaf PNG/JPG)
 */

import { type PDFDocument, type PDFPage } from 'pdf-lib'

export const HEADER_LOGO_COL_PAD_PT = 2

export const LOGO_PAD_MIN_PT = 0
export const LOGO_PAD_MAX_PT = 20
export const LOGO_PAD_Y_DEFAULT_PT = 2
export const LOGO_PAD_LEFT_DEFAULT_PT = 4

export function clampLogoPadPt(pt: number): number {
  const n = Number.isFinite(pt) ? pt : 0
  return Math.max(LOGO_PAD_MIN_PT, Math.min(LOGO_PAD_MAX_PT, Math.round(n * 2) / 2))
}

export function resolveLogoPadYPt(config: {
  logoPadYPt?: number
  logoPadTopPt?: number
  logoPadBottomPt?: number
}): number {
  const n = Number(config.logoPadYPt)
  if (Number.isFinite(n)) return clampLogoPadPt(n)
  const top = Number(config.logoPadTopPt)
  const bottom = Number(config.logoPadBottomPt)
  if (Number.isFinite(top) || Number.isFinite(bottom)) {
    const t = Number.isFinite(top) ? top : LOGO_PAD_Y_DEFAULT_PT
    const b = Number.isFinite(bottom) ? bottom : LOGO_PAD_Y_DEFAULT_PT
    return clampLogoPadPt((t + b) / 2)
  }
  return LOGO_PAD_Y_DEFAULT_PT
}

export function resolveLogoPadLeftPt(config: { logoPadLeftPt?: number }): number {
  const n = Number(config.logoPadLeftPt)
  return Number.isFinite(n) ? clampLogoPadPt(n) : LOGO_PAD_LEFT_DEFAULT_PT
}

export function headerLogoScale(logoSizePct = 100): number {
  return Math.max(0.4, Math.min(1.6, logoSizePct / 100))
}

export function headerLogoWidthPt(basePt: number, logoSizePct = 100): number {
  return basePt * headerLogoScale(logoSizePct)
}

export function fitLogoDimensions(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number,
  logoSizePct = 100,
): { w: number; h: number } {
  const scale = headerLogoScale(logoSizePct)
  const maxW = boxW * scale
  const maxH = boxH * scale
  const aspect = imgW / imgH || 1
  let w = maxW
  let h = w / aspect
  if (h > maxH) {
    h = maxH
    w = h * aspect
  }
  return { w, h }
}

export function parseLogoBytes(logoUrl: string): Uint8Array | null {
  const t = (logoUrl || '').trim()
  if (!t) return null
  try {
    const b64 = t.includes(',') ? t.split(',')[1]! : t
    return Uint8Array.from(Buffer.from(b64, 'base64'))
  } catch {
    return null
  }
}

export async function embedLogoImage(pdf: PDFDocument, logoBytes: Uint8Array) {
  try {
    return await pdf.embedPng(logoBytes)
  } catch {
    return await pdf.embedJpg(logoBytes)
  }
}

/** Sol sütun kutusu içinde en-boy oranı korunarak logo. boxY = alt kenar (PDF koordinatı). */
export type HeaderLogoBoxAlign = 'center' | 'left'

export async function drawHeaderLogoPdfInBox(
  pdf: PDFDocument,
  page: PDFPage,
  logoUrl: string,
  logoSizePct: number,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  align: HeaderLogoBoxAlign = 'center',
): Promise<boolean> {
  const bytes = parseLogoBytes(logoUrl)
  if (!bytes || boxW <= 0 || boxH <= 0) return false
  try {
    const img = await embedLogoImage(pdf, bytes)
    const { w: drawW, h: drawH } = fitLogoDimensions(
      img.width,
      img.height,
      boxW,
      boxH,
      logoSizePct,
    )
    const x = align === 'left' ? boxX : boxX + (boxW - drawW) / 2
    const y = boxY + (boxH - drawH) / 2
    page.drawImage(img, {
      x,
      y,
      width: drawW,
      height: drawH,
    })
    return true
  } catch {
    return false
  }
}

/** Merkez (cx, cy) etrafında en-boy oranı korunarak logo çizer. Başarılıysa true. */
export async function drawHeaderLogoPdf(
  pdf: PDFDocument,
  page: PDFPage,
  logoUrl: string,
  logoSizePct: number,
  baseLogoW: number,
  cx: number,
  cy: number,
  maxH?: number,
): Promise<boolean> {
  const logoW = headerLogoWidthPt(baseLogoW, logoSizePct)
  const bytes = parseLogoBytes(logoUrl)
  if (!bytes) return false
  try {
    const img = await embedLogoImage(pdf, bytes)
    const aspect = img.width / img.height || 1
    let drawW = logoW
    let drawH = drawW / aspect
    const cap = maxH ?? logoW
    if (drawH > cap) {
      drawH = cap
      drawW = drawH * aspect
    }
    page.drawImage(img, {
      x: cx - drawW / 2,
      y: cy - drawH / 2,
      width: drawW,
      height: drawH,
    })
    return true
  } catch {
    return false
  }
}
