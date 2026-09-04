/** @deprecated optikFormLayoutEngine.ts kullanın — geriye dönük uyumluluk. */
export {
  computeOptikFormLayout as computeOmrFormLayout,
  estimateCompactOptikFormHeightPx as estimateOmrFormHeight,
  mmToCanvasPx,
  ptToMm,
} from "./optikFormLayoutEngine";

export type { OptikFormLayoutResult as OmrFormLayout } from "./optikFormTypes";
