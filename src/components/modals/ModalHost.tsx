import { useEditorStore } from '../../store/editorStore'
import QuestionEditorModal from './QuestionEditorModal'
import AddImageModal from './AddImageModal'
import PickDraftQuestionsModal from './PickDraftQuestionsModal'
import GoogleDriveModal from './GoogleDriveModal'

export default function ModalHost() {
  const openModal = useEditorStore((s) => s.openModal)
  const setOpenModal = useEditorStore((s) => s.setOpenModal)
  if (!openModal) return null
  const close = () => setOpenModal(null)

  switch (openModal) {
    case 'question-editor':
      return <QuestionEditorModal onClose={close} />
    case 'add-image':
      return <AddImageModal onClose={close} />
    case 'pick-draft-questions':
      return <PickDraftQuestionsModal onClose={close} />
    case 'google-drive':
      return <GoogleDriveModal onClose={close} />
    case 'pdf-bank':
    case 'save-draft':
    case 'load-draft':
      return null
    default:
      return null
  }
}
