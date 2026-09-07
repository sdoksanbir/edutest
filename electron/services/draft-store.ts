import fs from 'node:fs'
import path from 'node:path'
import { draftsDir } from './paths.js'
import type { QuestionItem } from './question-store.js'

export type DraftInfo = {
  name: string
  updated_at: string
  question_count: number
}

export type DraftPayload = {
  name: string
  questions: QuestionItem[]
  notes?: string
  export_settings?: Record<string, unknown>
  test_info?: Record<string, unknown>
  editor_state?: Record<string, unknown>
}

export function listDrafts(): DraftInfo[] {
  fs.mkdirSync(draftsDir(), { recursive: true })
  return fs
    .readdirSync(draftsDir())
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const full = path.join(draftsDir(), f)
      const data = JSON.parse(fs.readFileSync(full, 'utf8')) as DraftPayload
      return {
        name: path.basename(f, '.json'),
        updated_at: new Date(fs.statSync(full).mtimeMs).toISOString(),
        question_count: data.questions?.length ?? 0,
      }
    })
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export function saveDraft(payload: DraftPayload): DraftInfo {
  fs.mkdirSync(draftsDir(), { recursive: true })
  const file = path.join(draftsDir(), `${payload.name}.json`)
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8')
  return {
    name: payload.name,
    updated_at: new Date().toISOString(),
    question_count: payload.questions.length,
  }
}

export function loadDraft(name: string): DraftPayload {
  const file = path.join(draftsDir(), `${name}.json`)
  if (!fs.existsSync(file)) throw new Error('Draft not found')
  return JSON.parse(fs.readFileSync(file, 'utf8')) as DraftPayload
}

export function deleteDraft(name: string): { ok: true } {
  const safe = path.basename(name)
  if (!safe || safe !== name.replace(/[/\\]/g, '')) {
    throw new Error('Geçersiz taslak adı')
  }
  const file = path.join(draftsDir(), `${safe}.json`)
  if (!fs.existsSync(file)) throw new Error('Draft not found')
  fs.unlinkSync(file)
  return { ok: true }
}
