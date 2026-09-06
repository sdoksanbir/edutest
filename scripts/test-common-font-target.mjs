/**
 * Ortak fiziksel font hedefi testleri.
 */
import {
  applyCommonFontTargetToQuestion,
  clampPhysicalEqualizeScale,
  computeCommonEffectiveTargetFontPt,
  FONT_EQUALIZE_PHYSICAL_SCALE_MIN,
  FONT_TARGET_TOLERANCE_PT,
  maxAchievableFontPt,
  maxAppliedScaleForSingleColumn,
} from '../src/utils/commonFontTarget.ts'
import { FONT_SCALE_CLAMP_MIN } from '../src/utils/fontEqualizeMath.ts'
import { applyBulkScaleToBaseline } from '../src/utils/bulkScaleSession.ts'

let failed = 0
function assert(cond, msg) {
  if (!cond) {
    failed += 1
    console.error('FAIL:', msg)
  } else {
    console.log('OK:', msg)
  }
}
function approx(a, b, tol, msg) {
  assert(Math.abs(a - b) <= tol, `${msg} (got ${a}, expected ~${b}, tol=${tol})`)
}

assert(FONT_EQUALIZE_PHYSICAL_SCALE_MIN === 0.4, 'MIN_PHYSICAL_SCALE=0.40')
assert(FONT_SCALE_CLAMP_MIN === 0.65, 'genel clamp hâlâ 0.65')
approx(clampPhysicalEqualizeScale(0.35), 0.4, 1e-9, 'min physical clamp 0.40')
approx(clampPhysicalEqualizeScale(2), 1.5, 1e-9, 'max physical clamp 1.50')

const AVAIL = 225.51

// Geniş kaynak → düşük widthLimit
{
  const nativeW = 400
  const maxA = maxAppliedScaleForSingleColumn({
    nativeWidthPt: nativeW,
    singleColumnAvailWPt: AVAIL,
  })
  approx(maxA, AVAIL / nativeW, 0.001, 'geniş: widthLimit')
  assert(maxA < 1, 'geniş: maxApplied < 1')
}

// Dar kaynak → 1.50 tavan
{
  const nativeW = 100
  const maxA = maxAppliedScaleForSingleColumn({
    nativeWidthPt: nativeW,
    singleColumnAvailWPt: AVAIL,
  })
  approx(maxA, 1.5, 1e-9, 'dar: clamp 1.50')
}

// Q1–Q10 benzeri ortak hedef
{
  // detected pt ve native genişlikler (yaklaşık t14/t15)
  const qs = [
    { no: 1, detected: 9.43, nativeW: 200 },
    { no: 2, detected: 8.01, nativeW: 280 },
    { no: 3, detected: 14.36, nativeW: 382 },
    { no: 4, detected: 12.7, nativeW: 340 },
    { no: 5, detected: 14.13, nativeW: 370 },
    { no: 6, detected: 6.28, nativeW: 167 },
    { no: 7, detected: 6.75, nativeW: 180 },
    { no: 8, detected: 5.56, nativeW: 148 },
    { no: 9, detected: 6.06, nativeW: 160 },
    { no: 10, detected: 5.69, nativeW: 152 },
  ].map((q) => {
    const maxApplied = maxAppliedScaleForSingleColumn({
      nativeWidthPt: q.nativeW,
      singleColumnAvailWPt: AVAIL,
    })
    return {
      questionId: `q${q.no}`,
      questionNo: q.no,
      detectedFontHeightPt: q.detected,
      maxAppliedScale: maxApplied,
      reliable: true,
      isFallback: false,
      nativeW: q.nativeW,
    }
  })

  const common = computeCommonEffectiveTargetFontPt(10, qs)
  assert(common.effectiveTargetFontPt <= 10 + 1e-9, 'effective ≤ userTarget')
  assert(common.limitingQuestionNo != null, 'limitingQuestion set')
  assert(common.reliableQuestionCount === 10, '10 reliable')

  const rows = qs.map((q) =>
    applyCommonFontTargetToQuestion({
      questionId: q.questionId,
      questionNo: q.questionNo,
      detectedFontHeightPt: q.detectedFontHeightPt,
      maxAppliedScale: q.maxAppliedScale,
      userTargetFontPt: common.userTargetFontPt,
      effectiveTargetFontPt: common.effectiveTargetFontPt,
      reliable: true,
    }),
  )

  for (const r of rows) {
    assert(
      r.fontTargetErrorPt <= FONT_TARGET_TOLERANCE_PT + 1e-6,
      `Q${r.questionNo} error≤0.15 (err=${r.fontTargetErrorPt})`,
    )
    assert(r.targetReached, `Q${r.questionNo} targetReached`)
    // overflow: drawWidth = native * applied ≤ avail
    const q = qs.find((x) => x.questionNo === r.questionNo)
    const drawW = q.nativeW * r.appliedScale
    assert(drawW <= AVAIL + 0.05, `Q${r.questionNo} overflowPt≈0 drawW=${drawW}`)
  }

  const finals = rows.map((r) => r.finalFontHeightPt)
  const spread = Math.max(...finals) - Math.min(...finals)
  assert(spread <= 0.15 + 1e-6, `Q1–Q10 final spread≤0.15 (got ${spread})`)

  console.log('COMMON', {
    userTarget: common.userTargetFontPt,
    effective: +common.effectiveTargetFontPt.toFixed(2),
    limiting: common.limitingQuestionNo,
  })
  console.log(
    'Q1-Q10 finals',
    rows.map((r) => ({
      q: r.questionNo,
      detected: +r.detectedFontHeightPt.toFixed(2),
      scale: +r.normalizationScale.toFixed(3),
      final: +r.finalFontHeightPt.toFixed(2),
    })),
  )
}

// max scale 1.50 sınırlı soru
{
  const detected = 5
  const maxA = 1.5
  const ach = maxAchievableFontPt(detected, maxA)
  approx(ach, 7.5, 1e-9, 'maxAchievable 5*1.5')
  const common = computeCommonEffectiveTargetFontPt(10, [
    {
      questionId: 'a',
      questionNo: 1,
      detectedFontHeightPt: detected,
      maxAppliedScale: maxA,
      reliable: true,
    },
  ])
  approx(common.effectiveTargetFontPt, 7.5, 0.01, 'effective limited by 1.50')
}

// min physical 0.40 — büyük font
{
  const r = applyCommonFontTargetToQuestion({
    questionId: 'big',
    questionNo: 3,
    detectedFontHeightPt: 14.36,
    maxAppliedScale: 1.5,
    userTargetFontPt: 10,
    effectiveTargetFontPt: 5.5,
    reliable: true,
  })
  assert(r.rawNormalizationScale < 0.65, 'raw < eski 0.65')
  approx(r.normalizationScale, 0.4, 1e-9, 'clamped to MIN 0.40')
  assert(r.targetLimitation === 'MIN_SCALE', 'limitation MIN_SCALE')
  // 0.40 ile final > effective → unreachable uyarısı yolu
  assert(!r.targetReached || r.fontTargetErrorPt <= 0.15, 'min-scale edge')
}

// güvenilmez OCR — min’e dahil edilmez
{
  const common = computeCommonEffectiveTargetFontPt(10, [
    {
      questionId: 'good',
      questionNo: 1,
      detectedFontHeightPt: 8,
      maxAppliedScale: 1.2,
      reliable: true,
    },
    {
      questionId: 'bad',
      questionNo: 2,
      detectedFontHeightPt: 3,
      maxAppliedScale: 0.5,
      reliable: false,
      isFallback: true,
    },
  ])
  // reliable only: maxAchievable=8*1.2=9.6 → effective=min(10,9.6)=9.6
  // bad would have forced 3*0.5=1.5 if included
  approx(common.effectiveTargetFontPt, 9.6, 0.01, 'unreliable excluded from min')
  assert(common.limitingQuestionNo === 1, 'limiting is reliable Q1')
}

// tek soru
{
  const common = computeCommonEffectiveTargetFontPt(10, [
    {
      questionId: 'only',
      questionNo: 1,
      detectedFontHeightPt: 12,
      maxAppliedScale: 0.7,
      reliable: true,
    },
  ])
  approx(common.effectiveTargetFontPt, 8.4, 0.01, 'single question effective')
}

// bütün ölçümler başarısız
{
  const common = computeCommonEffectiveTargetFontPt(10, [])
  approx(common.effectiveTargetFontPt, 10, 1e-9, 'empty → userTarget')
  assert(common.reliableQuestionCount === 0, 'no reliable')
}

// toplu %83 sonrası font oranları korunur
{
  const detected = 10
  const applied0 = 0.8
  const final0 = detected * applied0 // 8pt
  const bulk = applyBulkScaleToBaseline(
    {
      questionId: 'q',
      questionNo: 1,
      orderIndex: 0,
      normalizationScale: applied0,
      manualScale: 1,
      requestedScale: applied0,
      appliedScale: applied0,
      drawWidth: 200,
      drawHeight: 100,
      widthLimit: 1,
      layoutMode: 'single-column',
      fullWidthLimit: 2,
      singleColumnWidthLimit: 1,
    },
    0.83,
  )
  const final1 = detected * bulk.resultingAppliedScale
  approx(final1 / final0, 0.83, 0.01, 'bulk %83 font ratio preserved')
}

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`)
  process.exit(1)
}
console.log('\nAll common font target tests passed.')
