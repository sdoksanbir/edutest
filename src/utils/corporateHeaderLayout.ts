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
import { parseHeaderBadgeByStyle } from './headerBadgeByStyle'

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
  /** Sol sütunda logo veya kurum adı göster */
  showHeaderLeft: boolean
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
  /** Tema 1 D/Y/B kutusu genişlik (pt) */
  scoreBoxWidthPt: number
  /** Tema 1 D/Y/B kutusu yükseklik (pt) */
  scoreBoxHeightPt: number
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
  /** Tema 1 sağ alan: sınav türü | D/Y/B | test no | kapalı */
  bannerRightMode: 'examType' | 'score' | 'testNo' | 'hidden'
  /** Rozet ayarları — tema bazında bağımsız */
  badgeByStyle: HeaderBadgeByStyle
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
export const CORPORATE_BRAND_BOX_H_PT = 36
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
    showHeaderLeft: true,
    headerLeftMode: 'logo',
    institutionLine1: '',
    institutionLine2: '',
    institutionLine1FontPt: PUBLICATION_LINE1_FONT_DEFAULT_PT,
    institutionLine2FontPt: PUBLICATION_LINE2_FONT_DEFAULT_PT,
    institutionLine1Color: PUBLICATION_LINE1_COLOR_DEFAULT,
    institutionLine2Color: PUBLICATION_LINE2_COLOR_DEFAULT,
    examTypeLine1: 'TYT-AYT',
    examTypeLine2: 'TEST',
    examTypeLine1FontPt: 9,
    examTypeLine2FontPt: 10,
    examTypeLine1Color: '',
    examTypeLine2Color: '',
    examTypeBoxBorderStyle: 'solid',
    examTypeBoxBorderColor: '#0A1931',
    examTypeBoxBorderWidthPt: CORPORATE_BOX_BORDER_PT,
    examTypeBoxManualWidthPt: 96,
    examTypeBoxManualHeightPt: CORPORATE_BRAND_BOX_H_PT,
    examTypeBoxPadXPt: 4,
    examTypeBoxPadYPt: 4,
    examTypeBoxFillEnabled: false,
    examTypeBoxFillColor: '#F3F4F6',
    examTypeTextAlign: 'center',
    examTypeDividerStyle: 'none',
    examTypeDividerColor: PUBLICATION_LINE2_COLOR_DEFAULT,
    examTypeDividerWidthPt: 0.75,
    subjectPillPadXPt: 8,
    subjectPillPadYPt: 4,
    subjectPillFillColor: '',
    subjectPillTextColor: '#FFFFFF',
    subjectPillTextOffsetYPt: -2,
    subjectTopicGapPt: 3,
    topicSubTopicGapPt: 1,
    examType: 'TYT-AYT TEST',
    subject: 'MATEMATİK',
    topic: 'POLİNOMLAR',
    subTopic: 'BÖLME İŞLEMİ',
    brandName: 'EDUMATH',
    authorName: 'SERKAN DOKSANBİR',
    primaryColor: '#0A1931',
    accentColor: '#DC2626',
    publisherLine: '',
    schoolName: 'ANADOLU LİSESİ',
    testNumber: '01',
    tagLabels: ['Konu Kavrama', 'Yeni Nesil', 'Analiz', 'Zorluk Seviyesi'],
    qrHint: 'ÇÖZÜMLER İÇİN OKUTUNUZ',
    fieldFontSizesPt: {},
    fieldColors: {},
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
    testNoLabelFontPt: 8,
    testNoNumFontPt: 10,
    testNoLabelColor: '#FFFFFF',
    testNoNumColor: '',
    testNoFillColor: '',
    testNoBorderColor: '',
    testNoWidthPt: 72,
    testNoHeightPt: 22,
    scoreBoxWidthPt: 113,
    scoreBoxHeightPt: 37,
    scoreBoxLabelFontPt: 7,
    scoreBoxLabelColor: '',
    scoreBoxBorderColor: '',
    scoreBoxFillColor: '#FFFFFF',
    scoreBoxBorderWidthPt: 1.25,
    scoreBoxLineWidthPt: 0.75,
    scoreCorrect: null,
    scoreWrong: null,
    scoreBlank: null,
    bannerRightMode: 'score',
    badgeByStyle: {},
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
    showHeaderLeft: Boolean(o.showHeaderLeft ?? o.show_header_left ?? d.showHeaderLeft),
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
    testNoLabelFontPt: clampPublicationLineFontPt(
      Number(o.testNoLabelFontPt ?? o.test_no_label_font_pt ?? d.testNoLabelFontPt),
    ),
    testNoNumFontPt: clampPublicationLineFontPt(
      Number(o.testNoNumFontPt ?? o.test_no_num_font_pt ?? d.testNoNumFontPt),
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
      16,
      Math.min(64, Math.round(Number(o.testNoHeightPt ?? o.test_no_height_pt ?? d.testNoHeightPt))),
    ),
    scoreBoxWidthPt: Number.isFinite(Number(o.scoreBoxWidthPt ?? o.score_box_width_pt))
      ? Math.max(
          60,
          Math.min(180, Math.round(Number(o.scoreBoxWidthPt ?? o.score_box_width_pt))),
        )
      : d.scoreBoxWidthPt,
    scoreBoxHeightPt: Math.max(
      20,
      Math.min(56, Math.round(Number(o.scoreBoxHeightPt ?? o.score_box_height_pt ?? d.scoreBoxHeightPt))),
    ),
    scoreBoxLabelFontPt: Math.max(
      4,
      Math.min(
        12,
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
    badgeByStyle: parseHeaderBadgeByStyle(o.badgeByStyle ?? o.badge_by_style),
  }
}

export function isCorporateHeader(styleId: string | undefined): boolean {
  if (isClassicTestBannerHeader(styleId)) return false
  return isThemeHeader(styleId) || styleId === CORPORATE_HEADER_STYLE_ID
}
