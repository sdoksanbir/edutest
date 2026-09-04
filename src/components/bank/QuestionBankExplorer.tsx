import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import type { PdfFolder, PdfItem } from '../../types'
import ConfirmModal from '../modals/ConfirmModal'

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

/** Seçilen Sorular tuvali ile aynı kabuk — dosya gezgini. */
export default function QuestionBankExplorer() {
  const navigate = useNavigate()
  const [folders, setFolders] = useState<PdfFolder[]>([])
  const [items, setItems] = useState<PdfItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PdfFolder | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    const [pdfRes, folderRes] = await Promise.all([api.pdfs.list(), api.pdfs.folders.list()])
    setItems(pdfRes.items)
    setFolders(folderRes.folders)
  }

  useEffect(() => {
    void refresh()
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [])

  const folderById = useMemo(() => {
    const map = new Map<string, PdfFolder>()
    for (const f of folders) map.set(f.id, f)
    return map
  }, [folders])

  const activeFolder = activeFolderId ? folderById.get(activeFolderId) ?? null : null

  const breadcrumb = useMemo(() => {
    const chain: PdfFolder[] = []
    let cur = activeFolder
    while (cur) {
      chain.unshift(cur)
      cur = cur.parent_id ? folderById.get(cur.parent_id) ?? null : null
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
    return map
  }, [folders, items])

  const startCreateFolder = () => {
    setCreating(true)
    setNewName('')
    setError(null)
  }

  const cancelCreate = () => {
    setCreating(false)
    setNewName('')
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
      const { folder } = await api.pdfs.folders.create(name, activeFolderId)
      setFolders((prev) => [...prev, folder].sort((a, b) => a.name.localeCompare(b.name, 'tr')))
      setCreating(false)
      setNewName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Klasör oluşturulamadı')
    } finally {
      setBusy(false)
    }
  }

  const confirmDeleteFolder = async () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    const parentId = parentOf(deleteTarget)
    setDeleteTarget(null)
    setBusy(true)
    try {
      await api.pdfs.folders.delete(id)
      await refresh()
      if (activeFolderId === id) setActiveFolderId(parentId)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Klasör silinemedi')
    } finally {
      setBusy(false)
    }
  }

  const isEmptyHere = childFolders.length === 0 && folderPdfs.length === 0

  const renderFolderTiles = (list: PdfFolder[]) => (
    <ul className="tq-bank-icon-grid">
      {list.map((folder) => (
        <li key={folder.id} className="tq-bank-icon-cell">
          <div className="tq-bank-icon-tile">
            <button
              type="button"
              className="tq-bank-icon-tile__hit"
              onDoubleClick={() => setActiveFolderId(folder.id)}
              onClick={() => setActiveFolderId(folder.id)}
              title="Açmak için tıklayın"
            >
              <span className="tq-bank-folder-glyph">
                <FolderIcon className="h-9 w-9" />
              </span>
              <span className="tq-bank-icon-tile__name">{folder.name}</span>
              <span className="tq-bank-icon-tile__meta">
                {childCountByFolder[folder.id] ?? 0} öğe
              </span>
            </button>
          </div>
        </li>
      ))}
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
            onClick={() => navigate('/')}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ← Seçilen Sorular
          </button>
          <button
            type="button"
            disabled={busy || creating}
            onClick={startCreateFolder}
            className="rounded-md border border-amber-400/80 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
          >
            Yeni Klasör
          </button>
          {activeFolder && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setDeleteTarget(activeFolder)}
              className="rounded-md border border-rose-300/80 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
            >
              Klasörü Sil
            </button>
          )}
        </div>
      </div>

      <div className="tq-canvas-stage">
        <div className="tq-canvas-frame">
          <div className="tq-canvas-paper tq-canvas-paper--empty">
            <div className="flex h-full min-h-0 w-full flex-col px-4 py-4 sm:px-6">
              <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-slate-500">
                <button
                  type="button"
                  className={`rounded px-1.5 py-0.5 hover:bg-slate-100 ${!activeFolderId ? 'font-semibold text-slate-800' : ''}`}
                  onClick={() => setActiveFolderId(null)}
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
                          className="rounded px-1.5 py-0.5 hover:bg-slate-100"
                          onClick={() => setActiveFolderId(crumb.id)}
                        >
                          {crumb.name}
                        </button>
                      )}
                    </span>
                  )
                })}
              </nav>

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

              {loading ? (
                <p className="text-sm text-slate-500">Yükleniyor...</p>
              ) : isEmptyHere && !creating ? (
                <div className="tq-empty-state flex-1">
                  <div className="tq-empty-state__icon-wrap" aria-hidden>
                    <FolderIcon className="h-16 w-16 text-amber-500" />
                  </div>
                  <h3 className="tq-empty-state__title">
                    {activeFolder ? activeFolder.name : 'Klasör yok'}
                  </h3>
                  <p className="tq-empty-state__text">
                    {activeFolder
                      ? 'Bu klasör boş. İçine yeni klasör ekleyebilirsiniz.'
                      : 'Dosya gezgini gibi klasör oluşturun. Üstteki Yeni Klasör ile başlayın.'}
                  </p>
                  <button
                    type="button"
                    onClick={startCreateFolder}
                    className="mt-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
                  >
                    Yeni Klasör
                  </button>
                </div>
              ) : (
                <div className="flex min-h-0 flex-col gap-4">
                  {childFolders.length > 0 && renderFolderTiles(childFolders)}
                  {folderPdfs.length > 0 && renderPdfTiles(folderPdfs)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Klasörü sil"
        message={
          deleteTarget
            ? `"${deleteTarget.name}" klasörü (ve alt klasörleri) silinsin mi? İçindeki dosyalar silinmez.`
            : ''
        }
        confirmLabel="Sil"
        variant="danger"
        onConfirm={() => void confirmDeleteFolder()}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  )
}
