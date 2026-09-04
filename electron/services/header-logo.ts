/**
 * Başlık logosu — PDF çizimi (boyut ölçekleme + şeffaf PNG/JPG)
 */

import { type PDFDocument, type PDFPage } from 'pdf-lib'

export const HEADER_LOGO_COL_PAD_PT = 2

export function headerLogoScale(logoSizePct = 100): number {
  return Math.max(0.4, Math.min(1.6, logoSizePct / 100))
}

export function headerLogoWidthPt(basePt: number, logoSizePct = 100): number {
  return basePt * headerLogoScale(logoSizePct)
}

function fitLogoDimensions(
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

async function embedLogoImage(pdf: PDFDocument, logoBytes: Uint8Array) {
  try {
    return await pdf.embedPng(logoBytes)
  } catch {
    return await pdf.embedJpg(logoBytes)
  }
}

/** Sol sütun kutusu içinde en-boy oranı korunarak logo. boxY = alt kenar (PDF koordinatı). */
export async function drawHeaderLogoPdfInBox(
  pdf: PDFDocument,
  page: PDFPage,
  logoUrl: string,
  logoSizePct: number,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
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
    const cx = boxX + boxW / 2
    const cy = boxY + boxH / 2
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
