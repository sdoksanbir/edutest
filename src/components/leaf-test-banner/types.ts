export interface LeafTestBannerFontSizes {
  subject?: number
  topic?: number
  subTopic?: number
  testType?: number
  gradeLevel?: number
  examType?: number
  testNumber?: number
  institutionName?: number
  institutionSubtitle?: number
}

export interface LeafTestBannerPublicationLine {
  text: string
  fontPt: number
  color: string
}

export interface LeafTestBannerData {
  logoUrl?: string
  presetLogoId?: string
  showHeaderLeft?: boolean
  headerLeftMode?: 'logo' | 'publicationText'
  logoPrimaryColor?: string
  logoAccentColor?: string
  institutionName?: string
  institutionSubtitle?: string
  subject?: string
  topic?: string
  subTopic?: string
  testType?: string
  gradeLevel?: string
  examType?: string
  testNumber?: string
  fontSizes?: LeafTestBannerFontSizes
  primaryColor?: string
  accentColor?: string
  logoScale?: number
  publicationLines?: LeafTestBannerPublicationLine[]
  scoreCorrect?: number | null
  scoreWrong?: number | null
  scoreNet?: number | null
}

export type LeafTestCorporateBannerProps = {
  data: LeafTestBannerData
  className?: string
  thumbnail?: boolean
  ariaLabel?: string
}
