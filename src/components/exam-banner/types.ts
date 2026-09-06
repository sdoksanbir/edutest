export type ExamBannerTemplateId =
  | 'leaf-corporate'
  | 'leaf-minimal'
  | 'leaf-modern'
  | 'leaf-linear'
  | 'yks-tyt'
  | 'yks-ayt'
  | 'lgs-verbal'
  | 'lgs-numerical'
  | 'maarif-written'
  | 'viz-leaf-pro'
  | 'viz-leaf-soft'
  | 'viz-leaf-bold'
  | 'viz-leaf-geo'
  | 'viz-yks-wave'
  | 'viz-deneme-curve'
  | 'viz-deneme-angular'
  | 'viz-deneme-solid'
  | 'viz-maarif-official'

export interface ExamBannerData {
  logoUrl?: string
  institutionName?: string
  subject?: string
  title?: string
  topic?: string
  subTopic?: string
  gradeLevel?: string
  examType?: string
  examLabel?: string
  semester?: string
  writtenExamNumber?: string
  schoolName?: string
  academicYear?: string
  showStudentInfo?: boolean
  scoreCorrect?: number | null
  scoreWrong?: number | null
  scoreBlank?: number | null
  showScoreBox?: boolean
}

export interface BannerStyleConfig {
  primaryColor?: string
  secondaryColor?: string
  textColor?: string
  logoScale?: number
  height?: number
  borderRadius?: number
}

export type ExamBannerProps = {
  template?: ExamBannerTemplateId
  data: ExamBannerData
  style?: BannerStyleConfig
  className?: string
  thumbnail?: boolean
  ariaLabel?: string
}

export type ExamBannerCategory = {
  id: string
  label: string
  templates: { id: ExamBannerTemplateId; label: string }[]
}

export const EXAM_BANNER_CATEGORIES: ExamBannerCategory[] = [
  {
    id: 'leaf',
    label: 'Yaprak Test',
    templates: [
      { id: 'leaf-corporate', label: 'Kurumsal Şerit' },
      { id: 'leaf-minimal', label: 'Minimal Akademik' },
      { id: 'leaf-modern', label: 'Modern Blok' },
      { id: 'leaf-linear', label: 'Çizgisel' },
    ],
  },
  {
    id: 'trial',
    label: 'Deneme Sınavı',
    templates: [
      { id: 'yks-tyt', label: 'YKS – TYT' },
      { id: 'yks-ayt', label: 'YKS – AYT' },
      { id: 'lgs-verbal', label: 'LGS – Sözel' },
      { id: 'lgs-numerical', label: 'LGS – Sayısal' },
    ],
  },
  {
    id: 'written',
    label: 'Yazılı Sınavı',
    templates: [{ id: 'maarif-written', label: 'Maarif Yazılı' }],
  },
  {
    id: 'visual-ref',
    label: 'Görsel Referans',
    templates: [
      { id: 'viz-leaf-pro', label: 'Profesyonel' },
      { id: 'viz-leaf-soft', label: 'Yumuşak Modern' },
      { id: 'viz-leaf-bold', label: 'Kalın Grafik' },
      { id: 'viz-leaf-geo', label: 'Minimal Geometrik' },
      { id: 'viz-yks-wave', label: 'YKS Dalga' },
      { id: 'viz-deneme-curve', label: 'Deneme Eğri' },
      { id: 'viz-deneme-angular', label: 'Deneme Açılı' },
      { id: 'viz-deneme-solid', label: 'Deneme Yapısal' },
      { id: 'viz-maarif-official', label: 'Maarif Resmi' },
    ],
  },
]

export function normalizeExamBannerTemplateId(raw: unknown): ExamBannerTemplateId {
  const id = String(raw ?? 'leaf-corporate')
  const all = EXAM_BANNER_CATEGORIES.flatMap((c) => c.templates.map((t) => t.id))
  return (all.includes(id as ExamBannerTemplateId) ? id : 'leaf-corporate') as ExamBannerTemplateId
}
