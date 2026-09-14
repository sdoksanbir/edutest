import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { balanceDocumentImageRgba } from '../../utils/balanceDocumentImage'
import { plainTextToCanvasSync } from '../../utils/plainTextPreviewCanvas'
import { suggestFontPxFromSelection } from '../../utils/questionImageFontEstimate'

type ToolMode = 'none' | 'eraser' | 'text' | 'choices'

type ChoiceRect = {
  id: string
  label: string
  x: number
  y: number
  w: number
  h: number
}

type BankQuestionImageEditorProps = {
  imageSrc: string
  questionId: string
  removeBackground: boolean
  /** Mevcut cevap anahtarı (A–E); şık yeri değişince güncellenir */
  answerKey?: string
  disabled?: boolean
  onSaved: (payload: {
    imageDataUrl: string
    remove_background: boolean
    answer_key?: string
  }) => void | Promise<void>
  onAnswerKeyChange?: (answerKey: string) => void
}

const ERASER_SIZE_MIN = 8
const ERASER_SIZE_MAX = 80
const ERASER_SIZE_DEFAULT = 24
const REMOVE_BG_THRESHOLD = 220
const CHOICE_LABELS = ['A', 'B', 'C', 'D', 'E'] as const

const ERASER_CURSOR =
  "url('data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e293b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20H7L3 16a2 2 0 0 1 0-2.83l11.17-11.17a2 2 0 0 1 2.83 0L20 10"/><rect x="2" y="14" width="6" height="6" rx="1"/></svg>',
  ) +
  "') 4 20, crosshair"

function toCanvasPoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  const sx = canvas.width / Math.max(1, rect.width)
  const sy = canvas.height / Math.max(1, rect.height)
  return {
    x: (clientX - rect.left) * sx,
    y: (clientY - rect.top) * sy,
  }
}

/**
 * Şık kutularını en geniş / en yüksek seçime göre eşitler.
 * Her kutunun kendi yatay ve dikey merkezi korunur.
 * Sağa/alta sığmazsa kalan alan kullanılır.
 */
function normalizeChoiceSelections(
  list: ChoiceRect[],
  canvasWidth: number,
  canvasHeight: number,
): ChoiceRect[] {
  if (list.length === 0) return list
  const maxW = Math.max(...list.map((c) => c.w))
  const maxH = Math.max(...list.map((c) => c.h))

  return list.map((c) => {
    const centerX = c.x + c.w / 2
    const centerY = c.y + c.h / 2

    let w = maxW
    let x = Math.round(centerX - w / 2)
    if (x < 0) x = 0
    if (x + w > canvasWidth) {
      w = Math.max(1, canvasWidth - x)
    }

    let h = maxH
    let y = Math.round(centerY - h / 2)
    if (y < 0) y = 0
    if (y + h > canvasHeight) {
      h = Math.max(1, canvasHeight - y)
    }

    return {
      ...c,
      x: Math.round(x),
      y: Math.round(y),
      w: Math.round(w),
      h: Math.round(h),
    }
  })
}

/**
 * Soru bankası önizlemesinde silgi / arka plan / yazı / şık yer değiştirme.
 */
export default function BankQuestionImageEditor({
  imageSrc,
  questionId,
  removeBackground,
  answerKey = '',
  disabled,
  onSaved,
  onAnswerKeyChange,
}: BankQuestionImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [displaySize, setDisplaySize] = useState({ w: 480, h: 360 })
  const [tool, setTool] = useState<ToolMode>('none')
  const [eraserSize, setEraserSize] = useState(ERASER_SIZE_DEFAULT)
  const [isDrawing, setIsDrawing] = useState(false)
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)
  const [dragRect, setDragRect] = useState<{
    x0: number
    y0: number
    x: number
    y: number
  } | null>(null)
  const [choices, setChoices] = useState<ChoiceRect[]>([])
  const [choiceOrder, setChoiceOrder] = useState<number[]>([])
  const [textDraft, setTextDraft] = useState<{
    x: number
    y: number
    w: number
    h: number
  } | null>(null)
  const [textValue, setTextValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [bgRemoved, setBgRemoved] = useState(removeBackground)
  const [localAnswerKey, setLocalAnswerKey] = useState(answerKey.trim().toUpperCase())
  const undoRef = useRef<string | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  useEffect(() => {
    setBgRemoved(removeBackground)
  }, [removeBackground, questionId])

  useEffect(() => {
    setLocalAnswerKey(answerKey.trim().toUpperCase())
  }, [answerKey, questionId])

  useEffect(() => {
    setTool('none')
    setChoices([])
    setChoiceOrder([])
    setTextDraft(null)
    setDirty(false)
    setCanUndo(false)
    undoRef.current = null
    setHint(null)
    setImageLoaded(false)
  }, [questionId, imageSrc])

  useEffect(() => {
    if (!imageSrc) return
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const w = img.naturalWidth || img.width
      const h = img.naturalHeight || img.height
      canvas.width = w
      canvas.height = h
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0)
      const maxW = Math.min(720, window.innerWidth * 0.72)
      const scale = Math.min(1, maxW / Math.max(1, w))
      setDisplaySize({ w: Math.round(w * scale), h: Math.round(h * scale) })
      setImageLoaded(true)
    }
    img.onerror = () => {
      if (!cancelled) setImageLoaded(false)
    }
    img.src = imageSrc
    return () => {
      cancelled = true
    }
  }, [imageSrc, questionId])

  const snapshotUndo = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      undoRef.current = canvas.toDataURL('image/png')
      setCanUndo(true)
    } catch {
      /* ignore */
    }
  }

  const markDirty = () => setDirty(true)

  const eraseAt = useCallback(
    (x: number, y: number) => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return
      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(x, y, eraserSize / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    },
    [eraserSize],
  )

  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!imageLoaded || disabled || busy) return
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)
    const pt = toCanvasPoint(canvas, e.clientX, e.clientY)

    if (tool === 'eraser') {
      snapshotUndo()
      setIsDrawing(true)
      lastPosRef.current = pt
      eraseAt(pt.x, pt.y)
      markDirty()
      return
    }

    if (tool === 'text' || tool === 'choices') {
      setDragRect({ x0: pt.x, y0: pt.y, x: pt.x, y: pt.y })
    }
  }

  const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const pt = toCanvasPoint(canvas, e.clientX, e.clientY)

    if (tool === 'eraser' && isDrawing) {
      const ctx = canvas.getContext('2d')
      const last = lastPosRef.current
      if (ctx && last) {
        ctx.save()
        ctx.globalCompositeOperation = 'destination-out'
        ctx.lineWidth = eraserSize
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(last.x, last.y)
        ctx.lineTo(pt.x, pt.y)
        ctx.stroke()
        ctx.restore()
      }
      lastPosRef.current = pt
      return
    }

    if (dragRect && (tool === 'text' || tool === 'choices')) {
      setDragRect({ ...dragRect, x: pt.x, y: pt.y })
    }
  }

  const handlePointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }

    if (tool === 'eraser') {
      setIsDrawing(false)
      lastPosRef.current = null
      return
    }

    if (!dragRect) return
    const x = Math.min(dragRect.x0, dragRect.x)
    const y = Math.min(dragRect.y0, dragRect.y)
    const w = Math.abs(dragRect.x - dragRect.x0)
    const h = Math.abs(dragRect.y - dragRect.y0)
    setDragRect(null)

    if (w < 8 || h < 8) return

    if (tool === 'text') {
      setTextDraft({ x, y, w, h })
      setTextValue('')
      return
    }

    if (tool === 'choices') {
      if (choices.length >= CHOICE_LABELS.length) {
        setHint(`En fazla ${CHOICE_LABELS.length} şık seçebilirsiniz.`)
        return
      }
      const label = CHOICE_LABELS[choices.length]!
      const next: ChoiceRect = {
        id: crypto.randomUUID(),
        label,
        x: Math.round(x),
        y: Math.round(y),
        w: Math.round(w),
        h: Math.round(h),
      }
      const canvasW = canvasRef.current?.width ?? Number.MAX_SAFE_INTEGER
      const canvasH = canvasRef.current?.height ?? Number.MAX_SAFE_INTEGER
      const nextList = normalizeChoiceSelections([...choices, next], canvasW, canvasH)
      setChoices(nextList)
      setChoiceOrder(nextList.map((_, i) => i))
      setHint(`${label} şıkkı seçildi. Genişlik ve yükseklik eşitlendi; merkezler korundu.`)
    }
  }

  const applyText = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !textDraft || !textValue.trim()) {
      setTextDraft(null)
      return
    }
    snapshotUndo()
    const fontPx = suggestFontPxFromSelection(canvas, textDraft)
    const textCanvas = plainTextToCanvasSync(textValue.trim(), fontPx, textDraft.w)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(textDraft.x, textDraft.y, textDraft.w, textDraft.h)
    ctx.drawImage(textCanvas, textDraft.x, textDraft.y)
    setTextDraft(null)
    setTextValue('')
    markDirty()
  }

  const moveChoice = (index: number, dir: -1 | 1) => {
    const next = [...choiceOrder]
    const j = index + dir
    if (j < 0 || j >= next.length) return
    ;[next[index], next[j]] = [next[j]!, next[index]!]
    setChoiceOrder(next)
  }

  const applyChoiceOrder = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || choices.length < 2) {
      setHint('En az 2 şık seçin.')
      return
    }
    const normalized = normalizeChoiceSelections(choices, canvas.width, canvas.height)
    if (normalized !== choices) {
      setChoices(normalized)
    }
    const identity = choiceOrder.every((v, i) => v === i)
    if (identity) {
      setHint('Sıra değişmedi. Genişlik/yükseklik eşitlendi; merkezler korundu.')
      return
    }

    // Cevap anahtarı: eski şık içeriğinin gittiği yeni slota taşı
    const oldAns = localAnswerKey.trim().toUpperCase()
    let remappedAnswer = localAnswerKey
    if (oldAns) {
      const oldIdx = normalized.findIndex((c) => c.label.toUpperCase() === oldAns)
      if (oldIdx >= 0) {
        const newSlot = choiceOrder.findIndex((src) => src === oldIdx)
        if (newSlot >= 0) {
          remappedAnswer = CHOICE_LABELS[newSlot] ?? oldAns
        }
      }
    }

    snapshotUndo()
    const snaps = normalized.map((c) => ctx.getImageData(c.x, c.y, c.w, c.h))
    for (const c of normalized) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(c.x, c.y, c.w, c.h)
    }
    for (let slot = 0; slot < normalized.length; slot++) {
      const srcIdx = choiceOrder[slot]!
      const target = normalized[slot]!
      const snap = snaps[srcIdx]!
      const tmp = document.createElement('canvas')
      tmp.width = snap.width
      tmp.height = snap.height
      const tctx = tmp.getContext('2d')
      if (!tctx) continue
      tctx.putImageData(snap, 0, 0)
      ctx.drawImage(tmp, 0, 0, snap.width, snap.height, target.x, target.y, target.w, target.h)
    }
    setChoices(
      normalized.map((c, i) => ({ ...c, label: CHOICE_LABELS[i] ?? c.label })),
    )
    setChoiceOrder(normalized.map((_, i) => i))
    if (remappedAnswer !== localAnswerKey) {
      setLocalAnswerKey(remappedAnswer)
      onAnswerKeyChange?.(remappedAnswer)
    }
    markDirty()
    setHint(
      remappedAnswer && remappedAnswer !== oldAns
        ? `Şık yerleri güncellendi. Cevap anahtarı: ${oldAns || '—'} → ${remappedAnswer}. Kaydetmeyi unutmayın.`
        : 'Şık yerleri güncellendi. Kaydetmeyi unutmayın.',
    )
  }

  const handleRemoveBackground = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !imageLoaded) return
    snapshotUndo()
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = imageData.data
    for (let i = 0; i < pixels.length; i += 4) {
      const avg = (pixels[i]! + pixels[i + 1]! + pixels[i + 2]!) / 3
      if (avg >= REMOVE_BG_THRESHOLD) pixels[i + 3] = 0
    }
    ctx.putImageData(imageData, 0, 0)
    setBgRemoved(true)
    markDirty()
  }

  const handleBalance = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !imageLoaded) return
    snapshotUndo()
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const balanced = balanceDocumentImageRgba({
      data: imageData.data,
      width: canvas.width,
      height: canvas.height,
    })
    imageData.data.set(balanced.data)
    ctx.putImageData(imageData, 0, 0)
    markDirty()
  }

  const handleUndo = () => {
    const before = undoRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!before || !canvas || !ctx) return
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      undoRef.current = null
      setCanUndo(false)
      markDirty()
    }
    img.src = before
  }

  const handleSave = async () => {
    const canvas = canvasRef.current
    if (!canvas || !imageLoaded) return
    setBusy(true)
    setHint(null)
    try {
      const dataUrl = canvas.toDataURL('image/png')
      await onSaved({
        imageDataUrl: dataUrl,
        remove_background: bgRemoved,
        answer_key: localAnswerKey,
      })
      setDirty(false)
      setHint('Görsel kaydedildi.')
    } catch (e) {
      setHint(e instanceof Error ? e.message : 'Kaydedilemedi')
    } finally {
      setBusy(false)
    }
  }

  const setAnswer = (opt: string) => {
    const next = opt.toUpperCase()
    const value = localAnswerKey === next ? '' : next
    setLocalAnswerKey(value)
    onAnswerKeyChange?.(value)
  }

  const setToolExclusive = (next: ToolMode) => {
    setTool((cur) => (cur === next ? 'none' : next))
    setDragRect(null)
    setIsDrawing(false)
    if (next !== 'choices') {
      /* keep choices so user can still reorder */
    }
    if (next !== 'text') setTextDraft(null)
  }

  const cursor =
    tool === 'eraser' ? ERASER_CURSOR : tool === 'text' || tool === 'choices' ? 'crosshair' : 'default'

  return (
    <div className="tq-bank-img-edit">
      <div className="tq-bank-img-edit__toolbar">
        <button
          type="button"
          className={`tq-bank-img-edit__btn${tool === 'text' ? ' is-active' : ''}`}
          disabled={disabled || !imageLoaded}
          onClick={() => setToolExclusive('text')}
          title="Alan seçip yazı yaz"
        >
          T Yazı
        </button>
        <button
          type="button"
          className={`tq-bank-img-edit__btn${tool === 'eraser' ? ' is-active is-eraser' : ''}`}
          disabled={disabled || !imageLoaded}
          onClick={() => setToolExclusive('eraser')}
          title="Silgi"
        >
          Silgi
        </button>
        {tool === 'eraser' ? (
          <label className="tq-bank-img-edit__size">
            Boyut
            <input
              type="range"
              min={ERASER_SIZE_MIN}
              max={ERASER_SIZE_MAX}
              value={eraserSize}
              onChange={(e) => setEraserSize(Number(e.target.value))}
            />
          </label>
        ) : null}
        <button
          type="button"
          className={`tq-bank-img-edit__btn${bgRemoved ? ' is-on' : ''}`}
          disabled={disabled || !imageLoaded}
          onClick={handleRemoveBackground}
          title="Açık arka planı şeffaf yap"
        >
          Arka planı temizle
        </button>
        <button
          type="button"
          className="tq-bank-img-edit__btn"
          disabled={disabled || !imageLoaded}
          onClick={handleBalance}
        >
          Görüntüyü dengele
        </button>
        <button
          type="button"
          className={`tq-bank-img-edit__btn${tool === 'choices' ? ' is-active' : ''}`}
          disabled={disabled || !imageLoaded}
          onClick={() => setToolExclusive('choices')}
          title="Şık bölgelerini seçip yerlerini değiştir"
        >
          Şıklar
        </button>
        <div className="tq-bank-img-edit__answer" role="group" aria-label="Cevap anahtarı">
          <span className="tq-bank-img-edit__answer-label">Cevap</span>
          {CHOICE_LABELS.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`tq-bank-img-edit__answer-chip${
                localAnswerKey === opt ? ' is-selected' : ''
              }`}
              disabled={disabled}
              onClick={() => setAnswer(opt)}
              title={`Cevabı ${opt} yap`}
            >
              {opt}
            </button>
          ))}
        </div>
        {canUndo ? (
          <button type="button" className="tq-bank-img-edit__btn" onClick={handleUndo}>
            Geri al
          </button>
        ) : null}
        <button
          type="button"
          className="tq-bank-img-edit__btn tq-bank-img-edit__btn--save"
          disabled={disabled || busy || !imageLoaded || !dirty}
          onClick={() => void handleSave()}
        >
          {busy ? 'Kaydediliyor…' : 'Görseli kaydet'}
        </button>
      </div>

      {tool === 'choices' ? (
        <div className="tq-bank-img-edit__choices">
          <p className="tq-bank-img-edit__hint">
            Her şıkkı dikdörtgenle seçin (A→E). Sonra sırayı değiştirip uygulayın.
          </p>
          {choices.length > 0 ? (
            <ul className="tq-bank-img-edit__choice-list">
              {choiceOrder.map((srcIdx, slot) => {
                const c = choices[srcIdx]
                if (!c) return null
                return (
                  <li key={c.id}>
                    <span className="tq-bank-img-edit__choice-label">
                      {CHOICE_LABELS[slot] ?? '?'} ← {c.label}
                    </span>
                    <button type="button" disabled={slot === 0} onClick={() => moveChoice(slot, -1)}>
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={slot === choiceOrder.length - 1}
                      onClick={() => moveChoice(slot, 1)}
                    >
                      ↓
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : null}
          <div className="tq-bank-img-edit__choice-actions">
            <button
              type="button"
              className="tq-bank-img-edit__btn"
              disabled={choices.length < 2}
              onClick={applyChoiceOrder}
            >
              Şık yerlerini uygula
            </button>
            <button
              type="button"
              className="tq-bank-img-edit__btn"
              onClick={() => {
                setChoices([])
                setChoiceOrder([])
              }}
            >
              Seçimleri temizle
            </button>
          </div>
        </div>
      ) : null}

      {hint ? <p className="tq-bank-img-edit__status">{hint}</p> : null}

      <div className="tq-bank-img-edit__stage">
        {!imageLoaded ? (
          <div className="tq-bank-preview-card__image-empty">Görsel yükleniyor…</div>
        ) : null}
        <div className="tq-bank-img-edit__canvas-wrap">
          <canvas
            ref={canvasRef}
            className="tq-bank-img-edit__canvas"
            style={{
              width: displaySize.w,
              height: displaySize.h,
              cursor,
              touchAction: 'none',
              opacity: imageLoaded ? 1 : 0,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
          {dragRect ? (
            <div
              className="tq-bank-img-edit__drag"
              style={{
                left: `${(Math.min(dragRect.x0, dragRect.x) / (canvasRef.current?.width || 1)) * 100}%`,
                top: `${(Math.min(dragRect.y0, dragRect.y) / (canvasRef.current?.height || 1)) * 100}%`,
                width: `${(Math.abs(dragRect.x - dragRect.x0) / (canvasRef.current?.width || 1)) * 100}%`,
                height: `${(Math.abs(dragRect.y - dragRect.y0) / (canvasRef.current?.height || 1)) * 100}%`,
              }}
            />
          ) : null}
          {choices.map((c) => (
            <div
              key={c.id}
              className="tq-bank-img-edit__choice-box"
              style={{
                left: `${(c.x / (canvasRef.current?.width || 1)) * 100}%`,
                top: `${(c.y / (canvasRef.current?.height || 1)) * 100}%`,
                width: `${(c.w / (canvasRef.current?.width || 1)) * 100}%`,
                height: `${(c.h / (canvasRef.current?.height || 1)) * 100}%`,
              }}
            >
              <span>{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {textDraft ? (
        <div className="tq-bank-img-edit__text-modal" role="dialog">
          <p className="tq-bank-img-edit__hint">Seçilen alana yazılacak metin</p>
          <textarea
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className="tq-bank-img-edit__choice-actions">
            <button type="button" className="tq-bank-img-edit__btn" onClick={() => setTextDraft(null)}>
              İptal
            </button>
            <button
              type="button"
              className="tq-bank-img-edit__btn tq-bank-img-edit__btn--save"
              disabled={!textValue.trim()}
              onClick={applyText}
            >
              Yazıyı yerleştir
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
