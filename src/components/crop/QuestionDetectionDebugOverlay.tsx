import { useMemo, useState } from 'react'
import { QD_CONFIG } from '../../utils/questionDetection/questionDetectionConfig'
import type { QuestionDetectionDebug } from '../../utils/questionDetection/questionDetectionTypes'
import { columnNumberRoi } from '../../utils/questionDetection/inkMap'

type Props = {
  debug: QuestionDetectionDebug | null
  displayedW: number
  displayedH: number
  visible: boolean
}

type LayerKey =
  | 'content'
  | 'columns'
  | 'roi'
  | 'ocr'
  | 'geometric'
  | 'anchors'
  | 'questions'

const DEFAULT_LAYERS: Record<LayerKey, boolean> = {
  content: true,
  columns: true,
  roi: true,
  ocr: true,
  geometric: false,
  anchors: true,
  questions: true,
}

/** DEV-only overlay with per-layer toggles. */
export default function QuestionDetectionDebugOverlay({
  debug,
  displayedW,
  displayedH,
  visible,
}: Props) {
  const [layers, setLayers] = useState(DEFAULT_LAYERS)

  const rois = useMemo(() => {
    if (!debug) return []
    // Overlay uses stored rois when present; else approximate from columns
    const stored = (debug as QuestionDetectionDebug & {
      numberRois?: Array<{ columnIndex: number; x0: number; x1: number }>
    }).numberRois
    if (stored?.length) return stored
    return debug.page.columns.map((c) => {
      const r = columnNumberRoi(c, QD_CONFIG.questionNumberRoiRatio)
      return { columnIndex: c.index, ...r }
    })
  }, [debug])

  if (!visible || !debug) return null
  const aw = debug.page.analyzeWidth
  const ah = debug.page.analyzeHeight
  const sx = displayedW / Math.max(1, aw)
  const sy = displayedH / Math.max(1, ah)

  const toggle = (key: LayerKey) =>
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <>
      <div
        className="pointer-events-auto absolute right-2 top-2 z-[60] flex max-w-[11rem] flex-col gap-0.5 rounded border border-amber-500/50 bg-slate-900/90 p-2 text-[10px] text-amber-50 shadow-lg"
        style={{ fontFamily: 'ui-monospace, monospace' }}
      >
        <div className="mb-1 font-semibold text-amber-200">QD layers</div>
        {(
          [
            ['content', 'Content area'],
            ['columns', 'Columns'],
            ['roi', 'Anchor search ROI'],
            ['ocr', 'OCR candidates'],
            ['geometric', 'Geometric candidates'],
            ['anchors', 'Accepted anchors'],
            ['questions', 'Final questions'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={layers[key]}
              onChange={() => toggle(key)}
              className="accent-amber-400"
            />
            {label}
          </label>
        ))}
      </div>

      <div
        className="pointer-events-none absolute left-0 top-0 z-50 overflow-visible"
        style={{ width: displayedW, height: displayedH }}
        aria-hidden
      >
        {layers.content ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: debug.page.contentTop * sy,
              width: displayedW,
              height: (debug.page.contentBottom - debug.page.contentTop) * sy,
              border: '2px dashed rgba(34,197,94,0.85)',
              boxSizing: 'border-box',
            }}
          />
        ) : null}

        {layers.columns
          ? debug.page.columns.map((c) => (
              <div
                key={`col-${c.index}`}
                style={{
                  position: 'absolute',
                  left: c.x * sx,
                  top: debug.page.contentTop * sy,
                  width: c.width * sx,
                  height: (debug.page.contentBottom - debug.page.contentTop) * sy,
                  border: '1px solid rgba(59,130,246,0.7)',
                  boxSizing: 'border-box',
                  background: 'rgba(59,130,246,0.04)',
                }}
              />
            ))
          : null}

        {layers.roi
          ? rois.map((r) => (
              <div
                key={`roi-${r.columnIndex}`}
                style={{
                  position: 'absolute',
                  left: r.x0 * sx,
                  top: debug.page.contentTop * sy,
                  width: Math.max(2, (r.x1 - r.x0 + 1) * sx),
                  height: (debug.page.contentBottom - debug.page.contentTop) * sy,
                  border: '2px solid rgba(236,72,153,0.9)',
                  boxSizing: 'border-box',
                  background: 'rgba(236,72,153,0.12)',
                }}
                title={`Number ROI col ${r.columnIndex}`}
              />
            ))
          : null}

        {layers.ocr
          ? (debug.ocrCandidates as Array<{ x: number; y: number; width: number; height: number; accepted?: boolean; text?: string }>).map(
              (c, i) => (
                <div
                  key={`ocr-${i}`}
                  style={{
                    position: 'absolute',
                    left: c.x * sx,
                    top: c.y * sy,
                    width: Math.max(4, c.width * sx),
                    height: Math.max(4, c.height * sy),
                    border: `1px solid ${c.accepted ? 'rgba(168,85,247,0.95)' : 'rgba(168,85,247,0.35)'}`,
                    boxSizing: 'border-box',
                    background: c.accepted ? 'rgba(168,85,247,0.25)' : 'transparent',
                  }}
                  title={c.text}
                />
              ),
            )
          : null}

        {layers.geometric
          ? (debug.geometricCandidates as Array<{ x: number; y: number; width: number; height: number; accepted?: boolean }>).map(
              (c, i) => (
                <div
                  key={`geo-${i}`}
                  style={{
                    position: 'absolute',
                    left: c.x * sx,
                    top: c.y * sy,
                    width: Math.max(4, c.width * sx),
                    height: Math.max(4, c.height * sy),
                    border: `1px solid ${c.accepted ? 'rgba(14,165,233,0.95)' : 'rgba(14,165,233,0.3)'}`,
                    boxSizing: 'border-box',
                  }}
                />
              ),
            )
          : null}

        {layers.anchors
          ? debug.anchors.map((a, i) => (
              <div
                key={`anc-${i}`}
                style={{
                  position: 'absolute',
                  left: a.x * sx,
                  top: a.y * sy,
                  width: Math.max(6, a.width * sx),
                  height: Math.max(6, a.height * sy),
                  border: '2px solid rgba(234,179,8,0.95)',
                  boxSizing: 'border-box',
                  background: 'rgba(234,179,8,0.35)',
                }}
                title={`#${a.number ?? '?'} ${a.source}`}
              />
            ))
          : null}

        {layers.questions
          ? debug.questions
              .filter((q) => q.status !== 'rejected')
              .map((q, i) => (
                <div
                  key={`q-${i}`}
                  style={{
                    position: 'absolute',
                    left: q.x * displayedW,
                    top: q.y * displayedH,
                    width: q.width * displayedW,
                    height: q.height * displayedH,
                    border: `2px solid ${
                      q.status === 'accepted' ? 'rgba(16,185,129,0.9)' : 'rgba(249,115,22,0.9)'
                    }`,
                    boxSizing: 'border-box',
                  }}
                />
              ))
          : null}
      </div>
    </>
  )
}
