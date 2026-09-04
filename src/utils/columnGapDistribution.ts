import { mmToPdfPt } from "./pdfLayoutGeometry";

export const COLUMN_LAYOUT_BOTTOM_MIN_MM = 0.6;
export const COLUMN_LAYOUT_BOTTOM_MIN_PT = mmToPdfPt(COLUMN_LAYOUT_BOTTOM_MIN_MM);

const LAYOUT_EPS = 1e-4;

/**
 * Sütun içi dikey boşluklar (her sorunun altındaki gap; son gap = alt banner payı).
 *
 * 1. Sorular arası boşluk = standartGapPt (sorular arası boşluk ayarı)
 * 2. Alt boşluk > standartGapPt ise tüm boşluklar eşit (gapBudget / n)
 */
export function computeColumnGapSizesPt(
  gapBudgetPt: number,
  itemCount: number,
  standardGapPt: number,
  columnBottomMinPt: number = COLUMN_LAYOUT_BOTTOM_MIN_PT,
): number[] {
  const n = itemCount;
  if (n <= 0) return [];
  if (n === 1) return [Math.max(columnBottomMinPt, gapBudgetPt)];

  const interCount = n - 1;
  const bottomIfStandardInter = gapBudgetPt - interCount * standardGapPt;

  if (bottomIfStandardInter >= columnBottomMinPt - LAYOUT_EPS) {
    if (bottomIfStandardInter > standardGapPt + LAYOUT_EPS) {
      const equal = gapBudgetPt / n;
      return Array.from({ length: n }, () => equal);
    }
    return [
      ...Array.from({ length: interCount }, () => standardGapPt),
      Math.max(columnBottomMinPt, bottomIfStandardInter),
    ];
  }

  const equalGap = gapBudgetPt / n;
  if (equalGap >= columnBottomMinPt - LAYOUT_EPS) {
    return Array.from({ length: n }, () => equalGap);
  }

  const rest = Math.max(0, gapBudgetPt - columnBottomMinPt);
  const perInter = interCount > 0 ? rest / interCount : 0;
  const appliedInter = Array.from({ length: interCount }, () =>
    Math.max(0, Math.min(standardGapPt, perInter)),
  );
  const usedInter = appliedInter.reduce((a, b) => a + b, 0);
  const bottom = Math.max(columnBottomMinPt, gapBudgetPt - usedInter);
  if (bottom > standardGapPt + LAYOUT_EPS) {
    return Array.from({ length: n }, () => gapBudgetPt / n);
  }
  return [...appliedInter, bottom];
}
