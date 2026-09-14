import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../../api/client'
import type { BankQuestionItem, PdfFolder, PdfItem } from '../../types'
import ConfirmModal from '../modals/ConfirmModal'
import BankQuestionPreviewModal from './BankQuestionPreviewModal'
import { QUESTION_DIFFICULTY_LABEL } from '../../utils/questionDifficulty'
import { BANK_NO_TOPIC_LABEL, bankQuestionToQuestionItem, isBankNoTopicFolderName, resolveBankCropTarget } from '../../utils/bankQuestionUtils'
import {
  pdfSourceBadgeColors,
  pdfSourceBadgeKey,
  shortenPdfBadgeLabel,
} from '../../utils/pdfSourceBadge'
import { setBankCropTarget } from '../../store/cropLocalStore'
import { useEditorStore } from '../../store/editorStore'

const DND_MIME = 'application/x-edutest-folder-id'
const DND_SELECTION_MIME = 'application/x-edutest-bank-selection'

type BankClipboard = {
  mode: 'cut' | 'copy'
  folderIds: string[]
  questionIds: string[]
}

type BankViewMode = 'list' | 'small' | 'medium' | 'large'

const BANK_VIEW_STORAGE_KEY = 'edutest-bank-view-mode'

function readBankViewMode(): BankViewMode {
  try {
    const v = localStorage.getItem(BANK_VIEW_STORAGE_KEY)
    if (v === 'list' || v === 'small' || v === 'medium' || v === 'large') return v
  } catch {
    /* ignore */
  }
  return 'medium'
}

type MarqueeState = {
  originX: number
  originY: number
  x: number
  y: number
  w: number
  h: number
}

type CtxMenuState = {
  x: number
  y: number
  /** null = boş alan (geçerli klasör) */
  folder: PdfFolder | null
  questionId?: string | null
}

type CtxAction =
  | 'new-folder'
  | 'rename'
  | 'delete'
  | 'properties'
  | 'cut'
  | 'copy'
  | 'paste'
  | 'add-to-test'

type DeleteBulkTarget = {
  folderIds: string[]
  questionIds: string[]
  folderNames: string[]
}

type SelectionPayload = {
  folderIds: string[]
  questionIds: string[]
}

function rectsIntersect(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
) {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
    </svg>
  )
}

function PdfFileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  )
}

function parentOf(f: PdfFolder): string | null {
  return f.parent_id ?? null
}

function formatTrDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

/** Seçilen Sorular tuvali ile aynı kabuk — Explorer tarzı çoklu seçim. */
export default function QuestionBankExplorer() {
  const navigate = useNavigate()
  const location = useLocation()
  const setOpenModal = useEditorStore((s) => s.setOpenModal)
  const addQuestionsToWorkingDraft = useEditorStore((s) => s.addQuestionsToWorkingDraft)
  const [folders, setFolders] = useState<PdfFolder[]>([])
  const [items, setItems] = useState<PdfItem[]>([])
  const [bankQuestions, setBankQuestions] = useState<BankQuestionItem[]>([])
  const [bankThumbs, setBankThumbs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(() => new Set())
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(() => new Set())
  const [clipboard, setClipboard] = useState<BankClipboard | null>(null)
  const [marquee, setMarquee] = useState<MarqueeState | null>(null)
  const [creating, setCreating] = useState(false)
  const [createParentId, setCreateParentId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState<PdfFolder | null>(null)
  const [renameName, setRenameName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [statusHint, setStatusHint] = useState<string | null>(null)
  const [deleteBulk, setDeleteBulk] = useState<DeleteBulkTarget | null>(null)
  const [propsTarget, setPropsTarget] = useState<PdfFolder | null>(null)
  const [busy, setBusy] = useState(false)
  const [addingToTest, setAddingToTest] = useState(false)
  const [previewQuestionId, setPreviewQuestionId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<BankViewMode>(() => readBankViewMode())
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | 'root' | null>(null)
  const [navHistory, setNavHistory] = useState<(string | null)[]>([null])
  const [navIndex, setNavIndex] = useState(0)

  const ctxRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)
  const foldersRef = useRef(folders)
  foldersRef.current = folders
  const bankQuestionsRef = useRef(bankQuestions)
  bankQuestionsRef.current = bankQuestions
  const navIndexRef = useRef(navIndex)
  navIndexRef.current = navIndex
  const selectedFolderIdsRef = useRef(selectedFolderIds)
  selectedFolderIdsRef.current = selectedFolderIds
  const selectedQuestionIdsRef = useRef(selectedQuestionIds)
  selectedQuestionIdsRef.current = selectedQuestionIds
  const clipboardRef = useRef(clipboard)
  clipboardRef.current = clipboard
  const activeFolderIdRef = useRef(activeFolderId)
  activeFolderIdRef.current = activeFolderId
  const lastClickedRef = useRef<{ kind: 'folder' | 'question'; id: string } | null>(null)
  const marqueeActiveRef = useRef(false)
  const marqueeCtrlRef = useRef(false)
  const marqueeOriginRef = useRef({ x: 0, y: 0 })
  const marqueeBaselineFoldersRef = useRef<Set<string>>(new Set())
  const marqueeBaselineQuestionsRef = useRef<Set<string>>(new Set())

  const clearSelection = useCallback(() => {
    setSelectedFolderIds(new Set())
    setSelectedQuestionIds(new Set())
    lastClickedRef.current = null
  }, [])

  const goToFolder = useCallback(
    (folderId: string | null, opts?: { record?: boolean }) => {
      const record = opts?.record !== false
      setActiveFolderId(folderId)
      clearSelection()
      setCtxMenu(null)
      if (!record) return
      setNavHistory((prev) => {
        const idx = navIndexRef.current
        const trimmed = prev.slice(0, idx + 1)
        if (trimmed[trimmed.length - 1] === folderId) return trimmed
        const next = [...trimmed, folderId]
        setNavIndex(next.length - 1)
        return next
      })
    },
    [clearSelection],
  )

  const goBack = useCallback(() => {
    setNavIndex((i) => {
      if (i <= 0) return i
      const next = i - 1
      setActiveFolderId(navHistory[next] ?? null)
      clearSelection()
      return next
    })
  }, [navHistory, clearSelection])

  const goForward = useCallback(() => {
    setNavIndex((i) => {
      if (i >= navHistory.length - 1) return i
      const next = i + 1
      setActiveFolderId(navHistory[next] ?? null)
      clearSelection()
      return next
    })
  }, [navHistory, clearSelection])

  const goUp = useCallback(() => {
    if (!activeFolderId) return
    const f = foldersRef.current.find((x) => x.id === activeFolderId)
    goToFolder(f?.parent_id ?? null)
  }, [activeFolderId, goToFolder])

  const canGoBack = navIndex > 0
  const canGoForward = navIndex < navHistory.length - 1
  const canGoUp = Boolean(activeFolderId)

  const refresh = async () => {
    const [pdfRes, folderRes, bankRes] = await Promise.all([
      api.pdfs.list(),
      api.pdfs.folders.list(),
      api.bankQuestions.list(),
    ])
    setItems(pdfRes.items)
    setFolders(folderRes.folders)
    setBankQuestions(bankRes.items)
    const thumbs: Record<string, string> = {}
    await Promise.all(
      bankRes.items.slice(0, 200).map(async (q) => {
        try {
          thumbs[q.id] = await api.bankQuestions.getImageDataUrl(q.id)
        } catch {
          /* ignore */
        }
      }),
    )
    setBankThumbs(thumbs)
  }

  useEffect(() => {
    void refresh()
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const st = location.state as { openFolderId?: string | null } | null
    const openId = st?.openFolderId
    if (!openId) return
    goToFolder(openId)
    navigate(location.pathname, { replace: true, state: null })
    void refresh().catch(() => undefined)
  }, [location.state, location.pathname, goToFolder, navigate])

  const startCropFromFolder = () => {
    const target = resolveBankCropTarget(activeFolderId, foldersRef.current)
    if (!target) {
      window.alert('Önce bir ders klasörüne girin. Kırpılan sorular o derse kaydedilir.')
      return
    }
    setBankCropTarget(target)
    navigate('/crop-tool', { state: { bankCropTarget: target } })
  }

  useEffect(() => {
    if (!ctxMenu) return
    const onDown = (e: MouseEvent) => {
      if (ctxRef.current?.contains(e.target as Node)) return
      setCtxMenu(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCtxMenu(null)
    }
    const onScroll = () => setCtxMenu(null)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [ctxMenu])

  const folderById = useMemo(() => {
    const map = new Map<string, PdfFolder>()
    for (const f of folders) map.set(f.id, f)
    return map
  }, [folders])

  const descendantIdsOf = useCallback((rootId: string): Set<string> => {
    const ids = new Set<string>([rootId])
    let grew = true
    while (grew) {
      grew = false
      for (const f of foldersRef.current) {
        if (f.parent_id && ids.has(f.parent_id) && !ids.has(f.id)) {
          ids.add(f.id)
          grew = true
        }
      }
    }
    return ids
  }, [])

  const activeFolder = activeFolderId ? (folderById.get(activeFolderId) ?? null) : null

  const breadcrumb = useMemo(() => {
    const chain: PdfFolder[] = []
    let cur = activeFolder
    while (cur) {
      chain.unshift(cur)
      cur = cur.parent_id ? (folderById.get(cur.parent_id) ?? null) : null
    }
    return chain
  }, [activeFolder, folderById])

  const childFolders = useMemo(() => {
    return folders
      .filter((f) => parentOf(f) === activeFolderId)
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
  }, [folders, activeFolderId])

  const folderPdfs = useMemo(() => {
    if (!activeFolderId) return []
    return items.filter((i) => (i.folder_id ?? null) === activeFolderId)
  }, [items, activeFolderId])

  const folderBankQuestions = useMemo(() => {
    return bankQuestions.filter((q) => (q.folder_id ?? null) === activeFolderId)
  }, [bankQuestions, activeFolderId])

  const viewOrder = useMemo(() => {
    const order: Array<{ kind: 'folder' | 'question'; id: string }> = []
    for (const f of childFolders) order.push({ kind: 'folder', id: f.id })
    for (const q of folderBankQuestions) order.push({ kind: 'question', id: q.id })
    return order
  }, [childFolders, folderBankQuestions])

  const childCountByFolder = useMemo(() => {
    const map: Record<string, number> = {}
    for (const f of folders) {
      const p = parentOf(f)
      if (!p) continue
      map[p] = (map[p] ?? 0) + 1
    }
    for (const item of items) {
      const fid = item.folder_id
      if (!fid) continue
      map[fid] = (map[fid] ?? 0) + 1
    }
    for (const q of bankQuestions) {
      const fid = q.folder_id
      if (!fid) continue
      map[fid] = (map[fid] ?? 0) + 1
    }
    return map
  }, [folders, items, bankQuestions])

  const canMoveInto = useCallback(
    (folderId: string, newParentId: string | null): boolean => {
      if (folderId === newParentId) return false
      const folder = folderById.get(folderId)
      if (!folder) return false
      if ((folder.parent_id ?? null) === newParentId) return false
      if (newParentId) {
        const desc = descendantIdsOf(folderId)
        if (desc.has(newParentId)) return false
      }
      return true
    },
    [folderById, descendantIdsOf],
  )

  const hasSelection = selectedFolderIds.size > 0 || selectedQuestionIds.size > 0
  const selectionCount = selectedFolderIds.size + selectedQuestionIds.size
  const singleSelectedFolder =
    selectedFolderIds.size === 1 && selectedQuestionIds.size === 0
      ? (folderById.get([...selectedFolderIds][0]) ?? null)
      : null

  const getCurrentSelection = useCallback((): SelectionPayload => {
    return {
      folderIds: [...selectedFolderIdsRef.current],
      questionIds: [...selectedQuestionIdsRef.current],
    }
  }, [])

  const cutSelection = useCallback(() => {
    const sel = getCurrentSelection()
    if (sel.folderIds.length === 0 && sel.questionIds.length === 0) return
    setClipboard({ mode: 'cut', folderIds: sel.folderIds, questionIds: sel.questionIds })
    setCtxMenu(null)
  }, [getCurrentSelection])

  const copySelection = useCallback(() => {
    const sel = getCurrentSelection()
    if (sel.folderIds.length === 0 && sel.questionIds.length === 0) return
    setClipboard({ mode: 'copy', folderIds: sel.folderIds, questionIds: sel.questionIds })
    setCtxMenu(null)
  }, [getCurrentSelection])

  const requestDeleteSelection = useCallback(() => {
    const folderIds = [...selectedFolderIdsRef.current]
    const questionIds = [...selectedQuestionIdsRef.current]
    if (folderIds.length === 0 && questionIds.length === 0) return
    const folderNames = folderIds
      .map((id) => foldersRef.current.find((f) => f.id === id)?.name)
      .filter((n): n is string => Boolean(n))
    setDeleteBulk({ folderIds, questionIds, folderNames })
    setCtxMenu(null)
  }, [])

  const moveSelectionTo = useCallback(
    async (targetParentId: string | null, payload?: SelectionPayload) => {
      const folderIds = payload?.folderIds ?? [...selectedFolderIdsRef.current]
      const questionIds = payload?.questionIds ?? [...selectedQuestionIdsRef.current]
      if (folderIds.length === 0 && questionIds.length === 0) return

      const movedFolderTrees = new Set<string>()
      for (const fid of folderIds) {
        for (const id of descendantIdsOf(fid)) movedFolderTrees.add(id)
      }
      const standaloneQuestions = questionIds.filter((qid) => {
        const q = bankQuestionsRef.current.find((x) => x.id === qid)
        if (!q) return false
        const qFolder = q.folder_id ?? null
        if (qFolder && movedFolderTrees.has(qFolder)) return false
        return true
      })

      setBusy(true)
      try {
        for (const folderId of folderIds) {
          if (!canMoveInto(folderId, targetParentId)) continue
          await api.pdfs.folders.move(folderId, targetParentId)
        }
        if (standaloneQuestions.length > 0) {
          await api.bankQuestions.moveMany(standaloneQuestions, targetParentId)
        }
        await refresh()
        clearSelection()
        if (clipboardRef.current?.mode === 'cut') setClipboard(null)
      } catch (e) {
        window.alert(e instanceof Error ? e.message : 'Taşıma başarısız')
      } finally {
        setBusy(false)
        setDragOverTarget(null)
      }
    },
    [canMoveInto, clearSelection, descendantIdsOf],
  )

  const copyFolderTreeRecursive = useCallback(
    async (sourceFolderId: string, targetParentId: string | null) => {
      const source = foldersRef.current.find((f) => f.id === sourceFolderId)
      if (!source) return
      const { folder: created } = await api.pdfs.folders.create(source.name, targetParentId)
      const questionsHere = bankQuestionsRef.current.filter(
        (q) => (q.folder_id ?? null) === sourceFolderId,
      )
      for (const q of questionsHere) {
        await api.bankQuestions.duplicate(q.id, created.id)
      }
      const children = foldersRef.current.filter((f) => (f.parent_id ?? null) === sourceFolderId)
      for (const child of children) {
        await copyFolderTreeRecursive(child.id, created.id)
      }
    },
    [],
  )

  const pasteClipboard = useCallback(
    async (targetParentId: string | null) => {
      const clip = clipboardRef.current
      if (!clip) return

      setBusy(true)
      try {
        if (clip.mode === 'cut') {
          const cutFolderTrees = new Set<string>()
          for (const fid of clip.folderIds) {
            for (const id of descendantIdsOf(fid)) cutFolderTrees.add(id)
          }
          for (const folderId of clip.folderIds) {
            if (!canMoveInto(folderId, targetParentId)) continue
            await api.pdfs.folders.move(folderId, targetParentId)
          }
          const standaloneQuestions = clip.questionIds.filter((qid) => {
            const q = bankQuestionsRef.current.find((x) => x.id === qid)
            if (!q) return false
            const qFolder = q.folder_id ?? null
            if (qFolder && cutFolderTrees.has(qFolder)) return false
            return true
          })
          if (standaloneQuestions.length > 0) {
            await api.bankQuestions.moveMany(standaloneQuestions, targetParentId)
          }
          setClipboard(null)
        } else {
          const copiedFolderTrees = new Set<string>()
          for (const fid of clip.folderIds) {
            for (const id of descendantIdsOf(fid)) copiedFolderTrees.add(id)
          }
          for (const folderId of clip.folderIds) {
            await copyFolderTreeRecursive(folderId, targetParentId)
          }
          const standaloneQuestions = clip.questionIds.filter((qid) => {
            const q = bankQuestionsRef.current.find((x) => x.id === qid)
            if (!q) return false
            const qFolder = q.folder_id ?? null
            if (qFolder && copiedFolderTrees.has(qFolder)) return false
            return true
          })
          for (const qid of standaloneQuestions) {
            await api.bankQuestions.duplicate(qid, targetParentId)
          }
        }
        await refresh()
        clearSelection()
      } catch (e) {
        window.alert(e instanceof Error ? e.message : 'Yapıştırma başarısız')
      } finally {
        setBusy(false)
      }
    },
    [canMoveInto, clearSelection, copyFolderTreeRecursive, descendantIdsOf],
  )

  const confirmDeleteBulk = useCallback(async () => {
    if (!deleteBulk) return
    const { folderIds, questionIds } = deleteBulk
    setDeleteBulk(null)
    setBusy(true)
    try {
      for (const id of folderIds) {
        await api.pdfs.folders.delete(id)
      }
      if (questionIds.length > 0) {
        await api.bankQuestions.deleteMany(questionIds)
      }
      await refresh()
      clearSelection()
      setClipboard((prev) => {
        if (!prev) return null
        const nextFolders = prev.folderIds.filter((id) => !folderIds.includes(id))
        const nextQuestions = prev.questionIds.filter((id) => !questionIds.includes(id))
        if (nextFolders.length === 0 && nextQuestions.length === 0) return null
        return { ...prev, folderIds: nextFolders, questionIds: nextQuestions }
      })
      if (activeFolderId && folderIds.includes(activeFolderId)) {
        const deleted = foldersRef.current.find((f) => f.id === activeFolderId)
        goToFolder(deleted?.parent_id ?? null)
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Silme başarısız')
    } finally {
      setBusy(false)
    }
  }, [deleteBulk, clearSelection, activeFolderId, goToFolder])

  const selectItem = useCallback(
    (
      kind: 'folder' | 'question',
      id: string,
      opts?: { ctrl?: boolean; shift?: boolean },
    ) => {
      const ctrl = Boolean(opts?.ctrl)
      const shift = Boolean(opts?.shift)

      if (shift && lastClickedRef.current) {
        const start = viewOrder.findIndex(
          (x) =>
            x.kind === lastClickedRef.current!.kind && x.id === lastClickedRef.current!.id,
        )
        const end = viewOrder.findIndex((x) => x.kind === kind && x.id === id)
        if (start >= 0 && end >= 0) {
          const lo = Math.min(start, end)
          const hi = Math.max(start, end)
          const nextFolders = ctrl ? new Set(selectedFolderIdsRef.current) : new Set<string>()
          const nextQuestions = ctrl ? new Set(selectedQuestionIdsRef.current) : new Set<string>()
          for (let i = lo; i <= hi; i++) {
            const item = viewOrder[i]
            if (item.kind === 'folder') nextFolders.add(item.id)
            else nextQuestions.add(item.id)
          }
          setSelectedFolderIds(nextFolders)
          setSelectedQuestionIds(nextQuestions)
          return
        }
      }

      if (ctrl) {
        if (kind === 'folder') {
          setSelectedFolderIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
          })
        } else {
          setSelectedQuestionIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
          })
        }
        lastClickedRef.current = { kind, id }
        return
      }

      if (kind === 'folder') {
        setSelectedFolderIds(new Set([id]))
        setSelectedQuestionIds(new Set())
      } else {
        setSelectedFolderIds(new Set())
        setSelectedQuestionIds(new Set([id]))
      }
      lastClickedRef.current = { kind, id }
    },
    [viewOrder],
  )

  const selectAllInView = useCallback(() => {
    setSelectedFolderIds(new Set(childFolders.map((f) => f.id)))
    setSelectedQuestionIds(new Set(folderBankQuestions.map((q) => q.id)))
  }, [childFolders, folderBankQuestions])

  const addSelectedQuestionsToTest = useCallback(
    async (goToEditor = false) => {
      const ids = [...selectedQuestionIdsRef.current]
      if (ids.length === 0) {
        setError('Önce soru seçin (Ctrl+tık veya dikdörtgen sürükle).')
        return
      }
      setAddingToTest(true)
      setError(null)
      setStatusHint(null)
      try {
        const byId = new Map(bankQuestionsRef.current.map((q) => [q.id, q]))
        // Görünüm sırasını koru
        const orderedIds = folderBankQuestions
          .map((q) => q.id)
          .filter((id) => selectedQuestionIdsRef.current.has(id))
        const idList = orderedIds.length > 0 ? orderedIds : ids
        const workingCount = useEditorStore.getState().questions.length
        const cloned = await Promise.all(
          idList.map(async (id, i) => {
            const q = byId.get(id)
            if (!q) throw new Error('Seçilen soru bulunamadı')
            const dataUrl =
              bankThumbs[id] ?? (await api.bankQuestions.getImageDataUrl(id))
            const raw = dataUrl.includes(',') ? dataUrl.split(',')[1]! : dataUrl
            return bankQuestionToQuestionItem(
              { ...q, image_path: q.image_path },
              raw,
              workingCount + i,
            )
          }),
        )
        addQuestionsToWorkingDraft(cloned)
        setStatusHint(`${cloned.length} soru teste eklendi`)
        setSelectedQuestionIds(new Set())
        setSelectedFolderIds(new Set())
        if (goToEditor) navigate('/')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Sorular teste eklenemedi')
      } finally {
        setAddingToTest(false)
      }
    },
    [addQuestionsToWorkingDraft, bankThumbs, folderBankQuestions, navigate],
  )

  const applyMarqueeSelection = useCallback((rect: MarqueeState, additive: boolean) => {
    const paper = paperRef.current
    if (!paper) return
    const marqueeBox = {
      left: rect.x,
      top: rect.y,
      right: rect.x + rect.w,
      bottom: rect.y + rect.h,
    }
    const nodes = paper.querySelectorAll<HTMLElement>('[data-bank-kind][data-bank-id]')
    const hitFolders = new Set<string>()
    const hitQuestions = new Set<string>()
    nodes.forEach((el) => {
      const kind = el.dataset.bankKind
      const id = el.dataset.bankId
      if (!kind || !id) return
      const r = el.getBoundingClientRect()
      if (
        rectsIntersect(marqueeBox, {
          left: r.left,
          top: r.top,
          right: r.right,
          bottom: r.bottom,
        })
      ) {
        if (kind === 'folder') hitFolders.add(id)
        else if (kind === 'question') hitQuestions.add(id)
      }
    })

    const nextFolders = additive
      ? new Set(marqueeBaselineFoldersRef.current)
      : new Set<string>()
    const nextQuestions = additive
      ? new Set(marqueeBaselineQuestionsRef.current)
      : new Set<string>()
    for (const id of hitFolders) nextFolders.add(id)
    for (const id of hitQuestions) nextQuestions.add(id)
    setSelectedFolderIds(nextFolders)
    setSelectedQuestionIds(nextQuestions)
  }, [])

  const onPaperMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const t = e.target as HTMLElement
    if (t.closest('.tq-bank-icon-tile__hit')) return
    if (t.closest('button') || t.closest('input') || t.closest('a')) return
    if (t.closest('nav')) return

    e.preventDefault()
    const ctrl = e.ctrlKey || e.metaKey
    marqueeCtrlRef.current = ctrl
    marqueeActiveRef.current = true
    marqueeOriginRef.current = { x: e.clientX, y: e.clientY }
    marqueeBaselineFoldersRef.current = ctrl
      ? new Set(selectedFolderIdsRef.current)
      : new Set()
    marqueeBaselineQuestionsRef.current = ctrl
      ? new Set(selectedQuestionIdsRef.current)
      : new Set()
    if (!ctrl) {
      clearSelection()
    }
    setMarquee({
      originX: e.clientX,
      originY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      w: 0,
      h: 0,
    })
    setCtxMenu(null)
  }

  useEffect(() => {
    if (!marquee) return

    const onMove = (e: MouseEvent) => {
      if (!marqueeActiveRef.current) return
      const ox = marqueeOriginRef.current.x
      const oy = marqueeOriginRef.current.y
      const x = Math.min(ox, e.clientX)
      const y = Math.min(oy, e.clientY)
      const w = Math.abs(e.clientX - ox)
      const h = Math.abs(e.clientY - oy)
      const next: MarqueeState = { originX: ox, originY: oy, x, y, w, h }
      setMarquee(next)
      applyMarqueeSelection(next, marqueeCtrlRef.current)
    }

    const onUp = (e: MouseEvent) => {
      if (!marqueeActiveRef.current) return
      marqueeActiveRef.current = false
      const ox = marqueeOriginRef.current.x
      const oy = marqueeOriginRef.current.y
      const x = Math.min(ox, e.clientX)
      const y = Math.min(oy, e.clientY)
      const w = Math.abs(e.clientX - ox)
      const h = Math.abs(e.clientY - oy)
      if (w > 2 || h > 2) {
        applyMarqueeSelection(
          { originX: ox, originY: oy, x, y, w, h },
          marqueeCtrlRef.current,
        )
      }
      setMarquee(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [marquee, applyMarqueeSelection])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'Escape') {
        setClipboard(null)
        clearSelection()
        setCtxMenu(null)
        setMarquee(null)
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        selectAllInView()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        e.preventDefault()
        cutSelection()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        copySelection()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        void pasteClipboard(activeFolderIdRef.current)
        return
      }
      if (e.key === 'Delete') {
        e.preventDefault()
        requestDeleteSelection()
        return
      }
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault()
        goBack()
        return
      }
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault()
        goForward()
        return
      }
      if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault()
        goUp()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    clearSelection,
    selectAllInView,
    cutSelection,
    copySelection,
    pasteClipboard,
    requestDeleteSelection,
    goBack,
    goForward,
    goUp,
  ])

  const openContextMenu = (
    e: ReactMouseEvent,
    folder: PdfFolder | null,
    questionId?: string | null,
  ) => {
    e.preventDefault()
    e.stopPropagation()

    if (folder) {
      const already = selectedFolderIdsRef.current.has(folder.id)
      if (!already) {
        setSelectedFolderIds(new Set([folder.id]))
        setSelectedQuestionIds(new Set())
        lastClickedRef.current = { kind: 'folder', id: folder.id }
      }
    } else if (questionId) {
      const already = selectedQuestionIdsRef.current.has(questionId)
      if (!already) {
        const next = new Set([questionId])
        selectedQuestionIdsRef.current = next
        setSelectedFolderIds(new Set())
        setSelectedQuestionIds(next)
        lastClickedRef.current = { kind: 'question', id: questionId }
      }
    }

    const pad = 8
    const menuW = 220
    const menuH = folder || questionId || hasSelection ? 280 : 120
    const x = Math.min(e.clientX, window.innerWidth - menuW - pad)
    const y = Math.min(e.clientY, window.innerHeight - menuH - pad)
    setCtxMenu({
      x: Math.max(pad, x),
      y: Math.max(pad, y),
      folder,
      questionId: questionId ?? null,
    })
  }

  const startCreateFolder = (parentId: string | null = activeFolderId) => {
    setCreating(true)
    setCreateParentId(parentId)
    setNewName('')
    setRenaming(null)
    setError(null)
    setCtxMenu(null)
  }

  const cancelCreate = () => {
    setCreating(false)
    setNewName('')
    setCreateParentId(null)
    setError(null)
  }

  const submitCreateFolder = async () => {
    const name = newName.trim()
    if (!name) {
      setError('Klasör adı girin')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const parentId = createParentId ?? activeFolderId
      const { folder } = await api.pdfs.folders.create(name, parentId)
      setFolders((prev) => [...prev, folder].sort((a, b) => a.name.localeCompare(b.name, 'tr')))
      setCreating(false)
      setNewName('')
      setCreateParentId(null)
      if (parentId && parentId !== activeFolderId) {
        goToFolder(parentId)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Klasör oluşturulamadı')
    } finally {
      setBusy(false)
    }
  }

  const startRename = (folder: PdfFolder) => {
    setRenaming(folder)
    setRenameName(folder.name)
    setCreating(false)
    setError(null)
    setCtxMenu(null)
  }

  const cancelRename = () => {
    setRenaming(null)
    setRenameName('')
    setError(null)
  }

  const submitRename = async () => {
    if (!renaming) return
    const name = renameName.trim()
    if (!name) {
      setError('Klasör adı girin')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { folder } = await api.pdfs.folders.rename(renaming.id, name)
      setFolders((prev) =>
        prev
          .map((f) => (f.id === folder.id ? folder : f))
          .sort((a, b) => a.name.localeCompare(b.name, 'tr')),
      )
      setRenaming(null)
      setRenameName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ad değiştirilemedi')
    } finally {
      setBusy(false)
    }
  }

  const runCtxAction = (action: CtxAction) => {
    const folder = ctxMenu?.folder ?? null
    const pasteInto = folder ? folder.id : activeFolderId
    setCtxMenu(null)

    if (action === 'new-folder') {
      startCreateFolder(folder ? folder.id : activeFolderId)
      return
    }
    if (action === 'paste') {
      void pasteClipboard(pasteInto)
      return
    }
    if (action === 'cut') {
      cutSelection()
      return
    }
    if (action === 'copy') {
      copySelection()
      return
    }
    if (action === 'delete') {
      requestDeleteSelection()
      return
    }
    if (action === 'add-to-test') {
      void addSelectedQuestionsToTest(false)
      return
    }
    if (action === 'rename' && singleSelectedFolder) {
      startRename(singleSelectedFolder)
      return
    }
    if (action === 'properties' && singleSelectedFolder) {
      setPropsTarget(singleSelectedFolder)
      return
    }
    if (folder && action === 'rename') startRename(folder)
    else if (folder && action === 'properties') setPropsTarget(folder)
  }

  const parseDropSelection = (e: ReactDragEvent): SelectionPayload | null => {
    const raw = e.dataTransfer.getData(DND_SELECTION_MIME)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as SelectionPayload
        return {
          folderIds: Array.isArray(parsed.folderIds) ? parsed.folderIds : [],
          questionIds: Array.isArray(parsed.questionIds) ? parsed.questionIds : [],
        }
      } catch {
        /* fall through */
      }
    }
    const single = e.dataTransfer.getData(DND_MIME)
    if (single) return { folderIds: [single], questionIds: [] }
    return null
  }

  const isDraggingBank = (e: ReactDragEvent) => {
    const types = Array.from(e.dataTransfer.types)
    return types.includes(DND_SELECTION_MIME) || types.includes(DND_MIME)
  }

  const onSelectionDragStart = (
    e: ReactDragEvent,
    kind: 'folder' | 'question',
    id: string,
  ) => {
    let folderIds = [...selectedFolderIdsRef.current]
    let questionIds = [...selectedQuestionIdsRef.current]
    const inSelection =
      (kind === 'folder' && selectedFolderIdsRef.current.has(id)) ||
      (kind === 'question' && selectedQuestionIdsRef.current.has(id))
    if (!inSelection) {
      if (kind === 'folder') {
        folderIds = [id]
        questionIds = []
        setSelectedFolderIds(new Set([id]))
        setSelectedQuestionIds(new Set())
      } else {
        folderIds = []
        questionIds = [id]
        setSelectedFolderIds(new Set())
        setSelectedQuestionIds(new Set([id]))
      }
    }
    const payload: SelectionPayload = { folderIds, questionIds }
    e.dataTransfer.setData(DND_SELECTION_MIME, JSON.stringify(payload))
    if (folderIds.length === 1 && questionIds.length === 0) {
      e.dataTransfer.setData(DND_MIME, folderIds[0])
    }
    e.dataTransfer.effectAllowed = 'move'
    setCtxMenu(null)
  }

  const onDropTargetDragOver = (e: ReactDragEvent, targetId: string | 'root') => {
    if (!isDraggingBank(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverTarget(targetId)
  }

  const onDropOnto = (e: ReactDragEvent, targetParentId: string | null) => {
    e.preventDefault()
    e.stopPropagation()
    const payload = parseDropSelection(e)
    setDragOverTarget(null)
    if (!payload) return
    void moveSelectionTo(targetParentId, payload)
  }

  const propsPath = useMemo(() => {
    if (!propsTarget) return ''
    const chain: string[] = ['Soru Bankası']
    let cur: PdfFolder | null = propsTarget
    const stack: string[] = []
    while (cur) {
      stack.unshift(cur.name)
      cur = cur.parent_id ? (folderById.get(cur.parent_id) ?? null) : null
    }
    return [...chain, ...stack].join(' \\ ')
  }, [propsTarget, folderById])

  const pasteEnabledHere = Boolean(clipboard)
  const pasteIntoCtxFolder = Boolean(clipboard)

  const isEmptyHere =
    childFolders.length === 0 && folderPdfs.length === 0 && folderBankQuestions.length === 0

  const clipboardLabel = useMemo(() => {
    if (!clipboard) return ''
    const parts: string[] = []
    if (clipboard.folderIds.length)
      parts.push(`${clipboard.folderIds.length} klasör`)
    if (clipboard.questionIds.length)
      parts.push(`${clipboard.questionIds.length} soru`)
    return parts.join(', ')
  }, [clipboard])

  const deleteMessage = useMemo(() => {
    if (!deleteBulk) return ''
    const parts: string[] = []
    if (deleteBulk.folderIds.length) {
      const names =
        deleteBulk.folderNames.length <= 3
          ? deleteBulk.folderNames.map((n) => `"${n}"`).join(', ')
          : `${deleteBulk.folderIds.length} klasör`
      parts.push(`${names} (alt klasörleriyle)`)
    }
    if (deleteBulk.questionIds.length) {
      parts.push(`${deleteBulk.questionIds.length} soru`)
    }
    return `${parts.join(' ve ')} silinsin mi?`
  }, [deleteBulk])

  const ctxHasSelection =
    selectedFolderIds.size > 0 || selectedQuestionIds.size > 0 || Boolean(ctxMenu?.folder || ctxMenu?.questionId)

  const renderBankQuestionTiles = (list: BankQuestionItem[]) => (
    <ul className="tq-bank-icon-grid tq-bank-question-grid">
      {list.map((q) => {
        const thumb = bankThumbs[q.id]
        const selected = selectedQuestionIds.has(q.id)
        const cut =
          clipboard?.mode === 'cut' && clipboard.questionIds.includes(q.id)
        return (
          <li key={q.id} className="tq-bank-icon-cell tq-bank-icon-cell--question">
            <div
              className={[
                'tq-bank-icon-tile',
                'tq-bank-icon-tile--question',
                selected ? 'tq-bank-icon-tile--selected' : '',
                cut ? 'tq-bank-icon-tile--cut' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-bank-kind="question"
              data-bank-id={q.id}
            >
              <div
                className="tq-bank-icon-tile__hit tq-bank-question-thumb"
                draggable
                onDragStart={(e) => onSelectionDragStart(e, 'question', q.id)}
                onDragEnd={() => setDragOverTarget(null)}
                onClick={(e) => {
                  e.stopPropagation()
                  const multi = e.ctrlKey || e.metaKey || e.shiftKey
                  selectItem('question', q.id, {
                    ctrl: e.ctrlKey || e.metaKey,
                    shift: e.shiftKey,
                  })
                  // Düz tık: önizleme · Ctrl/Shift: yalnız seçim
                  if (!multi) setPreviewQuestionId(q.id)
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  selectItem('question', q.id, { ctrl: false, shift: false })
                  setPreviewQuestionId(q.id)
                }}
                onContextMenu={(e) => openContextMenu(e, null, q.id)}
                title="Tıkla: önizleme · Ctrl/Shift+tık: çoklu seç · Boş alanda sürükle: dikdörtgen seçim"
              >
                <div
                  className={[
                    'tq-bank-qcard',
                    q.difficulty ? `tq-bank-qcard--${q.difficulty}` : 'tq-bank-qcard--none',
                  ].join(' ')}
                >
                  <div className="tq-bank-qcard__chrome">
                    <div className="tq-bank-qcard__bar tq-bank-qcard__bar--top">
                      <span className="tq-bank-qcard__badge" aria-hidden>
                        {q.difficulty
                          ? QUESTION_DIFFICULTY_LABEL[q.difficulty].charAt(0)
                          : '·'}
                      </span>
                      <span className="tq-bank-qcard__diff">
                        {q.difficulty
                          ? QUESTION_DIFFICULTY_LABEL[q.difficulty]
                          : 'Belirtilmemiş'}
                      </span>
                    </div>
                    <div className="tq-bank-qcard__stage">
                      {thumb ? (
                        <img src={thumb} alt="" className="tq-bank-qcard__img" />
                      ) : (
                        <span className="tq-bank-qcard__empty">Soru</span>
                      )}
                    </div>
                    <div className="tq-bank-qcard__bar tq-bank-qcard__bar--bottom">
                      {(['A', 'B', 'C', 'D', 'E'] as const).map((opt) => {
                        const isAnswer =
                          (q.answer_key || '').toUpperCase().trim() === opt
                        return (
                          <button
                            key={opt}
                            type="button"
                            className={[
                              'tq-bank-qcard__chip',
                              isAnswer ? 'is-selected' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            title={`Cevabı ${opt} yap`}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              void (async () => {
                                try {
                                  const next =
                                    (q.answer_key || '').toUpperCase().trim() === opt
                                      ? ''
                                      : opt
                                  const updated = await api.bankQuestions.update(q.id, {
                                    answer_key: next,
                                  })
                                  setBankQuestions((prev) =>
                                    prev.map((item) =>
                                      item.id === updated.id ? updated : item,
                                    ),
                                  )
                                } catch (err) {
                                  setError(
                                    err instanceof Error
                                      ? err.message
                                      : 'Cevap güncellenemedi',
                                  )
                                }
                              })()
                            }}
                          >
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
                <span className="tq-bank-icon-tile__name">
                  {q.ders}
                  {q.konu ? ` · ${q.konu}` : ` · ${BANK_NO_TOPIC_LABEL}`}
                </span>
                {(() => {
                  const pdfKey = pdfSourceBadgeKey(q.source_pdf_id, q.source_pdf_filename)
                  const colors = pdfSourceBadgeColors(pdfKey)
                  const label = shortenPdfBadgeLabel(q.source_pdf_filename || 'PDF')
                  return (
                    <span className="tq-bank-pdf-badge-row">
                      <span
                        className="tq-bank-pdf-badge"
                        style={{ backgroundColor: colors.bg, color: colors.fg }}
                        title={q.source_pdf_filename || pdfKey}
                      >
                        {label}
                      </span>
                      <span className="tq-bank-pdf-badge-page">s.{q.page_number}</span>
                    </span>
                  )
                })()}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )

  const renderFolderTiles = (list: PdfFolder[]) => (
    <ul className="tq-bank-icon-grid">
      {list.map((folder) => {
        const selected = selectedFolderIds.has(folder.id)
        const cut =
          clipboard?.mode === 'cut' && clipboard.folderIds.includes(folder.id)
        const dropOver = dragOverTarget === folder.id
        const noTopic = isBankNoTopicFolderName(folder.name)
        return (
          <li key={folder.id} className="tq-bank-icon-cell">
            <div
              className={[
                'tq-bank-icon-tile',
                noTopic ? 'tq-bank-icon-tile--no-topic' : '',
                selected ? 'tq-bank-icon-tile--selected' : '',
                cut ? 'tq-bank-icon-tile--cut' : '',
                dropOver ? 'tq-bank-icon-tile--drop' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-bank-kind="folder"
              data-bank-id={folder.id}
              onDragOver={(e) => onDropTargetDragOver(e, folder.id)}
              onDragLeave={() => {
                setDragOverTarget((cur) => (cur === folder.id ? null : cur))
              }}
              onDrop={(e) => onDropOnto(e, folder.id)}
            >
              <button
                type="button"
                className="tq-bank-icon-tile__hit"
                draggable
                onDragStart={(e) => onSelectionDragStart(e, 'folder', folder.id)}
                onDragEnd={() => setDragOverTarget(null)}
                onDoubleClick={() => goToFolder(folder.id)}
                onClick={(e) => {
                  e.stopPropagation()
                  selectItem('folder', folder.id, {
                    ctrl: e.ctrlKey || e.metaKey,
                    shift: e.shiftKey,
                  })
                }}
                onContextMenu={(e) => openContextMenu(e, folder)}
                title={
                  noTopic
                    ? 'Konu atanmamış sorular · Sürükleyerek taşı · Sağ tık: menü · Çift tık: aç'
                    : 'Sürükleyerek taşı · Sağ tık: menü · Çift tık: aç'
                }
              >
                <span
                  className={`tq-bank-folder-glyph${noTopic ? ' tq-bank-folder-glyph--no-topic' : ''}`}
                >
                  <FolderIcon className="h-9 w-9" />
                </span>
                <span className="tq-bank-icon-tile__name">{folder.name}</span>
                <span className="tq-bank-icon-tile__meta">
                  {childCountByFolder[folder.id] ?? 0} öğe
                </span>
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )

  const renderPdfTiles = (list: PdfItem[]) => (
    <ul className="tq-bank-icon-grid">
      {list.map((pdf) => (
        <li key={pdf.id} className="tq-bank-icon-cell">
          <div className="tq-bank-icon-tile tq-bank-icon-tile--file">
            <span className="tq-bank-icon-tile__hit" aria-hidden>
              <span className="tq-bank-file-glyph">
                <PdfFileIcon className="h-8 w-8" />
              </span>
              <span className="tq-bank-icon-tile__name">{pdf.filename}</span>
              <span className="tq-bank-icon-tile__meta">{pdf.page_count} sayfa</span>
            </span>
          </div>
        </li>
      ))}
    </ul>
  )

  return (
    <section className="tq-canvas-shell">
      <div className="tq-canvas-header">
        <h2 className="tq-main-section-title">Soru Bankası</h2>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-blue-300 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800 transition hover:bg-blue-100"
            onClick={() => setOpenModal('pick-bank-questions')}
            title="Filtreyle bankadan soru seç"
          >
            Bankadan Seç
          </button>
          <button
            type="button"
            disabled={busy || addingToTest || selectedQuestionIds.size === 0}
            onClick={() => void addSelectedQuestionsToTest(false)}
            className="rounded-md border border-emerald-400/90 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            title="Ctrl+tık veya dikdörtgen ile seçtiğin soruları teste ekle"
          >
            {addingToTest
              ? 'Ekleniyor…'
              : selectedQuestionIds.size > 0
                ? `Teste ekle (${selectedQuestionIds.size})`
                : 'Teste ekle'}
          </button>
          <button
            type="button"
            disabled={busy || addingToTest || selectedQuestionIds.size === 0}
            onClick={() => void addSelectedQuestionsToTest(true)}
            className="rounded-md border border-emerald-600/80 bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            title="Seçilenleri teste ekle ve düzenleyiciye git"
          >
            {addingToTest ? '…' : 'Ekle ve git'}
          </button>
          <button
            type="button"
            disabled={!activeFolderId || busy}
            onClick={startCropFromFolder}
            className="rounded-md border border-orange-400/80 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-900 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
            title={
              activeFolderId
                ? 'Bu ders/konu klasörüne PDF’den soru kırp'
                : 'Önce bir ders klasörüne girin'
            }
          >
            PDF’den soru kırp
          </button>
          <div className="tq-bank-nav" role="toolbar" aria-label="Klasör gezintisi">
            <button
              type="button"
              className="tq-bank-nav__btn"
              disabled={!canGoBack}
              onClick={goBack}
              title="Geri"
              aria-label="Geri"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              className="tq-bank-nav__btn"
              disabled={!canGoForward}
              onClick={goForward}
              title="İleri"
              aria-label="İleri"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            <button
              type="button"
              className="tq-bank-nav__btn"
              disabled={!canGoUp}
              onClick={goUp}
              title="Bir üst dizin"
              aria-label="Bir üst dizin"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <path d="M12 19V5" />
                <path d="M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>
          <div className="tq-bank-view-toggle" role="toolbar" aria-label="Görünüm">
            {(
              [
                { id: 'list' as const, label: 'Liste', title: 'Liste görünümü' },
                { id: 'small' as const, label: 'Küçük', title: 'Küçük simgeler' },
                { id: 'medium' as const, label: 'Orta', title: 'Orta simgeler' },
                { id: 'large' as const, label: 'Büyük', title: 'Büyük simgeler' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`tq-bank-view-toggle__btn${viewMode === opt.id ? ' is-active' : ''}`}
                title={opt.title}
                aria-pressed={viewMode === opt.id}
                onClick={() => {
                  setViewMode(opt.id)
                  try {
                    localStorage.setItem(BANK_VIEW_STORAGE_KEY, opt.id)
                  } catch {
                    /* ignore */
                  }
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ← Seçilen Sorular
          </button>
          <button
            type="button"
            disabled={busy || creating || !!renaming}
            onClick={() => startCreateFolder(activeFolderId)}
            className="rounded-md border border-amber-400/80 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
          >
            Yeni Klasör
          </button>
          {hasSelection ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={cutSelection}
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Kes
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={copySelection}
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Kopyala
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={requestDeleteSelection}
                className="rounded-md border border-rose-300/80 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
              >
                Sil
              </button>
            </>
          ) : null}
          {clipboard ? (
            <button
              type="button"
              disabled={busy || !pasteEnabledHere}
              onClick={() => void pasteClipboard(activeFolderId)}
              className="rounded-md border border-sky-400/80 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-900 transition hover:bg-sky-100 disabled:opacity-50"
            >
              Yapıştır
            </button>
          ) : null}
        </div>
      </div>

      <div className="tq-canvas-stage">
        <div className="tq-canvas-frame">
          <div
            ref={paperRef}
            className={`tq-canvas-paper tq-canvas-paper--empty${
              dragOverTarget === 'root' ? ' tq-bank-paper--drop' : ''
            }`}
            style={{
              position: 'relative',
              userSelect: marquee ? 'none' : undefined,
            }}
            onMouseDown={onPaperMouseDown}
            onContextMenu={(e) => {
              const t = e.target as HTMLElement
              if (t.closest('.tq-bank-icon-tile__hit')) return
              openContextMenu(e, null)
            }}
            onDragOver={(e) => {
              if (!isDraggingBank(e)) return
              const t = e.target as HTMLElement
              if (t.closest('.tq-bank-icon-tile[data-bank-kind="folder"]')) return
              onDropTargetDragOver(e, 'root')
            }}
            onDragLeave={(e) => {
              if (e.currentTarget === e.target) setDragOverTarget(null)
            }}
            onDrop={(e) => {
              const t = e.target as HTMLElement
              if (t.closest('.tq-bank-icon-tile[data-bank-kind="folder"]')) return
              onDropOnto(e, activeFolderId)
            }}
          >
            {marquee && marquee.w + marquee.h > 0 ? (
              <div
                className="tq-bank-marquee"
                style={{
                  left: marquee.x,
                  top: marquee.y,
                  width: marquee.w,
                  height: marquee.h,
                }}
              />
            ) : null}

            <div className="flex h-full min-h-0 w-full flex-col px-4 py-4 sm:px-6">
              {(selectedQuestionIds.size > 0 || statusHint) && (
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  {selectedQuestionIds.size > 0 ? (
                    <span>
                      <strong className="text-slate-800">{selectedQuestionIds.size}</strong> soru
                      seçili — Ctrl+tık ile ekle/çıkar, boş alanda sürükleyerek dikdörtgen seç
                    </span>
                  ) : null}
                  {statusHint ? (
                    <span className="font-medium text-emerald-700">{statusHint}</span>
                  ) : null}
                  {selectedQuestionIds.size > 0 ? (
                    <button
                      type="button"
                      className="ml-auto rounded border border-emerald-500 bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                      disabled={addingToTest}
                      onClick={() => void addSelectedQuestionsToTest(false)}
                    >
                      {addingToTest
                        ? 'Ekleniyor…'
                        : `Teste ekle (${selectedQuestionIds.size})`}
                    </button>
                  ) : null}
                </div>
              )}
              <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-slate-500">
                <button
                  type="button"
                  className={`rounded px-1.5 py-0.5 hover:bg-slate-100 ${
                    !activeFolderId ? 'font-semibold text-slate-800' : ''
                  }${dragOverTarget === 'root' && activeFolderId ? ' tq-bank-crumb--drop' : ''}`}
                  onClick={() => goToFolder(null)}
                  onDragOver={(e) => {
                    if (!activeFolderId) return
                    onDropTargetDragOver(e, 'root')
                  }}
                  onDrop={(e) => {
                    if (!activeFolderId) return
                    onDropOnto(e, null)
                  }}
                >
                  Soru Bankası
                </button>
                {breadcrumb.map((crumb, i) => {
                  const isLast = i === breadcrumb.length - 1
                  return (
                    <span key={crumb.id} className="inline-flex items-center gap-1">
                      <span aria-hidden>/</span>
                      {isLast ? (
                        <span className="rounded px-1.5 py-0.5 font-semibold text-amber-900">
                          {crumb.name}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className={`rounded px-1.5 py-0.5 hover:bg-slate-100${
                            dragOverTarget === crumb.id ? ' tq-bank-crumb--drop' : ''
                          }`}
                          onClick={() => goToFolder(crumb.id)}
                          onDragOver={(e) => onDropTargetDragOver(e, crumb.id)}
                          onDrop={(e) => onDropOnto(e, crumb.id)}
                        >
                          {crumb.name}
                        </button>
                      )}
                    </span>
                  )
                })}
              </nav>

              {clipboard ? (
                <p className="mb-3 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] text-sky-900">
                  {clipboard.mode === 'cut' ? 'Kesildi' : 'Kopyalandı'}:{' '}
                  <strong>{clipboardLabel}</strong>
                  {' — '}sağ tık → Yapıştır veya Ctrl+V · Esc ile iptal
                </p>
              ) : null}

              {creating && (
                <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-amber-200 bg-amber-50/80 p-3">
                  <label className="min-w-[12rem] flex-1 text-xs font-medium text-amber-950">
                    Klasör adı
                    <input
                      autoFocus
                      type="text"
                      value={newName}
                      onChange={(e) => {
                        setNewName(e.target.value)
                        if (error) setError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void submitCreateFolder()
                        }
                        if (e.key === 'Escape') cancelCreate()
                      }}
                      className="mt-1 w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-400"
                      placeholder="Örn. Matematik"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void submitCreateFolder()}
                    className="rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    Oluştur
                  </button>
                  <button
                    type="button"
                    onClick={cancelCreate}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    İptal
                  </button>
                  {error && <p className="w-full text-xs text-rose-600">{error}</p>}
                </div>
              )}

              {renaming && (
                <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-sky-200 bg-sky-50/80 p-3">
                  <label className="min-w-[12rem] flex-1 text-xs font-medium text-sky-950">
                    Yeni ad
                    <input
                      autoFocus
                      type="text"
                      value={renameName}
                      onChange={(e) => {
                        setRenameName(e.target.value)
                        if (error) setError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void submitRename()
                        }
                        if (e.key === 'Escape') cancelRename()
                      }}
                      className="mt-1 w-full rounded-md border border-sky-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-400"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void submitRename()}
                    className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={cancelRename}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    İptal
                  </button>
                  {error && <p className="w-full text-xs text-rose-600">{error}</p>}
                </div>
              )}

              {loading ? (
                <p className="text-sm text-slate-500">Yükleniyor...</p>
              ) : isEmptyHere && !creating && !renaming ? (
                <div className="tq-empty-state flex-1">
                  <div className="tq-empty-state__icon-wrap" aria-hidden>
                    <FolderIcon className="h-16 w-16 text-amber-500" />
                  </div>
                  <h3 className="tq-empty-state__title">
                    {activeFolder ? activeFolder.name : 'Klasör yok'}
                  </h3>
                  <p className="tq-empty-state__text">
                    {activeFolder
                      ? 'Bu klasör boş. “PDF’den soru kırp” ile soru ekleyin veya sağ tık → Klasör ekle.'
                      : 'Bir ders klasörü oluşturup içine girin; ardından PDF’den soru kırpabilirsiniz.'}
                  </p>
                  {activeFolder ? (
                    <button
                      type="button"
                      onClick={startCropFromFolder}
                      className="mt-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                    >
                      PDF’den soru kırp
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startCreateFolder(activeFolderId)}
                      className="mt-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
                    >
                      Yeni Klasör
                    </button>
                  )}
                </div>
              ) : (
                <div className={`tq-bank-folder-contents tq-bank-view--${viewMode}`}>
                  {childFolders.length > 0 && renderFolderTiles(childFolders)}
                  {folderBankQuestions.length > 0 && renderBankQuestionTiles(folderBankQuestions)}
                  {folderPdfs.length > 0 && renderPdfTiles(folderPdfs)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {ctxMenu
        ? createPortal(
            <div
              ref={ctxRef}
              className="tq-bank-ctx-menu"
              style={{ left: ctxMenu.x, top: ctxMenu.y }}
              role="menu"
            >
              {!ctxMenu.folder && !ctxMenu.questionId ? (
                <button
                  type="button"
                  role="menuitem"
                  className="tq-bank-ctx-menu__item"
                  onClick={() => runCtxAction('new-folder')}
                >
                  Klasör ekle
                </button>
              ) : null}
              <button
                type="button"
                role="menuitem"
                className="tq-bank-ctx-menu__item"
                disabled={!pasteIntoCtxFolder && !pasteEnabledHere}
                onClick={() => runCtxAction('paste')}
              >
                Yapıştır
                {clipboard ? '' : ' (boş)'}
              </button>
              {ctxHasSelection ? (
                <>
                  <div className="tq-bank-ctx-menu__sep" />
                  {selectedQuestionIds.size > 0 || ctxMenu.questionId ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="tq-bank-ctx-menu__item"
                      disabled={addingToTest}
                      onClick={() => runCtxAction('add-to-test')}
                    >
                      Teste ekle
                      {Math.max(
                        selectedQuestionIds.size,
                        ctxMenu.questionId ? 1 : 0,
                      ) > 1
                        ? ` (${selectedQuestionIds.size})`
                        : ''}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    className="tq-bank-ctx-menu__item"
                    onClick={() => runCtxAction('cut')}
                  >
                    Kes
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="tq-bank-ctx-menu__item"
                    onClick={() => runCtxAction('copy')}
                  >
                    Kopyala
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="tq-bank-ctx-menu__item tq-bank-ctx-menu__item--danger"
                    onClick={() => runCtxAction('delete')}
                  >
                    Sil{selectionCount > 1 ? ` (${selectionCount})` : ''}
                  </button>
                  {singleSelectedFolder ||
                  (ctxMenu.folder &&
                    selectedFolderIds.size === 1 &&
                    selectedQuestionIds.size === 0) ? (
                    <>
                      <div className="tq-bank-ctx-menu__sep" />
                      <button
                        type="button"
                        role="menuitem"
                        className="tq-bank-ctx-menu__item"
                        onClick={() => runCtxAction('rename')}
                      >
                        Ad değiştir
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="tq-bank-ctx-menu__item"
                        onClick={() => runCtxAction('properties')}
                      >
                        Özellikler
                      </button>
                    </>
                  ) : null}
                </>
              ) : null}
            </div>,
            document.body,
          )
        : null}

      {previewQuestionId ? (
        <BankQuestionPreviewModal
          questions={folderBankQuestions}
          initialId={previewQuestionId}
          thumbs={bankThumbs}
          onClose={() => setPreviewQuestionId(null)}
          onUpdated={(item) => {
            setBankQuestions((prev) => prev.map((q) => (q.id === item.id ? item : q)))
          }}
          onImageUpdated={(id, dataUrl) => {
            setBankThumbs((prev) => ({ ...prev, [id]: dataUrl }))
          }}
          onStructureChange={() => {
            void refresh().catch(() => undefined)
          }}
        />
      ) : null}

      <ConfirmModal
        open={!!deleteBulk}
        title="Sil"
        message={deleteMessage}
        confirmLabel="Sil"
        variant="danger"
        onConfirm={() => void confirmDeleteBulk()}
        onCancel={() => setDeleteBulk(null)}
      />

      {propsTarget
        ? createPortal(
            <div
              className="tq-bank-props-backdrop"
              role="dialog"
              aria-modal="true"
              aria-labelledby="tq-bank-props-title"
              onClick={() => setPropsTarget(null)}
            >
              <div className="tq-bank-props-card" onClick={(e) => e.stopPropagation()}>
                <h3 id="tq-bank-props-title" className="tq-bank-props-card__title">
                  Özellikler
                </h3>
                <dl className="tq-bank-props-card__grid">
                  <dt>Tür</dt>
                  <dd>Dosya klasörü</dd>
                  <dt>Ad</dt>
                  <dd>{propsTarget.name}</dd>
                  <dt>Konum</dt>
                  <dd className="break-all">{propsPath}</dd>
                  <dt>İçerik</dt>
                  <dd>{childCountByFolder[propsTarget.id] ?? 0} öğe</dd>
                  <dt>Oluşturulma</dt>
                  <dd>{formatTrDate(propsTarget.created_at)}</dd>
                </dl>
                <div className="tq-bank-props-card__actions">
                  <button
                    type="button"
                    className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
                    onClick={() => setPropsTarget(null)}
                  >
                    Tamam
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  )
}
