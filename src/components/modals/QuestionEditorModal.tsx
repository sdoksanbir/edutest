import ModalShell from './ModalShell'
import { useEditorStore } from '../../store/editorStore'

export default function QuestionEditorModal({ onClose }: { onClose: () => void }) {
  const questions = useEditorStore((s) => s.questions)

  return (
    <ModalShell title="Soru Editörü" onClose={onClose} wide>
      <p className="mb-3 text-sm text-slate-500">
        Tuvalde {questions.length} soru var. Detaylı düzenleme soru kartlarından yapılır.
      </p>
      <button type="button" className="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm text-white" onClick={onClose}>
        Tamam
      </button>
    </ModalShell>
  )
}
