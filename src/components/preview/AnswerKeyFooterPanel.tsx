import { useEffect, useState } from "react";
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

const ANSWER_KEY_MODE_LABELS: Record<AnswerKeyMode, string> = {
  per_page: "Her sayfanın altına",
  separate_page: "Ayrı sayfa",
  end_of_test: "Ayrı sayfa",
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

type AnswerKeyFooterPanelProps = {
  /** Deneme: sadece switch — ayrı sayfa; ayar modalı yok */
  trialMode?: boolean;
};

export default function AnswerKeyFooterPanel({
  trialMode = false,
}: AnswerKeyFooterPanelProps) {
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

  const optikBlockedByPerPage =
    !trialMode && options.includeAnswerKey && answerKeyMode === "per_page";

  useEffect(() => {
    if (optikBlockedByPerPage && optikFormEnabled) {
      setOptikFormEnabled(false);
    }
  }, [optikBlockedByPerPage, optikFormEnabled, setOptikFormEnabled]);

  useEffect(() => {
    if (trialMode && options.includeAnswerKey && answerKeyMode !== "separate_page") {
      setAnswerKeyMode("separate_page");
    }
  }, [trialMode, options.includeAnswerKey, answerKeyMode, setAnswerKeyMode]);

  const openAnswerKeyModal = () => setShowAnswerKeyModal(true);

  const handleAnswerKeyCancel = () => {
    setShowAnswerKeyModal(false);
  };

  const handleAnswerKeyToggle = () => {
    if (options.includeAnswerKey) {
      toggleOption("includeAnswerKey");
      return;
    }
    if (trialMode) {
      setAnswerKeyMode("separate_page");
      toggleOption("includeAnswerKey");
      return;
    }
    setShowAnswerKeyModal(true);
  };

  const handleOptikToggle = () => {
    if (optikBlockedByPerPage) return;
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
            {trialMode ? (
              <span className={`flex min-w-0 items-center gap-2 ${t.link}`}>
                <KeyRound className="pdf-preview-panel-option-icon" aria-hidden />
                <span>Cevap anahtarı</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (options.includeAnswerKey) openAnswerKeyModal();
                  else handleAnswerKeyToggle();
                }}
                className={`flex min-w-0 items-center gap-2 text-left ${t.link}`}
              >
                <KeyRound className="pdf-preview-panel-option-icon" aria-hidden />
                <span>Cevap anahtarı</span>
              </button>
            )}
            <BlueToggle
              checked={options.includeAnswerKey}
              onChange={handleAnswerKeyToggle}
              label="Cevap anahtarı"
            />
          </div>

          {options.includeAnswerKey && !trialMode ? (
            <div className="space-y-2">
              <p className={`text-xs ${t.labelMuted}`}>
                Yerleşim:{" "}
                {ANSWER_KEY_MODE_LABELS[answerKeyMode] ??
                  ANSWER_KEY_MODE_LABELS.separate_page}
              </p>
              <button
                type="button"
                onClick={openAnswerKeyModal}
                className={`w-full rounded-md py-2 text-xs font-medium ${t.segInactive}`}
              >
                Cevap anahtarı ayarları
              </button>
            </div>
          ) : null}

          {options.includeAnswerKey && trialMode ? (
            <p className={`text-xs ${t.labelMuted}`}>
              Ayrı sayfada eklenir
              {optikFormEnabled ? " (optik formdan sonra, en son sayfa)" : ""}.
            </p>
          ) : null}
        </div>

        <div
          className={`pdf-preview-collapsible-section space-y-2.5 ${
            optikBlockedByPerPage ? "pointer-events-none opacity-45" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                if (optikBlockedByPerPage) return;
                setShowOptikSettings(true);
              }}
              className={`flex min-w-0 items-center gap-2 text-left ${t.link}`}
            >
              <ScanLine className="pdf-preview-panel-option-icon" aria-hidden />
              <span>Optik form</span>
            </button>
            <BlueToggle
              checked={optikFormEnabled && !optikBlockedByPerPage}
              onChange={handleOptikToggle}
              label="Optik form"
            />
          </div>

          {optikBlockedByPerPage ? (
            <p className={`text-xs ${t.labelMuted}`}>
              Her sayfanın altına cevap anahtarı seçiliyken optik form kullanılamaz.
            </p>
          ) : null}

          {optikFormEnabled && !optikBlockedByPerPage ? (
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

      {!trialMode ? (
        <AnswerKeyModeModal
          open={showAnswerKeyModal}
          onClose={handleAnswerKeyCancel}
          onConfirm={handleAnswerKeyConfirm}
          currentMode={answerKeyMode}
          themeColor={themeColor}
        />
      ) : null}

      <OptikFormSettingsModal open={showOptikSettings} onClose={() => setShowOptikSettings(false)} />
    </>
  );
}
