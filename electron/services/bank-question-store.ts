import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { bankImagesDir, getStorageRoot } from './paths.js'

export type CropBox = {
  x: number
  y: number
  width: number
  height: number
}

export type BankQuestionDifficulty = 'kolay' | 'orta' | 'zor'

export type BankQuestionRecord = {
  id: string
  ders: string
  /** null = konu atanmamış (Konu yok klasörü) */
  konu: string | null
  difficulty: BankQuestionDifficulty | null
  /** pdf-store klasör id — null = kök */
  folder_id: string | null
  source_pdf_id: string
  source_pdf_filename: string
  page_number: number
  crop: CropBox
  answer_key: string
  content_type: 'question' | 'explanation'
  remove_background: boolean
  image_path: string
  created_at: string
  layoutMode?: 'single-column' | 'full-width' | 'auto'
  manualScale?: number
  normalizationScale?: number
  capture?: Record<string, unknown>
  fontReference?: Record<string, unknown>
  [key: string]: unknown
}

export type BankSettings = {
  defaultDers: string
  dersList: string[]
  konuByDers: Record<string, string[]>
}

type BankStoreFile = {
  settings: BankSettings
  questions: BankQuestionRecord[]
}

const DEFAULT_DERS_LIST = ['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Felsefe']

function storePath() {
  return path.join(getStorageRoot(), 'bank-questions.json')
}

function defaultSettings(): BankSettings {
  return {
    defaultDers: DEFAULT_DERS_LIST[0]!,
    dersList: [...DEFAULT_DERS_LIST],
    konuByDers: {},
  }
}

function emptyStore(): BankStoreFile {
  return { settings: defaultSettings(), questions: [] }
}

function readStore(): BankStoreFile {
  const p = storePath()
  if (!fs.existsSync(p)) return emptyStore()
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as Partial<BankStoreFile>
    const settings = raw.settings ?? defaultSettings()
    const dersList =
      Array.isArray(settings.dersList) && settings.dersList.length > 0
        ? settings.dersList.filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
        : defaultSettings().dersList
    const defaultDers =
      typeof settings.defaultDers === 'string' && dersList.includes(settings.defaultDers)
        ? settings.defaultDers
        : dersList[0]!
    const konuByDers: Record<string, string[]> = {}
    if (settings.konuByDers && typeof settings.konuByDers === 'object') {
      for (const [k, v] of Object.entries(settings.konuByDers)) {
        if (!Array.isArray(v)) continue
        konuByDers[k] = v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      }
    }
    const questions = Array.isArray(raw.questions)
      ? raw.questions
          .filter((q): q is BankQuestionRecord => !!q?.id && !!q?.ders && !!q?.image_path)
          .map((q) => ({
            ...q,
            folder_id: q.folder_id ?? null,
          }))
      : []
    return {
      settings: { defaultDers, dersList, konuByDers },
      questions,
    }
  } catch {
    return emptyStore()
  }
}

function writeStore(data: BankStoreFile) {
  fs.mkdirSync(path.dirname(storePath()), { recursive: true })
  fs.writeFileSync(storePath(), JSON.stringify(data, null, 2), 'utf8')
}

function saveImageFromBase64(imageBase64: string): string {
  fs.mkdirSync(bankImagesDir(), { recursive: true })
  const raw = imageBase64.includes(',') ? imageBase64.split(',')[1]! : imageBase64
  const id = randomUUID()
  const filePath = path.join(bankImagesDir(), `${id}.png`)
  fs.writeFileSync(filePath, Buffer.from(raw, 'base64'))
  return filePath
}

function parseDifficulty(v: unknown): BankQuestionDifficulty | null {
  if (v === 'kolay' || v === 'orta' || v === 'zor') return v
  return null
}

function ensureDersInSettings(settings: BankSettings, ders: string) {
  if (!settings.dersList.includes(ders)) {
    settings.dersList = [...settings.dersList, ders]
  }
}

function ensureKonuInSettings(settings: BankSettings, ders: string, konu: string | null) {
  if (!konu) return
  const list = settings.konuByDers[ders] ?? []
  if (!list.includes(konu)) {
    settings.konuByDers[ders] = [...list, konu]
  }
}

export function getBankSettings(): BankSettings {
  return readStore().settings
}

export function updateBankSettings(patch: Partial<BankSettings>): BankSettings {
  const store = readStore()
  if (patch.defaultDers?.trim()) {
    const d = patch.defaultDers.trim()
    ensureDersInSettings(store.settings, d)
    store.settings.defaultDers = d
  }
  if (Array.isArray(patch.dersList) && patch.dersList.length > 0) {
    store.settings.dersList = patch.dersList
      .map((d) => d.trim())
      .filter((d) => d.length > 0)
    if (!store.settings.dersList.includes(store.settings.defaultDers)) {
      store.settings.defaultDers = store.settings.dersList[0]!
    }
  }
  if (patch.konuByDers && typeof patch.konuByDers === 'object') {
    store.settings.konuByDers = patch.konuByDers
  }
  writeStore(store)
  return store.settings
}

export function addBankDers(name: string): BankSettings {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Ders adı boş olamaz')
  const store = readStore()
  ensureDersInSettings(store.settings, trimmed)
  writeStore(store)
  return store.settings
}

export function addBankKonu(ders: string, konu: string): BankSettings {
  const d = ders.trim()
  const k = konu.trim()
  if (!d) throw new Error('Ders seçilmedi')
  if (!k) throw new Error('Konu adı boş olamaz')
  const store = readStore()
  ensureDersInSettings(store.settings, d)
  ensureKonuInSettings(store.settings, d, k)
  writeStore(store)
  return store.settings
}

export type BankQuestionListFilter = {
  ders?: string
  konu?: string | null
  difficulty?: BankQuestionDifficulty | null
  search?: string
  /** undefined = tümü; null = yalnızca kök; string = o klasör */
  folderId?: string | null
}

export function listBankQuestions(filter?: BankQuestionListFilter): BankQuestionRecord[] {
  let items = [...readStore().questions]
  if (filter && 'folderId' in filter) {
    const fid = filter.folderId ?? null
    items = items.filter((q) => (q.folder_id ?? null) === fid)
  }
  if (filter?.ders) {
    items = items.filter((q) => q.ders === filter.ders)
  }
  if (filter && 'konu' in filter) {
    const k = filter.konu ?? null
    items = items.filter((q) => (q.konu ?? null) === k)
  }
  if (filter?.difficulty) {
    items = items.filter((q) => q.difficulty === filter.difficulty)
  }
  if (filter?.search?.trim()) {
    const q = filter.search.trim().toLocaleLowerCase('tr')
    items = items.filter(
      (item) =>
        item.ders.toLocaleLowerCase('tr').includes(q) ||
        (item.konu ?? '').toLocaleLowerCase('tr').includes(q) ||
        item.source_pdf_filename.toLocaleLowerCase('tr').includes(q) ||
        item.answer_key.toLocaleLowerCase('tr').includes(q),
    )
  }
  return items.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

export function createBankQuestion(payload: {
  ders: string
  konu?: string | null
  difficulty?: BankQuestionDifficulty | null
  folder_id?: string | null
  source_pdf_id: string
  source_pdf_filename: string
  page_number: number
  crop: CropBox
  answer_key?: string
  content_type?: 'question' | 'explanation'
  remove_background?: boolean
  image_base64: string
  layoutMode?: 'single-column' | 'full-width' | 'auto'
  manualScale?: number
  normalizationScale?: number
  capture?: Record<string, unknown>
  fontReference?: Record<string, unknown>
}): BankQuestionRecord {
  const ders = payload.ders.trim()
  if (!ders) throw new Error('Ders zorunludur')
  const konu = payload.konu?.trim() ? payload.konu.trim() : null
  const store = readStore()
  ensureDersInSettings(store.settings, ders)
  ensureKonuInSettings(store.settings, ders, konu)

  const item: BankQuestionRecord = {
    id: randomUUID(),
    ders,
    konu,
    difficulty: parseDifficulty(payload.difficulty),
    folder_id: payload.folder_id ?? null,
    source_pdf_id: payload.source_pdf_id,
    source_pdf_filename: payload.source_pdf_filename,
    page_number: payload.page_number,
    crop: payload.crop,
    answer_key: payload.answer_key ?? '',
    content_type: payload.content_type ?? 'question',
    remove_background: payload.remove_background ?? false,
    image_path: saveImageFromBase64(payload.image_base64),
    created_at: new Date().toISOString(),
    layoutMode: payload.layoutMode,
    manualScale: payload.manualScale,
    normalizationScale: payload.normalizationScale,
    capture: payload.capture,
    fontReference: payload.fontReference,
  }
  store.questions.push(item)
  writeStore(store)
  return item
}

export function updateBankQuestion(
  id: string,
  patch: {
    ders?: string
    konu?: string | null
    difficulty?: BankQuestionDifficulty | null
    folder_id?: string | null
    image_base64?: string
    remove_background?: boolean
    answer_key?: string
  },
): BankQuestionRecord {
  const store = readStore()
  const item = store.questions.find((q) => q.id === id)
  if (!item) throw new Error('Bank question not found')

  if (patch.ders !== undefined) {
    const ders = patch.ders.trim()
    if (!ders) throw new Error('Ders zorunludur')
    ensureDersInSettings(store.settings, ders)
    item.ders = ders
  }
  if ('konu' in patch) {
    const konu = patch.konu?.trim() ? patch.konu.trim() : null
    ensureKonuInSettings(store.settings, item.ders, konu)
    item.konu = konu
  }
  if ('difficulty' in patch) {
    item.difficulty = parseDifficulty(patch.difficulty)
  }
  if ('folder_id' in patch) {
    item.folder_id = patch.folder_id ?? null
  }
  if ('remove_background' in patch) {
    item.remove_background = !!patch.remove_background
  }
  if ('answer_key' in patch) {
    item.answer_key = (patch.answer_key ?? '').trim().toUpperCase()
  }
  if (typeof patch.image_base64 === 'string' && patch.image_base64.trim()) {
    const oldPath = item.image_path
    item.image_path = saveImageFromBase64(patch.image_base64)
    if (oldPath && oldPath !== item.image_path && fs.existsSync(oldPath)) {
      try {
        fs.unlinkSync(oldPath)
      } catch {
        /* ignore */
      }
    }
  }

  writeStore(store)
  return item
}

export function deleteBankQuestion(id: string) {
  const store = readStore()
  const idx = store.questions.findIndex((q) => q.id === id)
  if (idx < 0) throw new Error('Bank question not found')
  const [removed] = store.questions.splice(idx, 1)
  if (removed?.image_path && fs.existsSync(removed.image_path)) {
    try {
      fs.unlinkSync(removed.image_path)
    } catch {
      /* ignore */
    }
  }
  writeStore(store)
  return { ok: true as const }
}

function copyImageFile(srcPath: string): string {
  fs.mkdirSync(bankImagesDir(), { recursive: true })
  const dest = path.join(bankImagesDir(), `${randomUUID()}.png`)
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, dest)
  }
  return dest
}

/** Aynı görseli yeni kayıt olarak kopyalar (yapıştır / kopyala). */
export function duplicateBankQuestion(
  id: string,
  folderId?: string | null,
): BankQuestionRecord {
  const store = readStore()
  const src = store.questions.find((q) => q.id === id)
  if (!src) throw new Error('Bank question not found')
  const item: BankQuestionRecord = {
    ...src,
    id: randomUUID(),
    folder_id: folderId !== undefined ? folderId : src.folder_id,
    image_path: copyImageFile(src.image_path),
    created_at: new Date().toISOString(),
  }
  store.questions.push(item)
  writeStore(store)
  return item
}

export function moveBankQuestions(
  ids: string[],
  folderId: string | null,
): BankQuestionRecord[] {
  const store = readStore()
  const updated: BankQuestionRecord[] = []
  const idSet = new Set(ids)
  for (const q of store.questions) {
    if (!idSet.has(q.id)) continue
    q.folder_id = folderId
    updated.push(q)
  }
  writeStore(store)
  return updated
}

export function deleteBankQuestions(ids: string[]) {
  for (const id of ids) {
    try {
      deleteBankQuestion(id)
    } catch {
      /* skip missing */
    }
  }
  return { ok: true as const }
}

export function getBankQuestionImageBase64(id: string): string {
  const store = readStore()
  const item = store.questions.find((q) => q.id === id)
  if (!item) return ''
  if (item.image_path && fs.existsSync(item.image_path)) {
    return fs.readFileSync(item.image_path).toString('base64')
  }
  return ''
}
