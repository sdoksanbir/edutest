/** Başlık yükseklik hesapları — corporateHeaderLayout yüklendikten sonra güvenle import edilir */

import type { HeaderConfig } from './corporateHeaderLayout'
import { isCorporateHeader } from './corporateHeaderLayout'
import { usesHtmlBannerOverlay } from './headerBannerMode'
import { style1BannerBlockHeightPt } from './style1HeaderMetrics'
import {
  normalizeHeaderStyleId,
  STYLE_1_FIRST_H_PT,
  STYLE_2_FIRST_H_PT,
  STYLE_3_FIRST_H_PT,
  STYLE_4_FIRST_H_PT,
  themeRunningHeaderTotalPt,
} from './headerStyleIds'
import {
  testBannerContentWidthPt,
  testBannerHeaderBlockHeightPt,
  leafCorporateBannerHeaderBlockHeightPt,
  lgsVerbalBannerHeaderBlockHeightPt,
} from './testBannerLayout'

function isLeafRefCorporateBanner(config?: HeaderConfig): boolean {
  return config?.useExamBanner === true && config.examBannerTemplate === 'leaf-ref-corporate'
}

function isLgsVerbalRefBanner(config?: HeaderConfig): boolean {
  return config?.useExamBanner === true && config.examBannerTemplate === 'lgs-verbal-ref'
}

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
          ? testBannerContentWidthPt(pageWpt, marginLeftMm, marginRightMm)
          : 451
      return lgsVerbalBannerHeaderBlockHeightPt(contentW)
    }
    const contentW =
      pageWpt != null && marginLeftMm != null && marginRightMm != null
        ? testBannerContentWidthPt(pageWpt, marginLeftMm, marginRightMm)
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

export { themeRunningHeaderTotalPt }
