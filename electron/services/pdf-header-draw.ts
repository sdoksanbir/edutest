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
  CLASSIC_BANNER_RADIUS_PT,
  DESC_BOX_GAP_BELOW_PT,
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
  resolveClassicTopBannerHeightPt,
  style1ClassicDyBSizePt,
} from './banner-right-mode.js'
import { getHeaderFieldFontPt, headerFieldBold, headerFieldColor, headerFieldItalic } from './header-field-fonts.js'
import {
  CLASSIC_DYB_INSET_X_PT,
  CLASSIC_INFO_PAD_X_PT,
  CLASSIC_SUBJECT_PILL_PAD_X_DEFAULT_PT,
  CLASSIC_TEST_NO_INSET_X_PT,
  classicInfoBarTopicBlockHeightPt,
  classicInfoMarkerLayout,
  classicTextBaselinePdf,
  layoutClassicBannerTopRow,
  layoutClassicInfoBarTopicLines,
  normalizeClassicBannerConfig,
  wrapClassicInfoBarText,
} from './classic-banner-top-row.js'
import { parseLogoBytes } from './header-logo.js'
import { drawClassicInstitutionBadgePdf, drawClassicLogoBadgePdf } from './classic-left-badge.js'
import {
  clampSubjectPillPadXPt,
  resolveSubjectPillTextColor,
  resolveSubjectPillTextOffsetYPt,
} from './modern-corporate-header-shared.js'
import { otherPageColumnDividerStartFromTopPt, themeFirstPageHeaderTotalPt } from './header-styles.js'
import { mergeHeaderBadgeConfig } from './header-badge-by-style.js'
import {
  columnDividerColor,
  columnDividerEnabled,
  columnDividerText,
  columnDividerTextEnabled,
  columnDividerWidthPt,
  pageFrameColor,
  pageFrameCornerRadiusMm,
  pageFrameEnabled,
  pageFrameInnerGapMm,
  pageFrameLineStyle,
  pageFrameWidthPt,
  themePrimaryColor,
  themeAccentColor,
} from './visual-properties.js'
import type { PDFDocument } from 'pdf-lib'

export { headerHeightPt } from './pdf-description-utils.js'

const BEZIER_K = 0.5522847498

const PATH_ROUND_RECT_LEFT = (w: number, h: number, r: number, roundBottom = false) => {
  const rr = Math.min(r, w / 2, h / 2)
  if (roundBottom) {
    return `M ${rr},0 L ${w},0 L ${w},${h} L ${rr},${h} Q 0,${h} 0,${h - rr} L 0,${rr} Q 0,0 ${rr},0 Z`
  }
  return `M ${rr},0 L ${w},0 L ${w},${h} L 0,${h} L 0,${rr} Q 0,0 ${rr},0 Z`
}

const PATH_ROUND_RECT_RIGHT = (w: number, h: number, r: number, roundBottom = false) => {
  const rr = Math.min(r, w / 2, h / 2)
  if (roundBottom) {
    return `M 0,0 L ${w - rr},0 Q ${w},0 ${w},${rr} L ${w},${h - rr} Q ${w},${h} ${w - rr},${h} L 0,${h} Z`
  }
  return `M 0,0 L ${w - rr},0 Q ${w},0 ${w},${rr} L ${w},${h} L 0,${h} Z`
}

function otherPageBannerPath(w: number, h: number, r: number): string {
  const k = BEZIER_K
  return [
    `M 0,${h}`,
    `L ${w},${h}`,
    `L ${w},${r}`,
    `C ${w},${r * (1 - k)} ${w - r + k * r},0 ${w - r},0`,
    `L ${r},0`,
    `C ${r - k * r},0 0,${r * (1 - k)} 0,${r}`,
    `L 0,${h}`,
    'Z',
  ].join(' ')
}

export function hexToRgbColor(hex: string): RGB {
  const s = (hex || '').trim().replace(/^#/, '')
  if (s.length !== 6) return rgb(0.68, 0.8, 0.98)
  return rgb(
    parseInt(s.slice(0, 2), 16) / 255,
    parseInt(s.slice(2, 4), 16) / 255,
    parseInt(s.slice(4, 6), 16) / 255,
  )
}

function strokeRoundRectLeft(
  page: PDFPage,
  x: number,
  yTop: number,
  w: number,
  h: number,
  r: number,
  color: RGB,
  roundBottom = false,
) {
  page.drawSvgPath(PATH_ROUND_RECT_LEFT(w, h, r, roundBottom), {
    x,
    y: yTop,
    borderColor: color,
    borderWidth: 1,
  })
}

function strokeRoundRectRight(
  page: PDFPage,
  x: number,
  yTop: number,
  w: number,
  h: number,
  r: number,
  color: RGB,
  roundBottom = false,
) {
  page.drawSvgPath(PATH_ROUND_RECT_RIGHT(w, h, r, roundBottom), {
    x,
    y: yTop,
    borderColor: color,
    borderWidth: 1,
  })
}

function strokeOtherPageBanner(page: PDFPage, x: number, yTop: number, w: number, h: number, r: number, color: RGB) {
  page.drawSvgPath(otherPageBannerPath(w, h, r), { x, y: yTop, borderColor: color, borderWidth: 1 })
}

/** Canvas: dolgu + çerçeve. yBottom = PDF alt kenar. */
function drawDottedSidePanel(
  page: PDFPage,
  x: number,
  yBottom: number,
  w: number,
  h: number,
  r: number,
  theme: RGB,
  side: 'left' | 'right',
  fill: RGB = rgb(1, 1, 1),
  roundBottom = false,
) {
  const yTop = yBottom + h
  const path =
    side === 'left'
      ? PATH_ROUND_RECT_LEFT(w, h, r, roundBottom)
      : PATH_ROUND_RECT_RIGHT(w, h, r, roundBottom)
  page.drawSvgPath(path, { x, y: yTop, color: fill })

  if (side === 'left') strokeRoundRectLeft(page, x, yTop, w, h, r, theme, roundBottom)
  else strokeRoundRectRight(page, x, yTop, w, h, r, theme, roundBottom)
}

function drawDottedFullBanner(page: PDFPage, x: number, yBottom: number, w: number, h: number, r: number, theme: RGB) {
  const yTop = yBottom + h
  page.drawSvgPath(otherPageBannerPath(w, h, r), { x, y: yTop, color: rgb(1, 1, 1) })
  strokeOtherPageBanner(page, x, yTop, w, h, r, theme)
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

const TRIAL_TEST_NAME_MIN_SAMPLE = 'MATEMATİK TESTİ'

type TrialBannerPayload = {
  examCode: string
  testName: string
  bookletLabel: string
  examCodeFontPt: number
  examCodeColor: string
  examCodeAlign: 'left' | 'center' | 'right'
  examCodePadLeftPt: number
  bookletFontPt: number
  bookletColor: string
  testNameBgColor: string
  testNameBgOpacityPct: number
}

function parseTrialBanner(payload: Record<string, unknown>): TrialBannerPayload | null {
  const raw = payload.trial_banner
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const alignRaw = String(o.exam_code_align ?? 'left')
  const align =
    alignRaw === 'center' || alignRaw === 'right' ? alignRaw : 'left'
  return {
    examCode: String(o.exam_code ?? '').trim(),
    testName: String(o.test_name ?? '').trim(),
    bookletLabel: String(o.booklet_label ?? 'A KİTAPÇIĞI').trim() || 'A KİTAPÇIĞI',
    examCodeFontPt: Math.max(7, Math.min(18, Number(o.exam_code_font_pt ?? 10) || 10)),
    examCodeColor: String(o.exam_code_color ?? '').trim(),
    examCodeAlign: align,
    examCodePadLeftPt: Math.max(0, Math.min(36, Number(o.exam_code_pad_left_pt ?? 10) || 10)),
    bookletFontPt: Math.max(7, Math.min(18, Number(o.booklet_font_pt ?? 10) || 10)),
    bookletColor: String(o.booklet_color ?? '').trim(),
    testNameBgColor: String(o.test_name_bg_color ?? '#0A1931').trim() || '#0A1931',
    testNameBgOpacityPct: Math.max(
      0,
      Math.min(100, Number(o.test_name_bg_opacity_pct ?? 100) || 100),
    ),
  }
}

function blendHexOnWhite(hex: string, opacityPct: number): RGB {
  const c = hexToRgbColor(hex)
  const a = Math.max(0, Math.min(1, opacityPct / 100))
  return rgb(c.red * a + (1 - a), c.green * a + (1 - a), c.blue * a + (1 - a))
}

async function drawPage1Style3Banner(
  pdf: PDFDocument,
  page: PDFPage,
  payload: Record<string, unknown>,
  geom: { page_w_pt: number; page_h_pt: number; ml: number; mr: number },
  mt: number,
  theme: RGB,
  themeHex: string,
  fonts: {
    bold: PDFFont
    regular: PDFFont
    italic?: PDFFont
    boldItalic?: PDFFont
  },
) {
  const contentW = geom.page_w_pt - geom.ml - geom.mr
  const config = normalizeClassicBannerConfig(parseHeaderConfig(payload.header_config))
  const styleId = String(payload.header_style_id ?? '')
  const bannerH = resolveClassicTopBannerHeightPt(config, styleId)
  const boxY = geom.page_h_pt - mt - bannerH
  const r = 6
  const trial = parseTrialBanner(payload)

  const title = trial
    ? (trial.testName || 'TEST ADI').toUpperCase().slice(0, 40)
    : classicBannerSubjectText(config).slice(0, 40)
  const titleSize = getHeaderFieldFontPt('subject', styleId, config)
  const padXPt = clampSubjectPillPadXPt(
    config.subjectPillPadXPt ?? CLASSIC_SUBJECT_PILL_PAD_X_DEFAULT_PT,
  )
  const titleWMeasure = title ? fonts.bold.widthOfTextAtSize(title, titleSize) : 0
  const trialMinW = trial
    ? fonts.bold.widthOfTextAtSize(TRIAL_TEST_NAME_MIN_SAMPLE, titleSize)
    : 0
  const textWidthPt = Math.max(titleWMeasure, trialMinW, trial ? 0 : bannerH)
  const row = layoutClassicBannerTopRow({
    contentW,
    ml: geom.ml,
    textWidthPt: textWidthPt || bannerH,
    padXPt,
  })
  const { leftW, midW, rightW, xLeft, xMid, xRight } = row

  const showClassicLeft = config.showHeaderLeft !== false
  const showClassicInfoBar = config.showClassicInfoBar !== false
  const roundBottomCorners = !showClassicInfoBar && !payload.include_description
  drawDottedSidePanel(
    page,
    xLeft,
    boxY,
    leftW,
    bannerH,
    r,
    theme,
    'left',
    rgb(1, 1, 1),
    roundBottomCorners,
  )

  if (trial) {
    const leftTxt = (trial.examCode || 'SINAV KODU').toUpperCase().slice(0, 40)
    const leftColor = hexToRgbColor(trial.examCodeColor || themeHex)
    const leftFontPt = trial.examCodeFontPt
    const tw = fonts.bold.widthOfTextAtSize(leftTxt, leftFontPt)
    const cy = boxY + bannerH / 2
    let tx = xLeft + trial.examCodePadLeftPt
    if (trial.examCodeAlign === 'center') tx = xLeft + (leftW - tw) / 2
    else if (trial.examCodeAlign === 'right') {
      tx = xLeft + leftW - CLASSIC_TEST_NO_INSET_X_PT - tw
    }
    page.drawText(leftTxt, {
      x: tx,
      y: classicTextBaselinePdf(cy, leftFontPt),
      size: leftFontPt,
      font: fonts.bold,
      color: leftColor,
    })
  } else if (showClassicLeft) {
    const leftInset = CLASSIC_TEST_NO_INSET_X_PT
    const leftContentX = xLeft + leftInset
    const leftAvailW = Math.max(1, leftW - leftInset * 2)
    const leftMode = String(config.headerLeftMode ?? 'logo')
    const useText =
      leftMode === 'publicationText' ||
      leftMode === 'institutionText' ||
      leftMode === 'publication_text'
    if (useText) {
      const badgeCfg = {
        ...mergeHeaderBadgeConfig(config, 'style_2'),
        primaryColor: themeHex,
      }
      drawClassicInstitutionBadgePdf(
        page,
        fonts.bold,
        leftContentX,
        boxY,
        bannerH,
        badgeCfg,
        themeHex,
        hexToRgbColor,
        leftAvailW,
      )
    } else {
      const logoUrl = String(config.logoUrl ?? '').trim()
      if (logoUrl && parseLogoBytes(logoUrl)) {
        const badgeCfg = {
          ...mergeHeaderBadgeConfig(config, 'style_2'),
          primaryColor: themeHex,
          logoSizePct: config.logoSizePct ?? 100,
        }
        await drawClassicLogoBadgePdf(
          pdf,
          page,
          logoUrl,
          leftContentX,
          boxY,
          bannerH,
          leftAvailW,
          badgeCfg,
          hexToRgbColor,
        )
      }
    }
  }

  if (midW > 0) {
    const midHex = trial
      ? trial.testNameBgColor
      : config.subjectPillFillColor?.trim()
        ? config.subjectPillFillColor.trim()
        : themeHex
    const midFill = trial
      ? blendHexOnWhite(midHex, trial.testNameBgOpacityPct)
      : hexToRgbColor(midHex)
    const midBorder = hexToRgbColor(midHex)
    page.drawRectangle({
      x: xMid,
      y: boxY,
      width: midW,
      height: bannerH,
      color: midFill,
      borderColor: midBorder,
      borderWidth: 1,
    })
  }

  drawDottedSidePanel(
    page,
    xRight,
    boxY,
    rightW,
    bannerH,
    r,
    theme,
    'right',
    rgb(1, 1, 1),
    roundBottomCorners,
  )

  if (title) {
    const titleW = fonts.bold.widthOfTextAtSize(title, titleSize)
    const titleOff = resolveSubjectPillTextOffsetYPt(config)
    const centerY = boxY + bannerH / 2 - titleOff
    page.drawText(title, {
      x: xMid + (midW - titleW) / 2,
      y: classicTextBaselinePdf(centerY, titleSize),
      size: titleSize,
      font: fonts.bold,
      color: hexToRgbColor(resolveSubjectPillTextColor(config)),
    })
  }

  if (trial) {
    const rightTxt = trial.bookletLabel.toUpperCase().slice(0, 40)
    const rightFontPt = trial.bookletFontPt
    const rightColor = hexToRgbColor(trial.bookletColor || themeHex)
    const tw = fonts.bold.widthOfTextAtSize(rightTxt, rightFontPt)
    page.drawText(rightTxt, {
      x: xRight + (rightW - tw) / 2,
      y: classicTextBaselinePdf(boxY + bannerH / 2, rightFontPt),
      size: rightFontPt,
      font: fonts.bold,
      color: rightColor,
    })
  }

  const infoTop = boxY - BANNER_GAP_PT
  const badgeConfig = {
    ...mergeHeaderBadgeConfig(config, styleId),
    primaryColor: themeHex,
  }
  const rightModeRaw = resolveBannerRightMode(badgeConfig)
  /** Minimal: Sınav Türü yok — score/examType → Test No */
  const rightMode =
    rightModeRaw === 'score' || rightModeRaw === 'examType' ? 'testNo' : rightModeRaw
  if (!trial && rightMode === 'testNo') {
    const testRightEdge = xRight + rightW - CLASSIC_TEST_NO_INSET_X_PT
    drawStyle1TestNoPdf(page, fonts.bold, testRightEdge, boxY, bannerH, badgeConfig)
  }

  let infoH = 0
  let infoBottom = boxY
  if (showClassicInfoBar) {
  infoH = resolveClassicInfoBarHeightPt(badgeConfig, styleId, contentW)
  const topicTxt = visibleTopicText(config)
  const subTopicTxt = visibleSubTopicText(config)
  const topicSize = getHeaderFieldFontPt('topic', styleId, config)
  const subSize = getHeaderFieldFontPt('subTopic', styleId, config)
  const topicSubGap = config.topicSubTopicGapPt ?? 3
  const padX = CLASSIC_INFO_PAD_X_PT
  const accentHex = themeAccentColor(payload as Record<string, unknown>)
  const dybSize = style1ClassicDyBSizePt(badgeConfig)
  const dybGroupW = dybSize.wPt
  const textMaxW = Math.max(40, contentW - padX * 2 - dybGroupW - CLASSIC_DYB_INSET_X_PT - 8)
  const topicMarkerOff = classicInfoMarkerLayout(topicSize, 'square').textOffsetX
  const subMarkerOff = classicInfoMarkerLayout(topicTxt ? topicSize : subSize, 'square').textOffsetX
  const topicBold = headerFieldBold(config, 'topic', true)
  const topicItalic = headerFieldItalic(config, 'topic', false)
  const subBold = headerFieldBold(config, 'subTopic', false)
  const subItalic = headerFieldItalic(config, 'subTopic', true)
  const pickFont = (bold: boolean, italic: boolean) => {
    if (bold && italic) return fonts.boldItalic ?? fonts.bold
    if (italic) return fonts.italic ?? fonts.regular
    if (bold) return fonts.bold
    return fonts.regular
  }
  const topicFont = pickFont(topicBold, topicItalic)
  const subFont = pickFont(subBold, subItalic)
  const topicTexts = topicTxt
    ? wrapClassicInfoBarText(topicTxt, textMaxW - topicMarkerOff, (s) =>
        topicFont.widthOfTextAtSize(s, topicSize),
      )
    : []
  const subTexts = subTopicTxt
    ? wrapClassicInfoBarText(subTopicTxt, textMaxW - subMarkerOff, (s) =>
        subFont.widthOfTextAtSize(s, subSize),
      )
    : []
  const topicBlockNeed = classicInfoBarTopicBlockHeightPt({
    topicFontPt: topicSize,
    subFontPt: subSize,
    topicLineCount: topicTexts.length,
    subLineCount: subTexts.length,
    gapPt: topicSubGap,
  })
  infoH = Math.max(infoH, topicBlockNeed + 6)
  const infoR = payload.include_description ? 0 : CLASSIC_BANNER_RADIUS_PT
  if (infoR <= 0) {
    page.drawRectangle({
      x: geom.ml,
      y: infoTop - infoH,
      width: contentW,
      height: infoH,
      color: rgb(1, 1, 1),
      borderColor: theme,
      borderWidth: CLASSIC_BANNER_LINE_PT,
    })
  } else {
    const infoPath = `M 0,0 L ${contentW},0 L ${contentW},${infoH - infoR} Q ${contentW},${infoH} ${contentW - infoR},${infoH} L ${infoR},${infoH} Q 0,${infoH} 0,${infoH - infoR} Z`
    page.drawSvgPath(infoPath, {
      x: geom.ml,
      y: infoTop,
      color: rgb(1, 1, 1),
      borderColor: theme,
      borderWidth: CLASSIC_BANNER_LINE_PT,
    })
  }

  infoBottom = infoTop - infoH
  const lines = layoutClassicInfoBarTopicLines({
    infoH,
    topicFontPt: topicSize,
    subFontPt: subSize,
    hasTopic: Boolean(topicTxt),
    hasSub: Boolean(subTopicTxt),
    gapPt: topicSubGap,
    topicTexts,
    subTexts,
    topicBold,
    topicItalic,
    subBold,
    subItalic,
  })
  const markerPath = (w: number, h: number, rr: number) => {
    const rad = Math.min(rr, w / 2, h / 2)
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
  const drawInfoTopicLine = (
    colorHex: string,
    line: NonNullable<typeof lines.topic>,
  ) => {
    const color = hexToRgbColor(colorHex)
    const markerTop = infoTop - line.markerTopFromInfoTop
    const centerY = infoTop - line.centerFromInfoTop
    const font = pickFont(line.bold, line.italic)
    page.drawSvgPath(markerPath(line.marker.size, line.marker.size, line.marker.radius), {
      x: geom.ml + padX,
      y: markerTop,
      color,
    })
    line.texts.forEach((row, i) => {
      const cy = centerY - i * line.fontPt
      page.drawText(row, {
        x: geom.ml + padX + line.marker.textOffsetX,
        y: classicTextBaselinePdf(cy, line.fontPt),
        size: line.fontPt,
        font,
        color,
      })
    })
  }
  if (lines.topic && topicTxt) {
    drawInfoTopicLine(headerFieldColor(config, 'topic', themeHex), lines.topic)
  }
  if (lines.sub && subTopicTxt) {
    drawInfoTopicLine(headerFieldColor(config, 'subTopic', accentHex), lines.sub)
  }
  const dybRightEdge = geom.page_w_pt - geom.mr - CLASSIC_DYB_INSET_X_PT
  const dybH = dybSize.hPt
  const dybW = dybSize.wPt
  const dybY = infoBottom + (infoH - dybH) / 2
  drawStyle1ScoreBoxPdf(
    page,
    fonts.bold,
    dybRightEdge - dybW,
    dybY,
    dybW,
    dybH,
    badgeConfig,
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
  while (schoolStr.length > 0 && fonts.bold.widthOfTextAtSize(schoolStr, brandPt) > halfW - padX) {
    schoolStr = schoolStr.slice(0, -1)
  }

  const twT = titleStr ? fonts.bold.widthOfTextAtSize(titleStr, topicPt) : 0
  const twS = schoolStr ? fonts.bold.widthOfTextAtSize(schoolStr, brandPt) : 0
  const midY = boxY + BANNER_H_PT / 2
  const bandH = Math.max(topicPt, brandPt) + 2 * padV
  const yWhiteBottom = midY - bandH / 2
  const topicColor = hexToRgbColor(headerFieldColor(config, 'topic', '#262626'))
  const brandColor = hexToRgbColor(headerFieldColor(config, 'brandName', '#262626'))

  if (titleStr) {
    page.drawRectangle({ x: x0 + padX - padW, y: yWhiteBottom, width: twT + 2 * padW, height: bandH, color: rgb(1, 1, 1) })
    page.drawText(titleStr, {
      x: x0 + padX,
      y: classicTextBaselinePdf(midY, topicPt),
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
      y: classicTextBaselinePdf(midY, brandPt),
      size: brandPt,
      font: fonts.bold,
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
  const themeHex = themePrimaryColor(payload)
  const theme = hexToRgbColor(themeHex)
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

  if (pageNum === 1) {
    if (isCorporateHeader(String(payload.header_style_id ?? ''))) {
      await drawThemeFirstPageHeaderPdf(pdf, page, payload, geom, mt, fonts)
    } else {
      await drawPage1Style3Banner(pdf, page, payload, geom, mt, theme, themeHex, fonts)
    }
  } else if (payload.written_paper_header) {
    page.drawLine({
      start: { x: geom.ml, y: geom.page_h_pt - mt - 2 },
      end: { x: geom.page_w_pt - geom.mr, y: geom.page_h_pt - mt - 2 },
      thickness: 0.9,
      color: rgb(0, 0, 0),
    })
  } else if (isCorporateHeader(String(payload.header_style_id ?? ''))) {
    await drawThemeRunningHeaderPdfFromPayload(pdf, page, payload, pageNum, geom, mt, fonts)
  } else {
    drawOtherPageBanner(page, payload, geom, mt, theme, fonts)
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
  /** PDF pt: full-width soru bantları — ayırıcı bu aralıklardan geçmez [yBottom, yTop] */
  skipBandsPt?: Array<{ yBottom: number; yTop: number }>,
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

  const bands = (skipBandsPt ?? [])
    .map((b) => ({
      lo: Math.min(b.yBottom, b.yTop),
      hi: Math.max(b.yBottom, b.yTop),
    }))
    .filter((b) => b.hi - b.lo > 0.5)
    .sort((a, b) => a.lo - b.lo)

  const segments: Array<{ lo: number; hi: number }> = []
  let cursor = yEnd
  for (const b of bands) {
    if (b.lo > cursor + 0.5) segments.push({ lo: cursor, hi: Math.min(b.lo, yStart) })
    cursor = Math.max(cursor, b.hi)
  }
  if (yStart > cursor + 0.5) segments.push({ lo: cursor, hi: yStart })
  if (segments.length === 0 && bands.length === 0) {
    segments.push({ lo: yEnd, hi: yStart })
  }

  for (let i = 1; i < geom.cols; i++) {
    const x = geom.columnX[i]! - geom.colGap / 2
    for (const seg of segments) {
      if (seg.hi - seg.lo < 0.5) continue
      page.drawLine({
        start: { x, y: seg.lo },
        end: { x, y: seg.hi },
        thickness: lineThickness,
        color: stroke,
      })
    }
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
  const cornerR = Math.min(
    mmToPt(pageFrameCornerRadiusMm(payload)),
    w / 2,
    h / 2,
  )

  if (cornerR > 0) {
    const path = [
      `M ${cornerR},0`,
      `L ${w - cornerR},0`,
      `Q ${w},0 ${w},${cornerR}`,
      `L ${w},${h - cornerR}`,
      `Q ${w},${h} ${w - cornerR},${h}`,
      `L ${cornerR},${h}`,
      `Q 0,${h} 0,${h - cornerR}`,
      `L 0,${cornerR}`,
      `Q 0,0 ${cornerR},0`,
      'Z',
    ].join(' ')
    page.drawSvgPath(path, {
      x,
      y: y + h,
      borderColor,
      borderWidth,
      borderDashArray: dash,
    })
    return
  }

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
