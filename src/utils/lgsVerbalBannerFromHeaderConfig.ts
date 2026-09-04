import type { HeaderConfig } from './corporateHeaderLayout'
import { resolveHeaderLogoUrl } from './presetHeaderLogos'
import { headerFieldDisplayText } from './headerFieldVisibility'
import type { LgsVerbalBannerData } from '../components/lgs-verbal-banner/types'

function parseScore(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

/** headerConfig → LgsVerbalBannerData */
export function lgsVerbalBannerDataFromHeaderConfig(config: HeaderConfig): LgsVerbalBannerData {
  const subtitle = (config.institutionLine2 || config.institutionLine1 || '').trim()

  return {
    logoUrl: resolveHeaderLogoUrl(config) || undefined,
    institutionName:
      headerFieldDisplayText(config, 'brandName') ||
      headerFieldDisplayText(config, 'schoolName') ||
      undefined,
    institutionSubtitle: subtitle || undefined,
    examLabel: (config.examBannerTitle || 'DENEME SINAVI').trim() || undefined,
    examType: headerFieldDisplayText(config, 'examType') || undefined,
    sectionName:
      headerFieldDisplayText(config, 'subTopic') ||
      headerFieldDisplayText(config, 'topic') ||
      undefined,
    gradeLevel: (config.gradeLevel || '').trim() || undefined,
    gradeExamType: headerFieldDisplayText(config, 'examType') || undefined,
    scoreCorrect: parseScore(config.scoreCorrect),
    scoreWrong: parseScore(config.scoreWrong),
    scoreBlank: parseScore(config.scoreBlank),
    primaryColor: (config.primaryColor || '').trim() || undefined,
    accentColor: (config.accentColor || '').trim() || undefined,
  }
}
