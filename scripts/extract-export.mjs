import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const md = fs.readFileSync(path.join(root, 'MODALS_AND_SIDEBAR_EXPORT.md'), 'utf8')

function extractSection(sectionNum, lang) {
  const header = new RegExp(`^## ${sectionNum}\\.`, 'm')
  const match = header.exec(md)
  if (!match) throw new Error(`Section ${sectionNum} not found`)
  const start = match.index
  const nextHeader = md.indexOf('\n## ', start + 4)
  const chunk = nextHeader === -1 ? md.slice(start) : md.slice(start, nextHeader)
  const fence = lang === 'css' ? '```css' : '```tsx'
  const i = chunk.indexOf(fence)
  if (i === -1) throw new Error(`No ${fence} in section ${sectionNum}`)
  const j = chunk.indexOf('```', i + fence.length)
  return chunk.slice(i + fence.length + 1, j).replace(/^\n/, '').replace(/\n$/, '')
}

const outputs = [
  [3, 'tsx', 'src/components/modals/TestDescriptionModal.tsx'],
  [4, 'tsx', 'src/components/modals/QuestionGapModal.tsx'],
  [5, 'tsx', 'src/components/modals/AnswerKeyModeModal.tsx'],
  [6, 'tsx', 'src/components/modals/CenterLineTextModal.tsx'],
  [7, 'tsx', 'src/components/modals/ThemeSelectModal.tsx'],
  [8, 'tsx', 'src/components/modals/WatermarkModal.tsx'],
  [9, 'tsx', 'src/components/modals/CustomMarginsModal.tsx'],
  [10, 'tsx', 'src/components/modals/WrittenExamTitleModal.tsx'],
  [11, 'tsx', 'src/components/modals/TeacherNameModal.tsx'],
  [12, 'tsx', 'src/components/modals/AddExamTypeModal.tsx'],
  [13, 'tsx', 'src/components/modals/PdfPreviewModal.tsx'],
  [14, 'tsx', 'src/components/forms/TestMetaForm.tsx'],
  [15, 'tsx', 'src/components/forms/OptionsPanel.tsx'],
  [16, 'tsx', 'src/components/forms/WrittenPaperForm.tsx'],
  [17, 'tsx', 'src/components/forms/AdvancedSettingsPanel.tsx'],
  [18, 'tsx', 'src/components/forms/ThemeButton.tsx'],
  [19, 'tsx', 'src/components/forms/PreparePaperButton.tsx'],
  [20, 'tsx', 'src/components/forms/SidebarPencilButton.tsx'],
  [21, 'tsx', 'src/components/layout/Sidebar.tsx'],
  [22, 'tsx', 'src/store/editorStore.ts'],
  [23, 'tsx', 'src/constants/writtenHeaderFields.ts'],
  [24, 'tsx', 'src/constants/paperSizes.ts'],
  [25, 'css', 'src/styles/ui.css'],
  [26, 'css', 'src/styles/tokens.css'],
]

for (const [num, lang, out] of outputs) {
  const content = extractSection(num, lang)
  const full = path.join(root, out)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content + '\n')
  console.log('Wrote', out)
}
