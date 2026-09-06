/** Başlık logosu — şeffaf çizim ve yükleme yardımcıları */

export const HEADER_LOGO_SIZE_MIN_PCT = 40;
export const HEADER_LOGO_SIZE_MAX_PCT = 160;
export const HEADER_LOGO_SIZE_DEFAULT_PCT = 100;
/** Sol sütun logosu — kenar boşluğu (pt) */
export const HEADER_LOGO_COL_PAD_PT = 2;

export const LOGO_PAD_MIN_PT = 0;
export const LOGO_PAD_MAX_PT = 20;
export const LOGO_PAD_Y_DEFAULT_PT = 2;
export const LOGO_PAD_LEFT_DEFAULT_PT = 4;

export function clampLogoPadPt(pt: number): number {
  const n = Number.isFinite(pt) ? pt : 0;
  return Math.max(LOGO_PAD_MIN_PT, Math.min(LOGO_PAD_MAX_PT, Math.round(n * 2) / 2));
}

/** Üst+alt ortak dikey boşluk — dış kutuyu büyütür */
export function resolveLogoPadYPt(config: {
  logoPadYPt?: number;
  logoPadTopPt?: number;
  logoPadBottomPt?: number;
}): number {
  const n = Number(config.logoPadYPt);
  if (Number.isFinite(n)) return clampLogoPadPt(n);
  const top = Number(config.logoPadTopPt);
  const bottom = Number(config.logoPadBottomPt);
  if (Number.isFinite(top) || Number.isFinite(bottom)) {
    const t = Number.isFinite(top) ? top : LOGO_PAD_Y_DEFAULT_PT;
    const b = Number.isFinite(bottom) ? bottom : LOGO_PAD_Y_DEFAULT_PT;
    return clampLogoPadPt((t + b) / 2);
  }
  return LOGO_PAD_Y_DEFAULT_PT;
}

export function resolveLogoPadLeftPt(config: { logoPadLeftPt?: number }): number {
  const n = Number(config.logoPadLeftPt);
  return Number.isFinite(n) ? clampLogoPadPt(n) : LOGO_PAD_LEFT_DEFAULT_PT;
}

export function clampHeaderLogoSizePct(pct: number): number {
  return Math.max(
    HEADER_LOGO_SIZE_MIN_PCT,
    Math.min(HEADER_LOGO_SIZE_MAX_PCT, Math.round(pct)),
  );
}

export function headerLogoScale(logoSizePct = HEADER_LOGO_SIZE_DEFAULT_PCT): number {
  return clampHeaderLogoSizePct(logoSizePct) / 100;
}

export function headerLogoWidthPt(basePt: number, logoSizePct = HEADER_LOGO_SIZE_DEFAULT_PCT): number {
  return basePt * headerLogoScale(logoSizePct);
}

/** Kutu içinde en-boy oranı koruyarak maksimum boyut (contain) */
export function fitLogoDimensions(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number,
  logoSizePct = HEADER_LOGO_SIZE_DEFAULT_PCT,
): { w: number; h: number } {
  const scale = headerLogoScale(logoSizePct);
  const maxW = boxW * scale;
  const maxH = boxH * scale;
  const aspect = imgW / imgH || 1;
  let w = maxW;
  let h = w / aspect;
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }
  return { w, h };
}

/** Beyaz/açık arka planı şeffaf PNG data URL'e çevirir */
export function removeWhiteBackgroundFromDataUrl(
  dataUrl: string,
  threshold = 232,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas oluşturulamadı"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i]! >= threshold && d[i + 1]! >= threshold && d[i + 2]! >= threshold) {
          d[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Logo okunamadı"));
    img.src = dataUrl;
  });
}

/** Vite asset veya http URL → data URL (PDF export için) */
export async function resolveHeaderLogoUrlForExport(logoUrl: string): Promise<string> {
  const url = (logoUrl || "").trim();
  if (!url || url.startsWith("data:")) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) return url;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? url));
      reader.onerror = () => reject(new Error("Logo okunamadı"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

/** Sol sütun kutusu içinde en-boy oranı korunarak logo (yüksek kalite) */
export type HeaderLogoBoxAlign = "center" | "left";

export function drawHeaderLogoInBox(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  logoSizePct = HEADER_LOGO_SIZE_DEFAULT_PCT,
  align: HeaderLogoBoxAlign = "center",
) {
  if (!img.complete || img.naturalWidth <= 0 || boxW <= 0 || boxH <= 0) return;
  const prevSmooth = ctx.imageSmoothingEnabled;
  const prevQuality = ctx.imageSmoothingQuality;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const { w, h } = fitLogoDimensions(
    img.naturalWidth,
    img.naturalHeight,
    boxW,
    boxH,
    logoSizePct,
  );
  const x = align === "left" ? boxX : boxX + (boxW - w) / 2;
  const y = boxY + (boxH - h) / 2;
  ctx.drawImage(img, x, y, w, h);
  ctx.imageSmoothingEnabled = prevSmooth;
  ctx.imageSmoothingQuality = prevQuality;
}

/** Merkez (cx,cy) etrafında en-boy oranı korunarak şeffaf logo */
export function drawHeaderLogoImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  maxSizePx: number,
) {
  if (!img.complete || img.naturalWidth <= 0) return;
  const aspect = img.naturalWidth / img.naturalHeight || 1;
  let w = maxSizePx;
  let h = maxSizePx / aspect;
  if (h > maxSizePx) {
    h = maxSizePx;
    w = maxSizePx * aspect;
  }
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}
