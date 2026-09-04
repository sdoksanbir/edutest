/**
 * Modern Kurumsal (Tema 1) — Canvas banner çizimi.
 */

import { CORPORATE_GRAY, type HeaderConfig } from './corporateHeaderLayout'
import {
  CORPORATE_LEFT_COL_W_PT,
  CORPORATE_STRIPE_H_PT,
} from './corporateHeaderLayout'
import {
  MODERN_FONT_SANS,
  MODERN_FOOTER_RED_RATIO,
  SUBJECT_PILL_RADIUS_PT,
  subjectPillHeightPt,
  slantedBarGeometry,
  STYLE_1_RUNNING_BODY_PT,
  STYLE_1_RUNNING_STRIPE_GAP_PT,
  STYLE_1_RUNNING_STRIPE_PT,
} from './modernCorporateHeaderShared'
import {
  corporateOtherPageHeaderLayoutPt,
  otherPageHeaderBottomGapPtFromMm,
} from './pdfLayoutGeometry'
import { style1BannerBlockHeightPt, style1BodyHeightPt } from './style1HeaderMetrics'
import { drawHeaderLeftColumnCanvas, headerLeftColumnActive } from './headerLeftColumn'
import { HEADER_LOGO_COL_PAD_PT } from './headerLogo'
import { fieldFontPt, runningHeaderSideFontPt, type HeaderFontFieldKey } from './headerFieldFonts'
import { headerFieldDisplayText, otherPageHeaderLeftText, otherPageHeaderRightText, visibleSubTopicText, visibleTopicText } from './headerFieldVisibility'
import {
  drawExamTypeBoxFillCanvas,
  drawExamTypeBoxBorderCanvas,
  drawExamTypeTextInBox,
  EXAM_TYPE_BOX_CENTER_GAP_PT,
  resolveExamTypeBoxWidthPt,
  resolveExamTypeBoxHeightPt,
  shouldDrawExamTypeBoxContent,
} from './examTypeBox'
import {
  resolveBannerRightMode,
  drawStyle1ScoreBoxCanvas,
  drawStyle1TestNoCanvas,
  resolveScoreBoxWidthPt,
  resolveScoreBoxHeightPt,
} from './bannerRightMode'
import { resolveSubjectPillPadXPt, resolveSubjectPillPadYPt, resolveSubjectPillFillColor, resolveSubjectPillTextColor, resolveSubjectPillTextOffsetYPt } from './modernCorporateHeaderShared'
import { mergeHeaderBadgeConfig } from './headerBadgeByStyle'

export type CorporateHeaderDrawParams = {
  ctx: CanvasRenderingContext2D
  scale: number
  ml: number
  mr: number
  pageWpx: number
  headerTopCanvas: number
  contentWpt: number
  config: HeaderConfig
  logoImage?: HTMLImageElement | null
  styleId?: string
  otherPageHeaderBottomGapMm?: number
}

function hexToRgb(hex: string): [number, number, number] {
  const s = (hex || '').trim().replace(/^#/, '')
  if (s.length !== 6) return [0.04, 0.1, 0.19]
  return [
    parseInt(s.slice(0, 2), 16) / 255,
    parseInt(s.slice(2, 4), 16) / 255,
    parseInt(s.slice(4, 6), 16) / 255,
  ]
}

function rgbCss(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`
}

export function drawSlantedBarCanvas(
  ctx: CanvasRenderingContext2D,
  ml: number,
  contentWpx: number,
  stripeY: number,
  stripeH: number,
  primary: string,
  accent: string,
) {
  const geo = slantedBarGeometry(ml, contentWpx, stripeH, MODERN_FOOTER_RED_RATIO)
  ctx.fillStyle = accent
  ctx.beginPath()
  for (let i = 0; i < geo.redPath.length; i++) {
    const [x, y] = geo.redPath[i]!
    if (i === 0) ctx.moveTo(x, stripeY + y)
    else ctx.lineTo(x, stripeY + y)
  }
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = primary
  ctx.beginPath()
  for (let i = 0; i < geo.primaryPath.length; i++) {
    const [x, y] = geo.primaryPath[i]!
    if (i === 0) ctx.moveTo(x, stripeY + y)
    else ctx.lineTo(x, stripeY + y)
  }
  ctx.closePath()
  ctx.fill()
}

export function drawCorporateHeaderCanvas(p: CorporateHeaderDrawParams): number {
  const s = p.scale
  const sid = p.styleId ?? 'style_1'
  const ff = (field: HeaderFontFieldKey, page: 'first' | 'running' = 'first') =>
    fieldFontPt(field, sid, p.config, page) * s
  const bodyHPt = style1BodyHeightPt(p.config, sid)
  const bodyH = bodyHPt * s
  const stripeH = CORPORATE_STRIPE_H_PT * s
  const y0 = p.headerTopCanvas
  const bodyY = y0 + stripeH
  const contentWpx = p.pageWpx - p.ml - p.mr
  const primary = rgbCss(p.config.primaryColor || '#0A1931')
  const accent = rgbCss(p.config.accentColor || '#DC2626')
  const leftColW = CORPORATE_LEFT_COL_W_PT * s

  p.ctx.fillStyle = '#ffffff'
  p.ctx.fillRect(p.ml, y0, contentWpx, bodyH + stripeH * 2)

  drawSlantedBarCanvas(p.ctx, p.ml, contentWpx, y0, stripeH, primary, accent)

  const pad = HEADER_LOGO_COL_PAD_PT * s
  const logoBoxX = p.ml + pad
  const logoBoxY = bodyY + pad
  const logoBoxW = leftColW - pad * 2
  const logoBoxH = bodyH - pad * 2

  drawHeaderLeftColumnCanvas(
    p.ctx,
    p.config,
    p.logoImage,
    logoBoxX,
    logoBoxY,
    logoBoxW,
    logoBoxH,
    s,
    MODERN_FONT_SANS,
  )

  const divX = p.ml + leftColW
  const badge = mergeHeaderBadgeConfig(p.config, sid)
  const rightMode = resolveBannerRightMode(badge)

  if (rightMode === 'examType' && shouldDrawExamTypeBoxContent(badge)) {
    const boxHPt = resolveExamTypeBoxHeightPt(badge)
    const boxH = boxHPt * s
    const boxY = bodyY + (bodyH - boxH) / 2
    const maxBoxWPt = (p.pageWpx - p.mr - divX - EXAM_TYPE_BOX_CENTER_GAP_PT * s) / s
    const boxWPt = resolveExamTypeBoxWidthPt(badge, maxBoxWPt)
    const boxW = boxWPt * s
    const boxX = p.pageWpx - p.mr - boxW
    drawExamTypeBoxFillCanvas(p.ctx, boxX, boxY, boxW, boxH, badge, s)
    drawExamTypeBoxBorderCanvas(p.ctx, boxX, boxY, boxW, boxH, badge, s)
    drawExamTypeTextInBox(
      p.ctx,
      boxX,
      boxY,
      boxW,
      boxH,
      badge,
      s,
      MODERN_FONT_SANS,
    )
  } else if (rightMode === 'score') {
    const boxW = resolveScoreBoxWidthPt(badge) * s
    const boxH = resolveScoreBoxHeightPt(badge) * s
    const boxX = p.pageWpx - p.mr - boxW
    const boxY = bodyY + (bodyH - boxH) / 2
    drawStyle1ScoreBoxCanvas(p.ctx, boxX, boxY, boxW, boxH, badge, s, MODERN_FONT_SANS)
  } else if (rightMode === 'testNo') {
    drawStyle1TestNoCanvas(
      p.ctx,
      p.pageWpx - p.mr,
      bodyY,
      bodyH,
      badge,
      s,
      MODERN_FONT_SANS,
    )
  }

  const line2 = headerFieldDisplayText(p.config, 'subject')
  const topic = visibleTopicText(p.config)
  const subTopic = visibleSubTopicText(p.config)
  // Bannerın tam ortası — sağ kutu büyüyüp küçülse / kapansa da sabit
  const centerX = p.ml + contentWpx / 2

  const subjectTopicGap = (p.config.subjectTopicGapPt ?? 3) * s
  const topicSubTopicGap = (p.config.topicSubTopicGapPt ?? 1) * s
  const pillPadXPt = resolveSubjectPillPadXPt(p.config)
  const pillPadYPt = resolveSubjectPillPadYPt(p.config)
  const topicBlockH = (() => {
    if (!topic && !subTopic) return 0
    let h = 0
    if (topic) h += ff('topic') + 2 * s
    if (subTopic) h += (topic ? topicSubTopicGap : 0) + ff('subTopic')
    return h
  })()
  let blockH = 0
  const subjectSizePt = fieldFontPt('subject', sid, p.config)
  if (line2) blockH += subjectPillHeightPt(subjectSizePt, pillPadYPt) * s + subjectTopicGap
  if (topicBlockH > 0) blockH += topicBlockH
  let ty = bodyY + (bodyH - blockH) / 2

  p.ctx.textAlign = 'center'
  p.ctx.textBaseline = 'top'

  if (line2) {
    const subjectSize = ff('subject')
    const subj = line2.slice(0, 40)
    p.ctx.font = `800 ${subjectSize}px ${MODERN_FONT_SANS}`
    const tw = p.ctx.measureText(subj).width
    const pillPadX = pillPadXPt * s
    const pillW = tw + pillPadX * 2
    const pillH = subjectPillHeightPt(subjectSizePt, pillPadYPt) * s
    const pillX = centerX - pillW / 2
    const pillR = SUBJECT_PILL_RADIUS_PT * s
    const pillFill = rgbCss(resolveSubjectPillFillColor(p.config))
    const pillText = rgbCss(resolveSubjectPillTextColor(p.config))
    const textOffsetY = resolveSubjectPillTextOffsetYPt(p.config) * s

    p.ctx.fillStyle = pillFill
    p.ctx.beginPath()
    p.ctx.roundRect(pillX, ty, pillW, pillH, pillR)
    p.ctx.fill()

    p.ctx.fillStyle = pillText
    p.ctx.textAlign = 'center'
    // Mürekkep kutusuna göre dikey ortalama (+ kaydırma)
    p.ctx.textBaseline = 'alphabetic'
    const metrics = p.ctx.measureText(subj)
    const asc = metrics.actualBoundingBoxAscent ?? subjectSize * 0.72
    const desc = metrics.actualBoundingBoxDescent ?? subjectSize * 0.08
    p.ctx.fillText(subj, centerX, ty + pillH / 2 + (asc - desc) / 2 + textOffsetY)
    p.ctx.textBaseline = 'top'
    ty += pillH + subjectTopicGap
  }
  if (topic || subTopic) {
    let topicAreaY = ty
    if (topic) {
      const topicFontPx = ff('topic')
      const rowH = topicFontPx + 2 * s
      p.ctx.font = `700 ${topicFontPx}px ${MODERN_FONT_SANS}`
      const topicStr = topic.slice(0, 40)
      const rowCy = topicAreaY + rowH / 2

      p.ctx.fillStyle = primary
      p.ctx.textAlign = 'center'
      p.ctx.textBaseline = 'middle'
      p.ctx.fillText(topicStr, centerX, rowCy)
      topicAreaY += rowH + topicSubTopicGap
    }
    if (subTopic) {
      p.ctx.fillStyle = CORPORATE_GRAY
      p.ctx.font = `${ff('subTopic')}px ${MODERN_FONT_SANS}`
      p.ctx.textAlign = 'center'
      p.ctx.textBaseline = topic ? 'top' : 'middle'
      const subY = topic ? topicAreaY : ty + topicBlockH / 2
      p.ctx.fillText(subTopic.slice(0, 40), centerX, subY)
      p.ctx.textBaseline = 'top'
    }
  }

  drawSlantedBarCanvas(p.ctx, p.ml, contentWpx, bodyY + bodyH, stripeH, primary, accent)
  p.ctx.textAlign = 'left'
  return style1BannerBlockHeightPt(p.config, sid)
}

export function drawStyle1RunningHeaderCanvas(
  p: CorporateHeaderDrawParams & { pageNum: number },
): number {
  const s = p.scale
  const sid = p.styleId ?? 'style_1'
  const y0 = p.headerTopCanvas
  const contentWpx = p.pageWpx - p.ml - p.mr
  const primary = rgbCss(p.config.primaryColor || '#0A1931')
  const accent = rgbCss(p.config.accentColor || '#DC2626')

  const bodyH = STYLE_1_RUNNING_BODY_PT * s
  const stripeGap = STYLE_1_RUNNING_STRIPE_GAP_PT * s
  const stripeH = STYLE_1_RUNNING_STRIPE_PT * s
  const gapBelow = otherPageHeaderBottomGapPtFromMm(p.otherPageHeaderBottomGapMm) * s
  const bodyY0 = y0 + stripeH + stripeGap
  const totalH = stripeH + stripeGap + bodyH + stripeGap + stripeH + gapBelow

  p.ctx.fillStyle = '#ffffff'
  p.ctx.fillRect(p.ml, y0, contentWpx, totalH)

  drawSlantedBarCanvas(p.ctx, p.ml, contentWpx, y0, stripeH, primary, accent)

  const textMidY = bodyY0 + bodyH / 2
  const textStartX = p.ml + 4 * s

  const topic = otherPageHeaderLeftText(p.config)
  const brand = otherPageHeaderRightText(p.config)

  p.ctx.textAlign = 'left'
  p.ctx.textBaseline = 'middle'

  const labelPt = runningHeaderSideFontPt(sid, p.config) * s

  if (topic) {
    p.ctx.fillStyle = primary
    p.ctx.font = `700 ${labelPt}px ${MODERN_FONT_SANS}`
    p.ctx.fillText(topic.slice(0, 40), textStartX, textMidY)
  }

  if (brand) {
    p.ctx.textAlign = 'right'
    p.ctx.font = `700 ${labelPt}px ${MODERN_FONT_SANS}`
    p.ctx.fillStyle = accent
    p.ctx.fillText(brand.slice(0, 40), p.pageWpx - p.mr, textMidY)
    p.ctx.textAlign = 'left'
  }

  drawSlantedBarCanvas(p.ctx, p.ml, contentWpx, bodyY0 + bodyH + stripeGap, stripeH, primary, accent)
  return corporateOtherPageHeaderLayoutPt(sid, p.otherPageHeaderBottomGapMm) * s
}

export function corporateHeaderHeightPt(config?: HeaderConfig, styleId = 'style_1'): number {
  if (config) return style1BannerBlockHeightPt(config, styleId)
  return style1BannerBlockHeightPt({ subject: '', topic: '', subTopic: '' } as HeaderConfig, styleId)
}
