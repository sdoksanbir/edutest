/**
 * Fasikül — soru altı kareli çözüm alanı (PDF çizimi).
 * src/utils/questionScratchGrid.ts ile aynı geometri.
 */
import type { PDFPage } from 'pdf-lib'
import { rgb } from 'pdf-lib'

export const SCRATCH_CELL_MM = 5
/** Izgara alt kenarı ile sonraki ÖRNEK badge / soru / footer arasında bırakılan boşluk */
export const SCRATCH_PAD_BOTTOM_PT = 12
/** Geriye dönük; gerçek üst pad = bir hücre (scratchPadTopPt) */
export const SCRATCH_PAD_TOP_PT = 1.5
export const SCRATCH_STROKE_WIDTH_PT = 0.35
export const SCRATCH_BORDER_WIDTH_PT = 0.9
export const SCRATCH_CORNER_RADIUS_DEFAULT_PT = 1.5
export const SCRATCH_CORNER_RADIUS_MIN_PT = 0
export const SCRATCH_CORNER_RADIUS_MAX_PT = 20
/** @deprecated SCRATCH_CORNER_RADIUS_DEFAULT_PT kullanın */
export const SCRATCH_CORNER_RADIUS_PT = SCRATCH_CORNER_RADIUS_DEFAULT_PT

export type ScratchGridColorMode = 'gray' | 'black' | 'theme' | 'custom'
export const SCRATCH_COLOR_SOFT_GRAY = '#94A3B8'
export const SCRATCH_COLOR_BLACK = '#000000'
export const SCRATCH_COLOR_MODE_DEFAULT: ScratchGridColorMode = 'gray'
export const SCRATCH_COLOR_CUSTOM_DEFAULT = SCRATCH_COLOR_SOFT_GRAY

export function clampScratchCornerRadiusPt(pt: number): number {
  if (!Number.isFinite(pt)) return SCRATCH_CORNER_RADIUS_DEFAULT_PT
  return Math.max(
    SCRATCH_CORNER_RADIUS_MIN_PT,
    Math.min(SCRATCH_CORNER_RADIUS_MAX_PT, Math.round(pt * 10) / 10),
  )
}

export function normalizeScratchGridColorMode(raw: unknown): ScratchGridColorMode {
  const s = String(raw ?? '').trim().toLowerCase()
  if (s === 'theme' || s === 'custom' || s === 'black' || s === 'gray') return s
  return SCRATCH_COLOR_MODE_DEFAULT
}

export function normalizeScratchGridColorHex(raw: unknown): string {
  const s = String(raw ?? '').trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s.toUpperCase()
  if (/^[0-9A-Fa-f]{6}$/.test(s)) return `#${s.toUpperCase()}`
  return SCRATCH_COLOR_CUSTOM_DEFAULT
}

export function resolveScratchGridStrokeHex(args: {
  colorMode?: ScratchGridColorMode | string | null
  customColor?: string | null
  themeColor?: string | null
}): string {
  const mode = normalizeScratchGridColorMode(args.colorMode)
  if (mode === 'theme') {
    return normalizeScratchGridColorHex(args.themeColor ?? SCRATCH_COLOR_SOFT_GRAY)
  }
  if (mode === 'custom') {
    return normalizeScratchGridColorHex(args.customColor)
  }
  if (mode === 'black') {
    return SCRATCH_COLOR_BLACK
  }
  return SCRATCH_COLOR_SOFT_GRAY
}

const MM_TO_PT = 72 / 25.4

export function scratchCellPt(cellMm = SCRATCH_CELL_MM): number {
  return cellMm * MM_TO_PT
}

function scratchPadTopPt(cellPt: number): number {
  return cellPt > 0 ? cellPt : SCRATCH_PAD_TOP_PT
}

/** Fasikül: her soru altında en az bu kadar kare satırı */
export const FASIKUL_MIN_SCRATCH_ROWS = 3
/** Sütun genişliği hücreyi idealden şişirebilir — 3 satır kesin sığsın */
export const FASIKUL_SCRATCH_CELL_SAFETY = 1.5

/** padTop + satırlar + padBottom */
export function scratchOccupiedHeightPt(
  rows: number,
  cellPt: number,
  padBottomPt = SCRATCH_PAD_BOTTOM_PT,
): number {
  const padTop = scratchPadTopPt(cellPt)
  return padTop + Math.max(0, rows) * cellPt + padBottomPt
}

export function fasikulMinScratchGapPt(cellMm = SCRATCH_CELL_MM): number {
  return scratchOccupiedHeightPt(
    FASIKUL_MIN_SCRATCH_ROWS,
    scratchCellPt(cellMm) * FASIKUL_SCRATCH_CELL_SAFETY,
  )
}

/** Çerçeve var, kareli yok: 1 satır boşluk */
export function fasikulOneLineGapPt(cellMm = SCRATCH_CELL_MM): number {
  return scratchCellPt(cellMm)
}

export const FASIKUL_EMPTY_BOX_BOTTOM_ROWS = 2

export function fasikulEmptyBoxBottomGapPt(cellMm = SCRATCH_CELL_MM): number {
  return FASIKUL_EMPTY_BOX_BOTTOM_ROWS * fasikulOneLineGapPt(cellMm)
}

export function fasikulTrailingGapFloorPt(
  frame: { enabled?: boolean; showScratchGrid?: boolean } | null | undefined,
  cellMm = SCRATCH_CELL_MM,
): number {
  if (frame?.enabled === true && frame.showScratchGrid !== true) {
    return fasikulOneLineGapPt(cellMm)
  }
  return fasikulMinScratchGapPt(cellMm)
}

export const FASIKUL_EMPTY_BOX_ROWS = 10

export type ScratchGridRectPt = {
  x: number
  yTop: number
  width: number
  height: number
  cellPt: number
  cols: number
  rows: number
}

export type ScratchGridMetrics = {
  availH: number
  cellPt: number
  cols: number
  maxRows: number
}

export function resolveScratchGridMetrics(args: {
  widthPt: number
  questionBottomPt: number
  gapBottomPt: number
  cellMm?: number
  padTopPt?: number
  padBottomPt?: number
}): ScratchGridMetrics | null {
  const idealCell = scratchCellPt(args.cellMm ?? SCRATCH_CELL_MM)
  if (!(idealCell > 0) || !(args.widthPt > 0)) return null
  const padBottom = args.padBottomPt ?? SCRATCH_PAD_BOTTOM_PT
  const cols = Math.max(1, Math.round(args.widthPt / idealCell))
  const cellPt = args.widthPt / cols
  const padTop = args.padTopPt ?? scratchPadTopPt(cellPt)
  const availH = args.questionBottomPt - args.gapBottomPt - padTop - padBottom
  if (!(availH > 0)) return null
  const maxRows = Math.floor(availH / cellPt)
  if (maxRows < 1) return null
  return { availH, cellPt, cols, maxRows }
}

export function clampScratchGridRows(
  rows: number | null | undefined,
  maxRows: number,
): number | null {
  if (rows == null || !Number.isFinite(rows)) return null
  const n = Math.round(rows)
  if (n < 1) return null
  return Math.max(1, Math.min(maxRows, n))
}

export function resolveScratchGridRectPt(args: {
  xPt: number
  widthPt: number
  questionBottomPt: number
  gapBottomPt: number
  cellMm?: number
  padTopPt?: number
  padBottomPt?: number
  rowsOverride?: number | null
  minRows?: number
}): ScratchGridRectPt | null {
  const metrics = resolveScratchGridMetrics(args)
  if (!metrics) return null
  const clamped =
    clampScratchGridRows(args.rowsOverride, metrics.maxRows) ?? metrics.maxRows
  const minWanted = Math.max(1, Math.round(args.minRows ?? 1))
  const rows = Math.min(
    metrics.maxRows,
    Math.max(clamped, Math.min(minWanted, metrics.maxRows)),
  )
  if (rows < 1) return null
  const padTop = args.padTopPt ?? scratchPadTopPt(metrics.cellPt)
  return {
    x: args.xPt,
    yTop: args.questionBottomPt - padTop,
    width: args.widthPt,
    height: rows * metrics.cellPt,
    cellPt: metrics.cellPt,
    cols: metrics.cols,
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

function colorFromHex(hex: string | undefined) {
  if (!hex) return null
  const s = hex.trim().replace(/^#/, '')
  if (s.length !== 6) return null
  return rgb(
    parseInt(s.slice(0, 2), 16) / 255,
    parseInt(s.slice(2, 4), 16) / 255,
    parseInt(s.slice(4, 6), 16) / 255,
  )
}

export function drawScratchGridOnPdfPage(
  page: PDFPage,
  rect: ScratchGridRectPt,
  opts?: { cornerRadiusPt?: number; strokeHex?: string },
): void {
  const { x, yTop, width, height, cellPt, cols, rows } = rect
  if (cols < 1 || rows < 1) return
  const yBottom = yTop - height
  const radius = Math.min(
    clampScratchCornerRadiusPt(opts?.cornerRadiusPt ?? SCRATCH_CORNER_RADIUS_DEFAULT_PT),
    width / 2,
    height / 2,
  )
  const stroke = colorFromHex(opts?.strokeHex) ?? GRID_STROKE
  const border = colorFromHex(opts?.strokeHex) ?? BORDER_STROKE

  // İç çizgiler köşe yayına taşmasın diye inset
  const inset = Math.max(SCRATCH_STROKE_WIDTH_PT, radius * 0.35)
  for (let c = 1; c < cols; c++) {
    const lx = x + c * cellPt
    if (lx <= x + inset || lx >= x + width - inset) continue
    page.drawLine({
      start: { x: lx, y: yBottom + inset },
      end: { x: lx, y: yTop - inset },
      thickness: SCRATCH_STROKE_WIDTH_PT,
      color: stroke,
    })
  }
  for (let r = 1; r < rows; r++) {
    const ly = yTop - r * cellPt
    if (ly >= yTop - inset || ly <= yBottom + inset) continue
    page.drawLine({
      start: { x: x + inset, y: ly },
      end: { x: x + width - inset, y: ly },
      thickness: SCRATCH_STROKE_WIDTH_PT,
      color: stroke,
    })
  }

  page.drawSvgPath(roundRectPath(width, height, radius), {
    x,
    y: yTop,
    borderColor: border,
    borderWidth: SCRATCH_BORDER_WIDTH_PT,
  })
}
