import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const md = fs.readFileSync(path.join(root, 'PREPARE_PAPER_EXPORT.md'), 'utf8')

function extractSection(sectionNum) {
  const header = new RegExp(`^## ${sectionNum}\\.`, 'm')
  const match = header.exec(md)
  if (!match) throw new Error(`Section ${sectionNum} not found`)
  const start = match.index
  const nextHeader = md.indexOf('\n## ', start + 4)
  const chunk = nextHeader === -1 ? md.slice(start) : md.slice(start, nextHeader)
  for (const fence of ['```tsx', '```ts', '```css']) {
    const i = chunk.indexOf(fence)
    if (i === -1) continue
    const j = chunk.indexOf('```', i + fence.length)
    return chunk.slice(i + fence.length + 1, j).replace(/^\n/, '').replace(/\n$/, '')
  }
  throw new Error(`No code fence in section ${sectionNum}`)
}

const outputs = [
  [1, 'src/components/forms/PreparePaperButton.tsx'],
  [2, 'src/components/modals/PdfPreviewModal.tsx'],
  [3, 'src/components/pdf/CanvasPdfPreview.tsx'],
  [4, 'src/components/pdf/ColumnOverlaySelector.tsx'],
  [5, 'src/components/pdf/PdfCanvasViewer.tsx'],
  [6, 'src/components/modals/ColumnRedistributePopover.tsx'],
  [7, 'src/components/modals/SectionAddModal.tsx'],
  [8, 'src/styles/pdfPreviewTheme.ts'],
  [9, 'src/utils/pdfLayoutGeometry.ts'],
  [10, 'src/utils/columnRedistribute.ts'],
  [11, 'src/utils/answerKeyLayout.ts'],
  [12, 'src/utils/paperSizePayload.ts'],
  [13, 'src/utils/layoutYTopOverridesPayload.ts'],
  [14, 'src/utils/separateAnswerKeyPageCount.ts'],
  [15, 'src/utils/writtenPaperTitle.ts'],
  [16, 'src/constants/writtenHeaderFields.ts'],
  [17, 'src/constants/paperSizes.ts'],
]

for (const [num, out] of outputs) {
  const content = extractSection(num)
  const full = path.join(root, out)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content + '\n')
  console.log('Wrote', out)
}

const scrollCss = extractSection(21)
const scrollMatch = scrollCss.match(/\.pdf-preview-scroll[\s\S]*$/)
if (scrollMatch) {
  const stylesPath = path.join(root, 'src/styles.css')
  let styles = fs.readFileSync(stylesPath, 'utf8')
  if (!styles.includes('.pdf-preview-scroll')) {
    styles += '\n\n' + scrollMatch[0].trim() + '\n'
    fs.writeFileSync(stylesPath, styles)
    console.log('Appended pdf-preview-scroll to src/styles.css')
  }
}
