/**
 * Q4 stale manualScale + şıksız soru eşitleme commit regression.
 */
import { buildEqualizeCommitScaleFields } from '../src/utils/equalizeCommitScale.ts'
import {
  resolveManualScale,
  resolveNormalizationScale,
  resolveRequestedScale,
} from '../src/utils/questionScale.ts'
import { applyCommonFontTargetToQuestion } from '../src/utils/commonFontTarget.ts'

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

function assertManualInvariant(rows) {
  let errors = 0
  for (const r of rows) {
    if (r.reliable === false) continue
    const display = r.display_scale ?? r.requestedScale
    if (
      Math.abs(r.manualScale - 1) > 1e-6 ||
      Math.abs(r.requestedScale - r.normalizationScale) > 0.0001 ||
      Math.abs(display - r.normalizationScale) > 0.0001
    ) {
      errors += 1
    }
  }
  return errors
}

// --- buildEqualizeCommitScaleFields: stale manual ezilir ---
{
  const oldQ = {
    id: 'q4',
    manualScale: 0.9175,
    normalizationScale: 0.7873,
    display_scale: 0.9175 * 0.7873,
    answer_key: '?',
  }
  const calculatedCommonTargetScale = 0.6103
  const fields = buildEqualizeCommitScaleFields(calculatedCommonTargetScale)
  const committed = { ...oldQ, ...fields }
  approx(committed.manualScale, 1, 1e-9, 'Q4 manualScale=1')
  approx(committed.normalizationScale, 0.6103, 1e-4, 'Q4 normalizationScale≈0.6103')
  approx(committed.display_scale, 0.6103, 1e-4, 'Q4 display_scale≈0.6103')
  approx(resolveRequestedScale(committed), 0.6103, 1e-4, 'Q4 requestedScale≈0.6103')
  assert(resolveManualScale(committed) === 1, 'resolveManualScale=1')
}

// --- Yanlış sıra simülasyonu ---
{
  const fields = buildEqualizeCommitScaleFields(0.6103)
  const wrong = { ...fields, manualScale: 0.9175, normalizationScale: 0.6103 }
  assert(Math.abs(wrong.manualScale - 1) > 0.01, 'yanlış sıra stale üretir (kanıt)')
  const right = { manualScale: 0.9175, normalizationScale: 0.5, ...fields }
  approx(right.manualScale, 1, 1e-9, 'doğru sıra: fields sonda')
}

// --- Pending bulk üzerine yazma senaryosu ---
{
  const afterEqualize = {
    id: 'q4',
    ...buildEqualizeCommitScaleFields(0.6103),
  }
  const pending = {
    manualScale: 0.9175,
    requestedScale: 0.6103 * 0.9175,
  }
  const corrupted = {
    ...afterEqualize,
    display_scale: pending.requestedScale,
    manualScale: pending.manualScale,
  }
  assert(Math.abs(corrupted.manualScale - 1) > 0.01, 'pending stale manual kanıtı')
  approx(corrupted.normalizationScale, 0.6103, 1e-4, 'pending norm’u bozmaz')
  const fixed = { ...corrupted, ...buildEqualizeCommitScaleFields(0.6103) }
  approx(fixed.manualScale, 1, 1e-9, 'pending temizliği sonrası manual=1')
}

// --- finalFontHeightPt ≈ 7.752 ---
{
  const detected = 12.701
  const effective = 7.7519685
  const r = applyCommonFontTargetToQuestion({
    questionId: 'q4',
    questionNo: 4,
    detectedFontHeightPt: detected,
    maxAppliedScale: 0.6103,
    userTargetFontPt: 10,
    effectiveTargetFontPt: effective,
    reliable: true,
    isFallback: false,
  })
  approx(r.normalizationScale, 0.6103, 0.001, 'common scale≈0.6103')
  const fields = buildEqualizeCommitScaleFields(r.normalizationScale)
  const applied = Math.min(fields.normalizationScale * fields.manualScale, 0.6103)
  const finalFont = detected * applied
  approx(finalFont, effective, 0.05, 'finalFontHeightPt≈7.752')
  assert(fields.manualScale === 1, 'şıksız Q4 de manual=1')
  // overflow: native≈12.701/0.6103 width limit fill
  assert(applied <= 0.6103 + 1e-9, 'overflowPt=0 (applied≤widthLimit)')
}

// --- invariant ---
{
  const bad = assertManualInvariant([
    {
      questionNo: 4,
      questionId: 'q4',
      manualScale: 0.9175,
      normalizationScale: 0.6103,
      requestedScale: 0.56,
      display_scale: 0.56,
      reliable: true,
    },
  ])
  assert(bad >= 1, 'invariant stale yakalar')

  const good = assertManualInvariant([
    {
      questionNo: 4,
      questionId: 'q4',
      manualScale: 1,
      normalizationScale: 0.6103,
      requestedScale: 0.6103,
      display_scale: 0.6103,
      reliable: true,
    },
  ])
  assert(good === 0, 'invariant temiz Q4')
}

// --- şıksız / options boş ---
{
  const noOptions = {
    id: 'q4-no-opts',
    answerOptions: [],
    hasOptions: false,
    manualScale: 0.9175,
    normalizationScale: 1,
  }
  const fields = buildEqualizeCommitScaleFields(0.6103)
  const out = { ...noOptions, ...fields }
  assert(out.hasOptions === false, 'şıksız bayrak korunur')
  approx(out.manualScale, 1, 1e-9, 'şıksız da commit alır')
  approx(resolveNormalizationScale(out), 0.6103, 1e-4, 'şıksız norm')
}

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`)
  process.exit(1)
}
console.log('\nAll equalize stale manualScale tests passed.')
