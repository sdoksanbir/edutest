import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const md = fs.readFileSync(path.join(root, 'CROP_TOOL_EXPORT.md'), 'utf8')

function extractSection(sectionNum, lang) {
  const header = new RegExp(`^## ${sectionNum}\\.`, 'm')
  const match = header.exec(md)
  if (!match) throw new Error(`Section ${sectionNum} not found`)
  const start = match.index
  const nextHeader = md.indexOf('\n## ', start + 4)
  const chunk = nextHeader === -1 ? md.slice(start) : md.slice(start, nextHeader)
  const fence = lang === 'js' ? '```js' : '```tsx'
  const i = chunk.indexOf(fence)
  if (i === -1) throw new Error(`No ${fence} in section ${sectionNum}`)
  const j = chunk.indexOf('```', i + fence.length)
  return chunk.slice(i + fence.length + 1, j).replace(/^\n/, '').replace(/\n$/, '')
}

const outputs = [
  [7, 'tsx', 'src/components/crop/CropWorkspace.tsx'],
  [8, 'tsx', 'src/components/crop/InlineAnswerBar.tsx'],
  [9, 'tsx', 'src/components/crop/SelectionOverlay.tsx'],
  [10, 'tsx', 'src/components/crop/SortableSelectionItem.tsx'],
  [11, 'tsx', 'src/store/cropLocalStore.ts'],
  [12, 'tsx', 'src/utils/cropCoordUtils.ts'],
  [13, 'tsx', 'src/utils/pdfClient.ts'],
  [14, 'tsx', 'src/utils/imageValidation.ts'],
  [15, 'tsx', 'src/utils/questionNumbering.ts'],
  [16, 'tsx', 'src/components/modals/PdfDeleteModal.tsx'],
  [17, 'tsx', 'src/components/modals/LocalPdfDeleteModal.tsx'],
  [18, 'tsx', 'src/components/modals/ConfirmModal.tsx'],
]

for (const [num, lang, out] of outputs) {
  const content = extractSection(num, lang)
  const full = path.join(root, out)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content + '\n')
  console.log('Wrote', out)
}
