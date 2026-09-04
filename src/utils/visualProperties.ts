export type WatermarkLayout = "diagonal" | "horizontal" | "vertical";

export const COLUMN_DIVIDER_COLOR_RED = "#DC2626";
export const COLUMN_DIVIDER_COLOR_TEAL = "#0D9488";

/** Çapraz dışındaki yönler sabit; diagonal için customDeg kullanılır */
export function resolveWatermarkAngleDeg(
  layout: WatermarkLayout | string,
  customDeg = 45,
): number {
  switch (layout) {
    case "horizontal":
      return 0;
    case "vertical":
      return 90;
    default:
      return Math.max(-90, Math.min(90, customDeg));
  }
}

/** @deprecated use resolveWatermarkAngleDeg */
export function watermarkLayoutToAngleDeg(layout: WatermarkLayout): number {
  return resolveWatermarkAngleDeg(layout, 45);
}

/** Canvas (Y aşağı) — önizleme ile uyumlu */
export function watermarkCanvasRotateRad(layout: WatermarkLayout | string, customDeg = 45): number {
  return (-resolveWatermarkAngleDeg(layout, customDeg) * Math.PI) / 180;
}

/** PDF (Y yukarı) — canvas ile aynı görsel yön */
export function watermarkPdfRotateRad(layout: WatermarkLayout | string, customDeg = 45): number {
  return (resolveWatermarkAngleDeg(layout, customDeg) * Math.PI) / 180;
}

export function hexToRgbParts(hex: string): [number, number, number] {
  const s = (hex || "").trim().replace(/^#/, "");
  if (s.length !== 6) return [220, 38, 38];
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}

export function stripDataUrlPrefix(dataUrl: string | null | undefined): string | null {
  if (!dataUrl) return null;
  const m = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
  return m ? m[1]! : dataUrl;
}
