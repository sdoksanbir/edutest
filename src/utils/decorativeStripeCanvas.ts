import { CORPORATE_STRIPE_H_PT } from './corporateHeaderLayout'
import { drawSlantedBarCanvas } from './drawCorporateHeaderCanvas'
import { drawStripeBarCanvas } from './drawThemeHeadersCanvas'
import { normalizeHeaderStyleId } from './headerStyles'
import { STYLE_1_RUNNING_STRIPE_PT } from './modernCorporateHeaderShared'

function rgbCss(hex: string): string {
  const s = (hex || '').trim().replace(/^#/, '')
  if (s.length !== 6) return 'rgb(10,25,49)'
  const r = parseInt(s.slice(0, 2), 16)
  const g = parseInt(s.slice(2, 4), 16)
  const b = parseInt(s.slice(4, 6), 16)
  return `rgb(${r},${g},${b})`
}

/** Footer bandının üst ve alt kenarına running header ile aynı dekoratif şerit. */
export function drawFooterDecorativeStripesCanvas(input: {
  ctx: CanvasRenderingContext2D
  ml: number
  mr: number
  pageWpx: number
  footerTopPx: number
  footerBottomPx: number
  scale: number
  styleId: string
  primaryColor: string
  accentColor: string
}): void {
  const contentWpx = input.pageWpx - input.ml - input.mr
  const primary = rgbCss(input.primaryColor)
  const accent = rgbCss(input.accentColor)
  const sid = normalizeHeaderStyleId(input.styleId)
  const s = input.scale

  if (sid === 'style_1') {
    const stripeH = STYLE_1_RUNNING_STRIPE_PT * s
    drawSlantedBarCanvas(input.ctx, input.ml, contentWpx, input.footerTopPx, stripeH, primary, accent)
    drawSlantedBarCanvas(
      input.ctx,
      input.ml,
      contentWpx,
      input.footerBottomPx - stripeH,
      stripeH,
      primary,
      accent,
    )
    return
  }

  const redW = contentWpx * 0.25
  const rowH = CORPORATE_STRIPE_H_PT * s
  drawStripeBarCanvas(input.ctx, input.ml, contentWpx, input.footerTopPx, s, redW, primary, accent)
  drawStripeBarCanvas(
    input.ctx,
    input.ml,
    contentWpx,
    input.footerBottomPx - rowH,
    s,
    redW,
    primary,
    accent,
  )
}
