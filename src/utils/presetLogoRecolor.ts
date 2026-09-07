/** Hazır logolar — kesin renk değiştirme (HSL + kazanan sınıf) */

import { presetHeaderLogoUrl, resolveHeaderLogoUrl } from './presetHeaderLogos'
import { resolveHeaderLogoUrlForExport } from './headerLogo'

/** Çift tonlu hazır logolar (lacivert + altın) */
export const DUAL_TONE_PRESET_LOGO_IDS = ['1', '2', '3', '4'] as const

/** EDUMATH — lacivert + kırmızı */
export const MULTI_TONE_PRESET_LOGO_ID = '5'

const SRC_NAVY: [number, number, number] = [10, 43, 81]
const SRC_GOLD: [number, number, number] = [255, 184, 0]
const SRC_RED: [number, number, number] = [220, 38, 38]

/** Kaynak renge bu kadar yakınsa düz hedef renk basılır */
const FLAT_SNAP_DIST = 42

export function isRecolorablePresetLogo(presetId: string | null | undefined): boolean {
  if (!presetId || presetId === 'custom') return false
  return (
    (DUAL_TONE_PRESET_LOGO_IDS as readonly string[]).includes(presetId) ||
    presetId === MULTI_TONE_PRESET_LOGO_ID
  )
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim()
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h.slice(0, 6)
  const n = parseInt(full, 16)
  if (!Number.isFinite(n)) return SRC_NAVY
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function colorDist(
  r: number,
  g: number,
  b: number,
  cr: number,
  cg: number,
  cb: number,
): number {
  return Math.sqrt((r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2)
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / d + 2) / 6
  else h = ((rn - gn) / d + 4) / 6
  return [h * 360, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255)
    return [v, v, v]
  }
  const hue = (((h % 360) + 360) % 360) / 360
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hue2rgb = (t: number) => {
    let x = t
    if (x < 0) x += 1
    if (x > 1) x -= 1
    if (x < 1 / 6) return p + (q - p) * 6 * x
    if (x < 1 / 2) return q
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
    return p
  }
  return [
    Math.round(hue2rgb(hue + 1 / 3) * 255),
    Math.round(hue2rgb(hue) * 255),
    Math.round(hue2rgb(hue - 1 / 3) * 255),
  ]
}

type ToneRole = 'primary' | 'accent'

/** Kazanan renk sınıfı — karışım yok */
function classifyDualTone(r: number, g: number, b: number): ToneRole {
  if (r > 150 && g > 100 && b < 160 && r >= b && r - b > 40) return 'accent'
  if (b >= r && r < 130 && b > 50) return 'primary'
  if (r < 95 && g < 105 && b < 135) return 'primary'

  const dNavy = colorDist(r, g, b, ...SRC_NAVY)
  const dGold = colorDist(r, g, b, ...SRC_GOLD)
  return dNavy <= dGold ? 'primary' : 'accent'
}

function classifyEdumath(r: number, g: number, b: number): ToneRole {
  if (r > 140 && g < 110 && b < 110 && r > g * 1.25) return 'accent'
  if (r > 150 && g > 100 && b < 160 && r >= b) return 'accent'
  if (b >= r && r < 130 && b > 50) return 'primary'
  if (r < 95 && g < 105 && b < 135) return 'primary'

  const dNavy = colorDist(r, g, b, ...SRC_NAVY)
  const dRed = colorDist(r, g, b, ...SRC_RED)
  const dGold = colorDist(r, g, b, ...SRC_GOLD)
  const min = Math.min(dNavy, dRed, dGold)
  if (min === dRed || min === dGold) return 'accent'
  return 'primary'
}

function anchorForRole(role: ToneRole, isEdumath: boolean): [number, number, number] {
  if (role === 'primary') return SRC_NAVY
  return isEdumath ? SRC_RED : SRC_GOLD
}

/** Hedef rengin tonu + kaynak pikselin parlaklığı; çekirdekte düz renk */
function applyRoleColor(
  r: number,
  g: number,
  b: number,
  role: ToneRole,
  primary: [number, number, number],
  accent: [number, number, number],
  isEdumath: boolean,
): [number, number, number] {
  const target = role === 'primary' ? primary : accent
  const anchor = anchorForRole(role, isEdumath)
  const dist = colorDist(r, g, b, ...anchor)
  const [, , srcL] = rgbToHsl(r, g, b)

  if (dist < FLAT_SNAP_DIST && srcL >= 0.12 && srcL <= 0.82) {
    return target
  }

  const [tH, tS] = rgbToHsl(...target)
  const outL = Math.max(0.06, Math.min(0.94, srcL))
  const outS = Math.max(tS, 0.55)
  return hslToRgb(tH, outS, outL)
}

function recolorPixel(
  r: number,
  g: number,
  b: number,
  primary: [number, number, number],
  accent: [number, number, number],
  isEdumath: boolean,
): [number, number, number] {
  const role = isEdumath ? classifyEdumath(r, g, b) : classifyDualTone(r, g, b)
  return applyRoleColor(r, g, b, role, primary, accent, isEdumath)
}

export function recolorPresetLogoImageData(
  imageData: ImageData,
  presetId: string,
  primaryHex: string,
  accentHex: string,
): void {
  const primary = parseHex(primaryHex)
  const accent = parseHex(accentHex)
  const d = imageData.data
  const isEdumath = presetId === MULTI_TONE_PRESET_LOGO_ID

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]!
    const g = d[i + 1]!
    const b = d[i + 2]!
    const a = d[i + 3]!
    if (a < 12) continue

    const [nr, ng, nb] = recolorPixel(r, g, b, primary, accent, isEdumath)
    d[i] = nr
    d[i + 1] = ng
    d[i + 2] = nb
  }
}

export function recolorPresetLogoCanvas(
  img: HTMLImageElement,
  presetId: string,
  primaryHex: string,
  accentHex: string,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  recolorPresetLogoImageData(imageData, presetId, primaryHex, accentHex)
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

export function recolorPresetLogoDataUrl(
  dataUrl: string,
  presetId: string,
  primaryHex: string,
  accentHex: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = recolorPresetLogoCanvas(img, presetId, primaryHex, accentHex)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('Logo okunamadı'))
    img.src = dataUrl
  })
}

export function recolorPresetLogoFromUrl(
  url: string,
  presetId: string,
  primaryHex: string,
  accentHex: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = recolorPresetLogoCanvas(img, presetId, primaryHex, accentHex)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('Logo okunamadı'))
    img.src = url
  })
}

/** Hazır logo için kullanılacak ana / vurgu renkleri */
export function resolveLogoRecolorColors(
  config: {
    logoUseThemeColors?: boolean
    logoColorPrimary?: string
    logoColorSecondary?: string
    primaryColor?: string
    accentColor?: string
  },
  themeColorFallback = '#0A1931',
  accentFallback = '#DC2626',
): { primary: string; accent: string } {
  if (config.logoUseThemeColors !== false) {
    return {
      primary: (config.primaryColor || themeColorFallback).trim(),
      accent: (config.accentColor || accentFallback).trim(),
    }
  }
  return {
    primary: (config.logoColorPrimary || '#0A1931').trim(),
    accent: (config.logoColorSecondary || '#FFB800').trim(),
  }
}

/** Önizleme / PDF export — hazır logo ise seçilen renklere boyanmış data URL */
export async function resolveThemedHeaderLogoUrl(
  config: {
    presetLogoId?: string | null
    logoUrl?: string | null
    logoUseThemeColors?: boolean
    logoColorPrimary?: string
    logoColorSecondary?: string
    primaryColor?: string
    accentColor?: string
  },
  primaryFallback = '#0A1931',
  accentFallback = '#DC2626',
): Promise<string> {
  const presetId = config.presetLogoId ?? MULTI_TONE_PRESET_LOGO_ID
  const baseUrl = resolveHeaderLogoUrl(config)
  if (!baseUrl || !isRecolorablePresetLogo(presetId)) return baseUrl

  const { primary, accent } = resolveLogoRecolorColors(config, primaryFallback, accentFallback)
  const sourceUrl = presetHeaderLogoUrl(presetId) ?? baseUrl

  try {
    const raw = sourceUrl.startsWith('data:')
      ? sourceUrl
      : await resolveHeaderLogoUrlForExport(sourceUrl)
    return await recolorPresetLogoDataUrl(raw, presetId, primary, accent)
  } catch {
    return baseUrl
  }
}
