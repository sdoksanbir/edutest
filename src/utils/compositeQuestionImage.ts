import type { QuestionImageTextOverlay } from "../types";
import { plainTextToCanvasSync } from "./plainTextPreviewCanvas";

function toDataUrl(b64OrData: string): string {
  const s = b64OrData.trim();
  if (s.startsWith("data:")) return s;
  return `data:image/png;base64,${s}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Görüntü yüklenemedi"));
    img.src = src;
  });
}

/** underlay + metin katmanları → tek PNG base64 (ön ek yok). */
export async function compositeImageWithTextOverlays(
  underlayB64Raw: string,
  overlays: QuestionImageTextOverlay[]
): Promise<string> {
  const src = toDataUrl(underlayB64Raw);
  const img = await loadImage(src);
  const cw = img.naturalWidth;
  const ch = img.naturalHeight;
  if (cw < 1 || ch < 1) {
    return underlayB64Raw.replace(/^data:image\/png;base64,/, "");
  }
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return underlayB64Raw.replace(/^data:image\/png;base64,/, "");
  }
  ctx.drawImage(img, 0, 0, cw, ch);

  const pad = 4;
  for (const o of overlays) {
    // html2canvas yerine doğrudan canvas 2D: PDF’te çift/ kalın “bulaşık” metin oluşmaz.
    const layer = plainTextToCanvasSync(o.text, o.fontSizePx, o.w);
    const kw = layer.width;
    const kh = layer.height;
    const availW = Math.max(1, o.w - 2 * pad);
    const availH = Math.max(1, o.h - 2 * pad);
    const sc = Math.min(availW / kw, availH / kh, 1);
    const dw = kw * sc;
    const dh = kh * sc;
    const dx = o.x + (o.w - dw) / 2;
    const dy = o.y + (o.h - dh) / 2;
    const rdx = Math.round(dx);
    const rdy = Math.round(dy);
    const rdw = Math.max(1, Math.round(dw));
    const rdh = Math.max(1, Math.round(dh));
    ctx.imageSmoothingEnabled = sc < 1;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(layer, 0, 0, kw, kh, rdx, rdy, rdw, rdh);
  }

  return canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
}
