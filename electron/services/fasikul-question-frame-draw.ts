/**
 * Fasikül soru çerçevesi — PDF çizimi (dolgu + kenarlık + referans başlık şekilleri).
 */
import type { PDFFont, PDFPage } from 'pdf-lib'
import { rgb, type RGB } from 'pdf-lib'

export type FasikulFramePdfSettings = {
  enabled?: boolean
  fillColor?: string
  fillOpacityPct?: number
  cornerRadiusPx?: number
  innerPaddingPx?: number
  borderStyle?: string
  borderWidth?: number
  borderColor?: string
  labelText?: string
  labelColor?: string
  labelPosition?: string
  labelAlign?: string
  badgeStyle?: string
  badgeOffsetX?: number
  badgeOffsetY?: number
  iconId?: string
  iconTextPlacement?: string
  labelSideTextDir?: string
  presetId?: string
}

function parseHex(hex: string | undefined): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? '').trim())
  if (!m) return null
  const n = parseInt(m[1]!, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function colorFromHex(hex: string | undefined, fallback = rgb(0.06, 0.09, 0.16)): RGB {
  const p = parseHex(hex)
  if (!p) return fallback
  return rgb(p.r / 255, p.g / 255, p.b / 255)
}

function lightenRgb(c: RGB, amount: number): RGB {
  return rgb(
    c.red + (1 - c.red) * amount,
    c.green + (1 - c.green) * amount,
    c.blue + (1 - c.blue) * amount,
  )
}

/** css-px benzeri değer → pt (96dpi varsayımı) */
function pxToPt(px: number): number {
  if (!Number.isFinite(px)) return 0
  return Math.max(0, px * 0.75)
}

/** pdf-lib drawSvgPath: y = şeklin ÜST kenarı */
function roundRectPath(w: number, h: number, r: number): string {
  const rad = Math.min(Math.max(0, r), w / 2, h / 2)
  if (rad <= 0.01) {
    return `M 0,0 L ${w},0 L ${w},${h} L 0,${h} Z`
  }
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

function normalizeLabelPosition(raw: unknown): string {
  const v = String(raw || '')
  if (v === 'left') return 'top-left'
  if (v === 'center') return 'top-center'
  if (v === 'right') return 'top-right'
  return v || 'top-left'
}

function isSide(pos: string): boolean {
  return pos === 'middle-left' || pos === 'middle-right'
}

function clampBadgeOffset(pos: string, ox: number, oy: number): { x: number; y: number } {
  if (isSide(pos)) return { x: 0, y: oy }
  return { x: ox, y: 0 }
}

export const FASIKUL_FRAME_BADGE_TOP_RESERVE_PT = 28 * 0.75 + 16 * 0.75 // ~33 pt

function normalizeBadgeStyle(raw: unknown): string {
  const v = String(raw || '')
  if (v === 'classic') return 'ring-pill'
  if (v === 'folded-tab') return 'fold-flag'
  if (v === 'angular-ribbon' || v === 'reverse-angular-ribbon') return 'slash-trail'
  return v || 'slash-trail'
}

/** Örnek (numara) — yalnızca ring-pill */
export function isFasikulOrnekNumberedFrame(frame: unknown): boolean {
  if (!frame || typeof frame !== 'object') return false
  const o = frame as { enabled?: boolean; badgeStyle?: unknown }
  if (o.enabled !== true) return false
  return normalizeBadgeStyle(o.badgeStyle) === 'ring-pill'
}

/**
 * Gerçek soru sarmalayan hazır tasarımlar (ÖSYM / Örnek).
 * Formül, Kural, Unutma vb. içerik kutusu — optik / display_number atlanır.
 */
export function isFasikulQuestionWrapperFrame(frame: unknown): boolean {
  if (!frame || typeof frame !== 'object') return false
  const o = frame as { enabled?: boolean; presetId?: unknown; badgeStyle?: unknown }
  if (o.enabled !== true) return false
  const id = String(o.presetId || '')
  if (id === 'kural' || id === 'ogreniyorum') return true
  return normalizeBadgeStyle(o.badgeStyle) === 'ring-pill'
}

/** Optik / soru numarası verilecek mi? (layout-engine ile frontend uyumu) */
export function isOptikAnswerableLayoutQuestion(q: {
  content_type?: unknown
  fasikulEmptyRows?: unknown
  fasikulFrame?: unknown
}): boolean {
  if (String(q.content_type ?? 'question') === 'explanation') return false
  const emptyRows = Number(q.fasikulEmptyRows ?? 0)
  if (Number.isFinite(emptyRows) && emptyRows > 0) return false
  const frame = q.fasikulFrame
  if (
    frame &&
    typeof frame === 'object' &&
    (frame as { enabled?: boolean }).enabled === true &&
    !isFasikulQuestionWrapperFrame(frame)
  ) {
    return false
  }
  return true
}

/** Cevap anahtarı etiketi: ÖRNEK 1, ÖSYM, … */
export function resolveFasikulAnswerKeyLabel(
  q: { order_index?: unknown; fasikulFrame?: unknown },
  ornekNumberByOrder: Map<number, number>,
  fallbackNum: number,
): string {
  const frame = q.fasikulFrame
  if (!frame || typeof frame !== 'object' || !isFasikulQuestionWrapperFrame(frame)) {
    return String(fallbackNum)
  }
  const o = frame as {
    labelText?: unknown
    presetId?: unknown
  }
  const custom = String(o.labelText ?? '').trim()
  const presetId = String(o.presetId || '')
  if (isFasikulOrnekNumberedFrame(frame)) {
    const base = custom || 'ÖRNEK'
    const oi = Number(q.order_index)
    const n = Number.isFinite(oi) ? ornekNumberByOrder.get(oi) : undefined
    return n != null ? `${base} ${n}` : base
  }
  if (presetId === 'kural') return custom || 'ÖSYM'
  return custom || String(fallbackNum)
}

/** Layout sırasına göre Örnek rozet numarası; diğer çerçeveler atlanır */
export function buildFasikulOrnekNumberByOrderIndex(
  questions: Array<{ order_index?: unknown; fasikulFrame?: unknown }>,
): Map<number, number> {
  const sorted = [...questions].sort(
    (a, b) => (Number(a.order_index) || 0) - (Number(b.order_index) || 0),
  )
  const map = new Map<number, number>()
  let n = 0
  for (const q of sorted) {
    const oi = Number(q.order_index)
    if (!Number.isFinite(oi)) continue
    if (!isFasikulOrnekNumberedFrame(q.fasikulFrame)) continue
    n += 1
    map.set(oi, n)
  }
  return map
}

/** Çerçeve açıkken bu soruda kareli alan çizilsin mi? */
export function fasikulFrameShowsScratchGrid(frame: unknown): boolean {
  if (!frame || typeof frame !== 'object') return true
  const o = frame as { enabled?: boolean; showScratchGrid?: unknown; badgeStyle?: unknown }
  if (o.enabled !== true) return true
  if (typeof o.showScratchGrid === 'boolean') return o.showScratchGrid
  return normalizeBadgeStyle(o.badgeStyle) === 'ring-pill'
}

/** Üst rozet için layout yedekleme (pt) */
export function fasikulFrameBadgeTopReservePt(frame: unknown): number {
  if (!frame || typeof frame !== 'object') return 0
  const o = frame as { enabled?: boolean; labelPosition?: unknown }
  if (!o.enabled) return 0
  const pos = normalizeLabelPosition(o.labelPosition)
  if (pos !== 'top-left' && pos !== 'top-center' && pos !== 'top-right') return 0
  return FASIKUL_FRAME_BADGE_TOP_RESERVE_PT
}

/**
 * @param x sol kenar (pt)
 * @param yBottom alt kenar (pt) — pdf-lib rectangle y
 * @param width / height dış kutu (pt)
 * @param layers fill = dolgu (görsel altı); chrome = kenarlık+rozet (görsel üstü); all = ikisi
 */
export function drawFasikulQuestionFrameOnPdfPage(
  page: PDFPage,
  args: {
    x: number
    yBottom: number
    width: number
    height: number
    frame: FasikulFramePdfSettings
    font: PDFFont
    questionNumber?: number | null
    layers?: 'fill' | 'chrome' | 'all'
  },
): void {
  const frame = args.frame
  if (!frame?.enabled) return
  const { x, yBottom, width: w, height: h, font } = args
  if (!(w > 0) || !(h > 0)) return
  const layers = args.layers ?? 'all'

  const yTop = yBottom + h
  const radiusPt = Math.min(pxToPt(Number(frame.cornerRadiusPx) || 0), w / 2, h / 2)
  const path = roundRectPath(w, h, radiusPt)

  const borderStyle = String(frame.borderStyle ?? 'solid')
  const fillOpacity = Math.max(0, Math.min(1, (Number(frame.fillOpacityPct) || 100) / 100))
  const fill = parseHex(frame.fillColor)
  const hasVisibleBox = borderStyle !== 'none' || fillOpacity > 0

  if ((layers === 'fill' || layers === 'all') && hasVisibleBox && fill && fillOpacity > 0) {
    page.drawSvgPath(path, {
      x,
      y: yTop,
      color: rgb(fill.r / 255, fill.g / 255, fill.b / 255),
      opacity: fillOpacity,
      borderWidth: 0,
    })
  }

  if ((layers === 'chrome' || layers === 'all') && hasVisibleBox && borderStyle !== 'none') {
    const borderW = Math.max(0.5, pxToPt(Number(frame.borderWidth) || 2))
    const borderColor = colorFromHex(frame.borderColor)
    if (borderStyle === 'double') {
      const outer = Math.max(borderW + 0.75, 2.25)
      page.drawSvgPath(path, {
        x,
        y: yTop,
        borderColor,
        borderWidth: outer,
      })
      const inset = outer * 0.55
      const iw = Math.max(1, w - inset * 2)
      const ih = Math.max(1, h - inset * 2)
      const ir = Math.max(0, radiusPt - inset)
      page.drawSvgPath(roundRectPath(iw, ih, ir), {
        x: x + inset,
        y: yTop - inset,
        borderColor,
        borderWidth: Math.max(0.6, borderW * 0.65),
      })
    } else {
      const dash =
        borderStyle === 'dashed'
          ? [3.5, 2.5]
          : borderStyle === 'dotted'
            ? [1.2, 1.8]
            : undefined
      page.drawSvgPath(path, {
        x,
        y: yTop,
        borderColor,
        borderWidth: borderW,
        ...(dash ? { borderDashArray: dash } : {}),
      })
    }
  }

  if (layers === 'chrome' || layers === 'all') {
    drawFasikulBadge(page, {
      frameX: x,
      frameYTop: yTop,
      frameW: w,
      frameH: h,
      frame,
      font,
      questionNumber: args.questionNumber,
    })
  }
}

function drawFasikulBadge(
  page: PDFPage,
  args: {
    frameX: number
    frameYTop: number
    frameW: number
    frameH: number
    frame: FasikulFramePdfSettings
    font: PDFFont
    questionNumber?: number | null
  },
): void {
  const { frameX, frameYTop, frameW, frameH, frame, font } = args
  const questionNumber = args.questionNumber
  const textRaw = String(frame.labelText ?? '').trim() || 'ÖRNEK'
  const label = textRaw
  const fontPt = 7.2
  const textW = font.widthOfTextAtSize(label, fontPt)
  const padX = 5
  const padY = 2.4
  const pillH = fontPt + padY * 2
  const style = normalizeBadgeStyle(frame.badgeStyle)
  const accent = colorFromHex(frame.labelColor || frame.borderColor, rgb(0.05, 0.3, 0.48))

  const pos = normalizeLabelPosition(frame.labelPosition)
  const offsets = clampBadgeOffset(
    pos,
    pxToPt(Number(frame.badgeOffsetX) || 0),
    pxToPt(Number(frame.badgeOffsetY) || 0),
  )

  // Süs: üç nokta / köşe noktası
  if (style === 'flat-bar-dots') {
    const dy = 2.2
    for (let i = 0; i < 3; i++) {
      page.drawCircle({
        x: frameX + frameW - 18 + i * 5.5,
        y: frameYTop - dy,
        size: 1.7,
        color: accent,
      })
    }
  }
  if (style === 'slash-corner-dot') {
    page.drawCircle({
      x: frameX + frameW,
      y: frameYTop,
      size: 2.8,
      color: accent,
    })
  }

  const slashExtra = style === 'slash-trail' || style === 'slash-corner-dot' ? 14 : 0
  const iconExtra =
    style === 'ring-pill' ||
    style === 'tip-pill' ||
    style === 'note-pill' ||
    style === 'warn-pill' ||
    style === 'chevron-bar'
      ? 12
      : 0
  const pillW = Math.max(textW + padX * 2, 28) + (style.startsWith('slash') ? 6 : 0)
  const isSlash = style === 'slash-trail' || style === 'slash-corner-dot'
  const isRingLike =
    style === 'ring-pill' ||
    style === 'tip-pill' ||
    style === 'note-pill' ||
    style === 'warn-pill'
  /** Önizleme: slash/formül 22 / ring+kural 28 / gap 16px */
  const badgeH = isSlash
    ? pxToPt(22)
    : isRingLike
      ? pxToPt(28)
      : pillH
  const gapPt = isSlash || isRingLike ? pxToPt(16) : pillH * 0.5

  let bx = frameX
  let byTop = frameYTop + gapPt + badgeH

  switch (pos) {
    case 'top-center':
      bx = frameX + (frameW - pillW - slashExtra - iconExtra) / 2 + offsets.x
      byTop = frameYTop + gapPt + badgeH + offsets.y
      break
    case 'top-right':
      bx = frameX + frameW - pillW - slashExtra + offsets.x
      byTop = frameYTop + gapPt + badgeH + offsets.y
      break
    case 'bottom-left':
      bx = frameX + offsets.x
      byTop = frameYTop - frameH - gapPt - offsets.y
      break
    case 'bottom-center':
      bx = frameX + (frameW - pillW) / 2 + offsets.x
      byTop = frameYTop - frameH - gapPt - offsets.y
      break
    case 'bottom-right':
      bx = frameX + frameW - pillW + offsets.x
      byTop = frameYTop - frameH - gapPt - offsets.y
      break
    case 'middle-left':
      bx = frameX - gapPt - pillW - iconExtra + offsets.x
      byTop = frameYTop - (frameH - badgeH) / 2 + offsets.y
      break
    case 'middle-right':
      bx = frameX + frameW + gapPt + offsets.x
      byTop = frameYTop - (frameH - badgeH) / 2 + offsets.y
      break
    case 'top-left':
    default:
      bx = frameX + offsets.x
      byTop = frameYTop + gapPt + badgeH + offsets.y
      break
  }

  const byBottom = byTop - badgeH
  /** Önizleme ile birebir: slant 8, radius 4, trailW 13, gap 3 */
  const slant = pxToPt(8)
  const leftR = pxToPt(4)
  const trailW = pxToPt(13)
  const trailGap = pxToPt(3)

  if (isSlash) {
    // Önizleme SlashTrailBadge: 22px kutu / 11px yazı (ÖRNEK ile aynı)
    const labelFont = pxToPt(11)
    const padL = pxToPt(10)
    const padR = pxToPt(8)
    const text = (label || 'FORMÜL').toLocaleUpperCase('tr-TR')
    const textWSlash = font.widthOfTextAtSize(text, labelFont)
    const bodyW = Math.max(padL + textWSlash + padR, pxToPt(40))
    const mainW = bodyW + slant
    const mainPath = [
      `M ${leftR},0`,
      `L ${bodyW},0`,
      `L ${mainW},${badgeH}`,
      `L ${leftR},${badgeH}`,
      `Q 0,${badgeH} 0,${badgeH - leftR}`,
      `L 0,${leftR}`,
      `Q 0,0 ${leftR},0`,
      'Z',
    ].join(' ')
    page.drawSvgPath(mainPath, { x: bx, y: byTop, color: accent })
    const t1 = lightenRgb(accent, 0.55)
    const t2 = lightenRgb(accent, 0.78)
    const trailPath = (w: number) =>
      [
        `M 0,0`,
        `L ${Math.max(0.5, w - slant)},0`,
        `L ${w},${badgeH}`,
        `L ${slant},${badgeH}`,
        'Z',
      ].join(' ')
    const x1 = bx + mainW - trailGap
    const x2 = x1 + trailW - trailGap
    page.drawSvgPath(trailPath(trailW), { x: x1, y: byTop, color: t1 })
    page.drawSvgPath(trailPath(trailW), { x: x2, y: byTop, color: t2 })
    const textY = byBottom + (badgeH - labelFont) / 2 + labelFont * 0.12
    page.drawText(text, {
      x: bx + padL,
      y: textY,
      size: labelFont,
      font,
      color: rgb(1, 1, 1),
    })
    return
  }

  if (style === 'fold-flag') {
    page.drawRectangle({
      x: bx,
      y: byBottom,
      width: pillW,
      height: pillH,
      color: accent,
    })
    const fold = lightenRgb(accent, 0.55)
    page.drawSvgPath(`M ${pillW - 7},0 L ${pillW},0 L ${pillW},5.5 Z`, {
      x: bx,
      y: byBottom,
      color: fold,
    })
    page.drawText(label, {
      x: bx + padX,
      y: byBottom + (pillH - fontPt) / 2 + fontPt * 0.1,
      size: fontPt,
      font,
      color: rgb(1, 1, 1),
    })
    return
  }

  if (style === 'flat-bar-dots') {
    page.drawRectangle({
      x: bx,
      y: byBottom,
      width: pillW,
      height: pillH * 0.9,
      color: accent,
    })
    page.drawText(label, {
      x: bx + padX,
      y: byBottom + (pillH * 0.9 - fontPt) / 2 + fontPt * 0.1,
      size: fontPt,
      font,
      color: rgb(1, 1, 1),
    })
    return
  }

  if (style === 'chevron-bar') {
    const cx = bx
    const cy = byTop - pillH / 2
    // çift chevron (sol)
    const chevron = (ox: number) => {
      page.drawSvgPath(
        [`M ${ox + 8},${-pillH / 2 + 1}`, `L ${ox + 1},0`, `L ${ox + 8},${pillH / 2 - 1}`].join(
          ' ',
        ),
        {
          x: cx,
          y: cy,
          borderColor: accent,
          borderWidth: 2.2,
        },
      )
    }
    chevron(0)
    chevron(4)
    page.drawRectangle({
      x: bx + 12,
      y: byBottom,
      width: pillW,
      height: pillH,
      color: accent,
    })
    page.drawText(label, {
      x: bx + 12 + padX,
      y: byBottom + (pillH - fontPt) / 2 + fontPt * 0.1,
      size: fontPt,
      font,
      color: rgb(1, 1, 1),
    })
    return
  }

  if (style === 'ring-pill') {
    // Önizleme RingPillBadge ile birebir (CSS px → pt @ 96dpi)
    const circleD = pxToPt(28)
    const circleR = circleD / 2
    const labelFont = pxToPt(11)
    const padL = pxToPt(10)
    const padR = pxToPt(16)
    const pillHRing = pxToPt(22)
    const numStr =
      questionNumber != null && Number.isFinite(questionNumber)
        ? String(Math.max(1, Math.round(questionNumber))).padStart(2, '0')
        : '01'
    const text = (label || 'ÖRNEK').toLocaleUpperCase('tr-TR')
    const textW = font.widthOfTextAtSize(text, labelFont)
    const pillWRing = Math.max(padL + textW + padR, pxToPt(40))
    const pillBg = lightenRgb(accent, 0.78)
    // badgeH ring için 28px; hapı dikey ortala
    const pillBottom = byBottom + (badgeH - pillHRing) / 2
    const pillTop = pillBottom + pillHRing
    page.drawSvgPath(roundRectPath(pillWRing, pillHRing, pxToPt(6)), {
      x: bx,
      y: pillTop,
      color: pillBg,
    })
    const textY = pillBottom + (pillHRing - labelFont) / 2 + labelFont * 0.12
    page.drawText(text, {
      x: bx + padL,
      y: textY,
      size: labelFont,
      font,
      color: accent,
    })
    // Hap sağ kenarı ≈ daire merkezi (önizleme: absolute right + pr-14)
    const cx = bx + pillWRing
    const cy = byTop - badgeH / 2
    page.drawCircle({
      x: cx,
      y: cy,
      size: circleR,
      color: accent,
    })
    const numFont = pxToPt(12)
    const numW = font.widthOfTextAtSize(numStr, numFont)
    page.drawText(numStr, {
      x: cx - numW / 2,
      y: cy - numFont * 0.32,
      size: numFont,
      font,
      color: rgb(1, 1, 1),
    })
    return
  }

  if (style === 'tip-pill' || style === 'note-pill' || style === 'warn-pill') {
    // Önizleme TipPillBadge ≈ RingPillBadge ölçüleri (22 / 11 / 28)
    const circleD = pxToPt(28)
    const circleR = circleD / 2
    const labelFont = pxToPt(11)
    const padL = pxToPt(10)
    const padR = pxToPt(16)
    const pillHTip = pxToPt(22)
    const fallback =
      style === 'note-pill' ? 'BİLGİ NOTU' : style === 'warn-pill' ? 'UNUTMA' : 'KURAL'
    const text = (label || fallback).toLocaleUpperCase('tr-TR')
    const textWTip = font.widthOfTextAtSize(text, labelFont)
    const pillWTip = Math.max(padL + textWTip + padR, pxToPt(40))
    const light = lightenRgb(accent, 0.35)
    const pillBottom = byBottom + (badgeH - pillHTip) / 2
    const pillTop = pillBottom + pillHTip
    page.drawSvgPath(roundRectPath(pillWTip, pillHTip, pxToPt(6)), {
      x: bx,
      y: pillTop,
      color: accent,
    })
    page.drawSvgPath(roundRectPath(pillWTip * 0.45, pillHTip, pxToPt(6)), {
      x: bx + pillWTip * 0.55,
      y: pillTop,
      color: light,
    })
    const textY = pillBottom + (pillHTip - labelFont) / 2 + labelFont * 0.12
    page.drawText(text, {
      x: bx + padL,
      y: textY,
      size: labelFont,
      font,
      color: rgb(1, 1, 1),
    })
    const cx = bx + pillWTip
    const cy = byTop - badgeH / 2
    page.drawCircle({
      x: cx,
      y: cy,
      size: circleR,
      color: accent,
    })
    if (style === 'note-pill') {
      // Kalem SVG (önizleme ile aynı; SVG y↓ → PDF y↑)
      const sw = pxToPt(1.35)
      page.drawSvgPath(
        [
          `M ${pxToPt(1.6)},${pxToPt(4.6)}`,
          `L ${pxToPt(4.6)},${pxToPt(1.6)}`,
          `L ${pxToPt(-1.8)},${pxToPt(-4.8)}`,
          `L ${pxToPt(-4.6)},${pxToPt(-5.2)}`,
          `L ${pxToPt(-4.2)},${pxToPt(-2.4)}`,
          'Z',
        ].join(' '),
        {
          x: cx,
          y: cy,
          borderColor: rgb(1, 1, 1),
          borderWidth: sw,
        },
      )
      page.drawSvgPath(
        `M ${pxToPt(0.4)},${pxToPt(3.4)} L ${pxToPt(3.4)},${pxToPt(0.4)}`,
        {
          x: cx,
          y: cy,
          borderColor: rgb(1, 1, 1),
          borderWidth: pxToPt(1.2),
        },
      )
      page.drawSvgPath(
        `M ${pxToPt(-4.4)},${pxToPt(-4.4)} L ${pxToPt(-3.6)},${pxToPt(-3.6)}`,
        {
          x: cx,
          y: cy,
          borderColor: rgb(1, 1, 1),
          borderWidth: pxToPt(1.2),
        },
      )
    } else if (style === 'warn-pill') {
      // Ünlem
      page.drawSvgPath(`M 0,${pxToPt(4.6)} L 0,${pxToPt(-1.6)}`, {
        x: cx,
        y: cy,
        borderColor: rgb(1, 1, 1),
        borderWidth: pxToPt(2.4),
      })
      page.drawCircle({
        x: cx,
        y: cy - pxToPt(4.1),
        size: pxToPt(1.15),
        color: rgb(1, 1, 1),
      })
    } else {
      const strokeW = pxToPt(2.4)
      page.drawSvgPath(
        [
          `M ${pxToPt(-4.4)},${pxToPt(-0.1)}`,
          `L ${pxToPt(-1.3)},${pxToPt(-3.3)}`,
          `L ${pxToPt(4.4)},${pxToPt(3.6)}`,
        ].join(' '),
        {
          x: cx,
          y: cy,
          borderColor: rgb(1, 1, 1),
          borderWidth: strokeW,
        },
      )
    }
    return
  }

  // fallback
  page.drawSvgPath(roundRectPath(pillW, pillH, 2), {
    x: bx,
    y: byTop,
    color: accent,
  })
  page.drawText(label, {
    x: bx + padX,
    y: byBottom + (pillH - fontPt) / 2 + fontPt * 0.1,
    size: fontPt,
    font,
    color: rgb(1, 1, 1),
  })
}
