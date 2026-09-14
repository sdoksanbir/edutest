import type { BankQuestionItem, PdfFolder, QuestionItem } from '../types'
import { getLocalSource } from '../store/cropLocalStore'

/** Konu atanmamış sorular için klasör adı (kırmızı klasör) */
export const BANK_NO_TOPIC_LABEL = 'Konu adı yok'

/** Eski kayıtlarla uyumluluk */
const BANK_NO_TOPIC_ALIASES = new Set(['Konu adı yok', 'Konu yok'])

export function isBankNoTopicFolderName(name: string | null | undefined): boolean {
  return !!name && BANK_NO_TOPIC_ALIASES.has(name.trim())
}

/** Klasör içinden PDF kırpınca soru bankasına otomatik kayıt hedefi */
export type BankCropTarget = {
  /** Doğrudan kayıt klasörü; null ise ensureBankFolderPath(ders, konu) kullanılır */
  folderId: string | null
  ders: string
  konu: string | null
  /** Kırpma bitince dönülecek klasör (genelde aktif klasör) */
  returnFolderId: string | null
  label: string
}

export function folderAncestorChain(
  folderId: string,
  folders: PdfFolder[],
): PdfFolder[] {
  const byId = new Map(folders.map((f) => [f.id, f]))
  const chain: PdfFolder[] = []
  let cur: PdfFolder | undefined = byId.get(folderId)
  while (cur) {
    chain.unshift(cur)
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined
  }
  return chain
}

/**
 * Aktif klasörden ders/konu çıkarır.
 * - Matematik → ders=Matematik, konu yok → "Konu adı yok" altına
 * - Matematik/Polinomlar → ders+konu, mevcut klasöre
 */
export function resolveBankCropTarget(
  activeFolderId: string | null,
  folders: PdfFolder[],
): BankCropTarget | null {
  if (!activeFolderId) return null
  const chain = folderAncestorChain(activeFolderId, folders)
  if (chain.length === 0) return null
  const dersFolder = chain[0]!
  const ders = dersFolder.name.trim()
  if (!ders) return null

  if (chain.length === 1) {
    return {
      folderId: null,
      ders,
      konu: null,
      returnFolderId: dersFolder.id,
      label: `${ders} / ${BANK_NO_TOPIC_LABEL}`,
    }
  }

  const leaf = chain[chain.length - 1]!
  if (isBankNoTopicFolderName(leaf.name)) {
    return {
      folderId: leaf.id,
      ders,
      konu: null,
      returnFolderId: leaf.id,
      label: `${ders} / ${BANK_NO_TOPIC_LABEL}`,
    }
  }

  const konu = leaf.name.trim()
  return {
    folderId: leaf.id,
    ders,
    konu,
    returnFolderId: leaf.id,
    label: `${ders} / ${konu}`,
  }
}

/**
 * Ders → Konu (veya "Konu adı yok") klasör yolunu oluşturur / bulur.
 * Konu yoksa ders altında kırmızı "Konu adı yok" klasörüne kaydeder.
 */
export async function ensureBankFolderPath(
  ders: string,
  konu: string | null,
): Promise<string> {
  const { api } = await import('../api/client')
  const dersName = ders.trim()
  if (!dersName) throw new Error('Ders zorunludur')
  const noTopic = !konu?.trim()
  const childName = noTopic ? BANK_NO_TOPIC_LABEL : konu!.trim()

  let { folders } = await api.pdfs.folders.list()
  let dersFolder = folders.find(
    (f) => (f.parent_id ?? null) === null && f.name === dersName,
  )
  if (!dersFolder) {
    const created = await api.pdfs.folders.create(dersName, null)
    dersFolder = created.folder
    folders = [...folders, dersFolder]
  }

  let child = folders.find(
    (f) =>
      (f.parent_id ?? null) === dersFolder!.id &&
      (noTopic ? isBankNoTopicFolderName(f.name) : f.name === childName),
  )
  if (!child) {
    const created = await api.pdfs.folders.create(childName, dersFolder.id)
    child = created.folder
  }
  return child.id
}

/** Ders klasörünün altındaki konu klasör adları (Konu adı yok hariç). */
export function listKonuFoldersForDers(ders: string, folders: PdfFolder[]): string[] {
  const dersName = ders.trim()
  if (!dersName) return []
  const dersFolder = folders.find(
    (f) => (f.parent_id ?? null) === null && f.name === dersName,
  )
  if (!dersFolder) return []
  return folders
    .filter((f) => (f.parent_id ?? null) === dersFolder.id)
    .map((f) => f.name.trim())
    .filter((name) => name.length > 0 && !isBankNoTopicFolderName(name))
    .sort((a, b) => a.localeCompare(b, 'tr'))
}

/** Ayarlar + klasörlerden birleşik konu listesi. */
export function mergeKonuOptions(
  ders: string,
  folders: PdfFolder[],
  konuByDers?: Record<string, string[]>,
): string[] {
  const set = new Set<string>()
  for (const k of listKonuFoldersForDers(ders, folders)) set.add(k)
  for (const k of konuByDers?.[ders] ?? []) {
    const t = k.trim()
    if (t && !isBankNoTopicFolderName(t)) set.add(t)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'tr'))
}

/**
 * Konu ekler: klasör oluşturur + ayarlara yazar.
 * konu null → "Konu adı yok" klasörü.
 */
export async function ensureKonuAndFolder(
  ders: string,
  konu: string | null,
): Promise<{ folderId: string }> {
  const { api } = await import('../api/client')
  const folderId = await ensureBankFolderPath(ders, konu)
  const trimmed = konu?.trim() ?? ''
  if (trimmed) {
    await api.bankQuestions.addKonu(ders.trim(), trimmed)
  }
  return { folderId }
}

/** Sorunun konusunu günceller ve ilgili klasöre taşır. */
export async function updateBankQuestionKonu(
  questionId: string,
  ders: string,
  konu: string | null,
): Promise<BankQuestionItem> {
  const { api } = await import('../api/client')
  const { folderId } = await ensureKonuAndFolder(ders, konu)
  return api.bankQuestions.update(questionId, {
    konu: konu?.trim() ? konu.trim() : null,
    folder_id: folderId,
  })
}

export async function resolveBankSaveFolderId(target: BankCropTarget): Promise<string> {
  if (target.folderId) return target.folderId
  return ensureBankFolderPath(target.ders, target.konu)
}

export async function getQuestionImageBase64Raw(question: QuestionItem): Promise<string> {
  if (question.image_base64?.trim()) {
    const raw = question.image_base64.trim()
    return raw.includes(',') ? raw.split(',')[1]! : raw
  }
  const { api } = await import('../api/client')
  const dataUrl = await api.questions.getImageDataUrl(question.id)
  if (!dataUrl) throw new Error('Soru görseli bulunamadı')
  return dataUrl.includes(',') ? dataUrl.split(',')[1]! : dataUrl
}

export async function resolveSourcePdfMeta(question: QuestionItem): Promise<{
  sourcePdfId: string
  sourcePdfFilename: string
}> {
  const localId = question.localPdfId
  if (localId) {
    const src = getLocalSource(localId)
    return {
      sourcePdfId: localId,
      sourcePdfFilename: src?.filename ?? localId,
    }
  }
  if (question.pdf_id) {
    try {
      const { api } = await import('../api/client')
      const { items } = await api.pdfs.list()
      const pdf = items.find((p) => p.id === question.pdf_id)
      return {
        sourcePdfId: question.pdf_id,
        sourcePdfFilename: pdf?.filename ?? question.pdf_id,
      }
    } catch {
      return {
        sourcePdfId: question.pdf_id,
        sourcePdfFilename: question.pdf_id,
      }
    }
  }
  return { sourcePdfId: 'unknown', sourcePdfFilename: 'Bilinmeyen PDF' }
}

export async function saveQuestionItemToBank(
  question: QuestionItem,
  target: { ders: string; konu: string | null; folderId: string },
): Promise<BankQuestionItem> {
  const { api } = await import('../api/client')
  const imageBase64 = await getQuestionImageBase64Raw(question)
  const { sourcePdfId, sourcePdfFilename } = await resolveSourcePdfMeta(question)
  return api.bankQuestions.create({
    ders: target.ders,
    konu: target.konu,
    difficulty: question.difficulty ?? null,
    folder_id: target.folderId,
    source_pdf_id: sourcePdfId,
    source_pdf_filename: sourcePdfFilename,
    page_number: question.page_number,
    crop: question.crop,
    answer_key: question.answer_key,
    content_type: question.content_type,
    remove_background: question.remove_background,
    image_base64: imageBase64,
    layoutMode: question.layoutMode,
    manualScale: question.manualScale,
    normalizationScale: question.normalizationScale,
    capture: question.capture,
    fontReference: question.fontReference,
  })
}

export function bankQuestionToQuestionItem(
  bank: BankQuestionItem,
  imageBase64: string,
  orderIndex: number,
): QuestionItem {
  const raw = imageBase64.includes(',') ? imageBase64.split(',')[1]! : imageBase64
  return {
    id: crypto.randomUUID(),
    pdf_id: bank.source_pdf_id,
    page_number: bank.page_number,
    crop: bank.crop,
    answer_key: bank.answer_key,
    order_index: orderIndex,
    content_type: bank.content_type,
    remove_background: bank.remove_background,
    image_base64: raw,
    localPdfId: bank.source_pdf_id.startsWith('local:')
      ? bank.source_pdf_id.slice(6)
      : bank.source_pdf_id,
    manualScale: bank.manualScale ?? 1,
    normalizationScale: bank.normalizationScale ?? 1,
    fontMeasurementRevision: 0,
    layoutMode: bank.layoutMode ?? 'single-column',
    capture: bank.capture,
    fontReference: bank.fontReference,
    difficulty: bank.difficulty ?? null,
    ders: bank.ders,
    konu: bank.konu ?? null,
    category: bank.konu ?? null,
    bankSourceId: bank.id,
  }
}

function cropsNearlyEqual(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  eps = 0.004,
): boolean {
  return (
    Math.abs(a.x - b.x) <= eps &&
    Math.abs(a.y - b.y) <= eps &&
    Math.abs(a.width - b.width) <= eps &&
    Math.abs(a.height - b.height) <= eps
  )
}

/** Aynı PDF sayfa + kırpım bankada var mı? */
export async function findDuplicateBankQuestion(
  question: QuestionItem,
): Promise<BankQuestionItem | null> {
  const { api } = await import('../api/client')
  const { sourcePdfId } = await resolveSourcePdfMeta(question)
  const { items } = await api.bankQuestions.list({})
  const localId = question.localPdfId ?? null
  const pdfId = question.pdf_id || null
  const match = items.find((b) => {
    const sameSource =
      b.source_pdf_id === sourcePdfId ||
      (localId != null &&
        (b.source_pdf_id === localId ||
          b.source_pdf_id === `local:${localId}`)) ||
      (pdfId != null &&
        pdfId !== '' &&
        (b.source_pdf_id === pdfId || b.source_pdf_id === `local:${pdfId}`))
    return (
      sameSource &&
      b.page_number === question.page_number &&
      cropsNearlyEqual(b.crop, question.crop)
    )
  })
  return match ?? null
}
