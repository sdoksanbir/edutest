/**
 * Minimal (style_2) üst şerit — sol boş / orta ders adı / sağ Test No;
 * D·Y·B alt bilgi şeridinin sağında.
 */

export const CLASSIC_TOP_BANNER_GAP_PT = 2
export const CLASSIC_TOP_BANNER_H_PT = 22
export const CLASSIC_TOP_BANNER_H_MIN_PT = 16
export const CLASSIC_SUBJECT_BOX_MIN_W_PT = 36
export const CLASSIC_LEFT_BOX_MIN_W_PT = 28
/** Sağ panel — Test No (60) + yan boşluk */
export const CLASSIC_RIGHT_BOX_MIN_W_PT = 68

/** Minimal — ders adı yatay / dikey iç boşluk varsayılanları */
export const CLASSIC_SUBJECT_PILL_PAD_X_DEFAULT_PT = 17
export const CLASSIC_SUBJECT_PILL_PAD_Y_DEFAULT_PT = 6
/** Minimal — ders adı dikey konum varsayılanı */
export const CLASSIC_SUBJECT_PILL_TEXT_OFFSET_Y_DEFAULT_PT = 1

/**
 * PDF export Windows’ta Arial Bold gömer; önizleme de Arial önce çözülmeli.
 * (Helvetica, Arial yığını Helvetica’ya düşerse midW / Test No sol bölme kayar.)
 */
export const CLASSIC_PDF_MATCH_FONT_FAMILY = 'Arial, Helvetica'

/** Kurumsal parse varsayılanı (8/4/−3) Minimal çizimde klasik değerlere çevrilir */
export function normalizeClassicBannerConfig<T extends {
  subjectPillPadXPt?: number
  subjectPillPadYPt?: number
  subjectPillTextOffsetYPt?: number
}>(config: T): T {
  const padX = config.subjectPillPadXPt
  const padY = config.subjectPillPadYPt
  const off = config.subjectPillTextOffsetYPt
  if (padX === 8 && padY === 4 && off === -3) {
    return {
      ...config,
      subjectPillPadXPt: CLASSIC_SUBJECT_PILL_PAD_X_DEFAULT_PT,
      subjectPillPadYPt: CLASSIC_SUBJECT_PILL_PAD_Y_DEFAULT_PT,
      subjectPillTextOffsetYPt: CLASSIC_SUBJECT_PILL_TEXT_OFFSET_Y_DEFAULT_PT,
    }
  }
  return config
}

/** D/Y/B — etiket + ~3 rakam sığacak kompakt hücre */
export const CLASSIC_DYB_FONT_PT = 10
export const CLASSIC_DYB_DIGIT_COUNT = 3
export const CLASSIC_DYB_PAD_X_PT = 3
export const CLASSIC_DYB_GAP_PT = 3
export const CLASSIC_DYB_INSET_Y_PT = 3
export const CLASSIC_DYB_INSET_X_PT = 6
/** Sağ panel içinde Test No sağ kenar boşluğu */
export const CLASSIC_TEST_NO_INSET_X_PT = 4

/** Konu / alt konu önündeki işaret */
export const CLASSIC_TOPIC_MARKER_SIZE_RATIO = 0.55
export const CLASSIC_TOPIC_MARKER_GAP_PT = 4
export const CLASSIC_TOPIC_MARKER_RADIUS_RATIO = 0.28

export type ClassicInfoMarkerKind = 'square' | 'arrow'

export function classicInfoMarkerLayout(
  fontPt: number,
  kind: ClassicInfoMarkerKind = 'square',
): {
  kind: ClassicInfoMarkerKind
  size: number
  /** Ok için yatay genişlik; kutu için size ile aynı */
  width: number
  radius: number
  gap: number
  textOffsetX: number
} {
  if (kind === 'arrow') {
    const size = Math.max(5, fontPt * 0.85)
    const width = size * 1.35
    const gap = CLASSIC_TOPIC_MARKER_GAP_PT
    return { kind, size, width, radius: 0, gap, textOffsetX: width + gap }
  }
  const size = Math.max(3.5, fontPt * CLASSIC_TOPIC_MARKER_SIZE_RATIO)
  const radius = size * CLASSIC_TOPIC_MARKER_RADIUS_RATIO
  const gap = CLASSIC_TOPIC_MARKER_GAP_PT
  return { kind, size, width: size, radius, gap, textOffsetX: size + gap }
}

/** @deprecated — classicInfoMarkerLayout(..., 'square') kullan */
export function classicTopicMarkerLayout(fontPt: number) {
  return classicInfoMarkerLayout(fontPt, 'square')
}

/**
 * Klavyedeki Enter oku — sağa bakış (kalın ┌─▶).
 * Path: y=0 üst, y artışı aşağı (canvas + pdf-lib üst ankraj).
 */
export function classicEnterArrowRightSvgPath(w: number, h: number): string {
  const t = Math.max(1.15, h * 0.3)
  const head = Math.max(2.2, h * 0.42)
  const body = Math.max(t + 1, w - head)
  const mid = t / 2
  return [
    `M 0,${h}`,
    `L 0,0`,
    `L ${body},0`,
    `L ${body},${mid * 0.15}`,
    `L ${body + head},${mid}`,
    `L ${body},${t - mid * 0.15}`,
    `L ${body},${t}`,
    `L ${t},${t}`,
    `L ${t},${h}`,
    'Z',
  ].join(' ')
}

export const CLASSIC_INFO_TEXT_MAX_LEN = 160
export const CLASSIC_INFO_TEXT_MAX_LINES = 6

function softWrapClassicInfoLine(
  text: string,
  maxWidthPt: number,
  measureWidthPt: (s: string) => number,
): string[] {
  const raw = text
  if (!raw) return ['']
  if (!(maxWidthPt > 0) || measureWidthPt(raw) <= maxWidthPt) return [raw]

  const words = raw.split(/\s+/).filter(Boolean)
  if (words.length === 0) return [raw]

  const lines: string[] = []
  let current = ''

  const pushCharBroken = (word: string) => {
    let rest = word
    while (rest.length > 0) {
      if (measureWidthPt(rest) <= maxWidthPt) {
        current = rest
        return
      }
      let lo = 1
      let hi = rest.length
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2)
        if (measureWidthPt(rest.slice(0, mid)) <= maxWidthPt) lo = mid
        else hi = mid - 1
      }
      const take = Math.max(1, lo)
      lines.push(rest.slice(0, take))
      rest = rest.slice(take)
    }
    current = ''
  }

  for (const word of words) {
    const trial = current ? `${current} ${word}` : word
    if (measureWidthPt(trial) <= maxWidthPt) {
      current = trial
      continue
    }
    if (current) lines.push(current)
    if (measureWidthPt(word) > maxWidthPt) pushCharBroken(word)
    else current = word
  }
  if (current) lines.push(current)
  return lines.length ? lines : [raw]
}

/**
 * Shift+Enter satır kırımlarını korur; uzun satırları da genişliğe göre böler.
 */
export function wrapClassicInfoBarText(
  text: string,
  maxWidthPt: number,
  measureWidthPt: (s: string) => number,
  maxLen = CLASSIC_INFO_TEXT_MAX_LEN,
  maxLines = CLASSIC_INFO_TEXT_MAX_LINES,
): string[] {
  const normalized = String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^\s+|\s+$/g, '')
    .slice(0, maxLen)
  if (!normalized) return []

  const out: string[] = []
  for (const hard of normalized.split('\n')) {
    const wrapped = softWrapClassicInfoLine(hard, maxWidthPt, measureWidthPt)
    for (const row of wrapped) {
      out.push(row)
      if (out.length >= maxLines) return out
    }
  }
  return out
}

export const CLASSIC_INFO_PAD_X_PT = 8
export const CLASSIC_DYB_RADIUS_PT = 2
export const CLASSIC_DYB_LABEL_INSET_X_PT = 3
/** Helvetica optik orta — Test No ile aynı (baseline ↔ merkez) */
export const CLASSIC_FONT_OPTICAL_MID_RATIO = 0.36

export type ClassicInfoTopicLineLayout = {
  fontPt: number
  bold: boolean
  italic: boolean
  marker: ReturnType<typeof classicInfoMarkerLayout>
  /** Info bar üstünden marker üst kenarı (pt) — ilk satır */
  markerTopFromInfoTop: number
  /** İlk satırın dikey merkezi (info bar üstünden, pt) */
  centerFromInfoTop: number
  /** Çizilecek satırlar (Shift+Enter + soft wrap) */
  texts: string[]
  /** Blok yüksekliği (pt) */
  blockH: number
}

export function layoutClassicInfoBarTopicLines(params: {
  infoH: number
  topicFontPt: number
  subFontPt: number
  hasTopic: boolean
  hasSub: boolean
  gapPt: number
  topicTexts?: string[]
  subTexts?: string[]
  topicBold?: boolean
  topicItalic?: boolean
  subBold?: boolean
  subItalic?: boolean
}): {
  topic: ClassicInfoTopicLineLayout | null
  sub: ClassicInfoTopicLineLayout | null
} {
  const {
    infoH,
    topicFontPt,
    subFontPt,
    hasTopic,
    hasSub,
    gapPt,
    topicTexts = [],
    subTexts = [],
    topicBold = true,
    topicItalic = false,
    subBold = false,
    subItalic = true,
  } = params
  const topicLines = hasTopic ? Math.max(1, topicTexts.length || 1) : 0
  const subLines = hasSub ? Math.max(1, subTexts.length || 1) : 0
  const topicBlockH = topicLines * topicFontPt
  const subBlockH = subLines * subFontPt
  const leftBlockH =
    (hasTopic ? topicBlockH : 0) + (hasTopic && hasSub ? gapPt : 0) + (hasSub ? subBlockH : 0)
  let cursor = (infoH - leftBlockH) / 2

  let topic: ClassicInfoTopicLineLayout | null = null
  let sub: ClassicInfoTopicLineLayout | null = null

  if (hasTopic) {
    const marker = classicInfoMarkerLayout(topicFontPt, 'square')
    const centerFromInfoTop = cursor + topicFontPt / 2
    const markerCenterFromInfoTop = cursor + topicBlockH / 2
    topic = {
      fontPt: topicFontPt,
      bold: topicBold,
      italic: topicItalic,
      marker,
      markerTopFromInfoTop: markerCenterFromInfoTop - marker.size / 2,
      centerFromInfoTop,
      texts: topicTexts.length ? topicTexts : [''],
      blockH: topicBlockH,
    }
    cursor += topicBlockH + (hasSub ? gapPt : 0)
  }
  if (hasSub) {
    const marker = classicInfoMarkerLayout(hasTopic ? topicFontPt : subFontPt, 'square')
    const centerFromInfoTop = cursor + subFontPt / 2
    const markerCenterFromInfoTop = cursor + subBlockH / 2
    sub = {
      fontPt: subFontPt,
      bold: subBold,
      italic: subItalic,
      marker,
      markerTopFromInfoTop: markerCenterFromInfoTop - marker.size / 2,
      centerFromInfoTop,
      texts: subTexts.length ? subTexts : [''],
      blockH: subBlockH,
    }
  }

  return { topic, sub }
}

/** Satır sayısı bilindiğinde bilgi şeridi için gereken min yükseklik (pt) */
export function classicInfoBarTopicBlockHeightPt(params: {
  topicFontPt: number
  subFontPt: number
  topicLineCount: number
  subLineCount: number
  gapPt: number
}): number {
  const { topicFontPt, subFontPt, topicLineCount, subLineCount, gapPt } = params
  const hasTopic = topicLineCount > 0
  const hasSub = subLineCount > 0
  return (
    (hasTopic ? topicLineCount * topicFontPt : 0) +
    (hasTopic && hasSub ? gapPt : 0) +
    (hasSub ? subLineCount * subFontPt : 0)
  )
}

/** Layout için Helvetica/Arial yaklaşık genişlik (pt) — wrap tahmini */
export function approxClassicInfoTextWidthPt(
  text: string,
  fontPt: number,
  bold = false,
): number {
  const ratio = bold ? 0.56 : 0.5
  return String(text ?? '').length * fontPt * ratio
}

/** PDF (y yukarı): baseline = optik merkez − ratio·pt */
export function classicTextBaselinePdf(centerY: number, fontPt: number): number {
  return centerY - fontPt * CLASSIC_FONT_OPTICAL_MID_RATIO
}

/** Canvas (y aşağı): baseline = optik merkez + ratio·px */
export function classicTextBaselineCanvas(centerY: number, fontPx: number): number {
  return centerY + fontPx * CLASSIC_FONT_OPTICAL_MID_RATIO
}

export type ClassicTopRowLayout = {
  gap: number
  leftW: number
  midW: number
  rightW: number
  xLeft: number
  xMid: number
  xRight: number
}

export type ClassicDyBLabel = {
  text: string
  color: string
}

export const CLASSIC_DYB_LABELS: readonly ClassicDyBLabel[] = [
  { text: 'D', color: '#16A34A' },
  { text: 'Y', color: '#DC2626' },
  { text: 'B', color: '#0F172A' },
] as const

/** Test No ile aynı: etiket dolgusu üzerindeki yazı */
export const CLASSIC_DYB_LABEL_TEXT_COLOR = '#FFFFFF'
export const CLASSIC_DYB_BORDER_PT = 1.25

export function classicDyBCellWidthPt(fontPt = CLASSIC_DYB_FONT_PT): number {
  const labelW = fontPt * 0.85
  const digitsW = fontPt * 0.55 * CLASSIC_DYB_DIGIT_COUNT
  return Math.ceil(labelW + digitsW + CLASSIC_DYB_PAD_X_PT * 2)
}

export function classicDyBGroupWidthPt(fontPt = CLASSIC_DYB_FONT_PT): number {
  const cell = classicDyBCellWidthPt(fontPt)
  return cell * 3 + CLASSIC_DYB_GAP_PT * 2
}

/** Toplam grup genişliğinden hücre genişliği */
export function classicDyBCellWidthFromGroupPt(groupW: number): number {
  return Math.max(14, (groupW - CLASSIC_DYB_GAP_PT * 2) / 3)
}

/** Sol etiket dolgu genişliği — sağda rakam alanı boş kalır */
export function classicDyBLabelFillWidthPt(cellW: number, fontPt: number): number {
  const letterApprox = fontPt * 0.72
  const naturalLeft = letterApprox + CLASSIC_DYB_PAD_X_PT * 2
  const numMin = Math.max(12, fontPt * 0.55 * CLASSIC_DYB_DIGIT_COUNT)
  if (naturalLeft + numMin <= cellW) return Math.ceil(naturalLeft)
  return Math.max(cellW * 0.32, cellW - numMin)
}

export function classicTopBannerHeightPt(subjectFontPt: number, padYPt: number): number {
  return Math.max(
    CLASSIC_TOP_BANNER_H_MIN_PT,
    Math.round(subjectFontPt + padYPt * 2),
  )
}

export function layoutClassicBannerTopRow(params: {
  contentW: number
  ml: number
  textWidthPt: number
  padXPt: number
}): ClassicTopRowLayout {
  const gap = CLASSIC_TOP_BANNER_GAP_PT
  const { contentW, ml, textWidthPt, padXPt } = params
  const rightMin = CLASSIC_RIGHT_BOX_MIN_W_PT

  const maxMid = Math.max(
    CLASSIC_SUBJECT_BOX_MIN_W_PT,
    contentW - 2 * gap - CLASSIC_LEFT_BOX_MIN_W_PT - rightMin,
  )
  let midW = Math.min(
    maxMid,
    Math.max(CLASSIC_SUBJECT_BOX_MIN_W_PT, textWidthPt + padXPt * 2),
  )

  let remaining = contentW - midW - 2 * gap
  if (remaining < CLASSIC_LEFT_BOX_MIN_W_PT + rightMin) {
    midW = Math.max(
      CLASSIC_SUBJECT_BOX_MIN_W_PT,
      contentW - 2 * gap - CLASSIC_LEFT_BOX_MIN_W_PT - rightMin,
    )
    remaining = contentW - midW - 2 * gap
  }

  let rightW = Math.max(rightMin, remaining / 2)
  let leftW = remaining - rightW
  if (leftW < CLASSIC_LEFT_BOX_MIN_W_PT) {
    leftW = CLASSIC_LEFT_BOX_MIN_W_PT
    rightW = remaining - leftW
  }

  return {
    gap,
    leftW,
    midW,
    rightW,
    xLeft: ml,
    xMid: ml + leftW + gap,
    xRight: ml + leftW + gap + midW + gap,
  }
}

/** Deneme ÖSYM: orta ders kutusu yok — sol sınav kodu / sağ kitapçık */
export function layoutClassicTrialBannerTopRow(params: {
  contentW: number
  ml: number
}): ClassicTopRowLayout {
  const gap = CLASSIC_TOP_BANNER_GAP_PT
  const { contentW, ml } = params
  const leftW = Math.max(CLASSIC_LEFT_BOX_MIN_W_PT, (contentW - gap) * 0.45)
  const rightW = Math.max(CLASSIC_RIGHT_BOX_MIN_W_PT, contentW - gap - leftW)
  return {
    gap,
    leftW,
    midW: 0,
    rightW,
    xLeft: ml,
    xMid: ml + leftW + gap,
    xRight: ml + leftW + gap,
  }
}

/** Info bar — D/Y/B; rightEdgeX = grubun sağ kenarı (pt) */
export function classicDyBBoxRectsRightAligned(params: {
  rightEdgeX: number
  boxY: number
  boxH: number
  fontPt?: number
  /** Toplam D·Y·B grup genişliği (pt); yoksa fonttan hesaplanır */
  groupW?: number
}): Array<{ x: number; y: number; w: number; h: number; label: ClassicDyBLabel }> {
  const { rightEdgeX, boxY, boxH, fontPt = CLASSIC_DYB_FONT_PT } = params
  const gap = CLASSIC_DYB_GAP_PT
  const groupW = params.groupW ?? classicDyBGroupWidthPt(fontPt)
  const cellW = classicDyBCellWidthFromGroupPt(groupW)
  const startX = rightEdgeX - groupW
  const cellH = Math.max(10, boxH)

  return CLASSIC_DYB_LABELS.map((label, i) => ({
    x: startX + i * (cellW + gap),
    y: boxY,
    w: cellW,
    h: cellH,
    label,
  }))
}

/** @deprecated use classicDyBBoxRectsRightAligned */
export function classicDyBBoxRectsCentered(params: {
  centerX: number
  boxY: number
  boxH: number
  fontPt?: number
}): Array<{ x: number; y: number; w: number; h: number; label: ClassicDyBLabel }> {
  const groupW = classicDyBGroupWidthPt(params.fontPt)
  return classicDyBBoxRectsRightAligned({
    rightEdgeX: params.centerX + groupW / 2,
    boxY: params.boxY,
    boxH: params.boxH,
    fontPt: params.fontPt,
  })
}
