export type PageFrameLineStyle = "solid" | "dashed" | "dotted";
export type PageFrameColorMode = "theme" | "custom";

export const PAGE_FRAME_INNER_GAP_MIN_MM = 0;
export const PAGE_FRAME_INNER_GAP_MAX_MM = 20;
export const PAGE_FRAME_INNER_GAP_DEFAULT_MM = 0;

export const PAGE_FRAME_CORNER_RADIUS_MIN_MM = 0;
export const PAGE_FRAME_CORNER_RADIUS_MAX_MM = 15;
export const PAGE_FRAME_CORNER_RADIUS_DEFAULT_MM = 0;

export function clampPageFrameInnerGapMm(mm: number): number {
  if (!Number.isFinite(mm)) return PAGE_FRAME_INNER_GAP_DEFAULT_MM;
  return Math.max(
    PAGE_FRAME_INNER_GAP_MIN_MM,
    Math.min(PAGE_FRAME_INNER_GAP_MAX_MM, Math.round(mm * 10) / 10)
  );
}

export function clampPageFrameCornerRadiusMm(mm: number): number {
  if (!Number.isFinite(mm)) return PAGE_FRAME_CORNER_RADIUS_DEFAULT_MM;
  return Math.max(
    PAGE_FRAME_CORNER_RADIUS_MIN_MM,
    Math.min(PAGE_FRAME_CORNER_RADIUS_MAX_MM, Math.round(mm * 10) / 10)
  );
}

export function pageFrameExpandGapPt(
  showFrame: boolean,
  innerGapMm: number,
  mmToPt: (mm: number) => number
): number {
  if (!showFrame) return 0;
  return mmToPt(clampPageFrameInnerGapMm(innerGapMm));
}

/** PDF koordinatları: x sol, y alt kenar, w/h boyut (pt). */
export function pageFrameRectPdfPt(
  pageWpt: number,
  pageHpt: number,
  mlPt: number,
  mrPt: number,
  mtPt: number,
  mbPt: number,
  expandPt: number
): { x: number; y: number; w: number; h: number } {
  const x = Math.max(0, mlPt - expandPt);
  const y = Math.max(0, mbPt - expandPt);
  const right = Math.min(pageWpt, pageWpt - mrPt + expandPt);
  const top = Math.min(pageHpt, pageHpt - mtPt + expandPt);
  return {
    x,
    y,
    w: Math.max(0, right - x),
    h: Math.max(0, top - y),
  };
}

/** Canvas koordinatları: x/y sol üst (pt). */
export function pageFrameRectCanvasPt(
  pageWpt: number,
  pageHpt: number,
  mlPt: number,
  mrPt: number,
  mtPt: number,
  mbPt: number,
  expandPt: number
): { x: number; y: number; w: number; h: number } {
  const x = Math.max(0, mlPt - expandPt);
  const y = Math.max(0, mtPt - expandPt);
  const right = Math.min(pageWpt, pageWpt - mrPt + expandPt);
  const bottom = Math.min(pageHpt, pageHpt - mbPt + expandPt);
  return {
    x,
    y,
    w: Math.max(0, right - x),
    h: Math.max(0, bottom - y),
  };
}

/** Köşe yarıçapını kutu boyutuna göre sınırla (pt cinsinden). */
export function effectivePageFrameCornerRadiusPt(
  radiusMm: number,
  widthPt: number,
  heightPt: number,
  mmToPt: (mm: number) => number
): number {
  const r = mmToPt(clampPageFrameCornerRadiusMm(radiusMm));
  return Math.min(r, widthPt / 2, heightPt / 2);
}

export function parsePageFrameLineStyle(raw: unknown): PageFrameLineStyle {
  if (raw === "dashed" || raw === "dotted") return raw;
  return "solid";
}

export function parsePageFrameColorMode(raw: unknown): PageFrameColorMode {
  return raw === "custom" ? "custom" : "theme";
}

export function resolvePageFrameColor(
  mode: PageFrameColorMode,
  customColor: string,
  themeColor: string
): string {
  if (mode === "theme") return themeColor.trim() || "#1E88E5";
  return customColor.trim() || themeColor.trim() || "#1E88E5";
}

export function canvasPageFrameDash(style: PageFrameLineStyle, scale: number): number[] {
  if (style === "dashed") return [5 * scale, 3 * scale];
  if (style === "dotted") return [1.5 * scale, 2.5 * scale];
  return [];
}

export function pdfPageFrameDash(style: PageFrameLineStyle): number[] | undefined {
  if (style === "dashed") return [4, 3];
  if (style === "dotted") return [1, 2];
  return undefined;
}
