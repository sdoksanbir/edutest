/** Tema kimlikleri — bağımlılık döngüsü olmadan paylaşılır */

import { MM_TO_PT, RUNNING_TEXT_STRIPE_GAP_MM, STYLE_1_RUNNING_TOTAL_PT } from './modernCorporateHeaderShared'

export type HeaderStyleId = 'style_1' | 'style_2' | 'style_3' | 'style_4'

const LEGACY_MAP: Record<string, HeaderStyleId> = {
  corporate: 'style_1',
  style1: 'style_1',
  style_1: 'style_1',
  style2: 'style_2',
  style_2: 'style_2',
  style3: 'style_3',
  style_3: 'style_3',
  style4: 'style_4',
  style_4: 'style_4',
}

export function normalizeHeaderStyleId(id: string | undefined): HeaderStyleId {
  if (!id) return 'style_1'
  return LEGACY_MAP[id] ?? 'style_1'
}

/** Minimal kartı — klasik sol/orta/sağ şerit + açıklama kutusu (kurumsal değil) */
export function isClassicTestBannerHeader(styleId: string | undefined): boolean {
  return normalizeHeaderStyleId(styleId) === 'style_2'
}

export function isThemeHeader(styleId: string | undefined): boolean {
  const n = normalizeHeaderStyleId(styleId)
  return n === 'style_1' || n === 'style_3' || n === 'style_4'
}

export const STYLE_1_FIRST_H_PT = 64
export const STYLE_2_FIRST_H_PT = 56
export const STYLE_3_FIRST_H_PT = 58
export const STYLE_4_FIRST_H_PT = 14

export const THEME_RUNNING_BODY_H_PT = 22
export const THEME_RUNNING_STRIPE_GAP_PT = RUNNING_TEXT_STRIPE_GAP_MM * MM_TO_PT
export const THEME_RUNNING_STRIPE_H_PT = 1.0
export const THEME_RUNNING_GAP_BELOW_PT = 5.5

export function themeRunningHeaderTotalPt(styleId?: string): number {
  if (normalizeHeaderStyleId(styleId) === 'style_1') {
    return STYLE_1_RUNNING_TOTAL_PT
  }
  return (
    THEME_RUNNING_STRIPE_H_PT +
    THEME_RUNNING_STRIPE_GAP_PT +
    THEME_RUNNING_BODY_H_PT +
    THEME_RUNNING_STRIPE_GAP_PT +
    THEME_RUNNING_STRIPE_H_PT +
    THEME_RUNNING_GAP_BELOW_PT
  )
}
