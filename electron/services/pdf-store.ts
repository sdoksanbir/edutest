import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { PDFDocument } from 'pdf-lib'
import { uploadsDir } from './paths.js'

export type PdfItem = {
  id: string
  filename: string
  path: string
  page_count: number
  created_at: string
  folder_id: string | null
}

export type PdfFolder = {
  id: string
  name: string
  created_at: string
  /** null = kök */
  parent_id: string | null
}

type BankMeta = {
  folders: PdfFolder[]
  /** pdfId → folderId */
  pdfFolderById: Record<string, string>
}

function metaPath() {
  return path.join(uploadsDir(), 'bank-meta.json')
}

function emptyMeta(): BankMeta {
  return { folders: [], pdfFolderById: {} }
}

function normalizeFolder(raw: Partial<PdfFolder> & { id?: string; name?: string }): PdfFolder | null {
  if (!raw?.id || !raw?.name) return null
  return {
    id: raw.id,
    name: raw.name,
    created_at: raw.created_at ?? new Date().toISOString(),
    parent_id: raw.parent_id ?? null,
  }
}

function readMeta(): BankMeta {
  const p = metaPath()
  if (!fs.existsSync(p)) return emptyMeta()
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as Partial<BankMeta>
    const folders = Array.isArray(raw.folders)
      ? raw.folders.map(normalizeFolder).filter((f): f is PdfFolder => !!f)
      : []
    return {
      folders,
      pdfFolderById:
        raw.pdfFolderById && typeof raw.pdfFolderById === 'object' ? raw.pdfFolderById : {},
    }
  } catch {
    return emptyMeta()
  }
}

function writeMeta(meta: BankMeta) {
  fs.mkdirSync(uploadsDir(), { recursive: true })
  fs.writeFileSync(metaPath(), JSON.stringify(meta, null, 2), 'utf8')
}

async function readPageCount(data: Buffer): Promise<number> {
  try {
    const doc = await PDFDocument.load(data)
    return Math.max(1, doc.getPageCount())
  } catch {
    return 1
  }
}

function parseFilename(fileName: string) {
  return fileName.includes('_') ? fileName.slice(fileName.indexOf('_') + 1) : fileName
}

export function listFolders(): PdfFolder[] {
  return readMeta().folders.slice().sort((a, b) => a.name.localeCompare(b.name, 'tr'))
}

export function createFolder(name: string, parentId?: string | null): PdfFolder {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Klasör adı boş olamaz')
  const meta = readMeta()
  const parent = parentId ?? null
  if (parent && !meta.folders.some((f) => f.id === parent)) {
    throw new Error('Üst klasör bulunamadı')
  }
  const siblings = meta.folders.filter((f) => (f.parent_id ?? null) === parent)
  if (siblings.some((f) => f.name.toLocaleLowerCase('tr') === trimmed.toLocaleLowerCase('tr'))) {
    throw new Error('Bu isimde bir klasör zaten var')
  }
  const folder: PdfFolder = {
    id: randomUUID(),
    name: trimmed,
    created_at: new Date().toISOString(),
    parent_id: parent,
  }
  meta.folders.push(folder)
  writeMeta(meta)
  return folder
}

function collectDescendantIds(folders: PdfFolder[], rootId: string): Set<string> {
  const ids = new Set<string>([rootId])
  let grew = true
  while (grew) {
    grew = false
    for (const f of folders) {
      if (f.parent_id && ids.has(f.parent_id) && !ids.has(f.id)) {
        ids.add(f.id)
        grew = true
      }
    }
  }
  return ids
}

/** Klasörü (ve alt klasörlerini) siler; PDF'ler silinmez, atamaları kalkar. */
export function deleteFolder(folderId: string): { ok: boolean } {
  const meta = readMeta()
  if (!meta.folders.some((f) => f.id === folderId)) throw new Error('Klasör bulunamadı')
  const removeIds = collectDescendantIds(meta.folders, folderId)
  meta.folders = meta.folders.filter((f) => !removeIds.has(f.id))
  for (const [pdfId, fid] of Object.entries(meta.pdfFolderById)) {
    if (removeIds.has(fid)) delete meta.pdfFolderById[pdfId]
  }
  writeMeta(meta)
  return { ok: true }
}

export async function listPdfs(): Promise<PdfItem[]> {
  if (!fs.existsSync(uploadsDir())) return []
  const meta = readMeta()
  const files = fs.readdirSync(uploadsDir()).filter((f) => f.endsWith('.pdf'))
  const items = await Promise.all(
    files.map(async (f) => {
      const full = path.join(uploadsDir(), f)
      const stat = fs.statSync(full)
      const data = fs.readFileSync(full)
      const id = f.split('_')[0] ?? randomUUID()
      return {
        id,
        filename: parseFilename(f),
        path: full,
        page_count: await readPageCount(data),
        created_at: new Date(stat.mtimeMs).toISOString(),
        folder_id: meta.pdfFolderById[id] ?? null,
      }
    }),
  )
  return items.sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function uploadPdfs(
  files: Array<{ name: string; data: Buffer }>,
  folderId?: string | null,
): Promise<PdfItem[]> {
  fs.mkdirSync(uploadsDir(), { recursive: true })
  const meta = readMeta()
  const resolvedFolder =
    folderId && meta.folders.some((f) => f.id === folderId) ? folderId : null
  const uploaded: PdfItem[] = []
  for (const file of files) {
    const id = randomUUID()
    const dest = path.join(uploadsDir(), `${id}_${file.name}`)
    fs.writeFileSync(dest, file.data)
    if (resolvedFolder) meta.pdfFolderById[id] = resolvedFolder
    uploaded.push({
      id,
      filename: file.name,
      path: dest,
      page_count: await readPageCount(file.data),
      created_at: new Date().toISOString(),
      folder_id: resolvedFolder,
    })
  }
  if (resolvedFolder) writeMeta(meta)
  return uploaded
}

export function movePdf(pdfId: string, folderId: string | null): PdfItem {
  const meta = readMeta()
  if (folderId && !meta.folders.some((f) => f.id === folderId)) {
    throw new Error('Klasör bulunamadı')
  }
  const filePath = getPdfPath(pdfId)
  if (folderId) meta.pdfFolderById[pdfId] = folderId
  else delete meta.pdfFolderById[pdfId]
  writeMeta(meta)
  const stat = fs.statSync(filePath)
  const fileName = path.basename(filePath)
  return {
    id: pdfId,
    filename: parseFilename(fileName),
    path: filePath,
    page_count: 0,
    created_at: new Date(stat.mtimeMs).toISOString(),
    folder_id: folderId,
  }
}

export function deletePdf(pdfId: string): void {
  const dir = uploadsDir()
  if (!fs.existsSync(dir)) throw new Error('PDF not found')
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith(`${pdfId}_`)) {
      fs.unlinkSync(path.join(dir, f))
      const meta = readMeta()
      if (meta.pdfFolderById[pdfId]) {
        delete meta.pdfFolderById[pdfId]
        writeMeta(meta)
      }
      return
    }
  }
  throw new Error('PDF not found')
}

export function getPdfPath(pdfId: string): string {
  const dir = uploadsDir()
  if (!fs.existsSync(dir)) throw new Error('PDF not found')
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith(`${pdfId}_`)) return path.join(dir, f)
  }
  throw new Error('PDF not found')
}

export function getPdfBytes(pdfId: string): string {
  const filePath = getPdfPath(pdfId)
  return fs.readFileSync(filePath).toString('base64')
}
