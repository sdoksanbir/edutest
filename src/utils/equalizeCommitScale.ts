/**
 * Eşitleme commit alanları — stale manualScale'i kesin ezer.
 * Bağımsız (Node test / store ortak).
 */

export function buildEqualizeCommitScaleFields(normalizationScale: number): {
  manualScale: number
  normalizationScale: number
  display_scale: number
} {
  const norm =
    Number.isFinite(normalizationScale) && normalizationScale > 0 ? normalizationScale : 1
  return {
    manualScale: 1,
    normalizationScale: norm,
    display_scale: norm,
  }
}
