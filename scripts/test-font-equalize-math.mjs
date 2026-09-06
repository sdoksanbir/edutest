/**
 * Unit tests: fontEqualizeMath fiziksel pt dönüşümü.
 * Node 22+ strip-types ile doğrudan .ts import.
 * Çalıştır: npm test
 */
import {
  computePhysicalFontEqualize,
  resolveQuestionPixelsPerPdfPoint,
} from '../src/utils/fontEqualizeMath.ts'

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

const PPP = 600 / 72

// --- Test A ---
{
  const q3 = computePhysicalFontEqualize({
    rawDetectedAnalysisPx: 12,
    sourceImageWidthPx: 3190,
    pixelsPerPdfPoint: PPP,
    targetQuestionLinePt: 10,
  })
  const q6 = computePhysicalFontEqualize({
    rawDetectedAnalysisPx: 12,
    sourceImageWidthPx: 1395,
    pixelsPerPdfPoint: PPP,
    targetQuestionLinePt: 10,
  })
  assert(q3 && q6, 'Test A: both compute')
  approx(q3.detectedFontHeightPt, 14.36, 0.02, 'Test A Q3 physical ≈14.36pt')
  approx(q6.detectedFontHeightPt, 6.28, 0.02, 'Test A Q6 physical ≈6.28pt')
  assert(
    Math.abs(q3.detectedFontHeightPt - q6.detectedFontHeightPt) > 5,
    'Test A: same analysisPx → different detectedFontPt',
  )
  approx(q3.normalizationScale, 0.696, 0.01, 'Test A Q3 scale ≈0.70')
  approx(q6.normalizationScale, 1.5, 0.01, 'Test A Q6 scale clamped 1.50')
}

// --- Test B ---
{
  const fontPt = 10
  const ppp600 = 600 / 72
  const ppp300 = 300 / 72
  // Genişlikler analysis < ANOMALY(16) kalacak şekilde seçildi
  const w600 = 2400
  const w300 = 1200
  const analysis600 = fontPt * ppp600 * (320 / w600)
  const analysis300 = fontPt * ppp300 * (320 / w300)
  const a = computePhysicalFontEqualize({
    rawDetectedAnalysisPx: analysis600,
    sourceImageWidthPx: w600,
    pixelsPerPdfPoint: ppp600,
    targetQuestionLinePt: 10,
  })
  const b = computePhysicalFontEqualize({
    rawDetectedAnalysisPx: analysis300,
    sourceImageWidthPx: w300,
    pixelsPerPdfPoint: ppp300,
    targetQuestionLinePt: 10,
  })
  assert(a && b, 'Test B: both compute')
  approx(a.detectedFontHeightPt, 10, 0.05, 'Test B 600dpi physical ≈10pt')
  approx(b.detectedFontHeightPt, 10, 0.05, 'Test B 300dpi physical ≈10pt')
  approx(a.normalizationScale, b.normalizationScale, 0.01, 'Test B same normalizationScale')
  approx(a.normalizationScale, 1.0, 0.02, 'Test B scale ≈1')
}

// --- Test C ---
{
  const cap = resolveQuestionPixelsPerPdfPoint({
    capture: { pixelsPerPdfPoint: 9.5, viewportScale: 8.333 },
  })
  assert(cap.metadataSource === 'capture', 'Test C: meta=capture')
  approx(cap.pixelsPerPdfPoint, 9.5, 1e-9, 'Test C: uses capture ppp')

  const viaViewport = resolveQuestionPixelsPerPdfPoint({
    capture: { viewportScale: 600 / 72, devicePixelRatio: 1 },
  })
  assert(viaViewport.metadataSource === 'capture', 'Test C viewport: capture')
  approx(viaViewport.pixelsPerPdfPoint, 600 / 72, 1e-6, 'Test C viewport ppp')

  const legacy = resolveQuestionPixelsPerPdfPoint({})
  assert(legacy.metadataSource === 'legacy-fallback', 'Test C empty → legacy')
  approx(legacy.pixelsPerPdfPoint, 600 / 72, 1e-6, 'Test C legacy ppp')
}

// --- Test D ---
{
  const q10 = computePhysicalFontEqualize({
    rawDetectedAnalysisPx: 25,
    sourceImageWidthPx: 1320,
    pixelsPerPdfPoint: PPP,
    targetQuestionLinePt: 10,
  })
  assert(q10, 'Test D compute')
  assert(q10.anomaly === true, 'Test D anomaly flag')
  approx(q10.sanitizedDetectedAnalysisPx, 11.5, 1e-9, 'Test D sanitize → 11.5')
  approx(q10.originalFontHeightPx, 11.5 * (1320 / 320), 0.05, 'Test D original from sanitized')
  approx(q10.detectedFontHeightPt, 5.69, 0.02, 'Test D physical ≈5.69pt')
  approx(q10.normalizationScale, 1.5, 0.01, 'Test D scale clamped 1.50')
}

// --- Q1–Q10 ---
{
  const rows = [
    { q: 1, a: 13, w: 1935, pt: 9.43, s: 1.06 },
    { q: 2, a: 11, w: 1942, pt: 8.01, s: 1.25 },
    { q: 3, a: 12, w: 3190, pt: 14.36, s: 0.7 },
    { q: 4, a: 11, w: 3079, pt: 12.7, s: 0.79 },
    { q: 5, a: 12, w: 3141, pt: 14.13, s: 0.71 },
    { q: 6, a: 12, w: 1395, pt: 6.28, s: 1.5 },
    { q: 7, a: 12, w: 1500, pt: 6.75, s: 1.48 },
    { q: 8, a: 11, w: 1348, pt: 5.56, s: 1.5 },
    { q: 9, a: 12, w: 1346, pt: 6.06, s: 1.5 },
    { q: 10, a: 11.5, w: 1320, pt: 5.69, s: 1.5 },
  ]
  for (const r of rows) {
    const raw = r.q === 10 ? 25 : r.a
    const out = computePhysicalFontEqualize({
      rawDetectedAnalysisPx: raw,
      sourceImageWidthPx: r.w,
      pixelsPerPdfPoint: PPP,
      targetQuestionLinePt: 10,
    })
    assert(out, `Q${r.q} compute`)
    approx(out.detectedFontHeightPt, r.pt, 0.03, `Q${r.q} physical`)
    approx(out.normalizationScale, r.s, 0.02, `Q${r.q} scale`)
  }
}

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`)
  process.exit(1)
}
console.log('\nAll font equalize math tests passed.')
