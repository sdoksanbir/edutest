import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "../../store/editorStore";
import {
  detectMarginPreset,
  MARGIN_PRESETS,
  type MarginPresetId,
} from "../../utils/pageStructureHelpers";
import {
  DISPLAY_SCALE_MAX_PCT,
  DISPLAY_SCALE_MIN_PCT,
  DISPLAY_SCALE_NEUTRAL_PCT,
} from "../../utils/displayScale";
import {
  clampQuestionNumberFontPt,
  QUESTION_NUMBER_FONT_PT_MAX,
  QUESTION_NUMBER_FONT_PT_MIN,
} from "../../utils/questionNumberMetrics";
import { usePdfPreviewUi } from "./PdfPreviewUiThemeContext";
import CollapsibleCard from "./CollapsibleCard";
import CustomMarginsModal, { cmToMm } from "../modals/CustomMarginsModal";
import { PAPER_PRESETS_MM } from "../../constants/paperSizes";

type Props = {
  questionGapMm: number;
  questionGapInitialMm?: number | null;
  questionGapLayoutDirty?: boolean;
  onQuestionGapPreview: (value: number) => void;
  onQuestionGapCommit: (value: number) => void;
  onQuestionGapReset: () => void;
  onQuestionGapDragStart: () => void;
  onQuestionGapCancel: () => void;
  allQuestionsScalePct: number;
  onAllQuestionsScalePreview: (value: number) => void;
  onAllQuestionsScaleCommit: (value: number) => void;
  onAllQuestionsScaleDragStart: () => void;
  onAllQuestionsScaleCancel: () => void;
  selectedQuestionScalePct: number;
  selectedQuestionLabel: string;
  selectedQuestionScaleEnabled: boolean;
  selectedQuestionScaleMaxPct?: number;
  onSelectedQuestionScalePreview: (value: number) => void;
  onSelectedQuestionScaleCommit: (value: number) => void;
  onSelectedQuestionScaleDragStart: () => void;
  onSelectedQuestionScaleCancel: () => void;
  questionCount?: number;
  scaleActionBusy?: boolean;
  onApplyQuestionLineHeightMatch?: () => Promise<{ matched: number; total: number }>;
  onRestoreOriginalQuestionScales?: () => Promise<void> | void;
};

const QUESTION_GAP_MIN_MM = 6;
const QUESTION_GAP_MAX_MM = 100;

function formatQuestionGapMm(value: number): string {
  const fixed = value.toFixed(1);
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="pdf-preview-collapsible-section-heading w-full min-w-0">
      <span className="pdf-preview-collapsible-section-title">{children}</span>
    </div>
  );
}

function BlueToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  const { tokens: t } = usePdfPreviewUi();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
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

function SegBtn({
  active,
  children,
  onClick,
  className = "",
  disabled = false,
  title,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  const { tokens: t } = usePdfPreviewUi();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-md text-xs font-medium transition ${className} ${
        active ? t.segActive : t.segInactive
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function ScaleSliderField({
  label,
  hint,
  value,
  disabled = false,
  neutralValue,
  maxPct = DISPLAY_SCALE_MAX_PCT,
  onPreview,
  onCommit,
  onDragStart,
  onCancel,
}: {
  label: string;
  hint?: string;
  value: number;
  disabled?: boolean;
  neutralValue?: number;
  maxPct?: number;
  onPreview: (value: number) => void;
  onCommit: (value: number) => void;
  onDragStart: () => void;
  onCancel: () => void;
}) {
  const { tokens: t } = usePdfPreviewUi();

  return (
    <div className="space-y-2">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className={t.labelStrong}>{label}</span>
        <span className={`shrink-0 tabular-nums ${t.valueBadge}`}>%{value}</span>
      </div>
      {hint ? <p className={`text-[11px] leading-snug ${t.labelMuted}`}>{hint}</p> : null}
      <input
        type="range"
        min={DISPLAY_SCALE_MIN_PCT}
        max={maxPct}
        step={1}
        value={value}
        disabled={disabled}
        onPointerDown={onDragStart}
        onChange={(e) => onPreview(Number(e.target.value))}
        onPointerUp={(e) => onCommit(Number(e.currentTarget.value))}
        onPointerCancel={onCancel}
        className="pdf-preview-range block w-full disabled:cursor-not-allowed disabled:opacity-40"
        style={{ height: 4 }}
        aria-label={label}
      />
      {neutralValue != null ? (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={disabled || value === neutralValue}
            onClick={() => {
              onDragStart();
              onPreview(neutralValue);
              onCommit(neutralValue);
            }}
            className="pdf-preview-reset-badge disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sıfırla
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function PageStructurePanel({
  questionGapMm,
  questionGapInitialMm = null,
  questionGapLayoutDirty = false,
  onQuestionGapPreview,
  onQuestionGapCommit,
  onQuestionGapReset,
  onQuestionGapDragStart,
  onQuestionGapCancel,
  allQuestionsScalePct,
  onAllQuestionsScalePreview,
  onAllQuestionsScaleCommit,
  onAllQuestionsScaleDragStart,
  onAllQuestionsScaleCancel,
  selectedQuestionScalePct,
  selectedQuestionLabel,
  selectedQuestionScaleEnabled,
  selectedQuestionScaleMaxPct = DISPLAY_SCALE_MAX_PCT,
  onSelectedQuestionScalePreview,
  onSelectedQuestionScaleCommit,
  onSelectedQuestionScaleDragStart,
  onSelectedQuestionScaleCancel,
  questionCount = 0,
  scaleActionBusy = false,
  onApplyQuestionLineHeightMatch,
  onRestoreOriginalQuestionScales,
}: Props) {
  const { tokens: t } = usePdfPreviewUi();
  const [lineMatchBusy, setLineMatchBusy] = useState(false);
  const [restoreOriginalBusy, setRestoreOriginalBusy] = useState(false);
  const [lineMatchSummary, setLineMatchSummary] = useState<string | null>(null);
  const orientation = useEditorStore((s) => s.orientation);
  const columns = useEditorStore((s) => s.columns);
  const targetQuestionLinePt = useEditorStore((s) => s.targetQuestionLinePt);
  const marginTopMm = useEditorStore((s) => s.marginTopMm);
  const marginBottomMm = useEditorStore((s) => s.marginBottomMm);
  const marginLeftMm = useEditorStore((s) => s.marginLeftMm);
  const marginRightMm = useEditorStore((s) => s.marginRightMm);
  const questionNumberingEnabled = useEditorStore((s) => s.questionNumberingEnabled);
  const questionNumberStart = useEditorStore((s) => s.questionNumberStart);
  const questionNumberColorMode = useEditorStore((s) => s.questionNumberColorMode);
  const questionNumberFontPt = useEditorStore((s) => s.questionNumberFontPt);
  const pageNumberingEnabled = useEditorStore((s) => s.pageNumberingEnabled);
  const pageNumberStart = useEditorStore((s) => s.pageNumberStart);
  const pageNumberFormat = useEditorStore((s) => s.pageNumberFormat);

  const setOrientation = useEditorStore((s) => s.setOrientation);
  const setColumns = useEditorStore((s) => s.setColumns);
  const setTargetQuestionLinePt = useEditorStore((s) => s.setTargetQuestionLinePt);
  const setMargins = useEditorStore((s) => s.setMargins);
  const setQuestionNumberingEnabled = useEditorStore((s) => s.setQuestionNumberingEnabled);
  const setQuestionNumberStart = useEditorStore((s) => s.setQuestionNumberStart);
  const setQuestionNumberColorMode = useEditorStore((s) => s.setQuestionNumberColorMode);
  const setQuestionNumberFontPt = useEditorStore((s) => s.setQuestionNumberFontPt);
  const setPageNumberingEnabled = useEditorStore((s) => s.setPageNumberingEnabled);
  const setPageNumberStart = useEditorStore((s) => s.setPageNumberStart);
  const setPageNumberFormat = useEditorStore((s) => s.setPageNumberFormat);
  const paperSize = useEditorStore((s) => s.paperSize);
  const paperWidthMm = useEditorStore((s) => s.paperWidthMm);
  const paperHeightMm = useEditorStore((s) => s.paperHeightMm);
  const [customMarginsOpen, setCustomMarginsOpen] = useState(false);

  const marginPreset = detectMarginPreset(
    marginTopMm,
    marginBottomMm,
    marginLeftMm,
    marginRightMm,
  );
  const isCustomSize = paperSize === "Tam Boyutu Belirleyin";
  const pageW = isCustomSize ? paperWidthMm : (PAPER_PRESETS_MM[paperSize]?.[0] ?? 210);
  const pageH = isCustomSize ? paperHeightMm : (PAPER_PRESETS_MM[paperSize]?.[1] ?? 297);
  const previewW = orientation === "landscape" ? pageH : pageW;
  const previewH = orientation === "landscape" ? pageW : pageH;

  const applyMarginPreset = (id: MarginPresetId) => {
    const preset = MARGIN_PRESETS.find((p) => p.id === id);
    if (preset) setMargins(preset.topMm, preset.bottomMm, preset.leftMm, preset.rightMm);
  };

  const stepQuestionNumberFont = (delta: number) => {
    setQuestionNumberFontPt(clampQuestionNumberFontPt(questionNumberFontPt + delta));
  };

  const formatQuestionNumberFontPt = (value: number) =>
    Number.isInteger(value) ? String(value) : value.toFixed(1);

  const [questionGapSliderMm, setQuestionGapSliderMm] = useState(questionGapMm);
  const questionGapDragRef = useRef(false);
  const [questionGapInput, setQuestionGapInput] = useState(() =>
    formatQuestionGapMm(questionGapMm),
  );
  const questionGapInputFocusedRef = useRef(false);

  useEffect(() => {
    if (!questionGapDragRef.current) {
      setQuestionGapSliderMm(questionGapMm);
    }
  }, [questionGapMm]);

  useEffect(() => {
    if (!questionGapInputFocusedRef.current && !questionGapDragRef.current) {
      setQuestionGapInput(formatQuestionGapMm(questionGapMm));
    }
  }, [questionGapMm]);

  const commitQuestionGapInput = () => {
    const parsed = Number(questionGapInput.replace(",", ".").trim());
    if (!Number.isFinite(parsed)) {
      setQuestionGapInput(formatQuestionGapMm(questionGapSliderMm));
      return;
    }
    onQuestionGapCommit(parsed);
  };

  const stepQuestionGap = (delta: number) => {
    const parsed = Number(questionGapInput.replace(",", ".").trim());
    const base = Number.isFinite(parsed) ? parsed : questionGapSliderMm;
    const next = Math.max(
      QUESTION_GAP_MIN_MM,
      Math.min(QUESTION_GAP_MAX_MM, Math.round((base + delta) * 2) / 2),
    );
    setQuestionGapSliderMm(next);
    setQuestionGapInput(formatQuestionGapMm(next));
    onQuestionGapPreview(next);
    onQuestionGapCommit(next);
  };

  return (
    <>
      <CollapsibleCard
        title="Sayfa Yapısı"
        className="mb-0 pdf-preview-collapsible"
        contentClassName="space-y-0"
        defaultOpen={false}
      >
        <div className="pdf-preview-collapsible-section">
          <SectionHeading>Sayfa Yönü</SectionHeading>
          <div className="grid grid-cols-2 gap-2">
            <SegBtn
              active={orientation === "portrait"}
              onClick={() => setOrientation("portrait")}
              className="py-2.5"
            >
              Dikey
            </SegBtn>
            <SegBtn
              active={orientation === "landscape"}
              onClick={() => setOrientation("landscape")}
              className="py-2.5"
            >
              Yatay
            </SegBtn>
          </div>
        </div>

        <div className="pdf-preview-collapsible-section">
          <SectionHeading>Sütun Sayısı</SectionHeading>
          <div className="grid grid-cols-6 gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <SegBtn
                key={n}
                active={columns === n}
                onClick={() => setColumns(n)}
                className="py-2"
              >
                {n}
              </SegBtn>
            ))}
          </div>
        </div>

        <div className="pdf-preview-collapsible-section space-y-2.5">
          <SectionHeading>Sorular Arası Minimum Boşluk</SectionHeading>
          <div className="space-y-2">
            <input
              type="range"
              min={QUESTION_GAP_MIN_MM}
              max={QUESTION_GAP_MAX_MM}
              step={0.5}
              value={questionGapSliderMm}
              onPointerDown={() => {
                questionGapDragRef.current = true;
                onQuestionGapDragStart();
              }}
              onChange={(e) => {
                const value = Number(e.target.value);
                setQuestionGapSliderMm(value);
                onQuestionGapPreview(value);
                if (!questionGapInputFocusedRef.current) {
                  setQuestionGapInput(formatQuestionGapMm(value));
                }
              }}
              onPointerUp={(e) => {
                questionGapDragRef.current = false;
                onQuestionGapCommit(Number(e.currentTarget.value));
              }}
              onPointerCancel={() => {
                questionGapDragRef.current = false;
                setQuestionGapSliderMm(questionGapMm);
                onQuestionGapCancel();
              }}
              className="pdf-preview-range block w-full"
              style={{ height: 4 }}
              aria-label="Sorular arası minimum boşluk"
            />
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={questionGapSliderMm <= QUESTION_GAP_MIN_MM}
                onClick={() => stepQuestionGap(-0.5)}
                aria-label="Sorular arası minimum boşluğu azalt"
                className={`flex h-7 w-7 items-center justify-center rounded-md ${t.smallBtn} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                −
              </button>
              <input
                type="text"
                inputMode="decimal"
                value={questionGapInput}
                onChange={(e) => {
                  setQuestionGapInput(e.target.value);
                  const parsed = Number(e.target.value.replace(",", "."));
                  if (Number.isFinite(parsed)) {
                    onQuestionGapPreview(parsed);
                  }
                }}
                onFocus={() => {
                  questionGapInputFocusedRef.current = true;
                }}
                onBlur={() => {
                  questionGapInputFocusedRef.current = false;
                  commitQuestionGapInput();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
                }}
                className={`${t.numberInput} text-center`}
                aria-label="Sorular arası minimum boşluk (mm)"
              />
              <button
                type="button"
                disabled={questionGapSliderMm >= QUESTION_GAP_MAX_MM}
                onClick={() => stepQuestionGap(0.5)}
                aria-label="Sorular arası minimum boşluğu artır"
                className={`flex h-7 w-7 items-center justify-center rounded-md ${t.smallBtn} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                +
              </button>
              <span className={`shrink-0 ${t.labelMuted}`}>mm</span>
              <button
                type="button"
                disabled={
                  questionGapInitialMm != null &&
                  Math.abs(questionGapSliderMm - questionGapInitialMm) < 0.001 &&
                  !questionGapLayoutDirty
                }
                onClick={onQuestionGapReset}
                className="ml-auto shrink-0 pdf-preview-reset-badge disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sıfırla
              </button>
            </div>
          </div>
        </div>

        <div className="pdf-preview-collapsible-section">
          <SectionHeading>Kenar Boşluğu</SectionHeading>
          <div className="grid grid-cols-2 gap-1.5">
            {MARGIN_PRESETS.map((p) => (
              <SegBtn
                key={p.id}
                active={marginPreset === p.id}
                onClick={() => applyMarginPreset(p.id)}
                className="py-2"
                title={`${p.label}: ${p.topMm / 10} cm her kenar`}
              >
                {p.label}
              </SegBtn>
            ))}
            <SegBtn
              active={marginPreset == null}
              onClick={() => setCustomMarginsOpen(true)}
              className="py-2"
              title="Kenar boşluklarını kendiniz ayarlayın"
            >
              Özel
            </SegBtn>
          </div>
          <CustomMarginsModal
            open={customMarginsOpen}
            onClose={() => setCustomMarginsOpen(false)}
            onConfirm={(m) => {
              setMargins(cmToMm(m.topCm), cmToMm(m.bottomCm), cmToMm(m.leftCm), cmToMm(m.rightCm));
            }}
            marginTopMm={marginTopMm}
            marginBottomMm={marginBottomMm}
            marginLeftMm={marginLeftMm}
            marginRightMm={marginRightMm}
            pageWidthMm={previewW}
            pageHeightMm={previewH}
          />
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Numaralandırma" className="mb-0 pdf-preview-collapsible" contentClassName="space-y-0" defaultOpen={false}>
        <div className="pdf-preview-collapsible-section space-y-2.5">
          <SectionHeading>Soru Numaralandırma</SectionHeading>
          <div className="flex items-center justify-between gap-2">
            <span className={t.labelStrong}>Aktif</span>
            <BlueToggle
              checked={questionNumberingEnabled}
              onChange={setQuestionNumberingEnabled}
              label="Soru numaralandırma"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className={t.label}>Başlangıç soru no</span>
            <input
              type="number"
              min={1}
              max={999}
              disabled={!questionNumberingEnabled}
              value={questionNumberStart}
              onChange={(e) => setQuestionNumberStart(Number(e.target.value) || 1)}
              className={`${t.numberInput} text-center`}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className={`${t.label} min-w-0 flex-1`}>Soru numarası boyutu</span>
            <div className="ml-auto flex shrink-0 items-center justify-end gap-[2px]">
              <button
                type="button"
                disabled={
                  !questionNumberingEnabled ||
                  questionNumberFontPt <= QUESTION_NUMBER_FONT_PT_MIN
                }
                onClick={() => stepQuestionNumberFont(-0.5)}
                aria-label="Soru numarası boyutunu küçült"
                className={`flex h-7 w-7 items-center justify-center rounded-md ${t.smallBtn} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                −
              </button>
              <input
                type="text"
                inputMode="decimal"
                disabled={!questionNumberingEnabled}
                value={formatQuestionNumberFontPt(questionNumberFontPt)}
                onChange={(e) => {
                  const parsed = Number(e.target.value.replace(",", "."));
                  if (Number.isFinite(parsed)) {
                    setQuestionNumberFontPt(clampQuestionNumberFontPt(parsed));
                  }
                }}
                className={`${t.numberInput} text-center`}
                aria-label="Soru numarası boyutu (pt)"
              />
              <button
                type="button"
                disabled={
                  !questionNumberingEnabled ||
                  questionNumberFontPt >= QUESTION_NUMBER_FONT_PT_MAX
                }
                onClick={() => stepQuestionNumberFont(0.5)}
                aria-label="Soru numarası boyutunu büyüt"
                className={`flex h-7 w-7 items-center justify-center rounded-md ${t.smallBtn} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                +
              </button>
              <span className={`shrink-0 text-xs ${t.labelMuted}`}>pt</span>
            </div>
          </div>
          <div>
            <span className={`mb-1 block ${t.label}`}>Numara rengi</span>
            <div className="grid grid-cols-2 gap-1.5">
              <SegBtn
                active={questionNumberColorMode === "theme"}
                onClick={() => setQuestionNumberColorMode("theme")}
                className="py-2"
                disabled={!questionNumberingEnabled}
              >
                Tema rengi
              </SegBtn>
              <SegBtn
                active={questionNumberColorMode === "black"}
                onClick={() => setQuestionNumberColorMode("black")}
                className="py-2"
                disabled={!questionNumberingEnabled}
              >
                Siyah
              </SegBtn>
            </div>
          </div>
        </div>

        <div className="pdf-preview-collapsible-section space-y-2.5">
          <SectionHeading>Sayfa Numaralandırma</SectionHeading>
          <div className="flex items-center justify-between gap-2">
            <span className={t.labelStrong}>Aktif</span>
            <BlueToggle
              checked={pageNumberingEnabled}
              onChange={setPageNumberingEnabled}
              label="Sayfa numaralandırma"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className={t.label}>Başlangıç sayfa no</span>
            <input
              type="number"
              min={1}
              max={999}
              disabled={!pageNumberingEnabled}
              value={pageNumberStart}
              onChange={(e) => setPageNumberStart(Number(e.target.value) || 1)}
              className={`${t.numberInput} text-center`}
            />
          </div>
          <div>
            <span className={`mb-1 block ${t.label}`}>Numara biçimi</span>
            <div className="grid grid-cols-2 gap-1.5">
              <SegBtn
                active={pageNumberFormat === "plain"}
                onClick={() => setPageNumberFormat("plain")}
                className="py-2"
                disabled={!pageNumberingEnabled}
              >
                1, 2, 3
              </SegBtn>
              <SegBtn
                active={pageNumberFormat === "fraction"}
                onClick={() => setPageNumberFormat("fraction")}
                className="py-2"
                disabled={!pageNumberingEnabled}
              >
                1/4, 2/4
              </SegBtn>
            </div>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="ÖLÇEKLENDİRME"
        className="mb-0 pdf-preview-collapsible"
        contentClassName="space-y-0"
        defaultOpen={false}
      >
        <div className="pdf-preview-collapsible-section space-y-2.5">
          <SectionHeading>Yazı boyutu eşitle</SectionHeading>
          <p className={`text-[11px] leading-snug ${t.labelMuted}`}>
            OCR ile yazı yüksekliğini ölçer; seçilen puntoya göre ölçekler (8 küçültür, 12
            büyütür). Hedefi değiştirdikten sonra tekrar Eşitle’ye basın.
          </p>
          <div className="space-y-1.5">
            <span className={`text-xs ${t.label}`}>Hedef punto</span>
            <div className="grid grid-cols-5 gap-1.5">
              {[8, 9, 10, 11, 12].map((pt) => (
                <SegBtn
                  key={pt}
                  active={targetQuestionLinePt === pt}
                  onClick={() => setTargetQuestionLinePt(pt)}
                  className="py-2"
                >
                  {pt}
                </SegBtn>
              ))}
            </div>
          </div>
          <button
            type="button"
            disabled={
              scaleActionBusy ||
              lineMatchBusy ||
              restoreOriginalBusy ||
              questionCount === 0 ||
              !onApplyQuestionLineHeightMatch
            }
            onClick={() => {
              if (!onApplyQuestionLineHeightMatch) return;
              setLineMatchBusy(true);
              setLineMatchSummary(null);
              void onApplyQuestionLineHeightMatch()
                .then((result) => {
                  if (result.matched === 0) {
                    setLineMatchSummary(
                      "Güvenilir yazı ölçümü yapılamadı. Şık satırı okunabilen sorularda tekrar deneyin.",
                    );
                  } else {
                    setLineMatchSummary(
                      `${result.matched}/${result.total} soru ${targetQuestionLinePt} pt hedefine hizalandı.`,
                    );
                  }
                })
                .catch(() => {
                  setLineMatchSummary("Eşitleme sırasında hata oluştu.");
                })
                .finally(() => setLineMatchBusy(false));
            }}
            className="pdf-preview-font-action-btn w-full rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {lineMatchBusy ? "Eşitleniyor…" : "Yazı boyutlarını eşitle"}
          </button>
          {lineMatchSummary ? (
            <p className={`text-[11px] leading-snug ${t.labelMuted}`}>{lineMatchSummary}</p>
          ) : null}
          <button
            type="button"
            disabled={
              scaleActionBusy ||
              lineMatchBusy ||
              restoreOriginalBusy ||
              questionCount === 0 ||
              !onRestoreOriginalQuestionScales
            }
            onClick={() => {
              if (!onRestoreOriginalQuestionScales) return;
              setRestoreOriginalBusy(true);
              setLineMatchSummary(null);
              void Promise.resolve(onRestoreOriginalQuestionScales()).finally(() =>
                setRestoreOriginalBusy(false),
              );
            }}
            className="pdf-preview-font-action-btn pdf-preview-font-action-btn--ghost w-full rounded-lg border-0 bg-transparent px-3 py-2 text-xs font-semibold shadow-none transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {restoreOriginalBusy ? "Geri yükleniyor…" : "Orijinal haline dön"}
          </button>
        </div>

        <div className="pdf-preview-collapsible-section space-y-2.5">
          <SectionHeading>Tüm soruları ölçeklendir</SectionHeading>
          <ScaleSliderField
            label="Toplu boyut"
            hint="Kağıt hazırlanınca ve yazı eşitlenince boyutlar kaydedilir; toplu ölçek her zaman son boyuttan çarpar."
            value={allQuestionsScalePct}
            neutralValue={DISPLAY_SCALE_NEUTRAL_PCT}
            onPreview={onAllQuestionsScalePreview}
            onCommit={onAllQuestionsScaleCommit}
            onDragStart={onAllQuestionsScaleDragStart}
            onCancel={onAllQuestionsScaleCancel}
          />
        </div>

        <div className="pdf-preview-collapsible-section space-y-2.5">
          <SectionHeading>Seçili soruları ölçeklendir</SectionHeading>
          <ScaleSliderField
            label={selectedQuestionLabel}
            hint={
              selectedQuestionScaleEnabled
                ? selectedQuestionScaleMaxPct < DISPLAY_SCALE_MAX_PCT
                  ? "Tek soru seçiliyken en fazla sütun genişliğine kadar büyütülür; sığmazsa sonraki sütuna taşınır."
                  : "Önizlemede Cmd/Ctrl+ tık ile birden fazla soru seçin. Shift+ tık ile aralık seçin. Yalnızca seçili sorular ölçeklenir."
                : "Önizlemeden en az bir soru seçin."
            }
            value={selectedQuestionScalePct}
            disabled={!selectedQuestionScaleEnabled}
            neutralValue={DISPLAY_SCALE_NEUTRAL_PCT}
            maxPct={selectedQuestionScaleMaxPct}
            onPreview={onSelectedQuestionScalePreview}
            onCommit={onSelectedQuestionScaleCommit}
            onDragStart={onSelectedQuestionScaleDragStart}
            onCancel={onSelectedQuestionScaleCancel}
          />
        </div>
      </CollapsibleCard>
    </>
  );
}
