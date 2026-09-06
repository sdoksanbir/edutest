/** Kurumsal test başlığı — Canvas önizleme + layout geometrisi ortak sabitler */

import { HEADER_LOGO_SIZE_DEFAULT_PCT } from './headerLogo'
import {
  parseHeaderLeftMode,
  clampPublicationLineFontPt,
  PUBLICATION_LINE1_FONT_DEFAULT_PT,
  PUBLICATION_LINE2_FONT_DEFAULT_PT,
  PUBLICATION_LINE1_COLOR_DEFAULT,
  PUBLICATION_LINE2_COLOR_DEFAULT,
  type HeaderLeftMode,
} from './headerLeftColumn'
import {
  DEFAULT_PRESET_HEADER_LOGO_ID,
  defaultPresetHeaderLogoUrl,
  presetHeaderLogoUrl,
  type PresetHeaderLogoId,
} from './presetHeaderLogos'
import {
  parseExamTypeBoxBorderStyle,
  clampExamTypeBoxBorderWidthPt,
  clampExamTypeBoxManualWidthPt,
  clampExamTypeBoxManualHeightPt,
  clampExamTypeBoxPadXPt,
  clampExamTypeBoxPadYPt,
  splitExamTypeToLines,
  parseExamTypeTextAlign,
  parseExamTypeDividerStyle,
  clampExamTypeDividerWidthPt,
  type ExamTypeBoxBorderStyle,
  type ExamTypeTextAlign,
} from './examTypeBox'
import { parseHeaderFieldHidden, type HeaderFieldHidden } from './headerFieldVisibility'
import {
  clampSubjectPillPadXPt,
  clampSubjectPillPadYPt,
  clampSubjectPillTextOffsetYPt,
  clampSubjectTopicGapPt,
  clampTopicSubTopicGapPt,
} from './modernCorporateHeaderShared'
import { isClassicTestBannerHeader, isThemeHeader } from './headerStyleIds'
import { themeFirstPageHeaderTotalPt, themeRunningHeaderTotalPt } from './headerHeights'
import type { HeaderBadgeByStyle } from './headerBadgeByStyle'
import type { HeaderInfoByStyle } from './headerInfoByStyle'
import { parseHeaderBadgeByStyle } from './headerBadgeByStyle'
import { parseHeaderInfoByStyle } from './headerInfoByStyle'

export {
  CORPORATE_FONT_EXAM_PT,
  CORPORATE_FONT_SUBJECT_PT,
  CORPORATE_FONT_TOPIC_PT,
  CORPORATE_FONT_AUTHOR_PT,
  CORPORATE_FONT_BRAND_PT,
  CORPORATE_FONT_PUBLISHER_MAIN_PT,
  CORPORATE_FONT_PUBLISHER_SUB_PT,
} from './corporateHeaderConstants'

export type HeaderFieldFontSizesPt = Partial<
  Record<
    | 'subject'
    | 'examType'
    | 'topic'
    | 'subTopic'
    | 'authorName'
    | 'brandName'
    | 'schoolName'
    | 'testNumber'
    | 'testType'
    | 'publisherLine',
    number
  >
>

function parseHeaderFieldFontSizesPt(raw: unknown): HeaderFieldFontSizesPt {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  const keys = [
    'subject', 'examType', 'topic', 'subTopic', 'authorName',
    'brandName', 'schoolName', 'testNumber', 'testType', 'publisherLine',
  ] as const
  const out: HeaderFieldFontSizesPt = {}
  for (const key of keys) {
    const v = o[key]
    if (v == null) continue
    const n = Number(v)
    if (Number.isFinite(n)) out[key] = n
  }
  return out
}

export type HeaderFieldColors = Partial<
  Record<
    | 'subject'
    | 'examType'
    | 'topic'
    | 'subTopic'
    | 'authorName'
    | 'brandName'
    | 'schoolName'
    | 'testNumber'
    | 'testType'
    | 'publisherLine',
    string
  >
>

function parseHeaderFieldColors(raw: unknown): HeaderFieldColors {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  const keys = [
    'subject', 'examType', 'topic', 'subTopic', 'authorName',
    'brandName', 'schoolName', 'testNumber', 'testType', 'publisherLine',
  ] as const
  const out: HeaderFieldColors = {}
  for (const key of keys) {
    const v = o[key]
    if (typeof v !== 'string') continue
    const c = v.trim()
    if (/^#[0-9A-Fa-f]{6}$/.test(c)) out[key] = c
  }
  return out
}

export type HeaderFieldFontStyle = {
  bold?: boolean
  italic?: boolean
}

export type HeaderFieldFontStyles = Partial<
  Record<
    | 'subject'
    | 'examType'
    | 'topic'
    | 'subTopic'
    | 'authorName'
    | 'brandName'
    | 'schoolName'
    | 'testNumber'
    | 'testType'
    | 'publisherLine',
    HeaderFieldFontStyle
  >
>

function parseHeaderFieldFontStyles(raw: unknown): HeaderFieldFontStyles {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  const keys = [
    'subject', 'examType', 'topic', 'subTopic', 'authorName',
    'brandName', 'schoolName', 'testNumber', 'testType', 'publisherLine',
  ] as const
  const out: HeaderFieldFontStyles = {}
  for (const key of keys) {
    const v = o[key]
    if (!v || typeof v !== 'object') continue
    const s = v as Record<string, unknown>
    const style: HeaderFieldFontStyle = {}
    if (typeof s.bold === 'boolean') style.bold = s.bold
    if (typeof s.italic === 'boolean') style.italic = s.italic
    if (style.bold != null || style.italic != null) out[key] = style
  }
  return out
}

export type { HeaderLeftMode } from './headerLeftColumn'
export type { PresetHeaderLogoId } from './presetHeaderLogos'
export type { HeaderFieldHidden } from './headerFieldVisibility'
export type { ExamTypeBoxBorderStyle, ExamTypeTextAlign } from './examTypeBox'

export type BannerTemplateId = 'modern' | 'minimal' | 'corporate' | 'strip'

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
  | 'leaf-ref-corporate'
  | 'lgs-verbal-ref'

const EXAM_BANNER_TEMPLATE_IDS: ExamBannerTemplateId[] = [
  'leaf-corporate',
  'leaf-minimal',
  'leaf-modern',
  'leaf-linear',
  'yks-tyt',
  'yks-ayt',
  'lgs-verbal',
  'lgs-numerical',
  'maarif-written',
  'viz-leaf-pro',
  'viz-leaf-soft',
  'viz-leaf-bold',
  'viz-leaf-geo',
  'viz-yks-wave',
  'viz-deneme-curve',
  'viz-deneme-angular',
  'viz-deneme-solid',
  'viz-maarif-official',
  'leaf-ref-corporate',
  'lgs-verbal-ref',
]

export function parseExamBannerTemplateId(raw: unknown): ExamBannerTemplateId {
  const id = String(raw ?? 'leaf-corporate')
  return (EXAM_BANNER_TEMPLATE_IDS.includes(id as ExamBannerTemplateId)
    ? id
    : 'leaf-corporate') as ExamBannerTemplateId
}

export type HeaderConfig = {
  logoUrl: string
  /** Hazır logo: 1–5 veya custom (kullanıcı yüklemesi) */
  presetLogoId: PresetHeaderLogoId
  /** Logo boyutu — taban genişliğe göre % (40–160) */
  logoSizePct: number
  /** Minimal — logo ile sol kutu dikey boşluk (üst+alt, pt); kutuyu büyütür */
  logoPadYPt: number
  /** Minimal — logo ile sol kutu sol boşluk (pt) */
  logoPadLeftPt: number
  /** Sol sütunda logo veya kurum adı göster */
  showHeaderLeft: boolean
  /** Minimal — konu / alt konu / D·Y·B bilgi şeridi */
  showClassicInfoBar: boolean
  /** Sol sütun içeriği */
  headerLeftMode: HeaderLeftMode
  /** Yayın adı — 1. satır */
  institutionLine1: string
  /** Yayın adı — 2. satır */
  institutionLine2: string
  institutionLine1FontPt: number
  institutionLine2FontPt: number
  institutionLine1Color: string
  institutionLine2Color: string
  /** Sol kutu (Minimal) — kurum rozeti dolgu; boşsa Test No dolgusu / primaryColor */
  headerLeftFillColor: string
  /** Minimal kurum adı rozeti genişliği (pt) — Test No ile aynı aralık */
  institutionBadgeWidthPt: number
  /** Minimal kurum adı rozeti yüksekliği (pt) — Test No ile aynı aralık */
  institutionBadgeHeightPt: number
  /** Minimal kurum adı rozeti yatay iç boşluk (pt) */
  institutionBadgePadXPt: number
  /** Minimal kurum adı rozeti köşe radius (pt) */
  institutionBadgeRadiusPt: number
  /** Tema 1 sağ kutu — sınav türü 1. satır */
  examTypeLine1: string
  /** Tema 1 sağ kutu — sınav türü 2. satır */
  examTypeLine2: string
  examTypeLine1FontPt: number
  examTypeLine2FontPt: number
  examTypeLine1Color: string
  examTypeLine2Color: string
  /** none | solid | dashed | dotted */
  examTypeBoxBorderStyle: ExamTypeBoxBorderStyle
  examTypeBoxBorderColor: string
  examTypeBoxBorderWidthPt: number
  /** Sağ kutu genişliği (pt) — slider */
  examTypeBoxManualWidthPt: number
  /** Sağ kutu yüksekliği (pt) — slider */
  examTypeBoxManualHeightPt: number
  /** Sağ kutu iç dolgu — yatay (pt) */
  examTypeBoxPadXPt: number
  /** Sağ kutu iç dolgu — dikey (pt, üst=alt) */
  examTypeBoxPadYPt: number
  /** Sınıf yatay kaydırma (pt, + sola) */
  examTypeOffsetXPt: number
  /** Sınıf dikey kaydırma (pt, + aşağı) */
  examTypeOffsetYPt: number
  /** Sağ kutu arka plan dolgu */
  examTypeBoxFillEnabled: boolean
  examTypeBoxFillColor: string
  examTypeTextAlign: ExamTypeTextAlign
  examTypeDividerStyle: ExamTypeBoxBorderStyle
  examTypeDividerColor: string
  examTypeDividerWidthPt: number
  /** Tema 1 — ders adı pill yatay padding (pt) */
  subjectPillPadXPt: number
  /** Tema 1 — ders adı pill dikey padding (pt, üst=alt) */
  subjectPillPadYPt: number
  /** Tema 1 — ders adı pill arka plan; boşsa accentColor */
  subjectPillFillColor: string
  /** Tema 1 — ders adı pill yazı rengi */
  subjectPillTextColor: string
  /** Tema 1 — ders adı yazısı dikey kaydırma (pt; − yukarı, + aşağı) */
  subjectPillTextOffsetYPt: number
  /** Tema 1 — ders adı ile konu arası boşluk (pt) */
  subjectTopicGapPt: number
  /** Tema 1 — konu ile alt konu arası boşluk (pt) */
  topicSubTopicGapPt: number
  examType: string
  subject: string
  topic: string
  subTopic: string
  brandName: string
  authorName: string
  primaryColor: string
  accentColor: string
  /** Tema 1 — logo altı yayınevi satırı */
  publisherLine: string
  /** Tema 2 — okul / kurum adı */
  schoolName: string
  /** Tema 3/4 — deneme / test numarası */
  testNumber: string
  /** Tema 3 — hap etiket metinleri */
  tagLabels: string[]
  /** Tema 3 — QR alanı üst yazısı */
  qrHint: string
  /** Alan bazlı başlık yazı boyutları (pt) */
  fieldFontSizesPt: HeaderFieldFontSizesPt
  /** Alan bazlı başlık yazı renkleri */
  fieldColors: HeaderFieldColors
  /** Alan bazlı kalın / italik */
  fieldFontStyles: HeaderFieldFontStyles
  /** Hazır logo renkleri temadan mı (true) yoksa özel mi */
  logoUseThemeColors: boolean
  /** Özel logo — koyu ton rengi */
  logoColorPrimary: string
  /** Özel logo — açık / vurgu ton rengi */
  logoColorSecondary: string
  /** Gizli başlık alanları — true ise PDF/önizlemede çizilmez */
  fieldHidden: HeaderFieldHidden
  /** Yaprak test banner şablonu */
  bannerTemplate: BannerTemplateId
  /** true: yaprak TestBanner; false: klasik canvas başlık (Tema 1–4) */
  useYaprakBanner: boolean
  /** true: yeni ExamBanner sistemi (9 şablon) */
  useExamBanner: boolean
  /** ExamBanner şablon kimliği */
  examBannerTemplate: ExamBannerTemplateId
  /** Deneme sınavı başlık satırı (ör. DENEME SINAVI) */
  examBannerTitle: string
  /** Yazılı — eğitim öğretim yılı */
  academicYear: string
  /** Yazılı — sınav numarası (ör. 1. YAZILI) */
  writtenExamNumber: string
  /** Opsiyonel öğrenci bilgi satırı */
  showStudentInfo: boolean
  /** Sınıf düzeyi — banner */
  gradeLevel: string
  /** Test türü — banner (ör. Konu Testi) / Test No etiketi */
  testType: string
  /** Tema 1 Test No — etiket punto */
  testNoLabelFontPt: number
  /** Tema 1 Test No — numara punto */
  testNoNumFontPt: number
  /** Tema 1 Test No — etiket yazı rengi */
  testNoLabelColor: string
  /** Tema 1 Test No — numara yazı rengi */
  testNoNumColor: string
  /** Tema 1 Test No — etiket dolgu rengi */
  testNoFillColor: string
  /** Tema 1 Test No — dış çerçeve rengi */
  testNoBorderColor: string
  /** Test No kutusu genişlik (pt) */
  testNoWidthPt: number
  /** Test No kutusu yükseklik (pt) */
  testNoHeightPt: number
  /** Test No dikey kaydırma (pt, + aşağı) */
  testNoOffsetYPt: number
  /** TEST yazısı ile numara dairesi arası (pt) */
  testNoGapXPt: number
  /** Test No yatay kaydırma (pt, + sola) */
  testNoOffsetXPt: number
  /** Tema 1 D/Y/B kutusu genişlik (pt) */
  scoreBoxWidthPt: number
  /** Tema 1 D/Y/B kutusu yükseklik (pt) */
  scoreBoxHeightPt: number
  /** D/Y/B dikey kaydırma (pt, + aşağı) */
  scoreBoxOffsetYPt: number
  /** Tema 1 D/Y/B etiket punto */
  scoreBoxLabelFontPt: number
  /** Tema 1 D/Y/B yazı rengi (boşsa ana renk) */
  scoreBoxLabelColor: string
  /** Tema 1 D/Y/B çerçeve rengi (boşsa ana renk) */
  scoreBoxBorderColor: string
  /** Tema 1 D/Y/B dolgu rengi (boşsa beyaz) */
  scoreBoxFillColor: string
  /** Tema 1 D/Y/B dış çerçeve kalınlığı (pt) */
  scoreBoxBorderWidthPt: number
  /** Tema 1 D/Y/B alt çizgi kalınlığı (pt) */
  scoreBoxLineWidthPt: number
  /** Değerlendirme — doğru (null = boş çizgi) */
  scoreCorrect: number | null
  scoreWrong: number | null
  scoreBlank: number | null
  /** Tema 1 sağ alan: sınav türü | D/Y/B | test no | kapalı (legacy tek seçim) */
  bannerRightMode: 'examType' | 'score' | 'testNo' | 'hidden'
  /**
   * Kurumsal sağ rozetler — en fazla 2 (Sınıf=examType, D/Y/B, Test No), alt alta.
   * Yoksa bannerRightMode’dan türetilir.
   */
  bannerRightSlots: Array<'examType' | 'score' | 'testNo'>
  /** Rozet ayarları — tema bazında bağımsız */
  badgeByStyle: HeaderBadgeByStyle
  /** Başlık bilgileri / sol kutu stilleri — tema bazında bağımsız */
  headerInfoByStyle: HeaderInfoByStyle
}

export type HeaderTemplate = {
  id: string
  name: string
  config: HeaderConfig
  savedAt: number
}

export const CORPORATE_HEADER_STYLE_ID = 'corporate'

export const CORPORATE_BODY_H_PT = 56
/** Kalın alt şerit — kırmızı/lacivert çapraz bölünme */
export const CORPORATE_STRIPE_ROW_H_PT = 4
export const CORPORATE_STRIPE_SECTION_GAP_PT = 1.1
export const CORPORATE_STRIPE_END_DOT_W_PT = 3.2
export const CORPORATE_STRIPE_END_DOT_GAP_PT = 0.75
export const CORPORATE_STRIPE_H_PT = 2.5
export const CORPORATE_LEFT_COL_W_PT = 78
export const CORPORATE_LOGO_W_PT = 28
export const CORPORATE_LOGO_GAP_PT = 6
export const CORPORATE_DIVIDER_GAP_PT = 6
export const CORPORATE_TEXT_PAD_PT = 4
export const CORPORATE_BRAND_BOX_W_PT = 96
export const CORPORATE_BRAND_BOX_H_PT = 22
export const CORPORATE_BRAND_BOX_R_PT = 4

export const CORPORATE_GOLD = '#C59B27'
export const CORPORATE_GOLD_LIGHT = '#D4AF37'
export const CORPORATE_GOLD_DARK = '#9A7518'
export const CORPORATE_BOX_BORDER_PT = 1.5

/** Diğer sayfalar — kompakt üst banner */
export const CORPORATE_OTHER_BODY_H_PT = 15
export const CORPORATE_OTHER_TEXT_STRIPE_GAP_PT = 3
export const CORPORATE_OTHER_GAP_BELOW_PT = 4
export const CORPORATE_OTHER_FONT_SUBJECT_PT = 11
export const CORPORATE_OTHER_FONT_TOPIC_PT = 10
export const CORPORATE_OTHER_TOPIC_DIVIDER_GAP_PT = 5

export const CORPORATE_GRAY = '#6B7280'

export function defaultHeaderConfig(): HeaderConfig {
  return {
    logoUrl: defaultPresetHeaderLogoUrl(),
    presetLogoId: DEFAULT_PRESET_HEADER_LOGO_ID,
    logoSizePct: HEADER_LOGO_SIZE_DEFAULT_PCT,
    logoPadYPt: 2,
    logoPadLeftPt: 4,
    showHeaderLeft: true,
    showClassicInfoBar: true,
    headerLeftMode: 'logo',
    institutionLine1: '',
    institutionLine2: '',
    institutionLine1FontPt: PUBLICATION_LINE1_FONT_DEFAULT_PT,
    institutionLine2FontPt: PUBLICATION_LINE2_FONT_DEFAULT_PT,
    institutionLine1Color: PUBLICATION_LINE1_COLOR_DEFAULT,
    institutionLine2Color: PUBLICATION_LINE2_COLOR_DEFAULT,
    headerLeftFillColor: '',
    institutionBadgeWidthPt: 160,
    institutionBadgeHeightPt: 18,
    institutionBadgePadXPt: 6,
    institutionBadgeRadiusPt: 2.5,
    examTypeLine1: '9. Sınıf',
    examTypeLine2: '',
    examTypeLine1FontPt: 11,
    examTypeLine2FontPt: 10,
    examTypeLine1Color: '#FFFFFF',
    examTypeLine2Color: '',
    examTypeBoxBorderStyle: 'none',
    examTypeBoxBorderColor: '#0A1931',
    examTypeBoxBorderWidthPt: CORPORATE_BOX_BORDER_PT,
    examTypeBoxManualWidthPt: 100,
    examTypeBoxManualHeightPt: CORPORATE_BRAND_BOX_H_PT,
    examTypeBoxPadXPt: 4,
    examTypeBoxPadYPt: 4,
    examTypeOffsetXPt: 0,
    examTypeOffsetYPt: 7,
    examTypeBoxFillEnabled: true,
    examTypeBoxFillColor: '#0A1931',
    examTypeTextAlign: 'center',
    examTypeDividerStyle: 'none',
    examTypeDividerColor: PUBLICATION_LINE2_COLOR_DEFAULT,
    examTypeDividerWidthPt: 0.75,
    subjectPillPadXPt: 8,
    subjectPillPadYPt: 4,
    subjectPillFillColor: '',
    subjectPillTextColor: '#FFFFFF',
    subjectPillTextOffsetYPt: -3,
    subjectTopicGapPt: 3,
    topicSubTopicGapPt: 3,
    examType: '9. Sınıf',
    subject: 'MATEMATİK',
    topic: 'POLİNOMLAR',
    subTopic: 'Bölme İşlemi',
    brandName: 'EDUMATH',
    authorName: 'SERKAN DOKSANBİR',
    primaryColor: '#0A1931',
    accentColor: '#F34A2F',
    publisherLine: '',
    schoolName: 'ANADOLU LİSESİ',
    testNumber: '01',
    tagLabels: ['Konu Kavrama', 'Yeni Nesil', 'Analiz', 'Zorluk Seviyesi'],
    qrHint: 'ÇÖZÜMLER İÇİN OKUTUNUZ',
    fieldFontSizesPt: {},
    fieldColors: {},
    fieldFontStyles: { subTopic: { italic: true } },
    logoUseThemeColors: true,
    logoColorPrimary: '#0A1931',
    logoColorSecondary: '#FFB800',
    fieldHidden: { examType: true, subTopic: true },
    bannerTemplate: 'modern',
    useYaprakBanner: false,
    useExamBanner: false,
    examBannerTemplate: 'leaf-corporate',
    examBannerTitle: 'DENEME SINAVI',
    academicYear: '2026–2027',
    writtenExamNumber: '1. YAZILI SINAVI',
    showStudentInfo: false,
    gradeLevel: '10. SINIF',
    testType: 'TEST',
    testNoLabelFontPt: 15,
    testNoNumFontPt: 11,
    testNoLabelColor: '',
    testNoNumColor: '#FFFFFF',
    testNoFillColor: '',
    testNoBorderColor: '',
    testNoWidthPt: 100,
    testNoHeightPt: 22,
    testNoOffsetYPt: 3,
    testNoGapXPt: 3,
    testNoOffsetXPt: 23,
    scoreBoxWidthPt: 100,
    scoreBoxHeightPt: 17,
    scoreBoxOffsetYPt: 9,
    scoreBoxLabelFontPt: 10,
    scoreBoxLabelColor: '',
    scoreBoxBorderColor: '',
    scoreBoxFillColor: '#FFFFFF',
    scoreBoxBorderWidthPt: 1.25,
    scoreBoxLineWidthPt: 0.75,
    scoreCorrect: null,
    scoreWrong: null,
    scoreBlank: null,
    bannerRightMode: 'examType',
    bannerRightSlots: ['examType', 'score'],
    badgeByStyle: {},
    headerInfoByStyle: {},
  }
}

/** Banner + üst/alt eğimli şeritler */
export function corporateBannerBlockHeightPt(config?: HeaderConfig, styleId = 'style_1'): number {
  return themeFirstPageHeaderTotalPt(styleId, config)
}

/** İlk sayfa kurumsal başlık yüksekliği — tema bazlı */
export function corporateFirstPageHeaderTotalPt(styleId?: string): number {
  return themeFirstPageHeaderTotalPt(styleId)
}

/** 2+ sayfa kurumsal üst banner toplam yüksekliği */
export function corporateOtherPageHeaderTotalPt(styleId?: string): number {
  return themeRunningHeaderTotalPt(styleId)
}

export function topicLineText(config: HeaderConfig): string {
  const t = (config.topic || '').trim()
  const s = (config.subTopic || '').trim()
  if (t && s) return `${t} / ${s}`
  return t || s || ''
}

function parseTagLabels(raw: unknown, fallback: string[]): string[] {
  if (!Array.isArray(raw)) return fallback
  const labels = raw.map((v) => String(v).trim()).filter(Boolean)
  return labels.length > 0 ? labels : fallback
}

function parseBool(raw: unknown, fallback: boolean): boolean {
  if (raw === true || raw === 1) return true
  if (raw === false || raw === 0) return false
  if (typeof raw === 'string') {
    const s = raw.toLowerCase().trim()
    if (s === 'true' || s === '1') return true
    if (s === 'false' || s === '0') return false
  }
  return fallback
}

function parseBannerTemplateId(raw: unknown): BannerTemplateId {
  const id = String(raw ?? 'modern')
  if (id === 'minimal' || id === 'corporate' || id === 'strip') return id
  if (id === 'boxed') return 'corporate'
  return 'modern'
}

function parseScoreField(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

export function parseHeaderConfig(raw: unknown): HeaderConfig {
  const d = defaultHeaderConfig()
  if (!raw || typeof raw !== 'object') return d
  const o = raw as Record<string, unknown>
  const presetLogoId = (() => {
    const rawId = String(o.presetLogoId ?? o.preset_logo_id ?? d.presetLogoId)
    if (rawId === 'custom' || ['1', '2', '3', '4', '5'].includes(rawId)) return rawId as PresetHeaderLogoId
    return d.presetLogoId
  })()
  return {
    logoUrl: (() => {
      const v = String(o.logoUrl ?? '').trim()
      if (v) return v
      if (presetLogoId !== 'custom') {
        return presetHeaderLogoUrl(presetLogoId) ?? defaultPresetHeaderLogoUrl()
      }
      return d.logoUrl
    })(),
    presetLogoId,
    logoSizePct: Math.max(
      40,
      Math.min(160, Number(o.logoSizePct ?? o.logo_size_pct ?? d.logoSizePct)),
    ),
    logoPadYPt: (() => {
      const direct = o.logoPadYPt ?? o.logo_pad_y_pt
      if (direct != null && Number.isFinite(Number(direct))) {
        return Math.max(0, Math.min(20, Math.round(Number(direct) * 2) / 2))
      }
      const top = Number(o.logoPadTopPt ?? o.logo_pad_top_pt)
      const bottom = Number(o.logoPadBottomPt ?? o.logo_pad_bottom_pt)
      if (Number.isFinite(top) || Number.isFinite(bottom)) {
        const t = Number.isFinite(top) ? top : 2
        const b = Number.isFinite(bottom) ? bottom : 2
        return Math.max(0, Math.min(20, Math.round(((t + b) / 2) * 2) / 2))
      }
      return d.logoPadYPt
    })(),
    logoPadLeftPt: Math.max(
      0,
      Math.min(20, Math.round(Number(o.logoPadLeftPt ?? o.logo_pad_left_pt ?? d.logoPadLeftPt) * 2) / 2),
    ),
    showHeaderLeft: Boolean(o.showHeaderLeft ?? o.show_header_left ?? d.showHeaderLeft),
    showClassicInfoBar: parseBool(
      o.showClassicInfoBar ?? o.show_classic_info_bar,
      d.showClassicInfoBar,
    ),
    headerLeftMode: parseHeaderLeftMode(o.headerLeftMode ?? o.header_left_mode ?? d.headerLeftMode),
    institutionLine1: String(o.institutionLine1 ?? o.institution_line1 ?? d.institutionLine1),
    institutionLine2: String(o.institutionLine2 ?? o.institution_line2 ?? d.institutionLine2),
    institutionLine1FontPt: clampPublicationLineFontPt(
      Number(o.institutionLine1FontPt ?? o.institution_line1_font_pt ?? d.institutionLine1FontPt),
    ),
    institutionLine2FontPt: clampPublicationLineFontPt(
      Number(o.institutionLine2FontPt ?? o.institution_line2_font_pt ?? d.institutionLine2FontPt),
    ),
    institutionLine1Color: String(
      o.institutionLine1Color ??
        o.institution_text_color ??
        o.institutionTextColor ??
        d.institutionLine1Color,
    ),
    institutionLine2Color: String(
      o.institutionLine2Color ?? o.institution_text_color ?? o.institutionTextColor ?? d.institutionLine2Color,
    ),
    headerLeftFillColor: String(
      o.headerLeftFillColor ?? o.header_left_fill_color ?? d.headerLeftFillColor ?? '',
    ),
    institutionBadgeWidthPt: Math.max(
      40,
      Math.min(
        160,
        Math.round(
          Number(
            o.institutionBadgeWidthPt ??
              o.institution_badge_width_pt ??
              d.institutionBadgeWidthPt,
          ),
        ),
      ),
    ),
    institutionBadgeHeightPt: Math.max(
      12,
      Math.min(
        64,
        Math.round(
          Number(
            o.institutionBadgeHeightPt ??
              o.institution_badge_height_pt ??
              d.institutionBadgeHeightPt,
          ),
        ),
      ),
    ),
    institutionBadgePadXPt: Math.max(
      0,
      Math.min(
        24,
        Math.round(
          Number(
            o.institutionBadgePadXPt ??
              o.institution_badge_pad_x_pt ??
              d.institutionBadgePadXPt,
          ) * 2,
        ) / 2,
      ),
    ),
    institutionBadgeRadiusPt: Math.max(
      0,
      Math.min(
        16,
        Math.round(
          Number(
            o.institutionBadgeRadiusPt ??
              o.institution_badge_radius_pt ??
              d.institutionBadgeRadiusPt,
          ) * 2,
        ) / 2,
      ),
    ),
    examTypeLine1: String(
      o.examTypeLine1 ??
        o.exam_type_line1 ??
        (d.examTypeLine1 || splitExamTypeToLines(String(o.examType ?? d.examType)).line1),
    ),
    examTypeLine2: String(
      o.examTypeLine2 ??
        o.exam_type_line2 ??
        (d.examTypeLine2 || splitExamTypeToLines(String(o.examType ?? d.examType)).line2),
    ),
    examTypeLine1FontPt: clampPublicationLineFontPt(
      Number(o.examTypeLine1FontPt ?? o.exam_type_line1_font_pt ?? d.examTypeLine1FontPt),
    ),
    examTypeLine2FontPt: clampPublicationLineFontPt(
      Number(o.examTypeLine2FontPt ?? o.exam_type_line2_font_pt ?? d.examTypeLine2FontPt),
    ),
    examTypeLine1Color: String(o.examTypeLine1Color ?? o.exam_type_line1_color ?? d.examTypeLine1Color),
    examTypeLine2Color: String(o.examTypeLine2Color ?? o.exam_type_line2_color ?? d.examTypeLine2Color),
    examTypeBoxBorderStyle: parseExamTypeBoxBorderStyle(
      o.examTypeBoxBorderStyle ?? o.exam_type_box_border_style ?? d.examTypeBoxBorderStyle,
    ),
    examTypeBoxBorderColor: String(
      o.examTypeBoxBorderColor ?? o.exam_type_box_border_color ?? d.examTypeBoxBorderColor,
    ),
    examTypeBoxBorderWidthPt: clampExamTypeBoxBorderWidthPt(
      Number(o.examTypeBoxBorderWidthPt ?? o.exam_type_box_border_width_pt ?? d.examTypeBoxBorderWidthPt),
    ),
    examTypeBoxManualWidthPt: clampExamTypeBoxManualWidthPt(
      Number(o.examTypeBoxManualWidthPt ?? o.exam_type_box_manual_width_pt ?? d.examTypeBoxManualWidthPt),
    ),
    examTypeBoxManualHeightPt: clampExamTypeBoxManualHeightPt(
      Number(
        o.examTypeBoxManualHeightPt ??
          o.exam_type_box_manual_height_pt ??
          d.examTypeBoxManualHeightPt,
      ),
    ),
    examTypeBoxPadXPt: clampExamTypeBoxPadXPt(
      Number(o.examTypeBoxPadXPt ?? o.exam_type_box_pad_x_pt ?? d.examTypeBoxPadXPt),
    ),
    examTypeBoxPadYPt: clampExamTypeBoxPadYPt(
      Number(o.examTypeBoxPadYPt ?? o.exam_type_box_pad_y_pt ?? d.examTypeBoxPadYPt),
    ),
    examTypeOffsetXPt: Math.max(
      -48,
      Math.min(
        48,
        Math.round(Number(o.examTypeOffsetXPt ?? o.exam_type_offset_x_pt ?? d.examTypeOffsetXPt)),
      ),
    ),
    examTypeOffsetYPt: Math.max(
      -28,
      Math.min(
        28,
        Math.round(Number(o.examTypeOffsetYPt ?? o.exam_type_offset_y_pt ?? d.examTypeOffsetYPt)),
      ),
    ),
    examTypeBoxFillEnabled: parseBool(
      o.examTypeBoxFillEnabled ?? o.exam_type_box_fill_enabled,
      d.examTypeBoxFillEnabled,
    ),
    examTypeBoxFillColor: String(
      o.examTypeBoxFillColor ?? o.exam_type_box_fill_color ?? d.examTypeBoxFillColor,
    ),
    examTypeTextAlign: parseExamTypeTextAlign(
      o.examTypeTextAlign ?? o.exam_type_text_align ?? d.examTypeTextAlign,
    ),
    examTypeDividerStyle: parseExamTypeDividerStyle(
      o.examTypeDividerStyle ?? o.exam_type_divider_style ?? d.examTypeDividerStyle,
    ),
    examTypeDividerColor: String(
      o.examTypeDividerColor ?? o.exam_type_divider_color ?? d.examTypeDividerColor,
    ),
    examTypeDividerWidthPt: clampExamTypeDividerWidthPt(
      Number(o.examTypeDividerWidthPt ?? o.exam_type_divider_width_pt ?? d.examTypeDividerWidthPt),
    ),
    subjectPillPadXPt: clampSubjectPillPadXPt(
      Number(
        o.subjectPillPadXPt ??
          o.subject_pill_pad_x_pt ??
          o.subjectPillPadPt ??
          d.subjectPillPadXPt,
      ),
    ),
    subjectPillPadYPt: clampSubjectPillPadYPt(
      Number(
        o.subjectPillPadYPt ??
          o.subject_pill_pad_y_pt ??
          o.subjectPillPadPt ??
          d.subjectPillPadYPt,
      ),
    ),
    subjectPillFillColor: String(
      o.subjectPillFillColor ?? o.subject_pill_fill_color ?? d.subjectPillFillColor,
    ),
    subjectPillTextColor: String(
      o.subjectPillTextColor ?? o.subject_pill_text_color ?? d.subjectPillTextColor,
    ),
    subjectPillTextOffsetYPt: clampSubjectPillTextOffsetYPt(
      Number(
        o.subjectPillTextOffsetYPt ??
          o.subject_pill_text_offset_y_pt ??
          d.subjectPillTextOffsetYPt,
      ),
    ),
    subjectTopicGapPt: clampSubjectTopicGapPt(
      Number(o.subjectTopicGapPt ?? o.subject_topic_gap_pt ?? d.subjectTopicGapPt),
    ),
    topicSubTopicGapPt: clampTopicSubTopicGapPt(
      Number(o.topicSubTopicGapPt ?? o.topic_sub_topic_gap_pt ?? d.topicSubTopicGapPt),
    ),
    examType: String(o.examType ?? d.examType),
    subject: String(o.subject ?? d.subject),
    topic: String(o.topic ?? d.topic),
    subTopic: String(o.subTopic ?? d.subTopic),
    brandName: String(o.brandName ?? d.brandName),
    authorName: String(o.authorName ?? d.authorName),
    primaryColor: String(o.primaryColor ?? d.primaryColor),
    accentColor: String(o.accentColor ?? d.accentColor),
    publisherLine: String(o.publisherLine ?? d.publisherLine),
    schoolName: String(o.schoolName ?? d.schoolName),
    testNumber: String(o.testNumber ?? d.testNumber),
    tagLabels: parseTagLabels(o.tagLabels, d.tagLabels),
    qrHint: String(o.qrHint ?? d.qrHint),
    fieldFontSizesPt: parseHeaderFieldFontSizesPt(o.fieldFontSizesPt ?? o.field_font_sizes_pt),
    fieldColors: parseHeaderFieldColors(o.fieldColors ?? o.field_colors),
    fieldFontStyles: parseHeaderFieldFontStyles(o.fieldFontStyles ?? o.field_font_styles),
    logoUseThemeColors: Boolean(
      o.logoUseThemeColors ?? o.logo_use_theme_colors ?? d.logoUseThemeColors,
    ),
    logoColorPrimary: String(o.logoColorPrimary ?? o.logo_color_primary ?? d.logoColorPrimary),
    logoColorSecondary: String(
      o.logoColorSecondary ?? o.logo_color_secondary ?? d.logoColorSecondary,
    ),
    fieldHidden: parseHeaderFieldHidden(o.fieldHidden ?? o.field_hidden ?? d.fieldHidden),
    bannerTemplate: parseBannerTemplateId(o.bannerTemplate ?? o.banner_template ?? d.bannerTemplate),
    useYaprakBanner: parseBool(o.useYaprakBanner ?? o.use_yaprak_banner, d.useYaprakBanner),
    useExamBanner: parseBool(o.useExamBanner ?? o.use_exam_banner, d.useExamBanner),
    examBannerTemplate: parseExamBannerTemplateId(
      o.examBannerTemplate ?? o.exam_banner_template ?? d.examBannerTemplate,
    ),
    examBannerTitle: String(o.examBannerTitle ?? o.exam_banner_title ?? d.examBannerTitle),
    academicYear: String(o.academicYear ?? o.academic_year ?? d.academicYear),
    writtenExamNumber: String(
      o.writtenExamNumber ?? o.written_exam_number ?? d.writtenExamNumber,
    ),
    showStudentInfo: parseBool(o.showStudentInfo ?? o.show_student_info, d.showStudentInfo),
    gradeLevel: String(o.gradeLevel ?? o.grade_level ?? d.gradeLevel),
    testType: String(o.testType ?? o.test_type ?? d.testType),
    testNoLabelFontPt: Math.max(
      5,
      Math.min(
        20,
        Math.round(Number(o.testNoLabelFontPt ?? o.test_no_label_font_pt ?? d.testNoLabelFontPt) * 10) /
          10,
      ),
    ),
    testNoNumFontPt: Math.max(
      5,
      Math.min(
        20,
        Math.round(Number(o.testNoNumFontPt ?? o.test_no_num_font_pt ?? d.testNoNumFontPt) * 10) / 10,
      ),
    ),
    testNoLabelColor: String(o.testNoLabelColor ?? o.test_no_label_color ?? d.testNoLabelColor),
    testNoNumColor: String(o.testNoNumColor ?? o.test_no_num_color ?? d.testNoNumColor),
    testNoFillColor: String(o.testNoFillColor ?? o.test_no_fill_color ?? d.testNoFillColor),
    testNoBorderColor: String(o.testNoBorderColor ?? o.test_no_border_color ?? d.testNoBorderColor),
    testNoWidthPt: Math.max(
      40,
      Math.min(160, Math.round(Number(o.testNoWidthPt ?? o.test_no_width_pt ?? d.testNoWidthPt))),
    ),
    testNoHeightPt: Math.max(
      12,
      Math.min(64, Math.round(Number(o.testNoHeightPt ?? o.test_no_height_pt ?? d.testNoHeightPt))),
    ),
    testNoOffsetYPt: Math.max(
      -28,
      Math.min(
        28,
        Math.round(Number(o.testNoOffsetYPt ?? o.test_no_offset_y_pt ?? d.testNoOffsetYPt)),
      ),
    ),
    testNoGapXPt: Math.max(
      0,
      Math.min(28, Math.round(Number(o.testNoGapXPt ?? o.test_no_gap_x_pt ?? d.testNoGapXPt))),
    ),
    testNoOffsetXPt: Math.max(
      -48,
      Math.min(
        48,
        Math.round(Number(o.testNoOffsetXPt ?? o.test_no_offset_x_pt ?? d.testNoOffsetXPt)),
      ),
    ),
    scoreBoxWidthPt: Number.isFinite(Number(o.scoreBoxWidthPt ?? o.score_box_width_pt))
      ? Math.max(
          72,
          Math.min(200, Math.round(Number(o.scoreBoxWidthPt ?? o.score_box_width_pt))),
        )
      : d.scoreBoxWidthPt,
    scoreBoxHeightPt: Math.max(
      14,
      Math.min(48, Math.round(Number(o.scoreBoxHeightPt ?? o.score_box_height_pt ?? d.scoreBoxHeightPt))),
    ),
    scoreBoxOffsetYPt: Math.max(
      -28,
      Math.min(
        28,
        Math.round(Number(o.scoreBoxOffsetYPt ?? o.score_box_offset_y_pt ?? d.scoreBoxOffsetYPt)),
      ),
    ),
    scoreBoxLabelFontPt: Math.max(
      7,
      Math.min(
        14,
        Math.round(Number(o.scoreBoxLabelFontPt ?? o.score_box_label_font_pt ?? d.scoreBoxLabelFontPt) * 2) / 2,
      ),
    ),
    scoreBoxLabelColor: String(
      o.scoreBoxLabelColor ?? o.score_box_label_color ?? d.scoreBoxLabelColor,
    ),
    scoreBoxBorderColor: String(
      o.scoreBoxBorderColor ?? o.score_box_border_color ?? d.scoreBoxBorderColor,
    ),
    scoreBoxFillColor: String(o.scoreBoxFillColor ?? o.score_box_fill_color ?? d.scoreBoxFillColor),
    scoreBoxBorderWidthPt: Math.max(
      0.25,
      Math.min(
        4,
        Math.round(Number(o.scoreBoxBorderWidthPt ?? o.score_box_border_width_pt ?? d.scoreBoxBorderWidthPt) * 4) / 4,
      ),
    ),
    scoreBoxLineWidthPt: Math.max(
      0.25,
      Math.min(
        4,
        Math.round(Number(o.scoreBoxLineWidthPt ?? o.score_box_line_width_pt ?? d.scoreBoxLineWidthPt) * 4) / 4,
      ),
    ),
    scoreCorrect: parseScoreField(o.scoreCorrect ?? o.score_correct ?? d.scoreCorrect),
    scoreWrong: parseScoreField(o.scoreWrong ?? o.score_wrong ?? d.scoreWrong),
    scoreBlank: parseScoreField(o.scoreBlank ?? o.score_blank ?? d.scoreBlank),
    bannerRightMode: (() => {
      const raw = o.bannerRightMode ?? o.banner_right_mode
      if (raw === 'examType' || raw === 'score' || raw === 'testNo' || raw === 'hidden') return raw
      // Eski kayıtlar: examType görünürse sınav türü, değilse kapalı
      const hidden = parseHeaderFieldHidden(o.fieldHidden ?? o.field_hidden ?? d.fieldHidden)
      return hidden.examType ? 'hidden' : 'examType'
    })(),
    bannerRightSlots: (() => {
      const raw = o.bannerRightSlots ?? o.banner_right_slots
      if (Array.isArray(raw)) {
        const out: Array<'examType' | 'score' | 'testNo'> = []
        for (const item of raw) {
          if (
            (item === 'examType' || item === 'score' || item === 'testNo') &&
            !out.includes(item)
          ) {
            out.push(item)
          }
          if (out.length >= 2) break
        }
        return out
      }
      const mode = o.bannerRightMode ?? o.banner_right_mode
      if (mode === 'examType' || mode === 'score' || mode === 'testNo') return [mode]
      if (mode === 'hidden') return []
      return d.bannerRightSlots ?? ['examType', 'score']
    })(),
    badgeByStyle: parseHeaderBadgeByStyle(o.badgeByStyle ?? o.badge_by_style),
    headerInfoByStyle: parseHeaderInfoByStyle(o.headerInfoByStyle ?? o.header_info_by_style),
  }
}

export function isCorporateHeader(styleId: string | undefined): boolean {
  if (isClassicTestBannerHeader(styleId)) return false
  return isThemeHeader(styleId) || styleId === CORPORATE_HEADER_STYLE_ID
}
