/**
 * Kurumsal başlık sağ alanı — en fazla 3 rozet (Sınıf / D·Y·B / Test No), alt alta.
 */

import type { HeaderConfig } from './corporate-header-layout.js'
import {
  resolveExamTypeBoxHeightPt,
  resolveExamTypeBoxWidthPt,
  resolveExamTypeOffsetYPt,
} from './exam-type-box.js'
import {
  parseBannerRightMode,
  resolveScoreBoxOffsetYPt,
  resolveTestNoHeightPt,
  resolveTestNoOffsetYPt,
  resolveTestNoWidthPt,
  style1ClassicDyBSizePt,
} from './banner-right-mode.js'
import { isHeaderFieldVisible } from './header-field-visibility.js'

export type BannerRightSlot = 'examType' | 'score' | 'testNo'

export const BANNER_RIGHT_SLOT_GAP_PT = 4
export const BANNER_RIGHT_SLOTS_MAX = 3

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

export function bannerRightModeFromSlots(
  slots: BannerRightSlot[],
): 'examType' | 'score' | 'testNo' | 'hidden' {
  if (slots.length === 0) return 'hidden'
  return slots[0]!
}

/**
 * Canvas/PDF ortak (pt): Sınıf / Test No üstte, ardından D·Y·B — peş peşe (küçük aralık).
 * Dönen top = body üstünden aşağı mesafe (pt).
 */
export function layoutBannerRightSlotTops(params: {
  slots: BannerRightSlot[]
  bodyTop: number
  bodyH: number
  config: HeaderConfig
}): Array<{ slot: BannerRightSlot; top: number; h: number }> {
  const { slots, bodyTop, config } = params
  const gap = BANNER_RIGHT_SLOT_GAP_PT
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
