import type { HeaderConfig } from './corporateHeaderLayout'
import { resolveLgsOfficialLogoUrl } from './presetHeaderLogos'
import { headerFieldDisplayText } from './headerFieldVisibility'
import type { LgsOfficialBannerData } from '../components/lgs-official-banner/types'
import {
  LGS_OFFICIAL_SUBJECT_DEFAULT,
  LGS_OFFICIAL_TITLE_DEFAULT,
  LGS_OFFICIAL_YEAR_DEFAULT,
} from '../components/lgs-official-banner/types'
import {
  lgsOfficialDefaultInstructionLines,
  parseDescriptionInstructionLines,
} from './trialYonergeDefaults'

function bookletLetterFromLgs(config: HeaderConfig): string {
  const raw = String(config.lgsBookletType ?? '')
    .trim()
    .toUpperCase()
  return /^[A-D]$/.test(raw) ? raw : ''
}

export type LgsOfficialBannerSource = {
  headerConfig: HeaderConfig
  questionCount?: number
  /** Tek sütun yönerge paneli metni — banner kutusuna yansır */
  instructionTexts?: string[]
  /** Deneme test adı — subject boşsa ders bandına düşer */
  testName?: string
}

/** headerConfig + deneme alanları → LGS resmi banner */
export function lgsOfficialBannerDataFromSources(
  src: LgsOfficialBannerSource,
): LgsOfficialBannerData {
  const { headerConfig: config } = src
  const qCount = Math.max(1, Math.round(src.questionCount ?? 20))
  const [line1, line2] = parseDescriptionInstructionLines(
    src.instructionTexts,
    lgsOfficialDefaultInstructionLines(qCount),
  )

  const subject =
    headerFieldDisplayText(config, 'subject') ||
    (config.subject || '').trim() ||
    (src.testName || '').trim() ||
    LGS_OFFICIAL_SUBJECT_DEFAULT

  const examTitle =
    (config.examBannerTitle || '').trim() || LGS_OFFICIAL_TITLE_DEFAULT

  const institutionName = headerFieldDisplayText(config, 'brandName').trim()

  return {
    bookletType: bookletLetterFromLgs(config),
    logoUrl: resolveLgsOfficialLogoUrl(config) || undefined,
    logoSizePct: config.lgsLogoSizePct ?? 100,
    showLogo: config.lgsShowLogo !== false,
    academicYear: (config.academicYear || '').trim() || LGS_OFFICIAL_YEAR_DEFAULT,
    institutionName,
    examTitle,
    subjectName: subject,
    instructionLine1: line1,
    instructionLine2: line2,
    primaryColor: (config.primaryColor || '').trim() || undefined,
    accentColor: (config.accentColor || '').trim() || undefined,
    yearFillColor: (config.lgsYearFillColor || '').trim() || undefined,
    yearTextColor: (config.lgsYearTextColor || '').trim() || undefined,
    yearFontPt: config.lgsYearFontPt,
    yearPadXPt: config.lgsYearPadXPt,
    yearPadYPt: config.lgsYearPadYPt,
    titleFontPt: config.lgsTitleFontPt,
    titleTextColor: (config.lgsTitleTextColor || '').trim() || undefined,
    titleBold: config.lgsTitleBold !== false,
    subjectFontPt: config.lgsSubjectFontPt,
    subjectTextColor: (config.lgsSubjectTextColor || '').trim() || undefined,
    subjectBold: config.lgsSubjectBold !== false,
    subjectBandWidthPt: config.lgsSubjectBandWidthPt,
    instructionFontPt: config.lgsInstructionFontPt,
  }
}
