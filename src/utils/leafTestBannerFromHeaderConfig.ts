import type { HeaderConfig } from './corporateHeaderLayout'
import { getHeaderFieldFontPt } from './headerFieldFonts'
import { headerLogoScale } from './headerLogo'
import { parseHeaderLeftMode, publicationLineSpecs } from './headerLeftColumn'
import { resolveHeaderLogoUrl } from './presetHeaderLogos'
import { resolveLogoRecolorColors } from './presetLogoRecolor'
import { headerFieldDisplayText } from './headerFieldVisibility'
import type { LeafTestBannerData } from '../components/leaf-test-banner/types'

/** Banner dairesinde yalnızca numara (ör. "DENEME 01" → "01") */
function leafBannerTestNumber(raw: string): string | undefined {
  const t = raw.trim()
  if (!t) return undefined
  const trailing = t.match(/(\d+)\s*$/)
  if (trailing) return trailing[1]
  return t
}

/** headerConfig → LeafTestBannerData (içerik + punto — başlık bilgileri) */
export function leafTestBannerDataFromHeaderConfig(
  config: HeaderConfig,
  styleId = 'style_3',
): LeafTestBannerData {
  const logoUrl = resolveHeaderLogoUrl(config)
  const logoColors = resolveLogoRecolorColors(config)
  const pt = (field: Parameters<typeof getHeaderFieldFontPt>[0]) =>
    getHeaderFieldFontPt(field, styleId, config)

  const institutionLine2 = (config.institutionLine2 || '').trim()

  return {
    logoUrl: logoUrl || undefined,
    presetLogoId: config.presetLogoId ?? '5',
    showHeaderLeft: config.showHeaderLeft ?? true,
    headerLeftMode: parseHeaderLeftMode(config.headerLeftMode),
    logoPrimaryColor: logoColors.primary,
    logoAccentColor: logoColors.accent,
    publicationLines: publicationLineSpecs(config),
    institutionName:
      headerFieldDisplayText(config, 'brandName') ||
      headerFieldDisplayText(config, 'schoolName') ||
      undefined,
    institutionSubtitle: institutionLine2 || undefined,
    subject: headerFieldDisplayText(config, 'subject') || undefined,
    topic: headerFieldDisplayText(config, 'topic') || undefined,
    subTopic: headerFieldDisplayText(config, 'subTopic') || undefined,
    testType: (config.testType || '').trim() || undefined,
    gradeLevel: (config.gradeLevel || '').trim() || undefined,
    examType: headerFieldDisplayText(config, 'examType') || undefined,
    testNumber: leafBannerTestNumber(config.testNumber || ''),
    fontSizes: {
      subject: pt('subject'),
      topic: pt('topic'),
      subTopic: pt('subTopic'),
      examType: pt('examType'),
      gradeLevel: pt('examType'),
      testNumber: pt('testNumber'),
      testType: pt('testType'),
      institutionName: pt('brandName'),
      institutionSubtitle: pt('authorName'),
    },
    primaryColor: (config.primaryColor || '').trim() || undefined,
    accentColor: (config.accentColor || '').trim() || undefined,
    logoScale: headerLogoScale(config.logoSizePct),
    scoreCorrect: parseScore(config.scoreCorrect),
    scoreWrong: parseScore(config.scoreWrong),
    scoreNet: parseScore(config.scoreBlank),
  }
}

function parseScore(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}
