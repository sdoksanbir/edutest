import type { HeaderConfig } from './corporateHeaderLayout'
import { resolveHeaderLogoUrl } from './presetHeaderLogos'
import { isHeaderFieldVisible } from './headerFieldVisibility'
import type { ExamBannerData } from '../components/exam-banner/types'

function txt(config: HeaderConfig, field: keyof HeaderConfig, visible = true): string {
  if (!visible) return ''
  const v = config[field]
  return typeof v === 'string' ? v.trim() : ''
}

/** headerConfig → ExamBannerData (tek kaynak) */
export function examBannerDataFromHeaderConfig(config: HeaderConfig): ExamBannerData {
  const logoUrl = resolveHeaderLogoUrl(config)
  const institution =
    txt(config, 'brandName', isHeaderFieldVisible(config, 'brandName')) ||
    txt(config, 'schoolName', isHeaderFieldVisible(config, 'schoolName'))

  const tpl = config.examBannerTemplate ?? ''
  const isVisualRef = tpl.startsWith('viz-')

  return {
    logoUrl: logoUrl || undefined,
    institutionName: institution || undefined,
    subject: txt(config, 'subject', isHeaderFieldVisible(config, 'subject')) || undefined,
    title: config.examBannerTitle?.trim() || undefined,
    topic: txt(config, 'topic', isHeaderFieldVisible(config, 'topic')) || undefined,
    subTopic: txt(config, 'subTopic', isHeaderFieldVisible(config, 'subTopic')) || undefined,
    gradeLevel: (config.gradeLevel || '').trim() || undefined,
    examType: txt(config, 'examType', isHeaderFieldVisible(config, 'examType')) || undefined,
    examLabel: (config.testType || '').trim() || undefined,
    semester: (config.publisherLine || '').trim() || undefined,
    writtenExamNumber: (config.writtenExamNumber || '').trim() || undefined,
    schoolName: txt(config, 'schoolName', isHeaderFieldVisible(config, 'schoolName')) || undefined,
    academicYear: (config.academicYear || '').trim() || undefined,
    showStudentInfo: config.showStudentInfo === true,
    scoreCorrect: config.scoreCorrect,
    scoreWrong: config.scoreWrong,
    scoreBlank: config.scoreBlank,
    showScoreBox: isVisualRef && tpl !== 'viz-maarif-official',
  }
}
