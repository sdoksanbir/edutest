import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import AppTopBar from "./AppTopBar";
import QuestionCanvas from "../editor/QuestionCanvas";
import QuestionBankExplorer from "../bank/QuestionBankExplorer";
import ModalHost from "../modals/ModalHost";
import { useEditorStore } from "../../store/editorStore";

export default function AppShell() {
  const { pathname } = useLocation();
  const isBank = pathname === "/soru-bankasi";
  const activeTab = useEditorStore((s) => s.activeTab);
  const writtenPaperPrepared = useEditorStore((s) => s.writtenPaperPrepared);
  const setWrittenPaperPrepared = useEditorStore((s) => s.setWrittenPaperPrepared);

  const showWrittenBack =
    !isBank && activeTab === "written-paper" && writtenPaperPrepared;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <AppTopBar
        leftSlot={
          showWrittenBack ? (
            <button
              type="button"
              onClick={() => setWrittenPaperPrepared(false)}
              className="tq-app-topbar__back"
              aria-label="Soru düzenlemeye geri dön"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <span>Geri dön</span>
            </button>
          ) : undefined
        }
      />
      <div className="flex min-h-0 min-w-0 flex-1 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200">
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {isBank ? <QuestionBankExplorer /> : <QuestionCanvas />}
        </div>
      </div>
      <ModalHost />
    </div>
  );
}
