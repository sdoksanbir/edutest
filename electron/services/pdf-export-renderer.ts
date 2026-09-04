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
  type LayoutRow,
} from './layout-engine.js'
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
  themeAccentColor,
  questionNumberFontPt,
} from './visual-properties.js'

import {
  estimateQuestionNumberTextWidthPt,
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

function systemFontPaths(): { regular: string; bold: string } | null {
  const candidates: Array<{ regular: string; bold: string }> = []
  const win = process.env.SystemRoot ?? 'C:\\Windows'
  candidates.push({
    regular: path.join(win, 'Fonts', 'arial.ttf'),
    bold: path.join(win, 'Fonts', 'arialbd.ttf'),
  })
  candidates.push({
    regular: '/System/Library/Fonts/Supplemental/Arial.ttf',
    bold: '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
  })
  candidates.push({
    regular: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    bold: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  })
  return candidates.find((p) => fs.existsSync(p.regular)) ?? null
}

async function loadPdfFonts(pdf: PDFDocument): Promise<{ regular: PDFFont; bold: PDFFont }> {
  const paths = systemFontPaths()
  if (paths) {
    try {
      pdf.registerFontkit(fontkit)
      const regular = await pdf.embedFont(fs.readFileSync(paths.regular))
      const bold = fs.existsSync(paths.bold)
        ? await pdf.embedFont(fs.readFileSync(paths.bold))
        : regular
      return { regular, bold }
    } catch {
      /* fallback */
    }
  }
  return {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  }
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
  fonts: { regular: PDFFont; bold: PDFFont },
  totalPages: number,
) {
  const theme = hexToRgbColor(themePrimaryColor(payload))
  const accent = hexToRgbColor(themeAccentColor(payload))
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
        color: stroke,
      })
    }
  }

  if (!written && pageNumberingEnabled(payload)) {
    const pg = formatPageNumberLabel(pageNum, totalPages, payload)
    const styleId = normalizeHeaderStyleId(String(payload.header_style_id ?? ''))
    const circleR = footerPageNumberCircleRadiusPt(footerTop, footerBottom, styleId)
    const cx = geom.ml + (geom.page_w_pt - geom.ml - geom.mr) / 2
    const cy = (footerTop + footerBottom) / 2
    page.drawCircle({
      x: cx,
      y: cy,
      size: circleR,
      color: accent,
      borderColor: accent,
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

function drawAnswerKeyPage(
  page: PDFPage,
  layout: LayoutRow[],
  geom: ReturnType<typeof computeGeometry>,
  fonts: { regular: PDFFont; bold: PDFFont },
) {
  const mt = mmToPt(Number(10))
  page.drawText('CEVAP ANAHTARI', {
    x: geom.ml,
    y: geom.page_h_pt - mt - 20,
    size: 12,
    font: fonts.bold,
  })

  const keyed = layout
    .filter((l) => l.kind === 'question' && l.display_number != null)
    .sort((a, b) => (a.display_number as number) - (b.display_number as number))

  const colCount = 4
  const colW = (geom.page_w_pt - geom.ml - geom.mr) / colCount
  let y = geom.page_h_pt - mt - 40
  let col = 0

  for (const item of keyed) {
    page.drawText(`${item.display_number}- ${item.answer_key || '?'}`, {
      x: geom.ml + col * colW,
      y,
      size: 9,
      font: fonts.bold,
    })
    col += 1
    if (col >= colCount) {
      col = 0
      y -= 14
    }
  }
}

async function drawQuestionsOnPage(
  pdf: PDFDocument,
  page: PDFPage,
  pageItems: LayoutRow[],
  fonts: { bold: PDFFont },
  payload: Record<string, unknown>,
) {
  const numOffsetPt = questionNumberLeftOffsetPt(payload)
  const numImageGapPt = questionNumberImageGapPt(payload)
  const numFontPt = questionNumberFontPt(payload)
  const numColor =
    questionNumberColorMode(payload) === 'black'
      ? rgb(0, 0, 0)
      : hexToRgbColor(themePrimaryColor(payload))
  for (const item of pageItems) {
    if (item.display_number != null && item.img_y_top_pt != null) {
      const numText = questionNumberLabel(item.display_number)
      const numTextW = fonts.bold.widthOfTextAtSize(numText, numFontPt)
      page.drawText(numText, {
        x: questionNumberLeftPt(item.x_pt, numOffsetPt),
        y: questionNumberBaselinePt(item.img_y_top_pt, numFontPt),
        size: numFontPt,
        font: fonts.bold,
        color: numColor,
      })
    }
    if (item.image_base64) {
      try {
        const image = await embedQuestionImage(pdf, item.image_base64)
        const numTextW =
          item.display_number != null
            ? fonts.bold.widthOfTextAtSize(
                questionNumberLabel(item.display_number),
                numFontPt,
              )
            : estimateQuestionNumberTextWidthPt(item.display_number, numFontPt)
        // Canvas ile aynı: x = sütun + numara ofseti + numara genişliği + gap
        page.drawImage(image, {
          x: item.x_pt + numOffsetPt + numTextW + numImageGapPt,
          y: item.img_y_top_pt - item.img_h_pt,
          width: item.img_w_pt,
          height: item.img_h_pt,
        })
      } catch {
        /* görsel gömülemedi */
      }
    }
  }
}

/** Önizleme ile aynı layout + CanvasPdfPreview header/footer */
export async function exportPdfFromPayload(payload: Record<string, unknown>): Promise<Uint8Array> {
  void (QUALITY_ZOOM[String(payload.quality ?? 'high')] ?? 6)

  const geom0 = computeGeometry(payload, 1)
  const page_w_pt = geom0.page_w_pt
  const page_h_pt = geom0.page_h_pt

  const locked = payload.locked_layout
  let layout: LayoutRow[]
  if (Array.isArray(locked) && locked.length > 0) {
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
      } satisfies LayoutRow
    })
  } else {
    ;({ layout } = computeLayoutFromPayload(payload))
  }

  const pdf = await PDFDocument.create()
  const fonts = await loadPdfFonts(pdf)

  const questionPages = layout.filter((l) => l.kind === 'question').map((l) => l.page_num)
  const answerKeyPages = layout.filter((l) => l.kind === 'answer_key_page').map((l) => l.page_num)
  const maxPage = Math.max(1, ...questionPages, ...answerKeyPages)

  for (let pageNum = 1; pageNum <= maxPage; pageNum += 1) {
    const page = pdf.addPage([page_w_pt, page_h_pt])
    const geom = computeGeometry(payload, pageNum)
    const isAnswerKeyPage = layout.some(
      (l) => l.kind === 'answer_key_page' && l.page_num === pageNum,
    )

    if (isAnswerKeyPage) {
      drawAnswerKeyPage(page, layout, geom, fonts)
      continue
    }

    await drawPageHeader(pdf, page, payload, geom, pageNum, fonts, false)
    drawColumnDividers(page, payload, geom, pageNum, false)

    const pageItems = layout.filter((l) => l.page_num === pageNum && l.kind === 'question')
    await drawQuestionsOnPage(pdf, page, pageItems, fonts, payload)

    drawCenterLineText(page, payload, geom, pageNum, fonts, false)
    drawFooter(page, payload, geom, pageNum, pageItems, fonts, maxPage)
    await drawWatermark(pdf, page, payload, geom, fonts)
    drawPageFrame(page, payload, geom)
  }

  return pdf.save()
}
