import { isClassicTestBannerHeader, isThemeHeader, themeRunningHeaderTotalPt } from './header-styles.js'
import { parseHeaderLeftMode, clampPublicationLineFontPt, type HeaderLeftMode } from './header-left-column.js'
import { parseHeaderFieldHidden, type HeaderFieldHidden } from './header-field-visibility.js'
import {
  parseExamTypeBoxBorderStyle,
  clampExamTypeBoxBorderWidthPt,
  clampExamTypeBoxManualWidthPt,
  clampExamTypeBoxManualHeightPt,
  clampExamTypeBoxPadXPt,
  clampExamTypeBoxPadYPt,
  parseExamTypeTextAlign,
  parseExamTypeDividerStyle,
  clampExamTypeDividerWidthPt,
} from './exam-type-box.js'
import {
  clampSubjectPillPadXPt,
  clampSubjectPillPadYPt,
  clampSubjectPillTextOffsetYPt,
  clampSubjectTopicGapPt,
  clampTopicSubTopicGapPt,
} from './modern-corporate-header-shared.js'
import {
  parseHeaderBadgeByStyle,
  type HeaderBadgeByStyle,
} from './header-badge-by-style.js'

function splitExamTypeToLines(examType: string): { line1: string; line2: string } {
  const t = examType.trim()
  if (!t) return { line1: 'SINIF', line2: '' }
  const idx = t.lastIndexOf(' ')
  if (idx > 0) return { line1: t.slice(0, idx).trim(), line2: t.slice(idx + 1).trim() }
  return { line1: t, line2: '' }
}

const PUBLICATION_LINE1_FONT_DEFAULT_PT = 9
const PUBLICATION_LINE2_FONT_DEFAULT_PT = 7
const PUBLICATION_LINE1_COLOR_DEFAULT = '#0A1931'
const PUBLICATION_LINE2_COLOR_DEFAULT = '#C59B27'

export type { HeaderLeftMode }

export type HeaderFieldFontSizesPt = Partial<Record<string, number>>

function parseHeaderFieldFontSizesPt(raw: unknown): HeaderFieldFontSizesPt {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  const keys = [
    'subject', 'examType', 'topic', 'subTopic', 'authorName',
    'brandName', 'schoolName', 'testNumber', 'publisherLine',
  ]
  const out: HeaderFieldFontSizesPt = {}
  for (const key of keys) {
    const v = o[key]
    if (v == null) continue
    const n = Number(v)
    if (Number.isFinite(n)) out[key] = n
  }
  return out
}

export type HeaderFieldColors = Partial<Record<string, string>>

function parseHeaderFieldColors(raw: unknown): HeaderFieldColors {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  const keys = [
    'subject', 'examType', 'topic', 'subTopic', 'authorName',
    'brandName', 'schoolName', 'testNumber', 'testType', 'publisherLine',
  ]
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

export type HeaderFieldFontStyles = Partial<Record<string, HeaderFieldFontStyle>>

function parseHeaderFieldFontStyles(raw: unknown): HeaderFieldFontStyles {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  const keys = [
    'subject', 'examType', 'topic', 'subTopic', 'authorName',
    'brandName', 'schoolName', 'testNumber', 'testType', 'publisherLine',
  ]
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

export type HeaderConfig = {
  logoUrl: string
  presetLogoId: string
  logoSizePct: number
  logoPadYPt: number
  logoPadLeftPt: number
  showHeaderLeft: boolean
  showClassicInfoBar: boolean
  showClassicInfoBarScore: boolean
  headerLeftMode: HeaderLeftMode
  institutionLine1: string
  institutionLine2: string
  institutionLine1FontPt: number
  institutionLine2FontPt: number
  institutionLine1Color: string
  institutionLine2Color: string
  /** Sol kutu (Minimal) — kurum rozeti dolgu; boşsa Test No dolgusu / primaryColor */
  headerLeftFillColor: string
  institutionBadgeWidthPt: number
  institutionBadgeHeightPt: number
  institutionBadgePadXPt: number
  institutionBadgeRadiusPt: number
  examTypeLine1: string
  examTypeLine2: string
  examTypeLine1FontPt: number
  examTypeLine2FontPt: number
  examTypeLine1Color: string
  examTypeLine2Color: string
  examTypeBoxBorderStyle: 'none' | 'solid' | 'dashed' | 'dotted'
  examTypeBoxBorderColor: string
  examTypeBoxBorderWidthPt: number
  examTypeBoxManualWidthPt: number
  examTypeBoxManualHeightPt: number
  examTypeBoxPadXPt: number
  examTypeBoxPadYPt: number
  examTypeOffsetXPt: number
  examTypeOffsetYPt: number
  examTypeBoxFillEnabled: boolean
  examTypeBoxFillColor: string
  examTypeTextAlign: 'left' | 'center' | 'right'
  examTypeDividerStyle: 'none' | 'solid' | 'dashed' | 'dotted'
  examTypeDividerColor: string
  examTypeDividerWidthPt: number
  subjectPillPadXPt: number
  subjectPillPadYPt: number
  /** Boşsa accentColor */
  subjectPillFillColor: string
  subjectPillTextColor: string
  subjectPillTextOffsetYPt: number
  subjectTopicGapPt: number
  topicSubTopicGapPt: number
  examType: string
  subject: string
  topic: string
  subTopic: string
  brandName: string
  authorName: string
  primaryColor: string
  accentColor: string
  publisherLine: string
  schoolName: string
  testNumber: string
  tagLabels: string[]
  qrHint: string
  fieldFontSizesPt: Partial<Record<string, number>>
  fieldColors: HeaderFieldColors
  fieldFontStyles: HeaderFieldFontStyles
  logoUseThemeColors: boolean
  logoColorPrimary: string
  logoColorSecondary: string
  fieldHidden: HeaderFieldHidden
  bannerTemplate: 'modern' | 'minimal' | 'corporate' | 'strip'
  useYaprakBanner: boolean
  useExamBanner: boolean
  examBannerTemplate:
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
    | 'lgs-official-ref'
  examBannerTitle: string
  academicYear: string
  /** LGS yıl kapsülü — dolgu; boşsa accentColor */
  lgsYearFillColor: string
  lgsYearTextColor: string
  lgsYearFontPt: number
  lgsYearPadXPt: number
  lgsYearPadYPt: number
  lgsTitleFontPt: number
  lgsTitleTextColor: string
  lgsTitleBold: boolean
  lgsSubjectFontPt: number
  lgsSubjectTextColor: string
  lgsSubjectBold: boolean
  lgsSubjectBandWidthPt: number
  lgsInstructionFontPt: number
  lgsBookletType: string
  lgsShowLogo: boolean
  lgsLogoUrl: string
  lgsPresetLogoId: string
  lgsLogoSizePct: number
  lgsLogoUseThemeColors: boolean
  lgsLogoColorPrimary: string
  lgsLogoColorSecondary: string
  writtenExamNumber: string
  showStudentInfo: boolean
  gradeLevel: string
  testType: string
  testNoLabelFontPt: number
  testNoNumFontPt: number
  testNoLabelColor: string
  testNoNumColor: string
  testNoFillColor: string
  testNoBorderColor: string
  testNoWidthPt: number
  testNoHeightPt: number
  testNoOffsetYPt: number
  testNoGapXPt: number
  testNoOffsetXPt: number
  scoreBoxWidthPt: number
  scoreBoxHeightPt: number
  scoreBoxOffsetYPt: number
  scoreBoxLabelFontPt: number
  scoreBoxLabelColor: string
  scoreBoxBorderColor: string
  scoreBoxFillColor: string
  scoreBoxBorderWidthPt: number
  scoreBoxLineWidthPt: number
  scoreCorrect: number | null
  scoreWrong: number | null
  scoreBlank: number | null
  bannerRightMode: 'examType' | 'score' | 'testNo' | 'hidden'
  bannerRightSlots: Array<'examType' | 'score' | 'testNo'>
  badgeByStyle: HeaderBadgeByStyle
  headerInfoByStyle: Record<string, Record<string, unknown>>
}

export const CORPORATE_HEADER_STYLE_ID = 'corporate'

export const CORPORATE_BODY_H_PT = 56
export const CORPORATE_STRIPE_ROW_H_PT = 4
export const CORPORATE_STRIPE_SECTION_GAP_PT = 1.1
export const CORPORATE_STRIPE_END_DOT_W_PT = 3.2
export const CORPORATE_STRIPE_END_DOT_GAP_PT = 0.75
export const CORPORATE_STRIPE_H_PT = 2.5
export const CORPORATE_LEFT_COL_W_PT = 78
export const CORPORATE_LOGO_W_PT = 28
export const CORPORATE_BRAND_BOX_W_PT = 96
export const CORPORATE_BRAND_BOX_H_PT = 22
export const CORPORATE_BRAND_BOX_R_PT = 4
export const CORPORATE_BOX_BORDER_PT = 1.5

export const CORPORATE_GOLD = '#C59B27'
export const CORPORATE_GOLD_LIGHT = '#D4AF37'
export const CORPORATE_GOLD_DARK = '#9A7518'

export const CORPORATE_FONT_EXAM_PT = 8.5
export const CORPORATE_FONT_SUBJECT_PT = 20
export const CORPORATE_FONT_TOPIC_PT = 8
export const CORPORATE_FONT_AUTHOR_PT = 7
export const CORPORATE_FONT_BRAND_PT = 9
export const CORPORATE_FONT_PUBLISHER_MAIN_PT = 9
export const CORPORATE_FONT_PUBLISHER_SUB_PT = 6

export const CORPORATE_OTHER_BODY_H_PT = 15
export const CORPORATE_OTHER_TEXT_STRIPE_GAP_PT = 3
export const CORPORATE_OTHER_GAP_BELOW_PT = 4
export const CORPORATE_OTHER_FONT_SUBJECT_PT = 11
export const CORPORATE_OTHER_FONT_TOPIC_PT = 10
export const CORPORATE_OTHER_TOPIC_DIVIDER_GAP_PT = 5

export const CORPORATE_GRAY = '#6B7280'

export function defaultHeaderConfig(): HeaderConfig {
  return {
    logoUrl: '',
    presetLogoId: '5',
    logoSizePct: 100,
    logoPadYPt: 2,
    logoPadLeftPt: 4,
    showHeaderLeft: false,
    showClassicInfoBar: true,
    showClassicInfoBarScore: true,
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
    examTypeLine1: 'SINIF',
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
    examType: 'SINIF',
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
    academicYear: '2026 - 2027 EĞİTİM - ÖĞRETİM YILI',
    lgsYearFillColor: '',
    lgsYearTextColor: '#2C2C2C',
    lgsYearFontPt: 17,
    lgsYearPadXPt: 18,
    lgsYearPadYPt: 8,
    lgsTitleFontPt: 19,
    lgsTitleTextColor: '#2C2C2C',
    lgsTitleBold: true,
    lgsSubjectFontPt: 24,
    lgsSubjectTextColor: '#FFFFFF',
    lgsSubjectBold: true,
    lgsSubjectBandWidthPt: 480,
    lgsInstructionFontPt: 15,
    lgsBookletType: '',
    lgsShowLogo: true,
    lgsLogoUrl: '',
    lgsPresetLogoId: '5',
    lgsLogoSizePct: 100,
    lgsLogoUseThemeColors: true,
    lgsLogoColorPrimary: '',
    lgsLogoColorSecondary: '',
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
    scoreBoxWidthPt: 130,
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

import { style1BannerBlockHeightPt } from './style1-header-metrics.js'
import { mergeHeaderBadgeConfig } from './header-badge-by-style.js'

export function corporateBannerBlockHeightPt(config?: HeaderConfig, styleId = 'style_1'): number {
  if (config) {
    return style1BannerBlockHeightPt(mergeHeaderBadgeConfig(config, styleId), styleId)
  }
  return CORPORATE_BODY_H_PT + CORPORATE_STRIPE_H_PT * 2
}

export function corporateOtherPageHeaderTotalPt(styleId?: string): number {
  return themeRunningHeaderTotalPt(styleId)
}

/** @deprecated use corporateBannerBlockHeightPt */
export function corporateHeaderBlockHeightPt(): number {
  return corporateBannerBlockHeightPt()
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

function parseBannerTemplateId(raw: unknown): HeaderConfig['bannerTemplate'] {
  const id = String(raw ?? 'modern')
  if (id === 'minimal' || id === 'corporate' || id === 'strip') return id
  if (id === 'boxed') return 'corporate'
  return 'modern'
}

function parseExamBannerTemplateId(raw: unknown): HeaderConfig['examBannerTemplate'] {
  const id = String(raw ?? 'leaf-corporate')
  const valid: HeaderConfig['examBannerTemplate'][] = [
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
    'lgs-official-ref',
  ]
  return valid.includes(id as HeaderConfig['examBannerTemplate'])
    ? (id as HeaderConfig['examBannerTemplate'])
    : 'leaf-corporate'
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
  return {
    logoUrl: (() => {
      const v = String(o.logoUrl ?? d.logoUrl).trim()
      return v || d.logoUrl
    })(),
    presetLogoId: String(o.presetLogoId ?? o.preset_logo_id ?? d.presetLogoId),
    logoSizePct: Math.max(40, Math.min(160, Number(o.logoSizePct ?? o.logo_size_pct ?? d.logoSizePct))),
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
      d.showClassicInfoBar ?? true,
    ),
    showClassicInfoBarScore: parseBool(
      o.showClassicInfoBarScore ?? o.show_classic_info_bar_score,
      d.showClassicInfoBarScore ?? true,
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
    lgsYearFillColor: String(o.lgsYearFillColor ?? o.lgs_year_fill_color ?? d.lgsYearFillColor),
    lgsYearTextColor: String(o.lgsYearTextColor ?? o.lgs_year_text_color ?? d.lgsYearTextColor),
    lgsYearFontPt: Math.max(
      8,
      Math.min(
        22,
        Math.round(Number(o.lgsYearFontPt ?? o.lgs_year_font_pt ?? d.lgsYearFontPt) * 2) / 2,
      ),
    ),
    lgsYearPadXPt: Math.max(
      4,
      Math.min(
        48,
        Math.round(Number(o.lgsYearPadXPt ?? o.lgs_year_pad_x_pt ?? d.lgsYearPadXPt) * 2) / 2,
      ),
    ),
    lgsYearPadYPt: Math.max(
      2,
      Math.min(
        24,
        Math.round(Number(o.lgsYearPadYPt ?? o.lgs_year_pad_y_pt ?? d.lgsYearPadYPt) * 2) / 2,
      ),
    ),
    lgsTitleFontPt: Math.max(
      8,
      Math.min(
        28,
        Math.round(Number(o.lgsTitleFontPt ?? o.lgs_title_font_pt ?? d.lgsTitleFontPt) * 2) / 2,
      ),
    ),
    lgsTitleTextColor: String(o.lgsTitleTextColor ?? o.lgs_title_text_color ?? d.lgsTitleTextColor),
    lgsTitleBold: parseBool(o.lgsTitleBold ?? o.lgs_title_bold, d.lgsTitleBold),
    lgsSubjectFontPt: Math.max(
      8,
      Math.min(
        28,
        Math.round(Number(o.lgsSubjectFontPt ?? o.lgs_subject_font_pt ?? d.lgsSubjectFontPt) * 2) / 2,
      ),
    ),
    lgsSubjectTextColor: String(
      o.lgsSubjectTextColor ?? o.lgs_subject_text_color ?? d.lgsSubjectTextColor,
    ),
    lgsSubjectBold: parseBool(o.lgsSubjectBold ?? o.lgs_subject_bold, d.lgsSubjectBold),
    lgsSubjectBandWidthPt: Math.max(
      160,
      Math.min(
        893,
        Math.round(
          Number(o.lgsSubjectBandWidthPt ?? o.lgs_subject_band_width_pt ?? d.lgsSubjectBandWidthPt) *
            2,
        ) / 2,
      ),
    ),
    lgsInstructionFontPt: Math.max(
      8,
      Math.min(
        22,
        Math.round(
          Number(o.lgsInstructionFontPt ?? o.lgs_instruction_font_pt ?? d.lgsInstructionFontPt) * 2,
        ) / 2,
      ),
    ),
    lgsBookletType: (() => {
      const raw = String(o.lgsBookletType ?? o.lgs_booklet_type ?? d.lgsBookletType)
        .trim()
        .toUpperCase()
      return /^[A-D]$/.test(raw) ? raw : ''
    })(),
    lgsShowLogo: parseBool(o.lgsShowLogo ?? o.lgs_show_logo, d.lgsShowLogo),
    lgsLogoUrl: String(o.lgsLogoUrl ?? o.lgs_logo_url ?? d.lgsLogoUrl),
    lgsPresetLogoId: String(o.lgsPresetLogoId ?? o.lgs_preset_logo_id ?? d.lgsPresetLogoId),
    lgsLogoSizePct: Math.max(
      40,
      Math.min(
        200,
        Math.round(Number(o.lgsLogoSizePct ?? o.lgs_logo_size_pct ?? d.lgsLogoSizePct)),
      ),
    ),
    lgsLogoUseThemeColors: parseBool(
      o.lgsLogoUseThemeColors ?? o.lgs_logo_use_theme_colors,
      d.lgsLogoUseThemeColors,
    ),
    lgsLogoColorPrimary: String(
      o.lgsLogoColorPrimary ?? o.lgs_logo_color_primary ?? d.lgsLogoColorPrimary,
    ),
    lgsLogoColorSecondary: String(
      o.lgsLogoColorSecondary ?? o.lgs_logo_color_secondary ?? d.lgsLogoColorSecondary,
    ),
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
    scoreBoxWidthPt: Math.max(
      72,
      Math.min(200, Math.round(Number(o.scoreBoxWidthPt ?? o.score_box_width_pt ?? d.scoreBoxWidthPt))),
    ),
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
    headerInfoByStyle: (() => {
      const raw = o.headerInfoByStyle ?? o.header_info_by_style
      if (!raw || typeof raw !== 'object') return {}
      return raw as Record<string, Record<string, unknown>>
    })(),
  }
}

export function isCorporateHeader(styleId: string | undefined): boolean {
  if (isClassicTestBannerHeader(styleId)) return false
  return isThemeHeader(styleId) || styleId === CORPORATE_HEADER_STYLE_ID
}

/** LGS resmi deneme şablonu */
export function isLgsOfficialBannerConfig(
  config: { useExamBanner?: boolean; examBannerTemplate?: string } | null | undefined,
): boolean {
  return config?.useExamBanner === true && config?.examBannerTemplate === 'lgs-official-ref'
}
