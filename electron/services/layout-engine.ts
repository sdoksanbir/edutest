/** Paylaşılan layout motoru — önizleme (exports:layout) ve PDF export aynı kodu kullanır. */

import {
  BANNER_GAP_PT,
  BANNER_H_PT,
  DESC_BOX_GAP_BELOW_PT,
  descriptionHeaderTotalPt,
} from './pdf-description-utils.js'
import {
  isCorporateHeader,
  parseHeaderConfig,
} from './corporate-header-layout.js'
import { mergeHeaderBadgeConfig } from './header-badge-by-style.js'
import { resolveClassicBannerAndInfoHeightPt } from './banner-right-mode.js'
import {
  themeFirstPageHeaderTotalPt,
  corporateOtherPageHeaderLayoutPt as resolveCorporateOtherPageHeaderLayoutPt,
  otherPageHeaderBottomGapPtFromMm,
} from './header-styles.js'
import {
  clampQuestionNumberFontPt,
  estimateQuestionNumberTextWidthPt,
  maxQuestionNumberTextWidthPt,
  QUESTION_NUM_FONT_PT,
} from './question-number-metrics.js'
import { computeColumnGapSizesPt } from './column-gap-distribution.js'

export type LayoutRow = {
  order_index: number
  page_num: number
  x_pt: number
  y_top_pt: number
  w_pt: number
  h_pt: number
  num_slot_w_pt: number
  img_x_pt: number
  img_y_top_pt: number
  img_w_pt: number
  img_h_pt: number
  image_base64?: string
  answer_key?: string
  display_number?: number | null
  content_type?: string
  question_id?: string
  kind: string
}

type QuestionBlock = {
  order_index: number
  block_h: number
  draw_w: number
  draw_h: number
  preferred_gap_pt: number
  min_gap_pt: number
  image_base64?: string
  answer_key: string
  content_type: string
}

type LayoutEntry = QuestionBlock & {
  page_num: number
  col_idx: number
  x_pt: number
  y_top_pt: number
  applied_gap_pt: number
  display_number?: number | null
}

/**
 * Crop CROP_EXPORT_DPI=600 ile birebir: 1 px → 72/600 pt.
 * Eski TEXT_SCALE (10/12) kaldırıldı — 600 DPI kırpmayı ~720 DPI sanıp ~%17 küçültüyordu.
 */
export const LAYOUT_ZOOM = 600 / 72
const IMG_COL_RIGHT_PAD_PT = 2
const DEFAULT_TARGET_LINE_PT = 10
const TARGET_LINE_PT_MIN = 6
const TARGET_LINE_PT_MAX = 14
/** Medyan satıra göre uç OCR değerlerini budama */
const FONT_LINE_CLAMP_LO = 0.55
const FONT_LINE_CLAMP_HI = 1.55
const LAYOUT_EPS = 0.01

const FIRST_PAGE_BANNER_H_PT = BANNER_H_PT
const FIRST_PAGE_BANNER_GAP_PT = BANNER_GAP_PT
const OTHER_PAGES_BANNER_BELOW_GAP_PT = 4
const OTHER_PAGES_HEADER_H_PT = 4
const OTHER_PAGES_HEADER_GAP_PT = 8
export const FOOTER_TOP_OFFSET_MM = 12.35
export const FOOTER_BOTTOM_OFFSET_MM = 3.0
export const FOOTER_NUMBER_PAD_MM = 0.8
/** Sütun altı — son soru ile footer üst çizgisi arası minimum (mm) */
export const COLUMN_LAYOUT_BOTTOM_MIN_MM = 0.6
export const PT_PER_MM = 72 / 25.4

export function mmToPt(mm: number) {
  return mm * PT_PER_MM
}

function targetLinePtFromPayload(payload: Record<string, unknown>): number {
  const n = Number(payload.target_question_line_pt ?? DEFAULT_TARGET_LINE_PT)
  if (!Number.isFinite(n)) return DEFAULT_TARGET_LINE_PT
  return Math.max(TARGET_LINE_PT_MIN, Math.min(TARGET_LINE_PT_MAX, n))
}

function medianNumber(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]!
}

function clampFontLinePxForLayout(
  fontLinePx: number,
  medianLinePx: number | null,
): number {
  let line = fontLinePx
  if (medianLinePx != null && medianLinePx > 0) {
    line = Math.max(
      medianLinePx * FONT_LINE_CLAMP_LO,
      Math.min(medianLinePx * FONT_LINE_CLAMP_HI, line),
    )
  }
  return line > 0 ? line : fontLinePx
}

/** Sütun taşmasında native genişliğin altına bu oranın altına inme (allowSlightOverflow). */
const FIT_MIN_NATIVE_RATIO = 0.8

/**
 * En-boy koruyarak boyutu ayarla.
 * Sütundan taşarsa küçültür; nativeW tavanı yok (display_scale > 1 upscale serbest).
 */
function fitDrawSize(
  drawW: number,
  drawH: number,
  imgWpx: number,
  imgHpx: number,
  nativeW: number,
  availW: number,
  allowSlightOverflow: boolean = true,
): { drawW: number; drawH: number } {
  const aspect = imgWpx > 0 && imgHpx > 0 ? imgHpx / imgWpx : drawW > 0 ? drawH / drawW : 1
  let w = Math.max(1, drawW)
  let h = w * aspect

  if (availW > 0 && w > availW) {
    if (allowSlightOverflow && nativeW > 0) {
      const minAllowedW = nativeW * FIT_MIN_NATIVE_RATIO
      w = Math.min(w, Math.max(availW, minAllowedW))
    } else {
      w = availW
    }
    h = w * aspect
  }
  return { drawW: w, drawH: h }
}

function questionNumberImageGapPt(payload: Record<string, unknown>): number {
  const mm = Math.max(0, Math.min(20, Number(payload.question_number_image_gap_mm ?? 0.3)))
  return mmToPt(mm)
}

export function pageSizeMm(payload: Record<string, unknown>) {
  let width = Number(payload.page_width_mm ?? 210)
  let height = Number(payload.page_height_mm ?? 297)
  if (payload.orientation === 'landscape') {
    return { width: Math.max(width, height), height: Math.min(width, height) }
  }
  return { width, height }
}

function rawBase64(value: string) {
  return value.includes(',') ? value.split(',')[1]! : value
}

function getPngSize(buf: Buffer): { w: number; h: number } | null {
  if (buf.length < 24) return null
  if (buf.readUInt32BE(0) !== 0x89504e47) return null
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}

function getJpegSize(buf: Buffer): { w: number; h: number } | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null
  let i = 2
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) {
      i++
      continue
    }
    const marker = buf[i + 1]!
    if (marker === 0xc0 || marker === 0xc2) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) }
    }
    const len = buf.readUInt16BE(i + 2)
    if (len < 2) break
    i += 2 + len
  }
  return null
}

export function getImageSizeFromBase64(b64: string): { w: number; h: number } | null {
  try {
    const buf = Buffer.from(rawBase64(b64), 'base64')
    return getPngSize(buf) ?? getJpegSize(buf)
  } catch {
    return null
  }
}

function corporateFirstPageHeaderTotalPt(payload: Record<string, unknown>, _contentWidthPt: number, pageWpt: number): number {
  const styleId = String(payload.header_style_id ?? '')
  const config = parseHeaderConfig(payload.header_config)
  const ml = Number(payload.margin_left_mm ?? 10)
  const mr = Number(payload.margin_right_mm ?? 10)
  return themeFirstPageHeaderTotalPt(styleId, config, pageWpt, ml, mr)
}

function headerBottomGapPt(payload: Record<string, unknown>): number {
  const mm = Math.max(0, Math.min(50, Number(payload.header_bottom_gap_mm ?? 1.5)))
  return mmToPt(mm)
}

function questionNumberLeftOffsetPt(payload: Record<string, unknown>): number {
  const mm = Math.max(-15, Math.min(15, Number(payload.question_number_left_offset_mm ?? 0.5)))
  return mmToPt(mm)
}

export { questionNumberLeftOffsetPt, questionNumberImageGapPt }

function contentTopFirstBasePt(payload: Record<string, unknown>, pageHpt: number, pageWpt: number) {
  const mt = mmToPt(Number(payload.margin_top_mm ?? 10))
  const ml = mmToPt(Number(payload.margin_left_mm ?? 10))
  const mr = mmToPt(Number(payload.margin_right_mm ?? 10))
  const contentW = pageWpt - ml - mr
  if (payload.written_paper_header) {
    return pageHpt - mt - 80
  }
  if (isCorporateHeader(String(payload.header_style_id ?? ''))) {
    return pageHpt - mt - corporateFirstPageHeaderTotalPt(payload, contentW, pageWpt)
  }
  if (payload.include_description) {
    return pageHpt - mt - descriptionHeaderTotalPt(payload, contentW)
  }
  const classicH = resolveClassicBannerAndInfoHeightPt(
    mergeHeaderBadgeConfig(
      parseHeaderConfig(payload.header_config),
      String(payload.header_style_id ?? ''),
    ),
  )
  return pageHpt - mt - classicH - DESC_BOX_GAP_BELOW_PT
}

function contentTopFirstPt(payload: Record<string, unknown>, pageHpt: number, pageWpt: number) {
  return contentTopFirstBasePt(payload, pageHpt, pageWpt) - headerBottomGapPt(payload)
}

function contentTopForColumn(
  payload: Record<string, unknown>,
  pageNum: number,
  colIdx: number,
  pageHpt: number,
  pageWpt: number,
  cols: number,
): number {
  if (pageNum > 1) return contentTopOtherPt(payload, pageHpt)
  const isMiddleColumn = cols >= 3 && colIdx > 0 && colIdx < cols - 1
  if (isMiddleColumn) return contentTopFirstBasePt(payload, pageHpt, pageWpt)
  return contentTopFirstPt(payload, pageHpt, pageWpt)
}

function otherPageHeaderBottomGapPt(payload: Record<string, unknown>): number {
  return otherPageHeaderBottomGapPtFromMm(Number(payload.other_page_header_bottom_gap_mm ?? 1.0))
}

function corporateOtherPageHeaderLayoutPtForPayload(payload: Record<string, unknown>): number {
  return resolveCorporateOtherPageHeaderLayoutPt(
    String(payload.header_style_id ?? ''),
    Number(payload.other_page_header_bottom_gap_mm ?? 1.0),
  )
}

function contentTopOtherPt(payload: Record<string, unknown>, pageHpt: number): number {
  const mt = mmToPt(Number(payload.margin_top_mm ?? 10))
  const gapPt = otherPageHeaderBottomGapPt(payload)
  if (payload.written_paper_header) {
    return pageHpt - mt - OTHER_PAGES_HEADER_H_PT - gapPt
  }
  if (isCorporateHeader(String(payload.header_style_id ?? ''))) {
    return pageHpt - mt - corporateOtherPageHeaderLayoutPtForPayload(payload)
  }
  return pageHpt - mt - FIRST_PAGE_BANNER_H_PT - gapPt
}

export function computeGeometry(payload: Record<string, unknown>, pageNum: number) {
  const { width, height } = pageSizeMm(payload)
  const page_w_pt = width * PT_PER_MM
  const page_h_pt = height * PT_PER_MM
  const ml = mmToPt(Number(payload.margin_left_mm ?? 10))
  const mr = mmToPt(Number(payload.margin_right_mm ?? 10))
  const mb = mmToPt(Number(payload.margin_bottom_mm ?? 10))
  const cols = Math.max(1, Math.min(6, Number(payload.columns ?? 1)))
  const colGap = mmToPt(Number(payload.column_gap_mm ?? 8))
  const contentW = page_w_pt - ml - mr
  const colW = cols > 1 ? (contentW - (cols - 1) * colGap) / cols : contentW
  const columnX = Array.from({ length: cols }, (_, i) => ml + i * (colW + colGap))
  const contentBottom = mb + mmToPt(FOOTER_TOP_OFFSET_MM)
  const footerBottom = mb + mmToPt(FOOTER_BOTTOM_OFFSET_MM)
  const contentTop =
    pageNum <= 1 ? contentTopFirstPt(payload, page_h_pt, page_w_pt) : contentTopOtherPt(payload, page_h_pt)
  return {
    page_w_pt,
    page_h_pt,
    ml,
    mr,
    mb,
    cols,
    colGap,
    colW,
    columnX,
    contentBottom,
    footerBottom,
    contentTop,
  }
}

function prepareQuestionBlocks(
  questions: Array<Record<string, unknown>>,
  colW: number,
  maxNumTextWPt: number,
  payload: Record<string, unknown>,
): QuestionBlock[] {
  const preferredGapPt = mmToPt(Number(payload.question_gap_mm ?? 25))
  const minGapPt = mmToPt(Number(payload.question_gap_min_mm ?? 25))
  const sorted = [...questions].sort(
    (a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0),
  )

  const matchedLines: number[] = []
  for (const q of sorted) {
    const fontLinePx = Number(q.font_line_px)
    if (q.ocr_font_matched === true && Number.isFinite(fontLinePx) && fontLinePx > 0) {
      matchedLines.push(fontLinePx)
    }
  }
  const medianLinePx = matchedLines.length > 0 ? medianNumber(matchedLines) : null

  /** true: sütun genişliğine sığdırırken nativeW*%80 altına inme. false: katı availW. */
  const allowSlightOverflow = payload.allow_slight_overflow !== false
  const targetLinePt = targetLinePtFromPayload(payload)

  const blocks: QuestionBlock[] = []

  for (let i = 0; i < sorted.length; i++) {
    const q = sorted[i]!
    const b64 = q.image_base64 as string | undefined
    if (!b64) continue

    const size = getImageSizeFromBase64(b64)
    if (!size || size.w <= 0 || size.h <= 0) continue

    const displayScale = Number.isFinite(Number(q.display_scale))
      ? Math.max(0.01, Number(q.display_scale))
      : 1
    const gapPt = preferredGapPt

    const numImageGapPt = questionNumberImageGapPt(payload)
    const numOffsetPt = Math.max(0, questionNumberLeftOffsetPt(payload))
    const availW =
      colW - maxNumTextWPt - numImageGapPt - IMG_COL_RIGHT_PAD_PT - numOffsetPt

    const fontLinePx = Number(q.font_line_px)
    const fontMatched = q.ocr_font_matched === true && Number.isFinite(fontLinePx) && fontLinePx > 0
    const nativeW = size.w / LAYOUT_ZOOM

    let drawW: number
    let drawH: number
    if (fontMatched) {
      const clampedLine = clampFontLinePxForLayout(fontLinePx, medianLinePx)
      drawW = (size.w * targetLinePt * displayScale) / clampedLine
      drawH = (size.h * targetLinePt * displayScale) / clampedLine
    } else {
      const nativeH = size.h / LAYOUT_ZOOM
      drawW = nativeW * displayScale
      drawH = nativeH * displayScale
    }

    const fitted = fitDrawSize(
      drawW,
      drawH,
      size.w,
      size.h,
      nativeW,
      availW,
      allowSlightOverflow,
    )
    drawW = fitted.drawW
    drawH = fitted.drawH

    blocks.push({
      order_index: Number(q.order_index ?? i),
      block_h: Math.max(12, drawH),
      draw_w: drawW,
      draw_h: drawH,
      preferred_gap_pt: gapPt,
      min_gap_pt: minGapPt,
      image_base64: b64,
      answer_key: String(q.answer_key ?? '').trim().toUpperCase() || '?',
      content_type: String(q.content_type ?? 'question'),
    })
  }
  return blocks
}

function layoutColumnBottomMinPt(): number {
  return mmToPt(COLUMN_LAYOUT_BOTTOM_MIN_MM)
}

/** Sütunda sorular standart aralıkla sığıyor mu? (alt boşluk ≥ 0.6 mm’ye kadar esnetilebilir) */
function columnBufferFits(
  buffer: QuestionBlock[],
  availableHeight: number,
  columnBottomMinPt: number,
): boolean {
  if (buffer.length === 0) return true
  const totalBlock = buffer.reduce((s, q) => s + q.block_h, 0)
  if (totalBlock > availableHeight + LAYOUT_EPS) return false
  const totalPreferredInter = buffer.slice(0, -1).reduce((s, q) => s + q.preferred_gap_pt, 0)
  if (totalBlock + totalPreferredInter + columnBottomMinPt <= availableHeight + LAYOUT_EPS) {
    return true
  }
  const totalMinInter = buffer.slice(0, -1).reduce((s, q) => s + q.min_gap_pt, 0)
  return totalBlock + totalMinInter + columnBottomMinPt <= availableHeight + LAYOUT_EPS
}

function computeAppliedGaps(
  buffer: QuestionBlock[],
  availableHeight: number,
  columnBottomMinPt: number,
): number[] {
  const n = buffer.length
  if (n === 0) return []
  const totalBlock = buffer.reduce((s, q) => s + q.block_h, 0)
  const gapBudget = availableHeight - totalBlock
  const standardGapPt = buffer[0]?.preferred_gap_pt ?? buffer[0]?.min_gap_pt ?? 0
  return computeColumnGapSizesPt(gapBudget, n, standardGapPt, columnBottomMinPt)
}

function repositionColumnEntries(
  entries: LayoutEntry[],
  colTop: number,
  availableHeight: number,
  columnBottomMinPt: number,
): void {
  const gaps = computeAppliedGaps(entries, availableHeight, columnBottomMinPt)
  let y = colTop
  for (let j = 0; j < entries.length; j++) {
    const e = entries[j]!
    const gap = gaps[j] ?? e.preferred_gap_pt
    e.y_top_pt = y
    e.applied_gap_pt = gap
    y -= e.block_h + gap
  }
}

type ColumnSlot = {
  pageNum: number
  colIdx: number
  entries: LayoutEntry[]
  colTop: number
  availableHeight: number
  x: number
}

function buildColumnSlots(entries: LayoutEntry[], payload: Record<string, unknown>): ColumnSlot[] {
  const cols = Math.max(1, Math.min(6, Number(payload.columns ?? 1)))
  const pageNums = [...new Set(entries.map((e) => e.page_num))].sort((a, b) => a - b)
  const slots: ColumnSlot[] = []

  for (const pageNum of pageNums) {
    const geom = computeGeometry(payload, pageNum)
    for (let colIdx = 0; colIdx < cols; colIdx++) {
      const colTop = contentTopForColumn(payload, pageNum, colIdx, geom.page_h_pt, geom.page_w_pt, cols)
      const availableHeight = colTop - geom.contentBottom
      const x = geom.columnX[colIdx] ?? geom.columnX[0]!
      const colEntries = entries
        .filter((e) => e.page_num === pageNum && e.col_idx === colIdx)
        .sort((a, b) => a.order_index - b.order_index)
        .map((e) => ({ ...e }))
      slots.push({ pageNum, colIdx, entries: colEntries, colTop, availableHeight, x })
    }
  }

  return slots
}

/** Okuma sırasına göre önceki sütunlara soru kaydır (sayfa sınırını aşar). */
function backfillColumnsInReadingOrder(
  entries: LayoutEntry[],
  payload: Record<string, unknown>,
): LayoutEntry[] {
  const columnBottomMinPt = layoutColumnBottomMinPt()
  const slots = buildColumnSlots(entries, payload)

  for (let i = 0; i < slots.length - 1; i++) {
    const target = slots[i]!
    const source = slots[i + 1]!

    while (source.entries.length > 0) {
      const candidate = source.entries[0]!
      const trial = [...target.entries, candidate]
      if (!columnBufferFits(trial, target.availableHeight, columnBottomMinPt)) break

      const moved = source.entries.shift()!
      moved.col_idx = target.colIdx
      moved.page_num = target.pageNum
      target.entries.push(moved)
    }
  }

  const result: LayoutEntry[] = []
  for (const slot of slots) {
    repositionColumnEntries(slot.entries, slot.colTop, slot.availableHeight, columnBottomMinPt)
    for (const e of slot.entries) {
      e.x_pt = slot.x
    }
    result.push(...slot.entries)
  }

  return result.sort((a, b) => a.order_index - b.order_index)
}

function computeLayoutEntriesFlexible(
  questionData: QuestionBlock[],
  payload: Record<string, unknown>,
): LayoutEntry[] {
  const geom0 = computeGeometry(payload, 1)
  const cols = geom0.cols
  const colW = geom0.colW
  const columnBottomMinPt = layoutColumnBottomMinPt()
  void payload.auto_compact_spacing

  const result: LayoutEntry[] = []
  let pageNum = 1
  let colIdx = 0

  const contentTopForCol = (page: number, col: number) => {
    const g = computeGeometry(payload, page)
    return contentTopForColumn(payload, page, col, g.page_h_pt, g.page_w_pt, g.cols)
  }

  let colTop = contentTopForCol(pageNum, colIdx)
  let colBuffer: QuestionBlock[] = []
  let availableHeight = colTop - geom0.contentBottom

  const getColX = (c: number) => {
    const g = computeGeometry(payload, pageNum)
    return g.columnX[c] ?? geom0.ml + c * (colW + geom0.colGap)
  }

  const flushColumn = (appliedGaps: number[]) => {
    let y = colTop
    for (let j = 0; j < colBuffer.length; j++) {
      const qu = colBuffer[j]!
      const gap = appliedGaps[j] ?? qu.preferred_gap_pt
      result.push({
        ...qu,
        page_num: pageNum,
        col_idx: colIdx,
        x_pt: getColX(colIdx),
        y_top_pt: y,
        applied_gap_pt: gap,
      })
      y -= qu.block_h + gap
    }
    colBuffer = []
  }

  const nextColumn = () => {
    colIdx += 1
    if (colIdx >= cols) {
      pageNum += 1
      colIdx = 0
    }
    const g = computeGeometry(payload, pageNum)
    colTop = contentTopForColumn(payload, pageNum, colIdx, g.page_h_pt, g.page_w_pt, g.cols)
    availableHeight = colTop - g.contentBottom
  }

  let i = 0
  while (i < questionData.length) {
    const q = questionData[i]!
    colBuffer.push(q)

    if (columnBufferFits(colBuffer, availableHeight, columnBottomMinPt)) {
      i += 1
      continue
    }

    colBuffer.pop()
    if (colBuffer.length === 0) {
      nextColumn()
      continue
    }
    flushColumn(computeAppliedGaps(colBuffer, availableHeight, columnBottomMinPt))
    nextColumn()
  }

  if (colBuffer.length > 0) {
    flushColumn(computeAppliedGaps(colBuffer, availableHeight, columnBottomMinPt))
  }

  return backfillColumnsInReadingOrder(result, payload)
}

function applyDisplayNumbers(entries: LayoutEntry[], payload: Record<string, unknown>) {
  const enabled = payload.question_numbering_enabled !== false
  const start = Math.max(1, Number(payload.question_number_start ?? 1))
  if (!enabled) {
    for (const e of entries) e.display_number = null
    return
  }
  let counter = start
  for (const e of entries) {
    if (e.content_type === 'explanation') {
      e.display_number = null
    } else {
      e.display_number = counter
      counter += 1
    }
  }
}

function questionNumberFontPtFromPayload(payload: Record<string, unknown>): number {
  return clampQuestionNumberFontPt(Number(payload.question_number_font_pt ?? QUESTION_NUM_FONT_PT))
}

function entriesToLayoutRows(
  entries: LayoutEntry[],
  colW: number,
  skipImages: boolean,
  imageGapPt: number,
  fontPt: number,
): LayoutRow[] {
  return entries.map((entry) => {
    const numTextW = estimateQuestionNumberTextWidthPt(entry.display_number, fontPt)
    return {
      kind: 'question',
      order_index: entry.order_index,
      page_num: entry.page_num,
      x_pt: entry.x_pt,
      y_top_pt: entry.y_top_pt,
      w_pt: colW,
      h_pt: entry.block_h,
      num_slot_w_pt: numTextW,
      img_x_pt: entry.x_pt + numTextW + imageGapPt,
    img_y_top_pt: entry.y_top_pt,
    img_w_pt: entry.draw_w,
    img_h_pt: entry.draw_h,
    image_base64: skipImages ? undefined : entry.image_base64,
    answer_key: entry.answer_key,
    display_number: entry.display_number,
    content_type: entry.content_type,
    }
  })
}

function applyYTopOverrides(layout: LayoutRow[], overrides: Map<number, number>) {
  for (const item of layout) {
    const yt = overrides.get(item.order_index)
    if (yt == null) continue
    const dy = yt - item.y_top_pt
    item.y_top_pt = yt
    item.img_y_top_pt += dy
  }
}

export function columnIndexFromLayoutXPt(xPt: number, columnX: number[]): number {
  if (columnX.length <= 1) return 0
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < columnX.length; i++) {
    const d = Math.abs(xPt - columnX[i]!)
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

function shiftRowYTop(row: LayoutRow, newYTop: number): LayoutRow {
  const dy = newYTop - row.y_top_pt
  return {
    ...row,
    y_top_pt: newYTop,
    img_y_top_pt: row.img_y_top_pt + dy,
  }
}

/** Sütun okları — soru sırası sabit, sayfa/sütun yerleşimi override. */
function applyLayoutPlacementOverrides(layout: LayoutRow[], payload: Record<string, unknown>): LayoutRow[] {
  const list =
    (payload.layout_placement_overrides as Array<{
      order_index: number
      page_num: number
      column_index: number
      insert_at: 'top' | 'bottom'
    }>) ?? []
  if (list.length === 0) return layout

  const overrideByOrder = new Map(list.map((o) => [o.order_index, o]))
  const cols = Math.max(1, Math.min(6, Number(payload.columns ?? 1)))
  const minGapPt = mmToPt(Number(payload.question_gap_min_mm ?? 12))
  const numImageGapPt = questionNumberImageGapPt(payload)
  const fontPt = questionNumberFontPtFromPayload(payload)

  const questions = layout.filter((l) => l.kind !== 'answer_key_page')
  const passthrough = layout.filter((l) => l.kind === 'answer_key_page')

  const groups = new Map<string, LayoutRow[]>()
  for (const item of questions) {
    const ov = overrideByOrder.get(item.order_index)
    let page: number
    let col: number
    if (ov) {
      page = ov.page_num
      col = ov.column_index
    } else {
      page = item.page_num
      const g = computeGeometry(payload, page)
      col = columnIndexFromLayoutXPt(item.x_pt, g.columnX)
    }
    const key = `${page}:${col}`
    const arr = groups.get(key) ?? []
    arr.push(item)
    groups.set(key, arr)
  }

  const byOrder = new Map<number, LayoutRow>()

  for (const [key, rawItems] of groups) {
    const [pageStr, colStr] = key.split(':')
    const pageNum = Number(pageStr)
    const colIdx = Number(colStr)
    const geom = computeGeometry(payload, pageNum)
    const contentTop = contentTopForColumn(payload, pageNum, colIdx, geom.page_h_pt, geom.page_w_pt, cols)
    const contentBottom = geom.contentBottom

    const topOrders = new Set<number>()
    const bottomOrders = new Set<number>()
    for (const it of rawItems) {
      const ov = overrideByOrder.get(it.order_index)
      if (!ov) continue
      if (ov.insert_at === 'top') topOrders.add(it.order_index)
      if (ov.insert_at === 'bottom') bottomOrders.add(it.order_index)
    }
    const sorted = [...rawItems].sort((a, b) => a.order_index - b.order_index)
    const ordered = [
      ...sorted.filter((it) => topOrders.has(it.order_index)),
      ...sorted.filter((it) => !topOrders.has(it.order_index) && !bottomOrders.has(it.order_index)),
      ...sorted.filter((it) => bottomOrders.has(it.order_index)),
    ]

    const x = geom.columnX[colIdx] ?? geom.columnX[0]!
    const heights = ordered.map((l) => l.h_pt)
    const totalH = heights.reduce((s, h) => s + h, 0)
    const usable = contentTop - contentBottom
    const remaining = usable - totalH
    const n = ordered.length
    if (remaining < -0.5 || n === 0) continue
    const equalGap = remaining / n
    if (equalGap + 0.01 < minGapPt) continue

    let y = contentTop
    for (let i = 0; i < n; i++) {
      const it = ordered[i]!
      const numTextW = estimateQuestionNumberTextWidthPt(it.display_number, fontPt)
      const placed: LayoutRow = {
        ...shiftRowYTop(it, y),
        page_num: pageNum,
        x_pt: x,
        w_pt: geom.colW,
        num_slot_w_pt: numTextW,
        img_x_pt: x + numTextW + numImageGapPt,
      }
      byOrder.set(placed.order_index, placed)
      y -= heights[i]! + equalGap
    }
  }

  return [...questions.map((it) => byOrder.get(it.order_index) ?? it), ...passthrough]
}

function getColumnItemsSortedTopFirstLayout(
  layout: LayoutRow[],
  pageNum: number,
  columnIndex: number,
  columnX: number[],
): LayoutRow[] {
  const inCol = layout.filter((l) => {
    if (l.page_num !== pageNum) return false
    if (l.kind === 'answer_key_page') return false
    return columnIndexFromLayoutXPt(l.x_pt, columnX) === columnIndex
  })
  return inCol.sort((a, b) => b.y_top_pt - a.y_top_pt)
}

/** Sütun taşıma / dikey override sonrası okuma sırasına göre soru numarası. */
function reapplyDisplayNumbersByReadingOrder(
  layout: LayoutRow[],
  payload: Record<string, unknown>,
): void {
  const enabled = payload.question_numbering_enabled !== false
  const start = Math.max(1, Number(payload.question_number_start ?? 1))
  const cols = Math.max(1, Math.min(6, Number(payload.columns ?? 1)))
  const numImageGapPt = questionNumberImageGapPt(payload)
  const fontPt = questionNumberFontPtFromPayload(payload)

  if (!enabled) {
    for (const item of layout) {
      if (item.kind !== 'answer_key_page') item.display_number = null
    }
    return
  }

  const pageNums = [
    ...new Set(
      layout
        .filter((l) => l.kind !== 'answer_key_page')
        .map((l) => l.page_num)
        .filter((p) => p > 0),
    ),
  ].sort((a, b) => a - b)

  const displayByOrder = new Map<number, number | null>()
  let counter = start

  for (const pageNum of pageNums) {
    const geom = computeGeometry(payload, pageNum)
    for (let col = 0; col < cols; col++) {
      const items = getColumnItemsSortedTopFirstLayout(layout, pageNum, col, geom.columnX)
      for (const item of items) {
        if (String(item.content_type ?? 'question') === 'explanation') {
          displayByOrder.set(item.order_index, null)
        } else {
          displayByOrder.set(item.order_index, counter)
          counter += 1
        }
      }
    }
  }

  for (const item of layout) {
    if (item.kind === 'answer_key_page') continue
    if (!displayByOrder.has(item.order_index)) continue
    const display_number = displayByOrder.get(item.order_index) ?? null
    const numTextW = estimateQuestionNumberTextWidthPt(display_number, fontPt)
    item.display_number = display_number
    item.num_slot_w_pt = numTextW
    item.img_x_pt = item.x_pt + numTextW + numImageGapPt
  }
}

export function computeLayoutFromPayload(payload: Record<string, unknown>) {
  const questions = (payload.questions as Array<Record<string, unknown>>) ?? []
  const skipImages = Boolean(payload.skip_images)
  const geom = computeGeometry(payload, 1)

  const questionCount = questions.filter(
    (q) => String(q.content_type ?? 'question') !== 'explanation',
  ).length
  const startNum = Math.max(1, Number(payload.question_number_start ?? 1))
  const fontPt = questionNumberFontPtFromPayload(payload)
  const maxDisplayNum = startNum + Math.max(0, questionCount - 1)
  const maxNumTextWPt = maxQuestionNumberTextWidthPt(Math.max(1, maxDisplayNum), fontPt)

  const blocks = prepareQuestionBlocks(
    questions,
    geom.colW,
    maxNumTextWPt,
    payload,
  )
  if (blocks.length === 0) {
    return { layout: [] as LayoutRow[], page_w_pt: geom.page_w_pt, page_h_pt: geom.page_h_pt }
  }

  const entries = computeLayoutEntriesFlexible(blocks, payload)
  applyDisplayNumbers(entries, payload)

  const overrides = new Map<number, number>()
  for (const ov of (payload.layout_y_top_overrides as Array<{ order_index: number; y_top_pt: number }>) ?? []) {
    overrides.set(ov.order_index, ov.y_top_pt)
  }

  let layout = entriesToLayoutRows(
    entries,
    geom.colW,
    skipImages,
    questionNumberImageGapPt(payload),
    fontPt,
  )
  layout = applyLayoutPlacementOverrides(layout, payload)
  applyYTopOverrides(layout, overrides)

  const hasManualLayout =
    ((payload.layout_placement_overrides as unknown[]) ?? []).length > 0 || overrides.size > 0
  if (hasManualLayout) {
    reapplyDisplayNumbersByReadingOrder(layout, payload)
  }

  const answerKeyMode = String(payload.answer_key_mode ?? 'per_page')
  const includeAnswerKey = Boolean(payload.include_answer_key)
  const separatePage =
    includeAnswerKey &&
    (answerKeyMode === 'separate_page' || Boolean(payload.written_paper_header))

  if (separatePage) {
    const maxPage = Math.max(1, ...layout.map((l) => l.page_num))
    layout.push({
      kind: 'answer_key_page',
      order_index: -1,
      page_num: maxPage + 1,
      x_pt: geom.ml,
      y_top_pt: geom.contentTop,
      w_pt: geom.page_w_pt - geom.ml - geom.mr,
      h_pt: 40,
      num_slot_w_pt: maxNumTextWPt,
      img_x_pt: geom.ml,
      img_y_top_pt: geom.contentTop,
      img_w_pt: geom.page_w_pt - geom.ml - geom.mr,
      img_h_pt: 40,
    })
  }

  return { layout, page_w_pt: geom.page_w_pt, page_h_pt: geom.page_h_pt }
}
