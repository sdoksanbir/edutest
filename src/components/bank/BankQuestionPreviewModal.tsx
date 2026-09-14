import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useEditorStore } from '../../store/editorStore'
import type { BankQuestionItem, BankSettings, PdfFolder, QuestionDifficulty } from '../../types'
import {
  BANK_NO_TOPIC_LABEL,
  bankQuestionToQuestionItem,
  mergeKonuOptions,
  updateBankQuestionKonu,
  ensureKonuAndFolder,
} from '../../utils/bankQuestionUtils'
import {
  QUESTION_DIFFICULTIES,
  QUESTION_DIFFICULTY_LABEL,
} from '../../utils/questionDifficulty'
import BankQuestionImageEditor from './BankQuestionImageEditor'

type BankQuestionPreviewModalProps = {
  questions: BankQuestionItem[]
  initialId: string
  thumbs: Record<string, string>
  onClose: () => void
  onUpdated: (item: BankQuestionItem) => void
  onImageUpdated?: (id: string, dataUrl: string) => void
  /** Konu klasörü oluşunca gezgini yenile */
  onStructureChange?: () => void
}

export default function BankQuestionPreviewModal({
  questions,
  initialId,
  thumbs,
  onClose,
  onUpdated,
  onImageUpdated,
  onStructureChange,
}: BankQuestionPreviewModalProps) {
  const navigate = useNavigate()
  const workingCount = useEditorStore((s) => s.questions.length)
  const addQuestionsToWorkingDraft = useEditorStore((s) => s.addQuestionsToWorkingDraft)

  const [activeId, setActiveId] = useState(initialId)
  const [imageSrc, setImageSrc] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addedHint, setAddedHint] = useState<string | null>(null)
  const [newKonuOpen, setNewKonuOpen] = useState(false)
  const [newKonuName, setNewKonuName] = useState('')
  const [settings, setSettings] = useState<BankSettings | null>(null)
  const [folders, setFolders] = useState<PdfFolder[]>([])
  const [localQuestions, setLocalQuestions] = useState(questions)

  useEffect(() => {
    setLocalQuestions(questions)
  }, [questions])

  const activeIndex = useMemo(
    () => localQuestions.findIndex((q) => q.id === activeId),
    [localQuestions, activeId],
  )
  const active =
    localQuestions[activeIndex] ?? localQuestions.find((q) => q.id === activeId) ?? null

  const [konu, setKonu] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | null>(null)
  const [answerKey, setAnswerKey] = useState('')

  useEffect(() => {
    setActiveId(initialId)
  }, [initialId])

  useEffect(() => {
    void (async () => {
      try {
        const [{ settings: s }, { folders: f }] = await Promise.all([
          api.bankQuestions.getSettings(),
          api.pdfs.folders.list(),
        ])
        setSettings(s)
        setFolders(f)
      } catch {
        /* ignore */
      }
    })()
  }, [])

  useEffect(() => {
    if (!active) return
    setKonu(active.konu)
    setDifficulty(active.difficulty)
    setAnswerKey((active.answer_key || '').trim().toUpperCase())
    setError(null)
    setAddedHint(null)
    setNewKonuOpen(false)
    setNewKonuName('')
  }, [active?.id, active?.konu, active?.difficulty, active?.answer_key])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!active) {
        setImageSrc('')
        return
      }
      const cached = thumbs[active.id]
      if (cached) {
        setImageSrc(cached)
        return
      }
      try {
        const url = await api.bankQuestions.getImageDataUrl(active.id)
        if (!cancelled) setImageSrc(url)
      } catch {
        if (!cancelled) setImageSrc('')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [active?.id, thumbs])

  const canPrev = activeIndex > 0
  const canNext = activeIndex >= 0 && activeIndex < localQuestions.length - 1

  const goPrev = useCallback(() => {
    if (!canPrev) return
    const prev = localQuestions[activeIndex - 1]
    if (prev) setActiveId(prev.id)
  }, [canPrev, localQuestions, activeIndex])

  const goNext = useCallback(() => {
    if (!canNext) return
    const next = localQuestions[activeIndex + 1]
    if (next) setActiveId(next.id)
  }, [canNext, localQuestions, activeIndex])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, goPrev, goNext])

  const konuOptions = useMemo(() => {
    if (!active) return []
    return mergeKonuOptions(active.ders, folders, settings?.konuByDers)
  }, [active, folders, settings])

  const saveMeta = async (patch: {
    konu?: string | null
    difficulty?: QuestionDifficulty | null
    answer_key?: string
  }) => {
    if (!active) return
    setBusy(true)
    setError(null)
    try {
      let updated: BankQuestionItem
      if ('konu' in patch) {
        updated = await updateBankQuestionKonu(active.id, active.ders, patch.konu ?? null)
        const { folders: f } = await api.pdfs.folders.list()
        setFolders(f)
        onStructureChange?.()
      } else {
        updated = await api.bankQuestions.update(active.id, patch)
      }
      onUpdated(updated)
      setLocalQuestions((prev) => {
        const idx = prev.findIndex((q) => q.id === updated.id)
        if (idx < 0) return [...prev, updated]
        return prev.map((q) => (q.id === updated.id ? updated : q))
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Güncellenemedi')
    } finally {
      setBusy(false)
    }
  }

  const handleKonuChange = async (value: string) => {
    const next = value.trim() ? value : null
    setKonu(next)
    await saveMeta({ konu: next })
  }

  const handleDifficultyChange = async (d: QuestionDifficulty | null) => {
    setDifficulty(d)
    await saveMeta({ difficulty: d })
  }

  const handleAnswerChange = async (opt: string) => {
    const next = opt.toUpperCase()
    const value = answerKey === next ? '' : next
    setAnswerKey(value)
    await saveMeta({ answer_key: value })
  }

  const submitNewKonu = async () => {
    if (!active) return
    const name = newKonuName.trim()
    if (!name) return
    setBusy(true)
    setError(null)
    try {
      await ensureKonuAndFolder(active.ders, name)
      const { settings: s } = await api.bankQuestions.getSettings()
      const { folders: f } = await api.pdfs.folders.list()
      setSettings(s)
      setFolders(f)
      const updated = await updateBankQuestionKonu(active.id, active.ders, name)
      setKonu(name)
      setLocalQuestions((prev) => {
        const idx = prev.findIndex((q) => q.id === updated.id)
        if (idx < 0) return [...prev, updated]
        return prev.map((q) => (q.id === updated.id ? updated : q))
      })
      onUpdated(updated)
      onStructureChange?.()
      setNewKonuOpen(false)
      setNewKonuName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Konu eklenemedi')
    } finally {
      setBusy(false)
    }
  }

  const handleImageSaved = async (payload: {
    imageDataUrl: string
    remove_background: boolean
    answer_key?: string
  }) => {
    if (!active) return
    const raw = payload.imageDataUrl.includes(',')
      ? payload.imageDataUrl.split(',')[1]!
      : payload.imageDataUrl
    const updated = await api.bankQuestions.update(active.id, {
      image_base64: raw,
      remove_background: payload.remove_background,
      ...(payload.answer_key !== undefined ? { answer_key: payload.answer_key } : {}),
    })
    if (payload.answer_key !== undefined) {
      setAnswerKey(payload.answer_key.trim().toUpperCase())
    }
    onUpdated(updated)
    onImageUpdated?.(active.id, payload.imageDataUrl)
    setLocalQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)))
    setImageSrc(payload.imageDataUrl)
  }

  const handleAnswerKeyFromEditor = async (next: string) => {
    const value = next.trim().toUpperCase()
    setAnswerKey(value)
    if (!active) return
    try {
      const updated = await api.bankQuestions.update(active.id, { answer_key: value })
      onUpdated(updated)
      setLocalQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cevap güncellenemedi')
    }
  }

  const addToTest = async () => {
    if (!active) return
    setBusy(true)
    setError(null)
    try {
      const dataUrl = imageSrc || (await api.bankQuestions.getImageDataUrl(active.id))
      const raw = dataUrl.includes(',') ? dataUrl.split(',')[1]! : dataUrl
      if (!raw) throw new Error('Soru görseli bulunamadı')
      const item = bankQuestionToQuestionItem(active, raw, workingCount)
      addQuestionsToWorkingDraft([item])
      setAddedHint('Teste eklendi')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Teste eklenemedi')
    } finally {
      setBusy(false)
    }
  }

  const addToTestAndGo = async () => {
    await addToTest()
    onClose()
    navigate('/')
  }

  if (!active) return null

  return createPortal(
    <div
      className="tq-bank-preview-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Soru önizleme"
      onClick={onClose}
    >
      <div
        className="tq-bank-preview-card tq-bank-preview-card--wide"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="tq-bank-preview-card__header">
          <div className="min-w-0">
            <h2 className="tq-bank-preview-card__title">
              {active.ders}
              {konu ? ` · ${konu}` : ` · ${BANK_NO_TOPIC_LABEL}`}
            </h2>
            <p className="tq-bank-preview-card__sub">
              {active.source_pdf_filename} · s.{active.page_number}
              {localQuestions.length > 0
                ? ` · ${Math.max(1, activeIndex + 1)} / ${localQuestions.length}`
                : ''}
            </p>
          </div>
          <button
            type="button"
            className="tq-bank-preview-card__close"
            onClick={onClose}
            aria-label="Kapat"
          >
            ×
          </button>
        </header>

        <div className="tq-bank-preview-card__viewer tq-bank-preview-card__viewer--edit">
          <button
            type="button"
            className="tq-bank-preview-nav tq-bank-preview-nav--prev"
            disabled={!canPrev}
            onClick={goPrev}
            aria-label="Önceki soru"
            title="Önceki (←)"
          >
            ‹
          </button>
          <div className="tq-bank-preview-card__image-wrap tq-bank-preview-card__image-wrap--edit">
            {imageSrc ? (
              <BankQuestionImageEditor
                key={active.id}
                questionId={active.id}
                imageSrc={imageSrc}
                removeBackground={active.remove_background}
                answerKey={answerKey}
                disabled={busy}
                onSaved={handleImageSaved}
                onAnswerKeyChange={(k) => void handleAnswerKeyFromEditor(k)}
              />
            ) : (
              <div className="tq-bank-preview-card__image-empty">Görsel yükleniyor…</div>
            )}
          </div>
          <button
            type="button"
            className="tq-bank-preview-nav tq-bank-preview-nav--next"
            disabled={!canNext}
            onClick={goNext}
            aria-label="Sonraki soru"
            title="Sonraki (→)"
          >
            ›
          </button>
        </div>

        <div className="tq-bank-preview-card__meta">
          <label className="tq-bank-preview-field">
            <span>Konu adı</span>
            <select
              value={konu ?? ''}
              disabled={busy}
              onChange={(e) => void handleKonuChange(e.target.value)}
            >
              <option value="">{BANK_NO_TOPIC_LABEL}</option>
              {konuOptions.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          {newKonuOpen ? (
            <div className="tq-bank-preview-new-konu">
              <input
                type="text"
                value={newKonuName}
                onChange={(e) => setNewKonuName(e.target.value)}
                placeholder="Yeni konu adı"
                disabled={busy}
              />
              <button type="button" disabled={busy} onClick={() => void submitNewKonu()}>
                Ekle
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="tq-bank-preview-link"
              onClick={() => setNewKonuOpen(true)}
            >
              + Yeni konu
            </button>
          )}

          <div className="tq-bank-preview-field">
            <span>Cevap anahtarı</span>
            <div className="tq-bank-preview-diff tq-bank-preview-answer">
              {(['A', 'B', 'C', 'D', 'E'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  disabled={busy}
                  className={answerKey === opt ? 'is-active' : ''}
                  onClick={() => void handleAnswerChange(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="tq-bank-preview-field">
            <span>Zorluk</span>
            <div className="tq-bank-preview-diff">
              <button
                type="button"
                disabled={busy}
                className={difficulty === null ? 'is-active' : ''}
                onClick={() => void handleDifficultyChange(null)}
              >
                Seçilmedi
              </button>
              {QUESTION_DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={busy}
                  className={difficulty === d ? `is-active is-${d}` : ''}
                  onClick={() => void handleDifficultyChange(d)}
                >
                  {QUESTION_DIFFICULTY_LABEL[d]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error ? <p className="tq-bank-preview-card__error">{error}</p> : null}
        {addedHint ? <p className="tq-bank-preview-card__ok">{addedHint}</p> : null}

        <footer className="tq-bank-preview-card__footer">
          <button type="button" className="tq-bank-preview-btn tq-bank-preview-btn--ghost" onClick={onClose}>
            Kapat
          </button>
          <button
            type="button"
            className="tq-bank-preview-btn tq-bank-preview-btn--secondary"
            disabled={busy}
            onClick={() => void addToTest()}
          >
            Teste ekle
          </button>
          <button
            type="button"
            className="tq-bank-preview-btn tq-bank-preview-btn--primary"
            disabled={busy}
            onClick={() => void addToTestAndGo()}
          >
            Teste ekle ve git
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
