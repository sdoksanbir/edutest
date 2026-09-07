import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "../../store/editorStore";
import {
  isCorporateHeader,
  isLgsOfficialBannerConfig,
} from "../../utils/corporateHeaderLayout";
import {
  clampDescriptionBoxPadXPt,
  clampDescriptionBoxPadYPt,
  DESC_BOX_PAD_X_DEFAULT_PT,
  DESC_BOX_PAD_Y_DEFAULT_PT,
} from "../../utils/descriptionBoxLayout";
import {
  DEFAULT_TRIAL_YONERGE_TEXT,
  defaultLgsYonergeHtml,
  isBlankDescriptionTexts,
} from "../../utils/trialYonergeDefaults";
import TestDescriptionModal from "../modals/TestDescriptionModal";
import { usePdfPreviewUi } from "./PdfPreviewUiThemeContext";
import { usePdfPreviewScrollSession } from "./PdfPreviewScrollSessionContext";
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

function PadSliderRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (pt: number) => void;
}) {
  const { tokens: t } = usePdfPreviewUi();
  const scrollSession = usePdfPreviewScrollSession();
  return (
    <div className="pdf-preview-slider-field">
      <div className="pdf-preview-slider-field__meta">
        <span className={`pdf-preview-field-label ${t.label}`}>{label}</span>
        <span className={`shrink-0 tabular-nums ${t.valueBadge}`}>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={0.5}
        value={value}
        onPointerDown={() => scrollSession?.begin()}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={() => scrollSession?.end()}
        onPointerCancel={() => scrollSession?.end()}
        className="pdf-preview-range"
        style={{ height: 3 }}
      />
    </div>
  );
}

export default function YonergePanel({ trialMode = false }: { trialMode?: boolean }) {
  const { tokens: t } = usePdfPreviewUi();
  const options = useEditorStore((s) => s.options);
  const headerStyleId = useEditorStore((s) => s.headerStyleId);
  const headerConfig = useEditorStore((s) => s.headerConfig);
  const questions = useEditorStore((s) => s.questions);
  const descriptionColumnCount = useEditorStore((s) => s.descriptionColumnCount);
  const descriptionTexts = useEditorStore((s) => s.descriptionTexts);
  const descriptionColumnDividers = useEditorStore((s) => s.descriptionColumnDividers);
  const descriptionBoxPadYPt = useEditorStore((s) => s.descriptionBoxPadYPt);
  const descriptionBoxPadXPt = useEditorStore((s) => s.descriptionBoxPadXPt);
  const testDescription = useEditorStore((s) => s.testDescription);
  const themeColor = useEditorStore((s) => s.themeColor);
  const toggleOption = useEditorStore((s) => s.toggleOption);
  const setDescriptionColumns = useEditorStore((s) => s.setDescriptionColumns);
  const setDescriptionBoxPadYPt = useEditorStore((s) => s.setDescriptionBoxPadYPt);
  const setDescriptionBoxPadXPt = useEditorStore((s) => s.setDescriptionBoxPadXPt);
  const updateHeaderConfig = useEditorStore((s) => s.updateHeaderConfig);

  const [showModal, setShowModal] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const trialInitRef = useRef(false);
  const lgsInitRef = useRef(false);
  const isLgsOfficial = isLgsOfficialBannerConfig(headerConfig);
  const corporateTheme = isCorporateHeader(headerStyleId) && !isLgsOfficial;
  const yonergeOn = options.includeDescription && !corporateTheme;

  useEffect(() => {
    if (!trialMode || corporateTheme) {
      trialInitRef.current = false;
      return;
    }
    if (trialInitRef.current) return;
    trialInitRef.current = true;
    if (!options.includeDescription) toggleOption("includeDescription");
    if (isBlankDescriptionTexts(descriptionTexts)) {
      setDescriptionColumns(
        1,
        [isLgsOfficial ? defaultLgsYonergeHtml(questions.length || 20) : DEFAULT_TRIAL_YONERGE_TEXT],
        false,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnızca deneme paneli ilk açılışında
  }, [trialMode, corporateTheme]);

  // LGS şablonu: tek sütun yönergeyi aç; boşsa görseldeki varsayılan
  useEffect(() => {
    if (!trialMode || !isLgsOfficial) {
      lgsInitRef.current = false;
      return;
    }
    if (lgsInitRef.current) return;
    lgsInitRef.current = true;
    if (!options.includeDescription) toggleOption("includeDescription");
    if (isBlankDescriptionTexts(descriptionTexts)) {
      setDescriptionColumns(1, [defaultLgsYonergeHtml(questions.length || 20)], false);
    } else if ((descriptionColumnCount ?? 1) !== 1) {
      setDescriptionColumns(1, descriptionTexts.slice(0, 1), false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- LGS şablonuna geçişte bir kez
  }, [trialMode, isLgsOfficial]);

  const padY = clampDescriptionBoxPadYPt(descriptionBoxPadYPt ?? DESC_BOX_PAD_Y_DEFAULT_PT);
  const padX = clampDescriptionBoxPadXPt(descriptionBoxPadXPt ?? DESC_BOX_PAD_X_DEFAULT_PT);

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
    if (trialMode && isBlankDescriptionTexts(descriptionTexts)) {
      setDescriptionColumns(
        1,
        [isLgsOfficial ? defaultLgsYonergeHtml(questions.length || 20) : DEFAULT_TRIAL_YONERGE_TEXT],
        false,
      );
    }
    if (trialMode) {
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
          <>
            <p className={`mt-2 ${t.hint}`}>
              {isLgsOfficial
                ? "LGS başlığındaki yönerge kutusunu düzenleyin (tek sütun)."
                : trialMode
                  ? "Başlık altındaki yönerge metnini düzenleyin. Sınav kodu, test adı ve kitapçık sağ panelde Başlık Rozeti altındadır."
                  : `İlk sayfa başlığının altında ${descriptionColumnCount} sütunlu yönerge kutusu gösterilir. Metin dikeyde ortalanır.`}
            </p>
            {isLgsOfficial ? (
              <div className="mt-2 flex items-center justify-end gap-2">
                <span className={`mr-auto text-[11px] ${t.label}`}>Yazı boyutu</span>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    disabled={(headerConfig.lgsInstructionFontPt ?? 15) <= 8}
                    onClick={() =>
                      updateHeaderConfig({
                        lgsInstructionFontPt: Math.max(
                          8,
                          (headerConfig.lgsInstructionFontPt ?? 15) - 0.5,
                        ),
                      })
                    }
                    className={`flex h-6 w-6 items-center justify-center rounded text-xs ${t.smallBtn} disabled:opacity-40`}
                    aria-label="Yönerge yazı boyutunu küçült"
                  >
                    −
                  </button>
                  <span className={`min-w-[2.25rem] text-center text-[11px] font-semibold tabular-nums ${t.valueBadge}`}>
                    {headerConfig.lgsInstructionFontPt ?? 15}
                  </span>
                  <button
                    type="button"
                    disabled={(headerConfig.lgsInstructionFontPt ?? 15) >= 22}
                    onClick={() =>
                      updateHeaderConfig({
                        lgsInstructionFontPt: Math.min(
                          22,
                          (headerConfig.lgsInstructionFontPt ?? 15) + 0.5,
                        ),
                      })
                    }
                    className={`flex h-6 w-6 items-center justify-center rounded text-xs ${t.smallBtn} disabled:opacity-40`}
                    aria-label="Yönerge yazı boyutunu büyüt"
                  >
                    +
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <PadSliderRow
                  label="Dikey iç boşluk"
                  value={padY}
                  min={2}
                  max={28}
                  onChange={(pt) => setDescriptionBoxPadYPt(clampDescriptionBoxPadYPt(pt))}
                />
                <PadSliderRow
                  label="Yatay iç boşluk"
                  value={padX}
                  min={2}
                  max={28}
                  onChange={(pt) => setDescriptionBoxPadXPt(clampDescriptionBoxPadXPt(pt))}
                />
              </div>
            )}
          </>
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
          setDescriptionColumns(isLgsOfficial ? 1 : columnCount, texts, isLgsOfficial ? false : dividers);
          if (!options.includeDescription) toggleOption("includeDescription");
          setShowModal(false);
        }}
        initialColumnCount={isLgsOfficial ? 1 : descriptionColumnCount}
        initialColumnDividers={isLgsOfficial ? false : descriptionColumnDividers}
        initialTexts={initialTexts}
        themeColor={themeColor}
        singleColumnOnly={isLgsOfficial}
      />
    </>
  );
}
