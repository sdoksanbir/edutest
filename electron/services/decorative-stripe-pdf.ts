import { rgb, type PDFPage, type RGB } from 'pdf-lib'
import { CORPORATE_STRIPE_H_PT, parseHeaderConfig } from './corporate-header-layout.js'
import { drawSlantedBarPdf } from './corporate-header-draw.js'
import { normalizeHeaderStyleId } from './header-styles.js'
import { STYLE_1_RUNNING_STRIPE_PT } from './modern-corporate-header-shared.js'
import { drawStripeBarPdf } from './theme-header-draw.js'

function hexToRgb(hex: string): RGB {
  const s = (hex || '').trim().replace(/^#/, '')
  if (s.length !== 6) return rgb(0.04, 0.1, 0.19)
  return rgb(
    parseInt(s.slice(0, 2), 16) / 255,
    parseInt(s.slice(2, 4), 16) / 255,
    parseInt(s.slice(4, 6), 16) / 255,
  )
}

/** Footer bandının üst ve alt kenarına running header ile aynı dekoratif şerit. */
export function drawFooterDecorativeStripesPdf(
  page: PDFPage,
  payload: Record<string, unknown>,
  geom: { page_w_pt: number; ml: number; mr: number },
  footerTop: number,
  footerBottom: number,
): void {
  const config = parseHeaderConfig(payload.header_config)
  const styleId = normalizeHeaderStyleId(String(payload.header_style_id ?? ''))
  const primary = hexToRgb(config.primaryColor)
  const accent = hexToRgb(config.accentColor)
  const contentW = geom.page_w_pt - geom.ml - geom.mr

  if (styleId === 'style_1') {
    const stripeH = STYLE_1_RUNNING_STRIPE_PT
    drawSlantedBarPdf(page, geom.ml, contentW, footerTop - stripeH, stripeH, primary, accent)
    drawSlantedBarPdf(page, geom.ml, contentW, footerBottom, stripeH, primary, accent)
    return
  }

  const redW = contentW * 0.25
  drawStripeBarPdf(page, geom, footerTop - CORPORATE_STRIPE_H_PT, contentW, redW, primary, accent)
  drawStripeBarPdf(page, geom, footerBottom, contentW, redW, primary, accent)
}
