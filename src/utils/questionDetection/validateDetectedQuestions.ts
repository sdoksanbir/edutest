import { QD_CONFIG } from './questionDetectionConfig'
import type { DetectedQuestion } from './questionDetectionTypes'

/** Resolve vertical overlaps within a column; drop rejected. */
export function validateDetectedQuestions(questions: DetectedQuestion[]): DetectedQuestion[] {
  const byCol = new Map<number, DetectedQuestion[]>()
  for (const q of questions) {
    if (q.status === 'rejected') continue
    const list = byCol.get(q.columnIndex) ?? []
    list.push(q)
    byCol.set(q.columnIndex, list)
  }

  const out: DetectedQuestion[] = []
  for (const [, list] of byCol) {
    list.sort((a, b) => a.y - b.y)
    for (let i = 0; i < list.length; i++) {
      const q = { ...list[i]! }
      if (i > 0) {
        const prev = out.filter((o) => o.columnIndex === q.columnIndex).at(-1)
        if (prev) {
          const prevBottom = prev.y + prev.height
          if (q.y < prevBottom - QD_CONFIG.maxOverlapFrac * 0.5) {
            // Shrink previous bottom / push current top
            const mid = (prevBottom + q.y) / 2
            prev.height = Math.max(0.03, mid - prev.y - 0.002)
            q.y = mid + 0.002
            q.height = Math.max(0.03, q.y + q.height - q.y)
            if (q.finalConfidence > QD_CONFIG.reviewMin) {
              q.status = 'review'
              q.finalConfidence = Math.min(q.finalConfidence, 0.78)
            }
          }
        }
      }
      out.push(q)
    }
  }

  return out.sort((a, b) =>
    a.columnIndex !== b.columnIndex ? a.columnIndex - b.columnIndex : a.y - b.y,
  )
}
