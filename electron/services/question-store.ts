import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { imagesDir } from './paths.js'

export type CropBox = {
  x: number
  y: number
  width: number
  height: number
}

export type QuestionItem = {
  id: string
  pdf_id: string
  page_number: number
  crop: CropBox
  answer_key: string
  order_index: number
  content_type: 'question' | 'explanation'
  remove_background: boolean
  image_path?: string
  image_base64?: string
  display_scale?: number
  custom_gap_mm?: number
  [key: string]: unknown
}

const questions: QuestionItem[] = []

function saveImageFromBase64(imageBase64: string): string {
  fs.mkdirSync(imagesDir(), { recursive: true })
  const raw = imageBase64.includes(',') ? imageBase64.split(',')[1]! : imageBase64
  const id = randomUUID()
  const filePath = path.join(imagesDir(), `${id}.png`)
  fs.writeFileSync(filePath, Buffer.from(raw, 'base64'))
  return filePath
}

export function listQuestions() {
  return [...questions]
}

export function createFromPdf(payload: {
  pdf_id: string
  page_number: number
  crop: CropBox
  answer_key: string
  image_base64?: string
}): QuestionItem {
  const item: QuestionItem = {
    id: randomUUID(),
    pdf_id: payload.pdf_id,
    page_number: payload.page_number,
    crop: payload.crop,
    answer_key: payload.answer_key,
    order_index: questions.length,
    content_type: 'question',
    remove_background: false,
    image_path: payload.image_base64 ? saveImageFromBase64(payload.image_base64) : undefined,
  }
  questions.push(item)
  return item
}

export function createFromLocalPdf(payload: {
  page_number: number
  crop: CropBox
  answer_key: string
  image_base64: string
}): QuestionItem {
  const item: QuestionItem = {
    id: randomUUID(),
    pdf_id: '',
    page_number: payload.page_number,
    crop: payload.crop,
    answer_key: payload.answer_key,
    order_index: questions.length,
    content_type: 'question',
    remove_background: false,
    image_path: saveImageFromBase64(payload.image_base64),
  }
  questions.push(item)
  return item
}

function find(id: string) {
  const q = questions.find((x) => x.id === id)
  if (!q) throw new Error('Question not found')
  return q
}

export function updateAnswer(id: string, answer_key: string) {
  find(id).answer_key = answer_key
  return find(id)
}

export function updateCrop(id: string, crop: CropBox) {
  find(id).crop = crop
  return find(id)
}

export function updateContentType(id: string, content_type: 'question' | 'explanation') {
  find(id).content_type = content_type
  return find(id)
}

export function updateRemoveBackground(id: string, remove_background: boolean) {
  find(id).remove_background = remove_background
  return find(id)
}

export function updateExplanationCaption(id: string, body: Record<string, unknown>) {
  const q = find(id)
  Object.assign(q, body)
  return q
}

export function reorder(ordered_ids: string[]) {
  const byId = Object.fromEntries(questions.map((q) => [q.id, q]))
  const next = ordered_ids.map((id, index) => ({ ...byId[id]!, order_index: index }))
  questions.splice(0, questions.length, ...next)
  return listQuestions()
}

export function remove(id: string) {
  const idx = questions.findIndex((q) => q.id === id)
  if (idx < 0) return
  questions.splice(idx, 1)
}

export function replaceAll(items: QuestionItem[]) {
  questions.splice(0, questions.length, ...items)
}

export function clearAll() {
  questions.splice(0, questions.length)
}

export function getImageBase64(id: string): string {
  const q = find(id)
  if (q.image_path && fs.existsSync(q.image_path)) {
    return fs.readFileSync(q.image_path).toString('base64')
  }
  if (q.image_base64) {
    return q.image_base64.includes(',') ? q.image_base64.split(',')[1]! : q.image_base64
  }
  throw new Error('Question image not found')
}
