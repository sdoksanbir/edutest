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


/** public/pdfjs asset folder URL with trailing slash (absolute for worker fetch). */
function pdfjsAssetDirUrl(subdir: string): string {
  const base = import.meta.env.BASE_URL || "./"
  const clean = subdir.replace(/^\/+/, "").replace(/\/+$/, "")
  const path = `${base}pdfjs/${clean}/`
  if (typeof window === "undefined") return path
  return new URL(path, window.location.href).href
}

function pdfjsDocumentOptions(data: ArrayBuffer) {
  return {
    data,
    // Required for JPEG2000 (OpenJPEG) / JBIG2 decode
    wasmUrl: pdfjsAssetDirUrl("wasm"),
    cMapUrl: pdfjsAssetDirUrl("cmaps"),
    cMapPacked: true,
    standardFontDataUrl: pdfjsAssetDirUrl("standard_fonts"),
    useSystemFonts: true,
  }
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
  const loadingTask = pdfjsLib.getDocument(pdfjsDocumentOptions(data));
  const doc = await loadingTask.promise;
  return { doc, pageCount: doc.numPages, filename: "document.pdf" };
}

/**
 * Editöre eklenen kırpma bitmap yoğunluğu (baskı kalitesi).
 * Layout-engine LEGACY_LAYOUT_ZOOM (600/72) ile uyumlu; capture.viewportScale taşır.
 * Not: 720+ tam sayfa PNG dataURL bellek taşması / Image yükleme hatasına yol açabiliyor.
 */
export const CROP_EXPORT_DPI = 600

/**
 * Crop ekranı önizlemesi — düşük DPI (bellek / açılış).
 * Kırpma kalitesi CROP_EXPORT_DPI ile ayrı üretilir.
 */
export const CROP_PREVIEW_DPI = 144

/** Varsayılan render yoğunluğu — kırpma/export ile aynı. */
export const DEFAULT_PDF_RENDER_DPI = CROP_EXPORT_DPI

/** Tek canvas için güvenli üst sınır (~A4 @ 600 DPI ≈ 35M; 720 ≈ 50M riskli). */
const MAX_PAGE_CANVAS_PIXELS = 36_000_000

function clampDpiForPage(pageWidthPt: number, pageHeightPt: number, dpi: number): number {
  const safe = Number.isFinite(dpi) && dpi > 0 ? dpi : DEFAULT_PDF_RENDER_DPI
  const scale = safe / 72
  const area = pageWidthPt * scale * pageHeightPt * scale
  if (!(area > MAX_PAGE_CANVAS_PIXELS)) return safe
  const factor = Math.sqrt(MAX_PAGE_CANVAS_PIXELS / area)
  return Math.max(CROP_PREVIEW_DPI, Math.floor(safe * factor))
}

function canvasToPngDataUrl(canvas: HTMLCanvasElement): string {
  try {
    const url = canvas.toDataURL("image/png")
    if (!url || url.length < 32) throw new Error("empty")
    return url
  } catch {
    throw new Error("Sayfa görüntüsü oluşturulamadı (bellek veya canvas limiti). Daha küçük bir alan deneyin.")
  }
}

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

type PageCanvasRender = Omit<PageRenderCaptureInfo, "dataUrl"> & {
  canvas: HTMLCanvasElement
}

async function renderPageToCanvas(
  doc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  dpi: number = DEFAULT_PDF_RENDER_DPI,
): Promise<PageCanvasRender> {
  const page = await doc.getPage(pageNumber)
  const baseViewport = page.getViewport({ scale: 1 })
  const safeDpi = clampDpiForPage(baseViewport.width, baseViewport.height, dpi)
  const viewportScale = safeDpi / 72
  const viewport = page.getViewport({ scale: viewportScale })
  const devicePixelRatio = 1

  const canvas = document.createElement("canvas")
  const pageWidthPx = Math.max(1, Math.floor(viewport.width))
  const pageHeightPx = Math.max(1, Math.floor(viewport.height))
  canvas.width = pageWidthPx
  canvas.height = pageHeightPx
  if (canvas.width !== pageWidthPx || canvas.height !== pageHeightPx) {
    throw new Error("PDF sayfası çok büyük; tarayıcı canvas limiti aşıldı.")
  }
  const ctx = canvas.getContext("2d", { alpha: false })
  if (!ctx) throw new Error("Canvas 2d context unavailable")

  // PDF şeffaf olabilir; beyaz zemin olmadan boş / bozuk görünür
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, pageWidthPx, pageHeightPx)

  // pdf.js 6: canvas parametresi yeterli; canvasContext ile birlikte vermeyin
  await page.render({
    canvas,
    viewport,
    intent: safeDpi >= 300 ? "print" : "display",
  }).promise

  return {
    canvas,
    sourcePageWidthPt: baseViewport.width,
    sourcePageHeightPt: baseViewport.height,
    viewportScale,
    devicePixelRatio,
    pageWidthPx,
    pageHeightPx,
    pixelsPerPdfPoint: viewportScale * devicePixelRatio,
  }
}

export async function renderPageWithCaptureMeta(
  doc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  dpi: number = DEFAULT_PDF_RENDER_DPI,
): Promise<PageRenderCaptureInfo> {
  const rendered = await renderPageToCanvas(doc, pageNumber, dpi)
  const dataUrl = canvasToPngDataUrl(rendered.canvas)
  return {
    dataUrl,
    sourcePageWidthPt: rendered.sourcePageWidthPt,
    sourcePageHeightPt: rendered.sourcePageHeightPt,
    viewportScale: rendered.viewportScale,
    devicePixelRatio: rendered.devicePixelRatio,
    pageWidthPx: rendered.pageWidthPx,
    pageHeightPx: rendered.pageHeightPx,
    pixelsPerPdfPoint: rendered.pixelsPerPdfPoint,
  }
}

export type PdfCropRenderResult = {
  /** data:image/png;base64,... */
  dataUrl: string
  /** virgülden sonraki ham base64 */
  imageBase64: string
  sourcePageWidthPt: number
  sourcePageHeightPt: number
  viewportScale: number
  devicePixelRatio: number
  pageWidthPx: number
  pageHeightPx: number
  pixelsPerPdfPoint: number
  cropWidthPx: number
  cropHeightPx: number
}

/**
 * PDF sayfasını render edip normalize crop’u aynı canvas’tan keser.
 * Tam sayfa dataURL → Image yükleme döngüsünü atlar (OOM / “Soru eklenemedi” önler).
 */
export async function renderPdfCropToBase64(
  doc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  norm: { x: number; y: number; width: number; height: number },
  dpi: number = DEFAULT_PDF_RENDER_DPI,
): Promise<PdfCropRenderResult> {
  const rendered = await renderPageToCanvas(doc, pageNumber, dpi)
  const { canvas: pageCanvas, pageWidthPx, pageHeightPx } = rendered

  const sx = Math.floor(norm.x * pageWidthPx)
  const sy = Math.floor(norm.y * pageHeightPx)
  const sw = Math.max(1, Math.floor(norm.width * pageWidthPx))
  const sh = Math.max(1, Math.floor(norm.height * pageHeightPx))

  const cropCanvas = document.createElement("canvas")
  cropCanvas.width = sw
  cropCanvas.height = sh
  const ctx = cropCanvas.getContext("2d", { alpha: false })
  if (!ctx) throw new Error("Canvas 2d context unavailable")
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, sw, sh)
  ctx.drawImage(pageCanvas, sx, sy, sw, sh, 0, 0, sw, sh)

  const dataUrl = canvasToPngDataUrl(cropCanvas)
  const imageBase64 = dataUrl.includes(",") ? dataUrl.split(",", 2)[1]! : dataUrl

  return {
    dataUrl,
    imageBase64,
    sourcePageWidthPt: rendered.sourcePageWidthPt,
    sourcePageHeightPt: rendered.sourcePageHeightPt,
    viewportScale: rendered.viewportScale,
    devicePixelRatio: rendered.devicePixelRatio,
    pageWidthPx,
    pageHeightPx,
    pixelsPerPdfPoint: rendered.pixelsPerPdfPoint,
    cropWidthPx: sw,
    cropHeightPx: sh,
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
  return canvasToPngDataUrl(canvas);
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
    el.onerror = () => reject(new Error("Kırpma kaynağı yüklenemedi"));
    el.src = img;
  });

  return cropImageElementToBase64(imageEl, norm);
}
