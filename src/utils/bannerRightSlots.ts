/**
 * Kurumsal başlık sağ alanı — en fazla 2 rozet (Sınıf / D·Y·B / Test No), alt alta.
 */

import type { HeaderConfig } from './corporateHeaderLayout'
import {
  resolveExamTypeBoxHeightPt,
  resolveExamTypeBoxWidthPt,
  resolveExamTypeOffsetYPt,
} from './examTypeBox'
import {
  parseBannerRightMode,
  resolveScoreBoxOffsetYPt,
  resolveTestNoHeightPt,
  resolveTestNoOffsetYPt,
  resolveTestNoWidthPt,
  style1ClassicDyBSizePt,
} from './bannerRightMode'
import { isHeaderFieldVisible } from './headerFieldVisibility'

export type BannerRightSlot = 'examType' | 'score' | 'testNo'

export const BANNER_RIGHT_SLOT_GAP_PT = 4
export const BANNER_RIGHT_SLOTS_MAX = 3

const SLOT_SET = new Set<BannerRightSlot>(['examType', 'score', 'testNo'])

export function parseBannerRightSlot(raw: unknown): BannerRightSlot | null {
  if (raw === 'examType' || raw === 'score' || raw === 'testNo') return raw
  if (raw === 'class' || raw === 'sinif') return 'examType'
  return null
}

export function normalizeBannerRightSlots(raw: unknown): BannerRightSlot[] | null {
  if (!Array.isArray(raw)) return null
  const out: BannerRightSlot[] = []
  for (const item of raw) {
    const s = parseBannerRightSlot(item)
    if (!s || out.includes(s)) continue
    out.push(s)
    if (out.length >= BANNER_RIGHT_SLOTS_MAX) break
  }
  return out
}

/** Minimal üst banner — yalnızca Test No (D/Y/B alt şeritte) */
export function classicBannerTopRightSlots(
  config: HeaderConfig,
): Array<'testNo'> {
  return resolveBannerRightSlots(config).filter(
    (s): s is 'testNo' => s === 'testNo',
  )
}

/** Kayıtlı slots varsa onu kullan; yoksa eski bannerRightMode’dan türet. */
export function resolveBannerRightSlots(config: HeaderConfig): BannerRightSlot[] {
  const fromField = normalizeBannerRightSlots(
    (config as HeaderConfig & { bannerRightSlots?: unknown }).bannerRightSlots,
  )
  if (fromField) return fromField

  const mode =
    parseBannerRightMode(config.bannerRightMode) ??
    (isHeaderFieldVisible(config, 'examType') ? 'examType' : 'hidden')
  if (mode === 'examType' || mode === 'score' || mode === 'testNo') return [mode]
  return []
}

/** Seçimi değiştir: aynıysa kaldır; yoksa ekle (max 3). */
export function toggleBannerRightSlot(
  current: BannerRightSlot[],
  slot: BannerRightSlot,
): BannerRightSlot[] {
  if (current.includes(slot)) return current.filter((s) => s !== slot)
  if (current.length >= BANNER_RIGHT_SLOTS_MAX) return current
  return orderBannerRightSlots([...current, slot])
}

const SLOT_ORDER: BannerRightSlot[] = ['examType', 'score', 'testNo']

export function orderBannerRightSlots(slots: BannerRightSlot[]): BannerRightSlot[] {
  return SLOT_ORDER.filter((s) => slots.includes(s))
}

/** Görünürlük checkbox — sırayı koruyarak ekle/çıkar */
export function setBannerRightSlotVisible(
  current: BannerRightSlot[],
  slot: BannerRightSlot,
  visible: boolean,
): BannerRightSlot[] {
  if (visible) {
    if (current.includes(slot)) return orderBannerRightSlots(current)
    return orderBannerRightSlots([...current, slot])
  }
  return current.filter((s) => s !== slot)
}

export function style1RightSlotHeightPt(
  slot: BannerRightSlot,
  config: HeaderConfig,
): number {
  if (slot === 'examType') return resolveExamTypeBoxHeightPt(config)
  if (slot === 'score') return style1ClassicDyBSizePt(config).hPt
  return resolveTestNoHeightPt(config)
}

export function style1RightSlotWidthPt(
  slot: BannerRightSlot,
  config: HeaderConfig,
  maxAvailPt?: number,
): number {
  if (slot === 'examType') return resolveExamTypeBoxWidthPt(config, maxAvailPt)
  if (slot === 'score') return style1ClassicDyBSizePt(config).wPt
  return resolveTestNoWidthPt(config)
}

export function style1RightSlotsTotalHeightPt(config: HeaderConfig): number {
  const slots = resolveBannerRightSlots(config)
  if (slots.length === 0) return 0
  let h = 0
  for (const slot of slots) h += style1RightSlotHeightPt(slot, config)
  h += BANNER_RIGHT_SLOT_GAP_PT * Math.max(0, slots.length - 1)
  return h
}

export function style1RightSlotsMaxWidthPt(
  config: HeaderConfig,
  maxAvailPt?: number,
): number {
  const slots = resolveBannerRightSlots(config)
  let w = 0
  for (const slot of slots) {
    w = Math.max(w, style1RightSlotWidthPt(slot, config, maxAvailPt))
  }
  return w
}

/** Sync legacy bannerRightMode from slots (ilk seçim veya hidden). */
export function bannerRightModeFromSlots(
  slots: BannerRightSlot[],
): 'examType' | 'score' | 'testNo' | 'hidden' {
  if (slots.length === 0) return 'hidden'
  return slots[0]!
}

/**
 * Canvas/PDF ortak (pt): Sınıf / Test No üstte, ardından D·Y·B — peş peşe (küçük aralık).
 * Dönen top = slot üst kenarı (pt, canvas y-aşağı veya PDF’de body üstünden mesafe).
 */
export function layoutBannerRightSlotTops(params: {
  slots: BannerRightSlot[]
  bodyTop: number
  bodyH: number
  config: HeaderConfig
}): Array<{ slot: BannerRightSlot; top: number; h: number }> {
  const { slots, bodyTop, config } = params
  const gap = BANNER_RIGHT_SLOT_GAP_PT
  // Üst rozetler (Sınıf / Test No), hemen altında D·Y·B — alta yaslama yok
  const stacked = [
    ...slots.filter((s) => s !== 'score'),
    ...slots.filter((s) => s === 'score'),
  ]
  const out: Array<{ slot: BannerRightSlot; top: number; h: number }> = []

  let y = bodyTop
  for (const slot of stacked) {
    const h = style1RightSlotHeightPt(slot, config)
    const offset =
      slot === 'testNo'
        ? resolveTestNoOffsetYPt(config)
        : slot === 'examType'
          ? resolveExamTypeOffsetYPt(config)
          : slot === 'score'
            ? resolveScoreBoxOffsetYPt(config)
            : 0
    out.push({ slot, top: y + offset, h })
    y += h + gap
  }

  return out
}
