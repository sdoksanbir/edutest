/**
 * Fasikül — soru altı kareli çözüm alanı.
 * Yüksekliği sorular arası boşluğa göre tam kare satırlarıyla büyür/küçülür;
 * genişlik sütun genişliğine yayılır.
 */

export const SCRATCH_CELL_MM = 5;
/** Izgara ile sonraki soru / footer arasında bırakılan boşluk */
export const SCRATCH_PAD_BOTTOM_PT = 8;
/** Soru görseli ile ızgara üstü */
export const SCRATCH_PAD_TOP_PT = 1.5;
export const SCRATCH_STROKE_HEX = "#C8CED8";
export const SCRATCH_STROKE_WIDTH_PT = 0.35;
/** Dış çerçeve */
export const SCRATCH_BORDER_HEX = "#94A3B8";
export const SCRATCH_BORDER_WIDTH_PT = 0.9;
/** Köşe yuvarlaklığı */
export const SCRATCH_CORNER_RADIUS_PT = 3.5;

const MM_TO_PT = 72 / 25.4;

export function scratchCellPt(cellMm = SCRATCH_CELL_MM): number {
  return cellMm * MM_TO_PT;
}

export type ScratchGridRectPt = {
  x: number;
  /** PDF: ızgara üst kenarı (y yukarı artar) */
  yTop: number;
  width: number;
  height: number;
  cellPt: number;
  cols: number;
  rows: number;
};

/**
 * Sütun genişliğine yayılan kare ızgara.
 * Hücre boyutu genişliğe bölünerek tam oturtulur (kare kalır).
 */
export function resolveScratchGridRectPt(args: {
  xPt: number;
  widthPt: number;
  questionBottomPt: number;
  gapBottomPt: number;
  cellMm?: number;
  padTopPt?: number;
  padBottomPt?: number;
}): ScratchGridRectPt | null {
  const idealCell = scratchCellPt(args.cellMm ?? SCRATCH_CELL_MM);
  if (!(idealCell > 0) || !(args.widthPt > 0)) return null;
  const padTop = args.padTopPt ?? SCRATCH_PAD_TOP_PT;
  const padBottom = args.padBottomPt ?? SCRATCH_PAD_BOTTOM_PT;
  const availH = args.questionBottomPt - args.gapBottomPt - padTop - padBottom;
  const cols = Math.max(1, Math.round(args.widthPt / idealCell));
  const cellPt = args.widthPt / cols;
  const rows = Math.floor(availH / cellPt);
  if (rows < 1) return null;
  return {
    x: args.xPt,
    yTop: args.questionBottomPt - padTop,
    width: args.widthPt,
    height: rows * cellPt,
    cellPt,
    cols,
    rows,
  };
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, rad);
    return;
  }
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

/** Canvas (y aşağı artar): ızgara + yuvarlak dış border */
export function drawScratchGridOnCanvas(
  ctx: CanvasRenderingContext2D,
  rect: {
    leftPx: number;
    topPx: number;
    widthPx: number;
    heightPx: number;
    cellPx: number;
    cols: number;
    rows: number;
  },
  opts?: {
    strokeHex?: string;
    lineWidthPx?: number;
    borderHex?: string;
    borderWidthPx?: number;
    radiusPx?: number;
  },
): void {
  const { leftPx, topPx, widthPx, heightPx, cellPx, cols, rows } = rect;
  if (cols < 1 || rows < 1 || cellPx <= 0) return;
  const strokeHex = opts?.strokeHex ?? SCRATCH_STROKE_HEX;
  const lineWidthPx = Math.max(0.5, opts?.lineWidthPx ?? 1);
  const borderHex = opts?.borderHex ?? SCRATCH_BORDER_HEX;
  const borderWidthPx = Math.max(0.75, opts?.borderWidthPx ?? 1.5);
  const radiusPx = Math.max(
    0,
    Math.min(opts?.radiusPx ?? SCRATCH_CORNER_RADIUS_PT, widthPx / 2, heightPx / 2),
  );

  ctx.save();
  roundedRectPath(ctx, leftPx, topPx, widthPx, heightPx, radiusPx);
  ctx.clip();

  ctx.strokeStyle = strokeHex;
  ctx.lineWidth = lineWidthPx;
  ctx.beginPath();
  for (let c = 1; c < cols; c++) {
    const x = leftPx + c * cellPx;
    ctx.moveTo(x, topPx);
    ctx.lineTo(x, topPx + heightPx);
  }
  for (let r = 1; r < rows; r++) {
    const y = topPx + r * cellPx;
    ctx.moveTo(leftPx, y);
    ctx.lineTo(leftPx + widthPx, y);
  }
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = borderHex;
  ctx.lineWidth = borderWidthPx;
  roundedRectPath(
    ctx,
    leftPx + borderWidthPx / 2,
    topPx + borderWidthPx / 2,
    widthPx - borderWidthPx,
    heightPx - borderWidthPx,
    Math.max(0, radiusPx - borderWidthPx / 2),
  );
  ctx.stroke();
  ctx.restore();
}
