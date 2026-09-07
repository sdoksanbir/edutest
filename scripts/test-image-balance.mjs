import { balanceDocumentImageRgba } from '../src/utils/balanceDocumentImage.ts'
import {
  nextFontMeasurementRevision,
  resetFontNormalizationFields,
  resolveRequestedScale,
} from '../src/utils/questionScale.ts'

let failed = 0
function assert(condition, message) {
  if (condition) console.log('OK:', message)
  else {
    failed++
    console.error('FAIL:', message)
  }
}

function image(width, height, background, foreground, foregroundColumns = 2) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = x < foregroundColumns ? foreground : background
      const offset = (y * width + x) * 4
      data[offset] = color[0]
      data[offset + 1] = color[1]
      data[offset + 2] = color[2]
      data[offset + 3] = color[3] ?? 255
    }
  }
  return data
}

const lum = (data, pixel) => {
  const offset = pixel * 4
  return 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2]
}

const bright = image(20, 10, [246, 246, 246], [172, 172, 172])
const brightResult = balanceDocumentImageRgba({ data: bright, width: 20, height: 10 })
const brightContrastBefore = lum(bright, 5) - lum(bright, 0)
const brightContrastAfter = lum(brightResult.data, 5) - lum(brightResult.data, 0)
assert(brightContrastAfter > brightContrastBefore, 'bright scan text/background contrast increases')

const dark = image(20, 10, [118, 118, 118], [45, 45, 45])
const darkResult = balanceDocumentImageRgba({ data: dark, width: 20, height: 10 })
const darkContrastBefore = lum(dark, 5) - lum(dark, 0)
const darkContrastAfter = lum(darkResult.data, 5) - lum(darkResult.data, 0)
assert(lum(darkResult.data, 5) > lum(dark, 5), 'dark scan background becomes lighter')
assert(darkContrastAfter > darkContrastBefore, 'dark scan contrast increases')

const normal = image(20, 10, [248, 248, 248], [24, 24, 24])
const normalResult = balanceDocumentImageRgba({ data: normal, width: 20, height: 10 })
assert(
  Math.abs(normalResult.diagnostics.meanLuminanceAfter - normalResult.diagnostics.meanLuminanceBefore) < 8,
  'balanced scan mean luminance changes conservatively',
)
assert(normalResult.diagnostics.strength <= 0.15, 'balanced scan uses low strength')

const transparent = image(4, 2, [240, 240, 240], [80, 120, 160], 1)
transparent[3] = 0
const transparentResult = balanceDocumentImageRgba({ data: transparent, width: 4, height: 2 })
assert(transparentResult.data[3] === 0, 'transparent pixel alpha remains zero')

const colored = image(20, 10, [245, 245, 245], [50, 120, 220], 4)
const coloredResult = balanceDocumentImageRgba({ data: colored, width: 20, height: 10 })
assert(
  coloredResult.data[0] !== coloredResult.data[1] &&
    coloredResult.data[1] !== coloredResult.data[2],
  'colored shape remains colored rather than grayscale',
)

assert(
  brightResult.width === 20 &&
    brightResult.height === 10 &&
    brightResult.data.length === bright.length,
  'bitmap dimensions and pixel count remain unchanged',
)

const capture = {
  cropWidthPx: 20,
  cropHeightPx: 10,
  pixelsPerPdfPoint: 8.333333333333334,
}
const captureBefore = JSON.stringify(capture)
const revisionBefore = 4
const reset = resetFontNormalizationFields({
  manualScale: 1.22,
  normalizationScale: 0.8,
  display_scale: 0.976,
})
assert(JSON.stringify(capture) === captureBefore, 'balance leaves capture metadata unchanged')
assert(capture.pixelsPerPdfPoint === 8.333333333333334, 'balance leaves ppp unchanged')
assert(nextFontMeasurementRevision({ fontMeasurementRevision: revisionBefore }) === 5, 'image mutation advances font revision')
assert(reset.normalizationScale === 1, 'image mutation invalidates old normalization')
assert(reset.manualScale === 1.22, 'image balance preserves manual scale semantics')
assert(
  resolveRequestedScale(reset) === reset.manualScale * reset.normalizationScale,
  'requested scale remains manual × normalization after balance reset',
)

if (failed > 0) {
  console.error(`\n${failed} image balance assertion(s) failed`)
  process.exit(1)
}
console.log('\nAll image balance tests passed.')
