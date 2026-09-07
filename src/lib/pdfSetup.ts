import { GlobalWorkerOptions, getDocument as pdfGetDocument } from "pdfjs-dist"
import type { DocumentInitParameters, TypedArray } from "pdfjs-dist/types/src/display/api"
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url"

GlobalWorkerOptions.workerSrc = pdfjsWorker

/** public/pdfjs asset folder URL with trailing slash (absolute for worker fetch). */
function pdfjsAssetDirUrl(subdir: string): string {
  const base = import.meta.env.BASE_URL || "./"
  const clean = subdir.replace(/^\//, "").replace(/\/$/, "")
  const path = `${base}pdfjs/${clean}/`
  if (typeof window === "undefined") return path
  return new URL(path, window.location.href).href
}

export function getDocument(
  src:
    | DocumentInitParameters
    | string
    | URL
    | TypedArray
    | ArrayBuffer,
) {
  const assetOpts: Partial<DocumentInitParameters> = {
    wasmUrl: pdfjsAssetDirUrl("wasm"),
    cMapUrl: pdfjsAssetDirUrl("cmaps"),
    cMapPacked: true,
    standardFontDataUrl: pdfjsAssetDirUrl("standard_fonts"),
    useSystemFonts: true,
  }
  if (
    typeof src === "string" ||
    src instanceof URL ||
    src instanceof ArrayBuffer ||
    ArrayBuffer.isView(src)
  ) {
    return pdfGetDocument({
      ...assetOpts,
      data: src as ArrayBuffer | TypedArray,
    })
  }
  return pdfGetDocument({ ...assetOpts, ...src })
}

/** PDF varsayılan 72 DPI; ~300 DPI eşdeğeri icin ölçek */
export const PDF_RENDER_SCALE = 300 / 72
