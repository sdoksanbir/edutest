/**
 * Fasikül — “Örnek N” rozeti.
 * Tek yuvarlak kutu; sol kenarlık = kalın dikey çizgi.
 * Renkler tema (ana / vurgu) rengine göre.
 */

/** Sol kenarlık kalınlığı */
export const ORNEK_BADGE_BORDER_LEFT_PT = 3.2;
export const ORNEK_BADGE_PAD_X_PT = 7;
export const ORNEK_BADGE_FONT_PT = 10;
export const ORNEK_BADGE_HEIGHT_PT = 15.5;
export const ORNEK_BADGE_RADIUS_PT = 5.5;
/** Rozet altı ile soru görseli üstü */
export const ORNEK_BADGE_GAP_ABOVE_IMAGE_PT = 1.5;
/**
 * Yerleşim img_y_top rozetin üst kenarıdır; görsel bunun altına
 * (BLOCK kadar aşağı) kaydırılır — banner'a binmez.
 */
export const ORNEK_BADGE_BLOCK_PT =
  ORNEK_BADGE_HEIGHT_PT + ORNEK_BADGE_GAP_ABOVE_IMAGE_PT;

export const ORNEK_BADGE_BAR_WIDTH_PT = ORNEK_BADGE_BORDER_LEFT_PT;
export const ORNEK_BADGE_BAR_GAP_PT = 0;

export function ornekBadgeLabel(displayNumber: number): string {
  return `Örnek ${Math.max(1, Math.round(displayNumber))}`;
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || "").trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function toHex(r: number, g: number, b: number): string {
  const t = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c)))
      .toString(16)
      .padStart(2, "0");
  return `#${t(r)}${t(g)}${t(b)}`;
}

/** Kenarlık + yazı rengi (tema) */
export function ornekBadgeAccentHex(themeHex: string): string {
  const p = parseHex(themeHex);
  if (!p) return "#0A1931";
  return toHex(p.r, p.g, p.b);
}

/** Açık dolgu — tema renginin açık tonu */
export function ornekBadgeFillHex(themeHex: string): string {
  const p = parseHex(themeHex);
  if (!p) return "#E8EEF5";
  const mix = (c: number) => c * 0.16 + 255 * 0.84;
  return toHex(mix(p.r), mix(p.g), mix(p.b));
}

export type OrnekBadgeMetrics = {
  label: string;
  borderLeftPt: number;
  pillWPt: number;
  pillHPt: number;
  totalWPt: number;
  heightPt: number;
  fontPt: number;
  radiusPt: number;
};

export function measureOrnekBadge(
  displayNumber: number,
  measureTextWidthPt: (text: string, fontPt: number) => number,
): OrnekBadgeMetrics {
  const label = ornekBadgeLabel(displayNumber);
  const fontPt = ORNEK_BADGE_FONT_PT;
  const textW = measureTextWidthPt(label, fontPt);
  const pillHPt = ORNEK_BADGE_HEIGHT_PT;
  const contentW = Math.max(textW + ORNEK_BADGE_PAD_X_PT * 2, 42);
  const pillWPt = contentW + ORNEK_BADGE_BORDER_LEFT_PT;
  return {
    label,
    borderLeftPt: ORNEK_BADGE_BORDER_LEFT_PT,
    pillWPt,
    pillHPt,
    totalWPt: pillWPt,
    heightPt: pillHPt,
    fontPt,
    radiusPt: ORNEK_BADGE_RADIUS_PT,
  };
}

function fillRoundRect(
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
  } else {
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
  ctx.fill();
}

/** Canvas: rozet soru görselinin sol-üstünde (görselin içinde). */
export function drawOrnekBadgeOnCanvas(
  ctx: CanvasRenderingContext2D,
  args: {
    leftPx: number;
    topPx: number;
    scale: number;
    metrics: OrnekBadgeMetrics;
    /** Tema ana / vurgu rengi */
    accentHex?: string;
  },
): void {
  const { leftPx, topPx, scale, metrics } = args;
  const theme = (args.accentHex || "").trim() || "#0A1931";
  const accent = ornekBadgeAccentHex(theme);
  const fill = ornekBadgeFillHex(theme);
  const w = metrics.pillWPt * scale;
  const h = metrics.pillHPt * scale;
  const radius = metrics.radiusPt * scale;
  const borderL = metrics.borderLeftPt * scale;
  const fontPx = metrics.fontPt * scale;

  ctx.save();

  ctx.fillStyle = fill;
  fillRoundRect(ctx, leftPx, topPx, w, h, radius);

  ctx.save();
  fillRoundRect(ctx, leftPx, topPx, w, h, radius);
  ctx.clip();
  ctx.fillStyle = accent;
  ctx.fillRect(leftPx, topPx, borderL, h);
  ctx.restore();

  const contentLeft = leftPx + borderL;
  const contentW = w - borderL;
  ctx.fillStyle = accent;
  ctx.font = `700 ${fontPx}px "Segoe UI", Helvetica, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(metrics.label, contentLeft + contentW / 2, topPx + h / 2 + 0.2 * scale);
  ctx.restore();
}
