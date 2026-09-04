import { useMemo } from 'react'
import TestBanner from '../test-banner/TestBanner'
import ExamBanner from '../exam-banner/ExamBanner'
import LeafTestCorporateBanner from '../leaf-test-banner/LeafTestCorporateBanner'
import LgsVerbalBanner from '../lgs-verbal-banner/LgsVerbalBanner'
import { normalizeBannerTemplateId } from '../test-banner/testBanner.types'
import { normalizeExamBannerTemplateId } from '../exam-banner/types'
import type { HeaderConfig } from '../../utils/corporateHeaderLayout'
import { isCorporateHeader } from '../../utils/corporateHeaderLayout'
import { usesExamBanner, usesHtmlBannerOverlay } from '../../utils/headerBannerMode'
import { testBannerDataFromHeaderConfig } from '../../utils/testBannerFromHeaderConfig'
import { examBannerDataFromHeaderConfig } from '../../utils/examBannerFromHeaderConfig'
import { leafTestBannerDataFromHeaderConfig } from '../../utils/leafTestBannerFromHeaderConfig'
import { lgsVerbalBannerDataFromHeaderConfig } from '../../utils/lgsVerbalBannerFromHeaderConfig'
import {
  testBannerBodyHeightPt,
  testBannerContentWidthPt,
  leafCorporateBannerHeaderBlockHeightPt,
  lgsVerbalBannerHeaderBlockHeightPt,
  mmToPdfPt,
} from '../../utils/testBannerLayout'
import { resolveThemeAccentHex, resolveThemePrimaryHex } from '../../utils/pageStructureHelpers'

type Props = {
  pageNum: number
  headerStyleId: string
  headerConfig: HeaderConfig
  themeColor: string
  pageWpt: number
  marginTopMm: number
  marginLeftMm: number
  marginRightMm: number
  scale: number
}

export function shouldShowTestBannerOverlay(
  headerStyleId: string,
  headerConfig: HeaderConfig,
): boolean {
  return isCorporateHeader(headerStyleId) && usesHtmlBannerOverlay(headerConfig)
}

export default function PdfPreviewBannerOverlay({
  pageNum,
  headerStyleId,
  headerConfig,
  themeColor,
  pageWpt,
  marginTopMm,
  marginLeftMm,
  marginRightMm,
  scale,
}: Props) {
  const testBannerData = useMemo(
    () => testBannerDataFromHeaderConfig(headerConfig),
    [headerConfig],
  )
  const examBannerData = useMemo(
    () => examBannerDataFromHeaderConfig(headerConfig),
    [headerConfig],
  )
  const leafBannerData = useMemo(
    () => leafTestBannerDataFromHeaderConfig(headerConfig, headerStyleId),
    [headerConfig, headerStyleId],
  )
  const lgsBannerData = useMemo(
    () => lgsVerbalBannerDataFromHeaderConfig(headerConfig),
    [headerConfig],
  )

  if (pageNum !== 1 || !shouldShowTestBannerOverlay(headerStyleId, headerConfig)) return null

  const contentWpt = testBannerContentWidthPt(pageWpt, marginLeftMm, marginRightMm)
  const isLeafRef = headerConfig.examBannerTemplate === 'leaf-ref-corporate'
  const isLgsRef = headerConfig.examBannerTemplate === 'lgs-verbal-ref'
  const bannerHpt = isLeafRef
    ? leafCorporateBannerHeaderBlockHeightPt()
    : isLgsRef
      ? lgsVerbalBannerHeaderBlockHeightPt(contentWpt)
      : testBannerBodyHeightPt(contentWpt)
  const mlPt = mmToPdfPt(marginLeftMm)
  const mtPt = mmToPdfPt(marginTopMm)

  const primary = resolveThemePrimaryHex(headerConfig.primaryColor, themeColor)
  const accent = resolveThemeAccentHex(headerConfig.accentColor)

  const useExam = usesExamBanner(headerConfig)

  return (
    <div
      className="pdf-preview-banner-overlay"
      style={{
        left: mlPt * scale,
        top: mtPt * scale,
        width: contentWpt * scale,
        height: bannerHpt * scale,
      }}
    >
      {isLeafRef ? (
        <LeafTestCorporateBanner
          data={leafBannerData}
          className="pdf-preview-banner-overlay__banner"
          ariaLabel="Yaprak test başlık bannerı"
        />
      ) : isLgsRef ? (
        <LgsVerbalBanner
          data={lgsBannerData}
          className="pdf-preview-banner-overlay__banner"
          ariaLabel="LGS sözel başlık bannerı"
        />
      ) : useExam ? (
        <ExamBanner
          template={normalizeExamBannerTemplateId(headerConfig.examBannerTemplate)}
          data={examBannerData}
          style={{ primaryColor: primary, secondaryColor: accent }}
          className="pdf-preview-banner-overlay__banner"
          ariaLabel="Sınav başlık bannerı"
        />
      ) : (
        <TestBanner
          template={normalizeBannerTemplateId(headerConfig.bannerTemplate)}
          data={testBannerData}
          colors={{ primary, secondary: accent }}
          className="pdf-preview-banner-overlay__banner"
          ariaLabel="Test başlık bannerı"
        />
      )}
    </div>
  )
}
