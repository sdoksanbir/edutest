/** CanvasPdfPreview header çizimi ile uyumlu PDF başlık yardımcıları (vektör, clip + stroke sırası) */

import {
  concatTransformationMatrix,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from 'pdf-lib'
import { mmToPt } from './layout-engine.js'
import {
  BANNER_GAP_PT,
  BANNER_H_PT,
  CLASSIC_BANNER_LINE_PT,
  CLASSIC_INFO_BAR_BADGE_INSET_PT,
  drawDescriptionBox,
  headerHeightPt,
} from './pdf-description-utils.js'
import {
  isCorporateHeader,
  parseHeaderConfig,
} from './corporate-header-layout.js'
import {
  drawThemeFirstPageHeaderPdf,
  drawThemeRunningHeaderPdfFromPayload,
} from './theme-header-draw.js'
import {
  classicBannerSubjectText,
  otherPageHeaderLeftText,
  otherPageHeaderRightText,
  visibleSubTopicText,
  visibleTopicText,
} from './header-field-visibility.js'
import {
  drawStyle1ScoreBoxPdf,
  drawStyle1TestNoPdf,
  resolveBannerRightMode,
  resolveClassicInfoBarHeightPt,
  resolveScoreBoxHeightPt,
  resolveScoreBoxWidthPt,
} from './banner-right-mode.js'
import {
  drawExamTypeBoxBorderPdf,
  drawExamTypeBoxFillPdf,
  drawExamTypeTextInBoxPdf,
  examTypeLineSpecs,
  resolveExamTypeBoxHeightPt,
  resolveExamTypeBoxWidthPt,
} from './exam-type-box.js'
import { getHeaderFieldFontPt, headerFieldColor } from './header-field-fonts.js'
import {
  resolveSubjectPillTextColor,
  resolveSubjectPillTextOffsetYPt,
} from './modern-corporate-header-shared.js'
import {
  isClassicTestBannerHeader,
  otherPageColumnDividerStartFromTopPt,
  themeFirstPageHeaderTotalPt,
} from './header-styles.js'
import { mergeHeaderBadgeConfig } from './header-badge-by-style.js'
import { drawHeaderLogoPdfInBox, parseLogoBytes } from './header-logo.js'
import {
  columnDividerColor,
  columnDividerEnabled,
  columnDividerText,
  columnDividerTextEnabled,
  columnDividerWidthPt,
  pageFrameColor,
  pageFrameEnabled,
  pageFrameInnerGapMm,
  pageFrameLineStyle,
  pageFrameWidthPt,
} from './visual-properties.js'
import type { PDFDocument } from 'pdf-lib'

export { headerHeightPt } from './pdf-description-utils.js'

export function hexToRgbColor(hex: string): RGB {
  const s = (hex || '').trim().replace(/^#/, '')
  if (s.length !== 6) return rgb(0.68, 0.8, 0.98)
  return rgb(
    parseInt(s.slice(0, 2), 16) / 255,
    parseInt(s.slice(2, 4), 16) / 255,
    parseInt(s.slice(4, 6), 16) / 255,
  )
}

/** Canvas: beyaz dolgu + çerçeve. yBottom = PDF alt kenar. */
function drawDottedSidePanel(
  page: PDFPage,
  x: number,
  yBottom: number,
  w: number,
  h: number,
  _r: number,
  theme: RGB,
  _side: 'left' | 'right',
) {
  page.drawRectangle({
    x,
    y: yBottom,
    width: w,
    height: h,
    color: rgb(1, 1, 1),
    borderColor: theme,
    borderWidth: CLASSIC_BANNER_LINE_PT,
  })
}

function drawDottedFullBanner(page: PDFPage, x: number, yBottom: number, w: number, h: number, _r: number, theme: RGB) {
  page.drawRectangle({
    x,
    y: yBottom,
    width: w,
    height: h,
    color: rgb(1, 1, 1),
    borderColor: theme,
    borderWidth: CLASSIC_BANNER_LINE_PT,
  })
}

export function corporateFirstPageHeaderTotalPt(
  payload: Record<string, unknown>,
  _contentWidthPt: number,
): number {
  const styleId = String(payload.header_style_id ?? '')
  const config = parseHeaderConfig(payload.header_config)
  const pageWpt = Number(payload.page_w_pt ?? 595)
  const ml = Number(payload.margin_left_mm ?? 10)
  const mr = Number(payload.margin_right_mm ?? 10)
  return themeFirstPageHeaderTotalPt(styleId, config, pageWpt, ml, mr)
}

async function drawPage1Style3Banner(
  pdf: PDFDocument,
  page: PDFPage,
  payload: Record<string, unknown>,
  geom: { page_w_pt: number; page_h_pt: number; ml: number; mr: number },
  mt: number,
  theme: RGB,
  fonts: { bold: PDFFont; regular: PDFFont },
) {
  const contentW = geom.page_w_pt - geom.ml - geom.mr
  const boxY = geom.page_h_pt - mt - BANNER_H_PT
  const gap = BANNER_GAP_PT
  const leftW = contentW * 0.35
  const midW = contentW * 0.3
  const rightW = contentW - leftW - midW - 2 * gap
  const xLeft = geom.ml
  const xMid = geom.ml + leftW + gap
  const xRight = geom.ml + leftW + midW + 2 * gap
  const r = 6

  drawDottedSidePanel(page, xLeft, boxY, leftW, BANNER_H_PT, r, theme, 'left')

  const config = parseHeaderConfig(payload.header_config)
  const midFill = config.subjectPillFillColor?.trim()
    ? hexToRgbColor(config.subjectPillFillColor.trim())
    : theme
  page.drawRectangle({
    x: xMid,
    y: boxY,
    width: midW,
    height: BANNER_H_PT,
    color: midFill,
    borderColor: midFill,
    borderWidth: 1,
  })

  drawDottedSidePanel(page, xRight, boxY, rightW, BANNER_H_PT, r, theme, 'right')

  const styleId = String(payload.header_style_id ?? '')
  const title = classicBannerSubjectText(config).slice(0, 40)
  if (title) {
    const titleSize = getHeaderFieldFontPt('subject', styleId, config)
    const titleW = fonts.bold.widthOfTextAtSize(title, titleSize)
    const titleOff = resolveSubjectPillTextOffsetYPt(config)
    page.drawText(title, {
      x: xMid + (midW - titleW) / 2,
      y: boxY + (BANNER_H_PT - titleSize) / 2 - titleOff,
      size: titleSize,
      font: fonts.bold,
      color: hexToRgbColor(resolveSubjectPillTextColor(config)),
    })
  }

  const infoTop = boxY - BANNER_GAP_PT
  const badgeConfigEarly = mergeHeaderBadgeConfig(config, styleId)
  const infoH = resolveClassicInfoBarHeightPt(badgeConfigEarly)
  page.drawRectangle({
    x: geom.ml,
    y: infoTop - infoH,
    width: contentW,
    height: infoH,
    color: rgb(1, 1, 1),
    borderColor: theme,
    borderWidth: CLASSIC_BANNER_LINE_PT,
  })

  const topicTxt = visibleTopicText(config)
  const subTopicTxt = visibleSubTopicText(config)
  const topicSize = getHeaderFieldFontPt('topic', styleId, config)
  const subSize = getHeaderFieldFontPt('subTopic', styleId, config)
  const padX = 8
  const infoBottom = infoTop - infoH
  const midInfo = infoBottom + infoH / 2
  if (topicTxt) {
    page.drawText(topicTxt.slice(0, 48), {
      x: geom.ml + padX,
      y: subTopicTxt ? midInfo + 4 : midInfo - 3,
      size: topicSize,
      font: fonts.bold,
      color: hexToRgbColor(
        headerFieldColor(config, 'topic', String(payload.theme_color ?? '#0A1931')),
      ),
    })
  }
  if (subTopicTxt) {
    page.drawText(subTopicTxt.slice(0, 48), {
      x: geom.ml + padX,
      y: midInfo - 8,
      size: subSize,
      font: fonts.regular,
      color: hexToRgbColor(
        headerFieldColor(config, 'subTopic', String(payload.theme_color ?? '#0A1931')),
      ),
    })
  }
  const rightEdge = geom.page_w_pt - geom.mr - CLASSIC_INFO_BAR_BADGE_INSET_PT
  const badgeConfig = badgeConfigEarly
  const rightMode = resolveBannerRightMode(badgeConfig)
  if (rightMode === 'examType' && examTypeLineSpecs(badgeConfig).length > 0) {
    const boxH = resolveExamTypeBoxHeightPt(badgeConfig)
    const boxW = resolveExamTypeBoxWidthPt(badgeConfig, contentW * 0.45)
    const boxX = rightEdge - boxW
    const boxY = infoBottom + (infoH - boxH) / 2
    drawExamTypeBoxFillPdf(page, boxX, boxY, boxW, boxH, badgeConfig)
    drawExamTypeBoxBorderPdf(page, boxX, boxY, boxW, boxH, badgeConfig)
    drawExamTypeTextInBoxPdf(page, fonts.bold, boxX, boxY, boxW, boxH, badgeConfig)
  } else if (rightMode === 'score') {
    const boxW = resolveScoreBoxWidthPt(badgeConfig)
    const boxH = resolveScoreBoxHeightPt(badgeConfig)
    const boxX = rightEdge - boxW
    const boxY = infoBottom + (infoH - boxH) / 2
    drawStyle1ScoreBoxPdf(page, fonts.bold, boxX, boxY, boxW, boxH, badgeConfig)
  } else if (rightMode === 'testNo') {
    drawStyle1TestNoPdf(page, fonts.bold, rightEdge, infoBottom, infoH, badgeConfig)
  }

  const logoPad = CLASSIC_INFO_BAR_BADGE_INSET_PT
  const logoBoxH = Math.max(1, infoH - logoPad * 2)
  const logoBoxW = Math.max(logoBoxH * 2.2, 48)
  const logoBoxX = geom.ml + (contentW - logoBoxW) / 2
  const logoBoxY = infoBottom + logoPad
  if ((config.showHeaderLeft ?? true) && parseLogoBytes(config.logoUrl)) {
    await drawHeaderLogoPdfInBox(
      pdf,
      page,
      config.logoUrl,
      config.logoSizePct,
      logoBoxX,
      logoBoxY,
      logoBoxW,
      logoBoxH,
    )
  }

  if (payload.include_description && !isCorporateHeader(String(payload.header_style_id ?? ''))) {
    drawDescriptionBox(page, payload, geom, infoBottom, theme, fonts)
  }
}

function drawOtherPageBanner(
  page: PDFPage,
  payload: Record<string, unknown>,
  geom: { page_w_pt: number; page_h_pt: number; ml: number; mr: number },
  mt: number,
  theme: RGB,
  fonts: { regular: PDFFont; bold: PDFFont },
) {
  const contentW = geom.page_w_pt - geom.ml - geom.mr
  const boxY = geom.page_h_pt - mt - BANNER_H_PT
  const x0 = geom.ml
  const r = Math.min(5, contentW / 2 - 1, BANNER_H_PT / 2 - 1)

  drawDottedFullBanner(page, x0, boxY, contentW, BANNER_H_PT, r, theme)

  const padX = 8
  const padW = 4
  const padV = 3
  const halfW = Math.max(30, contentW / 2 - 10)

  const config = parseHeaderConfig(payload.header_config)
  const styleId = String(payload.header_style_id ?? '')
  const topicPt = getHeaderFieldFontPt('topic', styleId, config, 'running')
  const brandPt = getHeaderFieldFontPt('brandName', styleId, config, 'running')

  let titleStr = otherPageHeaderLeftText(config).slice(0, 80)
  while (titleStr.length > 1 && fonts.bold.widthOfTextAtSize(titleStr, topicPt) > halfW - padX) {
    titleStr = titleStr.slice(0, -1)
  }

  let schoolStr = otherPageHeaderRightText(config).slice(0, 80)
  while (schoolStr.length > 0 && fonts.regular.widthOfTextAtSize(schoolStr, brandPt) > halfW - padX) {
    schoolStr = schoolStr.slice(0, -1)
  }

  const twT = titleStr ? fonts.bold.widthOfTextAtSize(titleStr, topicPt) : 0
  const twS = schoolStr ? fonts.regular.widthOfTextAtSize(schoolStr, brandPt) : 0
  const midY = boxY + BANNER_H_PT / 2
  const bandH = Math.max(topicPt, brandPt) + 2 * padV
  const yWhiteBottom = midY - bandH / 2
  const topicColor = hexToRgbColor(headerFieldColor(config, 'topic', '#262626'))
  const brandColor = hexToRgbColor(headerFieldColor(config, 'brandName', '#262626'))

  if (titleStr) {
    page.drawRectangle({ x: x0 + padX - padW, y: yWhiteBottom, width: twT + 2 * padW, height: bandH, color: rgb(1, 1, 1) })
    page.drawText(titleStr, {
      x: x0 + padX,
      y: midY - topicPt / 3,
      size: topicPt,
      font: fonts.bold,
      color: topicColor,
    })
  }
  if (schoolStr) {
    page.drawRectangle({
      x: x0 + contentW - padX - twS - padW,
      y: yWhiteBottom,
      width: twS + 2 * padW,
      height: bandH,
      color: rgb(1, 1, 1),
    })
    page.drawText(schoolStr, {
      x: x0 + contentW - padX - twS,
      y: midY - brandPt / 3,
      size: brandPt,
      font: fonts.regular,
      color: brandColor,
    })
  }
}

export async function drawPageHeader(
  pdf: PDFDocument,
  page: PDFPage,
  payload: Record<string, unknown>,
  geom: { page_w_pt: number; page_h_pt: number; ml: number; mr: number },
  pageNum: number,
  fonts: { regular: PDFFont; bold: PDFFont },
  isAnswerKeyPage: boolean,
) {
  if (isAnswerKeyPage) return
  const theme = hexToRgbColor(String(payload.theme_color ?? '#AECBFA'))
  const mt = mmToPt(Number(payload.margin_top_mm ?? 10))

  if (pageNum === 1 && payload.written_paper_header) {
    const writtenTitle = String(payload.written_paper_title ?? payload.title ?? 'Yazılı').trim()
    if (writtenTitle) {
      page.drawText(writtenTitle.slice(0, 80), {
        x: geom.ml,
        y: geom.page_h_pt - mt - 14,
        size: 10,
        font: fonts.bold,
        color: rgb(0.07, 0.09, 0.15),
      })
    }
    return
  }

  const styleId = String(payload.header_style_id ?? '')
  if (pageNum === 1) {
    if (isClassicTestBannerHeader(styleId) || !isCorporateHeader(styleId)) {
      await drawPage1Style3Banner(pdf, page, payload, geom, mt, theme, fonts)
    } else {
      await drawThemeFirstPageHeaderPdf(pdf, page, payload, geom, mt, fonts)
    }
  } else if (payload.written_paper_header) {
    page.drawLine({
      start: { x: geom.ml, y: geom.page_h_pt - mt - 2 },
      end: { x: geom.page_w_pt - geom.mr, y: geom.page_h_pt - mt - 2 },
      thickness: 0.9,
      color: rgb(0, 0, 0),
    })
  } else if (isClassicTestBannerHeader(styleId) || !isCorporateHeader(styleId)) {
    drawOtherPageBanner(page, payload, geom, mt, theme, fonts)
  } else {
    await drawThemeRunningHeaderPdfFromPayload(pdf, page, payload, pageNum, geom, mt, fonts)
  }
}

export function drawColumnDividers(
  page: PDFPage,
  payload: Record<string, unknown>,
  geom: {
    page_w_pt: number
    ml: number
    mr: number
    page_h_pt: number
    cols: number
    colGap: number
    columnX: number[]
    contentBottom: number
  },
  pageNum: number,
  isAnswerKeyPage: boolean,
) {
  if (isAnswerKeyPage || geom.cols < 2) return
  if (!columnDividerEnabled(payload)) return
  const stroke = payload.written_paper_header
    ? rgb(0, 0, 0)
    : hexToRgbColor(columnDividerColor(payload))
  const lineThickness = payload.written_paper_header ? 0.9 : columnDividerWidthPt(payload)
  const mt = mmToPt(Number(payload.margin_top_mm ?? 10))
  const contentW = geom.page_w_pt - geom.ml - geom.mr
  const dividerStartFromTop =
    otherPageColumnDividerStartFromTopPt(payload, pageNum) ??
    (pageNum === 1 && isCorporateHeader(String(payload.header_style_id ?? ''))
      ? corporateFirstPageHeaderTotalPt(payload, contentW)
      : headerHeightPt(payload, pageNum, contentW))
  const yStart = geom.page_h_pt - mt - dividerStartFromTop
  const yEnd = geom.contentBottom

  for (let i = 1; i < geom.cols; i++) {
    const x = geom.columnX[i]! - geom.colGap / 2
    page.drawLine({
      start: { x, y: yEnd },
      end: { x, y: yStart },
      thickness: lineThickness,
      color: stroke,
    })
  }
}

export function drawPageFrame(
  page: PDFPage,
  payload: Record<string, unknown>,
  geom: { page_w_pt: number; page_h_pt: number },
) {
  if (!pageFrameEnabled(payload)) return
  const mt = mmToPt(Number(payload.margin_top_mm ?? 10))
  const mb = mmToPt(Number(payload.margin_bottom_mm ?? 10))
  const ml = mmToPt(Number(payload.margin_left_mm ?? 10))
  const mr = mmToPt(Number(payload.margin_right_mm ?? 10))
  const expand = mmToPt(pageFrameInnerGapMm(payload))
  const x = Math.max(0, ml - expand)
  const y = Math.max(0, mb - expand)
  const right = Math.min(geom.page_w_pt, geom.page_w_pt - mr + expand)
  const top = Math.min(geom.page_h_pt, geom.page_h_pt - mt + expand)
  const w = right - x
  const h = top - y
  if (w <= 0 || h <= 0) return
  const borderColor = hexToRgbColor(pageFrameColor(payload))
  const borderWidth = pageFrameWidthPt(payload)
  const style = pageFrameLineStyle(payload)
  const dash =
    style === 'dashed' ? [4, 3] : style === 'dotted' ? [1, 2] : undefined
  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    borderColor,
    borderWidth,
    borderDashArray: dash,
  })
}

export function drawCenterLineText(
  page: PDFPage,
  payload: Record<string, unknown>,
  geom: {
    page_w_pt: number
    page_h_pt: number
    ml: number
    mr: number
    cols: number
    colGap: number
    columnX: number[]
    contentBottom: number
  },
  pageNum: number,
  fonts: { regular: PDFFont; bold: PDFFont },
  isAnswerKeyPage: boolean,
) {
  if (isAnswerKeyPage || geom.cols < 2 || payload.written_paper_header) return
  if (!columnDividerTextEnabled(payload)) return
  const txt = columnDividerText(payload)
  if (!txt) return

  const theme = hexToRgbColor(columnDividerColor(payload))
  const mt = mmToPt(Number(payload.margin_top_mm ?? 10))
  const contentW = geom.page_w_pt - geom.ml - geom.mr
  const dividerStartFromTop =
    otherPageColumnDividerStartFromTopPt(payload, pageNum) ??
    (pageNum === 1 && isCorporateHeader(String(payload.header_style_id ?? ''))
      ? corporateFirstPageHeaderTotalPt(payload, contentW)
      : headerHeightPt(payload, pageNum, contentW))
  const yStart = geom.page_h_pt - mt - dividerStartFromTop
  const cy = (yStart + geom.contentBottom) / 2
  const fontSize = 9
  const font = payload.center_line_bold ? fonts.bold : fonts.regular
  const directionUp = String(payload.center_line_text_direction ?? 'up') !== 'down'

  for (let i = 1; i < geom.cols; i++) {
    const lineX = geom.columnX[i]! - geom.colGap / 2
    const rotDeg = directionUp ? 90 : -90
    const rad = (rotDeg * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const tw = font.widthOfTextAtSize(txt, fontSize)
    const boxH = fontSize * 1.05
    const pad = 2

    page.pushOperators(
      pushGraphicsState(),
      concatTransformationMatrix(1, 0, 0, 1, lineX, cy),
      concatTransformationMatrix(cos, sin, -sin, cos, 0, 0),
    )
    page.drawRectangle({
      x: -tw / 2 - pad,
      y: -boxH / 2 - pad,
      width: tw + pad * 2,
      height: boxH + pad * 2,
      color: rgb(1, 1, 1),
    })
    page.drawText(txt, {
      x: -tw / 2,
      y: -fontSize * 0.35,
      size: fontSize,
      font,
      color: theme,
    })
    page.pushOperators(popGraphicsState())
  }
}
