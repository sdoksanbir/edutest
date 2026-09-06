import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import AppTopBar from './AppTopBar'
import QuestionCanvas from '../editor/QuestionCanvas'
import QuestionBankExplorer from '../bank/QuestionBankExplorer'
import ModalHost from '../modals/ModalHost'

export default function AppShell() {
  const { pathname } = useLocation()
  const isBank = pathname === '/soru-bankasi'

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <AppTopBar />
      <div className="flex min-h-0 min-w-0 flex-1 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200">
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {isBank ? <QuestionBankExplorer /> : <QuestionCanvas />}
        </div>
      </div>
      <ModalHost />
    </div>
  )
}
