/** Yazılı (açık uçlu vb.) soru — layout yüksekliği (PDF pt) */

export const WRITTEN_BADGE_H_PT = 16
export const WRITTEN_BADGE_GAP_PT = 8
export const WRITTEN_STEM_LINE_PT = 12
export const WRITTEN_ANSWER_LINE_GAP_PT = 14
export const WRITTEN_ANSWER_BOX_H_PT = 64
export const WRITTEN_CHARS_PER_LINE = 42

export function stripHtmlToText(html: string): string {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export function estimateWrittenStemHeightPt(stemHtml: string, availWPt: number): number {
  const text = stripHtmlToText(stemHtml)
  if (!text) return 0
  const charsPerLine = Math.max(
    20,
    Math.floor((availWPt / 5.2) || WRITTEN_CHARS_PER_LINE),
  )
  let lines = 0
  for (const para of text.split('\n')) {
    const t = para.trim()
    if (!t) {
      lines += 0.5
      continue
    }
    lines += Math.max(1, Math.ceil(t.length / charsPerLine))
  }
  return Math.max(WRITTEN_STEM_LINE_PT, Math.ceil(lines) * WRITTEN_STEM_LINE_PT)
}

export function writtenAnswerAreaHeightPt(
  answerArea: string | undefined,
  answerLines: number | undefined,
): number {
  const area = answerArea || 'lines'
  if (area === 'none') return 0
  if (area === 'box') return WRITTEN_ANSWER_BOX_H_PT
  const n = Math.max(1, Math.min(30, Math.round(Number(answerLines) || 5)))
  return n * WRITTEN_ANSWER_LINE_GAP_PT
}

/** Görselsiz yazılı soru bloğu yüksekliği (rozet + metin + cevap alanı) */
export function writtenQuestionDrawHeightPt(q: Record<string, unknown>, availWPt: number): number {
  const stemH = estimateWrittenStemHeightPt(String(q.writtenStemHtml ?? ''), availWPt)
  const answerH = writtenAnswerAreaHeightPt(
    q.writtenAnswerArea as string | undefined,
    Number(q.writtenAnswerLines),
  )
  return WRITTEN_BADGE_H_PT + WRITTEN_BADGE_GAP_PT + stemH + answerH
}

export function isWrittenLayoutQuestion(q: Record<string, unknown>): boolean {
  const t = q.writtenType
  return typeof t === 'string' && t.length > 0
}

function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const h = String(hex || '').replace('#', '')
  if (h.length !== 6) return { r: 0.05, g: 0.58, b: 0.53 }
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  }
}

/** pdf-lib sayfasına yazılı açık uçlu soru çiz (PDF pt, yTop = üst kenar) */
export function drawWrittenOpenEndedOnPdfPage(
  // pdf-lib PDFPage — tip gevşek tutulur (Color generics)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  opts: {
    x: number
    yTop: number
    w: number
    h: number
    displayNumber: number
    stemHtml?: string
    answerArea?: string
    answerLines?: number
    accentHex?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    font: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fontBold: any
    rgb: (r: number, g: number, b: number) => unknown
  },
): void {
  const {
    x,
    yTop,
    w,
    h,
    displayNumber,
    stemHtml = '',
    answerArea = 'lines',
    answerLines = 5,
    accentHex = '#0D9488',
    font,
    fontBold,
    rgb,
  } = opts
  if (!(w > 0) || !(h > 0)) return

  const accent = hexToRgb01(accentHex)
  const accentFill = hexToRgb01(accentHex)
  const label = `Soru ${displayNumber}`
  const badgeSize = 9
  const tw = fontBold.widthOfTextAtSize(label, badgeSize)
  const badgeW = Math.min(w, tw + 10)
  const badgeH = WRITTEN_BADGE_H_PT
  const badgeBottom = yTop - badgeH

  page.drawRectangle({
    x,
    y: badgeBottom,
    width: badgeW,
    height: badgeH,
    color: rgb(accentFill.r, accentFill.g, accentFill.b),
    opacity: 0.14,
    borderWidth: 0,
  })
  page.drawRectangle({
    x,
    y: badgeBottom,
    width: 2.5,
    height: badgeH,
    color: rgb(accent.r, accent.g, accent.b),
    borderWidth: 0,
  })
  page.drawText(label, {
    x: x + 6,
    y: badgeBottom + 4,
    size: badgeSize,
    font: fontBold,
    color: rgb(accent.r, accent.g, accent.b),
  })

  let cursorTop = yTop - badgeH - WRITTEN_BADGE_GAP_PT
  const stem = stripHtmlToText(stemHtml)
  const stemSize = 10
  if (stem) {
    const maxChars = Math.max(20, Math.floor(w / 5.2))
    const paras = stem.split('\n')
    for (const para of paras) {
      let rest = para.trim()
      if (!rest) {
        cursorTop -= WRITTEN_STEM_LINE_PT * 0.5
        continue
      }
      while (rest.length > 0 && cursorTop > yTop - h + 4) {
        let take = Math.min(maxChars, rest.length)
        if (take < rest.length) {
          const slice = rest.slice(0, take)
          const sp = slice.lastIndexOf(' ')
          if (sp > 10) take = sp
        }
        const line = rest.slice(0, take).trim()
        rest = rest.slice(take).trim()
        page.drawText(line, {
          x,
          y: cursorTop - stemSize,
          size: stemSize,
          font,
          color: rgb(0.12, 0.16, 0.23),
        })
        cursorTop -= WRITTEN_STEM_LINE_PT
      }
    }
    cursorTop -= 2
  }

  const area = answerArea || 'lines'
  const lineColor = rgb(0.58, 0.64, 0.72)
  if (area === 'box') {
    const boxH = Math.min(WRITTEN_ANSWER_BOX_H_PT, Math.max(24, cursorTop - (yTop - h)))
    if (boxH > 8) {
      page.drawRectangle({
        x,
        y: cursorTop - boxH,
        width: w,
        height: boxH,
        borderColor: lineColor,
        borderWidth: 0.9,
        borderDashArray: [3, 2],
      })
    }
    return
  }
  if (area === 'none') return

  const n = Math.max(1, Math.min(30, Math.round(Number(answerLines) || 5)))
  for (let i = 0; i < n; i++) {
    const ly = cursorTop - (i + 1) * WRITTEN_ANSWER_LINE_GAP_PT
    if (ly < yTop - h) break
    page.drawLine({
      start: { x, y: ly },
      end: { x: x + w, y: ly },
      thickness: 0.75,
      color: lineColor,
      dashArray: [2.5, 2],
    })
  }
}
