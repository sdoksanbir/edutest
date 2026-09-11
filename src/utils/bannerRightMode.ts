/** Tema 1 — banner sağ alanı modu (sınav türü / D-Y-B / test no / kapalı) */

import type { HeaderConfig } from './corporateHeaderLayout'
import { isHeaderFieldVisible } from './headerFieldVisibility'
import { HEADER_FONT_FAMILY_CANVAS } from './corporateHeaderConstants'
import { getHeaderFieldFontPt } from './headerFieldFonts'
import { clampSubjectPillPadYPt } from './modernCorporateHeaderShared'
import {
  approxClassicInfoTextWidthPt,
  classicDyBBoxRectsRightAligned,
  classicDyBLabelFillWidthPt,
  classicInfoBarTopicBlockHeightPt,
  classicInfoMarkerLayout,
  classicTextBaselineCanvas,
  classicTopBannerHeightPt,
  wrapClassicInfoBarText,
  CLASSIC_DYB_BORDER_PT,
  CLASSIC_DYB_FONT_PT,
  CLASSIC_DYB_INSET_X_PT,
  CLASSIC_DYB_LABEL_TEXT_COLOR,
  CLASSIC_DYB_RADIUS_PT,
  CLASSIC_INFO_PAD_X_PT,
  CLASSIC_SUBJECT_PILL_PAD_Y_DEFAULT_PT,
} from './classicBannerTopRow'
import { headerLogoScale, resolveLogoPadYPt } from './headerLogo'
import { visibleSubTopicText, visibleTopicText } from './headerFieldVisibility'

const CLASSIC_INFO_BAR_MIN_H_PT = 28
const CLASSIC_INFO_BAR_BADGE_INSET_PT = 6
const CLASSIC_BANNER_GAP_PT = 2
/** Logo + dikey boşluk ile üst şerit tavanı (pt) */
const CLASSIC_TOP_BANNER_H_MAX_PT = 72

export type BannerRightMode = 'examType' | 'score' | 'testNo' | 'hidden'

export const STYLE_1_SCORE_BOX_W_PT = 130
export const STYLE_1_SCORE_BOX_H_PT = 17
export const STYLE_1_SCORE_BOX_W_MIN_PT = 72
export const STYLE_1_SCORE_BOX_W_MAX_PT = 200
export const STYLE_1_SCORE_BOX_H_MIN_PT = 14
export const STYLE_1_SCORE_BOX_H_MAX_PT = 48
export const STYLE_1_SCORE_BOX_RADIUS_PT = 3
export const STYLE_1_SCORE_BOX_BORDER_PT = 1.25
export const STYLE_1_SCORE_BOX_BORDER_MIN_PT = 0.25
export const STYLE_1_SCORE_BOX_BORDER_MAX_PT = 4
export const STYLE_1_SCORE_LINE_PT = 0.75
export const STYLE_1_SCORE_LINE_MIN_PT = 0.25
export const STYLE_1_SCORE_LINE_MAX_PT = 4
export const STYLE_1_SCORE_LABEL_PT = CLASSIC_DYB_FONT_PT
export const STYLE_1_SCORE_LABEL_MIN_PT = 7
export const STYLE_1_SCORE_LABEL_MAX_PT = 14

export const STYLE_1_TEST_NO_H_MIN_PT = 12
export const STYLE_1_TEST_NO_H_MAX_PT = 64
export const STYLE_1_TEST_NO_H_DEFAULT_PT = 22
export const STYLE_1_TEST_NO_W_MIN_PT = 40
export const STYLE_1_TEST_NO_W_MAX_PT = 160
export const STYLE_1_TEST_NO_W_DEFAULT_PT = 100
export const STYLE_1_TEST_NO_LABEL_PT = 15
export const STYLE_1_TEST_NO_NUM_PT = 11
export const STYLE_1_TEST_NO_PAD_X_PT = 6
export const STYLE_1_TEST_NO_PAD_Y_PT = 5
export const STYLE_1_TEST_NO_NUM_MIN_W_PT = 24
export const STYLE_1_TEST_NO_BORDER_PT = 1.25
export const STYLE_1_TEST_NO_RADIUS_PT = 2.5
/** Numara dairesi — yüksekliğe yakın çap */
export const STYLE_1_TEST_NO_CIRCLE_INSET_PT = 0.5
export const STYLE_1_TEST_NO_FONT_MIN_PT = 5
export const STYLE_1_TEST_NO_FONT_MAX_PT = 20
export const STYLE_1_RIGHT_OFFSET_Y_MIN_PT = -28
export const STYLE_1_RIGHT_OFFSET_Y_MAX_PT = 28
export const STYLE_1_RIGHT_OFFSET_Y_DEFAULT_PT = 3
export const STYLE_1_SCORE_OFFSET_Y_DEFAULT_PT = 9
export const STYLE_1_TEST_NO_GAP_X_DEFAULT_PT = 3
export const STYLE_1_TEST_NO_GAP_X_MIN_PT = 0
export const STYLE_1_TEST_NO_GAP_X_MAX_PT = 28
export const STYLE_1_TEST_NO_OFFSET_X_DEFAULT_PT = 23
export const STYLE_1_TEST_NO_OFFSET_X_MIN_PT = -48
export const STYLE_1_TEST_NO_OFFSET_X_MAX_PT = 48

const SCORE_LABELS = ['DOĞRU', 'YANLIŞ', 'BOŞ'] as const

/** Kurumsal / Minimal D·Y·B — toplam genişlik + yükseklik */
export function style1ClassicDyBSizePt(config: HeaderConfig): {
  wPt: number
  hPt: number
  fontPt: number
} {
  return {
    fontPt: resolveScoreBoxLabelFontPt(config),
    wPt: resolveScoreBoxWidthPt(config),
    hPt: resolveScoreBoxHeightPt(config),
  }
}

export function parseBannerRightMode(raw: unknown): BannerRightMode | undefined {
  if (raw === 'examType' || raw === 'score' || raw === 'testNo' || raw === 'hidden') return raw
  return undefined
}

/** Açıkça kaydedilmişse onu kullan; yoksa eski fieldHidden.examType ile uyumlu. */
export function resolveBannerRightMode(config: HeaderConfig): BannerRightMode {
  const explicit = parseBannerRightMode(config.bannerRightMode)
  if (explicit) return explicit
  return isHeaderFieldVisible(config, 'examType') ? 'examType' : 'hidden'
}

export function resolveTestNoLabelFontPt(config: HeaderConfig): number {
  return clampTestNoFontPt(config.testNoLabelFontPt ?? STYLE_1_TEST_NO_LABEL_PT)
}

export function resolveTestNoNumFontPt(config: HeaderConfig): number {
  return clampTestNoFontPt(config.testNoNumFontPt ?? STYLE_1_TEST_NO_NUM_PT)
}

export function clampTestNoFontPt(pt: number): number {
  const n = Number.isFinite(pt) ? pt : STYLE_1_TEST_NO_LABEL_PT
  return Math.max(
    STYLE_1_TEST_NO_FONT_MIN_PT,
    Math.min(STYLE_1_TEST_NO_FONT_MAX_PT, Math.round(n * 10) / 10),
  )
}

export function clampRightSlotOffsetYPt(pt: number): number {
  const n = Number.isFinite(pt) ? pt : STYLE_1_RIGHT_OFFSET_Y_DEFAULT_PT
  return Math.max(
    STYLE_1_RIGHT_OFFSET_Y_MIN_PT,
    Math.min(STYLE_1_RIGHT_OFFSET_Y_MAX_PT, Math.round(n)),
  )
}

export function resolveTestNoOffsetYPt(config: HeaderConfig): number {
  return clampRightSlotOffsetYPt(
    config.testNoOffsetYPt ?? STYLE_1_RIGHT_OFFSET_Y_DEFAULT_PT,
  )
}

export function resolveScoreBoxOffsetYPt(config: HeaderConfig): number {
  return clampRightSlotOffsetYPt(
    config.scoreBoxOffsetYPt ?? STYLE_1_SCORE_OFFSET_Y_DEFAULT_PT,
  )
}

export function clampTestNoGapXPt(pt: number): number {
  const n = Number.isFinite(pt) ? pt : STYLE_1_TEST_NO_GAP_X_DEFAULT_PT
  return Math.max(
    STYLE_1_TEST_NO_GAP_X_MIN_PT,
    Math.min(STYLE_1_TEST_NO_GAP_X_MAX_PT, Math.round(n)),
  )
}

export function resolveTestNoGapXPt(config: HeaderConfig): number {
  return clampTestNoGapXPt(config.testNoGapXPt ?? STYLE_1_TEST_NO_GAP_X_DEFAULT_PT)
}

export function clampTestNoOffsetXPt(pt: number): number {
  const n = Number.isFinite(pt) ? pt : STYLE_1_TEST_NO_OFFSET_X_DEFAULT_PT
  return Math.max(
    STYLE_1_TEST_NO_OFFSET_X_MIN_PT,
    Math.min(STYLE_1_TEST_NO_OFFSET_X_MAX_PT, Math.round(n)),
  )
}

/** + değer rozeti sola kaydırır (sağ kenardan içeri) */
export function resolveTestNoOffsetXPt(config: HeaderConfig): number {
  return clampTestNoOffsetXPt(config.testNoOffsetXPt ?? STYLE_1_TEST_NO_OFFSET_X_DEFAULT_PT)
}

export function resolveTestNoLabelText(config: HeaderConfig): string {
  return String(config.testType ?? '').trim() || 'TEST'
}

export function resolveTestNoNumText(config: HeaderConfig): string {
  return (String(config.testNumber ?? '').trim() || '01').slice(0, 6)
}

export function resolveTestNoFillColor(config: HeaderConfig): string {
  return (
    config.testNoFillColor?.trim() ||
    config.testNoBorderColor?.trim() ||
    config.primaryColor ||
    config.accentColor ||
    '#0A1931'
  ).trim()
}

export function resolveTestNoBorderColor(config: HeaderConfig): string {
  return (
    config.testNoBorderColor?.trim() ||
    config.testNoFillColor?.trim() ||
    config.primaryColor ||
    config.accentColor ||
    '#0A1931'
  ).trim()
}

export function resolveTestNoLabelColor(config: HeaderConfig): string {
  return (
    config.testNoLabelColor?.trim() ||
    config.primaryColor ||
    config.testNoFillColor?.trim() ||
    '#0A1931'
  ).trim()
}

export function resolveTestNoNumColor(config: HeaderConfig): string {
  return (config.testNoNumColor?.trim() || '#FFFFFF').trim()
}

export function clampScoreBoxWidthPt(pt: number): number {
  const n = Number.isFinite(pt) ? pt : STYLE_1_SCORE_BOX_W_PT
  return Math.max(STYLE_1_SCORE_BOX_W_MIN_PT, Math.min(STYLE_1_SCORE_BOX_W_MAX_PT, Math.round(n)))
}

export function clampScoreBoxHeightPt(pt: number): number {
  const n = Number.isFinite(pt) ? pt : STYLE_1_SCORE_BOX_H_PT
  return Math.max(STYLE_1_SCORE_BOX_H_MIN_PT, Math.min(STYLE_1_SCORE_BOX_H_MAX_PT, Math.round(n)))
}

export function clampScoreBoxLabelFontPt(pt: number): number {
  const n = Number.isFinite(pt) ? pt : STYLE_1_SCORE_LABEL_PT
  const stepped = Math.round(n * 2) / 2
  return Math.max(STYLE_1_SCORE_LABEL_MIN_PT, Math.min(STYLE_1_SCORE_LABEL_MAX_PT, stepped))
}

export function resolveScoreBoxWidthPt(config: HeaderConfig): number {
  return clampScoreBoxWidthPt(config.scoreBoxWidthPt ?? STYLE_1_SCORE_BOX_W_PT)
}

export function resolveScoreBoxHeightPt(config: HeaderConfig): number {
  return clampScoreBoxHeightPt(config.scoreBoxHeightPt ?? STYLE_1_SCORE_BOX_H_PT)
}

export function resolveScoreBoxLabelFontPt(config: HeaderConfig): number {
  return clampScoreBoxLabelFontPt(config.scoreBoxLabelFontPt ?? STYLE_1_SCORE_LABEL_PT)
}

export function resolveScoreBoxFillColor(config: HeaderConfig): string {
  return (config.scoreBoxFillColor || '#FFFFFF').trim()
}

export function resolveScoreBoxBorderColor(config: HeaderConfig): string {
  return (config.scoreBoxBorderColor || config.primaryColor || '#0A1931').trim()
}

export function resolveScoreBoxLabelColor(config: HeaderConfig): string {
  return (config.scoreBoxLabelColor || config.primaryColor || '#0A1931').trim()
}

export function clampScoreBoxBorderWidthPt(pt: number): number {
  const n = Number.isFinite(pt) ? pt : STYLE_1_SCORE_BOX_BORDER_PT
  const stepped = Math.round(n * 4) / 4
  return Math.max(STYLE_1_SCORE_BOX_BORDER_MIN_PT, Math.min(STYLE_1_SCORE_BOX_BORDER_MAX_PT, stepped))
}

export function clampScoreBoxLineWidthPt(pt: number): number {
  const n = Number.isFinite(pt) ? pt : STYLE_1_SCORE_LINE_PT
  const stepped = Math.round(n * 4) / 4
  return Math.max(STYLE_1_SCORE_LINE_MIN_PT, Math.min(STYLE_1_SCORE_LINE_MAX_PT, stepped))
}

export function resolveScoreBoxBorderWidthPt(config: HeaderConfig): number {
  return clampScoreBoxBorderWidthPt(config.scoreBoxBorderWidthPt ?? STYLE_1_SCORE_BOX_BORDER_PT)
}

export function resolveScoreBoxLineWidthPt(config: HeaderConfig): number {
  return clampScoreBoxLineWidthPt(config.scoreBoxLineWidthPt ?? STYLE_1_SCORE_LINE_PT)
}

export function clampTestNoWidthPt(pt: number): number {
  const n = Number.isFinite(pt) ? pt : STYLE_1_TEST_NO_W_DEFAULT_PT
  return Math.max(STYLE_1_TEST_NO_W_MIN_PT, Math.min(STYLE_1_TEST_NO_W_MAX_PT, Math.round(n)))
}

export function clampTestNoHeightPt(pt: number): number {
  const n = Number.isFinite(pt) ? pt : STYLE_1_TEST_NO_H_DEFAULT_PT
  return Math.max(STYLE_1_TEST_NO_H_MIN_PT, Math.min(STYLE_1_TEST_NO_H_MAX_PT, Math.round(n)))
}

export function resolveTestNoWidthPt(config: HeaderConfig): number {
  return clampTestNoWidthPt(config.testNoWidthPt ?? STYLE_1_TEST_NO_W_DEFAULT_PT)
}

export function resolveTestNoHeightPt(config: HeaderConfig): number {
  return clampTestNoHeightPt(config.testNoHeightPt ?? STYLE_1_TEST_NO_H_DEFAULT_PT)
}

export function style1TestNoHeightPt(config: HeaderConfig): number {
  return resolveTestNoHeightPt(config)
}

export function classicBadgeInnerHeightPt(config: HeaderConfig): number {
  const mode = resolveBannerRightMode(config)
  if (mode === 'testNo') return resolveTestNoHeightPt(config)
  if (mode === 'score') return style1ClassicDyBSizePt(config).hPt
  if (mode === 'examType') {
    const n = Number(config.examTypeBoxManualHeightPt)
    return Number.isFinite(n) ? Math.max(16, Math.min(64, Math.round(n))) : 36
  }
  return 0
}

/** Minimal alt bilgi şeridi (konu / alt konu / D·Y·B) — varsayılan açık */
export function isClassicInfoBarEnabled(
  config?: Pick<HeaderConfig, 'showClassicInfoBar'> | null,
): boolean {
  return config?.showClassicInfoBar !== false
}

/** Alt şerit içindeki D / Y / B — varsayılan açık */
export function isClassicInfoBarScoreEnabled(
  config?: Pick<HeaderConfig, 'showClassicInfoBarScore'> | null,
): boolean {
  return config?.showClassicInfoBarScore !== false
}

export function resolveClassicInfoBarHeightPt(
  config: HeaderConfig,
  styleId = 'style_2',
  contentWPt?: number,
): number {
  if (!isClassicInfoBarEnabled(config)) return 0
  const showStripScore = isClassicInfoBarScoreEnabled(config)
  let h = Math.max(
    CLASSIC_INFO_BAR_MIN_H_PT,
    classicBadgeInnerHeightPt(config) + CLASSIC_INFO_BAR_BADGE_INSET_PT * 2,
    showStripScore
      ? style1ClassicDyBSizePt(config).hPt + CLASSIC_INFO_BAR_BADGE_INSET_PT * 2
      : 0,
  )
  if (!(contentWPt != null && contentWPt > 40)) return h

  const topicTxt = visibleTopicText(config)
  const subTxt = visibleSubTopicText(config)
  if (!topicTxt && !subTxt) return h

  const topicSize = getHeaderFieldFontPt('topic', styleId, config)
  const subSize = getHeaderFieldFontPt('subTopic', styleId, config)
  const gapPt = config.topicSubTopicGapPt ?? 3
  const dybGroupW = showStripScore ? style1ClassicDyBSizePt(config).wPt : 0
  const textMaxW = Math.max(
    40,
    contentWPt - CLASSIC_INFO_PAD_X_PT * 2 - dybGroupW - (showStripScore ? CLASSIC_DYB_INSET_X_PT : 0) - 8,
  )
  const topicMarkerOff = classicInfoMarkerLayout(topicSize, 'square').textOffsetX
  const subMarkerOff = classicInfoMarkerLayout(topicTxt ? topicSize : subSize, 'square').textOffsetX
  const topicLines = topicTxt
    ? wrapClassicInfoBarText(topicTxt, textMaxW - topicMarkerOff, (s) =>
        approxClassicInfoTextWidthPt(s, topicSize, true),
      )
    : []
  const subLines = subTxt
    ? wrapClassicInfoBarText(subTxt, textMaxW - subMarkerOff, (s) =>
        approxClassicInfoTextWidthPt(s, subSize, false),
      )
    : []
  const blockH = classicInfoBarTopicBlockHeightPt({
    topicFontPt: topicSize,
    subFontPt: subSize,
    topicLineCount: topicLines.length,
    subLineCount: subLines.length,
    gapPt,
  })
  return Math.max(h, blockH + 6)
}

export function resolveClassicTopBannerHeightPt(
  config: HeaderConfig,
  styleId = 'style_2',
): number {
  const font = getHeaderFieldFontPt('subject', styleId, config)
  const padY = clampSubjectPillPadYPt(
    config.subjectPillPadYPt ?? CLASSIC_SUBJECT_PILL_PAD_Y_DEFAULT_PT,
  )
  const textH = classicTopBannerHeightPt(font, padY)
  let h = textH

  const showLeft = config.showHeaderLeft !== false
  const leftMode = String(config.headerLeftMode ?? 'logo')
  const useText =
    leftMode === 'publicationText' ||
    leftMode === 'institutionText' ||
    leftMode === 'publication_text'

  if (showLeft && !useText) {
    // Logo boyutu + dikey boşluk → 3 kutu yüksekliği büyür/küçülür
    const logoCore = Math.round(textH * headerLogoScale(config.logoSizePct ?? 100))
    const padY = resolveLogoPadYPt(config)
    h = Math.max(h, logoCore + padY * 2)
  }

  const badgeH = resolveTestNoHeightPt(config)
  const institutionH = Number(config.institutionBadgeHeightPt)
  const leftBadgeH =
    showLeft && useText && Number.isFinite(institutionH) && institutionH > 0
      ? institutionH
      : badgeH
  h = Math.max(h, leftBadgeH + 4, badgeH + 4)

  const topSlots = (Array.isArray(config.bannerRightSlots) ? config.bannerRightSlots : [])
    .filter((s): s is 'testNo' | 'score' => s === 'testNo' || s === 'score')
  const modeSlots =
    topSlots.length > 0
      ? topSlots
      : (() => {
          const m = parseBannerRightMode(config.bannerRightMode)
          return m === 'testNo' || m === 'score' ? [m] : []
        })()
  if (modeSlots.length > 0) {
    let stack = 0
    for (let i = 0; i < modeSlots.length; i++) {
      const slot = modeSlots[i]!
      stack +=
        slot === 'score'
          ? resolveScoreBoxHeightPt(config)
          : resolveTestNoHeightPt(config)
      if (i > 0) stack += 4
    }
    h = Math.max(h, stack + 4)
  }

  return Math.min(CLASSIC_TOP_BANNER_H_MAX_PT, h)
}

export function resolveClassicBannerAndInfoHeightPt(
  config: HeaderConfig,
  styleId = 'style_2',
  contentWPt?: number,
): number {
  const topH = resolveClassicTopBannerHeightPt(config, styleId)
  if (!isClassicInfoBarEnabled(config)) return topH
  return topH + CLASSIC_BANNER_GAP_PT + resolveClassicInfoBarHeightPt(config, styleId, contentWPt)
}

/** Geriye uyumluluk — sabit yükseklik yerine dinamik */
export const STYLE_1_TEST_NO_H_PT = STYLE_1_TEST_NO_H_DEFAULT_PT

/** Test No gibi: solda dolgulu D/Y/B, sağda boş alan */
export function drawStyle1ScoreBoxCanvas(
  ctx: CanvasRenderingContext2D,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  config: HeaderConfig,
  scale: number,
  fontFamily = HEADER_FONT_FAMILY_CANVAS,
) {
  const size = style1ClassicDyBSizePt(config)
  const fontPt = size.fontPt
  const rightEdgePt = (boxX + boxW) / scale
  const boxYPt = boxY / scale
  const boxHPt = boxH / scale
  const rects = classicDyBBoxRectsRightAligned({
    rightEdgeX: rightEdgePt,
    boxY: boxYPt,
    boxH: boxHPt,
    fontPt,
    groupW: size.wPt,
  })
  const radius = CLASSIC_DYB_RADIUS_PT * scale
  const fontPx = fontPt * scale
  const borderW = Math.max(1, CLASSIC_DYB_BORDER_PT * scale)

  for (const cell of rects) {
    const cx = cell.x * scale
    const cy = cell.y * scale
    const cw = cell.w * scale
    const ch = cell.h * scale
    const leftW = classicDyBLabelFillWidthPt(cell.w, fontPt) * scale
    const centerY = cy + ch / 2
    const fillColor = cell.label.color

    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.roundRect(cx, cy, cw, ch, radius)
    ctx.fill()

    ctx.fillStyle = fillColor
    ctx.beginPath()
    ctx.roundRect(cx, cy, leftW, ch, radius)
    ctx.fill()

    ctx.strokeStyle = fillColor
    ctx.lineWidth = borderW
    ctx.beginPath()
    ctx.roundRect(cx, cy, cw, ch, radius)
    ctx.stroke()

    ctx.fillStyle = CLASSIC_DYB_LABEL_TEXT_COLOR
    ctx.font = `bold ${fontPx}px ${fontFamily}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(cell.label.text, cx + leftW / 2, classicTextBaselineCanvas(centerY, fontPx))
  }
  ctx.textAlign = 'left'
}

/** Dolgusuz TEST yazısı + dolgulu daireye yakın numara */
export function drawStyle1TestNoCanvas(
  ctx: CanvasRenderingContext2D,
  rightEdgeX: number,
  bodyY: number,
  bodyH: number,
  config: HeaderConfig,
  scale: number,
  /** PDF export Arial/Helvetica ile aynı yığın — Poppins kullanma */
  fontFamily = 'Arial, Helvetica',
) {
  const label = resolveTestNoLabelText(config).slice(0, 12)
  const num = resolveTestNoNumText(config)
  const labelPx = resolveTestNoLabelFontPt(config) * scale
  const numPx = resolveTestNoNumFontPt(config) * scale
  const gapX = resolveTestNoGapXPt(config) * scale
  const offsetX = resolveTestNoOffsetXPt(config) * scale
  const boxH = resolveTestNoHeightPt(config) * scale
  const boxW = resolveTestNoWidthPt(config) * scale
  const fillColor = resolveTestNoFillColor(config)
  const labelColor = resolveTestNoLabelColor(config)
  const numColor = resolveTestNoNumColor(config)

  const edge = rightEdgeX - offsetX
  const boxX = edge - boxW
  const boxY = bodyY + (bodyH - boxH) / 2
  const inset = STYLE_1_TEST_NO_CIRCLE_INSET_PT * scale
  const diam = Math.max(10 * scale, boxH - inset * 2)
  const circX = edge - diam - inset
  const circY = boxY + (boxH - diam) / 2
  const cx = circX + diam / 2
  const cy = circY + diam / 2
  const r = diam / 2

  ctx.fillStyle = fillColor
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  ctx.font = `bold ${numPx}px ${fontFamily}`
  ctx.fillStyle = numColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(num, cx, classicTextBaselineCanvas(cy, numPx))

  const textRight = circX - gapX
  ctx.font = `bold ${labelPx}px ${fontFamily}`
  const labelW = ctx.measureText(label).width
  const labelX = Math.max(boxX, textRight - labelW)
  ctx.fillStyle = labelColor
  ctx.textAlign = 'left'
  ctx.fillText(label, labelX, classicTextBaselineCanvas(boxY + boxH / 2, labelPx))
}
