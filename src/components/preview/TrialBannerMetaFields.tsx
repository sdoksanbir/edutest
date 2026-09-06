import { useEditorStore } from "../../store/editorStore";
import { usePdfPreviewUi } from "./PdfPreviewUiThemeContext";
import { usePdfPreviewScrollSession } from "./PdfPreviewScrollSessionContext";
import {
  APP_COLOR_DEFAULT,
  ColorSwatchPicker,
} from "./ColorSwatchPicker";

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

function TrialMetaField({
  label,
  value,
  placeholder,
  onChange,
  fontPt,
  onFontPtChange,
  color,
  onColorChange,
  themeFallbackColor,
  align,
  onAlignChange,
  padLeftPt,
  onPadLeftChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  fontPt?: number;
  onFontPtChange?: (pt: number) => void;
  color?: string;
  onColorChange?: (c: string) => void;
  themeFallbackColor?: string;
  align?: "left" | "center" | "right";
  onAlignChange?: (a: "left" | "center" | "right") => void;
  padLeftPt?: number;
  onPadLeftChange?: (pt: number) => void;
}) {
  const { tokens: t } = usePdfPreviewUi();
  const scrollSession = usePdfPreviewScrollSession();
  const showStyle = onFontPtChange != null && onColorChange != null;
  const effectiveColor = (color || "").trim() || themeFallbackColor || APP_COLOR_DEFAULT;
  return (
    <div className="space-y-1.5">
      <label className="block space-y-1">
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${t.label}`}>{label}</span>
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-md border px-2.5 py-1.5 text-xs ${t.input}`}
        />
      </label>
      {showStyle ? (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                disabled={(fontPt ?? 10) <= 7}
                onClick={() => onFontPtChange!(Math.max(7, (fontPt ?? 10) - 0.5))}
                className={`flex h-6 w-6 items-center justify-center rounded text-xs ${t.smallBtn} disabled:opacity-40`}
                aria-label={`${label} boyutunu küçült`}
              >
                −
              </button>
              <span className={`min-w-[2.25rem] text-center text-[11px] font-semibold tabular-nums ${t.valueBadge}`}>
                {fontPt ?? 10}
              </span>
              <button
                type="button"
                disabled={(fontPt ?? 10) >= 18}
                onClick={() => onFontPtChange!(Math.min(18, (fontPt ?? 10) + 0.5))}
                className={`flex h-6 w-6 items-center justify-center rounded text-xs ${t.smallBtn} disabled:opacity-40`}
                aria-label={`${label} boyutunu büyüt`}
              >
                +
              </button>
            </div>
          </div>
          <ColorSwatchPicker
            color={effectiveColor}
            onColorChange={onColorChange!}
            customTitle={`${label} rengi`}
          />
        </div>
      ) : null}
      {onAlignChange ? (
        <div className="flex gap-1">
          {(
            [
              { id: "left" as const, label: "Sola" },
              { id: "center" as const, label: "Orta" },
              { id: "right" as const, label: "Sağa" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onAlignChange(opt.id)}
              className={`flex-1 rounded-md py-1 text-[10px] font-semibold transition ${
                align === opt.id ? t.segActive : t.segInactive
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
      {onPadLeftChange ? (
        <div className="pdf-preview-slider-field">
          <div className="pdf-preview-slider-field__meta">
            <span className={`pdf-preview-field-label ${t.label}`}>Sol boşluk</span>
            <span className={`shrink-0 tabular-nums ${t.valueBadge}`}>{padLeftPt ?? 10}</span>
          </div>
          <input
            type="range"
            min={0}
            max={36}
            step={0.5}
            value={padLeftPt ?? 10}
            onPointerDown={() => scrollSession?.begin()}
            onChange={(e) => onPadLeftChange(Number(e.target.value))}
            onPointerUp={() => scrollSession?.end()}
            onPointerCancel={() => scrollSession?.end()}
            className="pdf-preview-range"
            style={{ height: 3 }}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Deneme ÖSYM: sol sınav kodu / orta test adı / sağ kitapçık alanları */
export default function TrialBannerMetaFields() {
  const { tokens: t } = usePdfPreviewUi();
  const themeColor = useEditorStore((s) => s.themeColor);
  const testName = useEditorStore((s) => s.testName);
  const trialExamCode = useEditorStore((s) => s.trialExamCode);
  const trialBookletLabel = useEditorStore((s) => s.trialBookletLabel);
  const trialExamCodeFontPt = useEditorStore((s) => s.trialExamCodeFontPt);
  const trialExamCodeColor = useEditorStore((s) => s.trialExamCodeColor);
  const trialExamCodeAlign = useEditorStore((s) => s.trialExamCodeAlign);
  const trialExamCodePadLeftPt = useEditorStore((s) => s.trialExamCodePadLeftPt);
  const trialBookletFontPt = useEditorStore((s) => s.trialBookletFontPt);
  const trialBookletColor = useEditorStore((s) => s.trialBookletColor);
  const trialTestNameBgOpacityPct = useEditorStore((s) => s.trialTestNameBgOpacityPct);
  const trialTestNameBgColor = useEditorStore((s) => s.trialTestNameBgColor);
  const setTestName = useEditorStore((s) => s.setTestName);
  const setTrialExamCode = useEditorStore((s) => s.setTrialExamCode);
  const setTrialBookletLabel = useEditorStore((s) => s.setTrialBookletLabel);
  const setTrialExamCodeFontPt = useEditorStore((s) => s.setTrialExamCodeFontPt);
  const setTrialExamCodeColor = useEditorStore((s) => s.setTrialExamCodeColor);
  const setTrialExamCodeAlign = useEditorStore((s) => s.setTrialExamCodeAlign);
  const setTrialExamCodePadLeftPt = useEditorStore((s) => s.setTrialExamCodePadLeftPt);
  const setTrialBookletFontPt = useEditorStore((s) => s.setTrialBookletFontPt);
  const setTrialBookletColor = useEditorStore((s) => s.setTrialBookletColor);
  const setTrialTestNameBgOpacityPct = useEditorStore((s) => s.setTrialTestNameBgOpacityPct);
  const setTrialTestNameBgColor = useEditorStore((s) => s.setTrialTestNameBgColor);

  return (
    <div className="space-y-2.5">
      <p className={`text-[11px] leading-snug ${t.hint}`}>
        Sol sınav kodu, orta test adı, sağ kitapçık.
      </p>
      <TrialMetaField
        label="Sınav kodu"
        value={trialExamCode}
        placeholder="Örn: SINAV KODU"
        onChange={setTrialExamCode}
        fontPt={trialExamCodeFontPt ?? 10}
        onFontPtChange={setTrialExamCodeFontPt}
        color={trialExamCodeColor}
        onColorChange={setTrialExamCodeColor}
        themeFallbackColor={themeColor}
        align={trialExamCodeAlign ?? "left"}
        onAlignChange={setTrialExamCodeAlign}
        padLeftPt={trialExamCodePadLeftPt ?? 10}
        onPadLeftChange={setTrialExamCodePadLeftPt}
      />
      <TrialMetaField
        label="Test adı"
        value={testName}
        placeholder="Örn: MATEMATİK TESTİ"
        onChange={setTestName}
      />
      <div className="space-y-1">
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${t.label}`}>
          Test adı arka plan rengi
        </span>
        <ColorSwatchPicker
          color={trialTestNameBgColor || APP_COLOR_DEFAULT}
          onColorChange={setTrialTestNameBgColor}
          customTitle="Test adı arka plan rengi"
        />
      </div>
      <PadSliderRow
        label="Test adı arka plan opaklığı"
        value={trialTestNameBgOpacityPct ?? 100}
        min={0}
        max={100}
        onChange={(v) => setTrialTestNameBgOpacityPct(Math.round(v))}
      />
      <TrialMetaField
        label="Kitapçık"
        value={trialBookletLabel}
        placeholder="Örn: A KİTAPÇIĞI"
        onChange={setTrialBookletLabel}
        fontPt={trialBookletFontPt ?? 10}
        onFontPtChange={setTrialBookletFontPt}
        color={trialBookletColor}
        onColorChange={setTrialBookletColor}
        themeFallbackColor={themeColor}
      />
    </div>
  );
}
