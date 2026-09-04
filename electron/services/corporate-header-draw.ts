/**
 * Modern Kurumsal (Tema 1) — PDF vektör banner (Canvas ile birebir hizalı).
 */

import { rgb, type PDFDocument, type PDFPage, type PDFFont, type RGB } from 'pdf-lib'
import {
  CORPORATE_LEFT_COL_W_PT,
  CORPORATE_STRIPE_H_PT,
  parseHeaderConfig,
  type HeaderConfig,
} from './corporate-header-layout.js'
import {
  MODERN_FOOTER_RED_RATIO,
  SUBJECT_PILL_RADIUS_PT,
  subjectPillHeightPt,
  slantedBarGeometry,
  STYLE_1_RUNNING_BODY_PT,
  STYLE_1_RUNNING_STRIPE_GAP_PT,
  STYLE_1_RUNNING_STRIPE_PT,
} from './modern-corporate-header-shared.js'
import { corporateOtherPageHeaderLayoutPt } from './header-styles.js'
import { style1BodyHeightPt, style1BannerBlockHeightPt } from './style1-header-metrics.js'
import { fieldFontPt, runningHeaderSideFontPt, type HeaderFontFieldKey } from './header-field-fonts.js'
import {
  headerFieldDisplayText,
  otherPageHeaderLeftText,
  otherPageHeaderRightText,
  visibleSubTopicText,
  visibleTopicText,
} from './header-field-visibility.js'
import { HEADER_LOGO_COL_PAD_PT } from './header-logo.js'
import { drawHeaderLeftColumnPdf } from './header-left-column.js'
import {
  drawExamTypeBoxFillPdf,
  drawExamTypeBoxBorderPdf,
  drawExamTypeTextInBoxPdf,
  examTypeLineSpecs,
  EXAM_TYPE_BOX_CENTER_GAP_PT,
  resolveExamTypeBoxWidthPt,
  resolveExamTypeBoxHeightPt,
} from './exam-type-box.js'
import {
  resolveBannerRightMode,
  drawStyle1ScoreBoxPdf,
  drawStyle1TestNoPdf,
  resolveScoreBoxWidthPt,
  resolveScoreBoxHeightPt,
} from './banner-right-mode.js'
import { resolveSubjectPillPadXPt, resolveSubjectPillPadYPt, resolveSubjectPillFillColor, resolveSubjectPillTextColor, resolveSubjectPillTextOffsetYPt } from './modern-corporate-header-shared.js'
import { mergeHeaderBadgeConfig } from './header-badge-by-style.js'

/** PDF metin baseline — canvas textBaseline:'top' ile uyum */
const FONT_ASC = 0.78

function roundRectPath(w: number, h: number, r: number): string {
  const rad = Math.min(r, w / 2, h / 2)
  return [
    `M ${rad},0`,
    `L ${w - rad},0`,
    `Q ${w},0 ${w},${rad}`,
    `L ${w},${h - rad}`,
    `Q ${w},${h} ${w - rad},${h}`,
    `L ${rad},${h}`,
    `Q 0,${h} 0,${h - rad}`,
    `L 0,${rad}`,
    `Q 0,0 ${rad},0`,
    'Z',
  ].join(' ')
}

function hexToRgb(hex: string): RGB {
  const s = (hex || '').trim().replace(/^#/, '')
  if (s.length !== 6) return rgb(0.04, 0.1, 0.19)
  return rgb(
    parseInt(s.slice(0, 2), 16) / 255,
    parseInt(s.slice(2, 4), 16) / 255,
    parseInt(s.slice(4, 6), 16) / 255,
  )
}

export function drawSlantedBarPdf(
  page: PDFPage,
  ml: number,
  contentW: number,
  stripeBottom: number,
  stripeH: number,
  primary: RGB,
  accent: RGB,
) {
  const { redEnd, slantW } = slantedBarGeometry(ml, contentW, stripeH, MODERN_FOOTER_RED_RATIO)
  const yTop = stripeBottom + stripeH
  const localRedEnd = redEnd - ml

  page.drawSvgPath(
    `M 0,${stripeH} L ${localRedEnd - slantW / 2},${stripeH} L ${localRedEnd + slantW / 2},0 L 0,0 Z`,
    { x: ml, y: yTop, color: accent },
  )
  page.drawSvgPath(
    `M ${localRedEnd - slantW / 2},${stripeH} L ${contentW},${stripeH} L ${contentW},0 L ${localRedEnd + slantW / 2},0 Z`,
    { x: ml, y: yTop, color: primary },
  )
}

export function corporateHeaderBlockHeightPt(config?: HeaderConfig, styleId = 'style_1'): number {
  if (config) return style1BannerBlockHeightPt(config, styleId)
  return style1BannerBlockHeightPt(parseHeaderConfig({}), styleId)
}

export async function drawCorporateHeader(
  pdf: PDFDocument,
  page: PDFPage,
  payload: Record<string, unknown>,
  geom: { page_w_pt: number; page_h_pt: number; ml: number; mr: number },
  mt: number,
  fonts: { regular: PDFFont; bold: PDFFont },
) {
  const config = parseHeaderConfig(payload.header_config)
  const sid = String(payload.header_style_id ?? 'style_1')
  const ff = (field: HeaderFontFieldKey, page: 'first' | 'running' = 'first') =>
    fieldFontPt(field, sid, config, page)
  const primary = hexToRgb(config.primaryColor || '#0A1931')
  const accent = hexToRgb(config.accentColor || '#DC2626')
  const contentW = geom.page_w_pt - geom.ml - geom.mr
  const bodyHPt = style1BodyHeightPt(config, sid)
  const headerTop = geom.page_h_pt - mt
  const topStripeBottom = headerTop - CORPORATE_STRIPE_H_PT
  const bodyTop = topStripeBottom
  const bodyBottom = bodyTop - bodyHPt
  const bottomStripeBottom = bodyBottom - CORPORATE_STRIPE_H_PT
  const bannerH = bodyHPt + CORPORATE_STRIPE_H_PT * 2

  page.drawRectangle({
    x: geom.ml,
    y: bottomStripeBottom,
    width: contentW,
    height: bannerH,
    color: rgb(1, 1, 1),
  })

  drawSlantedBarPdf(page, geom.ml, contentW, topStripeBottom, CORPORATE_STRIPE_H_PT, primary, accent)

  const pad = HEADER_LOGO_COL_PAD_PT
  const logoBoxX = geom.ml + pad
  const logoBoxY = bodyBottom + pad
  const logoBoxW = CORPORATE_LEFT_COL_W_PT - pad * 2
  const logoBoxH = bodyHPt - pad * 2
  await drawHeaderLeftColumnPdf(
    pdf,
    page,
    config,
    logoBoxX,
    logoBoxY,
    logoBoxW,
    logoBoxH,
    fonts.bold,
  )

  const divX = geom.ml + CORPORATE_LEFT_COL_W_PT
  const badge = mergeHeaderBadgeConfig(config, sid)
  const rightMode = resolveBannerRightMode(badge)

  if (rightMode === 'examType' && examTypeLineSpecs(badge).length > 0) {
    const boxH = resolveExamTypeBoxHeightPt(badge)
    const boxY = bodyBottom + (bodyHPt - boxH) / 2
    const maxBoxWPt = geom.page_w_pt - geom.mr - divX - EXAM_TYPE_BOX_CENTER_GAP_PT
    const boxW = resolveExamTypeBoxWidthPt(badge, maxBoxWPt)
    const boxX = geom.page_w_pt - geom.mr - boxW
    drawExamTypeBoxFillPdf(page, boxX, boxY, boxW, boxH, badge)
    drawExamTypeBoxBorderPdf(page, boxX, boxY, boxW, boxH, badge)
    drawExamTypeTextInBoxPdf(page, fonts.bold, boxX, boxY, boxW, boxH, badge)
  } else if (rightMode === 'score') {
    const boxW = resolveScoreBoxWidthPt(badge)
    const boxH = resolveScoreBoxHeightPt(badge)
    const boxX = geom.page_w_pt - geom.mr - boxW
    const boxY = bodyBottom + (bodyHPt - boxH) / 2
    drawStyle1ScoreBoxPdf(page, fonts.bold, boxX, boxY, boxW, boxH, badge)
  } else if (rightMode === 'testNo') {
    drawStyle1TestNoPdf(
      page,
      fonts.bold,
      geom.page_w_pt - geom.mr,
      bodyBottom,
      bodyHPt,
      badge,
    )
  }

  // Bannerın tam ortası — sağ kutu büyüyüp küçülse / kapansa da sabit
  drawCenterTextBlock(page, config, geom.ml + contentW / 2, bodyTop, bodyHPt, primary, fonts, sid)
  drawSlantedBarPdf(page, geom.ml, contentW, bottomStripeBottom, CORPORATE_STRIPE_H_PT, primary, accent)
}

/** Canvas ile aynı: üstten aşağı satır yerleşimi */
function drawCenterTextBlock(
  page: PDFPage,
  config: HeaderConfig,
  centerX: number,
  bodyTop: number,
  bodyHeightPt: number,
  primary: RGB,
  fonts: { regular: PDFFont; bold: PDFFont },
  styleId = 'style_1',
) {
  const ff = (field: HeaderFontFieldKey) => fieldFontPt(field, styleId, config)
  const line2 = headerFieldDisplayText(config, 'subject')
  const topic = visibleTopicText(config)
  const subTopic = visibleSubTopicText(config)

  const pillPadXPt = resolveSubjectPillPadXPt(config)
  const pillPadYPt = resolveSubjectPillPadYPt(config)
  const subjectTopicGap = config.subjectTopicGapPt ?? 3
  const topicSubTopicGap = config.topicSubTopicGapPt ?? 1
  const topicBlockH = (() => {
    if (!topic && !subTopic) return 0
    let h = 0
    if (topic) h += ff('topic') + 2
    if (subTopic) h += (topic ? topicSubTopicGap : 0) + ff('subTopic')
    return h
  })()
  let blockH = 0
  if (line2) blockH += subjectPillHeightPt(ff('subject'), pillPadYPt) + subjectTopicGap
  if (topicBlockH > 0) blockH += topicBlockH

  let fromTop = (bodyHeightPt - blockH) / 2

  if (line2) {
    const size = ff('subject')
    const subj = line2.slice(0, 40)
    const tw = fonts.bold.widthOfTextAtSize(subj, size)
    const pillW = tw + pillPadXPt * 2
    const pillH = subjectPillHeightPt(size, pillPadYPt)
    const pillX = centerX - pillW / 2
    const pillTop = bodyTop - fromTop
    const pillFill = hexToRgb(resolveSubjectPillFillColor(config))
    const pillText = hexToRgb(resolveSubjectPillTextColor(config))
    const textOffsetY = resolveSubjectPillTextOffsetYPt(config)

    page.drawSvgPath(roundRectPath(pillW, pillH, SUBJECT_PILL_RADIUS_PT), {
      x: pillX,
      y: pillTop,
      color: pillFill,
      borderWidth: 0,
    })
    // Dikey orta + kaydırma (PDF y yukarı; +offset aşağı = y azalır)
    page.drawText(subj, {
      x: centerX - tw / 2,
      y: pillTop - pillH / 2 - size * (FONT_ASC / 2) - textOffsetY,
      size,
      font: fonts.bold,
      color: pillText,
    })
    fromTop += pillH + subjectTopicGap
  }

  if (topic || subTopic) {
    let topicAreaTop = fromTop
    if (topic) {
      const topicSize = ff('topic')
      const topicStr = topic.slice(0, 40)
      const topicW = fonts.bold.widthOfTextAtSize(topicStr, topicSize)
      const rowH = topicSize + 2
      const rowCy = bodyTop - topicAreaTop - rowH / 2

      page.drawText(topicStr, {
        x: centerX - topicW / 2,
        y: rowCy - topicSize * 0.35,
        size: topicSize,
        font: fonts.bold,
        color: primary,
      })
      topicAreaTop += rowH + topicSubTopicGap
    }
    if (subTopic) {
      const subSize = ff('subTopic')
      const subStr = subTopic.slice(0, 40)
      const subW = fonts.regular.widthOfTextAtSize(subStr, subSize)
      const subY = topic
        ? bodyTop - topicAreaTop - subSize * FONT_ASC
        : bodyTop - fromTop - topicBlockH / 2 - subSize * 0.35
      page.drawText(subStr, {
        x: centerX - subW / 2,
        y: subY,
        size: subSize,
        font: fonts.regular,
        color: rgb(0.42, 0.45, 0.5),
      })
    }
  }
}

/** 2+ sayfa — Modern Kurumsal kompakt başlık (10 mm) */
export async function drawStyle1RunningHeaderPdf(
  pdf: PDFDocument,
  page: PDFPage,
  config: HeaderConfig,
  pageNum: number,
  geom: { page_w_pt: number; page_h_pt: number; ml: number; mr: number },
  mt: number,
  fonts: { regular: PDFFont; bold: PDFFont },
  styleId = 'style_1',
  otherPageGapMm = 1.0,
) {
  const primary = hexToRgb(config.primaryColor || '#0A1931')
  const accent = hexToRgb(config.accentColor || '#DC2626')
  const contentW = geom.page_w_pt - geom.ml - geom.mr
  const headerTop = geom.page_h_pt - mt
  const totalPt = corporateOtherPageHeaderLayoutPt(styleId, otherPageGapMm)
  const topStripeBottom = headerTop - STYLE_1_RUNNING_STRIPE_PT
  const bodyTop = topStripeBottom - STYLE_1_RUNNING_STRIPE_GAP_PT
  const bodyBottom = bodyTop - STYLE_1_RUNNING_BODY_PT
  const bottomStripeBottom =
    bodyBottom - STYLE_1_RUNNING_STRIPE_GAP_PT - STYLE_1_RUNNING_STRIPE_PT

  page.drawRectangle({
    x: geom.ml,
    y: headerTop - totalPt,
    width: contentW,
    height: totalPt,
    color: rgb(1, 1, 1),
  })

  const midY = bodyBottom + STYLE_1_RUNNING_BODY_PT / 2 - 2

  const topic = otherPageHeaderLeftText(config)
  const brand = otherPageHeaderRightText(config)
  const textX = geom.ml + 4

  const labelSize = runningHeaderSideFontPt(styleId, config)

  if (topic) {
    page.drawText(topic.slice(0, 40), {
      x: textX,
      y: midY,
      size: labelSize,
      font: fonts.bold,
      color: primary,
    })
  }

  if (brand) {
    const brandW = fonts.bold.widthOfTextAtSize(brand.slice(0, 40), labelSize)
    page.drawText(brand.slice(0, 40), {
      x: geom.page_w_pt - geom.mr - brandW,
      y: midY,
      size: labelSize,
      font: fonts.bold,
      color: accent,
    })
  }

  drawSlantedBarPdf(page, geom.ml, contentW, topStripeBottom, STYLE_1_RUNNING_STRIPE_PT, primary, accent)
  drawSlantedBarPdf(page, geom.ml, contentW, bottomStripeBottom, STYLE_1_RUNNING_STRIPE_PT, primary, accent)
}
