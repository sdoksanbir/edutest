import fs from 'node:fs'
import path from 'node:path'
import { BrowserWindow, dialog, shell } from 'electron'
import {
  bankImagesDir,
  draftsDir,
  ensureStorageDirs,
  exportsDir,
  getStorageRoot,
  imagesDir,
  uploadsDir,
} from './paths.js'
import * as questionStore from './question-store.js'

const BACKUP_MANIFEST = 'edutest-backup.json'

export type StorageInfo = {
  path: string
  bankQuestionCount: number
  pdfCount: number
  draftCount: number
  bankImageCount: number
  sessionImageCount: number
  approxBytes: number
}

function dirSizeBytes(dir: string): number {
  if (!fs.existsSync(dir)) return 0
  let total = 0
  const walk = (p: string) => {
    for (const name of fs.readdirSync(p)) {
      const full = path.join(p, name)
      const st = fs.statSync(full)
      if (st.isDirectory()) walk(full)
      else total += st.size
    }
  }
  try {
    walk(dir)
  } catch {
    /* ignore */
  }
  return total
}

function countFiles(dir: string, ext?: string): number {
  if (!fs.existsSync(dir)) return 0
  return fs.readdirSync(dir).filter((f) => {
    if (f.startsWith('.')) return false
    if (ext) return f.toLowerCase().endsWith(ext)
    const st = fs.statSync(path.join(dir, f))
    return st.isFile()
  }).length
}

function emptyDirContents(dir: string, keepNames: Set<string> = new Set()) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    return
  }
  for (const name of fs.readdirSync(dir)) {
    if (keepNames.has(name)) continue
    const full = path.join(dir, name)
    fs.rmSync(full, { recursive: true, force: true })
  }
}

function parentWin() {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? undefined
}

export function getStorageInfo(): StorageInfo {
  const root = getStorageRoot()
  ensureStorageDirs()
  let bankQuestionCount = 0
  const bankJson = path.join(root, 'bank-questions.json')
  if (fs.existsSync(bankJson)) {
    try {
      const raw = JSON.parse(fs.readFileSync(bankJson, 'utf8')) as { questions?: unknown[] }
      bankQuestionCount = Array.isArray(raw.questions) ? raw.questions.length : 0
    } catch {
      bankQuestionCount = 0
    }
  }
  return {
    path: root,
    bankQuestionCount,
    pdfCount: countFiles(uploadsDir(), '.pdf'),
    draftCount: countFiles(draftsDir(), '.json'),
    bankImageCount: countFiles(bankImagesDir(), '.png'),
    sessionImageCount: countFiles(imagesDir(), '.png'),
    approxBytes: dirSizeBytes(root),
  }
}

export async function openStorageFolder(): Promise<{ ok: boolean }> {
  const root = getStorageRoot()
  ensureStorageDirs()
  const err = await shell.openPath(root)
  return { ok: !err }
}

/** storage/ klasörünü seçilen üst dizine kopyalar (taşınabilir yedek). */
export async function exportBackup(): Promise<
  { canceled: true } | { canceled: false; path: string }
> {
  const parent = parentWin()
  const result = await dialog.showOpenDialog(parent, {
    title: 'Yedeğin kaydedileceği klasörü seçin',
    properties: ['openDirectory', 'createDirectory'],
  })
  if (result.canceled || !result.filePaths[0]) return { canceled: true }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const dest = path.join(result.filePaths[0], `edutest-backup-${stamp}`)
  const root = getStorageRoot()
  ensureStorageDirs()
  fs.cpSync(root, dest, { recursive: true })
  fs.writeFileSync(
    path.join(dest, BACKUP_MANIFEST),
    JSON.stringify(
      {
        version: 1,
        app: 'edutest',
        createdAt: new Date().toISOString(),
        sourcePath: root,
      },
      null,
      2,
    ),
    'utf8',
  )
  return { canceled: false, path: dest }
}

function looksLikeBackup(dir: string): boolean {
  if (fs.existsSync(path.join(dir, BACKUP_MANIFEST))) return true
  if (fs.existsSync(path.join(dir, 'bank-questions.json'))) return true
  if (fs.existsSync(path.join(dir, 'uploads'))) return true
  if (fs.existsSync(path.join(dir, 'bank-images'))) return true
  return false
}

/** Mutlak image_path alanlarını bu makinenin storage yollarına çevirir. */
export function rewriteAbsolutePathsAfterRestore() {
  const root = getStorageRoot()
  const bankJson = path.join(root, 'bank-questions.json')
  if (fs.existsSync(bankJson)) {
    try {
      const data = JSON.parse(fs.readFileSync(bankJson, 'utf8')) as {
        questions?: Array<{ image_path?: string; [k: string]: unknown }>
        settings?: unknown
      }
      if (Array.isArray(data.questions)) {
        for (const q of data.questions) {
          if (typeof q.image_path === 'string' && q.image_path) {
            const base = path.basename(q.image_path)
            q.image_path = path.join(bankImagesDir(), base)
          }
        }
        fs.writeFileSync(bankJson, JSON.stringify(data, null, 2), 'utf8')
      }
    } catch {
      /* ignore */
    }
  }

  // Draft JSON içinde absolute path varsa basename → images/
  if (fs.existsSync(draftsDir())) {
    for (const name of fs.readdirSync(draftsDir())) {
      if (!name.endsWith('.json')) continue
      const full = path.join(draftsDir(), name)
      try {
        const text = fs.readFileSync(full, 'utf8')
        if (!text.includes('image_path')) continue
        const data = JSON.parse(text) as unknown
        const rewritten = rewriteDraftPaths(data)
        fs.writeFileSync(full, JSON.stringify(rewritten, null, 2), 'utf8')
      } catch {
        /* ignore */
      }
    }
  }
}

function rewriteDraftPaths(data: unknown): unknown {
  if (Array.isArray(data)) return data.map(rewriteDraftPaths)
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'image_path' && typeof v === 'string' && v) {
        const base = path.basename(v)
        // bank vs session: prefer bank-images if file exists there
        const bankCandidate = path.join(bankImagesDir(), base)
        const sessionCandidate = path.join(imagesDir(), base)
        out[k] = fs.existsSync(bankCandidate)
          ? bankCandidate
          : fs.existsSync(sessionCandidate)
            ? sessionCandidate
            : path.join(imagesDir(), base)
      } else {
        out[k] = rewriteDraftPaths(v)
      }
    }
    return out
  }
  return data
}

function wipeStorageContents() {
  questionStore.clearAll()
  emptyDirContents(uploadsDir())
  emptyDirContents(draftsDir())
  emptyDirContents(imagesDir())
  emptyDirContents(bankImagesDir())
  emptyDirContents(exportsDir())
  const root = getStorageRoot()
  for (const name of [
    'bank-questions.json',
    'google-oauth.json',
    'google-drive-token.json',
    'gcp-oauth.keys.json',
  ]) {
    const p = path.join(root, name)
    if (fs.existsSync(p)) fs.rmSync(p, { force: true })
  }
  // bank-meta lives in uploads — already cleared
  fs.writeFileSync(
    path.join(root, 'bank-questions.json'),
    JSON.stringify(
      {
        settings: {
          defaultDers: 'Matematik',
          dersList: ['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Felsefe'],
          konuByDers: {},
        },
        questions: [],
      },
      null,
      2,
    ),
    'utf8',
  )
  ensureStorageDirs()
}

/** Seçilen yedek klasörünü storage üzerine yazar (önce mevcut içeriği siler). */
export async function importBackup(): Promise<
  { canceled: true } | { canceled: false; path: string; rewrittenPaths: boolean }
> {
  const parent = parentWin()
  const result = await dialog.showOpenDialog(parent, {
    title: 'Geri yüklenecek EduTest yedek klasörünü seçin',
    properties: ['openDirectory'],
  })
  if (result.canceled || !result.filePaths[0]) return { canceled: true }
  const src = result.filePaths[0]
  if (!looksLikeBackup(src)) {
    throw new Error(
      'Seçilen klasör EduTest yedeği gibi görünmüyor (edutest-backup.json veya bank-questions.json yok).',
    )
  }

  const root = getStorageRoot()
  // Güvenlik: yedek kendi storage klasörü olmasın
  if (path.resolve(src) === path.resolve(root)) {
    throw new Error('Yedek olarak uygulamanın kendi storage klasörünü seçemezsiniz.')
  }

  wipeStorageContents()
  // cpSync src → root (manifest dahil)
  for (const name of fs.readdirSync(src)) {
    if (name === BACKUP_MANIFEST) continue
    const from = path.join(src, name)
    const to = path.join(root, name)
    fs.cpSync(from, to, { recursive: true })
  }
  ensureStorageDirs()
  rewriteAbsolutePathsAfterRestore()
  return { canceled: false, path: src, rewrittenPaths: true }
}

export async function wipeAllData(): Promise<{ ok: true }> {
  wipeStorageContents()
  return { ok: true }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
