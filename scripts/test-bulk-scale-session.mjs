/**
 * Toplu ölçek dead-zone (WIDTH_LIMIT) testleri — t14 senaryosu.
 */
import {
  applyBulkScaleToBaseline,
  bulkRelativeFactor,
  captureBulkScaleBaseline,
} from '../src/utils/bulkScaleSession.ts'

let failed = 0
function assert(cond, msg) {
  if (!cond) {
    failed += 1
    console.error('FAIL:', msg)
  } else {
    console.log('OK:', msg)
  }
}

function approx(got, expected, tol, msg) {
  assert(Math.abs(got - expected) <= tol, `${msg} (got ${got}, expected ~${expected}, tol=${tol})`)
}

const REL = bulkRelativeFactor(83, 100)
approx(REL, 0.83, 1e-9, 'relativeFactor 83/100')

// --- t14 Q4 ---
{
  const baseline = captureBulkScaleBaseline({
    questionId: 'q4',
    questionNo: 4,
    orderIndex: 3,
    normalizationScale: 0.7873,
    manualScale: 0.83, // irrelevant; applied is source of truth
    requestedScale: 0.6535,
    imgWPt: 225.51,
    imgHPt: 300,
    layoutMode: 'single-column',
    scaleDiag: {
      naturalWidthPt: 225.51 / 0.6103,
      appliedScale: 0.6103,
      widthLimitScale: 0.6103,
      availWPt: 225.51,
      finalDrawWidthPt: 225.51,
      finalDrawHeightPt: 300,
      layoutMode: 'single-column',
    },
  })
  assert(Math.abs(baseline.appliedScale - 0.6103) < 1e-6, 'Q4 baseline applied')
  const r = applyBulkScaleToBaseline(baseline, REL)
  approx(r.desiredAppliedScale, 0.506549, 0.0005, 'Q4 desiredAppliedScale')
  approx(r.newManualScale, 0.6434, 0.001, 'Q4 newManualScale')
  approx(r.resultingDrawWidth, 187.1733, 0.05, 'Q4 resultingDrawWidth')
  approx(r.actualWidthRatio, 0.83, 0.01, 'Q4 actualWidthRatio')
  assert(
    Math.abs(r.resultingRequestedScale - r.desiredAppliedScale) < 1e-9,
    'Q4 requested === desiredApplied (shrink)',
  )
}

// --- t14 Q3 ---
{
  const baseline = captureBulkScaleBaseline({
    questionId: 'q3',
    questionNo: 3,
    orderIndex: 2,
    normalizationScale: 0.6966,
    manualScale: 1,
    requestedScale: 0.6966,
    imgWPt: 225.51,
    imgHPt: 280,
    scaleDiag: {
      appliedScale: 0.5891,
      widthLimitScale: 0.5891,
      naturalWidthPt: 225.51 / 0.5891,
      availWPt: 225.51,
      finalDrawWidthPt: 225.51,
      layoutMode: 'single-column',
    },
  })
  const r = applyBulkScaleToBaseline(baseline, REL)
  approx(r.resultingDrawWidth, 187.1733, 0.05, 'Q3 resultingDrawWidth')
  approx(r.actualWidthRatio, 0.83, 0.01, 'Q3 actualWidthRatio')
}

// --- t14 Q7 ---
{
  const baseline = captureBulkScaleBaseline({
    questionId: 'q7',
    questionNo: 7,
    orderIndex: 6,
    normalizationScale: 1.4815,
    manualScale: 1,
    requestedScale: 1.4815,
    imgWPt: 225.51,
    imgHPt: 200,
    scaleDiag: {
      appliedScale: 1.2528,
      widthLimitScale: 1.2528,
      naturalWidthPt: 225.51 / 1.2528,
      availWPt: 225.51,
      finalDrawWidthPt: 225.51,
      layoutMode: 'single-column',
    },
  })
  const r = applyBulkScaleToBaseline(baseline, REL)
  approx(r.resultingDrawWidth, 187.1733, 0.05, 'Q7 resultingDrawWidth')
  approx(r.actualWidthRatio, 0.83, 0.01, 'Q7 actualWidthRatio')
}

// --- Eski dead-zone: requested*factor hâlâ widthLimit üstünde kalırdı ---
{
  const requested = 0.6535
  const widthLimit = 0.6103
  const oldProduct = requested * 0.83 // 0.5424 — wait, 0.6535*0.83=0.5424 < 0.6103
  // User's example: after bulk manual 0.83, requested=0.6535 still > widthLimit 0.6103
  // That means they multiplied previous manual incorrectly OR started from requested that was already product
  // Dead zone: if baseline requested=0.7873 (manual=1) and they set manual to 0.83:
  // requested = 0.7873*0.83=0.6535 > 0.6103 → no visual change from full-column fill
  const oldRequested = 0.7873 * 0.83
  assert(oldRequested > widthLimit, 'eski yol: requested hâlâ widthLimit üstünde')
  const baseline = {
    questionId: 'q4b',
    questionNo: 4,
    orderIndex: 3,
    normalizationScale: 0.7873,
    manualScale: 1,
    requestedScale: 0.7873,
    appliedScale: 0.6103,
    drawWidth: 225.51,
    drawHeight: 300,
    widthLimit: 0.6103,
    layoutMode: 'single-column',
    fullWidthLimit: 1.5,
    singleColumnWidthLimit: 0.6103,
  }
  const r = applyBulkScaleToBaseline(baseline, 0.83)
  assert(r.resultingRequestedScale < widthLimit, 'yeni yol: requested widthLimit altına iner')
  approx(r.actualWidthRatio, 0.83, 0.01, 'dead-zone fix ratio')
}

// --- Büyütme: sütun tavanında durur ---
{
  const baseline = {
    questionId: 'grow',
    questionNo: 1,
    orderIndex: 0,
    normalizationScale: 1,
    manualScale: 0.5,
    requestedScale: 0.5,
    appliedScale: 0.5,
    drawWidth: 100,
    drawHeight: 100,
    widthLimit: 0.8,
    layoutMode: 'single-column',
    fullWidthLimit: 2,
    singleColumnWidthLimit: 0.8,
  }
  const r = applyBulkScaleToBaseline(baseline, 2) // desire 1.0, clamp 0.8
  approx(r.safeAppliedScale, 0.8, 1e-9, 'grow clamps to widthLimit')
  approx(r.resultingDrawWidth, 160, 0.01, 'grow draw at limit')
  assert(r.actualWidthRatio < 2 - 0.01, 'grow ratio < relativeFactor when clamped')
}

// --- Q1–Q10 hepsi WIDTH_LIMIT’te → aynı ratio ---
{
  const rows = []
  for (let q = 1; q <= 10; q++) {
    const applied = 0.5 + q * 0.05
    const baseline = {
      questionId: `q${q}`,
      questionNo: q,
      orderIndex: q - 1,
      normalizationScale: 1,
      manualScale: 1,
      requestedScale: 1.2,
      appliedScale: applied,
      drawWidth: 225.51,
      drawHeight: 200,
      widthLimit: applied,
      layoutMode: 'single-column',
      fullWidthLimit: 2,
      singleColumnWidthLimit: applied,
    }
    const r = applyBulkScaleToBaseline(baseline, 0.83)
    rows.push(r)
    approx(r.actualWidthRatio, 0.83, 0.01, `Q${q} actualWidthRatio`)
    approx(r.resultingDrawWidth, 225.51 * 0.83, 0.05, `Q${q} drawW`)
  }
  console.log(
    'Q1-Q10 table:',
    rows.map((r) => ({
      q: r.questionNo,
      baselineDrawWidth: 225.51,
      resultingDrawWidth: +r.resultingDrawWidth.toFixed(2),
      actualWidthRatio: +r.actualWidthRatio.toFixed(4),
    })),
  )
}

// --- Session baseline yeniden alınmaz: aynı baseline iki apply ---
{
  const baseline = {
    questionId: 'stable',
    questionNo: 1,
    orderIndex: 0,
    normalizationScale: 0.8,
    manualScale: 1,
    requestedScale: 0.8,
    appliedScale: 0.6,
    drawWidth: 200,
    drawHeight: 100,
    widthLimit: 0.6,
    layoutMode: 'single-column',
    fullWidthLimit: 1,
    singleColumnWidthLimit: 0.6,
  }
  const a = applyBulkScaleToBaseline(baseline, 0.9)
  const b = applyBulkScaleToBaseline(baseline, 0.8)
  approx(a.resultingDrawWidth, 180, 0.01, 'first apply from baseline')
  approx(b.resultingDrawWidth, 160, 0.01, 'second apply from same baseline (not cumulative)')
}

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`)
  process.exit(1)
}
console.log('\nAll bulk scale session tests passed.')
