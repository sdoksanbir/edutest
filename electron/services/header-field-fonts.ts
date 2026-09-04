import type { HeaderConfig } from './corporate-header-layout.js'
import { normalizeHeaderStyleId } from './header-styles.js'

export type HeaderFontFieldKey =
  | 'subject'
  | 'examType'
  | 'topic'
  | 'subTopic'
  | 'authorName'
  | 'brandName'
  | 'schoolName'
  | 'testNumber'
  | 'testType'
  | 'publisherLine'

export type HeaderFieldFontSizesPt = Partial<Record<HeaderFontFieldKey, number>>

export const HEADER_FIELD_FONT_STEP_PT = 0.5
export const HEADER_FIELD_FONT_DELTA_PT = 5
export const HEADER_FIELD_FONT_MIN_PT = 4

/** Tema 1 varsayılan pt — corporate-header-layout sabitleriyle aynı (döngüsel import önlenir) */
const STYLE_1_DEFAULTS: Record<HeaderFontFieldKey, number> = {
  subject: 20,
  examType: 8.5,
  topic: 8,
  subTopic: 8,
  authorName: 7,
  brandName: 9,
  schoolName: 7,
  testNumber: 8,
  testType: 7,
  publisherLine: 9,
}

const STYLE_2_DEFAULTS: Record<HeaderFontFieldKey, number> = {
  subject: 13,
  examType: 8.5,
  topic: 8,
  subTopic: 8,
  authorName: 7,
  brandName: 9,
  schoolName: 7,
  testNumber: 6.5,
  testType: 7,
  publisherLine: 7,
}

const STYLE_3_DEFAULTS: Record<HeaderFontFieldKey, number> = {
  subject: 20,
  examType: 8.5,
  topic: 11,
  subTopic: 8,
  authorName: 7,
  brandName: 5.5,
  schoolName: 7,
  testNumber: 12,
  testType: 20,
  publisherLine: 7,
}

const STYLE_4_DEFAULTS: Record<HeaderFontFieldKey, number> = {
  subject: 7,
  examType: 7,
  topic: 7,
  subTopic: 7,
  authorName: 7,
  brandName: 7,
  schoolName: 7,
  testNumber: 7,
  testType: 7,
  publisherLine: 7,
}

const RUNNING_DEFAULTS: Partial<Record<HeaderFontFieldKey, number>> = {
  subject: 9,
  topic: 9,
  brandName: 9,
  schoolName: 9,
  testNumber: 9,
  authorName: 9,
}

function defaultsForStyle(styleId: string): Record<HeaderFontFieldKey, number> {
  switch (normalizeHeaderStyleId(styleId)) {
    case 'style_2':
      return STYLE_2_DEFAULTS
    case 'style_3':
      return STYLE_3_DEFAULTS
    case 'style_4':
      return STYLE_4_DEFAULTS
    default:
      return STYLE_1_DEFAULTS
  }
}

export function defaultHeaderFieldFontPt(
  field: HeaderFontFieldKey,
  styleId: string,
  page: 'first' | 'running' = 'first',
): number {
  if (page === 'running') {
    return RUNNING_DEFAULTS[field] ?? defaultsForStyle(styleId)[field]
  }
  return defaultsForStyle(styleId)[field]
}

export function clampHeaderFieldFontPt(
  value: number,
  field: HeaderFontFieldKey,
  styleId: string,
  page: 'first' | 'running' = 'first',
): number {
  const base = defaultHeaderFieldFontPt(field, styleId, page)
  const stepped = Math.round(value / HEADER_FIELD_FONT_STEP_PT) * HEADER_FIELD_FONT_STEP_PT
  return Math.max(
    HEADER_FIELD_FONT_MIN_PT,
    Math.min(base + HEADER_FIELD_FONT_DELTA_PT, Math.max(HEADER_FIELD_FONT_MIN_PT, base - HEADER_FIELD_FONT_DELTA_PT, stepped)),
  )
}

export function getHeaderFieldFontPt(
  field: HeaderFontFieldKey,
  styleId: string,
  config: HeaderConfig,
  page: 'first' | 'running' = 'first',
): number {
  const override = config.fieldFontSizesPt?.[field]
  if (override != null && Number.isFinite(override)) {
    return clampHeaderFieldFontPt(override, field, styleId, page)
  }
  return defaultHeaderFieldFontPt(field, styleId, page)
}

export function headerFieldColor(
  config: HeaderConfig,
  field: HeaderFontFieldKey,
  fallback: string,
): string {
  const c = (config.fieldColors?.[field] ?? '').trim()
  return /^#[0-9A-Fa-f]{6}$/i.test(c) ? c : fallback
}

export function parseHeaderFieldFontSizesPt(raw: unknown): HeaderFieldFontSizesPt {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  const keys: HeaderFontFieldKey[] = [
    'subject', 'examType', 'topic', 'subTopic', 'authorName',
    'brandName', 'schoolName', 'testNumber', 'testType', 'publisherLine',
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

/** Diğer sayfa üst yazıları — konu ve kurum adı aynı punto (büyük olan geçerli) */
export function runningHeaderSideFontPt(
  styleId: string,
  config: HeaderConfig,
): number {
  const topic = getHeaderFieldFontPt('topic', styleId, config, 'running')
  const brand = getHeaderFieldFontPt('brandName', styleId, config, 'running')
  return Math.max(topic, brand)
}

export function fieldFontPt(
  field: HeaderFontFieldKey,
  styleId: string,
  config: HeaderConfig,
  page: 'first' | 'running' = 'first',
): number {
  return getHeaderFieldFontPt(field, styleId, config, page)
}
