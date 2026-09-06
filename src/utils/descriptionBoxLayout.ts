/**
 * Açıklama kutusu layout — CanvasPdfPreview + Electron export + layout motoru ortak.
 * desktop_export.py `_get_description_box_height_pt` / `_draw_description_box` ile uyumlu.
 */

import { CLASSIC_FONT_OPTICAL_MID_RATIO } from './classicBannerTopRow'

export const DESC_FONT_SIZE_PT = 8
export const DESC_LEADING_PT = DESC_FONT_SIZE_PT * 1.25 // 10
/** Varsayılan dikey iç boşluk (üst = alt → metin bloğu ortalı) */
export const DESC_BOX_PAD_Y_DEFAULT_PT = 5
export const DESC_BOX_PAD_X_DEFAULT_PT = 8
/** @deprecated — DESC_BOX_PAD_Y_DEFAULT_PT kullanın */
export const DESC_BOX_PAD_TOP_PT = DESC_BOX_PAD_Y_DEFAULT_PT
/** @deprecated — DESC_BOX_PAD_Y_DEFAULT_PT kullanın */
export const DESC_BOX_PAD_BOTTOM_PT = DESC_BOX_PAD_Y_DEFAULT_PT
export const DESC_BOX_PAD_X_PT = DESC_BOX_PAD_X_DEFAULT_PT
export const DESC_BOX_GAP_BELOW_PT = 6
export const DESC_BANNER_H_PT = 22
export const DESC_BANNER_GAP_PT = 2
/** Deneme: yönerge üstü sınav kodu / test adı / kitapçık satırı */
export const TRIAL_DESC_META_H_PT = 20
export const TRIAL_DESC_META_FONT_PT = 9
/** Optik ortalama — 8pt × ~0.36 */
export const DESC_TEXT_OFFSET_PT = DESC_FONT_SIZE_PT * CLASSIC_FONT_OPTICAL_MID_RATIO
/** Minimal klasik şerit — alt bilgi kutusu */
export const CLASSIC_INFO_BAR_H_PT = 28
/** Test No / rozet ile dış çerçeve arası */
export const CLASSIC_INFO_BAR_BADGE_INSET_PT = 6
export const CLASSIC_BANNER_RADIUS_PT = 6
export const CLASSIC_BANNER_LINE_PT = 1
export const CLASSIC_BANNER_AND_INFO_H_PT =
  DESC_BANNER_H_PT + DESC_BANNER_GAP_PT + CLASSIC_INFO_BAR_H_PT

export function clampDescriptionBoxPadYPt(pt: number): number {
  const n = Number(pt)
  if (!Number.isFinite(n)) return DESC_BOX_PAD_Y_DEFAULT_PT
  return Math.max(2, Math.min(28, Math.round(n * 2) / 2))
}

export function clampDescriptionBoxPadXPt(pt: number): number {
  const n = Number(pt)
  if (!Number.isFinite(n)) return DESC_BOX_PAD_X_DEFAULT_PT
  return Math.max(2, Math.min(28, Math.round(n * 2) / 2))
}

export type DescriptionLayoutResult = {
  colCount: number
  linesPerCol: string[][]
  maxLines: number
  boxHeightPt: number
  leadingPt: number
  padTopPt: number
  padBottomPt: number
  padXPt: number
}

function decodeHtmlEntities(s: string): string {
  if (!s) return ''
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

export function descriptionHtmlToLines(html: string): string[] {
  let t = (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p(?:\s[^>]*)?>/gi, '\n')
    .replace(/<li(?:\s[^>]*)?>/gi, '\n• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
  t = decodeHtmlEntities(t)
  const lines = t
    .split('\n')
    .map((x) => x.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  return lines.length ? lines : ['']
}

export type TextMeasurer = (text: string, fontSizePt: number) => number

const defaultMeasurer: TextMeasurer = (text, fontSizePt) => text.length * fontSizePt * 0.48

export function wrapTextToWidth(
  text: string,
  maxWidthPt: number,
  fontSizePt: number,
  measure: TextMeasurer = defaultMeasurer,
): string[] {
  const t = (text || '').trim()
  if (!t) return ['']
  if (maxWidthPt <= 0) return [t.slice(0, 120)]
  if (measure(t, fontSizePt) <= maxWidthPt) return [t]

  const words = t.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const trial = current ? `${current} ${word}` : word
    if (measure(trial, fontSizePt) <= maxWidthPt) {
      current = trial
    } else {
      if (current) lines.push(current)
      if (measure(word, fontSizePt) > maxWidthPt) {
        let chunk = ''
        for (const ch of word) {
          const t2 = chunk + ch
          if (measure(t2, fontSizePt) <= maxWidthPt) chunk = t2
          else {
            if (chunk) lines.push(chunk)
            chunk = ch
          }
        }
        current = chunk
      } else {
        current = word
      }
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

export type DescriptionLayoutInput = {
  includeDescription: boolean
  descriptionColumnCount?: number
  descriptionTexts?: string[]
  descriptionBoxPadYPt?: number
  descriptionBoxPadXPt?: number
  /** Deneme: yönerge kutusunun üstünde meta satır */
  trialMetaBar?: boolean
}

export function computeDescriptionLayout(
  input: DescriptionLayoutInput,
  contentWidthPt: number,
  measure: TextMeasurer = defaultMeasurer,
): DescriptionLayoutResult | null {
  if (!input.includeDescription) return null

  const colCount = Math.max(1, Math.min(3, input.descriptionColumnCount ?? 1))
  const textsIn = (input.descriptionTexts ?? []).slice(0, colCount)
  while (textsIn.length < colCount) textsIn.push('')

  const padYPt = clampDescriptionBoxPadYPt(
    input.descriptionBoxPadYPt ?? DESC_BOX_PAD_Y_DEFAULT_PT,
  )
  const padXPt = clampDescriptionBoxPadXPt(
    input.descriptionBoxPadXPt ?? DESC_BOX_PAD_X_DEFAULT_PT,
  )

  const colW = contentWidthPt / colCount
  const linesPerCol: string[][] = []

  for (let colIdx = 0; colIdx < colCount; colIdx++) {
    const rawLines = descriptionHtmlToLines(textsIn[colIdx] ?? '')
    const wrapped: string[] = []
    for (let li = 0; li < rawLines.length; li++) {
      const maxW = colW - 2 * padXPt
      wrapped.push(...wrapTextToWidth(rawLines[li]!, maxW, DESC_FONT_SIZE_PT, measure))
    }
    linesPerCol.push(wrapped.length ? wrapped : [''])
  }

  const maxLines = Math.max(1, ...linesPerCol.map((ll) => ll.length))
  const leadingPt = DESC_LEADING_PT
  // Üst = alt → satır bloğu kutuda dikey ortalı
  const padTopPt = padYPt
  const padBottomPt = padYPt
  const textBoxHeightPt = padTopPt + maxLines * leadingPt + padBottomPt
  const metaH = input.trialMetaBar ? TRIAL_DESC_META_H_PT : 0
  const boxHeightPt = metaH + textBoxHeightPt

  return {
    colCount,
    linesPerCol,
    maxLines,
    boxHeightPt,
    leadingPt,
    padTopPt,
    padBottomPt,
    padXPt,
  }
}

/** Banner altından soru alanı üst sınırına kadar toplam yükseklik (PDF pt, yukarıdan aşağı). */
export function descriptionHeaderBlockHeightPt(
  input: DescriptionLayoutInput,
  contentWidthPt: number,
  measure?: TextMeasurer,
  bannerAndInfoHpt = CLASSIC_BANNER_AND_INFO_H_PT,
): number {
  const desc = computeDescriptionLayout(input, contentWidthPt, measure)
  if (!desc) return bannerAndInfoHpt
  return bannerAndInfoHpt + DESC_BANNER_GAP_PT + desc.boxHeightPt + DESC_BOX_GAP_BELOW_PT
}

/** ReportLab/pdf-lib: kutu üstünden (boxTop) satır baseline — optik dikey orta */
export function descriptionLineBaselinePt(
  boxTopPt: number,
  lineIdx: number,
  layout: Pick<DescriptionLayoutResult, 'padTopPt' | 'leadingPt'>,
  fontSizePt = DESC_FONT_SIZE_PT,
): number {
  const centerY =
    boxTopPt - layout.padTopPt - (lineIdx + 0.5) * layout.leadingPt
  return centerY - fontSizePt * CLASSIC_FONT_OPTICAL_MID_RATIO
}

/** Canvas (y aşağı): satır optik merkezi — kutu üstünden */
export function descriptionLineCenterFromTopPt(
  lineIdx: number,
  layout: Pick<DescriptionLayoutResult, 'padTopPt' | 'leadingPt'>,
): number {
  return layout.padTopPt + (lineIdx + 0.5) * layout.leadingPt
}
