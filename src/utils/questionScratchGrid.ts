/**
 * Fasikül — soru altı kareli çözüm alanı.
 * Yüksekliği sorular arası boşluğa göre tam kare satırlarıyla büyür/küçülür;
 * genişlik sütun genişliğine yayılır.
 */

export const SCRATCH_CELL_MM = 5;
/** Izgara alt kenarı ile sonraki ÖRNEK badge / soru / footer arasında bırakılan boşluk */
export const SCRATCH_PAD_BOTTOM_PT = 12;
/**
 * Soru görseli ile ızgara üstü — varsayılan: bir kare satırı (cellPt).
 * Sabit pt değeri yalnızca geriye dönük; metrikler cellPt kullanır.
 */
export const SCRATCH_PAD_TOP_PT = 1.5;
export const SCRATCH_STROKE_HEX = "#C8CED8";
export const SCRATCH_STROKE_WIDTH_PT = 0.35;
/** Dış çerçeve */
export const SCRATCH_BORDER_HEX = "#94A3B8";
export const SCRATCH_BORDER_WIDTH_PT = 0.9;
/** Köşe yuvarlaklığı (pt) — varsayılan / clamp aralığı */
export const SCRATCH_CORNER_RADIUS_DEFAULT_PT = 1.5;
export const SCRATCH_CORNER_RADIUS_MIN_PT = 0;
export const SCRATCH_CORNER_RADIUS_MAX_PT = 20;
/** @deprecated SCRATCH_CORNER_RADIUS_DEFAULT_PT kullanın */
export const SCRATCH_CORNER_RADIUS_PT = SCRATCH_CORNER_RADIUS_DEFAULT_PT;

export type ScratchGridColorMode = "gray" | "black" | "theme" | "custom";
export const SCRATCH_COLOR_SOFT_GRAY = "#94A3B8";
export const SCRATCH_COLOR_BLACK = "#000000";
export const SCRATCH_COLOR_MODE_DEFAULT: ScratchGridColorMode = "gray";
export const SCRATCH_COLOR_CUSTOM_DEFAULT = SCRATCH_COLOR_SOFT_GRAY;

export function clampScratchCornerRadiusPt(pt: number): number {
  if (!Number.isFinite(pt)) return SCRATCH_CORNER_RADIUS_DEFAULT_PT;
  return Math.max(
    SCRATCH_CORNER_RADIUS_MIN_PT,
    Math.min(SCRATCH_CORNER_RADIUS_MAX_PT, Math.round(pt * 10) / 10),
  );
}

export function normalizeScratchGridColorMode(raw: unknown): ScratchGridColorMode {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "theme" || s === "custom" || s === "black" || s === "gray") return s;
  return SCRATCH_COLOR_MODE_DEFAULT;
}

export function normalizeScratchGridColorHex(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s.toUpperCase();
  if (/^[0-9A-Fa-f]{6}$/.test(s)) return `#${s.toUpperCase()}`;
  return SCRATCH_COLOR_CUSTOM_DEFAULT;
}

/** Çizgi + çerçeve rengi: yumuşak gri / siyah / tema / özel */
export function resolveScratchGridStrokeHex(args: {
  colorMode?: ScratchGridColorMode | string | null;
  customColor?: string | null;
  themeColor?: string | null;
}): string {
  const mode = normalizeScratchGridColorMode(args.colorMode);
  if (mode === "theme") {
    return normalizeScratchGridColorHex(args.themeColor ?? SCRATCH_COLOR_SOFT_GRAY);
  }
  if (mode === "custom") {
    return normalizeScratchGridColorHex(args.customColor);
  }
  if (mode === "black") {
    return SCRATCH_COLOR_BLACK;
  }
  return SCRATCH_COLOR_SOFT_GRAY;
}

const MM_TO_PT = 72 / 25.4;

export function scratchCellPt(cellMm = SCRATCH_CELL_MM): number {
  return cellMm * MM_TO_PT;
}

/** Soru ile kareli alan arası boşluk = 1 kare satırı */
export function scratchPadTopPt(cellPt: number): number {
  return cellPt > 0 ? cellPt : SCRATCH_PAD_TOP_PT;
}

/** Kareli alanın kapladığı dikey boşluk (üst pad + satırlar + alt pad) */
export function scratchOccupiedHeightPt(
  rows: number,
  cellPt: number,
  padBottomPt = SCRATCH_PAD_BOTTOM_PT,
): number {
  const padTop = scratchPadTopPt(cellPt);
  return padTop + Math.max(0, rows) * cellPt + padBottomPt;
}

/** Fasikül: her soru altında en az bu kadar kare satırı */
export const FASIKUL_MIN_SCRATCH_ROWS = 3;
/**
 * Sütun genişliğine göre hücre idealden ~%50 şişebilir (cols yuvarlama).
 * 3 satırın kesin sığması için bu payla rezerv hesaplanır.
 */
export const FASIKUL_SCRATCH_CELL_SAFETY = 1.5;

export function fasikulMinScratchGapPt(cellMm = SCRATCH_CELL_MM): number {
  const cellPt = cellMm * (72 / 25.4) * FASIKUL_SCRATCH_CELL_SAFETY;
  return scratchOccupiedHeightPt(FASIKUL_MIN_SCRATCH_ROWS, cellPt);
}

/** Çerçeve var, kareli yok: sonraki soru / kutu / alt banner öncesi 1 satır */
export function fasikulOneLineGapPt(cellMm = SCRATCH_CELL_MM): number {
  return scratchCellPt(cellMm);
}

/** Boş hazır tasarım kutusu altı — tam 2 satır */
export const FASIKUL_EMPTY_BOX_BOTTOM_ROWS = 2;

export function fasikulEmptyBoxBottomGapPt(cellMm = SCRATCH_CELL_MM): number {
  return FASIKUL_EMPTY_BOX_BOTTOM_ROWS * fasikulOneLineGapPt(cellMm);
}

/**
 * Soru altı minimum boşluk (fasikül).
 * Çerçeve açık + kareli kapalı → 1 satır; aksi halde 3 satırlık kareli rezerv.
 */
export function fasikulTrailingGapFloorPt(
  frame: { enabled?: boolean; showScratchGrid?: boolean } | null | undefined,
  cellMm = SCRATCH_CELL_MM,
): number {
  if (frame?.enabled === true && frame.showScratchGrid !== true) {
    return fasikulOneLineGapPt(cellMm);
  }
  return fasikulMinScratchGapPt(cellMm);
}

/** Sağ tık “Ekle” ile boş hazır tasarım kutusu yüksekliği (satır) */
export const FASIKUL_EMPTY_BOX_ROWS = 10;

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

export type ScratchGridMetrics = {
  availH: number;
  cellPt: number;
  cols: number;
  /** Boşluğa sığan en fazla satır (otomatik) */
  maxRows: number;
};

/** Izgara ölçüleri — satır sayısı olmadan (UI clamp için). */
export function resolveScratchGridMetrics(args: {
  widthPt: number;
  questionBottomPt: number;
  gapBottomPt: number;
  cellMm?: number;
  padTopPt?: number;
  padBottomPt?: number;
}): ScratchGridMetrics | null {
  const idealCell = scratchCellPt(args.cellMm ?? SCRATCH_CELL_MM);
  if (!(idealCell > 0) || !(args.widthPt > 0)) return null;
  const padBottom = args.padBottomPt ?? SCRATCH_PAD_BOTTOM_PT;
  const cols = Math.max(1, Math.round(args.widthPt / idealCell));
  const cellPt = args.widthPt / cols;
  const padTop = args.padTopPt ?? scratchPadTopPt(cellPt);
  const availH = args.questionBottomPt - args.gapBottomPt - padTop - padBottom;
  if (!(availH > 0)) return null;
  const maxRows = Math.floor(availH / cellPt);
  if (maxRows < 1) return null;
  return { availH, cellPt, cols, maxRows };
}

export function clampScratchGridRows(
  rows: number | null | undefined,
  maxRows: number,
): number | null {
  if (rows == null || !Number.isFinite(rows)) return null;
  const n = Math.round(rows);
  if (n < 1) return null;
  return Math.max(1, Math.min(maxRows, n));
}

/**
 * Sütun genişliğine yayılan kare ızgara.
 * Hücre boyutu genişliğe bölünerek tam oturtulur (kare kalır).
 * rowsOverride: soru bazlı satır sayısı (1…maxRows); yoksa otomatik max.
 */
export function resolveScratchGridRectPt(args: {
  xPt: number;
  widthPt: number;
  questionBottomPt: number;
  gapBottomPt: number;
  cellMm?: number;
  padTopPt?: number;
  padBottomPt?: number;
  /** Soru bazlı satır override; boşluğa sığacak şekilde clamp edilir */
  rowsOverride?: number | null;
  /** Fasikül: en az bu kadar satır (boşluk yetiyorsa) */
  minRows?: number;
}): ScratchGridRectPt | null {
  const metrics = resolveScratchGridMetrics(args);
  if (!metrics) return null;
  const clamped =
    clampScratchGridRows(args.rowsOverride, metrics.maxRows) ?? metrics.maxRows;
  const minWanted = Math.max(1, Math.round(args.minRows ?? 1));
  const rows = Math.min(
    metrics.maxRows,
    Math.max(clamped, Math.min(minWanted, metrics.maxRows)),
  );
  if (rows < 1) return null;
  const padTop = args.padTopPt ?? scratchPadTopPt(metrics.cellPt);
  return {
    x: args.xPt,
    yTop: args.questionBottomPt - padTop,
    width: args.widthPt,
    height: rows * metrics.cellPt,
    cellPt: metrics.cellPt,
    cols: metrics.cols,
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
    Math.min(opts?.radiusPx ?? SCRATCH_CORNER_RADIUS_DEFAULT_PT, widthPx / 2, heightPx / 2),
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
