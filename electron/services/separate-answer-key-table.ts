/**
 * Ayrı sayfa cevap anahtarı — şık tablo (PDF).
 * src/utils/separateAnswerKeyTable.ts ile ölçüleri senkron tut.
 */

import { rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib'

/** Cevap anahtarı sabit renkleri — tema renginden bağımsız */
export const ANSWER_KEY_NAVY_HEX = '#0A1931'
export const ANSWER_KEY_RED_HEX = '#DC2626'

export const SEPARATE_AK = {
  HEADER_H_PT: 28,
  ROW_H_PT: 22,
  BORDER_PT: 1,
  GRID_PT: 0.45,
  TITLE_FONT_PT: 13,
  NUM_FONT_PT: 9.5,
  ANS_FONT_PT: 11,
  PAIRS_PER_ROW: 5,
  BOTTOM_PAD_PT: 2,
  CORNER_R_PT: 6,
  PILL_PAD_X_PT: 5,
  PILL_H_PT: 15,
  ACCENT_BAR_PT: 2.75,
  TOP_GAP_PT: 6,
} as const

const PT_PER_MM = 72 / 25.4
const FOOTER_TOP_OFFSET_MM = 12.35

function mmToPt(mm: number): number {
  return (mm * PT_PER_MM)
}

export function separateAnswerKeyCapacity(params: {
  availableHeightPt: number
  pairsPerRow?: number
}): { maxRows: number; capacity: number; pairsPerRow: number } {
  const pairs = Math.max(1, params.pairsPerRow ?? SEPARATE_AK.PAIRS_PER_ROW)
  const available = Math.max(
    0,
    params.availableHeightPt - SEPARATE_AK.HEADER_H_PT - SEPARATE_AK.BOTTOM_PAD_PT,
  )
  const maxRows =
    available >= SEPARATE_AK.ROW_H_PT
      ? Math.floor(available / SEPARATE_AK.ROW_H_PT)
      : 0
  return { maxRows, capacity: maxRows * pairs, pairsPerRow: pairs }
}

export function countSeparateAnswerKeyPages(params: {
  itemCount: number
  pageHpt: number
  marginTopMm: number
  marginBottomMm: number
  pairsPerRow?: number
}): number {
  const { itemCount, pageHpt, marginTopMm, marginBottomMm } = params
  if (itemCount <= 0) return 0
  const mt = mmToPt(marginTopMm)
  const mb = mmToPt(marginBottomMm)
  const footerTop = mb + mmToPt(FOOTER_TOP_OFFSET_MM)
  const effectiveBottom = footerTop + mmToPt(2)
  const top = pageHpt - mt - SEPARATE_AK.TOP_GAP_PT
  let y0 = top - 8
  let pages = 1
  let remaining = itemCount
  const pairs = Math.max(1, params.pairsPerRow ?? SEPARATE_AK.PAIRS_PER_ROW)
  while (remaining > 0) {
    const maxH = Math.max(0, y0 - effectiveBottom)
    const { maxRows, capacity } = separateAnswerKeyCapacity({
      availableHeightPt: maxH,
      pairsPerRow: pairs,
    })
    if (maxRows <= 0 || capacity <= 0) {
      pages += 1
      y0 = top - 8
      continue
    }
    const consumed = Math.min(capacity, remaining)
    const rows = Math.ceil(consumed / pairs)
    const tableH =
      SEPARATE_AK.HEADER_H_PT + rows * SEPARATE_AK.ROW_H_PT + SEPARATE_AK.BOTTOM_PAD_PT
    y0 -= Math.min(tableH, maxH) + 5 + 10
    remaining -= consumed
  }
  return pages
}

/** locked_layout’ta eksik kalan ayrı sayfa işaretlerini ekler */
export function ensureSeparateAnswerKeyPages(
  layout: Array<{
    kind: string
    order_index: number
    page_num: number
    x_pt: number
    y_top_pt: number
    w_pt: number
    h_pt: number
    num_slot_w_pt: number
    display_number?: number | null
  }>,
  payload: Record<string, unknown>,
  pageHpt: number,
): typeof layout {
  const include = Boolean(payload.include_answer_key)
  const mode = String(payload.answer_key_mode ?? 'per_page')
  const separate =
    include && (mode === 'separate_page' || Boolean(payload.written_paper_header))
  if (!separate) return layout

  const questions = layout.filter((l) => l.kind !== 'answer_key_page')
  const itemCount = questions.filter((l) => l.display_number != null).length
  if (itemCount <= 0) return questions

  const pages = countSeparateAnswerKeyPages({
    itemCount,
    pageHpt,
    marginTopMm: Number(payload.margin_top_mm ?? 10),
    marginBottomMm: Number(payload.margin_bottom_mm ?? 10),
    pairsPerRow: Boolean(payload.fasikul_answer_key_labels) ? 4 : SEPARATE_AK.PAIRS_PER_ROW,
  })
  const maxQ = Math.max(1, ...questions.map((l) => l.page_num || 1))
  /** Optik ayrı sayfa(lar) cevap anahtarından önce — overlay page_num > maxQ */
  const overlays = Array.isArray(payload.optik_form_overlays)
    ? (payload.optik_form_overlays as Array<Record<string, unknown>>)
    : []
  const optikExtraPages = new Set(
    overlays
      .map((o) => Number(o.page_num ?? 0))
      .filter((n) => Number.isFinite(n) && n > maxQ),
  ).size
  const ml = Number(questions[0]?.x_pt ?? 40)
  const w = Number(questions[0]?.w_pt ?? 200)
  const out = [...questions]
  for (let i = 0; i < pages; i++) {
    out.push({
      kind: 'answer_key_page',
      order_index: -1,
      page_num: maxQ + optikExtraPages + 1 + i,
      x_pt: ml,
      y_top_pt: pageHpt - mmToPt(Number(payload.margin_top_mm ?? 10)),
      w_pt: w,
      h_pt: 40,
      num_slot_w_pt: 0,
      display_number: null,
    })
  }
  return out
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '').trim()
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h.padEnd(6, '0').slice(0, 6)
  const n = Number.parseInt(full, 16)
  if (!Number.isFinite(n)) return rgb(0.039, 0.098, 0.192)
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

function withAlpha(color: RGB, a: number): RGB {
  const t = 1 - clamp01(a)
  return rgb(color.red * a + t, color.green * a + t, color.blue * a + t)
}

/** pdf-lib drawSvgPath: y = şeklin ÜST kenarı */
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

/** Sadece üst köşeler yuvarlak (başlık bandı) */
function roundTopRectPath(w: number, h: number, r: number): string {
  const rad = Math.min(r, w / 2, h / 2)
  return [
    `M ${rad},0`,
    `L ${w - rad},0`,
    `Q ${w},0 ${w},${rad}`,
    `L ${w},${h}`,
    `L 0,${h}`,
    `L 0,${rad}`,
    `Q 0,0 ${rad},0`,
    'Z',
  ].join(' ')
}

export function drawSeparateAnswerKeyTablePdf(params: {
  page: PDFPage
  x: number
  /** PDF: tablonun üst kenarı (y yukarı) */
  yTop: number
  width: number
  items: Array<{ num?: number | string; label?: string; answer: string }>
  fonts: { regular: PDFFont; bold: PDFFont }
  /** @deprecated Tema rengi yok sayılır — sabit lacivert/kırmızı */
  primaryHex?: string
  /** @deprecated Tema rengi yok sayılır — sabit lacivert/kırmızı */
  accentHex?: string
  title?: string
  pairsPerRow?: number
}): number {
  const {
    page,
    x,
    yTop,
    width,
    items,
    fonts,
    title = 'CEVAP ANAHTARI',
  } = params
  const pairs = Math.max(1, params.pairsPerRow ?? SEPARATE_AK.PAIRS_PER_ROW)
  const rowCount = Math.max(1, Math.ceil(Math.max(1, items.length) / pairs))
  const hh = SEPARATE_AK.HEADER_H_PT
  const rh = SEPARATE_AK.ROW_H_PT
  const th = hh + rowCount * rh + SEPARATE_AK.BOTTOM_PAD_PT
  const yBottom = yTop - th
  const primary = hexToRgb(ANSWER_KEY_NAVY_HEX)
  const accent = hexToRgb(ANSWER_KEY_RED_HEX)
  const pw = width / pairs
  const barH = SEPARATE_AK.ACCENT_BAR_PT
  const cornerR = SEPARATE_AK.CORNER_R_PT
  const borderW = Math.max(1, SEPARATE_AK.BORDER_PT)

  // 1) Beyaz gövde (yuvarlatılmış)
  page.drawSvgPath(roundRectPath(width, th, cornerR), {
    x,
    y: yTop,
    color: rgb(1, 1, 1),
    borderWidth: 0,
  })

  // 2) Başlık (üst köşeler yuvarlak)
  page.drawSvgPath(roundTopRectPath(width, hh, cornerR), {
    x,
    y: yTop,
    color: primary,
    borderWidth: 0,
  })

  // 3) Accent şerit
  page.drawRectangle({
    x,
    y: yTop - hh,
    width,
    height: barH,
    color: accent,
  })

  const titleText = title.trim().toUpperCase().slice(0, 48)
  const titleW = fonts.bold.widthOfTextAtSize(titleText, SEPARATE_AK.TITLE_FONT_PT)
  page.drawText(titleText, {
    x: x + (width - titleW) / 2,
    y: yTop - (hh - barH) / 2 - SEPARATE_AK.TITLE_FONT_PT * 0.35,
    size: SEPARATE_AK.TITLE_FONT_PT,
    font: fonts.bold,
    color: rgb(1, 1, 1),
  })

  const bodyTop = yTop - hh
  const bodyBottom = yBottom

  for (let r = 0; r < rowCount; r++) {
    const rowTop = bodyTop - r * rh
    const rowBottom = rowTop - rh
    if (r % 2 === 1) {
      page.drawRectangle({
        x: x + borderW * 0.5,
        y: rowBottom,
        width: width - borderW,
        height: rh,
        color: withAlpha(primary, 0.045),
      })
    }

    for (let c = 0; c < pairs; c++) {
      const idx = r * pairs + c
      if (idx >= items.length) break
      const item = items[idx]!
      const ans = (item.answer || '?').trim().toUpperCase() || '?'
      const cellX = x + c * pw
      const midY = rowBottom + rh / 2

      const numText = String(item.label ?? item.num ?? '')
      const labelSize =
        numText.length > 4 ? SEPARATE_AK.NUM_FONT_PT * 0.88 : SEPARATE_AK.NUM_FONT_PT
      const numW = fonts.bold.widthOfTextAtSize(numText, labelSize)
      const maxLabelW = pw * 0.5
      const drawSize =
        numW > maxLabelW ? Math.max(6, (labelSize * maxLabelW) / numW) : labelSize
      const drawW = fonts.bold.widthOfTextAtSize(numText, drawSize)
      page.drawText(numText, {
        x: cellX + pw * 0.32 - drawW / 2,
        y: midY - drawSize * 0.35,
        size: drawSize,
        font: fonts.bold,
        color: withAlpha(primary, 0.72),
      })

      const ansW = fonts.bold.widthOfTextAtSize(ans, SEPARATE_AK.ANS_FONT_PT)
      const pillH = SEPARATE_AK.PILL_H_PT
      const pillW = Math.max(pillH, ansW + SEPARATE_AK.PILL_PAD_X_PT * 2)
      const pillX = cellX + pw * 0.72 - pillW / 2
      const pillY = midY - pillH / 2
      const pillR = pillH / 2
      page.drawSvgPath(roundRectPath(pillW, pillH, pillR), {
        x: pillX,
        y: pillY + pillH,
        color: withAlpha(accent, 0.12),
        borderColor: withAlpha(accent, 0.4),
        borderWidth: 0.5,
      })
      page.drawText(ans, {
        x: pillX + (pillW - ansW) / 2,
        y: midY - SEPARATE_AK.ANS_FONT_PT * 0.35,
        size: SEPARATE_AK.ANS_FONT_PT,
        font: fonts.bold,
        color: accent,
      })
    }
  }

  // 4) İç grid (gövde içinde, dış çerçeveye taşmasın)
  const gridInset = borderW + 0.5
  for (let c = 1; c < pairs; c++) {
    const lx = x + c * pw
    page.drawLine({
      start: { x: lx, y: bodyBottom + gridInset },
      end: { x: lx, y: bodyTop },
      thickness: SEPARATE_AK.GRID_PT,
      color: withAlpha(primary, 0.18),
    })
  }
  for (let r = 1; r < rowCount; r++) {
    const ly = bodyTop - r * rh
    page.drawLine({
      start: { x: x + gridInset, y: ly },
      end: { x: x + width - gridInset, y: ly },
      thickness: SEPARATE_AK.GRID_PT,
      color: withAlpha(primary, 0.18),
    })
  }

  // 5) Dış çerçeve — en sonda, yuvarlatılmış (önizleme ile aynı)
  page.drawSvgPath(roundRectPath(width, th, cornerR), {
    x,
    y: yTop,
    borderColor: primary,
    borderWidth: borderW,
  })

  return th
}
