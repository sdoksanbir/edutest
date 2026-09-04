import { useState } from "react";
import { useEditorStore } from "../../store/editorStore";
import { isCorporateHeader } from "../../utils/corporateHeaderLayout";
import TestDescriptionModal from "../modals/TestDescriptionModal";
import { usePdfPreviewUi } from "./PdfPreviewUiThemeContext";
import CollapsibleCard from "./CollapsibleCard";

function PanelToggle({
  checked,
  onClick,
  label,
  disabled = false,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  const { tokens: t } = usePdfPreviewUi();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`relative h-5 w-9 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${
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

export default function YonergePanel() {
  const { tokens: t } = usePdfPreviewUi();
  const options = useEditorStore((s) => s.options);
  const themeColor = useEditorStore((s) => s.themeColor);
  const headerStyleId = useEditorStore((s) => s.headerStyleId);
  const testDescription = useEditorStore((s) => s.testDescription);
  const descriptionColumnCount = useEditorStore((s) => s.descriptionColumnCount);
  const descriptionTexts = useEditorStore((s) => s.descriptionTexts);
  const descriptionColumnDividers = useEditorStore((s) => s.descriptionColumnDividers);
  const toggleOption = useEditorStore((s) => s.toggleOption);
  const setDescriptionColumns = useEditorStore((s) => s.setDescriptionColumns);

  const [showModal, setShowModal] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const corporateTheme = isCorporateHeader(headerStyleId);
  const yonergeOn = options.includeDescription && !corporateTheme;

  const openModal = () => {
    if (corporateTheme) return;
    setModalKey((k) => k + 1);
    setShowModal(true);
  };

  const handleToggle = () => {
    if (corporateTheme) return;
    if (yonergeOn) {
      toggleOption("includeDescription");
      return;
    }
    openModal();
  };

  const initialTexts =
    descriptionTexts.length >= descriptionColumnCount
      ? descriptionTexts
      : descriptionColumnCount === 1
        ? [testDescription || ""]
        : [testDescription || "", ...Array(descriptionColumnCount - 1).fill("")];

  return (
    <>
      <CollapsibleCard title="Yönerge" className="mb-0 pdf-preview-collapsible" defaultOpen>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={openModal}
            disabled={corporateTheme}
            className={`text-left ${t.link} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {yonergeOn ? "Yönergeyi düzenle" : "Yönerge ekle"}
          </button>
          <PanelToggle
            checked={yonergeOn}
            onClick={handleToggle}
            label={yonergeOn ? "Yönergeyi kapat" : "Yönerge ekle"}
            disabled={corporateTheme}
          />
        </div>

        {corporateTheme ? (
          <p className={`mt-2 ${t.hint}`}>
            Kurumsal başlık temalarında yönerge kutusu kullanılamaz.
          </p>
        ) : yonergeOn ? (
          <p className={`mt-2 ${t.hint}`}>
            İlk sayfa başlığının altında {descriptionColumnCount} sütunlu yönerge kutusu gösterilir.
            Metni değiştirmek için Yönergeyi düzenle’ye tıklayın.
          </p>
        ) : (
          <p className={`mt-2 ${t.hint}`}>
            Test talimatlarını başlık altına eklemek için açın.
          </p>
        )}
      </CollapsibleCard>

      <TestDescriptionModal
        key={modalKey}
        open={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={(columnCount, texts, dividers) => {
          setDescriptionColumns(columnCount, texts, dividers);
          if (!options.includeDescription) toggleOption("includeDescription");
          setShowModal(false);
        }}
        initialColumnCount={descriptionColumnCount}
        initialColumnDividers={descriptionColumnDividers}
        initialTexts={initialTexts}
        themeColor={themeColor}
      />
    </>
  );
}
