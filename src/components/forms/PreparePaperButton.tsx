import { useState, type ReactNode } from "react";

import { useEditorStore } from "../../store/editorStore";

import PdfPreviewModal from "../modals/PdfPreviewModal";



type PreparePaperButtonProps = {

  variant?: "default" | "dash";

  children?: ReactNode;

};



/** Eski masaüstü projesindeki gibi: tıklanınca PDF önizleme diyaloğu açılır. */

export default function PreparePaperButton({ variant = "default", children }: PreparePaperButtonProps) {

  const questions = useEditorStore((s) => s.questions);

  const activeTab = useEditorStore((s) => s.activeTab);

  const [error, setError] = useState<string | null>(null);

  const [showPreview, setShowPreview] = useState(false);



  const handleClick = () => {

    if (questions.length === 0) {

      setError("Lütfen önce soru ekleyin.");

      return;

    }

    setError(null);

    setShowPreview(true);

  };



  const isDash = variant === "dash";



  return (

    <div className="flex min-w-0 flex-col gap-2">

      {error && <p className="tq-helper-error">{error}</p>}

      <button

        type="button"

        onClick={handleClick}

        disabled={questions.length === 0}

        className={isDash ? "tq-dash-prepare-btn" : "tq-sidebar-cta tq-sidebar-cta--prepare shadow-sm"}

      >

        {isDash ? (

          <>

            <span className="tq-dash-prepare-btn__icon" aria-hidden>

              {children}

            </span>

            <span className="tq-dash-prepare-btn__label">Kağıdı Hazırla</span>

          </>

        ) : (

          "Kağıdı Hazırla"

        )}

      </button>

      <PdfPreviewModal

        isOpen={showPreview}

        onClose={() => setShowPreview(false)}

        variant={
          activeTab === "trial-exam"
            ? "trial"
            : activeTab === "written-paper"
              ? "written"
              : "test"
        }

      />

    </div>

  );

}

