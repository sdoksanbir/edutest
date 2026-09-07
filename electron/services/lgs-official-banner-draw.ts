/**
 * LGS resmi deneme başlığı — pdf-lib vektör çizimi (preview SVG ile hizalı).
 * viewBox 925×272 → içerik genişliğine ölçeklenir.
 */
import type { PDFDocument, PDFFont, PDFPage, RGB } from 'pdf-lib'
import { rgb } from 'pdf-lib'
import type { HeaderConfig } from './corporate-header-layout.js'
import { lgsOfficialBannerHeaderBlockHeightPt } from './header-styles.js'
import { headerFieldDisplayText } from './header-field-visibility.js'
import { parseLogoBytes } from './header-logo.js'

const VB_W = 925
const GREEN = '#39B54A'
/** Kitapçık türü arka planı — vurgu rengi */
const GREEN_SOFT = '#E4F0D4'
/** Banner yazı rengi — siyah */
const TEXT = '#000000'

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  if (!Number.isFinite(n)) return rgb(0.22, 0.71, 0.29)
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

function bookletLetterFromConfig(config: HeaderConfig): string {
  const raw = String(config.lgsBookletType ?? '')
    .trim()
    .toUpperCase()
  return /^[A-D]$/.test(raw) ? raw : ''
}

function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h / 2)
  return [
    `M${(x + rr).toFixed(2)},${y.toFixed(2)}`,
    `H${(x + w - rr).toFixed(2)}`,
    `Q${(x + w).toFixed(2)},${y.toFixed(2)} ${(x + w).toFixed(2)},${(y + rr).toFixed(2)}`,
    `V${(y + h - rr).toFixed(2)}`,
    `Q${(x + w).toFixed(2)},${(y + h).toFixed(2)} ${(x + w - rr).toFixed(2)},${(y + h).toFixed(2)}`,
    `H${(x + rr).toFixed(2)}`,
    `Q${x.toFixed(2)},${(y + h).toFixed(2)} ${x.toFixed(2)},${(y + h - rr).toFixed(2)}`,
    `V${(y + rr).toFixed(2)}`,
    `Q${x.toFixed(2)},${y.toFixed(2)} ${(x + rr).toFixed(2)},${y.toFixed(2)}`,
    'Z',
  ].join(' ')
}

function hexagonPath(cx: number, cy: number, r: number): string {
  const pts: string[] = []
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30)
    pts.push(
      `${i === 0 ? 'M' : 'L'}${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`,
    )
  }
  return `${pts.join(' ')} Z`
}

function wavePath(index: number): string {
  const baseY = 22 + index * 7.2
  const amp = 15
  const segs: string[] = []
  for (let x = 0; x <= VB_W; x += 6) {
    const t = x / VB_W
    const y =
      baseY +
      amp * Math.sin(t * Math.PI * 2.05 + 0.15) +
      amp * 0.28 * Math.sin(t * Math.PI * 4.1 + 0.4) +
      (index - 3.5) * 0.35
    segs.push(`${x === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(2)}`)
  }
  return segs.join(' ')
}

function normalizeTitle(title: string): string {
  const raw = title.replace(/\s+/g, ' ').trim()
  if (!raw) {
    return 'SINAVLA ÖĞRENCİ ALACAK ORTAÖĞRETİM KURUMLARINA İLİŞKİN MERKEZİ SINAV'
  }
  return raw.toUpperCase()
}

/** LGS resmi banner yönergesi — görsel varsayılan; ÖSYM metninden bağımsız */
function lgsOfficialInstructionLines(questionCount: number): [string, string] {
  const q = Math.max(1, Math.round(questionCount))
  return [
    `1. Bu testte ${q} soru vardır.`,
    '2. Cevaplarınızı, cevap kâğıdına işaretleyiniz.',
  ]
}

function parseInstructionLines(
  texts: string[] | undefined,
  fallback: [string, string],
): [string, string] {
  const plain = (texts ?? [])
    .flatMap((t) =>
      String(t ?? '')
        .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .split(/\n+/),
    )
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  return [plain[0] || fallback[0], plain[1] || fallback[1]]
}

export type LgsOfficialDrawCtx = {
  questionCount?: number
  instructionTexts?: string[]
}

export async function drawLgsOfficialBannerPdf(
  pdf: PDFDocument,
  page: PDFPage,
  config: HeaderConfig,
  geom: { page_w_pt: number; page_h_pt: number; ml: number; mr: number },
  mt: number,
  fonts: { regular: PDFFont; bold: PDFFont },
  ctx: LgsOfficialDrawCtx = {},
) {
  const contentW = geom.page_w_pt - geom.ml - geom.mr
  void lgsOfficialBannerHeaderBlockHeightPt(contentW)
  const scale = contentW / VB_W
  const ox = geom.ml
  const oyTop = geom.page_h_pt - mt

  const px = (x: number) => ox + x * scale
  const pyTop = (y: number) => oyTop - y * scale
  const ps = (n: number) => n * scale

  const greenHex = (config.primaryColor || '').trim() || GREEN
  const softHex = (config.accentColor || '').trim() || GREEN_SOFT
  const yearFillHex = (config.lgsYearFillColor || '').trim() || softHex
  const yearTextHex = (config.lgsYearTextColor || '').trim() || TEXT
  const yearFontPt = Math.max(8, Math.min(22, Number(config.lgsYearFontPt ?? 17) || 17))
  const yearPadX = Math.max(4, Math.min(48, Number(config.lgsYearPadXPt ?? 18) || 18))
  const yearPadY = Math.max(2, Math.min(24, Number(config.lgsYearPadYPt ?? 8) || 8))
  const green = hexToRgb(greenHex)
  const soft = hexToRgb(softHex)
  const yearFill = hexToRgb(yearFillHex)
  const yearText = hexToRgb(yearTextHex)
  const titleFontPt = Math.max(8, Math.min(28, Number(config.lgsTitleFontPt ?? 19) || 19))
  const titleColor = hexToRgb((config.lgsTitleTextColor || '').trim() || TEXT)
  const titleBold = config.lgsTitleBold !== false
  const subjectFontPt = Math.max(8, Math.min(28, Number(config.lgsSubjectFontPt ?? 24) || 24))
  const subjectColor = hexToRgb((config.lgsSubjectTextColor || '').trim() || TEXT)
  const subjectBold = config.lgsSubjectBold !== false
  const subjectBandW = Math.max(
    160,
    Math.min(893, Number(config.lgsSubjectBandWidthPt ?? 480) || 480),
  )
  const instructionFontPt = Math.max(
    8,
    Math.min(22, Number(config.lgsInstructionFontPt ?? 15) || 15),
  )
  const text = hexToRgb(TEXT)
  const white = rgb(1, 1, 1)
  const institutionName = headerFieldDisplayText(config, 'brandName').trim()

  /** Başlık / test adı / yönerge — eşit ara boşluk (SVG preview ile aynı) */
  const STACK_TOP = 112
  const STACK_BOTTOM = 256
  const INSTR_H = 52
  const titleBlockH = Math.max(16, titleFontPt)
  const bandH = Math.max(26, subjectFontPt + 14)
  const stackGap = Math.max(
    4,
    (STACK_BOTTOM - STACK_TOP - titleBlockH - bandH - INSTR_H) / 2,
  )
  const titleBaseline = STACK_TOP + titleFontPt * 0.85
  const bandY = STACK_TOP + titleBlockH + stackGap
  const instrY = bandY + bandH + stackGap
  /** İki satırlık yönerge bloğu — kutu içinde dikey ortalı (SVG ile aynı) */
  const instrLineGap = Math.max(instructionFontPt * 1.3, 16)
  const instrMidY = instrY + INSTR_H / 2
  const instrBaselineNudge = instructionFontPt * 0.35
  const instrLine1Y = instrMidY - instrLineGap / 2 + instrBaselineNudge
  const instrLine2Y = instrMidY + instrLineGap / 2 + instrBaselineNudge

  const booklet = bookletLetterFromConfig(config)
  const qCount = Math.max(1, Math.round(ctx.questionCount ?? 20))
  const [line1, line2] = parseInstructionLines(
    ctx.instructionTexts,
    lgsOfficialInstructionLines(qCount),
  )
  const subject = ((config.subject || '').trim() || 'MATEMATİK').toUpperCase()
  const titleLine = normalizeTitle(
    (config.examBannerTitle || '').trim() ||
      'SINAVLA ÖĞRENCİ ALACAK ORTAÖĞRETİM KURUMLARINA İLİŞKİN MERKEZİ SINAV',
  )
  const YEAR_DEFAULT = '2026 - 2027 EĞİTİM - ÖĞRETİM YILI'
  const yearLabel = (config.academicYear || '').trim() || YEAR_DEFAULT

  const pathOpts = { x: ox, y: oyTop, scale }

  for (let i = 0; i < 8; i++) {
    page.drawSvgPath(wavePath(i), {
      ...pathOpts,
      borderColor: green,
      borderWidth: Math.max(0.35, ps(1.15)),
      borderDashArray: [ps(1.4), ps(3.6)],
    })
  }

  const hexCx = 58
  const hexCy = 52
  const hexR = 36
  page.drawSvgPath(hexagonPath(hexCx, hexCy, hexR + 2.2), {
    ...pathOpts,
    borderColor: green,
    borderWidth: Math.max(0.35, ps(1.2)),
    borderOpacity: 0.55,
  })
  page.drawSvgPath(hexagonPath(hexCx, hexCy, hexR), {
    ...pathOpts,
    color: soft,
    borderColor: green,
    borderWidth: Math.max(0.45, ps(1.6)),
  })
  if (booklet) {
    const fs = ps(42)
    const tw = fonts.bold.widthOfTextAtSize(booklet, fs)
    page.drawText(booklet, {
      x: px(hexCx) - tw / 2,
      y: pyTop(hexCy) - fs * 0.35,
      size: fs,
      font: fonts.bold,
      color: text,
    })
  }

  const logoCx = 400
  const logoCy = 50
  const logoSizePct = Math.max(40, Math.min(200, Number(config.lgsLogoSizePct ?? 100) || 100))
  const logoR = 42 * (logoSizePct / 100)
  const logoInnerPad = 8 * (logoSizePct / 100)
  const logoOuterPad = 8 * (logoSizePct / 100)
  const logoInnerR = Math.max(4, logoR - logoInnerPad)
  const logoOuterR = logoR + logoOuterPad
  const showLogo = config.lgsShowLogo !== false
  if (showLogo) {
    page.drawCircle({
      x: px(logoCx),
      y: pyTop(logoCy),
      size: ps(logoOuterR),
      color: white,
    })
    page.drawCircle({
      x: px(logoCx),
      y: pyTop(logoCy),
      size: ps(logoR),
      color: white,
      borderColor: green,
      borderWidth: Math.max(0.3, ps(1)),
    })

    const logoUrl = String(config.lgsLogoUrl || '').trim()
    let drewLogo = false
    const logoBytes = logoUrl ? parseLogoBytes(logoUrl) : null
    if (logoBytes) {
      try {
        const isJpg = /^data:image\/jpe?g/i.test(logoUrl)
        const img = isJpg ? await pdf.embedJpg(logoBytes) : await pdf.embedPng(logoBytes)
        const box = ps(logoInnerR * 2)
        const aspect = img.width / Math.max(1, img.height)
        let dw = box
        let dh = box
        if (aspect > 1) dh = box / aspect
        else dw = box * aspect
        page.drawImage(img, {
          x: px(logoCx) - dw / 2,
          y: pyTop(logoCy) - dh / 2,
          width: dw,
          height: dh,
        })
        drewLogo = true
      } catch {
        drewLogo = false
      }
    }
    if (!drewLogo) {
      const fs = ps(11)
      const tw = fonts.bold.widthOfTextAtSize('LOGO', fs)
      page.drawText('LOGO', {
        x: px(logoCx) - tw / 2,
        y: pyTop(logoCy) - fs * 0.35,
        size: fs,
        font: fonts.bold,
        color: green,
      })
    }
  }

  // Başlık rozeti — üstte kurum adı, altta eğitim yılı
  {
    const brandFontPt = Math.max(8, Math.min(18, yearFontPt - 1))
    const lineGap = institutionName ? 3 : 0
    const textBlockH = institutionName
      ? brandFontPt + lineGap + yearFontPt
      : yearFontPt
    const approxBrandW = institutionName
      ? institutionName.length * brandFontPt * 0.55
      : 0
    const approxYearW = yearLabel.length * yearFontPt * 0.52
    const approxTextW = Math.max(approxBrandW, approxYearW)
    const capW = Math.min(520, Math.max(180, approxTextW + yearPadX * 2))
    const capH = Math.max(22, textBlockH + yearPadY * 2)
    const capX = VB_W - 16 - capW
    const capY = 50 - capH / 2
    const capR = Math.min(capH / 2, 14)
    const blockTop = capY + (capH - textBlockH) / 2
    page.drawRectangle({
      x: px(capX + capR),
      y: pyTop(capY + capH),
      width: ps(capW - capR * 2),
      height: ps(capH),
      color: yearFill,
    })
    page.drawCircle({
      x: px(capX + capR),
      y: pyTop(capY + capH / 2),
      size: ps(capR),
      color: yearFill,
    })
    page.drawCircle({
      x: px(capX + capW - capR),
      y: pyTop(capY + capH / 2),
      size: ps(capR),
      color: yearFill,
    })
    if (institutionName) {
      const brandLabel = institutionName.slice(0, 48)
      const bfs = ps(brandFontPt)
      const btw = fonts.bold.widthOfTextAtSize(brandLabel, bfs)
      page.drawText(brandLabel, {
        x: px(capX + capW / 2) - btw / 2,
        y: pyTop(blockTop + brandFontPt * 0.85) - bfs * 0.3,
        size: bfs,
        font: fonts.bold,
        color: yearText,
      })
    }
    const fs = ps(yearFontPt)
    const tw = fonts.bold.widthOfTextAtSize(yearLabel, fs)
    page.drawText(yearLabel, {
      x: px(capX + capW / 2) - tw / 2,
      y:
        pyTop(
          blockTop + (institutionName ? brandFontPt + lineGap : 0) + yearFontPt * 0.85,
        ) - fs * 0.3,
      size: fs,
      font: fonts.bold,
      color: yearText,
    })
  }

  {
    const fs = ps(titleFontPt)
    const titleFont = titleBold ? fonts.bold : fonts.regular
    const tw1 = titleFont.widthOfTextAtSize(titleLine, fs)
    page.drawText(titleLine, {
      x: px(VB_W / 2) - tw1 / 2,
      y: pyTop(titleBaseline) - fs * 0.3,
      size: fs,
      font: titleFont,
      color: titleColor,
    })
  }

  {
    const bandW = subjectBandW
    const bandX = (VB_W - bandW) / 2
    page.drawSvgPath(roundedRectPath(bandX, bandY, bandW, bandH, 4), {
      ...pathOpts,
      color: green,
    })
    const fs = ps(subjectFontPt)
    const subjectFont = subjectBold ? fonts.bold : fonts.regular
    const tw = subjectFont.widthOfTextAtSize(subject, fs)
    page.drawText(subject, {
      x: px(VB_W / 2) - tw / 2,
      y: pyTop(bandY + bandH / 2) - fs * 0.3,
      size: fs,
      font: subjectFont,
      color: subjectColor,
    })
  }

  page.drawRectangle({
    x: px(16),
    y: pyTop(instrY + INSTR_H),
    width: ps(893),
    height: ps(INSTR_H),
    color: white,
    borderColor: green,
    borderWidth: Math.max(0.45, ps(1.4)),
  })
  {
    const fs = ps(instructionFontPt)
    page.drawText(line1.slice(0, 110), {
      x: px(32),
      y: pyTop(instrLine1Y) - fs * 0.3,
      size: fs,
      font: fonts.regular,
      color: text,
    })
    page.drawText(line2.slice(0, 110), {
      x: px(32),
      y: pyTop(instrLine2Y) - fs * 0.3,
      size: fs,
      font: fonts.regular,
      color: text,
    })
  }
}
