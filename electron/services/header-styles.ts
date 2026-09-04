/** Kurumsal başlık tema kimlikleri — src/utils/headerStyles.ts ile uyumlu */

import {
  MM_TO_PT,
  RUNNING_TEXT_STRIPE_GAP_MM,
  STYLE_1_RUNNING_BODY_PT,
  STYLE_1_RUNNING_GAP_BELOW_PT,
  STYLE_1_RUNNING_STRIPE_GAP_PT,
  STYLE_1_RUNNING_STRIPE_PT,
  STYLE_1_RUNNING_TOTAL_PT,
} from './modern-corporate-header-shared.js'
import type { HeaderConfig } from './corporate-header-layout.js'
import { isCorporateHeader } from './corporate-header-layout.js'
import { style1BannerBlockHeightPt } from './style1-header-metrics.js'

const PT_PER_MM = 72 / 25.4
const BANNER_ASPECT = 8
const BANNER_MIN_PT = 56
const BANNER_MAX_PT = 112
const BANNER_DECOR_PT = 3
const LEAF_CORPORATE_BANNER_FOOTER_H_PT = 21
const LEAF_CORPORATE_BANNER_BODY_H_PT = 86.25 + LEAF_CORPORATE_BANNER_FOOTER_H_PT
const LEAF_CORPORATE_BANNER_STRIPE_H_PT = 2.5
const LGS_VERBAL_BANNER_VIEW_W = 1498
const LGS_VERBAL_BANNER_VIEW_H = 92

function usesHtmlBannerOverlay(config?: HeaderConfig): boolean {
  if (!config) return false
  if (config.useExamBanner) return true
  return config.useYaprakBanner === true
}

function isLeafRefCorporateBanner(config?: HeaderConfig): boolean {
  return config?.useExamBanner === true && config.examBannerTemplate === 'leaf-ref-corporate'
}

function isLgsVerbalRefBanner(config?: HeaderConfig): boolean {
  return config?.useExamBanner === true && config.examBannerTemplate === 'lgs-verbal-ref'
}

function testBannerBodyHeightPt(contentWidthPt: number): number {
  const raw = contentWidthPt / BANNER_ASPECT
  return Math.max(BANNER_MIN_PT, Math.min(BANNER_MAX_PT, raw))
}

function testBannerHeaderBlockHeightPt(contentWidthPt: number): number {
  return testBannerBodyHeightPt(contentWidthPt) + BANNER_DECOR_PT * 2
}

export function leafCorporateBannerHeaderBlockHeightPt(): number {
  return LEAF_CORPORATE_BANNER_BODY_H_PT + LEAF_CORPORATE_BANNER_STRIPE_H_PT * 2
}

export function lgsVerbalBannerBodyHeightPt(contentWidthPt: number): number {
  return contentWidthPt * (LGS_VERBAL_BANNER_VIEW_H / LGS_VERBAL_BANNER_VIEW_W)
}

export function lgsVerbalBannerHeaderBlockHeightPt(contentWidthPt: number): number {
  return lgsVerbalBannerBodyHeightPt(contentWidthPt)
}

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

export const THEME_RUNNING_BODY_H_PT = 22
export const THEME_RUNNING_STRIPE_GAP_PT = RUNNING_TEXT_STRIPE_GAP_MM * MM_TO_PT
export const THEME_RUNNING_STRIPE_H_PT = 1.0
export const THEME_RUNNING_GAP_BELOW_PT = 5.5
export const THEME_RUNNING_FONT_SUBJECT_PT = 9
export const THEME_RUNNING_FONT_TOPIC_PT = 8
export const THEME_RUNNING_FONT_PAGE_PT = 7.5
export const THEME_RUNNING_LOGO_W_PT = 14

export function themeRunningGapBelowPt(styleId?: string): number {
  if (normalizeHeaderStyleId(styleId) === 'style_1') {
    return STYLE_1_RUNNING_GAP_BELOW_PT
  }
  return THEME_RUNNING_GAP_BELOW_PT
}

export function otherPageHeaderBottomGapPtFromMm(mm?: number): number {
  const v = mm ?? 1.0
  return Math.max(0, Math.min(50, v)) * MM_TO_PT
}

export function otherPageRunningHeaderStripeBottomPt(styleId?: string): number {
  return themeRunningHeaderTotalPt(styleId) - themeRunningGapBelowPt(styleId)
}

/** 2+ sayfa sütun çizgisi — üst yazının altındaki şerit hizası (sayfa üstünden pt). */
export function otherPageColumnDividerStartFromTopPt(
  payload: Record<string, unknown>,
  pageNum: number,
): number | null {
  if (pageNum <= 1) return null
  if (payload.written_paper_header) return 2
  const styleId = String(payload.header_style_id ?? '')
  if (isThemeHeader(styleId)) {
    return otherPageRunningHeaderStripeBottomPt(styleId)
  }
  return 22
}

export function corporateOtherPageHeaderLayoutPt(styleId?: string, gapMm?: number): number {
  const base = otherPageRunningHeaderStripeBottomPt(styleId)
  return base + otherPageHeaderBottomGapPtFromMm(gapMm)
}

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

export const STYLE_1_FIRST_H_PT = 64
export const STYLE_2_FIRST_H_PT = 56
export const STYLE_3_FIRST_H_PT = 58
export const STYLE_4_FIRST_H_PT = 14

export function themeFirstPageHeaderTotalPt(
  styleId: string | undefined,
  headerConfig?: HeaderConfig,
  pageWpt?: number,
  marginLeftMm?: number,
  marginRightMm?: number,
): number {
  if (isCorporateHeader(styleId) && headerConfig && usesHtmlBannerOverlay(headerConfig)) {
    if (isLeafRefCorporateBanner(headerConfig)) {
      return leafCorporateBannerHeaderBlockHeightPt()
    }
    if (isLgsVerbalRefBanner(headerConfig)) {
      const contentW =
        pageWpt != null && marginLeftMm != null && marginRightMm != null
          ? pageWpt - marginLeftMm * PT_PER_MM - marginRightMm * PT_PER_MM
          : 451
      return lgsVerbalBannerHeaderBlockHeightPt(contentW)
    }
    const contentW =
      pageWpt != null && marginLeftMm != null && marginRightMm != null
        ? pageWpt - marginLeftMm * PT_PER_MM - marginRightMm * PT_PER_MM
        : 451
    return testBannerHeaderBlockHeightPt(contentW)
  }
  switch (normalizeHeaderStyleId(styleId)) {
    case 'style_1':
      return headerConfig
        ? style1BannerBlockHeightPt(headerConfig, styleId)
        : STYLE_1_FIRST_H_PT
    case 'style_2':
      return STYLE_2_FIRST_H_PT
    case 'style_3':
      return STYLE_3_FIRST_H_PT
    case 'style_4':
      return STYLE_4_FIRST_H_PT
    default:
      return STYLE_1_FIRST_H_PT
  }
}
