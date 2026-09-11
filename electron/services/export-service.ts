import * as questionStore from './question-store.js'
import {
  computeLayoutFromPayload,
  getImageSizeFromBase64,
} from './layout-engine.js'
import { parseCapture } from './question-native-size.js'
import { exportPdfFromPayload } from './pdf-export-renderer.js'

export { computeLayoutFromPayload } from './layout-engine.js'

/** Soru görsellerini store'dan layout/export payload'ına ekle */
export function enrichExportPayload(payload: Record<string, unknown>): Record<string, unknown> {
  if (payload.skip_images) return payload
  const questions = (payload.questions as Array<Record<string, unknown>>) ?? []
  return {
    ...payload,
    questions: questions.map((q) => {
      if (q.image_base64) return q
      const id = String(q.id ?? '')
      if (!id) return q
      try {
        return { ...q, image_base64: questionStore.getImageBase64(id) }
      } catch {
        return q
      }
    }),
  }
}

/**
 * Önizleme layout: base64 taşıma / IPC şişirme yok — yalnızca boyut (px).
 * 100+ soruda layout yanıtı ve istek megabaytlarca küçülür.
 */
export function enrichLayoutSizingOnly(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const questions = (payload.questions as Array<Record<string, unknown>>) ?? []
  return {
    ...payload,
    skip_images: true,
    questions: questions.map((q) => {
      const id = String(q.id ?? '')
      const payloadB64 =
        typeof q.image_base64 === 'string' ? q.image_base64 : ''
      const { image_base64: _drop, ...rest } = q
      void _drop
      let w = Number(q.image_width_px)
      let h = Number(q.image_height_px)
      if (!(w > 0 && h > 0)) {
        const cap = parseCapture(q)
        if (cap && cap.cropWidthPx > 0 && cap.cropHeightPx > 0) {
          w = cap.cropWidthPx
          h = cap.cropHeightPx
        }
      }
      if (!(w > 0 && h > 0) && id) {
        try {
          const b64 = payloadB64 || questionStore.getImageBase64(id)
          const size = b64 ? getImageSizeFromBase64(b64) : null
          if (size && size.w > 0 && size.h > 0) {
            w = size.w
            h = size.h
          }
        } catch {
          /* boş / eksik */
        }
      }
      return {
        ...rest,
        image_width_px: w > 0 ? w : undefined,
        image_height_px: h > 0 ? h : undefined,
      }
    }),
  }
}

export function computeLayout(payload: Record<string, unknown>) {
  return computeLayoutFromPayload(enrichLayoutSizingOnly(payload))
}

export async function exportPdf(
  payload: Record<string, unknown>,
): Promise<{ bytes: Uint8Array; diagnostics: import('./pdf-export-renderer.js').PdfExportDiagnostics }> {
  const exportId = String(payload.exportId ?? `exp_${Date.now()}`)
  console.error('[PDF_EXPORT:SERVICE]', {
    exportId,
    file: 'electron/services/export-service.ts',
    fn: 'exportPdf',
  })
  const enriched = enrichExportPayload({ ...payload, exportId })
  return exportPdfFromPayload(enriched)
}
