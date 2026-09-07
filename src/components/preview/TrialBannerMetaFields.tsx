import { type ReactNode } from "react";
import { useEditorStore } from "../../store/editorStore";
import { isLgsOfficialBannerConfig } from "../../utils/corporateHeaderLayout";
import {
  LGS_OFFICIAL_SUBJECT_DEFAULT,
  LGS_OFFICIAL_TITLE_DEFAULT,
  LGS_OFFICIAL_YEAR_DEFAULT,
} from "../lgs-official-banner/types";
import { usePdfPreviewUi } from "./PdfPreviewUiThemeContext";
import { usePdfPreviewScrollSession } from "./PdfPreviewScrollSessionContext";
import {
  APP_COLOR_DEFAULT,
  APP_FILL_TEXT_PALETTE,
  APP_TEXT_ON_FILL_DEFAULT,
  ColorSwatchPicker,
} from "./ColorSwatchPicker";

/** Sayfa Yapısı collapse ile aynı bölüm başlığı */
function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div className="pdf-preview-collapsible-section-heading w-full min-w-0">
      <span className="pdf-preview-collapsible-section-title">{children}</span>
    </div>
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

function FontSizeStepper({
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
  return (
    <div className="flex items-center justify-end gap-2">
      <span className={`mr-auto text-[11px] ${t.label}`}>{label}</span>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 0.5))}
          className={`flex h-6 w-6 items-center justify-center rounded text-xs ${t.smallBtn} disabled:opacity-40`}
          aria-label={`${label} küçült`}
        >
          −
        </button>
        <span className={`min-w-[2.25rem] text-center text-[11px] font-semibold tabular-nums ${t.valueBadge}`}>
          {value}
        </span>
        <button
          type="button"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 0.5))}
          className={`flex h-6 w-6 items-center justify-center rounded text-xs ${t.smallBtn} disabled:opacity-40`}
          aria-label={`${label} büyüt`}
        >
          +
        </button>
      </div>
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
  hideLabel = false,
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
  hideLabel?: boolean;
}) {
  const { tokens: t } = usePdfPreviewUi();
  const scrollSession = usePdfPreviewScrollSession();
  const showStyle = onFontPtChange != null && onColorChange != null;
  const effectiveColor = (color || "").trim() || themeFallbackColor || APP_COLOR_DEFAULT;
  return (
    <div className="space-y-1.5">
      <label className="block space-y-1">
        {!hideLabel ? (
          <span className={`text-[11px] font-semibold uppercase tracking-wide ${t.label}`}>{label}</span>
        ) : null}
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className={`w-full rounded-md border px-2.5 py-1.5 text-xs ${t.input}`}
        />
      </label>
      {showStyle ? (
        <div className="flex items-center justify-end gap-2">
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

function LgsBadgeFields() {
  const { tokens: t } = usePdfPreviewUi();
  const headerConfig = useEditorStore((s) => s.headerConfig);
  const updateHeaderConfig = useEditorStore((s) => s.updateHeaderConfig);
  const setTestName = useEditorStore((s) => s.setTestName);
  const testName = useEditorStore((s) => s.testName);
  const trialBrandName = useEditorStore((s) => s.trialBrandName);
  const trialBrandNameVisible = useEditorStore((s) => s.trialBrandNameVisible);
  const setTrialBrandName = useEditorStore((s) => s.setTrialBrandName);
  const setTrialBrandNameVisible = useEditorStore((s) => s.setTrialBrandNameVisible);
  const accentColor = headerConfig.accentColor?.trim() || "#E4F0D4";
  const yearText = headerConfig.academicYear?.trim() || LGS_OFFICIAL_YEAR_DEFAULT;
  const fillColor = headerConfig.lgsYearFillColor?.trim() || accentColor;
  const yearTextColor = headerConfig.lgsYearTextColor?.trim() || "#000000";
  const yearFontPt = headerConfig.lgsYearFontPt ?? 17;
  const padX = headerConfig.lgsYearPadXPt ?? 18;
  const padY = headerConfig.lgsYearPadYPt ?? 8;
  const examTitle =
    headerConfig.examBannerTitle?.trim() || LGS_OFFICIAL_TITLE_DEFAULT;
  const titleFontPt = headerConfig.lgsTitleFontPt ?? 19;
  const titleColor = headerConfig.lgsTitleTextColor?.trim() || "#000000";
  const titleBold = headerConfig.lgsTitleBold !== false;
  const subject =
    headerConfig.subject?.trim() ||
    testName?.trim() ||
    LGS_OFFICIAL_SUBJECT_DEFAULT;
  const subjectFontPt = headerConfig.lgsSubjectFontPt ?? 24;
  const subjectColor = headerConfig.lgsSubjectTextColor?.trim() || "#000000";
  const subjectBold = headerConfig.lgsSubjectBold !== false;
  const subjectBandW = headerConfig.lgsSubjectBandWidthPt ?? 480;
  const booklet = /^[A-D]$/i.test(headerConfig.lgsBookletType || "")
    ? (headerConfig.lgsBookletType || "").toUpperCase()
    : "";

  return (
    <>
      <div className="pdf-preview-collapsible-section">
        <SectionHeading>Kurum Adı</SectionHeading>
        <div className={`flex min-w-0 flex-col gap-2 ${trialBrandNameVisible ? "" : "opacity-50"}`}>
          <div className="flex min-w-0 items-center gap-2">
            <input
              type="checkbox"
              id="lgs-trial-brand-name-visible"
              checked={trialBrandNameVisible}
              onChange={(e) => setTrialBrandNameVisible(e.target.checked)}
              className="pdf-preview-checkbox pdf-preview-checkbox--sm shrink-0 cursor-pointer"
              aria-label="Kurum adı göster"
              title={trialBrandNameVisible ? "Başlıkta göster" : "Başlıkta gizle"}
            />
            <label
              htmlFor="lgs-trial-brand-name-visible"
              className={`min-w-0 flex-1 cursor-pointer text-[11px] font-medium ${t.label}`}
            >
              Rozette göster
            </label>
          </div>
          <input
            id="lgs-trial-brand-name"
            type="text"
            value={trialBrandName}
            onChange={(e) => setTrialBrandName(e.target.value)}
            placeholder="EDUMATH"
            title="Kurum Adı — örnek: EDUMATH"
            aria-label="Kurum Adı"
            className={`pdf-preview-header-field-row__input h-7 min-w-0 w-full ${t.input} !py-1 !text-xs`}
          />
        </div>
      </div>

      <div className="pdf-preview-collapsible-section">
        <SectionHeading>Sınav başlığı</SectionHeading>
        <input
          type="text"
          value={examTitle}
          placeholder={LGS_OFFICIAL_TITLE_DEFAULT}
          onChange={(e) => updateHeaderConfig({ examBannerTitle: e.target.value })}
          className={`w-full rounded-md border px-2.5 py-1.5 text-xs ${t.input}`}
        />
        <FontSizeStepper
          label="Yazı boyutu"
          value={titleFontPt}
          min={8}
          max={28}
          onChange={(v) => updateHeaderConfig({ lgsTitleFontPt: v })}
        />
        <div className="pdf-preview-color-row">
          <span className={`pdf-preview-field-label ${t.label}`}>Yazı rengi</span>
          <ColorSwatchPicker
            color={titleColor}
            onColorChange={(c) => updateHeaderConfig({ lgsTitleTextColor: c })}
            palette={APP_FILL_TEXT_PALETTE}
            customTitle="Sınav başlığı yazı rengi"
          />
        </div>
        <button
          type="button"
          onClick={() => updateHeaderConfig({ lgsTitleBold: !titleBold })}
          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
            titleBold ? t.segActive : t.segInactive
          }`}
        >
          Kalın
        </button>
      </div>

      <div className="pdf-preview-collapsible-section">
        <SectionHeading>Test Adı</SectionHeading>
        <input
          type="text"
          value={subject}
          placeholder={LGS_OFFICIAL_SUBJECT_DEFAULT}
          onChange={(e) => {
            const v = e.target.value;
            updateHeaderConfig({ subject: v });
            setTestName(v);
          }}
          className={`w-full rounded-md border px-2.5 py-1.5 text-xs ${t.input}`}
        />
        <FontSizeStepper
          label="Yazı boyutu"
          value={subjectFontPt}
          min={8}
          max={28}
          onChange={(v) => updateHeaderConfig({ lgsSubjectFontPt: v })}
        />
        <div className="pdf-preview-color-row">
          <span className={`pdf-preview-field-label ${t.label}`}>Yazı rengi</span>
          <ColorSwatchPicker
            color={subjectColor}
            onColorChange={(c) => updateHeaderConfig({ lgsSubjectTextColor: c })}
            palette={APP_FILL_TEXT_PALETTE}
            customTitle="Test adı yazı rengi"
          />
        </div>
        <button
          type="button"
          onClick={() => updateHeaderConfig({ lgsSubjectBold: !subjectBold })}
          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
            subjectBold ? t.segActive : t.segInactive
          }`}
        >
          Kalın
        </button>
        <PadSliderRow
          label="Kutu genişliği"
          value={subjectBandW}
          min={160}
          max={893}
          onChange={(v) => updateHeaderConfig({ lgsSubjectBandWidthPt: v })}
        />
      </div>

      <div className="pdf-preview-collapsible-section">
        <SectionHeading>Eğitim yılı</SectionHeading>
        <input
          type="text"
          value={yearText}
          placeholder={LGS_OFFICIAL_YEAR_DEFAULT}
          onChange={(e) => updateHeaderConfig({ academicYear: e.target.value })}
          className={`w-full rounded-md border px-2.5 py-1.5 text-xs ${t.input}`}
        />
        <FontSizeStepper
          label="Yazı boyutu"
          value={yearFontPt}
          min={8}
          max={22}
          onChange={(v) => updateHeaderConfig({ lgsYearFontPt: v })}
        />
        <div className="pdf-preview-color-row">
          <span className={`pdf-preview-field-label ${t.label}`}>Arka plan</span>
          <ColorSwatchPicker
            color={fillColor}
            onColorChange={(c) => updateHeaderConfig({ lgsYearFillColor: c })}
            customTitle="Eğitim yılı arka plan rengi"
          />
        </div>
        <div className="pdf-preview-color-row">
          <span className={`pdf-preview-field-label ${t.label}`}>Yazı rengi</span>
          <ColorSwatchPicker
            color={yearTextColor}
            onColorChange={(c) => updateHeaderConfig({ lgsYearTextColor: c })}
            palette={APP_FILL_TEXT_PALETTE}
            customTitle="Eğitim yılı yazı rengi"
          />
        </div>
        <PadSliderRow
          label="Yatay iç boşluk"
          value={padX}
          min={4}
          max={48}
          onChange={(v) => updateHeaderConfig({ lgsYearPadXPt: v })}
        />
        <PadSliderRow
          label="Dikey iç boşluk"
          value={padY}
          min={2}
          max={24}
          onChange={(v) => updateHeaderConfig({ lgsYearPadYPt: v })}
        />
      </div>

      <div className="pdf-preview-collapsible-section">
        <SectionHeading>Kitapçık</SectionHeading>
        <div className="grid grid-cols-5 gap-1">
          {(
            [
              { id: "", label: "Yok" },
              { id: "A", label: "A" },
              { id: "B", label: "B" },
              { id: "C", label: "C" },
              { id: "D", label: "D" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id || "none"}
              type="button"
              role="radio"
              aria-checked={booklet === opt.id}
              onClick={() => updateHeaderConfig({ lgsBookletType: opt.id })}
              className={`rounded-md py-1.5 text-[11px] font-semibold transition ${
                booklet === opt.id ? t.segActive : t.segInactive
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </>
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
  const trialBrandName = useEditorStore((s) => s.trialBrandName);
  const trialBrandNameVisible = useEditorStore((s) => s.trialBrandNameVisible);
  const headerConfig = useEditorStore((s) => s.headerConfig);
  const updateHeaderConfig = useEditorStore((s) => s.updateHeaderConfig);
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
  const setTrialBrandName = useEditorStore((s) => s.setTrialBrandName);
  const setTrialBrandNameVisible = useEditorStore((s) => s.setTrialBrandNameVisible);
  const testNameTextColor =
    headerConfig.subjectPillTextColor?.trim() || APP_TEXT_ON_FILL_DEFAULT;
  const isLgsOfficial = isLgsOfficialBannerConfig(headerConfig);

  if (isLgsOfficial) {
    return <LgsBadgeFields />;
  }

  return (
    <>
      <div className="pdf-preview-collapsible-section">
        <SectionHeading>Kurum Adı</SectionHeading>
        <div className={`flex min-w-0 flex-col gap-2 ${trialBrandNameVisible ? "" : "opacity-50"}`}>
          <div className="flex min-w-0 items-center gap-2">
            <input
              type="checkbox"
              id="trial-brand-name-visible"
              checked={trialBrandNameVisible}
              onChange={(e) => setTrialBrandNameVisible(e.target.checked)}
              className="pdf-preview-checkbox pdf-preview-checkbox--sm shrink-0 cursor-pointer"
              aria-label="Kurum adı göster"
              title={trialBrandNameVisible ? "Başlıkta göster" : "Başlıkta gizle"}
            />
            <label
              htmlFor="trial-brand-name-visible"
              className={`min-w-0 flex-1 cursor-pointer text-[11px] font-medium ${t.label}`}
            >
              Rozette göster
            </label>
          </div>
          <input
            id="trial-brand-name"
            type="text"
            value={trialBrandName}
            onChange={(e) => setTrialBrandName(e.target.value)}
            placeholder="EDUMATH"
            title="Kurum Adı — örnek: EDUMATH"
            aria-label="Kurum Adı"
            className={`pdf-preview-header-field-row__input h-7 min-w-0 w-full ${t.input} !py-1 !text-xs`}
          />
        </div>
      </div>

      <div className="pdf-preview-collapsible-section">
        <SectionHeading>Sınav kodu</SectionHeading>
        <TrialMetaField
          label="Sınav kodu"
          hideLabel
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
      </div>

      <div className="pdf-preview-collapsible-section">
        <SectionHeading>Test adı</SectionHeading>
        <TrialMetaField
          label="Test adı"
          hideLabel
          value={testName}
          placeholder="Örn: MATEMATİK TESTİ"
          onChange={setTestName}
        />
        <div className="pdf-preview-color-row">
          <span className={`pdf-preview-field-label ${t.label}`}>
            Test adı arka plan rengi
          </span>
          <ColorSwatchPicker
            color={trialTestNameBgColor || APP_COLOR_DEFAULT}
            onColorChange={setTrialTestNameBgColor}
            customTitle="Test adı arka plan rengi"
          />
        </div>
        <div className="pdf-preview-color-row">
          <span className={`pdf-preview-field-label ${t.label}`}>Yazı rengi</span>
          <ColorSwatchPicker
            color={testNameTextColor}
            onColorChange={(c) => updateHeaderConfig({ subjectPillTextColor: c })}
            palette={APP_FILL_TEXT_PALETTE}
            customTitle="Test adı yazı rengi"
          />
        </div>
        <PadSliderRow
          label="Test adı arka plan opaklığı"
          value={trialTestNameBgOpacityPct ?? 100}
          min={0}
          max={100}
          onChange={(v) => setTrialTestNameBgOpacityPct(Math.round(v))}
        />
      </div>

      <div className="pdf-preview-collapsible-section">
        <SectionHeading>Kitapçık</SectionHeading>
        <TrialMetaField
          label="Kitapçık"
          hideLabel
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
    </>
  );
}
