/** Kurumsal başlık tema kimlikleri ve yükseklik sabitleri */

import {
  STYLE_1_RUNNING_BODY_PT,
  STYLE_1_RUNNING_STRIPE_GAP_PT,
  STYLE_1_RUNNING_STRIPE_PT,
  STYLE_1_RUNNING_GAP_BELOW_PT,
} from './modernCorporateHeaderShared'
import {
  type HeaderStyleId,
  normalizeHeaderStyleId,
  isThemeHeader,
  isClassicTestBannerHeader,
  STYLE_1_FIRST_H_PT,
  STYLE_2_FIRST_H_PT,
  STYLE_3_FIRST_H_PT,
  STYLE_4_FIRST_H_PT,
  THEME_RUNNING_BODY_H_PT,
  THEME_RUNNING_STRIPE_GAP_PT,
  THEME_RUNNING_STRIPE_H_PT,
  THEME_RUNNING_GAP_BELOW_PT,
  themeRunningHeaderTotalPt,
} from './headerStyleIds'
import { themeFirstPageHeaderTotalPt } from './headerHeights'

export type { HeaderStyleId }
export {
  normalizeHeaderStyleId,
  isThemeHeader,
  isClassicTestBannerHeader,
  STYLE_1_FIRST_H_PT,
  STYLE_2_FIRST_H_PT,
  STYLE_3_FIRST_H_PT,
  STYLE_4_FIRST_H_PT,
  THEME_RUNNING_BODY_H_PT,
  THEME_RUNNING_STRIPE_GAP_PT,
  THEME_RUNNING_STRIPE_H_PT,
  THEME_RUNNING_GAP_BELOW_PT,
  themeRunningHeaderTotalPt,
  themeFirstPageHeaderTotalPt,
}

export const HEADER_STYLE_OPTIONS: {
  id: HeaderStyleId
  label: string
  shortLabel: string
}[] = [
  { id: 'style_1', label: 'Modern Kurumsal', shortLabel: 'Kırmızı / Lacivert' },
  { id: 'style_2', label: 'Klasik Test', shortLabel: 'Şerit + açıklama' },
  { id: 'style_3', label: 'Dinamik Deneme', shortLabel: 'Deneme Bandı' },
  { id: 'style_4', label: 'Kompakt Minimal', shortLabel: 'Tek Satır' },
]

export function themeRunningBodyPt(styleId?: string): number {
  if (normalizeHeaderStyleId(styleId) === 'style_1') return STYLE_1_RUNNING_BODY_PT
  return THEME_RUNNING_BODY_H_PT
}

export function themeRunningStripeGapPt(styleId?: string): number {
  if (normalizeHeaderStyleId(styleId) === 'style_1') return STYLE_1_RUNNING_STRIPE_GAP_PT
  return THEME_RUNNING_STRIPE_GAP_PT
}

export function themeRunningStripePt(styleId?: string): number {
  if (normalizeHeaderStyleId(styleId) === 'style_1') return STYLE_1_RUNNING_STRIPE_PT
  return THEME_RUNNING_STRIPE_H_PT
}

export function themeRunningGapBelowPt(styleId?: string): number {
  if (normalizeHeaderStyleId(styleId) === 'style_1') return STYLE_1_RUNNING_GAP_BELOW_PT
  return THEME_RUNNING_GAP_BELOW_PT
}

export const THEME_RUNNING_FONT_SUBJECT_PT = 9
export const THEME_RUNNING_FONT_TOPIC_PT = 8
export const THEME_RUNNING_FONT_PAGE_PT = 7.5
export const THEME_RUNNING_LOGO_W_PT = 14
