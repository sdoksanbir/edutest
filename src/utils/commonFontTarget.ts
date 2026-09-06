/**
 * Ortak fiziksel font hedefi — tek sütunda tüm soruların ulaşabildiği min hedef.
 * MIN_PHYSICAL_SCALE=0.40 yalnızca bu yol için (genel clamp 0.65 değişmez).
 */

/** Fiziksel eşitleme alt sınırı (Q3/Q5 gibi büyük kaynak fontların küçülmesi için). */
export const FONT_EQUALIZE_PHYSICAL_SCALE_MIN = 0.4
export const FONT_EQUALIZE_PHYSICAL_SCALE_MAX = 1.5
export const FONT_TARGET_TOLERANCE_PT = 0.15

const USER_TARGET_MIN = 6
const USER_TARGET_MAX = 14
const USER_TARGET_DEFAULT = 10

function clampUserTargetFontPt(pt: number): number {
  if (!Number.isFinite(pt)) return USER_TARGET_DEFAULT
  return Math.max(USER_TARGET_MIN, Math.min(USER_TARGET_MAX, Math.round(pt * 2) / 2))
}

export type FontTargetLimitation =
  | 'NONE'
  | 'COLUMN_WIDTH'
  | 'MAX_SCALE'
  | 'MIN_SCALE'
  | 'UNRELIABLE_MEASUREMENT'
  | 'NO_MEASUREMENT'

export function clampPhysicalEqualizeScale(scale: number): number {
  if (!Number.isFinite(scale) || scale <= 0) return 1
  return Math.min(
    Math.max(scale, FONT_EQUALIZE_PHYSICAL_SCALE_MIN),
    FONT_EQUALIZE_PHYSICAL_SCALE_MAX,
  )
}

export function resolveNativeWidthPtForEqualize(opts: {
  sourceImageWidthPx: number
  pixelsPerPdfPoint: number
  cropWidthPt?: number | null
  cropWidthPx?: number | null
}): number {
  const ppp = opts.pixelsPerPdfPoint
  if (opts.cropWidthPt != null && opts.cropWidthPt > 0) return opts.cropWidthPt
  if (opts.cropWidthPx != null && opts.cropWidthPx > 0 && ppp > 0) {
    return opts.cropWidthPx / ppp
  }
  if (opts.sourceImageWidthPx > 0 && ppp > 0) return opts.sourceImageWidthPx / ppp
  return 0
}

export function maxAppliedScaleForSingleColumn(opts: {
  nativeWidthPt: number
  singleColumnAvailWPt: number
  maxNormalizationScale?: number
}): number {
  const maxNorm = opts.maxNormalizationScale ?? FONT_EQUALIZE_PHYSICAL_SCALE_MAX
  if (!(opts.nativeWidthPt > 0)) return maxNorm
  if (!(opts.singleColumnAvailWPt > 0)) return maxNorm
  const widthLimit = opts.singleColumnAvailWPt / opts.nativeWidthPt
  if (!(widthLimit > 0) || !Number.isFinite(widthLimit)) return maxNorm
  return Math.min(widthLimit, maxNorm)
}

export function maxAchievableFontPt(
  detectedFontHeightPt: number,
  maxAppliedScale: number,
): number {
  if (!(detectedFontHeightPt > 0) || !(maxAppliedScale > 0)) return 0
  return detectedFontHeightPt * maxAppliedScale
}

export type CommonFontTargetInput = {
  questionId: string
  questionNo: number
  detectedFontHeightPt: number
  maxAppliedScale: number
  /** Yüksek güvenilirlik — common min’e dahil */
  reliable: boolean
  /** Fallback / düşük güven — min’e dahil edilmez */
  isFallback?: boolean
}

export type CommonFontTargetResult = {
  userTargetFontPt: number
  effectiveTargetFontPt: number
  limitingQuestionId: string | null
  limitingQuestionNo: number | null
  reliableQuestionCount: number
  fallbackQuestionCount: number
  usedFallbackPool: boolean
}

/**
 * effectiveTarget = min(userTarget, …maxAchievable of reliable)
 * reliable yoksa usable fallback havuzu (uyarı ile); hiç yoksa userTarget.
 */
export function computeCommonEffectiveTargetFontPt(
  userTargetFontPt: number,
  questions: CommonFontTargetInput[],
): CommonFontTargetResult {
  const userTarget = clampUserTargetFontPt(userTargetFontPt)
  const reliable = questions.filter(
    (q) =>
      q.reliable &&
      !q.isFallback &&
      q.detectedFontHeightPt > 0 &&
      q.maxAppliedScale > 0,
  )
  const fallback = questions.filter(
    (q) =>
      (q.isFallback || !q.reliable) &&
      q.detectedFontHeightPt > 0 &&
      q.maxAppliedScale > 0,
  )

  let pool = reliable
  let usedFallbackPool = false
  if (pool.length === 0 && fallback.length > 0) {
    pool = fallback
    usedFallbackPool = true
  }

  if (pool.length === 0) {
    return {
      userTargetFontPt: userTarget,
      effectiveTargetFontPt: userTarget,
      limitingQuestionId: null,
      limitingQuestionNo: null,
      reliableQuestionCount: 0,
      fallbackQuestionCount: fallback.length,
      usedFallbackPool: false,
    }
  }

  let limiting: CommonFontTargetInput | null = null
  let minAchievable = Number.POSITIVE_INFINITY
  for (const q of pool) {
    const ach = maxAchievableFontPt(q.detectedFontHeightPt, q.maxAppliedScale)
    if (ach > 0 && ach < minAchievable) {
      minAchievable = ach
      limiting = q
    }
  }

  const effectiveTargetFontPt = Math.min(userTarget, minAchievable)

  return {
    userTargetFontPt: userTarget,
    effectiveTargetFontPt,
    limitingQuestionId: limiting?.questionId ?? null,
    limitingQuestionNo: limiting?.questionNo ?? null,
    reliableQuestionCount: reliable.length,
    fallbackQuestionCount: fallback.length,
    usedFallbackPool,
  }
}

export type PerQuestionCommonScaleResult = {
  questionId: string
  questionNo: number
  userTargetFontPt: number
  effectiveTargetFontPt: number
  detectedFontHeightPt: number
  maxAppliedScale: number
  maxAchievableFontPt: number
  rawNormalizationScale: number
  normalizationScale: number
  /** manualScale=1 varsayımıyla sütun sonrası applied */
  appliedScale: number
  finalFontHeightPt: number
  fontTargetErrorPt: number
  targetReached: boolean
  targetLimitation: FontTargetLimitation
  reliable: boolean
  isFallback: boolean
}

export function applyCommonFontTargetToQuestion(opts: {
  questionId: string
  questionNo: number
  detectedFontHeightPt: number
  maxAppliedScale: number
  userTargetFontPt: number
  effectiveTargetFontPt: number
  reliable: boolean
  isFallback?: boolean
}): PerQuestionCommonScaleResult {
  const detected = opts.detectedFontHeightPt
  const maxApplied = opts.maxAppliedScale > 0 ? opts.maxAppliedScale : FONT_EQUALIZE_PHYSICAL_SCALE_MAX
  const achievable = maxAchievableFontPt(detected, maxApplied)
  const effective = opts.effectiveTargetFontPt
  const userTarget = opts.userTargetFontPt

  let rawNormalizationScale = 1
  let normalizationScale = 1
  let targetLimitation: FontTargetLimitation = 'NONE'

  if (!(detected > 0)) {
    targetLimitation = 'NO_MEASUREMENT'
  } else {
    rawNormalizationScale = effective / detected
    normalizationScale = clampPhysicalEqualizeScale(rawNormalizationScale)
    if (rawNormalizationScale < FONT_EQUALIZE_PHYSICAL_SCALE_MIN - 1e-9) {
      targetLimitation = 'MIN_SCALE'
    } else if (rawNormalizationScale > FONT_EQUALIZE_PHYSICAL_SCALE_MAX + 1e-9) {
      targetLimitation = 'MAX_SCALE'
    }
  }

  // appliedScale = min(requested=norm*1, widthLimit=maxApplied)
  const appliedScale = Math.min(normalizationScale, maxApplied)
  if (
    targetLimitation === 'NONE' &&
    appliedScale < normalizationScale - 1e-9
  ) {
    targetLimitation = 'COLUMN_WIDTH'
  }

  const finalFontHeightPt = detected > 0 ? detected * appliedScale : 0
  const fontTargetErrorPt =
    detected > 0 ? Math.abs(finalFontHeightPt - effective) : Number.POSITIVE_INFINITY
  const targetReached =
    detected > 0 && fontTargetErrorPt <= FONT_TARGET_TOLERANCE_PT

  if (!targetReached && targetLimitation === 'NONE') {
    if (opts.isFallback || !opts.reliable) targetLimitation = 'UNRELIABLE_MEASUREMENT'
  }

  return {
    questionId: opts.questionId,
    questionNo: opts.questionNo,
    userTargetFontPt: userTarget,
    effectiveTargetFontPt: effective,
    detectedFontHeightPt: detected,
    maxAppliedScale: maxApplied,
    maxAchievableFontPt: achievable,
    rawNormalizationScale,
    normalizationScale,
    appliedScale,
    finalFontHeightPt,
    fontTargetErrorPt: Number.isFinite(fontTargetErrorPt) ? fontTargetErrorPt : 999,
    targetReached,
    targetLimitation,
    reliable: opts.reliable,
    isFallback: opts.isFallback === true,
  }
}

export function logCommonFontTargetSummary(
  common: CommonFontTargetResult,
  rows: PerQuestionCommonScaleResult[],
  equalizeRunId?: string | null,
): void {
  const run = equalizeRunId ?? 'none'
  console.log(
    `[ScaleDiag:COMMON_FONT_TARGET] equalizeRunId=${run} | stage=COMMON_FONT_TARGET | ` +
      `userTarget=${common.userTargetFontPt}pt | ` +
      `effectiveTarget=${common.effectiveTargetFontPt.toFixed(2)}pt | ` +
      `limitingQuestion=${common.limitingQuestionNo ?? 'none'} | ` +
      `reliableQuestionCount=${common.reliableQuestionCount}` +
      (common.usedFallbackPool ? ' | usedFallbackPool=true' : ''),
  )
  console.table(
    rows.map((r) => ({
      equalizeRunId: run,
      questionNo: r.questionNo,
      userTargetFontPt: r.userTargetFontPt,
      effectiveTargetFontPt: +r.effectiveTargetFontPt.toFixed(2),
      detectedFontHeightPt: +r.detectedFontHeightPt.toFixed(2),
      maxAppliedScale: +r.maxAppliedScale.toFixed(4),
      maxAchievableFontPt: +r.maxAchievableFontPt.toFixed(2),
      rawNormalizationScale: +r.rawNormalizationScale.toFixed(4),
      normalizationScale: +r.normalizationScale.toFixed(4),
      finalFontHeightPt: +r.finalFontHeightPt.toFixed(2),
      fontTargetErrorPt: +r.fontTargetErrorPt.toFixed(3),
      targetReached: r.targetReached,
      targetLimitation: r.targetLimitation,
      reliable: r.reliable,
      isFallback: r.isFallback,
    })),
  )
  for (const r of rows) {
    console.log(
      `Q${r.questionNo} | detected=${r.detectedFontHeightPt.toFixed(2)}pt | ` +
        `target=${r.effectiveTargetFontPt.toFixed(2)}pt | ` +
        `scale=${r.normalizationScale.toFixed(3)} | ` +
        `final=${r.finalFontHeightPt.toFixed(2)}pt | ` +
        `reached=${r.targetReached}`,
    )
    if (!r.targetReached) {
      console.warn(
        `FONT_TARGET_UNREACHABLE | equalizeRunId=${run} | Q${r.questionNo} | ` +
          `limitation=${r.targetLimitation} | ` +
          `final=${r.finalFontHeightPt.toFixed(2)}pt | ` +
          `effectiveTarget=${r.effectiveTargetFontPt.toFixed(2)}pt | ` +
          `error=${r.fontTargetErrorPt.toFixed(3)}pt`,
      )
    }
  }
}
