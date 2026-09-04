import type { LayoutPlacementOverride } from "./columnShiftPlacement";

/** Yerleşim / dikey override varken layout API tam görsel boyutları kullanmalı. */
export function resolveLayoutFetchSkipImages(
  placementOverrides: Record<string, LayoutPlacementOverride>,
  yOverridesByQuestionId: Record<string, number>,
  explicit?: boolean
): boolean {
  if (explicit != null) return explicit;
  const hasPlacement = Object.keys(placementOverrides).length > 0;
  const hasY = Object.keys(yOverridesByQuestionId).length > 0;
  return !(hasPlacement || hasY);
}
