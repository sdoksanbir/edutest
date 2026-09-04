/** Standart başlık logoları — 5 hazır seçenek + özel yükleme */

import preset1Url from '../assets/preset-logos/preset-1.png'
import preset2Url from '../assets/preset-logos/preset-2.png'
import preset3Url from '../assets/preset-logos/preset-3.png'
import preset4Url from '../assets/preset-logos/preset-4.png'
import preset5Url from '../assets/preset-logos/preset-5.png'

export type PresetHeaderLogoId = '1' | '2' | '3' | '4' | '5' | 'custom'

export const DEFAULT_PRESET_HEADER_LOGO_ID: PresetHeaderLogoId = '5'

export type PresetHeaderLogo = {
  id: PresetHeaderLogoId
  label: string
  url: string
}

export const PRESET_HEADER_LOGOS: PresetHeaderLogo[] = [
  { id: '1', label: 'Logo 1', url: preset1Url },
  { id: '2', label: 'Logo 2', url: preset2Url },
  { id: '3', label: 'Logo 3', url: preset3Url },
  { id: '4', label: 'Logo 4', url: preset4Url },
  { id: '5', label: 'Logo 5', url: preset5Url },
]

export function presetHeaderLogoUrl(id: string | undefined | null): string | null {
  const hit = PRESET_HEADER_LOGOS.find((p) => p.id === id)
  return hit?.url ?? null
}

export function isPresetHeaderLogoId(id: string | undefined | null): id is Exclude<PresetHeaderLogoId, 'custom'> {
  return PRESET_HEADER_LOGOS.some((p) => p.id === id)
}

/** headerConfig → önizleme / export için logo URL */
export function resolveHeaderLogoUrl(config: {
  presetLogoId?: string | null
  logoUrl?: string | null
}): string {
  const presetId = config.presetLogoId ?? DEFAULT_PRESET_HEADER_LOGO_ID
  if (presetId !== 'custom') {
    const presetUrl = presetHeaderLogoUrl(presetId)
    if (presetUrl) return presetUrl
  }
  return String(config.logoUrl ?? '').trim()
}

export function defaultPresetHeaderLogoUrl(): string {
  return preset5Url
}
