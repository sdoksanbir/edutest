import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  inspectQuestionCaptureSync,
  syncQuestionCaptureToBitmap,
} from '../src/utils/questionCapture.ts'

let failed = 0
function assert(condition, message) {
  if (condition) console.log('OK:', message)
  else {
    failed += 1
    console.error('FAIL:', message)
  }
}

function approx(actual, expected, tolerance, message) {
  assert(
    Math.abs(actual - expected) <= tolerance,
    `${message} (got ${actual}, expected ${expected})`,
  )
}

const ppp = 600 / 72
const baseCapture = {
  sourcePageWidthPt: 595,
  sourcePageHeightPt: 842,
  viewportScale: ppp,
  devicePixelRatio: 1,
  cropWidthPx: 1800,
  cropHeightPx: 900,
  cropWidthPt: 1800 / ppp,
  cropHeightPt: 900 / ppp,
  pixelsPerPdfPoint: ppp,
}

// Test 1: ilk crop gerçek PNG boyutlarıyla senkronlanır.
const first = syncQuestionCaptureToBitmap(baseCapture, 1900, 950)
assert(first.cropWidthPx === 1900, 'initial crop width equals PNG naturalWidth')
assert(first.cropHeightPx === 950, 'initial crop height equals PNG naturalHeight')

// Test 2: re-edit daha dar/yüksek bitmap için eski alanları taşımaz.
const reedited = syncQuestionCaptureToBitmap(first, 1250, 1100)
assert(reedited.cropWidthPx === 1250, 're-edit replaces stale cropWidthPx')
assert(reedited.cropHeightPx === 1100, 're-edit replaces stale cropHeightPx')
approx(reedited.cropWidthPt, 1250 / ppp, 1e-9, 're-edit recomputes cropWidthPt')
approx(reedited.cropHeightPt, 1100 / ppp, 1e-9, 're-edit recomputes cropHeightPt')

// Test 3: px/pt oranı capture PPP invariant'ini korur.
const diagnostics = inspectQuestionCaptureSync('q-sync', reedited, 1250, 1100)
assert(diagnostics.captureSyncOk, 'PPP capture sync invariant passes')
approx(diagnostics.pppFromWidth, ppp, 1e-9, 'width-derived PPP matches capture')
approx(diagnostics.pppFromHeight, ppp, 1e-9, 'height-derived PPP matches capture')

// Test 4: native width senkron capture'tan gelir.
const staleNativeWidthPt = first.cropWidthPx / ppp
const currentNativeWidthPt = reedited.cropWidthPx / ppp
assert(currentNativeWidthPt !== staleNativeWidthPt, 're-edit native width does not use old metadata')
approx(currentNativeWidthPt, 1250 / ppp, 1e-9, 'native width uses synchronized capture')

// Test 5: production crop UI no longer exposes manual reference controls.
const root = path.dirname(fileURLToPath(import.meta.url))
const cropWorkspace = fs.readFileSync(
  path.join(root, '../src/components/crop/CropWorkspace.tsx'),
  'utf8',
)
const selectionOverlay = fs.readFileSync(
  path.join(root, '../src/components/crop/SelectionOverlay.tsx'),
  'utf8',
)
assert(!cropWorkspace.includes('Yazı referansı seç'), 'crop flow has no manual reference prompt')
assert(!selectionOverlay.includes('Yazı referansı'), 'selection overlay has no reference control')

// Test 6: eski fontReference alanı JSON yüklemeyi bozmaz.
const legacyQuestion = JSON.parse(JSON.stringify({
  capture: reedited,
  fontReference: {
    version: 1,
    kind: 'option-line',
    sourceRectNorm: { x: 0.1, y: 0.2, width: 0.3, height: 0.04 },
  },
}))
assert(legacyQuestion.capture.pixelsPerPdfPoint === ppp, 'legacy capture PPP preserved')
assert(legacyQuestion.fontReference.kind === 'option-line', 'legacy fontReference is preserved')

if (failed > 0) {
  console.error(`\n${failed} crop capture assertion(s) failed`)
  process.exit(1)
}
console.log('\nAll crop capture sync tests passed.')
