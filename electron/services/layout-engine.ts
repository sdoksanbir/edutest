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
import { normalizeClassicBannerConfig } from './classic-banner-top-row.js'
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
import { parseCapture } from './question-native-size.js'
import {
  buildLayoutScaleDiagMeta,
  type LayoutScaleDiagMeta,
} from './question-scale-diagnostics.js'
import {
  calculateQuestionDrawMetrics,
  IMG_COL_RIGHT_PAD_PT as METRICS_IMG_PAD,
} from './question-draw-metrics.js'
import {
  fasikulFrameBadgeTopReservePt,
  isOptikAnswerableLayoutQuestion,
} from './fasikul-question-frame-draw.js'
import {
  fasikulMinScratchGapPt,
  fasikulOneLineGapPt,
  fasikulEmptyBoxBottomGapPt,
  fasikulTrailingGapFloorPt,
  scratchCellPt,
  SCRATCH_CELL_MM,
} from './question-scratch-grid.js'
import {
  isWrittenLayoutQuestion,
  writtenQuestionDrawHeightPt,
} from './written-question-layout.js'

export type LayoutRow = {
  order_index: number
  page_num: number
  x_pt: number
  y_top_pt: number
  w_pt: number
  h_pt: number
  num_slot_w_pt: number
  img_x_pt?: number
  img_y_top_pt?: number
  img_w_pt?: number
  img_h_pt?: number
  image_base64?: string
  answer_key?: string
  display_number?: number | null
  content_type?: string
  question_id?: string
  kind: string
  /** Teşhis meta — çizim boyutunu etkilemez */
  scale_diag?: LayoutScaleDiagMeta
  /** true: içerik kutusunu kaplar (çok sütun satırını kapatır) */
  span_full_width?: boolean
  layout_mode?: 'single-column' | 'full-width' | 'auto'
  /** Bölüm başlığı (soru bloğunun üstünde) */
  section?: SectionHeaderMeta
}

export type SectionHeaderMeta = {
  title: string
  fill_color: string
  text_color: string
  line_color: string
  font_pt: number
  box_h: number
  gap_after: number
  start_new_page?: boolean
  restart_numbering?: boolean
}

const SECTION_BOX_H_PT = 22
const SECTION_GAP_AFTER_PT = 6

type QuestionBlock = {
  order_index: number
  block_h: number
  draw_w: number
  draw_h: number
  preferred_gap_pt: number
  min_gap_pt: number
  image_base64?: string
  question_id?: string
  answer_key: string
  content_type: string
  scale_diag?: LayoutScaleDiagMeta
  span_full_width: boolean
  layout_mode: 'single-column' | 'full-width' | 'auto'
  /** Üst dış fasikül başlığı için y_top → img_y_top ofseti */
  badge_top_reserve_pt?: number
  /** Bölüm başlığı yüksekliği (box_h + gap_after) — img_y_top ofseti */
  section_reserve_pt?: number
  section?: SectionHeaderMeta
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
 * Legacy fallback 600 DPI: 1 px → 72/600 pt. Yeni kırpmalar capture.pixelsPerPdfPoint kullanır.
 * Eski TEXT_SCALE (10/12) kaldırıldı — 600 DPI kırpmayı ~600 DPI sanıp ~%17 küçültüyordu.
 */
export const LAYOUT_ZOOM = 600 / 72
const IMG_COL_RIGHT_PAD_PT = METRICS_IMG_PAD
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
/** Fasikül + kareli alan: her soru altında / sütun altında en az 3 satır */
export const FASIKUL_MIN_BOTTOM_SCRATCH_ROWS = 3
export const FASIKUL_SCRATCH_CELL_MM = 5
export const PT_PER_MM = 72 / 25.4

export function mmToPt(mm: number) {
  return mm * PT_PER_MM
}

/** Fasikül: kareli alan veya çerçeve badge — ara boşluk sabit (görsel altı ↔ ÖRNEK üstü) */
function useFasikulFixedInterGaps(payload: Record<string, unknown>): boolean {
  if (payload.show_question_scratch_grid === true) return true
  const qs = payload.questions
  if (!Array.isArray(qs)) return false
  return qs.some((q) => {
    const f = (q as { fasikulFrame?: { enabled?: boolean } })?.fasikulFrame
    return f?.enabled === true
  })
}

function layoutColumnBottomMinPt(): number {
  return mmToPt(COLUMN_LAYOUT_BOTTOM_MIN_MM)
}

/** Fasikülde kareli alan: altta en az 3 satır + pad sığacak rezerv */
function columnBottomReservePt(payload: Record<string, unknown>): number {
  const base = layoutColumnBottomMinPt()
  if (payload.show_question_scratch_grid !== true) return base
  const qs = payload.questions
  let anyScratch = true
  if (Array.isArray(qs)) {
    anyScratch = qs.some((q) => {
      const f = (q as { fasikulFrame?: { enabled?: boolean; showScratchGrid?: boolean } })
        ?.fasikulFrame
      if (f?.enabled === true) return f.showScratchGrid === true
      return true
    })
  }
  if (anyScratch) {
    return Math.max(base, fasikulMinScratchGapPt(FASIKUL_SCRATCH_CELL_MM))
  }
  return Math.max(base, fasikulOneLineGapPt(FASIKUL_SCRATCH_CELL_MM))
}

function fasikulQuestionGapFloorPt(payload: Record<string, unknown>): number {
  if (payload.show_question_scratch_grid !== true) return 0
  return fasikulOneLineGapPt(FASIKUL_SCRATCH_CELL_MM)
}

function questionTrailingGapPt(
  q: Record<string, unknown>,
  payload: Record<string, unknown>,
): number {
  const emptyRows = Number((q as { fasikulEmptyRows?: unknown }).fasikulEmptyRows ?? 0)
  const frame = (q as { fasikulFrame?: { enabled?: boolean; showScratchGrid?: boolean } })
    .fasikulFrame
  /** Boş hazır tasarım: altta tam 2 satır (fazlası yok) */
  if (emptyRows > 0 && frame?.enabled === true) {
    return fasikulEmptyBoxBottomGapPt(FASIKUL_SCRATCH_CELL_MM)
  }
  const base = Math.max(
    mmToPt(Number(payload.question_gap_mm ?? 25)),
    fasikulQuestionGapFloorPt(payload),
  )
  if (payload.show_question_scratch_grid !== true) return base
  return Math.max(base, fasikulTrailingGapFloorPt(frame, FASIKUL_SCRATCH_CELL_MM))
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
  const parsed = normalizeClassicBannerConfig(parseHeaderConfig(payload.header_config))
  const showInfo = parsed.showClassicInfoBar !== false
  const classicH = resolveClassicBannerAndInfoHeightPt(
    {
      ...mergeHeaderBadgeConfig(parsed, String(payload.header_style_id ?? '')),
      showClassicInfoBar: showInfo,
    },
    String(payload.header_style_id ?? ''),
    contentW,
  )
  const gapBelow = showInfo ? DESC_BOX_GAP_BELOW_PT : 0
  return pageHpt - mt - classicH - gapBelow
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

function parseSectionHeadersByStartIdx(
  payload: Record<string, unknown>,
): Map<number, SectionHeaderMeta> {
  const raw = payload.sections
  const map = new Map<number, SectionHeaderMeta>()
  if (!Array.isArray(raw)) return map
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const s = entry as Record<string, unknown>
    const startIdx = Number(s.start_idx)
    if (!Number.isFinite(startIdx)) continue
    const fontRaw = Number(s.font_pt)
    map.set(startIdx, {
      title: String(s.title ?? 'Bölüm').trim() || 'Bölüm',
      fill_color: String(s.fill_color ?? '#F34A2F'),
      text_color: String(s.text_color ?? '#FFFFFF'),
      line_color: String(s.line_color ?? 'none'),
      font_pt: Number.isFinite(fontRaw) && fontRaw > 0 ? fontRaw : 12,
      box_h: SECTION_BOX_H_PT,
      gap_after: SECTION_GAP_AFTER_PT,
      start_new_page: s.start_new_page === true,
      restart_numbering: s.restart_numbering === true,
    })
  }
  return map
}

/** Geçiş 1: kesin genişlik/yükseklik (single veya full-width). */
function prepareQuestionBlocks(
  questions: Array<Record<string, unknown>>,
  colW: number,
  maxNumTextWPt: number,
  payload: Record<string, unknown>,
  geom: ReturnType<typeof computeGeometry>,
): QuestionBlock[] {
  const gapFloorPt = fasikulQuestionGapFloorPt(payload)
  const sorted = [...questions].sort(
    (a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0),
  )
  const sectionByStart = parseSectionHeadersByStartIdx(payload)

  const blocks: QuestionBlock[] = []
  const numImageGapPt = questionNumberImageGapPt(payload)
  const numOffsetPt = Math.max(0, questionNumberLeftOffsetPt(payload))
  const singleAvailW =
    colW - maxNumTextWPt - numImageGapPt - IMG_COL_RIGHT_PAD_PT - numOffsetPt
  // Gerçek içerik kutusu — availW*2+gap varsayımı yok
  const fullWidthHorizontalPadding = maxNumTextWPt + numImageGapPt + IMG_COL_RIGHT_PAD_PT + numOffsetPt
  const fullWidthAvailW = Math.max(
    1,
    geom.page_w_pt - geom.ml - geom.mr - fullWidthHorizontalPadding,
  )

  for (let i = 0; i < sorted.length; i++) {
    const q = sorted[i]!
    const orderIndex = Number(q.order_index ?? i)
    const section = sectionByStart.get(orderIndex)
    const sectionReservePt = section ? section.box_h + section.gap_after : 0
    const emptyRowsRaw = Number(
      (q as { fasikulEmptyRows?: unknown }).fasikulEmptyRows ?? 0,
    )
    const emptyRows =
      Number.isFinite(emptyRowsRaw) && emptyRowsRaw > 0
        ? Math.max(1, Math.round(emptyRowsRaw))
        : 0
    const frameEnabled =
      (q as { fasikulFrame?: { enabled?: boolean } }).fasikulFrame?.enabled === true
    const b64 = q.image_base64 as string | undefined

    const qPreferredGap = questionTrailingGapPt(q, payload)
    const qMinGap = Math.max(
      mmToPt(Number(payload.question_gap_min_mm ?? 25)),
      gapFloorPt,
      frameEnabled
        ? fasikulTrailingGapFloorPt(
            (q as { fasikulFrame?: { enabled?: boolean; showScratchGrid?: boolean } })
              .fasikulFrame,
            FASIKUL_SCRATCH_CELL_MM,
          )
        : 0,
    )

    if (emptyRows > 0 && frameEnabled) {
      const cellPt = scratchCellPt(FASIKUL_SCRATCH_CELL_MM)
      const drawH = emptyRows * cellPt
      const drawW = singleAvailW
      const badgeTopReservePt = fasikulFrameBadgeTopReservePt(q.fasikulFrame)
      const emptyGap = fasikulEmptyBoxBottomGapPt(FASIKUL_SCRATCH_CELL_MM)
      blocks.push({
        order_index: orderIndex,
        block_h: Math.max(12, drawH + badgeTopReservePt + sectionReservePt),
        draw_w: drawW,
        draw_h: drawH,
        preferred_gap_pt: emptyGap,
        min_gap_pt: emptyGap,
        /** Görsel yok — içi boş kutu; önizleme/export eski order görselini bağlayamaz */
        image_base64: undefined,
        question_id: String(q.id ?? ''),
        answer_key: String(q.answer_key ?? '').trim().toUpperCase() || '?',
        content_type: String(q.content_type ?? 'question'),
        scale_diag: buildLayoutScaleDiagMeta({
          sourceWpx: 1,
          sourceHpx: 1,
          availWPt: singleAvailW,
          requestedScale: 1,
          finalDrawWPt: drawW,
          finalDrawHPt: drawH,
          growOverflowTolerance: 1,
          allowSlightOverflow: false,
          maxAllowedWPt: singleAvailW,
          nativeWidthPt: drawW,
          nativeHeightPt: drawH,
          pixelsPerPdfPoint: 1,
          manualScale: 1,
          normalizationScale: 1,
          metadataSource: 'legacy-fallback',
          layoutMode: 'single-column',
          singleColumnFulfillment: 1,
          fullWidthAvailW: fullWidthAvailW,
          fullWidthAppliedScale: 1,
          fullWidthFulfillment: 1,
          layoutRecommendation: 'SINGLE_COLUMN',
        }),
        span_full_width: false,
        layout_mode: 'single-column',
        badge_top_reserve_pt: badgeTopReservePt,
        section_reserve_pt: sectionReservePt > 0 ? sectionReservePt : undefined,
        section,
      })
      continue
    }

    /** Yazılı açık uçlu vb. — görsel yok; rozet + metin + cevap satırları */
    if (isWrittenLayoutQuestion(q)) {
      const drawW = Math.max(40, singleAvailW)
      const drawH = Math.max(28, writtenQuestionDrawHeightPt(q, drawW))
      const writtenGap = mmToPt(6)
      blocks.push({
        order_index: orderIndex,
        block_h: Math.max(12, drawH + sectionReservePt),
        draw_w: drawW,
        draw_h: drawH,
        preferred_gap_pt: Math.max(writtenGap, Math.min(qPreferredGap, mmToPt(10))),
        min_gap_pt: writtenGap,
        image_base64: undefined,
        question_id: String(q.id ?? ''),
        answer_key: String(q.answer_key ?? '').trim().toUpperCase() || '?',
        content_type: String(q.content_type ?? 'question'),
        scale_diag: buildLayoutScaleDiagMeta({
          sourceWpx: 1,
          sourceHpx: 1,
          availWPt: drawW,
          requestedScale: 1,
          finalDrawWPt: drawW,
          finalDrawHPt: drawH,
          growOverflowTolerance: 1,
          allowSlightOverflow: false,
          maxAllowedWPt: drawW,
          nativeWidthPt: drawW,
          nativeHeightPt: drawH,
          pixelsPerPdfPoint: 1,
          manualScale: 1,
          normalizationScale: 1,
          metadataSource: 'legacy-fallback',
          layoutMode: 'single-column',
          singleColumnFulfillment: 1,
          fullWidthAvailW: fullWidthAvailW,
          fullWidthAppliedScale: 1,
          fullWidthFulfillment: 1,
          layoutRecommendation: 'SINGLE_COLUMN',
        }),
        span_full_width: false,
        layout_mode: 'single-column',
        section_reserve_pt: sectionReservePt > 0 ? sectionReservePt : undefined,
        section,
      })
      continue
    }

    let size: { w: number; h: number } | null = b64
      ? getImageSizeFromBase64(b64)
      : null
    if (!size || !(size.w > 0 && size.h > 0)) {
      const wHint = Number(q.image_width_px)
      const hHint = Number(q.image_height_px)
      if (wHint > 0 && hHint > 0) size = { w: wHint, h: hHint }
    }
    if (!size || !(size.w > 0 && size.h > 0)) {
      const cap = parseCapture(q)
      if (cap && cap.cropWidthPx > 0 && cap.cropHeightPx > 0) {
        size = { w: cap.cropWidthPx, h: cap.cropHeightPx }
      } else if (cap && cap.cropWidthPt > 0 && cap.cropHeightPt > 0 && cap.pixelsPerPdfPoint > 0) {
        size = {
          w: Math.max(1, Math.round(cap.cropWidthPt * cap.pixelsPerPdfPoint)),
          h: Math.max(1, Math.round(cap.cropHeightPt * cap.pixelsPerPdfPoint)),
        }
      }
    }
    if (!size || size.w <= 0 || size.h <= 0) continue

    const allowSlightOverflow = payload.allow_slight_overflow === true
    const metrics = calculateQuestionDrawMetrics(
      q,
      {
        singleAvailWPt: singleAvailW,
        fullWidthAvailWPt: fullWidthAvailW,
        allowSlightOverflow,
      },
      size,
    )
    if (!metrics) continue

    const useFullWidth = metrics.layoutMode === 'full-width'
    const drawW = metrics.drawWidth
    const drawH = metrics.drawHeight
    const badgeTopReservePt = fasikulFrameBadgeTopReservePt(q.fasikulFrame)

    const scale_diag = buildLayoutScaleDiagMeta({
      sourceWpx: size.w,
      sourceHpx: size.h,
      availWPt: metrics.availWPt,
      requestedScale: metrics.requestedScale,
      finalDrawWPt: drawW,
      finalDrawHPt: drawH,
      growOverflowTolerance: 1,
      allowSlightOverflow,
      maxAllowedWPt: metrics.maxAllowedWPt,
      nativeWidthPt: metrics.nativeWidthPt,
      nativeHeightPt: metrics.nativeHeightPt,
      pixelsPerPdfPoint: metrics.pixelsPerPdfPoint,
      manualScale: metrics.manualScale,
      normalizationScale: metrics.normalizationScale,
      metadataSource: metrics.metadataSource,
      layoutMode: metrics.layoutMode,
      singleColumnFulfillment: metrics.singleColumnFulfillment,
      fullWidthAvailW: metrics.fullWidthAvailW,
      fullWidthAppliedScale: metrics.fullWidthAppliedScale,
      fullWidthFulfillment: metrics.fullWidthFulfillment,
      fullWidthDrawHeight: metrics.fullWidthAvailW > 0 ? metrics.drawHeight : undefined,
      layoutRecommendation:
        metrics.singleColumnFulfillment < 0.75 ? 'FULL_WIDTH' : 'SINGLE_COLUMN',
    })

    if (useFullWidth) {
      console.log(
        `[ScaleDiag:full-width] q=${q.order_index} ` +
          `singleColumnFulfillment=${(metrics.singleColumnFulfillment * 100).toFixed(1)}% ` +
          `fullWidthAvailW=${metrics.fullWidthAvailW.toFixed(1)} ` +
          `fullWidthAppliedScale=${metrics.fullWidthAppliedScale.toFixed(4)} ` +
          `fullWidthFulfillment=${(metrics.fullWidthFulfillment * 100).toFixed(1)}% ` +
          `layoutMode=full-width`,
      )
    }

    blocks.push({
      order_index: orderIndex,
      block_h: Math.max(12, drawH + badgeTopReservePt + sectionReservePt),
      draw_w: drawW,
      draw_h: drawH,
      preferred_gap_pt: qPreferredGap,
      min_gap_pt: qMinGap,
      image_base64: b64,
      question_id: String(q.id ?? ''),
      answer_key: String(q.answer_key ?? '').trim().toUpperCase() || '?',
      content_type: String(q.content_type ?? 'question'),
      scale_diag,
      span_full_width: useFullWidth,
      layout_mode: metrics.layoutMode,
      badge_top_reserve_pt: badgeTopReservePt,
      section_reserve_pt: sectionReservePt > 0 ? sectionReservePt : undefined,
      section,
    })
  }
  return blocks
}

/** Sütunda sorular standart aralıkla sığıyor mu? (alt boşluk ≥ rezerv) */
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
  fixedInterGaps: boolean,
): number[] {
  const n = buffer.length
  if (n === 0) return []
  const totalBlock = buffer.reduce((s, q) => s + q.block_h, 0)
  const gapBudget = availableHeight - totalBlock
  if (fixedInterGaps) {
    if (n === 1) return [Math.max(columnBottomMinPt, gapBudget)]
    const interGaps = buffer.slice(0, -1).map((q) => q.preferred_gap_pt)
    const usedInter = interGaps.reduce((s, g) => s + g, 0)
    const bottom = Math.max(columnBottomMinPt, gapBudget - usedInter)
    return [...interGaps, bottom]
  }
  const standardGapPt = buffer[0]?.preferred_gap_pt ?? buffer[0]?.min_gap_pt ?? 0
  return computeColumnGapSizesPt(gapBudget, n, standardGapPt, columnBottomMinPt, {
    fixedInterGaps,
  })
}

function repositionColumnEntries(
  entries: LayoutEntry[],
  colTop: number,
  availableHeight: number,
  columnBottomMinPt: number,
  fixedInterGaps: boolean,
): void {
  const gaps = computeAppliedGaps(
    entries,
    availableHeight,
    columnBottomMinPt,
    fixedInterGaps,
  )
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
  const columnBottomMinPt = columnBottomReservePt(payload)
  const fixedInterGaps = useFasikulFixedInterGaps(payload)
  const slots = buildColumnSlots(entries, payload)

  /** start_new_page bölümleri: bu order ve sonrası daha erken sayfaya çekilmesin */
  const sectionPageFloor = new Map<number, number>()
  for (const e of entries) {
    if (!e.section?.start_new_page) continue
    sectionPageFloor.set(e.order_index, e.page_num)
  }
  const minAllowedPage = (orderIndex: number): number => {
    let floor = 1
    for (const [startOrder, page] of sectionPageFloor) {
      if (startOrder <= orderIndex) floor = Math.max(floor, page)
    }
    return floor
  }

  for (let i = 0; i < slots.length - 1; i++) {
    const target = slots[i]!
    const source = slots[i + 1]!

    while (source.entries.length > 0) {
      const candidate = source.entries[0]!
      if (target.pageNum < minAllowedPage(candidate.order_index)) break
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
    repositionColumnEntries(
      slot.entries,
      slot.colTop,
      slot.availableHeight,
      columnBottomMinPt,
      fixedInterGaps,
    )
    for (const e of slot.entries) {
      e.x_pt = slot.x
    }
    result.push(...slot.entries)
  }

  return result.sort((a, b) => a.order_index - b.order_index)
}

/**
 * Geçiş 2: sayfalara yerleştir.
 * Full-width: tüm sütunları senkron kapatır, içerik kutusuna yayılır;
 * sığmazsa sonraki sayfanın başına atomik taşınır (bölünmez/ezilmez).
 */
function computeLayoutEntriesFlexible(
  questionData: QuestionBlock[],
  payload: Record<string, unknown>,
): LayoutEntry[] {
  const geom0 = computeGeometry(payload, 1)
  const cols = geom0.cols
  const colW = geom0.colW
  const columnBottomMinPt = columnBottomReservePt(payload)
  const fixedInterGaps = useFasikulFixedInterGaps(payload)
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
  /** Sayfadaki her sütunun güncel y_top imleci (full-width senkronu için) */
  let colYTops: number[] = Array.from({ length: cols }, (_, c) => contentTopForCol(pageNum, c))

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
    if (colBuffer.length > 0) {
      colYTops[colIdx] = y
    }
    colBuffer = []
  }

  const nextColumn = () => {
    colIdx += 1
    if (colIdx >= cols) {
      pageNum += 1
      colIdx = 0
      colYTops = Array.from({ length: cols }, (_, c) => contentTopForCol(pageNum, c))
    }
    const g = computeGeometry(payload, pageNum)
    colTop = contentTopForColumn(payload, pageNum, colIdx, g.page_h_pt, g.page_w_pt, g.cols)
    // Full-width sonrası imleç güncellenmiş olabilir
    if (colYTops[colIdx]! < colTop - LAYOUT_EPS) {
      colTop = colYTops[colIdx]!
    } else {
      colYTops[colIdx] = colTop
    }
    availableHeight = colTop - g.contentBottom
  }

  const placeFullWidth = (q: QuestionBlock) => {
    if (colBuffer.length > 0) {
      flushColumn(computeAppliedGaps(colBuffer, availableHeight, columnBottomMinPt, fixedInterGaps))
    }

    const g = computeGeometry(payload, pageNum)
    // Satırı kapat: tüm sütunların en düşük (en dolu) y_top değeri
    for (let c = 0; c < cols; c++) {
      if (colYTops[c] == null || !Number.isFinite(colYTops[c])) {
        colYTops[c] = contentTopForCol(pageNum, c)
      }
    }
    let syncY = Math.min(...colYTops)
    let pageRemainingHeight = syncY - g.contentBottom
    let pageBreakBefore = false

    if (q.block_h + columnBottomMinPt > pageRemainingHeight + LAYOUT_EPS) {
      // Atomik taşı: sonraki sayfa başı (ezme/bölme yok)
      pageNum += 1
      colIdx = 0
      pageBreakBefore = true
      colYTops = Array.from({ length: cols }, (_, c) => contentTopForCol(pageNum, c))
      const g2 = computeGeometry(payload, pageNum)
      syncY = Math.min(...colYTops)
      pageRemainingHeight = syncY - g2.contentBottom
      result.push({
        ...q,
        page_num: pageNum,
        col_idx: 0,
        x_pt: g2.ml,
        y_top_pt: syncY,
        applied_gap_pt: q.preferred_gap_pt,
      })
    } else {
      result.push({
        ...q,
        page_num: pageNum,
        col_idx: 0,
        x_pt: g.ml,
        y_top_pt: syncY,
        applied_gap_pt: q.preferred_gap_pt,
      })
    }

    const newY = syncY - q.block_h - q.preferred_gap_pt
    for (let c = 0; c < cols; c++) colYTops[c] = newY
    colIdx = 0
    colTop = newY
    const gAfter = computeGeometry(payload, pageNum)
    availableHeight = colTop - gAfter.contentBottom

    if (q.scale_diag) {
      q.scale_diag.pageRemainingHeight = pageRemainingHeight
      q.scale_diag.pageBreakBefore = pageBreakBefore
      console.log(
        `[ScaleDiag:full-width-place] q=${q.order_index} page=${pageNum} ` +
          `pageRemainingHeight=${pageRemainingHeight.toFixed(1)} pageBreakBefore=${pageBreakBefore} ` +
          `y_top=${syncY.toFixed(1)} drawH=${q.draw_h.toFixed(1)} layoutMode=full-width`,
      )
    }
  }

  let i = 0
  while (i < questionData.length) {
    const q = questionData[i]!

    if (q.section?.start_new_page) {
      const pageHasPlaced = result.some((r) => r.page_num === pageNum)
      const midColumnWork = colBuffer.length > 0 || colIdx > 0
      const notAtColTop =
        Math.abs(colTop - contentTopForCol(pageNum, colIdx)) > LAYOUT_EPS
      if (pageHasPlaced || midColumnWork || notAtColTop) {
        if (colBuffer.length > 0) {
          flushColumn(
            computeAppliedGaps(colBuffer, availableHeight, columnBottomMinPt, fixedInterGaps),
          )
        }
        pageNum += 1
        colIdx = 0
        colYTops = Array.from({ length: cols }, (_, c) => contentTopForCol(pageNum, c))
        const gNew = computeGeometry(payload, pageNum)
        colTop = contentTopForColumn(payload, pageNum, 0, gNew.page_h_pt, gNew.page_w_pt, gNew.cols)
        colYTops[0] = colTop
        availableHeight = colTop - gNew.contentBottom
      }
    }

    if (q.span_full_width) {
      placeFullWidth(q)
      i += 1
      continue
    }

    colBuffer.push(q)

    if (columnBufferFits(colBuffer, availableHeight, columnBottomMinPt)) {
      i += 1
      continue
    }

    colBuffer.pop()
    if (colBuffer.length === 0) {
      // Tek soru sütuna sığmıyor — sonraki sütun/sayfa (full-width değilse yine de yerleştir)
      nextColumn()
      continue
    }
    flushColumn(computeAppliedGaps(colBuffer, availableHeight, columnBottomMinPt, fixedInterGaps))
    nextColumn()
  }

  if (colBuffer.length > 0) {
    flushColumn(computeAppliedGaps(colBuffer, availableHeight, columnBottomMinPt, fixedInterGaps))
  }

  // Full-width varken backfill yatay çakışma riski taşır — atla
  const hasFullWidth = questionData.some((b) => b.span_full_width)
  if (hasFullWidth) {
    return result.sort((a, b) => a.order_index - b.order_index)
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
  const questions = (payload.questions as Array<Record<string, unknown>>) ?? []
  const qByOrder = new Map(
    questions.map((q) => [Number(q.order_index ?? -1), q] as const),
  )
  const restartAt = new Set<number>()
  const rawSections = payload.sections
  if (Array.isArray(rawSections)) {
    for (const entry of rawSections) {
      if (!entry || typeof entry !== 'object') continue
      const s = entry as Record<string, unknown>
      if (s.restart_numbering === true && Number.isFinite(Number(s.start_idx))) {
        restartAt.add(Number(s.start_idx))
      }
    }
  }
  let counter = start
  for (const e of entries) {
    if (restartAt.has(e.order_index) || e.section?.restart_numbering) {
      counter = 1
    }
    const q = qByOrder.get(e.order_index)
    const skip = q
      ? !isOptikAnswerableLayoutQuestion(q)
      : e.content_type === 'explanation'
    if (skip) {
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
  contentWidthPt: number,
): LayoutRow[] {
  return entries.map((entry) => {
    const numTextW = estimateQuestionNumberTextWidthPt(entry.display_number, fontPt)
    const span = entry.span_full_width === true
    return {
      kind: 'question',
      order_index: entry.order_index,
      page_num: entry.page_num,
      x_pt: entry.x_pt,
      y_top_pt: entry.y_top_pt,
      w_pt: span ? contentWidthPt : colW,
      h_pt: entry.block_h,
      num_slot_w_pt: numTextW,
      // draw_w < sütun: sola hizalı (numara sonrası); sütuna yayılmaz
      img_x_pt: entry.x_pt + numTextW + imageGapPt,
      // Başlık kutunun dışında: blok tepesi y_top, görsel reserve kadar aşağıda
      img_y_top_pt:
        entry.y_top_pt -
        (entry.section_reserve_pt ?? 0) -
        (entry.badge_top_reserve_pt ?? 0),
      img_w_pt: entry.draw_w,
      img_h_pt: entry.draw_h,
      image_base64: skipImages ? undefined : entry.image_base64,
      question_id: entry.question_id,
      answer_key: entry.answer_key,
      display_number: entry.display_number,
      content_type: entry.content_type,
      scale_diag: entry.scale_diag,
      span_full_width: span,
      layout_mode: entry.layout_mode,
      section: entry.section,
    }
  })
}

function applyYTopOverrides(layout: LayoutRow[], overrides: Map<number, number>) {
  for (const item of layout) {
    const yt = overrides.get(item.order_index)
    if (yt == null) continue
    const dy = yt - item.y_top_pt
    item.y_top_pt = yt
    if (item.img_y_top_pt != null) item.img_y_top_pt += dy
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
    img_y_top_pt: row.img_y_top_pt != null ? row.img_y_top_pt + dy : row.img_y_top_pt,
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
  const minGapPt = Math.max(
    mmToPt(Number(payload.question_gap_min_mm ?? 12)),
    fasikulQuestionGapFloorPt(payload),
  )
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
  const questions = (payload.questions as Array<Record<string, unknown>>) ?? []
  const qByOrder = new Map(
    questions.map((q) => [Number(q.order_index ?? -1), q] as const),
  )
  const restartAt = new Set<number>()
  const rawSections = payload.sections
  if (Array.isArray(rawSections)) {
    for (const entry of rawSections) {
      if (!entry || typeof entry !== 'object') continue
      const s = entry as Record<string, unknown>
      if (s.restart_numbering === true && Number.isFinite(Number(s.start_idx))) {
        restartAt.add(Number(s.start_idx))
      }
    }
  }

  for (const pageNum of pageNums) {
    const geom = computeGeometry(payload, pageNum)
    for (let col = 0; col < cols; col++) {
      const items = getColumnItemsSortedTopFirstLayout(layout, pageNum, col, geom.columnX)
      for (const item of items) {
        if (restartAt.has(item.order_index) || item.section?.restart_numbering) {
          counter = 1
        }
        const q = qByOrder.get(item.order_index)
        const skip = q
          ? !isOptikAnswerableLayoutQuestion(q)
          : String(item.content_type ?? 'question') === 'explanation'
        if (skip) {
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

  const questionCount = questions.filter((q) =>
    isOptikAnswerableLayoutQuestion(q as Record<string, unknown>),
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
    geom,
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

  const contentWidthPt = geom.page_w_pt - geom.ml - geom.mr
  let layout = entriesToLayoutRows(
    entries,
    geom.colW,
    skipImages,
    questionNumberImageGapPt(payload),
    fontPt,
    contentWidthPt,
  )
  layout = applyLayoutPlacementOverrides(layout, payload)
  applyYTopOverrides(layout, overrides)

  // Her zaman sütun sütun okuma sırasına göre numarala (sol kolon yukarı→aşağı, sonra sağ)
  reapplyDisplayNumbersByReadingOrder(layout, payload)

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
      // Görsel placeholder çizilmesin diye img_* yok
    })
  }

  return { layout, page_w_pt: geom.page_w_pt, page_h_pt: geom.page_h_pt }
}
