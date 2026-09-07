/**
 * Fasikül — soru altı kareli çözüm alanı (PDF çizimi).
 * src/utils/questionScratchGrid.ts ile aynı geometri.
 */
import type { PDFPage } from 'pdf-lib'
import { rgb } from 'pdf-lib'

export const SCRATCH_CELL_MM = 5
export const SCRATCH_PAD_BOTTOM_PT = 8
export const SCRATCH_PAD_TOP_PT = 1.5
export const SCRATCH_STROKE_WIDTH_PT = 0.35
export const SCRATCH_BORDER_WIDTH_PT = 0.9
export const SCRATCH_CORNER_RADIUS_PT = 3.5

const MM_TO_PT = 72 / 25.4

function scratchCellPt(cellMm = SCRATCH_CELL_MM): number {
  return cellMm * MM_TO_PT
}

export type ScratchGridRectPt = {
  x: number
  yTop: number
  width: number
  height: number
  cellPt: number
  cols: number
  rows: number
}

export function resolveScratchGridRectPt(args: {
  xPt: number
  widthPt: number
  questionBottomPt: number
  gapBottomPt: number
  cellMm?: number
  padTopPt?: number
  padBottomPt?: number
}): ScratchGridRectPt | null {
  const idealCell = scratchCellPt(args.cellMm ?? SCRATCH_CELL_MM)
  if (!(idealCell > 0) || !(args.widthPt > 0)) return null
  const padTop = args.padTopPt ?? SCRATCH_PAD_TOP_PT
  const padBottom = args.padBottomPt ?? SCRATCH_PAD_BOTTOM_PT
  const availH = args.questionBottomPt - args.gapBottomPt - padTop - padBottom
  const cols = Math.max(1, Math.round(args.widthPt / idealCell))
  const cellPt = args.widthPt / cols
  const rows = Math.floor(availH / cellPt)
  if (rows < 1) return null
  return {
    x: args.xPt,
    yTop: args.questionBottomPt - padTop,
    width: args.widthPt,
    height: rows * cellPt,
    cellPt,
    cols,
    rows,
  }
}

/** pdf-lib drawSvgPath: y = şeklin ÜST kenarı */
function roundRectPath(w: number, h: number, r: number): string {
  const rad = Math.min(r, w / 2, h / 2)
  return [
    `M ${rad},0`,
    `L ${w - rad},0`,
    `Q ${w},0 ${w},${rad}`,
    `L ${w},${h - rad}`,
    `Q ${w},${h} ${w - rad},${h}`,
    `L ${rad},${h}`,
    `Q 0,${h} 0,${h - rad}`,
    `L 0,${rad}`,
    `Q 0,0 ${rad},0`,
    'Z',
  ].join(' ')
}

const GRID_STROKE = rgb(200 / 255, 206 / 255, 216 / 255)
const BORDER_STROKE = rgb(148 / 255, 163 / 255, 184 / 255)

export function drawScratchGridOnPdfPage(page: PDFPage, rect: ScratchGridRectPt): void {
  const { x, yTop, width, height, cellPt, cols, rows } = rect
  if (cols < 1 || rows < 1) return
  const yBottom = yTop - height
  const radius = Math.min(SCRATCH_CORNER_RADIUS_PT, width / 2, height / 2)

  // İç çizgiler köşe yayına taşmasın diye inset
  const inset = Math.max(SCRATCH_STROKE_WIDTH_PT, radius * 0.35)
  for (let c = 1; c < cols; c++) {
    const lx = x + c * cellPt
    if (lx <= x + inset || lx >= x + width - inset) continue
    page.drawLine({
      start: { x: lx, y: yBottom + inset },
      end: { x: lx, y: yTop - inset },
      thickness: SCRATCH_STROKE_WIDTH_PT,
      color: GRID_STROKE,
    })
  }
  for (let r = 1; r < rows; r++) {
    const ly = yTop - r * cellPt
    if (ly >= yTop - inset || ly <= yBottom + inset) continue
    page.drawLine({
      start: { x: x + inset, y: ly },
      end: { x: x + width - inset, y: ly },
      thickness: SCRATCH_STROKE_WIDTH_PT,
      color: GRID_STROKE,
    })
  }

  page.drawSvgPath(roundRectPath(width, height, radius), {
    x,
    y: yTop,
    borderColor: BORDER_STROKE,
    borderWidth: SCRATCH_BORDER_WIDTH_PT,
  })
}
