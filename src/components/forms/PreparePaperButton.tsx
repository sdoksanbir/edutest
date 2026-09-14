import { useState, type ReactNode } from "react";
import { useEditorStore } from "../../store/editorStore";
import PdfPreviewModal from "../modals/PdfPreviewModal";
import { questionsForTab } from "../../utils/questionsForTab";

type PreparePaperButtonProps = {
  variant?: "default" | "dash";
  children?: ReactNode;
};

/**
 * Test / fasikül / deneme: PDF önizleme açar.
 * Yazılı: yalnızca kağıt hazır görünümü (sol ayarlar + WrittenPaperSheet) — eski PdfPreviewModal yok.
 */
export default function PreparePaperButton({ variant = "default", children }: PreparePaperButtonProps) {
  const questions = useEditorStore((s) => s.questions);
  const activeTab = useEditorStore((s) => s.activeTab);
  const setWrittenPaperPrepared = useEditorStore((s) => s.setWrittenPaperPrepared);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const moduleQuestions = questionsForTab(questions, activeTab);
  const isWritten = activeTab === "written-paper";

  const handleClick = () => {
    if (moduleQuestions.length === 0) {
      setError("Lütfen önce soru ekleyin.");
      return;
    }
    setError(null);
    if (isWritten) {
      setWrittenPaperPrepared(true);
      return;
    }
    setShowPreview(true);
  };

  const isDash = variant === "dash";

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {error && <p className="tq-helper-error">{error}</p>}
      <button
        type="button"
        onClick={handleClick}
        disabled={moduleQuestions.length === 0}
        className={isDash ? "tq-dash-prepare-btn" : "tq-sidebar-cta tq-sidebar-cta--prepare shadow-sm"}
      >
        {isDash ? (
          <>
            <span className="tq-dash-prepare-btn__icon" aria-hidden>
              {children}
            </span>
            <span className="tq-dash-prepare-btn__label">KAĞIDI HAZIRLA</span>
          </>
        ) : (
          "Kağıdı Hazırla"
        )}
      </button>
      {!isWritten ? (
        <PdfPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          variant={
            activeTab === "trial-exam"
              ? "trial"
              : activeTab === "fasikul-paper"
                ? "fasikul"
                : "test"
          }
        />
      ) : null}
    </div>
  );
}
