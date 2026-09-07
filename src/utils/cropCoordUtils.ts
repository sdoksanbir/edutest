/**
 * Crop/selection coordinate utilities.
 * Desktop parity: norm (0..1) is the only persistent format. Zoom is display-only.
 *
 * Coordinate systems:
 * - Display: pixel coords in the visible/rendered image container (baseSize * zoom/100)
 * - Image: pixel coords in the actual image dimensions (naturalWidth × naturalHeight)
 * - Norm: 0..1 relative to page, zoom-invariant persistent format
 *
 * IMPORTANT: Image and overlay MUST use the SAME display dimensions (computed from
 * baseSize * zoom/100). Do NOT mix getBoundingClientRect with explicit width/height
 * — browser rounding and async layout cause cross-browser inconsistencies.
 */

export interface NormRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size2D {
  w: number;
  h: number;
}

/**
 * Compute size to fit (contain) image inside container while preserving aspect ratio.
 * Used for "fit to viewer" zoom calculation.
 */
export function computeContainedSize(
  containerW: number,
  containerH: number,
  imageW: number,
  imageH: number
): Size2D {
  if (imageW <= 0 || imageH <= 0) return { w: 1, h: 1 };
  const scale = Math.min(
    containerW / Math.max(1, imageW),
    containerH / Math.max(1, imageH)
  );
  return {
    w: Math.round(imageW * scale),
    h: Math.round(imageH * scale),
  };
}

/**
 * Canonical display size: naturalSize * (zoomPercent/100).
 * zoom 100 = 1:1 natural size. Use for BOTH image and overlay.
 */
export function computeDisplayedSize(
  naturalSize: Size2D | null,
  zoomPercent: number
): { w: number; h: number } {
  if (!naturalSize || naturalSize.w <= 0 || naturalSize.h <= 0) {
    return { w: 1, h: 1 };
  }
  return {
    w: Math.round(naturalSize.w * (zoomPercent / 100)),
    h: Math.round(naturalSize.h * (zoomPercent / 100)),
  };
}

/**
 * Zoom percent that would make naturalSize fit inside container (contain).
 * Result: when zoom = this value, displayedSize = computeContainedSize(...).
 */
export function computeFitZoomPercent(
  containerW: number,
  containerH: number,
  naturalW: number,
  naturalH: number
): number {
  if (naturalW <= 0 || naturalH <= 0) return 100;
  const fit = computeContainedSize(containerW, containerH, naturalW, naturalH);
  return Math.round((fit.w / naturalW) * 100);
}

/**
 * Zoom percent so that image WIDTH fits container (genişlik sayfaya sığar).
 */
export function computeFitZoomByWidth(
  containerW: number,
  naturalW: number,
  _naturalH: number
): number {
  if (naturalW <= 0) return 100;
  return Math.round((containerW / naturalW) * 100);
}

/**
 * Zoom percent so that image HEIGHT fits container (yükseklik sayfaya sığar).
 */
export function computeFitZoomByHeight(
  containerH: number,
  _naturalW: number,
  naturalH: number
): number {
  if (naturalH <= 0) return 100;
  return Math.round((containerH / naturalH) * 100);
}

export interface DisplayRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ImageRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Convert client/screen point (relative to container) to image-local point.
 * Use displayed image dimensions (offsetWidth/Height or getBoundingClientRect) and
 * natural dimensions for correct scaling.
 */
export function clientPointToImagePoint(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  displayedWidth: number,
  displayedHeight: number,
  naturalWidth: number,
  naturalHeight: number
): { x: number; y: number } {
  const localX = clientX - containerRect.left;
  const localY = clientY - containerRect.top;
  const scaleX = naturalWidth / Math.max(1, displayedWidth);
  const scaleY = naturalHeight / Math.max(1, displayedHeight);
  return {
    x: localX * scaleX,
    y: localY * scaleY,
  };
}

/**
 * Convert display rect (in displayed pixel coords) to normalized rect (0..1).
 * displayedWidth/Height = the rendered image size on screen (after any CSS scale).
 * naturalWidth/Height = image intrinsic dimensions (must be from fixed-DPI render).
 */
export function displayRectToNormalizedRect(
  displayRect: DisplayRect,
  displayedWidth: number,
  displayedHeight: number,
  naturalWidth: number,
  naturalHeight: number
): NormRect {
  const scaleX = naturalWidth / Math.max(1, displayedWidth);
  const scaleY = naturalHeight / Math.max(1, displayedHeight);
  const imgRect: ImageRect = {
    left: displayRect.left * scaleX,
    top: displayRect.top * scaleY,
    width: displayRect.width * scaleX,
    height: displayRect.height * scaleY,
  };
  return {
    x: imgRect.left / Math.max(1, naturalWidth),
    y: imgRect.top / Math.max(1, naturalHeight),
    width: imgRect.width / Math.max(1, naturalWidth),
    height: imgRect.height / Math.max(1, naturalHeight),
  };
}

/**
 * Convert PixelCrop from react-image-crop to normalized rect.
 * ReactCrop gives pixel coords in the displayed/croppable area.
 */
export function pixelCropToNormalizedRect(
  crop: { x: number; y: number; width: number; height: number },
  displayedWidth: number,
  displayedHeight: number,
  naturalWidth: number,
  naturalHeight: number
): NormRect {
  return displayRectToNormalizedRect(
    { left: crop.x, top: crop.y, width: crop.width, height: crop.height },
    displayedWidth,
    displayedHeight,
    naturalWidth,
    naturalHeight
  );
}

/**
 * Convert PercentCrop (0-100) to normalized rect (0-1).
 * Zoom/display independent - use this for reliable crop coordinates.
 */
export function percentCropToNormalizedRect(
  crop: { x: number; y: number; width: number; height: number }
): NormRect {
  return {
    x: crop.x / 100,
    y: crop.y / 100,
    width: crop.width / 100,
    height: crop.height / 100,
  };
}

/**
 * Convert normalized rect (0-1) to PercentCrop (0-100) for ReactCrop.
 */
export function normalizedRectToPercentCrop(
  norm: NormRect
): { x: number; y: number; width: number; height: number } {
  return {
    x: norm.x * 100,
    y: norm.y * 100,
    width: norm.width * 100,
    height: norm.height * 100,
  };
}

/**
 * Convert normalized rect to display rect for overlay rendering.
 * Use when drawing selection overlays on the image.
 */
export function normalizedRectToDisplayRect(
  norm: NormRect,
  displayedWidth: number,
  displayedHeight: number
): DisplayRect {
  return {
    left: norm.x * displayedWidth,
    top: norm.y * displayedHeight,
    width: norm.width * displayedWidth,
    height: norm.height * displayedHeight,
  };
}

/**
 * Clamp norm rect to valid 0..1 range.
 */
export function clampNormRect(norm: NormRect): NormRect {
  const x = Math.max(0, Math.min(1, norm.x));
  const y = Math.max(0, Math.min(1, norm.y));
  const w = Math.max(0, Math.min(1 - x, norm.width));
  const h = Math.max(0, Math.min(1 - y, norm.height));
  return { x, y, width: w, height: h };
}

/**
 * Validate norm rect (all in 0..1, non-degenerate).
 */
export function isValidNormRect(norm: NormRect): boolean {
  return (
    norm.x >= 0 &&
    norm.x <= 1 &&
    norm.y >= 0 &&
    norm.y <= 1 &&
    norm.width > 0 &&
    norm.width <= 1 &&
    norm.height > 0 &&
    norm.height <= 1 &&
    norm.x + norm.width <= 1 &&
    norm.y + norm.height <= 1
  );
}

const RECT_EPSILON = 1e-8;
const LOCAL_RECT_EPSILON = 1e-8;

/** inner dikdörtgeni outer içinde mi (ikisi de aynı normalize koordinat uzayında)? */
export function isRectContained(inner: NormRect, outer: NormRect): boolean {
  if (!isValidNormRect(inner) || !isValidNormRect(outer)) return false;
  return (
    inner.x >= outer.x - RECT_EPSILON &&
    inner.y >= outer.y - RECT_EPSILON &&
    inner.x + inner.width <= outer.x + outer.width + RECT_EPSILON &&
    inner.y + inner.height <= outer.y + outer.height + RECT_EPSILON
  );
}

export type PageNormalizedRectToCropLocalResult =
  | { ok: true; rect: NormRect }
  | { ok: false; reason: "OUTSIDE_QUESTION_CROP" | "INVALID_LOCAL_RECT" };

/**
 * Sayfa-normalize rect'i soru crop'una göre normalize 0–1 rect'e çevirir.
 * Containment ile local-coordinate geçerliliğini ayrı teşhis eder.
 */
export function resolvePageNormalizedRectToCropLocal(
  pageRect: NormRect,
  questionCrop: NormRect
): PageNormalizedRectToCropLocalResult {
  if (!isRectContained(pageRect, questionCrop)) {
    return { ok: false, reason: "OUTSIDE_QUESTION_CROP" };
  }
  if (!(questionCrop.width > 0) || !(questionCrop.height > 0)) {
    return { ok: false, reason: "INVALID_LOCAL_RECT" };
  }
  const rawLocal = {
    x: (pageRect.x - questionCrop.x) / questionCrop.width,
    y: (pageRect.y - questionCrop.y) / questionCrop.height,
    width: pageRect.width / questionCrop.width,
    height: pageRect.height / questionCrop.height,
  };
  const withinLocalEpsilon =
    Number.isFinite(rawLocal.x) &&
    Number.isFinite(rawLocal.y) &&
    Number.isFinite(rawLocal.width) &&
    Number.isFinite(rawLocal.height) &&
    rawLocal.x >= -LOCAL_RECT_EPSILON &&
    rawLocal.y >= -LOCAL_RECT_EPSILON &&
    rawLocal.width > 0 &&
    rawLocal.height > 0 &&
    rawLocal.x + rawLocal.width <= 1 + LOCAL_RECT_EPSILON &&
    rawLocal.y + rawLocal.height <= 1 + LOCAL_RECT_EPSILON;
  if (!withinLocalEpsilon) {
    return { ok: false, reason: "INVALID_LOCAL_RECT" };
  }
  const local = clampNormRect(rawLocal);
  return isValidNormRect(local)
    ? { ok: true, rect: local }
    : { ok: false, reason: "INVALID_LOCAL_RECT" };
}

/** Sayfa-normalize rect'i soru crop'una göre normalize 0–1 rect'e çevirir. */
export function pageNormalizedRectToCropLocal(
  pageRect: NormRect,
  questionCrop: NormRect
): NormRect | null {
  const result = resolvePageNormalizedRectToCropLocal(pageRect, questionCrop);
  return result.ok ? result.rect : null;
}

/** Soru-local normalize rect'i kaynak sayfa normalize koordinatına taşır. */
export function cropLocalRectToPageNormalized(
  localRect: NormRect,
  questionCrop: NormRect
): NormRect | null {
  if (!isValidNormRect(localRect) || !isValidNormRect(questionCrop)) return null;
  const pageRect = {
    x: questionCrop.x + localRect.x * questionCrop.width,
    y: questionCrop.y + localRect.y * questionCrop.height,
    width: localRect.width * questionCrop.width,
    height: localRect.height * questionCrop.height,
  };
  return isRectContained(pageRect, questionCrop) ? clampNormRect(pageRect) : null;
}

/** Kullanıcı sürüklemesini soru crop'u içinde tutan kesişim. */
export function constrainRectToContainer(
  rect: NormRect,
  container: NormRect
): NormRect | null {
  if (!isValidNormRect(container)) return null;
  const x0 = Math.max(container.x, rect.x);
  const y0 = Math.max(container.y, rect.y);
  const x1 = Math.min(container.x + container.width, rect.x + rect.width);
  const y1 = Math.min(container.y + container.height, rect.y + rect.height);
  if (x1 - x0 <= RECT_EPSILON || y1 - y0 <= RECT_EPSILON) return null;
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/**
 * Desktop parity: Boşluk varsa seçim alanını içeriğe (soruya) sığacak kadar küçült.
 * Canvas ile görüntüden içerik bbox bulunur, padding eklenir.
 *
 * @param img - Yüklü PDF sayfa görseli
 * @param percentCrop - Seçim alanı (0-100)
 * @param options - padding (piksel)
 * @returns Trimlenmiş norm rect veya null (içerik bulunamazsa orijinal kullanılır)
 */
export function trimCropToContent(
  img: HTMLImageElement,
  percentCrop: { x: number; y: number; width: number; height: number },
  options?: { paddingH?: number; paddingV?: number; whiteThreshold?: number }
): NormRect | null {
  const padH = options?.paddingH ?? 10;
  const padV = options?.paddingV ?? 5;
  const whiteThreshold = options?.whiteThreshold ?? 200;

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (w <= 0 || h <= 0) return null;

  const x0 = Math.floor((percentCrop.x / 100) * w);
  const y0 = Math.floor((percentCrop.y / 100) * h);
  const cw = Math.max(1, Math.floor((percentCrop.width / 100) * w));
  const ch = Math.max(1, Math.floor((percentCrop.height / 100) * h));

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(img, x0, y0, cw, ch, 0, 0, cw, ch);
  const data = ctx.getImageData(0, 0, cw, ch);
  const pixels = data.data;

  let xMin = cw;
  let yMin = ch;
  let xMax = 0;
  let yMax = 0;

  for (let py = 0; py < ch; py++) {
    for (let px = 0; px < cw; px++) {
      const i = (py * cw + px) * 4;
      const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      if (avg < whiteThreshold) {
        xMin = Math.min(xMin, px);
        yMin = Math.min(yMin, py);
        xMax = Math.max(xMax, px + 1);
        yMax = Math.max(yMax, py + 1);
      }
    }
  }

  if (xMin >= xMax || yMin >= yMax) return null;

  xMin = Math.max(0, xMin - padH);
  yMin = Math.max(0, yMin - padV);
  xMax = Math.min(cw, xMax + padH);
  yMax = Math.min(ch, yMax + padV);

  const trimX = (x0 + xMin) / w;
  const trimY = (y0 + yMin) / h;
  const trimW = (xMax - xMin) / w;
  const trimH = (yMax - yMin) / h;

  return clampNormRect({
    x: trimX,
    y: trimY,
    width: trimW,
    height: trimH,
  });
}
