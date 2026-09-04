import type { HeaderConfig } from './corporateHeaderLayout'
import { resolveHeaderLogoUrl } from './presetHeaderLogos'
import { isHeaderFieldVisible } from './headerFieldVisibility'
import type { TestBannerData } from '../components/test-banner/testBanner.types'

function parseScore(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

/** headerConfig → TestBannerData (tek kaynak) */
export function testBannerDataFromHeaderConfig(config: HeaderConfig): TestBannerData {
  const logoUrl = resolveHeaderLogoUrl(config)
  const institutionName = isHeaderFieldVisible(config, 'brandName')
    ? (config.brandName || '').trim()
    : ''

  return {
    logoUrl: logoUrl || undefined,
    institutionName: institutionName || undefined,
    subject: isHeaderFieldVisible(config, 'subject') ? (config.subject || '').trim() : '',
    topic: isHeaderFieldVisible(config, 'topic') ? (config.topic || '').trim() : '',
    subTopic: isHeaderFieldVisible(config, 'subTopic')
      ? (config.subTopic || '').trim() || undefined
      : undefined,
    gradeLevel: (config.gradeLevel || config.testNumber || '').trim(),
    examType: isHeaderFieldVisible(config, 'examType')
      ? (config.examType || '').trim() || undefined
      : undefined,
    testType: (config.testType || '').trim() || undefined,
    correct: parseScore(config.scoreCorrect),
    wrong: parseScore(config.scoreWrong),
    blank: parseScore(config.scoreBlank),
  }
}
