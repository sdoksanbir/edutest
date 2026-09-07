import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const md = fs.readFileSync(path.join(root, 'QUESTION_CANVAS_EXPORT.md'), 'utf8')

function extractSection(sectionNum, lang) {
  const header = new RegExp(`^## ${sectionNum}\\.`, 'm')
  const match = header.exec(md)
  if (!match) throw new Error(`Section ${sectionNum} not found`)
  const start = match.index
  const nextHeader = md.indexOf('\n## ', start + 4)
  const chunk = nextHeader === -1 ? md.slice(start) : md.slice(start, nextHeader)
  const fence = lang === 'ts' ? '```ts' : '```tsx'
  const i = chunk.indexOf(fence)
  if (i === -1) throw new Error(`No ${fence} in section ${sectionNum}`)
  const j = chunk.indexOf('```', i + fence.length)
  return chunk.slice(i + fence.length + 1, j).replace(/^\n/, '').replace(/\n$/, '')
}

const outputs = [
  [1, 'tsx', 'src/components/editor/QuestionCanvas.tsx'],
  [2, 'tsx', 'src/components/editor/QuestionGrid.tsx'],
  [3, 'tsx', 'src/components/editor/QuestionCard.tsx'],
  [4, 'tsx', 'src/components/editor/QuestionCardContent.tsx'],
  [5, 'tsx', 'src/components/editor/QuestionAnswerChips.tsx'],
  [6, 'tsx', 'src/components/editor/QuestionPreviewModal.tsx'],
  [7, 'tsx', 'src/components/editor/QuestionImageMathTextModal.tsx'],
  [8, 'tsx', 'src/components/editor/ExplanationCaptionModal.tsx'],
  [9, 'tsx', 'src/utils/questionNumbering.ts'],
  [10, 'ts', 'src/utils/plainTextPreviewCanvas.ts'],
  [11, 'ts', 'src/utils/questionImageFontEstimate.ts'],
  [12, 'ts', 'src/utils/compositeQuestionImage.ts'],
  [13, 'ts', 'src/utils/latexToCanvas.ts'],
]

for (const [num, lang, out] of outputs) {
  const content = extractSection(num, lang)
  const full = path.join(root, out)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content + '\n')
  console.log('Wrote', out)
}
