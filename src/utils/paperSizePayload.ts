import { PAPER_PRESETS_MM } from "../constants/paperSizes";

/** Kağıt boyutu ve yönlendirme store değerlerini API payload'una çevirir */
export function getPaperSizePayload(
  paperSize: string,
  paperWidthMm: number,
  paperHeightMm: number,
  orientation: "portrait" | "landscape" = "portrait"
): { page_preset: string; page_width_mm: number; page_height_mm: number; orientation: string } {
  const base =
    paperSize === "Tam Boyutu Belirleyin"
      ? {
          page_preset: "CUSTOM",
          page_width_mm: paperWidthMm || 210,
          page_height_mm: paperHeightMm || 297,
        }
      : (() => {
          const dims = PAPER_PRESETS_MM[paperSize];
          const [w, h] = dims ?? [210, 297];
          return {
            page_preset: paperSize,
            page_width_mm: w,
            page_height_mm: h,
          };
        })();
  return { ...base, orientation };
}
