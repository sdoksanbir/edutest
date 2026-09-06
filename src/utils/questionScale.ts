/**
 * Soru ölçek çözümleme: manualScale × normalizationScale
 * Legacy: yalnızca display_scale varsa o kullanılır.
 */

export type QuestionScaleFields = {
  manualScale?: number | null
  normalizationScale?: number | null
  display_scale?: number | null
  /** snake_case export / layout payload */
  manual_scale?: number | null
  normalization_scale?: number | null
}

export function finitePositive(n: unknown): number | null {
  const v = Number(n)
  if (!Number.isFinite(v) || v <= 0) return null
  return v
}

/** requestedScale = (manualScale ?? 1) * (normalizationScale ?? 1); legacy → display_scale */
export function resolveRequestedScale(q: QuestionScaleFields): number {
  const manual =
    finitePositive(q.manualScale) ?? finitePositive(q.manual_scale)
  const norm =
    finitePositive(q.normalizationScale) ?? finitePositive(q.normalization_scale)
  if (manual != null || norm != null) {
    return (manual ?? 1) * (norm ?? 1)
  }
  return finitePositive(q.display_scale) ?? 1
}

export function resolveManualScale(q: QuestionScaleFields): number {
  return (
    finitePositive(q.manualScale) ??
    finitePositive(q.manual_scale) ??
    1
  )
}

export function resolveNormalizationScale(q: QuestionScaleFields): number {
  return (
    finitePositive(q.normalizationScale) ??
    finitePositive(q.normalization_scale) ??
    1
  )
}

/** UI mutlak requestedScale verdiğinde manualScale’i güncelle */
export function manualScaleForRequestedProduct(
  requestedScale: number,
  normalizationScale: number | null | undefined,
): number {
  const norm = finitePositive(normalizationScale) ?? 1
  const req = finitePositive(requestedScale) ?? 1
  return req / norm
}

export function syncDisplayScaleProduct(
  manualScale: number,
  normalizationScale: number,
): number {
  return (finitePositive(manualScale) ?? 1) * (finitePositive(normalizationScale) ?? 1)
}
