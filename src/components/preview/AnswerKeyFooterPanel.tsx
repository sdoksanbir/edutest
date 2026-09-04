import { useState } from "react";
import { KeyRound, ScanLine } from "lucide-react";
import { useEditorStore, type AnswerKeyMode } from "../../store/editorStore";
import AnswerKeyModeModal from "../modals/AnswerKeyModeModal";
import OptikFormSettingsModal from "../modals/OptikFormSettingsModal";
import { usePdfPreviewUi } from "./PdfPreviewUiThemeContext";
import CollapsibleCard from "./CollapsibleCard";

import { answerKeyModeToPlacement } from "../../utils/opticalFormSettings";

const PLACEMENT_LABELS: Record<string, string> = {
  compact: "Kompakt (son sayfa, sağ sütun)",
  separate_page: "Ayrı sayfa",
  end_of_test: "Kompakt (son sayfa, sağ sütun)",
  per_page: "Her sayfanın altına",
};

function BlueToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  const { tokens: t } = usePdfPreviewUi();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-5 w-9 shrink-0 rounded-full transition ${
        checked ? t.toggleOn : t.toggleOff
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
          checked ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

export default function AnswerKeyFooterPanel() {
  const { tokens: t } = usePdfPreviewUi();
  const options = useEditorStore((s) => s.options);
  const answerKeyMode = useEditorStore((s) => s.answerKeyMode);
  const themeColor = useEditorStore((s) => s.themeColor);
  const optikFormEnabled = useEditorStore((s) => s.optikFormEnabled);
  const optikFormPlacement = useEditorStore((s) => s.optikFormPlacement);

  const toggleOption = useEditorStore((s) => s.toggleOption);
  const setAnswerKeyMode = useEditorStore((s) => s.setAnswerKeyMode);
  const setOptikFormEnabled = useEditorStore((s) => s.setOptikFormEnabled);

  const [showAnswerKeyModal, setShowAnswerKeyModal] = useState(false);
  const [showOptikSettings, setShowOptikSettings] = useState(false);

  const openAnswerKeyModal = () => setShowAnswerKeyModal(true);

  const handleAnswerKeyCancel = () => {
    setShowAnswerKeyModal(false);
  };

  const handleOptikToggle = () => {
    if (optikFormEnabled) {
      setOptikFormEnabled(false);
      return;
    }
    setOptikFormEnabled(true);
    setShowOptikSettings(true);
  };

  const handleAnswerKeyConfirm = (mode: AnswerKeyMode) => {
    setAnswerKeyMode(mode);
    if (!options.includeAnswerKey) toggleOption("includeAnswerKey");
    setShowAnswerKeyModal(false);
  };

  return (
    <>
      <CollapsibleCard
        title="Cevap Anahtarı"
        className="mb-0 pdf-preview-collapsible pdf-preview-answer-key-panel"
        contentClassName="space-y-0"
        defaultOpen={false}
      >
        <div className="pdf-preview-collapsible-section space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={openAnswerKeyModal}
              className={`flex min-w-0 items-center gap-2 text-left ${t.link}`}
            >
              <KeyRound className="pdf-preview-panel-option-icon" aria-hidden />
              <span>Cevap anahtarı</span>
            </button>
            <BlueToggle
              checked={options.includeAnswerKey}
              onChange={openAnswerKeyModal}
              label="Cevap anahtarı"
            />
          </div>
        </div>

        <div className="pdf-preview-collapsible-section space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowOptikSettings(true)}
              className={`flex min-w-0 items-center gap-2 text-left ${t.link}`}
            >
              <ScanLine className="pdf-preview-panel-option-icon" aria-hidden />
              <span>Optik form</span>
            </button>
            <BlueToggle
              checked={optikFormEnabled}
              onChange={handleOptikToggle}
              label="Optik form"
            />
          </div>

          {optikFormEnabled ? (
            <div className="space-y-2">
              <p className={`text-xs ${t.labelMuted}`}>
                Yerleşim: {PLACEMENT_LABELS[answerKeyModeToPlacement(optikFormPlacement)]}
              </p>
              <button
                type="button"
                onClick={() => setShowOptikSettings(true)}
                className={`w-full rounded-md py-2 text-xs font-medium ${t.segInactive}`}
              >
                Optik form ayarları
              </button>
            </div>
          ) : null}
        </div>
      </CollapsibleCard>

      <AnswerKeyModeModal
        open={showAnswerKeyModal}
        onClose={handleAnswerKeyCancel}
        onConfirm={handleAnswerKeyConfirm}
        currentMode={answerKeyMode}
        themeColor={themeColor}
      />

      <OptikFormSettingsModal open={showOptikSettings} onClose={() => setShowOptikSettings(false)} />
    </>
  );
}
