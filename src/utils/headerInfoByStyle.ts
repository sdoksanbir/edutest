/**
 * Başlık Bilgileri (+ ilgili stil alanları) — tema bazında bağımsız.
 * Kurumsal (style_1) değişiklikleri Minimal’i (style_2) etkilemez; tersi de geçerli.
 */

import type { HeaderConfig } from './corporateHeaderLayout'
import {
  CLASSIC_SUBJECT_PILL_PAD_X_DEFAULT_PT,
  CLASSIC_SUBJECT_PILL_PAD_Y_DEFAULT_PT,
  CLASSIC_SUBJECT_PILL_TEXT_OFFSET_Y_DEFAULT_PT,
} from './classicBannerTopRow'
import {
  PUBLICATION_LINE1_COLOR_DEFAULT,
  PUBLICATION_LINE2_COLOR_DEFAULT,
} from './headerLeftColumn'
import { SUBJECT_PILL_TEXT_OFFSET_Y_DEFAULT_PT } from './modernCorporateHeaderShared'
import { normalizeHeaderStyleId, type HeaderStyleId } from './headerStyleIds'

/** Başlık bilgileri / sol kutu / pill stilleri — rozet (badgeByStyle) hariç */
export type HeaderInfoSettings = Partial<
  Pick<
    HeaderConfig,
    | 'brandName'
    | 'subject'
    | 'topic'
    | 'subTopic'
    | 'authorName'
    | 'examType'
    | 'schoolName'
    | 'fieldHidden'
    | 'fieldFontSizesPt'
    | 'fieldColors'
    | 'fieldFontStyles'
    | 'subjectPillFillColor'
    | 'subjectPillTextColor'
    | 'subjectPillTextOffsetYPt'
    | 'subjectPillPadXPt'
    | 'subjectPillPadYPt'
    | 'subjectTopicGapPt'
    | 'topicSubTopicGapPt'
    | 'showClassicInfoBar'
    | 'institutionLine1'
    | 'institutionLine2'
    | 'institutionLine1FontPt'
    | 'institutionLine2FontPt'
    | 'institutionLine1Color'
    | 'institutionLine2Color'
    | 'institutionBadgeWidthPt'
    | 'institutionBadgeHeightPt'
    | 'institutionBadgePadXPt'
    | 'institutionBadgeRadiusPt'
    | 'headerLeftMode'
    | 'headerLeftFillColor'
    | 'showHeaderLeft'
    | 'logoUrl'
    | 'presetLogoId'
    | 'logoSizePct'
    | 'logoPadYPt'
    | 'logoPadLeftPt'
    | 'logoUseThemeColors'
    | 'logoColorPrimary'
    | 'logoColorSecondary'
    | 'primaryColor'
    | 'accentColor'
  >
>

export type HeaderInfoByStyle = Partial<Record<HeaderStyleId, HeaderInfoSettings>>

export const HEADER_INFO_KEYS: (keyof HeaderInfoSettings)[] = [
  'brandName',
  'subject',
  'topic',
  'subTopic',
  'authorName',
  'examType',
  'schoolName',
  'fieldHidden',
  'fieldFontSizesPt',
  'fieldColors',
  'fieldFontStyles',
  'subjectPillFillColor',
  'subjectPillTextColor',
  'subjectPillTextOffsetYPt',
  'subjectPillPadXPt',
  'subjectPillPadYPt',
  'subjectTopicGapPt',
  'topicSubTopicGapPt',
  'showClassicInfoBar',
  'institutionLine1',
  'institutionLine2',
  'institutionLine1FontPt',
  'institutionLine2FontPt',
  'institutionLine1Color',
  'institutionLine2Color',
  'institutionBadgeWidthPt',
  'institutionBadgeHeightPt',
  'institutionBadgePadXPt',
  'institutionBadgeRadiusPt',
  'headerLeftMode',
  'headerLeftFillColor',
  'showHeaderLeft',
  'logoUrl',
  'presetLogoId',
  'logoSizePct',
  'logoPadYPt',
  'logoPadLeftPt',
  'logoUseThemeColors',
  'logoColorPrimary',
  'logoColorSecondary',
  'primaryColor',
  'accentColor',
]

export function pickHeaderInfoSettings(config: HeaderConfig): HeaderInfoSettings {
  const out: HeaderInfoSettings = {}
  for (const key of HEADER_INFO_KEYS) {
    const v = config[key]
    if (v !== undefined) (out as Record<string, unknown>)[key] = v
  }
  return out
}

export function parseHeaderInfoByStyle(raw: unknown): HeaderInfoByStyle {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  const out: HeaderInfoByStyle = {}
  for (const id of ['style_1', 'style_2', 'style_3', 'style_4'] as HeaderStyleId[]) {
    const bag = o[id]
    if (!bag || typeof bag !== 'object') continue
    const src = bag as Record<string, unknown>
    const slice: HeaderInfoSettings = {}
    for (const key of HEADER_INFO_KEYS) {
      if (src[key] !== undefined) (slice as Record<string, unknown>)[key] = src[key]
    }
    if (Object.keys(slice).length > 0) out[id] = slice
  }
  return out
}

export function style1InfoDefaults(): HeaderInfoSettings {
  return {
    subjectPillTextOffsetYPt: SUBJECT_PILL_TEXT_OFFSET_Y_DEFAULT_PT,
    institutionLine1Color: PUBLICATION_LINE1_COLOR_DEFAULT,
    institutionLine2Color: PUBLICATION_LINE2_COLOR_DEFAULT,
    headerLeftMode: 'logo',
    showClassicInfoBar: true,
    primaryColor: PUBLICATION_LINE1_COLOR_DEFAULT,
    accentColor: '#F34A2F',
  }
}

export function style2InfoDefaults(): HeaderInfoSettings {
  return {
    subjectPillPadXPt: CLASSIC_SUBJECT_PILL_PAD_X_DEFAULT_PT,
    subjectPillPadYPt: CLASSIC_SUBJECT_PILL_PAD_Y_DEFAULT_PT,
    subjectPillTextOffsetYPt: CLASSIC_SUBJECT_PILL_TEXT_OFFSET_Y_DEFAULT_PT,
    subjectPillFillColor: PUBLICATION_LINE1_COLOR_DEFAULT,
    headerLeftMode: 'publicationText',
    showClassicInfoBar: true,
    institutionLine1Color: '#FFFFFF',
    institutionLine1FontPt: 11.5,
    institutionBadgeWidthPt: 160,
    institutionBadgeHeightPt: 18,
    institutionBadgePadXPt: 6,
    institutionBadgeRadiusPt: 2.5,
    primaryColor: PUBLICATION_LINE1_COLOR_DEFAULT,
    accentColor: '#F34A2F',
  }
}

function defaultsForStyle(styleId: HeaderStyleId): HeaderInfoSettings {
  if (styleId === 'style_2') return style2InfoDefaults()
  if (styleId === 'style_1') return style1InfoDefaults()
  return {}
}

export function patchHeaderInfo(
  config: HeaderConfig,
  styleId: string | undefined,
  patch: HeaderInfoSettings,
): Pick<HeaderConfig, 'headerInfoByStyle'> {
  const id = normalizeHeaderStyleId(styleId)
  const prev = config.headerInfoByStyle?.[id] ?? {}
  const nextSlice: HeaderInfoSettings = { ...prev }
  for (const key of HEADER_INFO_KEYS) {
    if (key in patch) (nextSlice as Record<string, unknown>)[key] = patch[key]
  }
  // nested maps
  if (patch.fieldHidden) {
    nextSlice.fieldHidden = { ...(prev.fieldHidden ?? {}), ...patch.fieldHidden }
  }
  if (patch.fieldFontSizesPt) {
    nextSlice.fieldFontSizesPt = {
      ...(prev.fieldFontSizesPt ?? {}),
      ...patch.fieldFontSizesPt,
    }
  }
  if (patch.fieldColors) {
    nextSlice.fieldColors = { ...(prev.fieldColors ?? {}), ...patch.fieldColors }
  }
  if (patch.fieldFontStyles) {
    nextSlice.fieldFontStyles = {
      ...(prev.fieldFontStyles ?? {}),
      ...patch.fieldFontStyles,
    }
  }
  return {
    headerInfoByStyle: {
      ...config.headerInfoByStyle,
      [id]: nextSlice,
    },
  }
}

/**
 * Tema değiştir: mevcut Başlık Bilgileri dilimini kaydet, hedef dilimi (veya varsayılanı) uygula.
 * badgeByStyle dokunulmaz. extras: useYaprakBanner vb. ortak bayraklar.
 */
export function switchHeaderInfoTheme(
  config: HeaderConfig,
  fromStyleId: string | undefined,
  toStyleId: string | undefined,
  extras?: Partial<HeaderConfig>,
): HeaderConfig {
  const from = normalizeHeaderStyleId(fromStyleId)
  const to = normalizeHeaderStyleId(toStyleId)

  if (from === to) {
    return extras ? { ...config, ...extras } : config
  }

  const savedFrom = pickHeaderInfoSettings(config)
  const bags: HeaderInfoByStyle = {
    ...config.headerInfoByStyle,
    [from]: savedFrom,
  }

  const existing = bags[to]
  const hasExisting = existing && Object.keys(existing).length > 0
  const targetBag: HeaderInfoSettings = hasExisting
    ? { ...existing }
    : { ...savedFrom, ...defaultsForStyle(to) }

  bags[to] = targetBag

  const next: HeaderConfig = {
    ...config,
    ...extras,
    headerInfoByStyle: bags,
  }

  for (const key of HEADER_INFO_KEYS) {
    if (key === 'fieldHidden' || key === 'fieldFontSizesPt' || key === 'fieldColors' || key === 'fieldFontStyles') {
      continue
    }
    if (key in targetBag) {
      ;(next as Record<string, unknown>)[key] = targetBag[key]
    }
  }

  next.fieldHidden = { ...(targetBag.fieldHidden ?? {}) }
  next.fieldFontSizesPt = { ...(targetBag.fieldFontSizesPt ?? {}) }
  next.fieldColors = { ...(targetBag.fieldColors ?? {}) }
  next.fieldFontStyles = { ...(targetBag.fieldFontStyles ?? {}) }

  return next
}

/** Canlı kök + aktif tema dilimini senkron tut (düzenleme sırasında). */
export function applyHeaderInfoPatch(
  config: HeaderConfig,
  styleId: string | undefined,
  patch: HeaderInfoSettings,
): Partial<HeaderConfig> {
  const id = normalizeHeaderStyleId(styleId)
  const bagPatch = patchHeaderInfo(config, id, patch)
  return {
    ...patch,
    ...bagPatch,
  }
}
