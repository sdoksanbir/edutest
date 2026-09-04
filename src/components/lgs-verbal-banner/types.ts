export interface LgsVerbalBannerData {
  logoUrl?: string
  institutionName?: string
  institutionSubtitle?: string
  examLabel?: string
  examType?: string
  sectionName?: string
  gradeLevel?: string
  gradeExamType?: string
  scoreCorrect?: number | null
  scoreWrong?: number | null
  scoreBlank?: number | null
  primaryColor?: string
  accentColor?: string
}

export type LgsVerbalBannerProps = {
  data: LgsVerbalBannerData
  className?: string
  thumbnail?: boolean
  ariaLabel?: string
}

export type LgsVerbalBannerCompareMode = 'reference' | 'vector' | 'overlay'
