/**
 * Font eşitleme teşhis aşamaları — ölçek / çizim matematiğini değiştirmez.
 */

import { resolveManualScale, resolveNormalizationScale, resolveRequestedScale } from './questionScale'

export type EqualizeDiagStage =
  | 'BEFORE_EQUALIZE'
  | 'MEASUREMENT_COMPLETE'
  | 'STATE_COMMITTED'
  | 'LAYOUT_REFRESHED'
  | 'PDF_EXPORT'
  | 'ROUTINE_CANVAS_PREVIEW'

export type EqualizeCommittedRow = {
  questionId: string
  questionNo: number
  orderIndex: number
  detectedFontPt: number | null
  normalizationScale: number
  manualScale: number
  requestedScale: number
  measurementSource: string | null
}

let activeEqualizeRunId: string | null = null
let lastEqualizeRunId: string | null = null
let committedByOrder = new Map<number, EqualizeCommittedRow>()

export function createEqualizeRunId(): string {
  return `eq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function beginEqualizeRun(runId?: string): string {
  const id = runId ?? createEqualizeRunId()
  activeEqualizeRunId = id
  lastEqualizeRunId = id
  committedByOrder = new Map()
  return id
}

export function endEqualizeRun(): void {
  activeEqualizeRunId = null
}

export function getActiveEqualizeRunId(): string | null {
  return activeEqualizeRunId
}

/** Export / sonraki canvas: son tamamlanan veya aktif run */
export function getEqualizeRunIdForLogs(): string | null {
  return activeEqualizeRunId ?? lastEqualizeRunId
}

export function getCommittedEqualizeRows(): EqualizeCommittedRow[] {
  return [...committedByOrder.values()].sort((a, b) => a.questionNo - b.questionNo)
}

export function recordCommittedEqualizeRows(rows: EqualizeCommittedRow[]): void {
  committedByOrder = new Map(rows.map((r) => [r.orderIndex, r]))
}

export function logEqualizeStageHeader(
  stage: EqualizeDiagStage,
  equalizeRunId: string | null,
  note?: string,
): void {
  const id = equalizeRunId ?? 'none'
  console.log(
    `[ScaleDiag:${stage}] equalizeRunId=${id}` + (note ? ` | ${note}` : ''),
  )
}

export function logEqualizeStageTable(
  stage: EqualizeDiagStage,
  equalizeRunId: string | null,
  rows: Array<Record<string, unknown>>,
  note?: string,
): void {
  logEqualizeStageHeader(stage, equalizeRunId, note)
  if (rows.length === 0) {
    console.log(`[ScaleDiag:${stage}] (boş tablo) equalizeRunId=${equalizeRunId ?? 'none'}`)
    return
  }
  console.table(
    rows.map((r) => ({
      equalizeRunId: equalizeRunId ?? 'none',
      stage,
      ...r,
    })),
  )
}

/** Zustand state’ten STATE_COMMITTED satırları */
export function buildCommittedRowsFromQuestions(
  questions: Array<{
    id: string
    order_index: number
    manualScale?: number | null
    normalizationScale?: number | null
    display_scale?: number | null
    detected_font_pt?: number | null
    detected_font_px?: number | null
  }>,
  measureByOrder?: Map<
    number,
    {
      detected_font_pt?: number | null
      font_measurement_source?: string | null
    }
  >,
): EqualizeCommittedRow[] {
  return [...questions]
    .sort((a, b) => a.order_index - b.order_index)
    .map((q) => {
      const m = measureByOrder?.get(q.order_index)
      const normalizationScale = resolveNormalizationScale(q)
      const manualScale = resolveManualScale(q)
      const requestedScale = resolveRequestedScale(q)
      return {
        questionId: q.id,
        questionNo: q.order_index + 1,
        orderIndex: q.order_index,
        detectedFontPt: m?.detected_font_pt ?? null,
        normalizationScale,
        manualScale,
        requestedScale,
        measurementSource: m?.font_measurement_source ?? null,
      }
    })
}

export function checkEqualizeStateLayoutMismatch(
  equalizeRunId: string | null,
  layoutRows: Array<{
    questionNo: number
    orderIndex: number
    requestedScale: number
    normalizationScale?: number | null
    manualScale?: number | null
  }>,
): number {
  let mismatches = 0
  for (const lay of layoutRows) {
    const committed = committedByOrder.get(lay.orderIndex)
    if (!committed) continue
    const layoutReq = Number(lay.requestedScale)
    const committedNorm = committed.normalizationScale
    // Kullanıcı kuralı: STATE_COMMITTED.normalizationScale ↔ LAYOUT_REFRESHED.requestedScale
    if (Math.abs(layoutReq - committedNorm) > 0.01) {
      mismatches += 1
      console.warn(
        `EQUALIZE_STATE_LAYOUT_MISMATCH | equalizeRunId=${equalizeRunId ?? 'none'} | ` +
          `Soru ${lay.questionNo} | STATE_COMMITTED normalizationScale=${committedNorm.toFixed(4)} | ` +
          `LAYOUT_REFRESHED requestedScale=${layoutReq.toFixed(4)}`,
      )
    }
    // Eşitleme sonrası: requestedScale === normalizationScale (manualScale=1)
    const layNorm =
      lay.normalizationScale != null && Number.isFinite(Number(lay.normalizationScale))
        ? Number(lay.normalizationScale)
        : committedNorm
    if (Math.abs(layoutReq - layNorm) > 0.0001) {
      mismatches += 1
      console.warn(
        `EQUALIZE_STALE_MANUAL_SCALE | equalizeRunId=${equalizeRunId ?? 'none'} | stage=LAYOUT_REFRESHED | ` +
          `Soru ${lay.questionNo} | requestedScale=${layoutReq.toFixed(4)} | ` +
          `normalizationScale=${layNorm.toFixed(4)} | ` +
          `manualScale=${lay.manualScale ?? committed.manualScale}`,
      )
    }
  }
  if (mismatches === 0 && layoutRows.length > 0) {
    console.log(
      `[ScaleDiag:LAYOUT_REFRESHED] equalizeRunId=${equalizeRunId ?? 'none'} | ` +
        `STATE_COMMITTED ↔ LAYOUT_REFRESHED: uyum OK (EQUALIZE_STATE_LAYOUT_MISMATCH yok)`,
    )
  }
  return mismatches
}

/**
 * STATE_COMMITTED sonrası: güvenilir sorularda manualScale===1 ve
 * requestedScale === normalizationScale === display_scale
 */
export function assertEqualizeManualScaleInvariant(
  equalizeRunId: string | null,
  rows: Array<{
    questionNo: number
    questionId: string
    manualScale: number
    normalizationScale: number
    requestedScale: number
    display_scale?: number | null
    reliable?: boolean
  }>,
): number {
  let errors = 0
  for (const r of rows) {
    if (r.reliable === false) continue
    const display = r.display_scale ?? r.requestedScale
    const manualOk = Math.abs(r.manualScale - 1) <= 1e-6
    const reqOk = Math.abs(r.requestedScale - r.normalizationScale) <= 0.0001
    const displayOk = Math.abs(display - r.normalizationScale) <= 0.0001
    if (!manualOk || !reqOk || !displayOk) {
      errors += 1
      console.error(
        `EQUALIZE_STALE_MANUAL_SCALE | equalizeRunId=${equalizeRunId ?? 'none'} | stage=STATE_COMMITTED | ` +
          `Soru ${r.questionNo} (${r.questionId}) | ` +
          `manualScale=${r.manualScale} | normalizationScale=${r.normalizationScale} | ` +
          `requestedScale=${r.requestedScale} | display_scale=${display}`,
      )
    }
  }
  if (errors === 0 && rows.length > 0) {
    console.log(
      `[ScaleDiag:STATE_COMMITTED] equalizeRunId=${equalizeRunId ?? 'none'} | ` +
        `manualScale=1 invariant OK (EQUALIZE_STALE_MANUAL_SCALE yok)`,
    )
  }
  return errors
}

export { buildEqualizeCommitScaleFields } from './equalizeCommitScale'
