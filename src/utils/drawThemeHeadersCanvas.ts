/**
 * 4 kurumsal başlık teması — Canvas önizleme çizimi.
 */

import {
  CORPORATE_GRAY,
  CORPORATE_STRIPE_END_DOT_GAP_PT,
  CORPORATE_STRIPE_END_DOT_W_PT,
  CORPORATE_STRIPE_H_PT,
  CORPORATE_STRIPE_ROW_H_PT,
  CORPORATE_STRIPE_SECTION_GAP_PT,
} from './corporateHeaderLayout'
import { HEADER_FONT_FAMILY_CANVAS } from './corporateHeaderConstants'
import {
  normalizeHeaderStyleId,
  STYLE_2_FIRST_H_PT,
  STYLE_3_FIRST_H_PT,
  STYLE_4_FIRST_H_PT,
  themeFirstPageHeaderTotalPt,
  themeRunningHeaderTotalPt,
  THEME_RUNNING_BODY_H_PT,
  THEME_RUNNING_STRIPE_GAP_PT,
  THEME_RUNNING_STRIPE_H_PT,
} from './headerStyles'
import {
  corporateOtherPageHeaderLayoutPt,
  otherPageHeaderBottomGapPtFromMm,
} from './pdfLayoutGeometry'
import {
  drawCorporateHeaderCanvas,
  drawStyle1RunningHeaderCanvas,
  type CorporateHeaderDrawParams,
} from './drawCorporateHeaderCanvas'
import {
  drawHeaderLeftColumnCanvas,
  headerLeftColumnActive,
} from './headerLeftColumn'
import { HEADER_LOGO_COL_PAD_PT } from './headerLogo'
import type { HeaderConfig } from './corporateHeaderLayout'
import { fieldFontPt, runningHeaderSideFontPt, type HeaderFontFieldKey } from './headerFieldFonts'
import { headerFieldDisplayText, otherPageHeaderLeftText, otherPageHeaderRightText, visibleSubTopicText, visibleTopicText } from './headerFieldVisibility'

export type ThemeRunningHeaderParams = {
  ctx: CanvasRenderingContext2D
  scale: number
  ml: number
  mr: number
  pageWpx: number
  headerTopCanvas: number
  contentWpt: number
  config: HeaderConfig
  styleId: string
  pageNum: number
  logoImage?: HTMLImageElement | null
  otherPageHeaderBottomGapMm?: number
}

export type ThemeHeaderDrawParams = CorporateHeaderDrawParams & {
  styleId: string
}

function hexToRgb(hex: string): [number, number, number] {
  const s = (hex || '').trim().replace(/^#/, '')
  if (s.length !== 6) return [0.12, 0.23, 0.54]
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

function clearArea(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x, y, w, h)
}

function fillPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  if (w <= 0 || h <= 0) return
  ctx.fillStyle = color
  const r = Math.min(h / 2, w / 2)
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

export function drawStripeBarCanvas(
  ctx: CanvasRenderingContext2D,
  ml: number,
  contentWpx: number,
  stripeY: number,
  scale: number,
  redWpx: number,
  primary: string,
  accent: string,
) {
  const rowH = CORPORATE_STRIPE_ROW_H_PT * scale
  const secGap = CORPORATE_STRIPE_SECTION_GAP_PT * scale
  const dotW = CORPORATE_STRIPE_END_DOT_W_PT * scale
  const dotGap = CORPORATE_STRIPE_END_DOT_GAP_PT * scale
  const dotsTotalW = dotW + dotGap + dotW
  const redW = Math.max(rowH, Math.min(redWpx, contentWpx - dotsTotalW - secGap * 3))
  const midStart = ml + redW + secGap
  const midEnd = ml + contentWpx - dotsTotalW - secGap
  const midW = Math.max(0, midEnd - midStart)
  fillPill(ctx, ml, stripeY, redW, rowH, accent)
  if (midW > 0) fillPill(ctx, midStart, stripeY, midW, rowH, primary)
  let dotX = ml + contentWpx - dotsTotalW
  fillPill(ctx, dotX, stripeY, dotW, rowH, accent)
  dotX += dotW + dotGap
  fillPill(ctx, dotX, stripeY, dotW, rowH, primary)
}

/** Tema 2 — Klasik yazılı / okul sınavı */
function drawStyle2FirstPage(p: ThemeHeaderDrawParams): number {
  const s = p.scale
  const sid = p.styleId
  const ff = (field: HeaderFontFieldKey) => fieldFontPt(field, sid, p.config) * s
  const bodyH = STYLE_2_FIRST_H_PT * s
  const y0 = p.headerTopCanvas
  const contentWpx = p.pageWpx - p.ml - p.mr
  const primary = rgbCss(p.config.primaryColor)
  const accent = rgbCss(p.config.accentColor)

  clearArea(p.ctx, p.ml, y0, contentWpx, bodyH)

  const leftW = contentWpx * 0.14
  const rightW = contentWpx * 0.32
  const midX = p.ml + leftW + 8 * s
  const rightX = p.pageWpx - p.mr - rightW

  const pad = HEADER_LOGO_COL_PAD_PT * s
  const hasLeft = headerLeftColumnActive(
    p.config,
    !!(p.logoImage && p.logoImage.complete && p.logoImage.naturalWidth > 0),
  )
  if (hasLeft) {
    drawHeaderLeftColumnCanvas(
      p.ctx,
      p.config,
      p.logoImage,
      p.ml + pad,
      y0 + pad,
      leftW - pad * 2,
      bodyH - pad * 2,
      s,
    )
  }

  const school = headerFieldDisplayText(p.config, 'schoolName')
  const subject = headerFieldDisplayText(p.config, 'subject')
  const topic = visibleTopicText(p.config)
  const subTopic = visibleSubTopicText(p.config)

  p.ctx.textAlign = 'center'
  p.ctx.textBaseline = 'top'
  if (school) {
    p.ctx.fillStyle = primary
    p.ctx.font = `bold ${ff('schoolName')}px HEADER_FONT_FAMILY_CANVAS`
    p.ctx.fillText(school.slice(0, 36), midX + (rightX - midX) / 2, y0 + 6 * s)
  }
  p.ctx.fillStyle = primary
  p.ctx.font = `800 ${ff('subject')}px HEADER_FONT_FAMILY_CANVAS`
  if (subject) {
    p.ctx.fillText(subject.slice(0, 28), midX + (rightX - midX) / 2, y0 + 18 * s)
  }
  if (topic) {
    p.ctx.fillStyle = CORPORATE_GRAY
    p.ctx.font = `${ff('topic')}px HEADER_FONT_FAMILY_CANVAS`
    p.ctx.fillText(topic.slice(0, 40), midX + (rightX - midX) / 2, y0 + 36 * s)
  }
  if (subTopic) {
    p.ctx.fillStyle = CORPORATE_GRAY
    p.ctx.font = `${ff('subTopic')}px HEADER_FONT_FAMILY_CANVAS`
    const subY = topic ? y0 + 36 * s + ff('topic') + 1 * s : y0 + 36 * s
    p.ctx.fillText(subTopic.slice(0, 40), midX + (rightX - midX) / 2, subY)
  }

  const fields = ['ADI SOYADI', 'SINIF', 'NO']
  let fy = y0 + 8 * s
  p.ctx.textAlign = 'left'
  p.ctx.font = `${6.5 * s}px HEADER_FONT_FAMILY_CANVAS`
  p.ctx.fillStyle = '#374151'
  for (const f of fields) {
    p.ctx.fillText(f, rightX, fy)
    p.ctx.strokeStyle = '#9ca3af'
    p.ctx.lineWidth = 0.5 * s
    p.ctx.beginPath()
    p.ctx.moveTo(rightX + 52 * s, fy + 7 * s)
    p.ctx.lineTo(rightX + rightW - 28 * s, fy + 7 * s)
    p.ctx.stroke()
    fy += 14 * s
  }

  const puanR = 12 * s
  const puanCx = p.pageWpx - p.mr - puanR - 2 * s
  const puanCy = y0 + bodyH / 2
  p.ctx.strokeStyle = primary
  p.ctx.lineWidth = 1 * s
  p.ctx.beginPath()
  p.ctx.arc(puanCx, puanCy, puanR, 0, Math.PI * 2)
  p.ctx.stroke()
  p.ctx.textAlign = 'center'
  p.ctx.fillStyle = accent
  p.ctx.font = `bold ${6 * s}px HEADER_FONT_FAMILY_CANVAS`
  p.ctx.fillText('PUAN', puanCx, puanCy - 8 * s)

  p.ctx.strokeStyle = primary
  p.ctx.lineWidth = 1.2 * s
  p.ctx.beginPath()
  p.ctx.moveTo(p.ml, y0 + bodyH - 1 * s)
  p.ctx.lineTo(p.pageWpx - p.mr, y0 + bodyH - 1 * s)
  p.ctx.stroke()

  return STYLE_2_FIRST_H_PT
}

/** Tema 3 — Dinamik deneme bandı */
function drawStyle3FirstPage(p: ThemeHeaderDrawParams): number {
  const s = p.scale
  const sid = p.styleId
  const ff = (field: HeaderFontFieldKey) => fieldFontPt(field, sid, p.config) * s
  const bodyH = STYLE_3_FIRST_H_PT * s
  const y0 = p.headerTopCanvas
  const contentWpx = p.pageWpx - p.ml - p.mr
  const primary = rgbCss(p.config.primaryColor)
  const accent = rgbCss(p.config.accentColor)
  const testNo = headerFieldDisplayText(p.config, 'testNumber')
  const subject = headerFieldDisplayText(p.config, 'subject')
  const topic = visibleTopicText(p.config)
  const subTopic = visibleSubTopicText(p.config)
  const tags = p.config.tagLabels?.length ? p.config.tagLabels : ['Konu Kavrama', 'Yeni Nesil']

  clearArea(p.ctx, p.ml, y0, contentWpx, bodyH)

  const leftW = 72 * s
  if (testNo) {
    fillPill(p.ctx, p.ml, y0 + 8 * s, leftW, 28 * s, primary)
    p.ctx.fillStyle = '#ffffff'
    p.ctx.font = `bold ${ff('testNumber')}px HEADER_FONT_FAMILY_CANVAS`
    p.ctx.textAlign = 'center'
    p.ctx.textBaseline = 'middle'
    p.ctx.fillText(testNo.slice(0, 16), p.ml + leftW / 2, y0 + 22 * s)
  }

  const midX = p.ml + leftW + 10 * s
  p.ctx.textAlign = 'left'
  p.ctx.textBaseline = 'top'
  if (subject) {
    p.ctx.fillStyle = primary
    p.ctx.font = `800 ${ff('subject')}px HEADER_FONT_FAMILY_CANVAS`
    p.ctx.fillText(subject.slice(0, 24), midX, y0 + 8 * s)
  }
  if (topic) {
    p.ctx.fillStyle = CORPORATE_GRAY
    p.ctx.font = `${ff('topic')}px HEADER_FONT_FAMILY_CANVAS`
    p.ctx.fillText(topic.slice(0, 36), midX, y0 + 26 * s)
  }
  if (subTopic) {
    p.ctx.fillStyle = CORPORATE_GRAY
    p.ctx.font = `${ff('subTopic')}px HEADER_FONT_FAMILY_CANVAS`
    const subY = topic ? y0 + 26 * s + ff('topic') + 1 * s : y0 + 26 * s
    p.ctx.fillText(subTopic.slice(0, 36), midX, subY)
  }

  const tagColors = [accent, '#2563eb', '#059669', '#7c3aed']
  let tx = midX
  const tagY = y0 + (subTopic ? 48 : topic ? 44 : 40) * s
  p.ctx.font = `600 ${5.5 * s}px HEADER_FONT_FAMILY_CANVAS`
  for (let i = 0; i < Math.min(tags.length, 4); i++) {
    const lbl = tags[i]!.slice(0, 18)
    const tw = p.ctx.measureText(lbl).width + 8 * s
    fillPill(p.ctx, tx, tagY, tw, 10 * s, tagColors[i % tagColors.length]!)
    p.ctx.fillStyle = '#ffffff'
    p.ctx.textAlign = 'center'
    p.ctx.textBaseline = 'middle'
    p.ctx.fillText(lbl, tx + tw / 2, tagY + 5 * s)
    tx += tw + 4 * s
    p.ctx.textAlign = 'left'
  }

  const qrW = 58 * s
  const qrH = 46 * s
  const qrX = p.pageWpx - p.mr - qrW
  const qrY = y0 + 6 * s
  p.ctx.setLineDash([3 * s, 2 * s])
  p.ctx.strokeStyle = '#6b7280'
  p.ctx.lineWidth = 0.8 * s
  p.ctx.strokeRect(qrX, qrY, qrW, qrH)
  p.ctx.setLineDash([])
  p.ctx.fillStyle = '#374151'
  p.ctx.font = `600 ${4.5 * s}px HEADER_FONT_FAMILY_CANVAS`
  p.ctx.textAlign = 'center'
  p.ctx.fillText((p.config.qrHint || 'ÇÖZÜMLER İÇİN OKUTUNUZ').slice(0, 28), qrX + qrW / 2, qrY + 4 * s)
  p.ctx.strokeStyle = '#d1d5db'
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if ((r + c) % 2 === 0) {
        p.ctx.fillRect(qrX + 8 * s + c * 8 * s, qrY + 14 * s + r * 6 * s, 5 * s, 5 * s)
      }
    }
  }

  drawStripeBarCanvas(p.ctx, p.ml, contentWpx, y0 + bodyH - CORPORATE_STRIPE_H_PT * s, s, 40 * s, primary, accent)
  return STYLE_3_FIRST_H_PT
}

/** Tema 4 — Kompakt tek satır */
function drawStyle4FirstPage(p: ThemeHeaderDrawParams): number {
  const s = p.scale
  const sid = p.styleId
  const ff = (field: HeaderFontFieldKey) => fieldFontPt(field, sid, p.config) * s
  const bodyH = STYLE_4_FIRST_H_PT * s
  const y0 = p.headerTopCanvas
  const contentWpx = p.pageWpx - p.ml - p.mr
  const primary = rgbCss(p.config.primaryColor)

  clearArea(p.ctx, p.ml, y0, contentWpx, bodyH)
  p.ctx.strokeStyle = primary
  p.ctx.lineWidth = 1 * s
  p.ctx.strokeRect(p.ml, y0 + 1 * s, contentWpx, bodyH - 2 * s)

  const pad = HEADER_LOGO_COL_PAD_PT * s
  const logoColW = 18 * s
  const hasLeft = headerLeftColumnActive(
    p.config,
    !!(p.logoImage && p.logoImage.complete && p.logoImage.naturalWidth > 0),
  )
  if (hasLeft) {
    drawHeaderLeftColumnCanvas(
      p.ctx,
      p.config,
      p.logoImage,
      p.ml + pad,
      y0 + pad,
      logoColW - pad,
      bodyH - pad * 2,
      s,
    )
  }

  const subject = headerFieldDisplayText(p.config, 'subject')
  const topic = visibleTopicText(p.config)
  const subTopic = visibleSubTopicText(p.config)
  const partFields: HeaderFontFieldKey[] = ['examType', 'testNumber']
  const tailParts = partFields
    .map((field) => ({
      field,
      text: headerFieldDisplayText(p.config, field),
    }))
    .filter((entry) => entry.text)

  p.ctx.textAlign = 'left'
  p.ctx.textBaseline = 'middle'
  let x = p.ml + (hasLeft ? logoColW + 4 * s : 4 * s)
  const midY = y0 + bodyH / 2
  let partIndex = 0

  const drawBullet = () => {
    p.ctx.fillStyle = '#9ca3af'
    p.ctx.fillText('•', x, midY)
    x += p.ctx.measureText('•').width + 4 * s
  }

  if (subject) {
    p.ctx.fillStyle = primary
    const txt = subject.slice(0, 24)
    p.ctx.font = `bold ${ff('subject')}px HEADER_FONT_FAMILY_CANVAS`
    p.ctx.fillText(txt, x, midY)
    x += p.ctx.measureText(txt).width + 6 * s
    partIndex++
  }

  if (topic || subTopic) {
    if (partIndex > 0) drawBullet()
    const blockH =
      (topic ? ff('topic') : 0) + (subTopic ? (topic ? 1 * s : 0) + ff('subTopic') : 0)
    let ty = midY - blockH / 2
    let blockW = 0
    p.ctx.textBaseline = 'top'
    if (topic) {
      p.ctx.fillStyle = '#374151'
      const txt = topic.slice(0, 24)
      p.ctx.font = `bold ${ff('topic')}px HEADER_FONT_FAMILY_CANVAS`
      p.ctx.fillText(txt, x, ty)
      blockW = Math.max(blockW, p.ctx.measureText(txt).width)
      ty += ff('topic') + 1 * s
    }
    if (subTopic) {
      p.ctx.fillStyle = CORPORATE_GRAY
      const txt = subTopic.slice(0, 24)
      p.ctx.font = `${ff('subTopic')}px HEADER_FONT_FAMILY_CANVAS`
      p.ctx.fillText(txt, x, topic ? ty : midY - ff('subTopic') / 2)
      blockW = Math.max(blockW, p.ctx.measureText(txt).width)
    }
    x += blockW + 6 * s
    p.ctx.textBaseline = 'middle'
    partIndex++
  }

  for (let i = 0; i < tailParts.length; i++) {
    const { field, text } = tailParts[i]!
    if (partIndex > 0) drawBullet()
    p.ctx.fillStyle = '#374151'
    const txt = text.slice(0, 24)
    p.ctx.font = `bold ${ff(field)}px HEADER_FONT_FAMILY_CANVAS`
    p.ctx.fillText(txt, x, midY)
    x += p.ctx.measureText(txt).width + 6 * s
    partIndex++
  }

  return STYLE_4_FIRST_H_PT
}

/** 1. sayfa — tema yönlendirici */
export function drawThemeFirstPageHeaderCanvas(p: ThemeHeaderDrawParams): number {
  const id = normalizeHeaderStyleId(p.styleId)
  switch (id) {
    case 'style_1':
      return drawCorporateHeaderCanvas({ ...p, styleId: p.styleId })
    case 'style_2':
      return drawStyle2FirstPage(p)
    case 'style_3':
      return drawStyle3FirstPage(p)
    case 'style_4':
      return drawStyle4FirstPage(p)
    default:
      return drawCorporateHeaderCanvas(p)
  }
}

/** 2+ sayfa — kompakt running header */
export function drawThemeRunningHeaderCanvas(p: ThemeRunningHeaderParams): number {
  const styleId = normalizeHeaderStyleId(p.styleId)
  if (styleId === 'style_1') {
    return drawStyle1RunningHeaderCanvas({
      ctx: p.ctx,
      scale: p.scale,
      ml: p.ml,
      mr: p.mr,
      pageWpx: p.pageWpx,
      headerTopCanvas: p.headerTopCanvas,
      contentWpt: p.contentWpt,
      config: p.config,
      logoImage: p.logoImage,
      pageNum: p.pageNum,
      styleId: p.styleId,
      otherPageHeaderBottomGapMm: p.otherPageHeaderBottomGapMm,
    })
  }

  const s = p.scale
  const sid = p.styleId
  const bodyH = THEME_RUNNING_BODY_H_PT * s
  const gapTextStripe = THEME_RUNNING_STRIPE_GAP_PT * s
  const stripeH = THEME_RUNNING_STRIPE_H_PT * s
  const gapBelow = otherPageHeaderBottomGapPtFromMm(p.otherPageHeaderBottomGapMm) * s
  const y0 = p.headerTopCanvas
  const bodyY0 = y0 + stripeH + gapTextStripe
  const totalH = stripeH + gapTextStripe + bodyH + gapTextStripe + stripeH + gapBelow
  const contentWpx = p.pageWpx - p.ml - p.mr
  const primary = rgbCss(p.config.primaryColor)
  const accent = rgbCss(p.config.accentColor)
  const topicText = otherPageHeaderLeftText(p.config)
  const brandText = otherPageHeaderRightText(p.config)

  clearArea(p.ctx, p.ml, y0, contentWpx, totalH)

  const stripeAccentW =
    styleId === 'style_2'
      ? contentWpx * 0.25 + 4 * s
      : styleId === 'style_4'
        ? contentWpx * 0.25
        : contentWpx * 0.25 + 6 * s

  drawStripeBarCanvas(p.ctx, p.ml, contentWpx, y0, s, stripeAccentW, primary, accent)

  p.ctx.textBaseline = 'middle'
  const textMidY = bodyY0 + bodyH / 2
  const textStartX = p.ml + 4 * s
  let leftEndX = textStartX

  const labelPt = runningHeaderSideFontPt(sid, p.config) * s

  if (topicText) {
    p.ctx.textAlign = 'left'
    p.ctx.fillStyle = primary
    p.ctx.font = `bold ${labelPt}px HEADER_FONT_FAMILY_CANVAS`
    p.ctx.fillText(topicText.slice(0, 40), textStartX, textMidY)
    leftEndX = textStartX + p.ctx.measureText(topicText.slice(0, 40)).width
  }

  if (brandText) {
    p.ctx.textAlign = 'right'
    p.ctx.fillStyle = accent
    p.ctx.font = `600 ${labelPt}px HEADER_FONT_FAMILY_CANVAS`
    p.ctx.fillText(brandText.slice(0, 40), p.pageWpx - p.mr, textMidY)
    p.ctx.textAlign = 'left'
  }

  const bottomStripeAccentW =
    styleId === 'style_2'
      ? leftEndX - p.ml + 4 * s
      : styleId === 'style_4'
        ? contentWpx * 0.25
        : leftEndX - p.ml + 6 * s
  drawStripeBarCanvas(
    p.ctx,
    p.ml,
    contentWpx,
    bodyY0 + bodyH + gapTextStripe,
    s,
    bottomStripeAccentW,
    primary,
    accent,
  )

  return corporateOtherPageHeaderLayoutPt(p.styleId, p.otherPageHeaderBottomGapMm)
}

export { themeFirstPageHeaderTotalPt, themeRunningHeaderTotalPt }
