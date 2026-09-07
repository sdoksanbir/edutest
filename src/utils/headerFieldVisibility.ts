/** Başlık alanı görünürlüğü — checkbox ile gizle/göster */

import type { HeaderConfig } from './corporateHeaderLayout'
import type { HeaderFontFieldKey } from './headerFieldFonts'
import { toTurkishTitleCase } from './turkishString'

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

/** Varsayılan: tüm alanlar görünür */
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
  const raw = headerFieldDisplayText(config, 'subTopic')
  return raw ? toTurkishTitleCase(raw) : ''
}

/** Tek satır birleşik metin — devam sayfası vb. */
export function visibleTopicLineText(config: HeaderConfig): string {
  const topic = visibleTopicText(config).replace(/\s+/g, ' ').trim()
  const sub = visibleSubTopicText(config).replace(/\s+/g, ' ').trim()
  if (topic && sub) return `${topic} / ${sub}`
  return topic || sub
}

/** Diğer sayfalar — sol üst (konu adı) */
export function otherPageHeaderLeftText(config: HeaderConfig): string {
  return headerFieldDisplayText(config, 'topic').replace(/\s+/g, ' ').trim()
}

/** Diğer sayfalar — sağ üst (kurum / yayın adı) */
export function otherPageHeaderRightText(config: HeaderConfig): string {
  return headerFieldDisplayText(config, 'brandName')
}

/** Deneme ÖSYM — diğer sayfa sol (sınav kodu) */
export function trialOsymOtherPageLeftText(examCode?: string | null): string {
  return (examCode || '').trim().toUpperCase() || 'SINAV KODU'
}

/** Deneme ÖSYM — diğer sayfa sağ (kurum adı) */
export function trialOsymOtherPageRightText(config: HeaderConfig): string {
  if (!isHeaderFieldVisible(config, 'brandName')) return ''
  return otherPageHeaderRightText(config).trim() || 'KURUM ADI'
}

/** Deneme LGS — diğer sayfa sol (test adı) */
export function trialLgsOtherPageLeftText(testName?: string | null): string {
  return (testName || '').trim() || 'TEST ADI'
}

/** Deneme LGS — diğer sayfa sağ (kurum adı) */
export function trialLgsOtherPageRightText(config: HeaderConfig): string {
  return trialOsymOtherPageRightText(config)
}

/** Tema 1 — orta banner konu satırı (yalnızca konu) */
export function headerCenterTopicText(config: HeaderConfig): string {
  return visibleTopicText(config).replace(/\s+/g, ' ').trim()
}
