import fs from 'node:fs'
import path from 'node:path'
import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, StandardFonts, rgb, degrees, type PDFPage, type PDFFont } from 'pdf-lib'
import {
  computeGeometry,
  computeLayoutFromPayload,
  mmToPt,
  questionNumberLeftOffsetPt,
  questionNumberImageGapPt,
  columnIndexFromLayoutXPt,
  FOOTER_TOP_OFFSET_MM,
  getImageSizeFromBase64,
  type LayoutRow,
} from './layout-engine.js'
import {
  calculateQuestionDrawMetrics,
  comparePreviewAndPdfExport,
  logPipelineDrawTable,
  computeColumnImageBounds,
  logColumnOverflowIfNeeded,
  IMG_COL_RIGHT_PAD_PT,
  type PipelineDrawLogRow,
} from './question-draw-metrics.js'
import {
  drawCenterLineText,
  drawColumnDividers,
  drawPageFrame,
  drawPageHeader,
  hexToRgbColor,
} from './pdf-header-draw.js'
import { drawFooterDecorativeStripesPdf } from './decorative-stripe-pdf.js'
import { isClassicTestBannerHeader, normalizeHeaderStyleId } from './header-styles.js'
import { CLASSIC_BANNER_LINE_PT } from './pdf-description-utils.js'
import { footerPageNumberCircleRadiusPt } from './footer-band-layout.js'
import {
  drawScratchGridOnPdfPage,
  resolveScratchGridRectPt,
  SCRATCH_PAD_BOTTOM_PT,
} from './question-scratch-grid.js'
import {
  watermarkActive,
  watermarkAngleDeg,
  watermarkLogoBase64,
  watermarkOpacityPct,
  watermarkSizePct,
  watermarkTextValue,
  pageNumberingEnabled,
  formatPageNumberLabel,
  questionNumberColorMode,
  themePrimaryColor,
  columnDividerColor,
  questionNumberFontPt,
} from './visual-properties.js'
import { drawSeparateAnswerKeyTablePdf, SEPARATE_AK, ANSWER_KEY_NAVY_HEX, ensureSeparateAnswerKeyPages, separateAnswerKeyCapacity } from './separate-answer-key-table.js'

import {
  estimateQuestionNumberTextWidthPt,
  maxQuestionNumberTextWidthPt,
  questionNumberLabel,
  QUESTION_NUM_FONT_PT,
} from './question-number-metrics.js'
/** Görsel tepe hizası: baseline = img_y_top - font_size × 0.85 (cap-height ofset) */
const QUESTION_NUM_TOP_OFFSET_RATIO = 0.85

function questionNumberBaselinePt(imgYTop: number, fontPt: number): number {
  return imgYTop - fontPt * QUESTION_NUM_TOP_OFFSET_RATIO
}

function questionNumberLeftPt(xCol: number, offsetPt: number): number {
  return xCol + offsetPt
}

const QUALITY_ZOOM: Record<string, number> = {
  normal: 4,
  high: 6,
  best: 8,
}

function rawBase64(value: string) {
  return value.includes(',') ? value.split(',')[1]! : value
}

function systemFontPaths(): {
  regular: string
  bold: string
  italic?: string
  boldItalic?: string
} | null {
  const candidates: Array<{
    regular: string
    bold: string
    italic?: string
    boldItalic?: string
  }> = []
  const win = process.env.SystemRoot ?? 'C:\\Windows'
  candidates.push({
    regular: path.join(win, 'Fonts', 'arial.ttf'),
    bold: path.join(win, 'Fonts', 'arialbd.ttf'),
    italic: path.join(win, 'Fonts', 'ariali.ttf'),
    boldItalic: path.join(win, 'Fonts', 'arialbi.ttf'),
  })
  candidates.push({
    regular: '/System/Library/Fonts/Supplemental/Arial.ttf',
    bold: '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    italic: '/System/Library/Fonts/Supplemental/Arial Italic.ttf',
    boldItalic: '/System/Library/Fonts/Supplemental/Arial Bold Italic.ttf',
  })
  candidates.push({
    regular: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    bold: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    italic: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf',
    boldItalic: '/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf',
  })
  return candidates.find((p) => fs.existsSync(p.regular)) ?? null
}

async function loadPdfFonts(pdf: PDFDocument): Promise<{
  regular: PDFFont
  bold: PDFFont
  italic: PDFFont
  boldItalic: PDFFont
}> {
  const paths = systemFontPaths()
  if (paths) {
    try {
      pdf.registerFontkit(fontkit)
      const regular = await pdf.embedFont(fs.readFileSync(paths.regular))
      const bold = fs.existsSync(paths.bold)
        ? await pdf.embedFont(fs.readFileSync(paths.bold))
        : regular
      const italic =
        paths.italic && fs.existsSync(paths.italic)
          ? await pdf.embedFont(fs.readFileSync(paths.italic))
          : regular
      const boldItalic =
        paths.boldItalic && fs.existsSync(paths.boldItalic)
          ? await pdf.embedFont(fs.readFileSync(paths.boldItalic))
          : bold
      return { regular, bold, italic, boldItalic }
    } catch {
      /* fallback */
    }
  }
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique)
  const boldItalic = await pdf.embedFont(StandardFonts.HelveticaBoldOblique)
  return { regular, bold, italic, boldItalic }
}

async function embedQuestionImage(pdf: PDFDocument, b64: string) {
  const bytes = Buffer.from(rawBase64(b64), 'base64')
  try {
    return await pdf.embedPng(bytes)
  } catch {
    return await pdf.embedJpg(bytes)
  }
}

function drawFooter(
  page: PDFPage,
  payload: Record<string, unknown>,
  geom: ReturnType<typeof computeGeometry>,
  pageNum: number,
  pageItems: LayoutRow[],
  fonts: { regular: PDFFont; bold: PDFFont; italic?: PDFFont },
  totalPages: number,
) {
  const theme = hexToRgbColor(themePrimaryColor(payload))
  const written = Boolean(payload.written_paper_header)
  const stroke = written ? rgb(0, 0, 0) : theme
  const footerTop = geom.contentBottom
  const footerBottom = geom.footerBottom

  if (written) {
    page.drawLine({
      start: { x: geom.ml, y: footerTop },
      end: { x: geom.page_w_pt - geom.mr, y: footerTop },
      thickness: 0.9,
      color: stroke,
    })
  } else if (isClassicTestBannerHeader(String(payload.header_style_id ?? ''))) {
    const bannerStroke = hexToRgbColor(String(payload.theme_color ?? themePrimaryColor(payload)))
    page.drawLine({
      start: { x: geom.ml, y: footerTop },
      end: { x: geom.page_w_pt - geom.mr, y: footerTop },
      thickness: CLASSIC_BANNER_LINE_PT,
      color: bannerStroke,
    })
    page.drawLine({
      start: { x: geom.ml, y: footerBottom },
      end: { x: geom.page_w_pt - geom.mr, y: footerBottom },
      thickness: CLASSIC_BANNER_LINE_PT,
      color: bannerStroke,
    })
  } else {
    drawFooterDecorativeStripesPdf(page, payload, geom, footerTop, footerBottom)
  }

  const includeAnswerKey = Boolean(payload.include_answer_key)
  const answerKeyMode = String(payload.answer_key_mode ?? 'per_page')
  if (includeAnswerKey && answerKeyMode === 'per_page' && pageItems.length > 0) {
    const cols = Math.max(1, geom.columnX.length)
    const buckets: string[][] = Array.from({ length: cols }, () => [])
    pageItems
      .filter((i) => i.display_number != null)
      .sort((a, b) => (a.display_number as number) - (b.display_number as number))
      .forEach((i) => {
        const col = columnIndexFromLayoutXPt(i.x_pt, geom.columnX)
        buckets[col]?.push(`${i.display_number}- ${i.answer_key || '?'}`)
      })
    const yAns = written ? footerTop - 3 : (footerTop + footerBottom) / 2 - 3
    for (let col = 0; col < cols; col++) {
      const ans = buckets[col]?.join('  ') ?? ''
      if (!ans) continue
      const colLeft = geom.columnX[col]!
      const colRight = colLeft + geom.colW
      const textW = fonts.bold.widthOfTextAtSize(ans, 9)
      let x = colLeft
      if (cols > 1 && col === cols - 1) {
        x = colRight - textW
      } else if (cols > 1 && col > 0 && col < cols - 1) {
        x = colLeft + (geom.colW - textW) / 2
      }
      page.drawText(ans, {
        x,
        y: yAns,
        size: 9,
        font: fonts.bold,
        color: written ? rgb(0, 0, 0) : hexToRgbColor(ANSWER_KEY_NAVY_HEX),
      })
    }
  }

  if (!written && pageNumberingEnabled(payload)) {
    const pg = formatPageNumberLabel(pageNum, totalPages, payload)
    const styleId = normalizeHeaderStyleId(String(payload.header_style_id ?? ''))
    const circleR = footerPageNumberCircleRadiusPt(footerTop, footerBottom, styleId)
    const cx = geom.ml + (geom.page_w_pt - geom.ml - geom.mr) / 2
    const cy = (footerTop + footerBottom) / 2
    const pageNumColor = hexToRgbColor(columnDividerColor(payload))
    page.drawCircle({
      x: cx,
      y: cy,
      size: circleR,
      color: pageNumColor,
      borderColor: pageNumColor,
      borderWidth: 0.5,
    })
    const chord = circleR * 2 * 0.72
    let fs = Math.min(10, circleR * 0.95)
    while (fs >= 5 && fonts.bold.widthOfTextAtSize(pg, fs) > chord) fs -= 0.5
    const pgW = fonts.bold.widthOfTextAtSize(pg, fs)
    page.drawText(pg, {
      x: cx - pgW / 2,
      y: cy - fs * 0.35,
      size: fs,
      font: fonts.bold,
      color: rgb(1, 1, 1),
    })
  }

  // Deneme: sağ alt navigasyon yazıları (Test modülünde yok)
  if (
    !written &&
    payload.show_footer_nav_hints === true
  ) {
    const lastQ = Math.max(0, Number(payload.last_question_page ?? 0))
    if (lastQ > 0 && pageNum >= 1 && pageNum <= lastQ) {
      const rightX = geom.page_w_pt - geom.mr
      const cy = (footerTop + footerBottom) / 2
      const bandH = Math.max(8, footerTop - footerBottom)
      const endFont = Math.min(8.5, Math.max(6, bandH * 0.28))
      const italic = fonts.italic ?? fonts.regular
      const color = rgb(0.067, 0.094, 0.153) // #111827
      if (pageNum === lastQ) {
        const gap = endFont * 0.35
        const line1 = 'TEST BİTTİ.'
        const line2 = 'CEVAPLARINIZI KONTROL EDİNİZ.'
        const w1 = italic.widthOfTextAtSize(line1, endFont)
        const w2 = italic.widthOfTextAtSize(line2, endFont)
        page.drawText(line1, {
          x: rightX - w1,
          y: cy + endFont * 0.55 + gap / 2 - endFont * 0.35,
          size: endFont,
          font: italic,
          color,
        })
        page.drawText(line2, {
          x: rightX - w2,
          y: cy - endFont * 0.55 - gap / 2 - endFont * 0.35,
          size: endFont,
          font: italic,
          color,
        })
      } else {
        const line = 'Diğer sayfaya geçiniz.'
        const w = italic.widthOfTextAtSize(line, endFont)
        page.drawText(line, {
          x: rightX - w,
          y: cy - endFont * 0.35,
          size: endFont,
          font: italic,
          color,
        })
      }
    }
  }
}

async function drawWatermark(
  pdf: PDFDocument,
  page: PDFPage,
  payload: Record<string, unknown>,
  geom: ReturnType<typeof computeGeometry>,
  fonts: { regular: PDFFont; bold: PDFFont },
) {
  if (!watermarkActive(payload)) return
  const opacity = Math.max(0.01, Math.min(1, watermarkOpacityPct(payload) / 100))
  const sizeFactor = Math.max(0.1, Math.min(1, watermarkSizePct(payload) / 100))
  const logoB64 = watermarkLogoBase64(payload)
  const cx = geom.page_w_pt / 2
  const cy = geom.page_h_pt / 2

  if (logoB64) {
    try {
      const image = await embedQuestionImage(pdf, logoB64)
      const targetW = geom.page_w_pt * 0.7 * sizeFactor
      const targetH = (image.height / image.width) * targetW
      page.drawImage(image, {
        x: cx - targetW / 2,
        y: cy - targetH / 2,
        width: targetW,
        height: targetH,
        opacity,
      })
    } catch {
      /* logo gömülemedi */
    }
    return
  }

  const text = watermarkTextValue(payload)
  if (!text) return
  const base = Math.min(geom.page_w_pt, geom.page_h_pt) * 0.12
  const fontSize = Math.max(10, base * sizeFactor)
  const color = hexToRgbColor(String(payload.watermark_text_color ?? payload.theme_color ?? '#1E88E5'))
  const font = fonts.bold
  const tw = font.widthOfTextAtSize(text.slice(0, 80), fontSize)
  const angleDeg = watermarkAngleDeg(payload)
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const rcx = tw / 2
  const rcy = fontSize * 0.35

  page.drawText(text.slice(0, 80), {
    x: cx - rcx * cos + rcy * sin,
    y: cy - rcx * sin - rcy * cos,
    size: fontSize,
    font,
    color,
    opacity,
    rotate: degrees(angleDeg),
  })
}

function collectAnswerKeyItems(
  layout: LayoutRow[],
  payload: Record<string, unknown>,
): Array<{ num: number; answer: string }> {
  const fromLayout = layout
    .filter((l) => l.kind !== 'answer_key_page' && l.display_number != null)
    .sort((a, b) => (a.display_number as number) - (b.display_number as number))
    .map((l) => ({
      num: l.display_number as number,
      answer: String(l.answer_key || '?').trim().toUpperCase() || '?',
    }))

  if (fromLayout.some((i) => i.answer && i.answer !== '?')) return fromLayout

  const questions = (payload.questions as Array<Record<string, unknown>>) ?? []
  const byOrder = new Map<number, string>()
  for (const q of questions) {
    const ans = String(q.answer_key ?? '').trim().toUpperCase()
    if (!ans) continue
    byOrder.set(Number(q.order_index ?? -1), ans)
  }
  if (byOrder.size === 0) return fromLayout

  return fromLayout.map((item, idx) => {
    const row = layout
      .filter((l) => l.kind !== 'answer_key_page' && l.display_number != null)
      .sort((a, b) => (a.display_number as number) - (b.display_number as number))[idx]
    const fromQ = row ? byOrder.get(row.order_index) : undefined
    return { num: item.num, answer: fromQ || item.answer }
  })
}

function drawAnswerKeyPage(
  page: PDFPage,
  layout: LayoutRow[],
  geom: ReturnType<typeof computeGeometry>,
  fonts: { regular: PDFFont; bold: PDFFont },
  payload: Record<string, unknown>,
  pageNum: number,
) {
  const mt = mmToPt(Number(payload.margin_top_mm ?? 10))
  const mb = mmToPt(Number(payload.margin_bottom_mm ?? 10))
  const yTop = geom.page_h_pt - mt - SEPARATE_AK.TOP_GAP_PT
  const contentW = geom.page_w_pt - geom.ml - geom.mr
  const footerTop = mb + mmToPt(FOOTER_TOP_OFFSET_MM)
  const availableHPt = Math.max(0, yTop - (footerTop + mmToPt(2)))
  const { capacity } = separateAnswerKeyCapacity({
    availableHeightPt: availableHPt,
    pairsPerRow: SEPARATE_AK.PAIRS_PER_ROW,
  })
  const entriesPerPage = Math.max(SEPARATE_AK.PAIRS_PER_ROW, capacity)

  const keyed = collectAnswerKeyItems(layout, payload)
  const akPageNums = [
    ...new Set(
      layout.filter((l) => l.kind === 'answer_key_page').map((l) => l.page_num),
    ),
  ].sort((a, b) => a - b)
  const pageIdx = Math.max(0, akPageNums.indexOf(pageNum))
  const chunk = keyed.slice(pageIdx * entriesPerPage, pageIdx * entriesPerPage + entriesPerPage)
  if (chunk.length === 0) return

  drawSeparateAnswerKeyTablePdf({
    page,
    x: geom.ml,
    yTop,
    width: contentW,
    items: chunk,
    fonts,
    title: 'Cevap Anahtarı',
  })
}

function buildDrawLayoutContext(payload: Record<string, unknown>): {
  singleAvailWPt: number
  fullWidthAvailWPt: number
  allowSlightOverflow: boolean
} {
  const geom = computeGeometry(payload, 1)
  const questions = (payload.questions as Array<Record<string, unknown>>) ?? []
  const questionCount = questions.filter(
    (q) => String(q.content_type ?? 'question') !== 'explanation',
  ).length
  const startNum = Math.max(1, Number(payload.question_number_start ?? 1))
  const fontPt = questionNumberFontPt(payload)
  const maxDisplayNum = startNum + Math.max(0, questionCount - 1)
  const maxNumTextWPt = maxQuestionNumberTextWidthPt(Math.max(1, maxDisplayNum), fontPt)
  const numImageGapPt = questionNumberImageGapPt(payload)
  const numOffsetPt = Math.max(0, questionNumberLeftOffsetPt(payload))
  const singleAvailWPt =
    geom.colW - maxNumTextWPt - numImageGapPt - IMG_COL_RIGHT_PAD_PT - numOffsetPt
  const fullWidthHorizontalPadding =
    maxNumTextWPt + numImageGapPt + IMG_COL_RIGHT_PAD_PT + numOffsetPt
  const fullWidthAvailWPt = Math.max(
    1,
    geom.page_w_pt - geom.ml - geom.mr - fullWidthHorizontalPadding,
  )
  return {
    singleAvailWPt,
    fullWidthAvailWPt,
    allowSlightOverflow: payload.allow_slight_overflow === true,
  }
}

async function drawQuestionsOnPage(
  pdf: PDFDocument,
  page: PDFPage,
  pageItems: LayoutRow[],
  fonts: { bold: PDFFont },
  payload: Record<string, unknown>,
  layoutCtx: {
    singleAvailWPt: number
    fullWidthAvailWPt: number
    allowSlightOverflow?: boolean
  },
  pdfLogRows: PipelineDrawLogRow[],
  counters: {
    renderedQuestionCount: number
    usedSharedMetricsCount: number
    usedLockedLayoutCount: number
    drawImageLogCount: number
  },
  exportId: string,
  usedLockedLayoutPositions: boolean,
) {
  const numOffsetPt = questionNumberLeftOffsetPt(payload)
  const numImageGapPt = questionNumberImageGapPt(payload)
  const numFontPt = questionNumberFontPt(payload)
  const numColor =
    questionNumberColorMode(payload) === 'black'
      ? rgb(0, 0, 0)
      : hexToRgbColor(themePrimaryColor(payload))

  const questions = (payload.questions as Array<Record<string, unknown>>) ?? []
  const qByOrder = new Map(questions.map((q) => [Number(q.order_index ?? -1), q]))
  const geom = computeGeometry(payload, 1)
  const colW = geom.colW
  const showScratch = payload.show_question_scratch_grid === true

  for (const item of pageItems) {
    const qEarly = qByOrder.get(item.order_index)
    const frameEnabled = Boolean(
      qEarly &&
        typeof qEarly === 'object' &&
        (qEarly as { fasikulFrame?: { enabled?: boolean } }).fasikulFrame?.enabled,
    )
    if (
      !frameEnabled &&
      item.display_number != null &&
      item.img_y_top_pt != null
    ) {
      const numText = questionNumberLabel(item.display_number)
      page.drawText(numText, {
        x: questionNumberLeftPt(item.x_pt, numOffsetPt),
        y: questionNumberBaselinePt(item.img_y_top_pt, numFontPt),
        size: numFontPt,
        font: fonts.bold,
        color: numColor,
      })
    }
    if (!item.image_base64) continue

    try {
      const image = await embedQuestionImage(pdf, item.image_base64)
      const hideNumSlot = frameEnabled
      const numTextW = hideNumSlot
        ? 0
        : item.display_number != null
          ? fonts.bold.widthOfTextAtSize(
              questionNumberLabel(item.display_number),
              numFontPt,
            )
          : estimateQuestionNumberTextWidthPt(item.display_number, numFontPt)

      const q = qEarly
      const size = getImageSizeFromBase64(item.image_base64)
      const metrics =
        q && size ? calculateQuestionDrawMetrics(q, layoutCtx, size) : null

      let drawW: number
      let drawH: number
      let usedShared = false
      if (metrics) {
        drawW = metrics.drawWidth
        drawH = metrics.drawHeight
        usedShared = true
        counters.usedSharedMetricsCount += 1
      } else {
        drawW = item.img_w_pt ?? 0
        drawH = item.img_h_pt ?? 0
        counters.usedLockedLayoutCount += 1
      }

      const x = item.x_pt + (hideNumSlot ? 0 : numOffsetPt + numTextW + numImageGapPt)
      const layoutImgTop = item.img_y_top_pt ?? 0
      const drawImgTop = layoutImgTop
      const y = drawImgTop - drawH
      const questionNo = item.display_number ?? item.order_index + 1
      counters.renderedQuestionCount += 1

      const bounds = computeColumnImageBounds({
        columnXPt: item.x_pt,
        columnContentWidthPt: item.span_full_width ? geom.page_w_pt - geom.ml - geom.mr : colW,
        rightPaddingPt: IMG_COL_RIGHT_PAD_PT,
        imageXPt: x,
        drawWidthPt: drawW,
      })
      logColumnOverflowIfNeeded(bounds, questionNo, 'PDF_EXPORT')

      if (metrics) {
        pdfLogRows.push({
          pipeline: 'PDF_EXPORT',
          questionNo,
          normalizationScale: metrics.normalizationScale,
          manualScale: metrics.manualScale,
          requestedScale: metrics.requestedScale,
          nativeWidthPt: metrics.nativeWidthPt,
          widthLimit: metrics.widthLimit,
          appliedScale: metrics.appliedScale,
          drawWidth: drawW,
          drawHeight: drawH,
          x,
          y,
          metadataSource: metrics.metadataSource,
          fulfillment: metrics.fulfillment,
          limitation: metrics.limitation,
          columnLeftPt: bounds.columnLeftPt,
          columnRightPt: bounds.columnRightPt,
          imageXPt: bounds.imageXPt,
          safeRightPt: bounds.safeRightPt,
          drawRightPt: bounds.drawRightPt,
          overflowPt: bounds.overflowPt,
          columnBoundsValid: bounds.columnBoundsValid,
        })
      }

      console.debug('[PDF_EXPORT:DRAW_IMAGE]', {
        exportId,
        questionNo,
        requestedScale: metrics?.requestedScale ?? null,
        appliedScale: metrics?.appliedScale ?? null,
        normalizationScale: metrics?.normalizationScale ?? null,
        manualScale: metrics?.manualScale ?? null,
        drawWidth: drawW,
        drawHeight: drawH,
        lockedWidth: item.img_w_pt ?? null,
        lockedHeight: item.img_h_pt ?? null,
        usedLockedLayout: !usedShared,
        usedLockedLayoutPositions,
        usedSharedMetrics: usedShared,
        columnLeftPt: bounds.columnLeftPt,
        columnRightPt: bounds.columnRightPt,
        imageXPt: bounds.imageXPt,
        safeRightPt: bounds.safeRightPt,
        drawRightPt: bounds.drawRightPt,
        overflowPt: bounds.overflowPt,
        columnBoundsValid: bounds.columnBoundsValid,
        file: 'electron/services/pdf-export-renderer.ts',
        fn: 'drawQuestionsOnPage',
      })
      counters.drawImageLogCount += 1

      const frameRaw =
        q && typeof q === 'object'
          ? (q as {
              fasikulFrame?: {
                enabled?: boolean
                fillColor?: string
                fillOpacityPct?: number
                cornerRadiusPx?: number
                innerPaddingPx?: number
              }
            }).fasikulFrame
          : undefined
      const innerPad = Math.max(
        0,
        Math.min(drawW / 3, drawH / 3, Number(frameRaw?.innerPaddingPx) || 0),
      )
      if (frameRaw?.enabled && frameRaw.fillColor) {
        const m = /^#?([0-9a-f]{6})$/i.exec(String(frameRaw.fillColor).trim())
        if (m) {
          const n = parseInt(m[1], 16)
          const opacity = Math.max(
            0,
            Math.min(1, (Number(frameRaw.fillOpacityPct) || 100) / 100),
          )
          page.drawRectangle({
            x,
            y,
            width: drawW,
            height: drawH,
            color: rgb(
              ((n >> 16) & 255) / 255,
              ((n >> 8) & 255) / 255,
              (n & 255) / 255,
            ),
            opacity,
            borderWidth: 0,
          })
        }
      }

      page.drawImage(image, {
        x: x + innerPad,
        y: y + innerPad,
        width: Math.max(1, drawW - innerPad * 2),
        height: Math.max(1, drawH - innerPad * 2),
      })
    } catch (err) {
      console.debug('[PDF_EXPORT:DRAW_IMAGE] FAILED', {
        exportId,
        order_index: item.order_index,
        err: err instanceof Error ? err.message : String(err),
      })
    }
  }

  if (showScratch) {
    const midX = geom.page_w_pt / 2
    const footerTopPt = geom.contentBottom
    for (const item of pageItems) {
      if (
        item.img_x_pt == null ||
        item.img_y_top_pt == null ||
        item.img_w_pt == null ||
        item.img_h_pt == null
      ) {
        continue
      }
      const currBottomPt = item.img_y_top_pt - item.img_h_pt
      const isLeft = item.img_x_pt < midX
      const below = pageItems.filter(
        (l) =>
          l.img_x_pt != null &&
          l.img_y_top_pt != null &&
          l.img_x_pt < midX === isLeft &&
          (l.img_y_top_pt ?? 0) < (item.img_y_top_pt ?? 0),
      )
      const next = below.sort((a, b) => (b.img_y_top_pt ?? 0) - (a.img_y_top_pt ?? 0))[0]
      const gapBottomPt = next?.img_y_top_pt ?? footerTopPt
      const questionLeftPt = item.img_x_pt
      const colRightPt = item.x_pt + item.w_pt
      const padBottomPt = SCRATCH_PAD_BOTTOM_PT
      const grid = resolveScratchGridRectPt({
        xPt: questionLeftPt,
        widthPt: Math.max(0, colRightPt - questionLeftPt),
        questionBottomPt: currBottomPt,
        gapBottomPt,
        padBottomPt,
      })
      if (grid) drawScratchGridOnPdfPage(page, grid)
    }
  }
}

export type PdfExportDiagnostics = {
  exportId: string
  renderedQuestionCount: number
  pdfExportDiagnosticsCount: number
  usedSharedMetricsCount: number
  usedLockedLayoutCount: number
  usedLockedLayoutPositions: boolean
  drawImageLogCount: number
  questions: Array<{
    questionNo: number
    requestedScale: number
    appliedScale: number
    drawWidth: number
    drawHeight: number
    normalizationScale: number
    manualScale: number
    metadataSource: string
  }>
  rendererFile: string
}

/** Önizleme ile aynı layout + CanvasPdfPreview header/footer */
export async function exportPdfFromPayload(
  payload: Record<string, unknown>,
): Promise<{ bytes: Uint8Array; diagnostics: PdfExportDiagnostics }> {
  void (QUALITY_ZOOM[String(payload.quality ?? 'high')] ?? 6)

  const exportId = String(payload.exportId ?? `exp_${Date.now()}`)
  console.debug('[PDF_EXPORT:RENDERER]', {
    exportId,
    file: 'electron/services/pdf-export-renderer.ts',
    fn: 'exportPdfFromPayload',
  })

  const layoutCtx = buildDrawLayoutContext(payload)
  const pdfLogRows: PipelineDrawLogRow[] = []
  const counters = {
    renderedQuestionCount: 0,
    usedSharedMetricsCount: 0,
    usedLockedLayoutCount: 0,
    drawImageLogCount: 0,
  }

  const geom0 = computeGeometry(payload, 1)
  const page_w_pt = geom0.page_w_pt
  const page_h_pt = geom0.page_h_pt

  const locked = payload.locked_layout
  let layout: LayoutRow[]
  let usedLockedLayoutPositions = false
  if (Array.isArray(locked) && locked.length > 0) {
    usedLockedLayoutPositions = true
    console.debug('[PDF_EXPORT:RENDERER] locked_layout positions', {
      exportId,
      lockedRows: locked.length,
      note: 'draw W/H still from calculateQuestionDrawMetrics',
    })
    const questions = (payload.questions as Array<Record<string, unknown>>) ?? []
    const imgByOrder = new Map<number, string>()
    for (const q of questions) {
      const b64 = q.image_base64 as string | undefined
      if (!b64) continue
      imgByOrder.set(Number(q.order_index ?? -1), b64)
    }
    layout = locked.map((raw) => {
      const item = raw as Record<string, unknown>
      const orderIndex = Number(item.order_index ?? 0)
      const imgW = Number(item.img_w_pt ?? item.w_pt ?? 0)
      const imgH = Number(item.img_h_pt ?? item.h_pt ?? 0)
      const yTop = Number(item.y_top_pt ?? 0)
      const imgYTop = Number(item.img_y_top_pt ?? yTop)
      const xPt = Number(item.x_pt ?? 0)
      const fromItem =
        (typeof item.image_base64 === 'string' && item.image_base64) ||
        (typeof item.image_b64 === 'string' && item.image_b64) ||
        undefined
      return {
        kind: String(item.kind ?? 'question'),
        order_index: orderIndex,
        page_num: Number(item.page_num ?? 1),
        x_pt: xPt,
        y_top_pt: yTop,
        w_pt: Number(item.w_pt ?? imgW),
        h_pt: Number(item.h_pt ?? imgH),
        num_slot_w_pt: Number(item.num_slot_w_pt ?? 0),
        img_x_pt: Number(item.img_x_pt ?? xPt),
        img_y_top_pt: imgYTop,
        img_w_pt: imgW,
        img_h_pt: imgH,
        image_base64: fromItem ?? imgByOrder.get(orderIndex),
        answer_key: item.answer_key != null ? String(item.answer_key) : undefined,
        display_number:
          item.display_number == null || item.display_number === ''
            ? null
            : Number(item.display_number),
        content_type: item.content_type != null ? String(item.content_type) : undefined,
        question_id: item.question_id != null ? String(item.question_id) : undefined,
        span_full_width: item.span_full_width === true,
        layout_mode:
          item.layout_mode === 'full-width' || item.layout_mode === 'auto'
            ? item.layout_mode
            : 'single-column',
      } satisfies LayoutRow
    })
  } else {
    console.debug('[PDF_EXPORT:RENDERER] computeLayoutFromPayload', { exportId })
    ;({ layout } = computeLayoutFromPayload(payload))
  }

  // Önizleme locked_layout’ta answer_key_page yok; ayrı sayfa stilini PDF’de çizmek için ekle
  layout = ensureSeparateAnswerKeyPages(layout, payload, page_h_pt) as LayoutRow[]

  const pdf = await PDFDocument.create()
  const fonts = await loadPdfFonts(pdf)

  const questionPages = layout.filter((l) => l.kind === 'question').map((l) => l.page_num)
  const answerKeyPages = layout.filter((l) => l.kind === 'answer_key_page').map((l) => l.page_num)
  const overlays = Array.isArray(payload.optik_form_overlays)
    ? (payload.optik_form_overlays as Array<Record<string, unknown>>)
    : []
  const optikPages = overlays.map((o) => Number(o.page_num ?? 0)).filter((n) => n > 0)
  const maxPage = Math.max(1, ...questionPages, ...answerKeyPages, ...optikPages)

  const overlaysByPage = new Map<number, Array<Record<string, unknown>>>()
  for (const o of overlays) {
    const pn = Number(o.page_num ?? 0)
    if (pn < 1) continue
    const list = overlaysByPage.get(pn) ?? []
    list.push(o)
    overlaysByPage.set(pn, list)
  }

  for (let pageNum = 1; pageNum <= maxPage; pageNum += 1) {
    const page = pdf.addPage([page_w_pt, page_h_pt])
    const geom = computeGeometry(payload, pageNum)
    const isAnswerKeyPage = layout.some(
      (l) => l.kind === 'answer_key_page' && l.page_num === pageNum,
    )
    const pageOverlays = overlaysByPage.get(pageNum) ?? []
    const isOptikOnlyPage =
      pageOverlays.length > 0 &&
      !layout.some((l) => l.page_num === pageNum && l.kind !== 'answer_key_page')

    if (isAnswerKeyPage) {
      drawAnswerKeyPage(page, layout, geom, fonts, payload, pageNum)
      continue
    }

    if (!isOptikOnlyPage) {
      await drawPageHeader(pdf, page, payload, geom, pageNum, fonts, false)
      const pageItems = layout.filter((l) => l.page_num === pageNum && l.kind === 'question')
      const skipBands = pageItems
        .filter((l) => l.span_full_width)
        .map((l) => {
          const yTop = Number(l.img_y_top_pt ?? l.y_top_pt ?? 0)
          const h = Number(l.img_h_pt ?? l.h_pt ?? 0)
          return { yBottom: yTop - h, yTop }
        })
      drawColumnDividers(page, payload, geom, pageNum, false, skipBands)

      await drawQuestionsOnPage(
        pdf,
        page,
        pageItems,
        fonts,
        payload,
        layoutCtx,
        pdfLogRows,
        counters,
        exportId,
        usedLockedLayoutPositions,
      )

      drawCenterLineText(page, payload, geom, pageNum, fonts, false)
      drawFooter(page, payload, geom, pageNum, pageItems, fonts, maxPage)
    } else {
      drawFooter(page, payload, geom, pageNum, [], fonts, maxPage)
    }

    for (const o of pageOverlays) {
      const b64 = String(o.image_png_base64 ?? '')
      if (!b64) continue
      try {
        const image = await embedQuestionImage(pdf, b64)
        page.drawImage(image, {
          x: Number(o.x_pt ?? 0),
          y: Number(o.y_pt ?? 0),
          width: Number(o.w_pt ?? 0),
          height: Number(o.h_pt ?? 0),
        })
      } catch {
        /* optik overlay gömülemedi */
      }
    }

    await drawWatermark(pdf, page, payload, geom, fonts)
    drawPageFrame(page, payload, geom)
  }

  logPipelineDrawTable(pdfLogRows, {
    equalizeRunId:
      typeof payload.equalize_run_id === 'string' ? payload.equalize_run_id : null,
  })
  const previewMetrics = payload.preview_draw_metrics as
    | Array<{ questionNo: number; appliedScale: number; drawWidth: number; drawHeight: number }>
    | undefined
  comparePreviewAndPdfExport(Array.isArray(previewMetrics) ? previewMetrics : [], pdfLogRows)

  const bytes = await pdf.save()
  const equalizeRunId =
    typeof payload.equalize_run_id === 'string' ? payload.equalize_run_id : null
  const diagnostics: PdfExportDiagnostics = {
    exportId,
    renderedQuestionCount: counters.renderedQuestionCount,
    pdfExportDiagnosticsCount: pdfLogRows.length,
    usedSharedMetricsCount: counters.usedSharedMetricsCount,
    usedLockedLayoutCount: counters.usedLockedLayoutCount,
    usedLockedLayoutPositions,
    drawImageLogCount: counters.drawImageLogCount,
    questions: pdfLogRows.map((r) => ({
      questionNo: r.questionNo,
      requestedScale: r.requestedScale,
      appliedScale: r.appliedScale,
      drawWidth: r.drawWidth,
      drawHeight: r.drawHeight,
      normalizationScale: r.normalizationScale,
      manualScale: r.manualScale,
      metadataSource: r.metadataSource,
    })),
    rendererFile: 'electron/services/pdf-export-renderer.ts#exportPdfFromPayload',
  }
  console.debug('[PDF_EXPORT:RENDERER] done', {
    exportId,
    equalizeRunId,
    stage: 'PDF_EXPORT',
    renderedQuestionCount: diagnostics.renderedQuestionCount,
    pdfExportDiagnosticsCount: diagnostics.pdfExportDiagnosticsCount,
    usedSharedMetricsCount: diagnostics.usedSharedMetricsCount,
    usedLockedLayoutCount: diagnostics.usedLockedLayoutCount,
    drawImageLogCount: diagnostics.drawImageLogCount,
  })
  return { bytes, diagnostics }
}
