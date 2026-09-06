/**
 * Sütun taşması clamp testleri (GROW_OVERFLOW_TOLERANCE kaldırma).
 */
import {
  clampSingleColumnDrawWidth,
  computeColumnImageBounds,
  computeImageAvailWPt,
  IMG_COL_RIGHT_PAD_PT,
} from '../src/utils/questionColumnClamp.ts'

let failed = 0
function assert(cond, msg) {
  if (!cond) {
    failed += 1
    console.error('FAIL:', msg)
  } else {
    console.log('OK:', msg)
  }
}

const AVAIL = 225.51

// --- requestedScale > 1, allow_slight_overflow=false ---
{
  const r = clampSingleColumnDrawWidth(200, 1.5, AVAIL, false)
  assert(r.drawWidth <= AVAIL + 1e-9, `scale>1 false: drawW=${r.drawWidth} <= ${AVAIL}`)
  assert(Math.abs(r.drawWidth - AVAIL) < 0.01, 'scale>1 clamps to availW')
  assert(r.maxAllowedW === AVAIL, 'maxAllowedW=availW')
}

// --- allow_slight_overflow=true yine sütun dışına çıkmaz ---
{
  const r = clampSingleColumnDrawWidth(200, 1.5, AVAIL, true)
  assert(r.drawWidth <= AVAIL + 1e-9, `allowSlight true: drawW=${r.drawWidth} <= avail`)
}

// --- t13 benzeri üst sınır ---
{
  for (const q of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    const native = 180 + q * 5
    const scale = 1.5
    const r = clampSingleColumnDrawWidth(native, scale, AVAIL, false)
    assert(r.drawWidth <= AVAIL + 1e-9, `Q${q} finalDrawWidth <= ${AVAIL}`)
  }
}

// --- sağ sütun + numara + gap ---
{
  const colW = 260
  const numTextW = 18
  const gap = 6
  const numOffset = 2
  const avail = computeImageAvailWPt({
    colW,
    numTextWPt: numTextW,
    numImageGapPt: gap,
    numOffsetPt: numOffset,
  })
  // 260 - 18 - 6 - 2 - 2 = 232
  assert(Math.abs(avail - 232) < 1e-9, `availW formula got ${avail}`)

  const columnX = 300 // sağ sütun
  const imageX = columnX + numOffset + numTextW + gap
  const r = clampSingleColumnDrawWidth(250, 1.4, avail, false)
  const bounds = computeColumnImageBounds({
    columnXPt: columnX,
    columnContentWidthPt: colW,
    rightPaddingPt: IMG_COL_RIGHT_PAD_PT,
    imageXPt: imageX,
    drawWidthPt: r.drawWidth,
  })
  assert(bounds.overflowPt === 0, `sağ sütun overflowPt=0 got ${bounds.overflowPt}`)
  assert(bounds.columnBoundsValid, 'sağ sütun columnBoundsValid')
  assert(bounds.drawRightPt <= bounds.safeRightPt + 0.01, 'drawRight <= safeRight')
}

// --- farklı page margin / 2–3 sütun ---
{
  for (const cols of [2, 3]) {
    const pageInner = 500
    const colGap = 12
    const colW = (pageInner - colGap * (cols - 1)) / cols
    const avail = computeImageAvailWPt({
      colW,
      numTextWPt: 20,
      numImageGapPt: 4,
      numOffsetPt: 0,
    })
    for (let c = 0; c < cols; c++) {
      const columnX = 40 + c * (colW + colGap)
      const imageX = columnX + 20 + 4
      const r = clampSingleColumnDrawWidth(300, 1.6, avail, false)
      const bounds = computeColumnImageBounds({
        columnXPt: columnX,
        columnContentWidthPt: colW,
        imageXPt: imageX,
        drawWidthPt: r.drawWidth,
      })
      assert(
        bounds.overflowPt <= 0.01,
        `${cols}col col=${c} overflowPt=${bounds.overflowPt}`,
      )
      assert(bounds.columnBoundsValid, `${cols}col col=${c} bounds valid`)
    }
  }
}

// --- farklı page margin ---
{
  const pageW = 595.28
  for (const margin of [36, 48, 72]) {
    const contentW = pageW - margin * 2
    const colW = contentW
    const avail = computeImageAvailWPt({
      colW,
      numTextWPt: 16,
      numImageGapPt: 5,
      numOffsetPt: 0,
    })
    const columnX = margin
    const imageX = columnX + 16 + 5
    const r = clampSingleColumnDrawWidth(280, 1.8, avail, false)
    const bounds = computeColumnImageBounds({
      columnXPt: columnX,
      columnContentWidthPt: colW,
      imageXPt: imageX,
      drawWidthPt: r.drawWidth,
    })
    assert(bounds.overflowPt <= 0.01, `margin=${margin} overflowPt=${bounds.overflowPt}`)
    assert(r.drawWidth <= avail + 1e-9, `margin=${margin} drawW<=avail`)
  }
}

// --- Eski 1.1 davranışı artık yok ---
{
  const oldBad = AVAIL * 1.1
  const r = clampSingleColumnDrawWidth(300, 2, AVAIL, false)
  assert(r.drawWidth < oldBad - 1, '1.1×avail artık üretilmez')
  assert(Math.abs(r.drawWidth - AVAIL) < 0.01, 'clamp = availW')
}

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`)
  process.exit(1)
}
console.log('\nAll column bounds tests passed.')
