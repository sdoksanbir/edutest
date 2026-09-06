export type TestBannerTemplateId = 'modern' | 'minimal' | 'corporate' | 'strip'

export interface TestBannerData {
  logoUrl?: string
  institutionName?: string
  subject: string
  topic: string
  subTopic?: string
  gradeLevel: string
  examType?: string
  testType?: string
  correct?: number | null
  wrong?: number | null
  blank?: number | null
}

export type TestBannerProps = {
  template?: TestBannerTemplateId
  data: TestBannerData
  className?: string
  /** Küçük önizleme kartları için */
  thumbnail?: boolean
  /** Erişilebilirlik etiketi */
  ariaLabel?: string
  /** Tema panelinden renk geçersiz kılma */
  colors?: {
    primary?: string
    secondary?: string
  }
}

export const TEST_BANNER_TEMPLATE_OPTIONS: {
  id: TestBannerTemplateId
  label: string
}[] = [
  { id: 'modern', label: 'Modern' },
  { id: 'strip', label: 'Şerit' },
  { id: 'corporate', label: 'Kurumsal' },
  { id: 'minimal', label: 'Minimal' },
]

export function normalizeBannerTemplateId(raw: unknown): TestBannerTemplateId {
  const id = String(raw ?? 'modern')
  if (id === 'minimal' || id === 'corporate' || id === 'strip' || id === 'boxed') {
    return id === 'boxed' ? 'corporate' : id
  }
  return 'modern'
}
