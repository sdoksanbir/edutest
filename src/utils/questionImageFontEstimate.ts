/**
 * Soru görselindeki mürekkep satırlarından tipik satır kalınlığı tahmini + seçim kutusu yüksekliği.
 * PDF'ten gelen sorularda gövde metni boyutuna yakın bir başlangıç punto üretir.
 */
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Küçük canvas üzerinde yatay projeksiyon; dönüş küçük piksel cinsinden medyan mürekkep bandı yüksekliği.
 */
function medianInkRunHeightOnSmallCanvas(canvas: HTMLCanvasElement): number | null {
  const w = canvas.width;
  const h = canvas.height;
  if (w < 16 || h < 16) return null;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, w, h);
  } catch {
    return null;
  }
  const d = imageData.data;
  const rowScore = new Float32Array(h);
  for (let y = 0; y < h; y++) {
    let ink = 0;
    const rowOff = y * w * 4;
    for (let x = 0; x < w; x++) {
      const i = rowOff + x * 4;
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (lum < 175) ink++;
    }
    rowScore[y] = ink / w;
  }
  const thresh = 0.006;
  const runs: number[] = [];
  let y = 0;
  while (y < h) {
    if (rowScore[y] <= thresh) {
      y++;
      continue;
    }
    const y0 = y;
    while (y < h && rowScore[y] > thresh) y++;
    const len = y - y0;
    if (len >= 3 && len <= Math.min(120, h * 0.42)) runs.push(len);
  }
  if (runs.length === 0) return null;
  runs.sort((a, b) => a - b);
  return runs[Math.floor(runs.length / 2)];
}

const ANALYZE_MAX_SIDE = 640;

/**
 * Soru görselinde belirli bir dikdörtgendeki metin çizgilerinden tipik band yüksekliği (daha isabetli punto için).
 */
function medianInkRunHeightInRect(
  sourceCanvas: HTMLCanvasElement,
  rect: { x: number; y: number; w: number; h: number }
): number | null {
  const x0 = Math.max(0, Math.floor(rect.x));
  const y0 = Math.max(0, Math.floor(rect.y));
  const x1 = Math.min(sourceCanvas.width, Math.ceil(rect.x + rect.w));
  const y1 = Math.min(sourceCanvas.height, Math.ceil(rect.y + rect.h));
  const rw = x1 - x0;
  const rh = y1 - y0;
  if (rw < 12 || rh < 12) return null;
  const maxDim = Math.max(rw, rh);
  let tw = rw;
  let th = rh;
  if (maxDim > ANALYZE_MAX_SIDE) {
    const scale = ANALYZE_MAX_SIDE / maxDim;
    tw = Math.max(16, Math.round(rw * scale));
    th = Math.max(16, Math.round(rh * scale));
  }
  const oc = document.createElement("canvas");
  oc.width = tw;
  oc.height = th;
  const octx = oc.getContext("2d");
  if (!octx) return null;
  octx.drawImage(sourceCanvas, x0, y0, rw, rh, 0, 0, tw, th);
  const smallMed = medianInkRunHeightOnSmallCanvas(oc);
  if (smallMed == null) return null;
  return smallMed * (rh / th);
}

/**
 * Büyük görsellerde ölçekleyerek analiz; sonuç orijinal canvas yüksekliğine ölçeklenir.
 */
function medianInkRunHeightPx(canvas: HTMLCanvasElement): number | null {
  const ow = canvas.width;
  const oh = canvas.height;
  if (ow < 16 || oh < 16) return null;
  const maxDim = Math.max(ow, oh);
  if (maxDim <= ANALYZE_MAX_SIDE) {
    return medianInkRunHeightOnSmallCanvas(canvas);
  }
  const scale = ANALYZE_MAX_SIDE / maxDim;
  const tw = Math.max(16, Math.round(ow * scale));
  const th = Math.max(16, Math.round(oh * scale));
  const oc = document.createElement("canvas");
  oc.width = tw;
  oc.height = th;
  const octx = oc.getContext("2d");
  if (!octx) return null;
  octx.drawImage(canvas, 0, 0, tw, th);
  const smallMed = medianInkRunHeightOnSmallCanvas(oc);
  if (smallMed == null) return null;
  return smallMed * (oh / th);
}

/**
 * Seçilen dikdörtgen yüksekliği + görüntüdeki tipik mürekkep bandı — önerilen CSS px boyutu.
 */
export function suggestFontPxFromSelection(
  canvas: HTMLCanvasElement | null,
  sel: { x: number; y: number; w: number; h: number }
): number {
  const boxHint = clamp(Math.round(sel.h * 0.42), 12, 88);
  if (!canvas) return boxHint;
  const localInk = medianInkRunHeightInRect(canvas, sel);
  const globalInk = medianInkRunHeightPx(canvas);
  const inkRun = localInk ?? globalInk;
  if (inkRun == null) return boxHint;
  const imageHint = clamp(Math.round(inkRun * 1.38), 11, 86);
  return clamp(Math.round(boxHint * 0.22 + imageHint * 0.78), 10, 96);
}
