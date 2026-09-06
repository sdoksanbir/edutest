/**
 * Client-side PDF rendering (Local PDF mode).
 * PDF sunucuya gönderilmez, tarayıcıda render edilir.
 * Legacy build kullanılıyor: Opera, Edge gibi tarayıcılarda Promise.withResolvers polyfill'i var.
 */

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
}

export interface LocalPdfDoc {
  doc: pdfjsLib.PDFDocumentProxy;
  pageCount: number;
  filename: string;
}

/**
 * PDF dosyasını yükle (ArrayBuffer, sunucuya gönderilmez).
 */
export async function loadPdfFromFile(file: File): Promise<LocalPdfDoc> {
  const buf = await file.arrayBuffer();
  const loaded = await loadPdfFromBytes(buf);
  return { ...loaded, filename: file.name };
}

export async function loadPdfFromBytes(data: ArrayBuffer): Promise<LocalPdfDoc> {
  const loadingTask = pdfjsLib.getDocument({ data });
  const doc = await loadingTask.promise;
  return { doc, pageCount: doc.numPages, filename: "document.pdf" };
}

/**
 * Editöre eklenen kırpmalar ve layout-engine LAYOUT_ZOOM ile aynı yoğunluk.
 * 600 DPI → zoom = 600/72 ≈ 8.333
 */
export const CROP_EXPORT_DPI = 600

/** Varsayılan render yoğunluğu — crop / layout ile aynı (600). */
export const DEFAULT_PDF_RENDER_DPI = CROP_EXPORT_DPI

/**
 * PDF sayfasını canvas'a render edip data URL (PNG) olarak döndür.
 * Baskı kalitesi için dpi ≥ 300 önerilir (CROP_EXPORT_DPI = 600).
 * Not: Bu yol CSS/devicePixelRatio kullanmaz — canvas = viewport px (PDF pt × scale).
 */
export async function renderPageToDataUrl(
  doc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  dpi: number = DEFAULT_PDF_RENDER_DPI
): Promise<string> {
  const { dataUrl } = await renderPageWithCaptureMeta(doc, pageNumber, dpi)
  return dataUrl
}

export type PageRenderCaptureInfo = {
  dataUrl: string
  sourcePageWidthPt: number
  sourcePageHeightPt: number
  viewportScale: number
  /** Crop export canvas’ı PDF viewport pikseli; CSS DPR uygulanmaz → 1 */
  devicePixelRatio: number
  pageWidthPx: number
  pageHeightPx: number
  pixelsPerPdfPoint: number
}

export async function renderPageWithCaptureMeta(
  doc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  dpi: number = DEFAULT_PDF_RENDER_DPI,
): Promise<PageRenderCaptureInfo> {
  const page = await doc.getPage(pageNumber)
  const baseViewport = page.getViewport({ scale: 1 })
  const viewportScale = dpi / 72
  const viewport = page.getViewport({ scale: viewportScale })
  const devicePixelRatio = 1

  const canvas = document.createElement('canvas')
  const pageWidthPx = Math.floor(viewport.width)
  const pageHeightPx = Math.floor(viewport.height)
  canvas.width = pageWidthPx
  canvas.height = pageHeightPx
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2d context unavailable')

  await page.render({
    canvas,
    canvasContext: ctx,
    viewport,
    intent: dpi >= 300 ? 'print' : 'display',
  }).promise

  return {
    dataUrl: canvas.toDataURL('image/png'),
    sourcePageWidthPt: baseViewport.width,
    sourcePageHeightPt: baseViewport.height,
    viewportScale,
    devicePixelRatio,
    pageWidthPx,
    pageHeightPx,
    pixelsPerPdfPoint: viewportScale * devicePixelRatio,
  }
}

/**
 * Görselden normalize rect (0..1) ile crop alanını kesip base64 PNG döndür.
 * @param img - HTMLImageElement veya data URL
 * @param norm - { x, y, width, height } 0..1
 */
function cropImageElementToBase64(
  imageEl: HTMLImageElement,
  norm: { x: number; y: number; width: number; height: number }
): string {
  const w = imageEl.naturalWidth;
  const h = imageEl.naturalHeight;
  if (w <= 0 || h <= 0) throw new Error("Invalid image dimensions");

  const sx = Math.floor(norm.x * w);
  const sy = Math.floor(norm.y * h);
  const sw = Math.max(1, Math.floor(norm.width * w));
  const sh = Math.max(1, Math.floor(norm.height * h));

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d context unavailable");

  ctx.drawImage(imageEl, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas.toDataURL("image/png");
}

export async function cropImageToBase64(
  img: HTMLImageElement | string,
  norm: { x: number; y: number; width: number; height: number }
): Promise<string> {
  if (typeof img !== "string") {
    return cropImageElementToBase64(img, norm);
  }

  const imageEl = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = img;
  });

  return cropImageElementToBase64(imageEl, norm);
}
