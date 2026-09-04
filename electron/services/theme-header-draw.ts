/**
 * 4 kurumsal başlık teması — PDF vektör çizimi.
 */

import { rgb, type PDFDocument, type PDFPage, type PDFFont, type RGB } from 'pdf-lib'
import {
  CORPORATE_GRAY,
  CORPORATE_STRIPE_END_DOT_GAP_PT,
  CORPORATE_STRIPE_END_DOT_W_PT,
  CORPORATE_STRIPE_H_PT,
  CORPORATE_STRIPE_ROW_H_PT,
  CORPORATE_STRIPE_SECTION_GAP_PT,
  parseHeaderConfig,
  type HeaderConfig,
} from './corporate-header-layout.js'
import {
  normalizeHeaderStyleId,
  STYLE_2_FIRST_H_PT,
  STYLE_3_FIRST_H_PT,
  STYLE_4_FIRST_H_PT,
  THEME_RUNNING_BODY_H_PT,
  THEME_RUNNING_FONT_PAGE_PT,
  THEME_RUNNING_FONT_SUBJECT_PT,
  THEME_RUNNING_FONT_TOPIC_PT,
  THEME_RUNNING_LOGO_W_PT,
  THEME_RUNNING_STRIPE_GAP_PT,
  THEME_RUNNING_STRIPE_H_PT,
  THEME_RUNNING_GAP_BELOW_PT,
  corporateOtherPageHeaderLayoutPt,
} from './header-styles.js'
import { drawCorporateHeader, drawStyle1RunningHeaderPdf } from './corporate-header-draw.js'
import { HEADER_LOGO_COL_PAD_PT } from './header-logo.js'
import { drawHeaderLeftColumnPdf } from './header-left-column.js'
import { fieldFontPt, runningHeaderSideFontPt, type HeaderFontFieldKey } from './header-field-fonts.js'
import { headerFieldDisplayText, otherPageHeaderLeftText, otherPageHeaderRightText, visibleSubTopicText, visibleTopicText } from './header-field-visibility.js'

function hexToRgb(hex: string): RGB {
  const s = (hex || '').trim().replace(/^#/, '')
  if (s.length !== 6) return rgb(0.12, 0.23, 0.54)
  return rgb(
    parseInt(s.slice(0, 2), 16) / 255,
    parseInt(s.slice(2, 4), 16) / 255,
    parseInt(s.slice(4, 6), 16) / 255,
  )
}

function pillPath(w: number, h: number): string {
  const r = Math.min(w / 2, h / 2)
  return `M ${r},0 L ${w - r},0 Q ${w},0 ${w},${r} L ${w},${h - r} Q ${w},${h} ${w - r},${h} L ${r},${h} Q 0,${h} 0,${h - r} L 0,${r} Q 0,0 ${r},0 Z`
}

function fillPill(page: PDFPage, x: number, yBottom: number, w: number, h: number, color: RGB) {
  if (w <= 0 || h <= 0) return
  page.drawSvgPath(pillPath(w, h), { x, y: yBottom + h, color })
}

export function drawStripeBarPdf(
  page: PDFPage,
  geom: { ml: number },
  stripeBottom: number,
  contentW: number,
  redW: number,
  primary: RGB,
  accent: RGB,
) {
  const rowH = CORPORATE_STRIPE_ROW_H_PT
  const secGap = CORPORATE_STRIPE_SECTION_GAP_PT
  const dotW = CORPORATE_STRIPE_END_DOT_W_PT
  const dotGap = CORPORATE_STRIPE_END_DOT_GAP_PT
  const dotsTotalW = dotW + dotGap + dotW
  const redWidth = Math.max(rowH, Math.min(redW, contentW - dotsTotalW - secGap * 3))
  const midStart = geom.ml + redWidth + secGap
  const midEnd = geom.ml + contentW - dotsTotalW - secGap
  const midW = Math.max(0, midEnd - midStart)
  fillPill(page, geom.ml, stripeBottom, redWidth, rowH, accent)
  if (midW > 0) fillPill(page, midStart, stripeBottom, midW, rowH, primary)
  let dotX = geom.ml + contentW - dotsTotalW
  fillPill(page, dotX, stripeBottom, dotW, rowH, accent)
  dotX += dotW + dotGap
  fillPill(page, dotX, stripeBottom, dotW, rowH, primary)
}

async function drawStyle2FirstPagePdf(
  pdf: PDFDocument,
  page: PDFPage,
  config: HeaderConfig,
  geom: { page_w_pt: number; page_h_pt: number; ml: number; mr: number },
  mt: number,
  fonts: { regular: PDFFont; bold: PDFFont },
  styleId = 'style_2',
) {
  const ff = (field: HeaderFontFieldKey) => fieldFontPt(field, styleId, config)
  const primary = hexToRgb(config.primaryColor)
  const accent = hexToRgb(config.accentColor)
  const contentW = geom.page_w_pt - geom.ml - geom.mr
  const bodyTop = geom.page_h_pt - mt
  const bodyBottom = bodyTop - STYLE_2_FIRST_H_PT
  const leftW = contentW * 0.14
  const rightW = contentW * 0.32
  const midCx = geom.ml + leftW + (contentW - leftW - rightW) / 2
  const rightX = geom.page_w_pt - geom.mr - rightW

  const pad = HEADER_LOGO_COL_PAD_PT
  const logoBoxX = geom.ml + pad
  const logoBoxY = bodyBottom + pad
  const logoBoxW = leftW - pad * 2
  const logoBoxH = STYLE_2_FIRST_H_PT - pad * 2
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

  const school = headerFieldDisplayText(config, 'schoolName')
  const subject = headerFieldDisplayText(config, 'subject')
  const topic = visibleTopicText(config)
  const subTopic = visibleSubTopicText(config)

  if (school) {
    const schoolSize = ff('schoolName')
    const tw = fonts.bold.widthOfTextAtSize(school.slice(0, 36), schoolSize)
    page.drawText(school.slice(0, 36), { x: midCx - tw / 2, y: bodyTop - 12, size: schoolSize, font: fonts.bold, color: primary })
  }
  if (subject) {
    const subj = subject.slice(0, 28)
    const subjSize = ff('subject')
    const subjW = fonts.bold.widthOfTextAtSize(subj, subjSize)
    page.drawText(subj, { x: midCx - subjW / 2, y: bodyTop - 28, size: subjSize, font: fonts.bold, color: primary })
  }
  if (topic) {
    const topicSize = ff('topic')
    const topW = fonts.regular.widthOfTextAtSize(topic.slice(0, 40), topicSize)
    page.drawText(topic.slice(0, 40), { x: midCx - topW / 2, y: bodyTop - 40, size: topicSize, font: fonts.regular, color: rgb(0.42, 0.45, 0.5) })
  }
  if (subTopic) {
    const subSize = ff('subTopic')
    const subW = fonts.regular.widthOfTextAtSize(subTopic.slice(0, 40), subSize)
    const subY = topic ? bodyTop - 40 - ff('topic') - 1 : bodyTop - 40
    page.drawText(subTopic.slice(0, 40), { x: midCx - subW / 2, y: subY, size: subSize, font: fonts.regular, color: rgb(0.42, 0.45, 0.5) })
  }

  const fields = ['ADI SOYADI', 'SINIF', 'NO']
  const fieldSize = 6.5
  let fy = bodyTop - 14
  for (const f of fields) {
    page.drawText(f, { x: rightX, y: fy, size: fieldSize, font: fonts.regular, color: rgb(0.22, 0.25, 0.32) })
    page.drawLine({
      start: { x: rightX + 52, y: fy - 2 },
      end: { x: rightX + rightW - 28, y: fy - 2 },
      thickness: 0.5,
      color: rgb(0.61, 0.64, 0.69),
    })
    fy -= 14
  }

  const puanCx = geom.page_w_pt - geom.mr - 14
  const puanCy = bodyBottom + STYLE_2_FIRST_H_PT / 2
  page.drawCircle({ x: puanCx, y: puanCy, size: 12, borderColor: primary, borderWidth: 1 })
  const puanSize = 6
  const puanW = fonts.bold.widthOfTextAtSize('PUAN', puanSize)
  page.drawText('PUAN', { x: puanCx - puanW / 2, y: puanCy + 6, size: puanSize, font: fonts.bold, color: accent })

  page.drawLine({
    start: { x: geom.ml, y: bodyBottom },
    end: { x: geom.page_w_pt - geom.mr, y: bodyBottom },
    thickness: 1,
    color: primary,
  })
}

function drawStyle3FirstPagePdf(
  page: PDFPage,
  config: HeaderConfig,
  geom: { page_w_pt: number; page_h_pt: number; ml: number; mr: number },
  mt: number,
  fonts: { regular: PDFFont; bold: PDFFont },
  styleId = 'style_3',
) {
  const ff = (field: HeaderFontFieldKey) => fieldFontPt(field, styleId, config)
  const primary = hexToRgb(config.primaryColor)
  const accent = hexToRgb(config.accentColor)
  const contentW = geom.page_w_pt - geom.ml - geom.mr
  const bodyTop = geom.page_h_pt - mt
  const bodyBottom = bodyTop - STYLE_3_FIRST_H_PT
  const testNo = headerFieldDisplayText(config, 'testNumber')
  const subject = headerFieldDisplayText(config, 'subject')
  const topic = visibleTopicText(config)
  const subTopic = visibleSubTopicText(config)
  const tags = config.tagLabels?.length ? config.tagLabels : ['Konu Kavrama', 'Yeni Nesil']

  if (testNo) {
    fillPill(page, geom.ml, bodyTop - 36, 72, 28, primary)
    const testNoSize = ff('testNumber')
    const tnW = fonts.bold.widthOfTextAtSize(testNo.slice(0, 16), testNoSize)
    page.drawText(testNo.slice(0, 16), {
      x: geom.ml + 36 - tnW / 2,
      y: bodyTop - 24,
      size: testNoSize,
      font: fonts.bold,
      color: rgb(1, 1, 1),
    })
  }

  const midX = geom.ml + 82
  if (subject) {
    const subjectSize = ff('subject')
    page.drawText(subject.slice(0, 24), { x: midX, y: bodyTop - 18, size: subjectSize, font: fonts.bold, color: primary })
  }
  if (topic) {
    const topicSize = ff('topic')
    page.drawText(topic.slice(0, 36), { x: midX, y: bodyTop - 34, size: topicSize, font: fonts.regular, color: rgb(0.42, 0.45, 0.5) })
  }
  if (subTopic) {
    const subSize = ff('subTopic')
    const subY = topic ? bodyTop - 34 - ff('topic') - 1 : bodyTop - 34
    page.drawText(subTopic.slice(0, 36), { x: midX, y: subY, size: subSize, font: fonts.regular, color: rgb(0.42, 0.45, 0.5) })
  }

  const tagColors = [accent, rgb(0.15, 0.39, 0.92), rgb(0.02, 0.59, 0.41), rgb(0.49, 0.23, 0.93)]
  let tx = midX
  const tagSize = 5.5
  const tagTop = subTopic ? bodyTop - 58 : topic ? bodyTop - 54 : bodyTop - 50
  for (let i = 0; i < Math.min(tags.length, 4); i++) {
    const lbl = tags[i]!.slice(0, 18)
    const tw = fonts.bold.widthOfTextAtSize(lbl, tagSize) + 8
    fillPill(page, tx, tagTop, tw, 10, tagColors[i % tagColors.length]!)
    page.drawText(lbl, { x: tx + 4, y: tagTop - 4, size: tagSize, font: fonts.bold, color: rgb(1, 1, 1) })
    tx += tw + 4
  }

  const qrW = 58
  const qrH = 46
  const qrX = geom.page_w_pt - geom.mr - qrW
  const qrY = bodyTop - 52
  page.drawRectangle({
    x: qrX,
    y: qrY,
    width: qrW,
    height: qrH,
    borderColor: rgb(0.42, 0.45, 0.5),
    borderWidth: 0.8,
    borderDashArray: [3, 2],
  })
  const hint = (config.qrHint || 'ÇÖZÜMLER İÇİN OKUTUNUZ').slice(0, 28)
  const hintSize = 4.5
  const hintW = fonts.bold.widthOfTextAtSize(hint, hintSize)
  page.drawText(hint, { x: qrX + (qrW - hintW) / 2, y: qrY + qrH - 8, size: hintSize, font: fonts.bold, color: rgb(0.22, 0.25, 0.32) })

  drawStripeBarPdf(page, geom, bodyBottom, contentW, 40, primary, accent)
}

async function drawStyle4FirstPagePdf(
  pdf: PDFDocument,
  page: PDFPage,
  config: HeaderConfig,
  geom: { page_w_pt: number; page_h_pt: number; ml: number; mr: number },
  mt: number,
  fonts: { regular: PDFFont; bold: PDFFont },
  styleId = 'style_4',
) {
  const ff = (field: HeaderFontFieldKey) => fieldFontPt(field, styleId, config)
  const primary = hexToRgb(config.primaryColor)
  const contentW = geom.page_w_pt - geom.ml - geom.mr
  const bodyTop = geom.page_h_pt - mt
  const bodyBottom = bodyTop - STYLE_4_FIRST_H_PT

  page.drawRectangle({
    x: geom.ml,
    y: bodyBottom + 1,
    width: contentW,
    height: STYLE_4_FIRST_H_PT - 2,
    borderColor: primary,
    borderWidth: 1,
  })

  const pad = HEADER_LOGO_COL_PAD_PT
  const logoColW = 18
  const logoBoxY = bodyBottom + pad
  const logoBoxH = STYLE_4_FIRST_H_PT - pad * 2
  const drewLeft = await drawHeaderLeftColumnPdf(
    pdf,
    page,
    config,
    geom.ml + pad,
    logoBoxY,
    logoColW - pad,
    logoBoxH,
    fonts.bold,
  )

  const subject = headerFieldDisplayText(config, 'subject')
  const topic = visibleTopicText(config)
  const subTopic = visibleSubTopicText(config)
  const tailFields: HeaderFontFieldKey[] = ['examType', 'testNumber']
  const tailParts = tailFields
    .map((field) => ({
      field,
      text: headerFieldDisplayText(config, field),
    }))
    .filter((entry) => entry.text)

  let x = geom.ml + (drewLeft ? 22 : 4)
  const midY = bodyBottom + STYLE_4_FIRST_H_PT / 2 - 2
  let partIndex = 0

  const drawBullet = () => {
    page.drawText('•', { x, y: midY, size: 7, font: fonts.regular, color: rgb(0.61, 0.64, 0.69) })
    x += 8
  }

  if (subject) {
    const txt = subject.slice(0, 24)
    const partSize = ff('subject')
    page.drawText(txt, { x, y: midY, size: partSize, font: fonts.bold, color: primary })
    x += fonts.bold.widthOfTextAtSize(txt, partSize) + 6
    partIndex++
  }

  if (topic || subTopic) {
    if (partIndex > 0) drawBullet()
    const blockH =
      (topic ? ff('topic') : 0) + (subTopic ? (topic ? 1 : 0) + ff('subTopic') : 0)
    let blockW = 0
    if (topic) {
      const txt = topic.slice(0, 24)
      const partSize = ff('topic')
      const topY = midY + blockH / 2 - (subTopic ? ff('subTopic') + 1 : 0)
      page.drawText(txt, { x, y: topY, size: partSize, font: fonts.bold, color: rgb(0.22, 0.25, 0.32) })
      blockW = Math.max(blockW, fonts.bold.widthOfTextAtSize(txt, partSize))
    }
    if (subTopic) {
      const txt = subTopic.slice(0, 24)
      const partSize = ff('subTopic')
      const subY = topic ? midY - blockH / 2 + ff('subTopic') * 0.2 : midY
      page.drawText(txt, { x, y: subY, size: partSize, font: fonts.regular, color: rgb(0.42, 0.45, 0.5) })
      blockW = Math.max(blockW, fonts.regular.widthOfTextAtSize(txt, partSize))
    }
    x += blockW + 6
    partIndex++
  }

  for (let i = 0; i < tailParts.length; i++) {
    const { field, text } = tailParts[i]!
    if (partIndex > 0) drawBullet()
    const txt = text.slice(0, 24)
    const partSize = ff(field)
    page.drawText(txt, { x, y: midY, size: partSize, font: fonts.bold, color: rgb(0.22, 0.25, 0.32) })
    x += fonts.bold.widthOfTextAtSize(txt, partSize) + 6
    partIndex++
  }
}

async function drawThemeRunningHeaderPdf(
  pdf: PDFDocument,
  page: PDFPage,
  config: HeaderConfig,
  styleId: string,
  pageNum: number,
  geom: { page_w_pt: number; page_h_pt: number; ml: number; mr: number },
  mt: number,
  fonts: { regular: PDFFont; bold: PDFFont },
  otherPageGapMm = 1.0,
) {
  const id = normalizeHeaderStyleId(styleId)
  if (id === 'style_1') {
    await drawStyle1RunningHeaderPdf(pdf, page, config, pageNum, geom, mt, fonts, id, otherPageGapMm)
    return
  }

  const primary = hexToRgb(config.primaryColor)
  const accent = hexToRgb(config.accentColor)
  const contentW = geom.page_w_pt - geom.ml - geom.mr
  const headerTop = geom.page_h_pt - mt
  const totalPt = corporateOtherPageHeaderLayoutPt(id, otherPageGapMm)
  const blockBottom = headerTop - totalPt
  const topStripeBottom = headerTop - THEME_RUNNING_STRIPE_H_PT
  const bodyTop = topStripeBottom - THEME_RUNNING_STRIPE_GAP_PT
  const bodyBottom = bodyTop - THEME_RUNNING_BODY_H_PT
  const bottomStripeBottom =
    bodyBottom - THEME_RUNNING_STRIPE_GAP_PT - THEME_RUNNING_STRIPE_H_PT
  const topicText = otherPageHeaderLeftText(config)
  const brandText = otherPageHeaderRightText(config)

  page.drawRectangle({
    x: geom.ml,
    y: blockBottom,
    width: contentW,
    height: headerTop - blockBottom,
    color: rgb(1, 1, 1),
  })

  const topStripeAccentW = id === 'style_4' ? contentW * 0.25 : contentW * 0.25 + 4
  drawStripeBarPdf(page, geom, topStripeBottom, contentW, topStripeAccentW, primary, accent)

  const midY = bodyBottom + THEME_RUNNING_BODY_H_PT / 2

  const textX = geom.ml + 4
  let leftEndX = textX

  const labelSize = runningHeaderSideFontPt(id, config)

  if (topicText) {
    page.drawText(topicText.slice(0, 40), {
      x: textX,
      y: midY,
      size: labelSize,
      font: fonts.bold,
      color: primary,
    })
    leftEndX = textX + fonts.bold.widthOfTextAtSize(topicText.slice(0, 40), labelSize)
  }

  if (brandText) {
    const brandStr = brandText.slice(0, 40)
    const brandW = fonts.bold.widthOfTextAtSize(brandStr, labelSize)
    page.drawText(brandStr, {
      x: geom.page_w_pt - geom.mr - brandW,
      y: midY,
      size: labelSize,
      font: fonts.bold,
      color: accent,
    })
  }

  const bottomStripeAccentW =
    id === 'style_2' ? leftEndX - geom.ml + 4 : id === 'style_4' ? contentW * 0.25 : leftEndX - geom.ml + 6
  drawStripeBarPdf(page, geom, bottomStripeBottom, contentW, bottomStripeAccentW, primary, accent)
}

export async function drawThemeFirstPageHeaderPdf(
  pdf: PDFDocument,
  page: PDFPage,
  payload: Record<string, unknown>,
  geom: { page_w_pt: number; page_h_pt: number; ml: number; mr: number },
  mt: number,
  fonts: { regular: PDFFont; bold: PDFFont },
) {
  const styleId = normalizeHeaderStyleId(String(payload.header_style_id ?? ''))
  const config = parseHeaderConfig(payload.header_config)

  switch (styleId) {
    case 'style_1':
      return drawCorporateHeader(pdf, page, payload, geom, mt, fonts)
    case 'style_2':
      return drawStyle2FirstPagePdf(pdf, page, config, geom, mt, fonts, styleId)
    case 'style_3':
      return drawStyle3FirstPagePdf(page, config, geom, mt, fonts, styleId)
    case 'style_4':
      return drawStyle4FirstPagePdf(pdf, page, config, geom, mt, fonts, styleId)
    default:
      return drawCorporateHeader(pdf, page, payload, geom, mt, fonts)
  }
}

export async function drawThemeRunningHeaderPdfFromPayload(
  pdf: PDFDocument,
  page: PDFPage,
  payload: Record<string, unknown>,
  pageNum: number,
  geom: { page_w_pt: number; page_h_pt: number; ml: number; mr: number },
  mt: number,
  fonts: { regular: PDFFont; bold: PDFFont },
) {
  const styleId = normalizeHeaderStyleId(String(payload.header_style_id ?? ''))
  const config = parseHeaderConfig(payload.header_config)
  const otherPageGapMm = Number(payload.other_page_header_bottom_gap_mm ?? 1.0)
  await drawThemeRunningHeaderPdf(pdf, page, config, styleId, pageNum, geom, mt, fonts, otherPageGapMm)
}

export function themeRunningHeaderBlockPt(): number {
  return (
    THEME_RUNNING_BODY_H_PT +
    THEME_RUNNING_STRIPE_GAP_PT +
    THEME_RUNNING_STRIPE_H_PT +
    THEME_RUNNING_GAP_BELOW_PT
  )
}
