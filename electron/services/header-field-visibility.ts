/** Başlık alanı görünürlüğü — PDF tarafı */

import type { HeaderConfig } from './corporate-header-layout.js'
import type { HeaderFontFieldKey } from './header-field-fonts.js'

export type HeaderFieldHidden = Partial<Record<HeaderFontFieldKey, boolean>>

export function parseHeaderFieldHidden(raw: unknown): HeaderFieldHidden {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  const out: HeaderFieldHidden = {}
  const keys: HeaderFontFieldKey[] = [
    'subject',
    'examType',
    'topic',
    'subTopic',
    'authorName',
    'brandName',
    'schoolName',
    'testNumber',
    'publisherLine',
  ]
  for (const key of keys) {
    const v = o[key]
    if (v === true || v === 'true' || v === 1) out[key] = true
  }
  return out
}

export function isHeaderFieldVisible(
  config: Pick<HeaderConfig, 'fieldHidden'>,
  field: HeaderFontFieldKey,
): boolean {
  return config.fieldHidden?.[field] !== true
}

export function headerFieldDisplayText(config: HeaderConfig, field: HeaderFontFieldKey): string {
  if (!isHeaderFieldVisible(config, field)) return ''
  const val = config[field]
  return typeof val === 'string' ? val.trim() : ''
}

export function visibleTopicText(config: HeaderConfig): string {
  return headerFieldDisplayText(config, 'topic')
}

/** Minimal banner orta kutu — ders adı */
export function classicBannerSubjectText(config: HeaderConfig): string {
  if (!isHeaderFieldVisible(config, 'subject')) return ''
  return headerFieldDisplayText(config, 'subject') || 'Ders adı'
}

export function visibleSubTopicText(config: HeaderConfig): string {
  return headerFieldDisplayText(config, 'subTopic')
}

export function visibleTopicLineText(config: HeaderConfig): string {
  const topic = visibleTopicText(config)
  const sub = visibleSubTopicText(config)
  if (topic && sub) return `${topic} / ${sub}`
  return topic || sub
}

/** Diğer sayfalar — sol üst (konu adı) */
export function otherPageHeaderLeftText(config: HeaderConfig): string {
  return headerFieldDisplayText(config, 'topic')
}

/** Diğer sayfalar — sağ üst (kurum / yayın adı) */
export function otherPageHeaderRightText(config: HeaderConfig): string {
  return headerFieldDisplayText(config, 'brandName')
}

export function headerCenterTopicText(config: HeaderConfig): string {
  return visibleTopicText(config)
}
