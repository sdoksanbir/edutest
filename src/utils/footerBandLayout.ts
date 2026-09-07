import { CORPORATE_STRIPE_H_PT } from './corporateHeaderLayout'
import { normalizeHeaderStyleId } from './headerStyles'
import { STYLE_1_RUNNING_STRIPE_PT } from './modernCorporateHeaderShared'
import { FOOTER_NUMBER_PAD_MM, mmToPdfPt } from './pdfLayoutGeometry'

/** Şeritler arası sayfa numarası daire yarıçapı (PDF pt). */
export function footerPageNumberCircleRadiusPt(
  footerTopPt: number,
  footerBottomPt: number,
  styleId: string,
): number {
  const bandPt = Math.max(0, footerTopPt - footerBottomPt)
  const stripeH =
    normalizeHeaderStyleId(styleId) === 'style_1'
      ? STYLE_1_RUNNING_STRIPE_PT
      : CORPORATE_STRIPE_H_PT
  const padPt = mmToPdfPt(FOOTER_NUMBER_PAD_MM)
  const inner = bandPt - 2 * stripeH - 2 * padPt
  return Math.min(11, Math.max(4, inner / 2))
}
