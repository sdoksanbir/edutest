/** Açıklama kutusu + header yükseklik hesapları (canvas ile uyumlu) */

import { rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib'
import {
  corporateOtherPageHeaderTotalPt,
  isCorporateHeader,
  parseHeaderConfig,
} from './corporate-header-layout.js'
import { themeFirstPageHeaderTotalPt } from './header-styles.js'
import { mergeHeaderBadgeConfig } from './header-badge-by-style.js'
import { resolveClassicBannerAndInfoHeightPt } from './banner-right-mode.js'

export const DESC_FONT_SIZE_PT = 8
export const DESC_LEADING_PT = DESC_FONT_SIZE_PT * 1.25
export const DESC_BOX_PAD_TOP_PT = 7
export const DESC_BOX_PAD_BOTTOM_PT = 7
export const DESC_BOX_PAD_X_PT = 6
export const DESC_BOX_GAP_BELOW_PT = 6
export const BANNER_H_PT = 22
export const BANNER_GAP_PT = 2
export const DESC_TEXT_OFFSET_PT = 3
export const CLASSIC_INFO_BAR_H_PT = 28
export const CLASSIC_INFO_BAR_BADGE_INSET_PT = 6
export const CLASSIC_BANNER_RADIUS_PT = 6
export const CLASSIC_BANNER_LINE_PT = 1
export const CLASSIC_BANNER_AND_INFO_H_PT = BANNER_H_PT + BANNER_GAP_PT + CLASSIC_INFO_BAR_H_PT

export type DescriptionLayout = {
  colCount: number
  linesPerCol: string[][]
  maxLines: number
  boxHeightPt: number
  leadingPt: number
  padTopPt: number
  padBottomPt: number
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

export function wrapTextToWidth(text: string, font: PDFFont | null, size: number, maxWidthPt: number): string[] {
  const measure = (s: string) => (font ? font.widthOfTextAtSize(s, size) : s.length * size * 0.48)
  const t = (text || '').trim()
  if (!t) return ['']
  if (maxWidthPt <= 0) return [t.slice(0, 120)]
  if (measure(t) <= maxWidthPt) return [t]

  const words = t.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word
    if (measure(trial) <= maxWidthPt) current = trial
    else {
      if (current) lines.push(current)
      if (measure(word) > maxWidthPt) {
        let chunk = ''
        for (const ch of word) {
          const t2 = chunk + ch
          if (measure(t2) <= maxWidthPt) chunk = t2
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

export function computeDescriptionLayout(
  payload: Record<string, unknown>,
  contentWidthPt: number,
  font: PDFFont | null = null,
): DescriptionLayout | null {
  if (!payload.include_description) return null

  const colCount = Math.max(1, Math.min(3, Number(payload.description_column_count ?? 1)))
  const textsIn = ((payload.description_texts as string[]) ?? []).slice(0, colCount)
  while (textsIn.length < colCount) textsIn.push('')

  const colW = contentWidthPt / colCount
  const linesPerCol: string[][] = []

  for (let colIdx = 0; colIdx < colCount; colIdx++) {
    const rawLines = descriptionHtmlToLines(textsIn[colIdx] ?? '')
    const wrapped: string[] = []
    for (let li = 0; li < rawLines.length; li++) {
      const maxW = colW - 2 * DESC_BOX_PAD_X_PT
      wrapped.push(...wrapTextToWidth(rawLines[li]!, font, DESC_FONT_SIZE_PT, maxW))
    }
    linesPerCol.push(wrapped.length ? wrapped : [''])
  }

  const maxLines = Math.max(1, ...linesPerCol.map((ll) => ll.length))
  const boxHeightPt = DESC_BOX_PAD_TOP_PT + maxLines * DESC_LEADING_PT + DESC_BOX_PAD_BOTTOM_PT

  return {
    colCount,
    linesPerCol,
    maxLines,
    boxHeightPt,
    leadingPt: DESC_LEADING_PT,
    padTopPt: DESC_BOX_PAD_TOP_PT,
    padBottomPt: DESC_BOX_PAD_BOTTOM_PT,
  }
}

function classicBannerAndInfoFromPayload(payload: Record<string, unknown>): number {
  const config = parseHeaderConfig(payload.header_config)
  return resolveClassicBannerAndInfoHeightPt(
    mergeHeaderBadgeConfig(config, String(payload.header_style_id ?? '')),
  )
}

export function descriptionHeaderTotalPt(payload: Record<string, unknown>, contentWidthPt: number): number {
  const desc = computeDescriptionLayout(payload, contentWidthPt, null)
  const bannerH = classicBannerAndInfoFromPayload(payload)
  if (!desc) return bannerH
  return bannerH + BANNER_GAP_PT + desc.boxHeightPt + DESC_BOX_GAP_BELOW_PT
}

function lineBaselinePt(boxTopPt: number, lineIdx: number, layout: DescriptionLayout): number {
  return boxTopPt - layout.padTopPt - (lineIdx + 0.5) * layout.leadingPt - DESC_TEXT_OFFSET_PT
}

/** pdf-lib drawSvgPath: y anchor = şeklin ÜST kenarı (scale(1,-1) nedeniyle) */
function descriptionBoxPath(w: number, h: number, r: number): string {
  return `M 0,0 L ${w},0 L ${w},${h - r} Q ${w},${h} ${w - r},${h} L ${r},${h} Q 0,${h} 0,${h - r} L 0,0 Z`
}

function drawDescriptionBoxPath(page: PDFPage, x: number, yTop: number, w: number, h: number, r: number, theme: RGB) {
  page.drawSvgPath(descriptionBoxPath(w, h, r), {
    x,
    y: yTop,
    color: rgb(1, 1, 1),
    borderColor: theme,
    borderWidth: 1,
  })
}

export function drawDescriptionBox(
  page: PDFPage,
  payload: Record<string, unknown>,
  geom: { page_w_pt: number; ml: number; mr: number },
  bannerBottomY: number,
  theme: RGB,
  fonts: { regular: PDFFont },
) {
  if (isCorporateHeader(String(payload.header_style_id ?? ''))) return

  const contentW = geom.page_w_pt - geom.ml - geom.mr
  const layout = computeDescriptionLayout(payload, contentW, fonts.regular)
  if (!layout) return

  const boxTop = bannerBottomY - BANNER_GAP_PT
  const boxBottom = boxTop - layout.boxHeightPt
  const colW = contentW / layout.colCount
  const r = 6

  drawDescriptionBoxPath(page, geom.ml, boxTop, contentW, layout.boxHeightPt, r, theme)

  for (let colIdx = 0; colIdx < layout.colCount; colIdx++) {
    const lines = layout.linesPerCol[colIdx] ?? ['']
    const xLeft = geom.ml + colIdx * colW

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const yBaseline = lineBaselinePt(boxTop, lineIdx, layout)
      const txt = (lines[lineIdx] || '').trim()
      if (!txt) continue

      const textOpts = {
        y: yBaseline,
        size: DESC_FONT_SIZE_PT,
        font: fonts.regular,
        color: rgb(0.15, 0.15, 0.15),
      }

      page.drawText(txt, { x: xLeft + DESC_BOX_PAD_X_PT, ...textOpts })
    }

    if (layout.colCount > 1 && payload.description_column_dividers && colIdx > 0) {
      page.drawLine({
        start: { x: geom.ml + colIdx * colW, y: boxBottom },
        end: { x: geom.ml + colIdx * colW, y: boxTop },
        thickness: 0.55,
        color: theme,
      })
    }
  }
}

export function headerHeightPt(payload: Record<string, unknown>, pageNum: number, contentWidthPt: number): number {
  if (payload.written_paper_header) return pageNum > 1 ? 2 : 80
  if (isCorporateHeader(String(payload.header_style_id ?? ''))) {
    const styleId = String(payload.header_style_id ?? '')
    const config = parseHeaderConfig(payload.header_config)
    return pageNum === 1
      ? themeFirstPageHeaderTotalPt(styleId, config)
      : corporateOtherPageHeaderTotalPt(styleId)
  }
  if (pageNum === 1 && payload.include_description) {
    return descriptionHeaderTotalPt(payload, contentWidthPt) - DESC_BOX_GAP_BELOW_PT
  }
  return classicBannerAndInfoFromPayload(payload)
}
