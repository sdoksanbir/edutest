/** Yaprak test banner — layout yüksekliği (PDF pt) */

const PT_PER_MM = 72 / 25.4
const BANNER_ASPECT = 8
const BANNER_MIN_PT = 56
const BANNER_MAX_PT = 112
const BANNER_DECOR_PT = 3

export function mmToPdfPt(mm: number): number {
  return mm * PT_PER_MM
}

/** Banner gövde yüksekliği — içerik genişliğine göre 8:1 */
export function testBannerBodyHeightPt(contentWidthPt: number): number {
  const raw = contentWidthPt / BANNER_ASPECT
  return Math.max(BANNER_MIN_PT, Math.min(BANNER_MAX_PT, raw))
}

/** İlk sayfa toplam banner yüksekliği (dekor çizgileri dahil) */
export function testBannerHeaderBlockHeightPt(contentWidthPt: number): number {
  return testBannerBodyHeightPt(contentWidthPt) + BANNER_DECOR_PT * 2
}

export const LGS_VERBAL_BANNER_VIEW_W = 1498
export const LGS_VERBAL_BANNER_VIEW_H = 92

export function lgsVerbalBannerBodyHeightPt(contentWidthPt: number): number {
  return contentWidthPt * (LGS_VERBAL_BANNER_VIEW_H / LGS_VERBAL_BANNER_VIEW_W)
}

export function lgsVerbalBannerHeaderBlockHeightPt(contentWidthPt: number): number {
  return lgsVerbalBannerBodyHeightPt(contentWidthPt)
}

/** Yaprak test referans banner — gövde + alt bilgi şeridi (143px ≈ 107pt) */
export const LEAF_CORPORATE_BANNER_FOOTER_H_PT = 21
export const LEAF_CORPORATE_BANNER_BODY_H_PT = 86.25 + LEAF_CORPORATE_BANNER_FOOTER_H_PT
export const LEAF_CORPORATE_BANNER_STRIPE_H_PT = 2.5

export function leafCorporateBannerHeaderBlockHeightPt(): number {
  return LEAF_CORPORATE_BANNER_BODY_H_PT + LEAF_CORPORATE_BANNER_STRIPE_H_PT * 2
}

export function testBannerContentWidthPt(
  pageWpt: number,
  marginLeftMm: number,
  marginRightMm: number,
): number {
  return pageWpt - mmToPdfPt(marginLeftMm) - mmToPdfPt(marginRightMm)
}
