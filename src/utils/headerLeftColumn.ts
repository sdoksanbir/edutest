import type { HeaderConfig } from './corporateHeaderLayout'
import { HEADER_FONT_FAMILY_CANVAS } from './corporateHeaderConstants'
import { drawHeaderLogoInBox } from './headerLogo'
import { resolveHeaderLogoUrl } from './presetHeaderLogos'

export type HeaderLeftMode = 'logo' | 'publicationText'

export const HEADER_LEFT_MODE_LOGO: HeaderLeftMode = 'logo'
export const HEADER_LEFT_MODE_PUBLICATION: HeaderLeftMode = 'publicationText'

export const PUBLICATION_LINE_FONT_MIN_PT = 5
export const PUBLICATION_LINE_FONT_MAX_PT = 14
export const PUBLICATION_LINE1_FONT_DEFAULT_PT = 9
export const PUBLICATION_LINE2_FONT_DEFAULT_PT = 7
export const PUBLICATION_LINE1_COLOR_DEFAULT = '#0A1931'
export const PUBLICATION_LINE2_COLOR_DEFAULT = '#C59B27'

export type PublicationLineSpec = {
  text: string
  fontPt: number
  color: string
}

export function parseHeaderLeftMode(raw: unknown): HeaderLeftMode {
  if (
    raw === 'publicationText' ||
    raw === 'publication_text' ||
    raw === 'institutionText' ||
    raw === 'institution_text'
  ) {
    return 'publicationText'
  }
  return 'logo'
}

export function clampPublicationLineFontPt(pt: number): number {
  return Math.max(
    PUBLICATION_LINE_FONT_MIN_PT,
    Math.min(PUBLICATION_LINE_FONT_MAX_PT, Math.round(pt * 10) / 10),
  )
}

export function publicationLineSpecs(config: HeaderConfig): PublicationLineSpec[] {
  const specs: PublicationLineSpec[] = []
  const l1 = String(config.institutionLine1 ?? '').trim()
  const l2 = String(config.institutionLine2 ?? '').trim()
  const fallbackColor = config.primaryColor || PUBLICATION_LINE1_COLOR_DEFAULT

  if (l1) {
    specs.push({
      text: l1,
      fontPt: clampPublicationLineFontPt(
        config.institutionLine1FontPt ?? PUBLICATION_LINE1_FONT_DEFAULT_PT,
      ),
      color: (config.institutionLine1Color || fallbackColor).trim(),
    })
  }
  if (l2) {
    specs.push({
      text: l2,
      fontPt: clampPublicationLineFontPt(
        config.institutionLine2FontPt ?? PUBLICATION_LINE2_FONT_DEFAULT_PT,
      ),
      color: (config.institutionLine2Color || PUBLICATION_LINE2_COLOR_DEFAULT).trim(),
    })
  }
  return specs.slice(0, 2)
}

export function shouldDrawHeaderLogo(config: HeaderConfig, hasLogoImage: boolean): boolean {
  if (!config.showHeaderLeft || config.headerLeftMode !== 'logo') return false
  return hasLogoImage && !!resolveHeaderLogoUrl(config)
}

export function shouldDrawPublicationText(config: HeaderConfig): boolean {
  if (!config.showHeaderLeft || config.headerLeftMode !== 'publicationText') return false
  return publicationLineSpecs(config).length > 0
}

export function headerLeftColumnActive(config: HeaderConfig, hasLogoImage: boolean): boolean {
  return shouldDrawHeaderLogo(config, hasLogoImage) || shouldDrawPublicationText(config)
}

/** Canvas — sol kutu içinde en fazla 2 satır yayın adı */
export function drawPublicationTextInBox(
  ctx: CanvasRenderingContext2D,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  lines: PublicationLineSpec[],
  scale: number,
  fontFamily = HEADER_FONT_FAMILY_CANVAS,
) {
  if (lines.length === 0 || boxW <= 0 || boxH <= 0) return
  const lineGap = 2 * scale
  const sizesPx = lines.map((l) => l.fontPt * scale)
  const blockH = sizesPx.reduce((a, b) => a + b, 0) + Math.max(0, lines.length - 1) * lineGap
  let shrink = 1
  if (blockH > boxH) shrink = boxH / blockH

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const cx = boxX + boxW / 2
  let y = boxY + (boxH - blockH * shrink) / 2

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const fontPx = sizesPx[i]! * shrink
    y += fontPx * 0.78
    ctx.fillStyle = line.color
    ctx.font = `700 ${fontPx}px ${fontFamily}`
    ctx.fillText(line.text.slice(0, 28), cx, y)
    y += fontPx * 0.22 + lineGap * shrink
  }
  ctx.restore()
}

/** Sol sütun — logo veya yayın adı */
export function drawHeaderLeftColumnCanvas(
  ctx: CanvasRenderingContext2D,
  config: HeaderConfig,
  logoImage: HTMLImageElement | null | undefined,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  scale: number,
  fontFamily = HEADER_FONT_FAMILY_CANVAS,
) {
  const hasLogo = !!(logoImage?.complete && logoImage.naturalWidth > 0)
  if (shouldDrawHeaderLogo(config, hasLogo)) {
    drawHeaderLogoInBox(ctx, logoImage!, boxX, boxY, boxW, boxH, config.logoSizePct ?? 100)
    return
  }
  if (shouldDrawPublicationText(config)) {
    drawPublicationTextInBox(ctx, boxX, boxY, boxW, boxH, publicationLineSpecs(config), scale, fontFamily)
  }
}
