import * as questionStore from './question-store.js'
import { computeLayoutFromPayload } from './layout-engine.js'
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

export function computeLayout(payload: Record<string, unknown>) {
  return computeLayoutFromPayload(enrichExportPayload(payload))
}

export async function exportPdf(payload: Record<string, unknown>): Promise<Uint8Array> {
  return exportPdfFromPayload(enrichExportPayload(payload))
}
