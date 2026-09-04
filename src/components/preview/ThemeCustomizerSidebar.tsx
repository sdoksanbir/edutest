import { Check, Pipette } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import CollapsibleCard, { CollapseGroupProvider } from "./CollapsibleCard";
import PdfPreviewPanelHeader from "./PdfPreviewPanelHeader";
import { useEditorStore, type WatermarkLayout } from "../../store/editorStore";
import type { HeaderConfig } from "../../utils/corporateHeaderLayout";
import type { HeaderLeftMode } from "../../utils/headerLeftColumn";
import {
  clampPublicationLineFontPt,
  PUBLICATION_LINE_FONT_MAX_PT,
  PUBLICATION_LINE_FONT_MIN_PT,
} from "../../utils/headerLeftColumn";
import {
  PRESET_HEADER_LOGOS,
  resolveHeaderLogoUrl,
  type PresetHeaderLogoId,
} from "../../utils/presetHeaderLogos";
import { isRecolorablePresetLogo } from "../../utils/presetLogoRecolor";
import ThemedPresetLogoImg from "./ThemedPresetLogoImg";
import {
  HEADER_FIELD_FONT_DELTA_PT,
  HEADER_FIELD_FONT_MIN_PT,
  HEADER_FIELD_FONT_STEP_PT,
  clampHeaderFieldFontPt,
  formatHeaderFieldFontPtLabel,
  getHeaderFieldFontPt,
  type HeaderFontFieldKey,
} from "../../utils/headerFieldFonts";
import {
  HEADER_LOGO_SIZE_MAX_PCT,
  HEADER_LOGO_SIZE_MIN_PCT,
  clampHeaderLogoSizePct,
  removeWhiteBackgroundFromDataUrl,
} from "../../utils/headerLogo";
import {
  normalizeHeaderStyleId,
  type HeaderStyleId,
} from "../../utils/headerStyles";
import ThemeHeaderPreview from "../modals/ThemeHeaderPreview";
import TestBanner from "../test-banner/TestBanner";
import LeafTestCorporateBanner from "../leaf-test-banner/LeafTestCorporateBanner";
import ExamBanner from "../exam-banner/ExamBanner";
import { normalizeExamBannerTemplateId } from "../exam-banner/types";
import { leafTestBannerDataFromHeaderConfig } from "../../utils/leafTestBannerFromHeaderConfig";
import { normalizeBannerTemplateId } from "../test-banner/testBanner.types";
import { testBannerDataFromHeaderConfig } from "../../utils/testBannerFromHeaderConfig";
import { examBannerDataFromHeaderConfig } from "../../utils/examBannerFromHeaderConfig";
import {
  clampSubjectPillPadXPt,
  clampSubjectPillPadYPt,
  clampSubjectPillTextOffsetYPt,
  clampSubjectTopicGapPt,
  clampTopicSubTopicGapPt,
  SUBJECT_PILL_PAD_X_DEFAULT_PT,
  SUBJECT_PILL_PAD_X_MAX_PT,
  SUBJECT_PILL_PAD_X_MIN_PT,
  SUBJECT_PILL_PAD_Y_DEFAULT_PT,
  SUBJECT_PILL_PAD_Y_MAX_PT,
  SUBJECT_PILL_PAD_Y_MIN_PT,
  SUBJECT_PILL_TEXT_OFFSET_Y_DEFAULT_PT,
  SUBJECT_PILL_TEXT_OFFSET_Y_MAX_PT,
  SUBJECT_PILL_TEXT_OFFSET_Y_MIN_PT,
  SUBJECT_TOPIC_GAP_DEFAULT_PT,
  SUBJECT_TOPIC_GAP_MAX_PT,
  SUBJECT_TOPIC_GAP_MIN_PT,
  TOPIC_SUBTOPIC_GAP_DEFAULT_PT,
  TOPIC_SUBTOPIC_GAP_MAX_PT,
  TOPIC_SUBTOPIC_GAP_MIN_PT,
} from "../../utils/modernCorporateHeaderShared";
import {
  clampExamTypeBoxBorderWidthPt,
  clampExamTypeBoxManualWidthPt,
  clampExamTypeBoxManualHeightPt,
  clampExamTypeBoxPadXPt,
  clampExamTypeBoxPadYPt,
  clampExamTypeDividerWidthPt,
  combineExamTypeLines,
  EXAM_TYPE_BOX_BORDER_MAX_PT,
  EXAM_TYPE_BOX_BORDER_MIN_PT,
  EXAM_TYPE_BOX_MANUAL_MAX_W_PT,
  EXAM_TYPE_BOX_MANUAL_MIN_W_PT,
  EXAM_TYPE_BOX_MANUAL_MAX_H_PT,
  EXAM_TYPE_BOX_MANUAL_MIN_H_PT,
  EXAM_TYPE_BOX_PAD_X_MAX_PT,
  EXAM_TYPE_BOX_PAD_X_MIN_PT,
  EXAM_TYPE_BOX_PAD_Y_MAX_PT,
  EXAM_TYPE_BOX_PAD_Y_MIN_PT,
  EXAM_TYPE_DIVIDER_MAX_PT,
  EXAM_TYPE_DIVIDER_MIN_PT,
  type ExamTypeBoxBorderStyle,
  type ExamTypeTextAlign,
} from "../../utils/examTypeBox";
import {
  resolveBannerRightMode,
  type BannerRightMode,
  clampScoreBoxWidthPt,
  clampScoreBoxHeightPt,
  clampScoreBoxLabelFontPt,
  clampScoreBoxBorderWidthPt,
  clampScoreBoxLineWidthPt,
  resolveScoreBoxWidthPt,
  resolveScoreBoxHeightPt,
  resolveScoreBoxLabelFontPt,
  resolveScoreBoxFillColor,
  resolveScoreBoxBorderColor,
  resolveScoreBoxLabelColor,
  resolveScoreBoxBorderWidthPt,
  resolveScoreBoxLineWidthPt,
  clampTestNoWidthPt,
  clampTestNoHeightPt,
  resolveTestNoWidthPt,
  resolveTestNoHeightPt,
  STYLE_1_TEST_NO_W_MIN_PT,
  STYLE_1_TEST_NO_W_MAX_PT,
  STYLE_1_TEST_NO_H_MIN_PT,
  STYLE_1_TEST_NO_H_MAX_PT,
  STYLE_1_SCORE_BOX_W_MIN_PT,
  STYLE_1_SCORE_BOX_W_MAX_PT,
  STYLE_1_SCORE_BOX_H_MIN_PT,
  STYLE_1_SCORE_BOX_H_MAX_PT,
  STYLE_1_SCORE_LABEL_MIN_PT,
  STYLE_1_SCORE_LABEL_MAX_PT,
  STYLE_1_SCORE_BOX_BORDER_MIN_PT,
  STYLE_1_SCORE_BOX_BORDER_MAX_PT,
  STYLE_1_SCORE_LINE_MIN_PT,
  STYLE_1_SCORE_LINE_MAX_PT,
} from "../../utils/bannerRightMode";
import {
  mergeHeaderBadgeConfig,
  patchHeaderBadge,
  type HeaderBadgeSettings,
} from "../../utils/headerBadgeByStyle";
import { isHeaderFieldVisible } from "../../utils/headerFieldVisibility";
import { usePdfPreviewUi } from "./PdfPreviewUiThemeContext";
import { usePdfPreviewScrollSession } from "./PdfPreviewScrollSessionContext";
import type { PageFrameLineStyle } from "../../utils/pageFrame";
import {
  PAGE_FRAME_CORNER_RADIUS_MAX_MM,
  PAGE_FRAME_CORNER_RADIUS_MIN_MM,
  PAGE_FRAME_INNER_GAP_MAX_MM,
  PAGE_FRAME_INNER_GAP_MIN_MM,
} from "../../utils/pageFrame";

const COLOR_SWATCH_PALETTE = [
  { label: "Lacivert", color: "#0A1931" },
  { label: "Kırmızı", color: "#DC2626" },
  { label: "Yeşil", color: "#16A34A" },
  { label: "Turuncu", color: "#F97316" },
  { label: "Mor", color: "#7C3AED" },
] as const;

const PRIMARY_PALETTE = COLOR_SWATCH_PALETTE;

const ACCENT_PALETTE = [
  { label: "Kırmızı", color: "#DC2626" },
  { label: "Turuncu", color: "#F97316" },
  { label: "Mavi", color: "#2563EB" },
  { label: "Yeşil", color: "#059669" },
  { label: "Altın", color: "#C59B27" },
] as const;

const SUBJECT_PILL_TEXT_PALETTE = [
  { label: "Beyaz", color: "#FFFFFF" },
  { label: "Lacivert", color: "#0A1931" },
  { label: "Siyah", color: "#111827" },
  { label: "Kırmızı", color: "#DC2626" },
  { label: "Altın", color: "#C59B27" },
] as const;

const CLASSIC_THEME_LABELS: Record<HeaderStyleId, string> = {
  style_1: "Kurumsal",
  style_2: "Minimal",
  style_3: "Yaprak Test",
  style_4: "LGS Sözel",
};

const MAIN_HEADER_TEMPLATE_SLOTS: (
  | {
      kind: "classic";
      styleId: HeaderStyleId;
      label: string;
    }
  | { kind: "leaf-ref"; label: string }
)[] = [
  { kind: "classic", styleId: "style_1", label: CLASSIC_THEME_LABELS.style_1 },
  { kind: "classic", styleId: "style_2", label: CLASSIC_THEME_LABELS.style_2 },
  { kind: "leaf-ref", label: CLASSIC_THEME_LABELS.style_3 },
];

const BANNER_EXTRA_FIELDS: {
  key: "gradeLevel" | "testType" | "testNumber";
  fontKey?: HeaderFontFieldKey;
  label: string;
  placeholder: string;
}[] = [
  { key: "gradeLevel", label: "Sınıf Düzeyi", placeholder: "10. SINIF" },
  { key: "testType", fontKey: "testType", label: "Test Etiketi (sağ üst)", placeholder: "TEST" },
  { key: "testNumber", fontKey: "testNumber", label: "Test Numarası (daire)", placeholder: "01" },
];

type FieldDef = {
  key: HeaderFontFieldKey;
  label: string;
  placeholder: string;
};

const COMMON_FIELDS: FieldDef[] = [
  { key: "subject", label: "Ders Adı", placeholder: "MATEMATİK" },
  { key: "examType", label: "Sınav Türü", placeholder: "TYT / AYT" },
  { key: "topic", label: "Konu", placeholder: "POLİNOMLAR" },
  { key: "subTopic", label: "Alt Konu", placeholder: "BÖLME İŞLEMİ" },
  { key: "authorName", label: "Yazar / Öğretmen Adı", placeholder: "SERKAN DOKSANBİR" },
  { key: "brandName", label: "Kurum Adı", placeholder: "EDUMATH" },
];

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div className="pdf-preview-collapsible-section-heading w-full min-w-0">
      <span className="pdf-preview-collapsible-section-title">{children}</span>
    </div>
  );
}

function SegBtn({
  active,
  children,
  onClick,
  className = "",
  disabled = false,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}) {
  const { tokens: ui } = usePdfPreviewUi();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md text-xs font-medium transition ${className} ${
        active ? ui.segActive : ui.segInactive
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function FieldFontSizeStepper({
  fieldKey,
  styleId,
  headerConfig,
  onChange,
}: {
  fieldKey: HeaderFontFieldKey;
  styleId: string;
  headerConfig: HeaderConfig;
  onChange: (pt: number) => void;
}) {
  const { tokens: ui } = usePdfPreviewUi();
  const currentPt = getHeaderFieldFontPt(fieldKey, styleId, headerConfig);
  const minPt = Math.max(
    HEADER_FIELD_FONT_MIN_PT,
    getHeaderFieldFontPt(fieldKey, styleId, {
      ...headerConfig,
      fieldFontSizesPt: {},
    }) - HEADER_FIELD_FONT_DELTA_PT
  );
  const maxPt =
    getHeaderFieldFontPt(fieldKey, styleId, { ...headerConfig, fieldFontSizesPt: {} }) +
    HEADER_FIELD_FONT_DELTA_PT;

  return (
    <div className="pdf-preview-font-size-stepper flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        disabled={currentPt <= minPt + 0.001}
        onClick={() =>
          onChange(clampHeaderFieldFontPt(currentPt - HEADER_FIELD_FONT_STEP_PT, fieldKey, styleId))
        }
        aria-label={`${fieldKey} yazı boyutunu küçült`}
        className={`flex h-6 w-6 items-center justify-center rounded ${ui.smallBtn} disabled:cursor-not-allowed disabled:opacity-40`}
      >
        −
      </button>
      <span className={`pdf-preview-font-size-stepper__value text-xs font-semibold tabular-nums ${ui.monoValue}`}>
        {formatHeaderFieldFontPtLabel(currentPt)}
      </span>
      <button
        type="button"
        disabled={currentPt >= maxPt - 0.001}
        onClick={() =>
          onChange(clampHeaderFieldFontPt(currentPt + HEADER_FIELD_FONT_STEP_PT, fieldKey, styleId))
        }
        aria-label={`${fieldKey} yazı boyutunu büyüt`}
        className={`flex h-6 w-6 items-center justify-center rounded ${ui.smallBtn} disabled:cursor-not-allowed disabled:opacity-40`}
      >
        +
      </button>
    </div>
  );
}

function PinkToggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const { tokens: ui } = usePdfPreviewUi();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? ui.toggleOn : ui.toggleOff
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

function normalizeHexColor(color: string, fallback = "#000000"): string {
  const c = (color || "").trim();
  return /^#[0-9A-Fa-f]{6}$/i.test(c) ? c : fallback;
}

function ColorSwatch({
  color,
  label,
  selected,
  onSelect,
  disabled = false,
}: {
  color: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={label}
      aria-label={label}
      disabled={disabled}
      className={`h-3.5 w-3.5 shrink-0 rounded-[2px] border transition disabled:cursor-default disabled:opacity-70 ${
        selected
          ? "border-white ring-1 ring-blue-400 ring-offset-1 ring-offset-slate-950"
          : "border-slate-600/70 hover:border-slate-400"
      }`}
      style={{ backgroundColor: color }}
    />
  );
}

/** 5 kare swatch + kare renk picker — satıra sığan minimalist küme */
function ColorSwatchCluster({
  color,
  onColorChange,
  palette = COLOR_SWATCH_PALETTE,
  disabled = false,
  customTitle = "Özel renk",
}: {
  color: string;
  onColorChange: (c: string) => void;
  palette?: readonly { label: string; color: string }[];
  disabled?: boolean;
  customTitle?: string;
}) {
  const swatches = palette.slice(0, 5);
  const pickerValue = normalizeHexColor(color);
  return (
    <div
      className="pdf-preview-color-picker"
      role="group"
      aria-label={customTitle}
      title={customTitle}
    >
      <div className="pdf-preview-color-picker__swatches">
        {swatches.map(({ label: swatchLabel, color: swatchColor }) => (
          <ColorSwatch
            key={swatchColor}
            color={swatchColor}
            label={swatchLabel}
            selected={color.toLowerCase() === swatchColor.toLowerCase()}
            onSelect={() => onColorChange(swatchColor)}
            disabled={disabled}
          />
        ))}
        <label
          className={`pdf-preview-color-picker__custom relative h-3.5 w-3.5 shrink-0 ${
            disabled ? "pointer-events-none opacity-70" : "cursor-pointer"
          }`}
          title={customTitle}
        >
          <Pipette
            className="pdf-preview-color-picker__pipette"
            aria-hidden
            strokeWidth={2.5}
          />
          <input
            type="color"
            value={pickerValue}
            disabled={disabled}
            onChange={(e) => onColorChange(e.target.value)}
            className="absolute inset-0 z-[1] h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
            aria-label={customTitle}
          />
        </label>
      </div>
    </div>
  );
}

function PaletteColorRow({
  label,
  color,
  palette,
  onColorChange,
  disabled = false,
  customTitle = "Özel renk",
}: {
  label: string;
  color: string;
  palette: readonly { label: string; color: string }[];
  onColorChange: (c: string) => void;
  disabled?: boolean;
  customTitle?: string;
}) {
  const { tokens: ui } = usePdfPreviewUi();
  return (
    <div className="pdf-preview-color-row">
      <span className={`pdf-preview-field-label ${ui.microLabel}`}>{label}</span>
      <ColorSwatchCluster
        color={color}
        onColorChange={onColorChange}
        palette={palette}
        disabled={disabled}
        customTitle={customTitle}
      />
    </div>
  );
}

function PageFrameColorRow({
  themeColor,
  colorMode,
  customColor,
  palette,
  onThemeSelect,
  onCustomColorChange,
  disabled = false,
}: {
  themeColor: string;
  colorMode: "theme" | "custom";
  customColor: string;
  palette: readonly { label: string; color: string }[];
  onThemeSelect: () => void;
  onCustomColorChange: (c: string) => void;
  disabled?: boolean;
}) {
  const { tokens: ui } = usePdfPreviewUi();
  const themeSelected = colorMode === "theme";
  const pickerColor = colorMode === "custom" ? customColor : themeColor;

  return (
    <div className="pdf-preview-color-row">
      <span className={`pdf-preview-field-label ${ui.microLabel}`}>Renk</span>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          disabled={disabled}
          onClick={onThemeSelect}
          title="Tema rengi"
          aria-label="Tema rengi"
          className={`flex h-3.5 shrink-0 items-center rounded-[2px] border px-1 text-[7px] font-semibold transition disabled:cursor-default disabled:opacity-70 ${
            themeSelected
              ? "border-white ring-1 ring-blue-400 ring-offset-1 ring-offset-slate-950 text-white"
              : "border-slate-600/70 bg-slate-900 text-slate-400 hover:border-slate-400"
          }`}
          style={themeSelected ? { backgroundColor: themeColor } : undefined}
        >
          Tema
        </button>
        <ColorSwatchCluster
          color={pickerColor}
          onColorChange={onCustomColorChange}
          palette={palette}
          disabled={disabled}
          customTitle="Özel renk"
        />
      </div>
    </div>
  );
}

function CompactStrokeStyleRow({
  label,
  style,
  onStyleChange,
  widthPt,
  onWidthChange,
  widthMin,
  widthMax,
  color,
  onColorChange,
}: {
  label: string;
  style: ExamTypeBoxBorderStyle;
  onStyleChange: (s: ExamTypeBoxBorderStyle) => void;
  widthPt: number;
  onWidthChange: (pt: number) => void;
  widthMin: number;
  widthMax: number;
  color: string;
  onColorChange: (c: string) => void;
}) {
  const chips: { id: ExamTypeBoxBorderStyle; t: string }[] = [
    { id: "none", t: "Yok" },
    { id: "solid", t: "─" },
    { id: "dashed", t: "┄" },
    { id: "dotted", t: "⋯" },
  ];
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <span className="pdf-preview-field-label w-[3.25rem] shrink-0 text-[8px] text-slate-500">{label}</span>
        <div className="flex flex-1 gap-0.5">
          {chips.map(({ id, t }) => (
            <button
              key={id}
              type="button"
              onClick={() => onStyleChange(id)}
              className={`min-w-0 flex-1 rounded px-0.5 py-0.5 text-[8px] font-semibold transition ${
                style === id
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-700/80 bg-slate-900 text-slate-400 hover:border-slate-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      {style !== "none" && (
        <div className="flex items-center gap-1">
          <div className="pdf-preview-range-wrap min-w-0 flex-1">
            <input
              type="range"
              min={widthMin}
              max={widthMax}
              step={0.5}
              value={widthPt}
              onChange={(e) => onWidthChange(Number(e.target.value))}
              className="pdf-preview-range"
              style={{ height: 3 }}
            />
            <span className="w-6 shrink-0 text-right font-mono text-[8px] text-slate-400">
              {widthPt}
            </span>
          </div>
          <ColorSwatchCluster color={color} onColorChange={onColorChange} />
        </div>
      )}
    </div>
  );
}

function CompactPtSliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (pt: number) => void;
}) {
  const { tokens: ui } = usePdfPreviewUi();
  const scrollSession = usePdfPreviewScrollSession();
  return (
    <div className="pdf-preview-slider-field">
      <div className="pdf-preview-slider-field__meta">
        <span className={`pdf-preview-field-label ${ui.label}`}>{label}</span>
        <span className={`shrink-0 tabular-nums ${ui.valueBadge}`}>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
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

function CompactExamLineRow({
  label,
  value,
  onValueChange,
  placeholder,
  fontPt,
  onFontPtChange,
  color,
  onColorChange,
  palette = COLOR_SWATCH_PALETTE,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
  fontPt: number;
  onFontPtChange: (pt: number) => void;
  color: string;
  onColorChange: (c: string) => void;
  palette?: readonly { label: string; color: string }[];
}) {
  return (
    <div className="space-y-1">
      <div className="flex min-w-0 items-center gap-1">
        <span className="w-7 shrink-0 text-[8px] text-slate-500">{label}</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={placeholder}
          maxLength={28}
          className="h-5 min-w-0 flex-1 rounded border border-slate-700/80 bg-slate-950/60 px-1 text-[9px] text-slate-100 placeholder:text-slate-600 focus:border-blue-500/60 focus:outline-none"
        />
      </div>
      <div className="flex min-w-0 items-center gap-1">
        <ColorSwatchCluster color={color} onColorChange={onColorChange} palette={palette} />
        <div className="pdf-preview-range-wrap min-w-0 flex-1">
          <span className="shrink-0 text-[8px] text-slate-500">Pt</span>
          <input
            type="range"
            min={PUBLICATION_LINE_FONT_MIN_PT}
            max={PUBLICATION_LINE_FONT_MAX_PT}
            step={0.5}
            value={fontPt}
            onChange={(e) => onFontPtChange(clampPublicationLineFontPt(Number(e.target.value)))}
            className="pdf-preview-range"
            style={{ height: 3 }}
            title={`${fontPt}pt`}
          />
          <span className="shrink-0 font-mono text-[8px] text-slate-400">{fontPt}</span>
        </div>
      </div>
    </div>
  );
}

function PublicationLineRow({
  label,
  value,
  onValueChange,
  placeholder,
  fontPt,
  onFontPtChange,
  color,
  onColorChange,
  palette,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
  fontPt: number;
  onFontPtChange: (pt: number) => void;
  color: string;
  onColorChange: (c: string) => void;
  palette: readonly { label: string; color: string }[];
}) {
  return (
    <div className="space-y-1 rounded border border-slate-800 bg-slate-950/40 p-1.5">
      <span className="text-[9px] font-semibold text-slate-500">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        maxLength={28}
        className="h-6 w-full rounded border border-slate-700 bg-slate-950/80 px-1.5 text-[10px] text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
      />
      <div className="pdf-preview-range-wrap">
        <span className="text-[9px] text-slate-500">Punto</span>
        <input
          type="range"
          min={PUBLICATION_LINE_FONT_MIN_PT}
          max={PUBLICATION_LINE_FONT_MAX_PT}
          step={0.5}
          value={fontPt}
          onChange={(e) => onFontPtChange(clampPublicationLineFontPt(Number(e.target.value)))}
          className="pdf-preview-range"
          style={{ height: 4 }}
        />
        <span className="shrink-0 rounded bg-slate-800 px-1 py-0.5 font-mono text-[9px] text-blue-300">
          {fontPt}pt
        </span>
      </div>
      <PaletteColorRow
        label="Renk"
        color={color}
        palette={palette}
        onColorChange={onColorChange}
      />
    </div>
  );
}

export default function ThemeCustomizerSidebar() {
  const { tokens: ui, mode } = usePdfPreviewUi();
  const sectionBorder = mode === "light" ? "border-slate-200" : "border-[#30363d]";
  const headerStyleId = useEditorStore((s) => s.headerStyleId);
  const headerConfig = useEditorStore((s) => s.headerConfig);
  const themeColor = useEditorStore((s) => s.themeColor);
  const updateHeaderConfig = useEditorStore((s) => s.updateHeaderConfig);
  const setHeaderStyleId = useEditorStore((s) => s.setHeaderStyleId);
  const setThemeColor = useEditorStore((s) => s.setThemeColor);

  const activeStyle = normalizeHeaderStyleId(headerStyleId);
  const useExamBanner = headerConfig.useExamBanner === true;
  const useYaprakBanner = headerConfig.useYaprakBanner === true && !useExamBanner;
  const useLeafRefBanner =
    useExamBanner && headerConfig.examBannerTemplate === "leaf-ref-corporate";
  const useLgsRefBanner =
    useExamBanner && headerConfig.examBannerTemplate === "lgs-verbal-ref";
  const activeBannerTemplate = normalizeBannerTemplateId(headerConfig.bannerTemplate);
  const activeExamTemplate = normalizeExamBannerTemplateId(headerConfig.examBannerTemplate);
  const primaryColor = headerConfig.primaryColor || themeColor;
  const accentColor = headerConfig.accentColor || "#DC2626";
  const bannerPreviewData = useMemo(
    () => testBannerDataFromHeaderConfig(headerConfig),
    [headerConfig],
  );
  const leafBannerPreviewData = useMemo(
    () => leafTestBannerDataFromHeaderConfig(headerConfig, headerStyleId),
    [headerConfig, headerStyleId],
  );
  const examBannerPreviewData = useMemo(
    () => examBannerDataFromHeaderConfig(headerConfig),
    [headerConfig],
  );
  const bannerColors = useMemo(
    () => ({ primary: primaryColor, secondary: accentColor }),
    [primaryColor, accentColor],
  );
  const isClassicBanner =
    activeStyle === "style_2" && !useYaprakBanner && !useExamBanner;
  const [themeCollapseEpoch, setThemeCollapseEpoch] = useState(0);
  const [themeExpandEpoch, setThemeExpandEpoch] = useState(0);
  const headerLogoInputRef = useRef<HTMLInputElement>(null);
  const watermarkLogoInputRef = useRef<HTMLInputElement>(null);

  const logoSizePct = headerConfig.logoSizePct ?? 100;
  const showHeaderLeft = headerConfig.showHeaderLeft ?? false;
  const headerLeftModeRaw = String(headerConfig.headerLeftMode ?? "logo");
  const headerLeftMode: HeaderLeftMode =
    headerLeftModeRaw === "publicationText" || headerLeftModeRaw === "institutionText"
      ? "publicationText"
      : "logo";
  const line1Color = headerConfig.institutionLine1Color || primaryColor;
  const line2Color = headerConfig.institutionLine2Color || accentColor;
  const line1FontPt = headerConfig.institutionLine1FontPt ?? 9;
  const line2FontPt = headerConfig.institutionLine2FontPt ?? 7;
  const badgeStyleId = isClassicBanner ? "style_2" : activeStyle;
  const badgeConfig = mergeHeaderBadgeConfig(headerConfig, badgeStyleId);
  const bannerRightMode = resolveBannerRightMode(badgeConfig);
  const examTypeLine1 = badgeConfig.examTypeLine1 ?? "TYT-AYT";
  const examTypeLine2 = badgeConfig.examTypeLine2 ?? "TEST";
  const examTypeLine1Color = badgeConfig.examTypeLine1Color || primaryColor;
  const examTypeLine2Color = badgeConfig.examTypeLine2Color || accentColor;
  const examTypeLine1FontPt = badgeConfig.examTypeLine1FontPt ?? 9;
  const examTypeLine2FontPt = badgeConfig.examTypeLine2FontPt ?? 10;
  const examTypeBoxBorderStyle = (badgeConfig.examTypeBoxBorderStyle ?? "solid") as ExamTypeBoxBorderStyle;
  const examTypeBoxBorderColor = badgeConfig.examTypeBoxBorderColor || primaryColor;
  const examTypeBoxBorderWidthPt = badgeConfig.examTypeBoxBorderWidthPt ?? 1.5;
  const examTypeBoxManualWidthPt = badgeConfig.examTypeBoxManualWidthPt ?? 96;
  const examTypeBoxManualHeightPt = badgeConfig.examTypeBoxManualHeightPt ?? 36;
  const examTypeBoxPadXPt = badgeConfig.examTypeBoxPadXPt ?? 4;
  const examTypeBoxPadYPt = badgeConfig.examTypeBoxPadYPt ?? 4;
  const examTypeBoxFillEnabled = badgeConfig.examTypeBoxFillEnabled ?? false;
  const examTypeBoxFillColor = badgeConfig.examTypeBoxFillColor || "#F3F4F6";
  const examTypeTextAlign = (badgeConfig.examTypeTextAlign ?? "center") as ExamTypeTextAlign;
  const examTypeDividerStyle = (badgeConfig.examTypeDividerStyle ?? "none") as ExamTypeBoxBorderStyle;
  const examTypeDividerColor = badgeConfig.examTypeDividerColor || accentColor;
  const examTypeDividerWidthPt = badgeConfig.examTypeDividerWidthPt ?? 0.75;
  const subjectPillPadXPt = headerConfig.subjectPillPadXPt ?? SUBJECT_PILL_PAD_X_DEFAULT_PT;
  const subjectPillPadYPt = headerConfig.subjectPillPadYPt ?? SUBJECT_PILL_PAD_Y_DEFAULT_PT;
  const subjectPillFillColor =
    headerConfig.subjectPillFillColor?.trim() || accentColor;
  const subjectPillTextColor =
    headerConfig.subjectPillTextColor?.trim() || "#FFFFFF";
  const subjectPillTextOffsetYPt =
    headerConfig.subjectPillTextOffsetYPt ?? SUBJECT_PILL_TEXT_OFFSET_Y_DEFAULT_PT;
  const subjectTopicGapPt = headerConfig.subjectTopicGapPt ?? SUBJECT_TOPIC_GAP_DEFAULT_PT;
  const topicSubTopicGapPt = headerConfig.topicSubTopicGapPt ?? TOPIC_SUBTOPIC_GAP_DEFAULT_PT;
  const hasExamTypeLine2 = !!examTypeLine2.trim();
  const presetLogoId = headerConfig.presetLogoId ?? "5";
  const activeLogoUrl = resolveHeaderLogoUrl(headerConfig);
  const isCustomLogo = presetLogoId === "custom";
  const logoUseThemeColors = headerConfig.logoUseThemeColors ?? true;
  const logoColorPrimary = headerConfig.logoColorPrimary ?? primaryColor;
  const logoColorSecondary = headerConfig.logoColorSecondary ?? accentColor;
  const effectiveLogoPrimary = logoUseThemeColors ? primaryColor : logoColorPrimary;
  const effectiveLogoSecondary = logoUseThemeColors ? accentColor : logoColorSecondary;

  const showWatermark = useEditorStore((s) => s.showWatermark);
  const showColumnDivider = useEditorStore((s) => s.showColumnDivider);
  const showColumnDividerText = useEditorStore((s) => s.showColumnDividerText);
  const columnDividerText = useEditorStore((s) => s.columnDividerText);
  const columnDividerWidthPt = useEditorStore((s) => s.columnDividerWidthPt);
  const centerLineBold = useEditorStore((s) => s.centerLineBold);
  const centerLineItalic = useEditorStore((s) => s.centerLineItalic);
  const setShowColumnDivider = useEditorStore((s) => s.setShowColumnDivider);
  const setColumnDividerText = useEditorStore((s) => s.setColumnDividerText);
  const setShowColumnDividerText = useEditorStore((s) => s.setShowColumnDividerText);
  const setColumnDividerWidthPt = useEditorStore((s) => s.setColumnDividerWidthPt);
  const setCenterLineBold = useEditorStore((s) => s.setCenterLineBold);
  const setCenterLineItalic = useEditorStore((s) => s.setCenterLineItalic);
  const watermarkText = useEditorStore((s) => s.watermarkText);
  const watermarkLayout = useEditorStore((s) => s.watermarkLayout);
  const watermarkAngleDeg = useEditorStore((s) => s.watermarkAngleDeg);
  const watermarkOpacity = useEditorStore((s) => s.watermarkOpacity);
  const watermarkSize = useEditorStore((s) => s.watermarkSize);
  const watermarkLogoUrl = useEditorStore((s) => s.watermarkLogoUrl);
  const setShowWatermark = useEditorStore((s) => s.setShowWatermark);
  const setWatermarkText = useEditorStore((s) => s.setWatermarkText);
  const setWatermarkLayout = useEditorStore((s) => s.setWatermarkLayout);
  const setWatermarkAngleDeg = useEditorStore((s) => s.setWatermarkAngleDeg);
  const setWatermarkOpacity = useEditorStore((s) => s.setWatermarkOpacity);
  const setWatermarkSize = useEditorStore((s) => s.setWatermarkSize);
  const setWatermarkLogoUrl = useEditorStore((s) => s.setWatermarkLogoUrl);
  const showPageFrame = useEditorStore((s) => s.showPageFrame);
  const pageFrameColorMode = useEditorStore((s) => s.pageFrameColorMode);
  const pageFrameColor = useEditorStore((s) => s.pageFrameColor);
  const pageFrameWidthPt = useEditorStore((s) => s.pageFrameWidthPt);
  const pageFrameInnerGapMm = useEditorStore((s) => s.pageFrameInnerGapMm);
  const pageFrameCornerRadiusMm = useEditorStore((s) => s.pageFrameCornerRadiusMm);
  const pageFrameLineStyle = useEditorStore((s) => s.pageFrameLineStyle);
  const setShowPageFrame = useEditorStore((s) => s.setShowPageFrame);
  const setPageFrameColorMode = useEditorStore((s) => s.setPageFrameColorMode);
  const setPageFrameColor = useEditorStore((s) => s.setPageFrameColor);
  const setPageFrameWidthPt = useEditorStore((s) => s.setPageFrameWidthPt);
  const setPageFrameInnerGapMm = useEditorStore((s) => s.setPageFrameInnerGapMm);
  const setPageFrameCornerRadiusMm = useEditorStore((s) => s.setPageFrameCornerRadiusMm);
  const setPageFrameLineStyle = useEditorStore((s) => s.setPageFrameLineStyle);

  const handleColumnDividerTextChange = (text: string) => {
    setColumnDividerText(text);
  };

  const columnDividerTextActive = showColumnDivider && showColumnDividerText;

  const handleWatermarkLogoUpload = (file: File | undefined) => {
    if (!file || !/^image\/(png|jpe?g)$/i.test(file.type)) return;
    const reader = new FileReader();
    reader.onload = () => setWatermarkLogoUrl(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  };

  const handleHeaderLogoUpload = (file: File | undefined) => {
    if (!file || !/^image\/(png|jpe?g|webp)$/i.test(file.type)) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const raw = String(reader.result ?? "");
      try {
        const transparent = await removeWhiteBackgroundFromDataUrl(raw);
        updateHeaderConfig({ logoUrl: transparent, presetLogoId: "custom" });
      } catch {
        updateHeaderConfig({ logoUrl: raw, presetLogoId: "custom" });
      }
    };
    reader.readAsDataURL(file);
  };

  const layoutOptions: { id: WatermarkLayout; label: string }[] = [
    { id: "diagonal", label: "Çapraz" },
    { id: "horizontal", label: "Yatay" },
    { id: "vertical", label: "Dikey" },
  ];

  const handlePrimaryColor = (color: string) => {
    setThemeColor(color);
    updateHeaderConfig({ primaryColor: color });
  };

  const setFieldFontSize = (field: HeaderFontFieldKey, pt: number) => {
    updateHeaderConfig({
      fieldFontSizesPt: {
        ...(headerConfig.fieldFontSizesPt ?? {}),
        [field]: clampHeaderFieldFontPt(pt, field, headerStyleId),
      },
    });
  };

  const fields = COMMON_FIELDS
    .filter((field) => {
      if (isClassicBanner) {
        return (
          field.key === "subject" ||
          field.key === "topic" ||
          field.key === "subTopic" ||
          field.key === "brandName"
        );
      }
      return activeStyle !== "style_1" || (field.key !== "authorName" && field.key !== "examType");
    })
    .filter((field) => !useLeafRefBanner || field.key !== "authorName");

  const syncExamTypeLines = (line1: string, line2: string) =>
    combineExamTypeLines(line1, line2);

  const updateBadge = (partial: HeaderBadgeSettings) => {
    const patch = patchHeaderBadge(headerConfig, badgeStyleId, partial);
    if (isClassicBanner) {
      updateHeaderConfig(patch);
      return;
    }
    updateHeaderConfig({ ...partial, ...patch });
  };

  const setBannerRightMode = (mode: BannerRightMode) => {
    if (isClassicBanner) {
      updateBadge({ bannerRightMode: mode });
      return;
    }
    const hidden = { ...(headerConfig.fieldHidden ?? {}) };
    if (mode === "examType") delete hidden.examType;
    else hidden.examType = true;
    updateHeaderConfig({
      bannerRightMode: mode,
      fieldHidden: hidden,
      ...patchHeaderBadge(headerConfig, badgeStyleId, { bannerRightMode: mode }),
    });
  };

  return (
    <aside
      className={`pdf-preview-panel-theme-inner pdf-preview-sidebar-scroll flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l ${ui.sidebar} ${sectionBorder}`}
    >
      <PdfPreviewPanelHeader
        title="Tema ve başlık ayarları"
        side="right"
        onCollapseAll={() => setThemeCollapseEpoch((n) => n + 1)}
        onExpandAll={() => setThemeExpandEpoch((n) => n + 1)}
      />

      <CollapseGroupProvider closeEpoch={themeCollapseEpoch} openEpoch={themeExpandEpoch}>
      <div className="pdf-preview-panel-sections min-w-0 flex-1 overflow-y-auto overflow-x-hidden">

        <CollapsibleCard
          title="Başlık ayarları"
          className="mb-0 pdf-preview-collapsible"
          contentClassName="pdf-preview-theme-groups"
          defaultOpen={false}
        >
          <div className="pdf-preview-collapsible-section">
            <SectionHeading>Başlık şablonu</SectionHeading>
            <div className="grid grid-cols-3 gap-1.5">
              {MAIN_HEADER_TEMPLATE_SLOTS.map((slot) => {
                const selected =
                  slot.kind === "classic"
                    ? !useYaprakBanner && !useExamBanner && activeStyle === slot.styleId
                    : useLeafRefBanner;
                const key = slot.kind === "classic" ? slot.styleId : "leaf-ref-corporate";
                const schematicStyleId = slot.kind === "classic" ? slot.styleId : "style_3";
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (slot.kind === "classic") {
                        setHeaderStyleId(slot.styleId);
                        if (slot.styleId === "style_1") {
                          const primary =
                            headerConfig.primaryColor?.trim() || "#0A1931";
                          setThemeColor(primary);
                          updateHeaderConfig({
                            useYaprakBanner: false,
                            useExamBanner: false,
                            primaryColor: primary,
                          });
                        } else {
                          updateHeaderConfig({
                            useYaprakBanner: false,
                            useExamBanner: false,
                          });
                        }
                      } else {
                        setHeaderStyleId("style_3");
                        const nextHidden = { ...(headerConfig.fieldHidden ?? {}) };
                        if (!useLeafRefBanner) {
                          nextHidden.examType = true;
                          nextHidden.subTopic = true;
                        }
                        updateHeaderConfig({
                          examBannerTemplate: "leaf-ref-corporate",
                          useExamBanner: true,
                          useYaprakBanner: false,
                          fieldHidden: nextHidden,
                        });
                      }
                    }}
                    className={`pdf-preview-header-theme-card${selected ? " pdf-preview-header-theme-card--selected" : ""}`}
                    aria-pressed={selected}
                    aria-label={`${slot.label} başlık şablonu`}
                  >
                    <div className="pdf-preview-header-theme-card__preview-wrap pdf-preview-header-theme-card__preview-wrap--schematic">
                      <ThemeHeaderPreview
                        styleId={schematicStyleId}
                        selected={selected}
                        accentColor={accentColor}
                        variant="schematic"
                      />
                      {selected ? (
                        <span className="pdf-preview-header-theme-card__check" aria-hidden>
                          <Check className="pdf-preview-header-theme-card__check-icon" strokeWidth={3} />
                        </span>
                      ) : null}
                    </div>
                    <span className="pdf-preview-header-theme-card__label">{slot.label}</span>
                  </button>
                );
              })}
            </div>

            {useLeafRefBanner ? (
              <div className="test-banner-live-preview test-banner-live-preview--compact mt-2">
                <LeafTestCorporateBanner
                  data={leafBannerPreviewData}
                  thumbnail
                  ariaLabel="Seçili banner canlı önizleme"
                />
              </div>
            ) : useExamBanner ? (
              <div className="test-banner-live-preview test-banner-live-preview--compact mt-2">
                <ExamBanner
                  template={activeExamTemplate}
                  data={examBannerPreviewData}
                  style={{ primaryColor, secondaryColor: accentColor }}
                  ariaLabel="Seçili banner canlı önizleme"
                />
              </div>
            ) : useYaprakBanner ? (
              <div className="test-banner-live-preview test-banner-live-preview--compact mt-2">
                <TestBanner
                  template={activeBannerTemplate}
                  data={bannerPreviewData}
                  colors={bannerColors}
                  thumbnail
                  ariaLabel="Seçili banner canlı önizleme"
                />
              </div>
            ) : (
              <div className="test-banner-live-preview test-banner-live-preview--compact mt-2">
                <ThemeHeaderPreview
                  styleId={activeStyle}
                  selected
                  accentColor={accentColor}
                  variant="detailed"
                />
              </div>
            )}
            {isClassicBanner ? (
              <p className={`mt-2 ${ui.labelMuted}`}>
                Orta şerit test adını gösterir. Açıklama kutusu sol panelde Yönerge ile açılır.
              </p>
            ) : null}
          </div>

          <div className="pdf-preview-collapsible-section">
            <SectionHeading>Tema Rengi</SectionHeading>
            <PaletteColorRow
              label="Ana Renk"
              color={primaryColor}
              palette={PRIMARY_PALETTE}
              customTitle="Özel ana renk"
              onColorChange={handlePrimaryColor}
            />
            <PaletteColorRow
              label="Vurgu"
              color={accentColor}
              palette={ACCENT_PALETTE}
              customTitle="Özel vurgu rengi"
              onColorChange={(c) => updateHeaderConfig({ accentColor: c })}
            />
          </div>
        </CollapsibleCard>

        {(activeStyle === "style_1" || isClassicBanner) && (
          <CollapsibleCard
            key={bannerRightMode}
            title="Başlık Rozeti"
            className="mb-0 pdf-preview-collapsible"
            contentClassName="space-y-2.5"
            defaultOpen={bannerRightMode !== "hidden"}
          >
              <div className="grid min-w-0 grid-cols-2 gap-1">
                  {(
                    [
                      { id: "examType" as BannerRightMode, label: "Sınav Türü" },
                      { id: "score" as BannerRightMode, label: "D / Y / B" },
                      { id: "testNo" as BannerRightMode, label: "Test No" },
                      { id: "hidden" as BannerRightMode, label: "Kapalı" },
                    ] as const
                  ).map(({ id, label }) => (
                    <SegBtn
                      key={id}
                      active={bannerRightMode === id}
                      onClick={() => setBannerRightMode(id)}
                      className="py-1.5 text-[10px]"
                    >
                      {label}
                    </SegBtn>
                  ))}
                </div>
                <div className="space-y-2.5">
                  {bannerRightMode === "hidden" ? (
                    <p className={`text-[11px] leading-snug ${ui.labelMuted}`}>
                      Sağ alan kapalı — göstermek için bir sekme seçin
                    </p>
                  ) : bannerRightMode === "score" ? (
                    <div className="space-y-2">
                      <CompactPtSliderRow
                        label="Genişlik"
                        value={resolveScoreBoxWidthPt(badgeConfig)}
                        min={STYLE_1_SCORE_BOX_W_MIN_PT}
                        max={STYLE_1_SCORE_BOX_W_MAX_PT}
                        onChange={(pt) =>
                          updateBadge({ scoreBoxWidthPt: clampScoreBoxWidthPt(pt) })
                        }
                      />
                      <CompactPtSliderRow
                        label="Yükseklik"
                        value={resolveScoreBoxHeightPt(badgeConfig)}
                        min={STYLE_1_SCORE_BOX_H_MIN_PT}
                        max={STYLE_1_SCORE_BOX_H_MAX_PT}
                        onChange={(pt) =>
                          updateBadge({ scoreBoxHeightPt: clampScoreBoxHeightPt(pt) })
                        }
                      />
                      <CompactPtSliderRow
                        label="Yazı boyutu"
                        value={resolveScoreBoxLabelFontPt(badgeConfig)}
                        min={STYLE_1_SCORE_LABEL_MIN_PT}
                        max={STYLE_1_SCORE_LABEL_MAX_PT}
                        step={0.5}
                        onChange={(pt) =>
                          updateBadge({
                            scoreBoxLabelFontPt: clampScoreBoxLabelFontPt(pt),
                          })
                        }
                      />
                      <CompactPtSliderRow
                        label="Çerçeve kalınlığı"
                        value={resolveScoreBoxBorderWidthPt(badgeConfig)}
                        min={STYLE_1_SCORE_BOX_BORDER_MIN_PT}
                        max={STYLE_1_SCORE_BOX_BORDER_MAX_PT}
                        step={0.25}
                        onChange={(pt) =>
                          updateBadge({
                            scoreBoxBorderWidthPt: clampScoreBoxBorderWidthPt(pt),
                          })
                        }
                      />
                      <CompactPtSliderRow
                        label="Alt çizgi kalınlığı"
                        value={resolveScoreBoxLineWidthPt(badgeConfig)}
                        min={STYLE_1_SCORE_LINE_MIN_PT}
                        max={STYLE_1_SCORE_LINE_MAX_PT}
                        step={0.25}
                        onChange={(pt) =>
                          updateBadge({
                            scoreBoxLineWidthPt: clampScoreBoxLineWidthPt(pt),
                          })
                        }
                      />
                      <div className="pdf-preview-color-row">
                        <span className={`pdf-preview-field-label ${ui.label}`}>Yazı</span>
                        <ColorSwatchCluster
                          color={resolveScoreBoxLabelColor(badgeConfig)}
                          onColorChange={(c) => updateBadge({ scoreBoxLabelColor: c })}
                          palette={PRIMARY_PALETTE}
                          customTitle="Doğru / Yanlış / Boş yazı rengi"
                        />
                      </div>
                      <div className="pdf-preview-color-row">
                        <span className={`pdf-preview-field-label ${ui.label}`}>Çerçeve</span>
                        <ColorSwatchCluster
                          color={resolveScoreBoxBorderColor(badgeConfig)}
                          onColorChange={(c) => updateBadge({ scoreBoxBorderColor: c })}
                          palette={PRIMARY_PALETTE}
                          customTitle="Doğru / Yanlış / Boş çerçeve rengi"
                        />
                      </div>
                      <div className="pdf-preview-color-row">
                        <span className={`pdf-preview-field-label ${ui.label}`}>Dolgu</span>
                        <ColorSwatchCluster
                          color={resolveScoreBoxFillColor(badgeConfig)}
                          onColorChange={(c) => updateBadge({ scoreBoxFillColor: c })}
                          palette={SUBJECT_PILL_TEXT_PALETTE}
                          customTitle="Doğru / Yanlış / Boş arka plan rengi"
                        />
                      </div>
                    </div>
                  ) : bannerRightMode === "testNo" ? (
                    <div className="space-y-2">
                      <CompactPtSliderRow
                        label="Genişlik"
                        value={resolveTestNoWidthPt(badgeConfig)}
                        min={STYLE_1_TEST_NO_W_MIN_PT}
                        max={STYLE_1_TEST_NO_W_MAX_PT}
                        onChange={(pt) =>
                          updateBadge({ testNoWidthPt: clampTestNoWidthPt(pt) })
                        }
                      />
                      <CompactPtSliderRow
                        label="Yükseklik"
                        value={resolveTestNoHeightPt(badgeConfig)}
                        min={STYLE_1_TEST_NO_H_MIN_PT}
                        max={STYLE_1_TEST_NO_H_MAX_PT}
                        onChange={(pt) =>
                          updateBadge({ testNoHeightPt: clampTestNoHeightPt(pt) })
                        }
                      />
                      <CompactExamLineRow
                        label="Ad"
                        value={badgeConfig.testType ?? ""}
                        onValueChange={(v) => updateBadge({ testType: v })}
                        placeholder="TEST"
                        fontPt={badgeConfig.testNoLabelFontPt ?? 8}
                        onFontPtChange={(pt) => updateBadge({ testNoLabelFontPt: pt })}
                        color={
                          badgeConfig.testNoLabelColor?.trim() || "#FFFFFF"
                        }
                        onColorChange={(c) => updateBadge({ testNoLabelColor: c })}
                      />
                      <CompactExamLineRow
                        label="No"
                        value={badgeConfig.testNumber ?? ""}
                        onValueChange={(v) => updateBadge({ testNumber: v })}
                        placeholder="01"
                        fontPt={badgeConfig.testNoNumFontPt ?? 10}
                        onFontPtChange={(pt) => updateBadge({ testNoNumFontPt: pt })}
                        color={badgeConfig.testNoNumColor?.trim() || primaryColor}
                        onColorChange={(c) => updateBadge({ testNoNumColor: c })}
                      />
                      <div className="pdf-preview-color-row">
                        <span className={`pdf-preview-field-label ${ui.label}`}>Dolgu</span>
                        <ColorSwatchCluster
                          color={badgeConfig.testNoFillColor?.trim() || accentColor}
                          onColorChange={(c) => updateBadge({ testNoFillColor: c })}
                          palette={ACCENT_PALETTE}
                          customTitle="Test No dolgu rengi"
                        />
                      </div>
                      <div className="pdf-preview-color-row">
                        <span className={`pdf-preview-field-label ${ui.label}`}>Çerçeve</span>
                        <ColorSwatchCluster
                          color={badgeConfig.testNoBorderColor?.trim() || accentColor}
                          onColorChange={(c) => updateBadge({ testNoBorderColor: c })}
                          palette={ACCENT_PALETTE}
                          customTitle="Test No çerçeve rengi"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className={`mb-1 block ${ui.label}`}>Hiza</span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(
                            [
                              { id: "left" as ExamTypeTextAlign, label: "Sol" },
                              { id: "center" as ExamTypeTextAlign, label: "Orta" },
                              { id: "right" as ExamTypeTextAlign, label: "Sağ" },
                            ] as const
                          ).map(({ id, label }) => (
                            <SegBtn
                              key={id}
                              active={examTypeTextAlign === id}
                              onClick={() => updateBadge({ examTypeTextAlign: id })}
                              className="py-2"
                            >
                              {label}
                            </SegBtn>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <CompactExamLineRow
                          label="1."
                          value={examTypeLine1}
                          onValueChange={(v) =>
                            updateBadge({
                              examTypeLine1: v,
                              examType: syncExamTypeLines(v, examTypeLine2),
                            })
                          }
                          placeholder="Sınıf ya da Sınav Türü"
                          fontPt={examTypeLine1FontPt}
                          onFontPtChange={(pt) => updateBadge({ examTypeLine1FontPt: pt })}
                          color={examTypeLine1Color}
                          onColorChange={(c) => updateBadge({ examTypeLine1Color: c })}
                        />
                        <CompactExamLineRow
                          label="2."
                          value={examTypeLine2}
                          onValueChange={(v) =>
                            updateBadge({
                              examTypeLine2: v,
                              examType: syncExamTypeLines(examTypeLine1, v),
                            })
                          }
                          placeholder="Ders Adı"
                          fontPt={examTypeLine2FontPt}
                          onFontPtChange={(pt) => updateBadge({ examTypeLine2FontPt: pt })}
                          color={examTypeLine2Color}
                          onColorChange={(c) => updateBadge({ examTypeLine2Color: c })}
                        />
                        {hasExamTypeLine2 && (
                          <CompactStrokeStyleRow
                            label="Ara"
                            style={examTypeDividerStyle}
                            onStyleChange={(s) => updateBadge({ examTypeDividerStyle: s })}
                            widthPt={examTypeDividerWidthPt}
                            onWidthChange={(pt) =>
                              updateBadge({
                                examTypeDividerWidthPt: clampExamTypeDividerWidthPt(pt),
                              })
                            }
                            widthMin={EXAM_TYPE_DIVIDER_MIN_PT}
                            widthMax={EXAM_TYPE_DIVIDER_MAX_PT}
                            color={examTypeDividerColor}
                            onColorChange={(c) => updateBadge({ examTypeDividerColor: c })}
                          />
                        )}
                      </div>

                      <div className="space-y-2">
                        <CompactStrokeStyleRow
                          label="Kutu"
                          style={examTypeBoxBorderStyle}
                          onStyleChange={(s) => updateBadge({ examTypeBoxBorderStyle: s })}
                          widthPt={examTypeBoxBorderWidthPt}
                          onWidthChange={(pt) =>
                            updateBadge({
                              examTypeBoxBorderWidthPt: clampExamTypeBoxBorderWidthPt(pt),
                            })
                          }
                          widthMin={EXAM_TYPE_BOX_BORDER_MIN_PT}
                          widthMax={EXAM_TYPE_BOX_BORDER_MAX_PT}
                          color={examTypeBoxBorderColor}
                          onColorChange={(c) => updateBadge({ examTypeBoxBorderColor: c })}
                        />
                        <div className="pdf-preview-color-row">
                          <span className={`pdf-preview-field-label ${ui.label}`}>Dolgu</span>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <PinkToggle
                              checked={examTypeBoxFillEnabled}
                              onChange={(v) => updateBadge({ examTypeBoxFillEnabled: v })}
                              label="Kutu arka plan dolgusu"
                            />
                            {examTypeBoxFillEnabled && (
                              <ColorSwatchCluster
                                color={examTypeBoxFillColor}
                                onColorChange={(c) =>
                                  updateBadge({ examTypeBoxFillColor: c })
                                }
                                customTitle="Kutu dolgu rengi"
                              />
                            )}
                          </div>
                        </div>
                        <div className="pdf-preview-slider-field">
                          <div className="pdf-preview-slider-field__meta">
                            <span className={`pdf-preview-field-label ${ui.label}`}>Genişlik</span>
                            <span className={`shrink-0 tabular-nums ${ui.valueBadge}`}>
                              {examTypeBoxManualWidthPt}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={EXAM_TYPE_BOX_MANUAL_MIN_W_PT}
                            max={EXAM_TYPE_BOX_MANUAL_MAX_W_PT}
                            step={1}
                            value={examTypeBoxManualWidthPt}
                            onChange={(e) =>
                              updateBadge({
                                examTypeBoxManualWidthPt: clampExamTypeBoxManualWidthPt(
                                  Number(e.target.value),
                                ),
                              })
                            }
                            className="pdf-preview-range"
                            style={{ height: 4 }}
                          />
                        </div>
                        <div className="pdf-preview-slider-field">
                          <div className="pdf-preview-slider-field__meta">
                            <span className={`pdf-preview-field-label ${ui.label}`}>Yükseklik</span>
                            <span className={`shrink-0 tabular-nums ${ui.valueBadge}`}>
                              {examTypeBoxManualHeightPt}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={EXAM_TYPE_BOX_MANUAL_MIN_H_PT}
                            max={EXAM_TYPE_BOX_MANUAL_MAX_H_PT}
                            step={1}
                            value={examTypeBoxManualHeightPt}
                            onChange={(e) =>
                              updateBadge({
                                examTypeBoxManualHeightPt: clampExamTypeBoxManualHeightPt(
                                  Number(e.target.value),
                                ),
                              })
                            }
                            className="pdf-preview-range"
                            style={{ height: 4 }}
                          />
                        </div>
                        <CompactPtSliderRow
                          label="İç Yatay"
                          value={examTypeBoxPadXPt}
                          min={EXAM_TYPE_BOX_PAD_X_MIN_PT}
                          max={EXAM_TYPE_BOX_PAD_X_MAX_PT}
                          onChange={(pt) =>
                            updateBadge({ examTypeBoxPadXPt: clampExamTypeBoxPadXPt(pt) })
                          }
                        />
                        <CompactPtSliderRow
                          label="İç Dikey"
                          value={examTypeBoxPadYPt}
                          min={EXAM_TYPE_BOX_PAD_Y_MIN_PT}
                          max={EXAM_TYPE_BOX_PAD_Y_MAX_PT}
                          onChange={(pt) =>
                            updateBadge({ examTypeBoxPadYPt: clampExamTypeBoxPadYPt(pt) })
                          }
                        />
                      </div>
                    </>
                  )}
                </div>
          </CollapsibleCard>
        )}

        <CollapsibleCard
          title="Başlık bilgileri"
          className="mb-0 pdf-preview-collapsible"
          contentClassName="pdf-preview-theme-groups"
          defaultOpen={isClassicBanner}
        >
          <div className="flex flex-col gap-3">
            {fields.map(({ key, label, placeholder }) => {
              const visible = isHeaderFieldVisible(headerConfig, key);
              return (
                <div
                  key={key}
                  className={`pdf-preview-header-field-row ${visible ? "" : "opacity-50"}`}
                >
                  <input
                    type="checkbox"
                    id={`header-field-visible-${key}`}
                    checked={visible}
                    onChange={(e) => {
                      const next = { ...(headerConfig.fieldHidden ?? {}) };
                      if (e.target.checked) delete next[key];
                      else next[key] = true;
                      updateHeaderConfig({ fieldHidden: next });
                    }}
                    className="pdf-preview-checkbox pdf-preview-checkbox--sm shrink-0 cursor-pointer"
                    aria-label={`${label} göster`}
                    title={visible ? "Başlıkta göster" : "Başlıkta gizle"}
                  />
                  <input
                    id={`header-field-${key}`}
                    type="text"
                    value={String(headerConfig[key] ?? "")}
                    onChange={(e) => updateHeaderConfig({ [key]: e.target.value })}
                    placeholder={label}
                    title={`${label} — örnek: ${placeholder}`}
                    aria-label={label}
                    className={`pdf-preview-header-field-row__input h-7 min-w-0 flex-1 ${ui.input} !py-1 !text-xs`}
                  />
                  <FieldFontSizeStepper
                    fieldKey={key}
                    styleId={headerStyleId}
                    headerConfig={headerConfig}
                    onChange={(pt) => setFieldFontSize(key, pt)}
                  />
                </div>
              );
            })}
            {BANNER_EXTRA_FIELDS.filter((field) => {
              if (isClassicBanner) return false;
              // Tema 1 kurumsal: sınıf / test / no girişleri Sağ Alan'da yönetilir
              if (activeStyle === "style_1" && !useYaprakBanner && !useExamBanner) {
                return false;
              }
              return !useLgsRefBanner || field.key === "gradeLevel";
            }).map(({ key, fontKey, label, placeholder }) => (
              <div key={key} className="pdf-preview-header-field-row">
                <span className="pdf-preview-header-field-row__spacer shrink-0" aria-hidden />
                <input
                  id={`banner-field-${key}`}
                  type="text"
                  value={String(headerConfig[key] ?? "")}
                  onChange={(e) => updateHeaderConfig({ [key]: e.target.value })}
                  placeholder={label}
                  title={`${label} — örnek: ${placeholder}`}
                  aria-label={label}
                  className={`pdf-preview-header-field-row__input h-7 min-w-0 flex-1 ${ui.input} !py-1 !text-xs`}
                />
                {useLeafRefBanner && fontKey ? (
                  <FieldFontSizeStepper
                    fieldKey={fontKey}
                    styleId={headerStyleId}
                    headerConfig={headerConfig}
                    onChange={(pt) => setFieldFontSize(fontKey, pt)}
                  />
                ) : (
                  <span className="pdf-preview-font-size-stepper shrink-0 opacity-0" aria-hidden>
                    <span className="pdf-preview-font-size-stepper__value">—</span>
                  </span>
                )}
              </div>
            ))}
          </div>

          {(activeStyle === "style_1" || isClassicBanner) && (
            <div className="pdf-preview-collapsible-section">
              <SectionHeading>Ders / Konu Boşlukları</SectionHeading>
              <PaletteColorRow
                label="Ders Arka Plan"
                color={subjectPillFillColor}
                palette={ACCENT_PALETTE}
                customTitle="Ders adı arka plan rengi"
                onColorChange={(c) => updateHeaderConfig({ subjectPillFillColor: c })}
              />
              <PaletteColorRow
                label="Ders Yazı"
                color={subjectPillTextColor}
                palette={SUBJECT_PILL_TEXT_PALETTE}
                customTitle="Ders adı yazı rengi"
                onColorChange={(c) => updateHeaderConfig({ subjectPillTextColor: c })}
              />
              <CompactPtSliderRow
                label="Ders Adı Dikey Konum"
                value={subjectPillTextOffsetYPt}
                min={SUBJECT_PILL_TEXT_OFFSET_Y_MIN_PT}
                max={SUBJECT_PILL_TEXT_OFFSET_Y_MAX_PT}
                onChange={(pt) =>
                  updateHeaderConfig({
                    subjectPillTextOffsetYPt: clampSubjectPillTextOffsetYPt(pt),
                  })
                }
              />
              <CompactPtSliderRow
                label="Ders Adı Yatay İç Boşluk"
                value={subjectPillPadXPt}
                min={SUBJECT_PILL_PAD_X_MIN_PT}
                max={SUBJECT_PILL_PAD_X_MAX_PT}
                onChange={(pt) =>
                  updateHeaderConfig({ subjectPillPadXPt: clampSubjectPillPadXPt(pt) })
                }
              />
              <CompactPtSliderRow
                label="Ders Adı Dikey İç Boşluk"
                value={subjectPillPadYPt}
                min={SUBJECT_PILL_PAD_Y_MIN_PT}
                max={SUBJECT_PILL_PAD_Y_MAX_PT}
                onChange={(pt) =>
                  updateHeaderConfig({ subjectPillPadYPt: clampSubjectPillPadYPt(pt) })
                }
              />
              <CompactPtSliderRow
                label="Ders Adı - Konu Adı Arasındaki Boşluk"
                value={subjectTopicGapPt}
                min={SUBJECT_TOPIC_GAP_MIN_PT}
                max={SUBJECT_TOPIC_GAP_MAX_PT}
                onChange={(pt) =>
                  updateHeaderConfig({ subjectTopicGapPt: clampSubjectTopicGapPt(pt) })
                }
              />
              <CompactPtSliderRow
                label="Konu Adı - Alt Konu Adı Arasındaki Boşluk"
                value={topicSubTopicGapPt}
                min={TOPIC_SUBTOPIC_GAP_MIN_PT}
                max={TOPIC_SUBTOPIC_GAP_MAX_PT}
                onChange={(pt) =>
                  updateHeaderConfig({ topicSubTopicGapPt: clampTopicSubTopicGapPt(pt) })
                }
              />
            </div>
          )}
        </CollapsibleCard>

        <CollapsibleCard
          title="Logo ayarları"
          className="mb-0 pdf-preview-collapsible"
          contentClassName="pdf-preview-theme-groups"
          defaultOpen={isClassicBanner}
        >
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <span className={ui.labelStrong}>Logo ekle</span>
                <PinkToggle
                  checked={showHeaderLeft}
                  onChange={(v) => updateHeaderConfig({ showHeaderLeft: v })}
                  label="Logo ekle"
                />
              </div>
              {!showHeaderLeft ? (
                <p className="text-[9px] text-slate-500">
                  Logo alanı kapalı — başlıkta göstermek için switch&apos;i açın
                </p>
              ) : (
                <>
                  {!isClassicBanner && (
                  <div className="flex gap-1">
                    {(
                      [
                        { id: "logo" as HeaderLeftMode, label: "Logo" },
                        { id: "publicationText" as HeaderLeftMode, label: "Yayın Adı" },
                      ] as const
                    ).map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => updateHeaderConfig({ headerLeftMode: id })}
                        className={`min-w-0 flex-1 rounded px-1 py-1 text-[9px] font-semibold transition ${
                          headerLeftMode === id
                            ? "bg-indigo-600 text-white"
                            : "border border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  )}

                  {(isClassicBanner || headerLeftMode === "logo") ? (
                    <>
                      <div className="grid grid-cols-5 gap-1">
                        {PRESET_HEADER_LOGOS.map(({ id, label, url }) => {
                          const selected = !isCustomLogo && presetLogoId === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              title={label}
                              onClick={() =>
                                updateHeaderConfig({
                                  presetLogoId: id as PresetHeaderLogoId,
                                  logoUrl: url,
                                })
                              }
                              className={`flex aspect-square items-center justify-center overflow-hidden rounded border p-0.5 transition ${
                                selected
                                  ? "border-blue-500 bg-white ring-1 ring-blue-500"
                                  : "border-slate-700 bg-white/95 hover:border-slate-500"
                              }`}
                            >
                              <ThemedPresetLogoImg
                                url={url}
                                presetId={id}
                                primaryColor={effectiveLogoPrimary}
                                accentColor={effectiveLogoSecondary}
                                alt={label}
                                className="max-h-full max-w-full object-contain"
                              />
                            </button>
                          );
                        })}
                      </div>
                      {!isCustomLogo && isRecolorablePresetLogo(presetLogoId) && (
                        <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/50 p-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                              Logo Renkleri
                            </span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => updateHeaderConfig({ logoUseThemeColors: true })}
                                className={`rounded px-2 py-0.5 text-[9px] font-semibold transition ${
                                  logoUseThemeColors
                                    ? "bg-indigo-600 text-white"
                                    : "border border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700"
                                }`}
                              >
                                Tema
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateHeaderConfig({
                                    logoUseThemeColors: false,
                                    logoColorPrimary: logoColorPrimary || primaryColor,
                                    logoColorSecondary: logoColorSecondary || accentColor,
                                  })
                                }
                                className={`rounded px-2 py-0.5 text-[9px] font-semibold transition ${
                                  !logoUseThemeColors
                                    ? "bg-indigo-600 text-white"
                                    : "border border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700"
                                }`}
                              >
                                Özel
                              </button>
                            </div>
                          </div>
                          <PaletteColorRow
                            label="Renk 1"
                            color={logoUseThemeColors ? primaryColor : logoColorPrimary}
                            palette={PRIMARY_PALETTE}
                            disabled={logoUseThemeColors}
                            customTitle="Özel logo rengi 1"
                            onColorChange={(c) =>
                              updateHeaderConfig({ logoUseThemeColors: false, logoColorPrimary: c })
                            }
                          />
                          <PaletteColorRow
                            label="Renk 2"
                            color={logoUseThemeColors ? accentColor : logoColorSecondary}
                            palette={ACCENT_PALETTE}
                            disabled={logoUseThemeColors}
                            customTitle="Özel logo rengi 2"
                            onColorChange={(c) =>
                              updateHeaderConfig({ logoUseThemeColors: false, logoColorSecondary: c })
                            }
                          />
                          {logoUseThemeColors && (
                            <p className="text-[9px] text-slate-500">
                              Tema renkleri uygulanıyor — özel seçim için Özel&apos;e geçin
                            </p>
                          )}
                        </div>
                      )}
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-12 min-w-0 flex-1 items-center justify-center overflow-hidden rounded border border-dashed border-slate-600 bg-white/95 px-2">
                          {activeLogoUrl ? (
                            isCustomLogo ? (
                              <img
                                src={activeLogoUrl}
                                alt="Başlık logosu"
                                className="max-h-10 max-w-full object-contain"
                              />
                            ) : (
                              <ThemedPresetLogoImg
                                url={activeLogoUrl}
                                presetId={presetLogoId}
                                primaryColor={effectiveLogoPrimary}
                                accentColor={effectiveLogoSecondary}
                                alt="Başlık logosu"
                                className="max-h-10 max-w-full object-contain"
                              />
                            )
                          ) : (
                            <span className="truncate text-[9px] text-slate-500">Logo yok</span>
                          )}
                        </div>
                        <input
                          ref={headerLogoInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            handleHeaderLogoUpload(e.target.files?.[0]);
                            e.target.value = "";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => headerLogoInputRef.current?.click()}
                          className="shrink-0 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-[9px] font-semibold text-slate-200 transition hover:bg-slate-700"
                        >
                          Özel Yükle
                        </button>
                      </div>
                      {isCustomLogo && (
                        <p className="text-[9px] text-emerald-400/90">Özel logo yüklendi</p>
                      )}
                      <div className="pdf-preview-slider-field">
                        <div className="pdf-preview-slider-field__meta">
                          <span className={`pdf-preview-field-label ${ui.label}`}>Boyut</span>
                          <span className={`shrink-0 tabular-nums ${ui.valueBadge}`}>
                            %{logoSizePct}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={HEADER_LOGO_SIZE_MIN_PCT}
                          max={HEADER_LOGO_SIZE_MAX_PCT}
                          step={1}
                          value={logoSizePct}
                          onChange={(e) =>
                            updateHeaderConfig({
                              logoSizePct: clampHeaderLogoSizePct(Number(e.target.value)),
                            })
                          }
                          className="pdf-preview-range"
                          style={{ height: 4 }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <PublicationLineRow
                        label="1. Satır"
                        value={headerConfig.institutionLine1 ?? ""}
                        onValueChange={(v) => updateHeaderConfig({ institutionLine1: v })}
                        placeholder="EDUMATH"
                        fontPt={line1FontPt}
                        onFontPtChange={(pt) => updateHeaderConfig({ institutionLine1FontPt: pt })}
                        color={line1Color}
                        onColorChange={(c) => updateHeaderConfig({ institutionLine1Color: c })}
                        palette={PRIMARY_PALETTE}
                      />
                      <PublicationLineRow
                        label="2. Satır (isteğe bağlı)"
                        value={headerConfig.institutionLine2 ?? ""}
                        onValueChange={(v) => updateHeaderConfig({ institutionLine2: v })}
                        placeholder="YAYINLARI"
                        fontPt={line2FontPt}
                        onFontPtChange={(pt) => updateHeaderConfig({ institutionLine2FontPt: pt })}
                        color={line2Color}
                        onColorChange={(c) => updateHeaderConfig({ institutionLine2Color: c })}
                        palette={ACCENT_PALETTE}
                      />
                    </div>
                  )}
                </>
              )}
        </CollapsibleCard>

        <CollapsibleCard
          title="Sütun çizgisi"
          className="mb-0 pdf-preview-collapsible"
          contentClassName="pdf-preview-theme-groups"
          defaultOpen={false}
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className={ui.labelStrong}>Sütun çizgisi</span>
              <PinkToggle
                checked={showColumnDivider}
                onChange={setShowColumnDivider}
                label="Sütun çizgisini aç/kapat"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className={ui.labelStrong}>Çizgi üstü yazı</span>
              <PinkToggle
                checked={showColumnDividerText}
                onChange={setShowColumnDividerText}
                disabled={!showColumnDivider}
                label="Çizgi üstü yazıyı aç/kapat"
              />
            </div>
            <div className="flex min-w-0 items-center gap-1">
              <input
                type="text"
                value={columnDividerText}
                onChange={(e) => handleColumnDividerTextChange(e.target.value)}
                disabled={!columnDividerTextActive}
                placeholder="SERKAN DOKSANBİR"
                className={`h-7 min-w-0 flex-1 uppercase ${ui.input} disabled:opacity-40`}
              />
              <button
                type="button"
                disabled={!columnDividerTextActive}
                onClick={() => setCenterLineBold(!centerLineBold)}
                title="Kalın"
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-[10px] font-bold transition disabled:opacity-40 ${
                  centerLineBold ? ui.segActive : ui.segInactive
                }`}
              >
                K
              </button>
              <button
                type="button"
                disabled={!columnDividerTextActive}
                onClick={() => setCenterLineItalic(!centerLineItalic)}
                title="İtalik"
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-[10px] font-bold italic transition disabled:opacity-40 ${
                  centerLineItalic ? ui.segActive : ui.segInactive
                }`}
              >
                İ
              </button>
            </div>
            <div className="pdf-preview-slider-field">
              <div className="pdf-preview-slider-field__meta">
                <span className={`pdf-preview-field-label ${ui.label}`}>Kalınlık</span>
                <span className={`shrink-0 tabular-nums ${ui.valueBadge}`}>
                  {columnDividerWidthPt.toFixed(1)} pt
                </span>
              </div>
              <input
                type="range"
                min={0.3}
                max={4}
                step={0.1}
                disabled={!showColumnDivider}
                value={columnDividerWidthPt}
                onChange={(e) => setColumnDividerWidthPt(Number(e.target.value))}
                className="pdf-preview-range disabled:opacity-40"
                style={{ height: 4 }}
              />
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Filigran ayarları"
          className="mb-0 pdf-preview-collapsible"
          contentClassName="pdf-preview-theme-groups"
          defaultOpen={false}
        >
          <div className="flex items-center justify-between gap-2">
            <span className={ui.labelStrong}>Filigran ekle</span>
            <PinkToggle
              checked={showWatermark}
              onChange={setShowWatermark}
              label="Filigran ekle"
            />
          </div>
          <div className={!showWatermark ? "pointer-events-none space-y-2.5 opacity-40" : "space-y-2.5"}>
            <input
              type="text"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              disabled={!showWatermark}
              placeholder="ANADOLU LİSESİ"
              className={`h-7 w-full uppercase ${ui.input} disabled:opacity-40`}
            />
            <div className="grid grid-cols-3 gap-1.5">
              {layoutOptions.map(({ id, label }) => (
                <SegBtn
                  key={id}
                  active={watermarkLayout === id}
                  disabled={!showWatermark}
                  onClick={() => setWatermarkLayout(id)}
                  className="py-1.5"
                >
                  {label}
                </SegBtn>
              ))}
            </div>
            {watermarkLayout === "diagonal" && (
              <div className="pdf-preview-slider-field">
                <div className="pdf-preview-slider-field__meta">
                  <span className={`pdf-preview-field-label ${ui.label}`}>Açı</span>
                  <span className={`shrink-0 tabular-nums ${ui.valueBadge}`}>
                    {watermarkAngleDeg}°
                  </span>
                </div>
                <input
                  type="range"
                  min={-75}
                  max={75}
                  step={1}
                  disabled={!showWatermark}
                  value={watermarkAngleDeg}
                  onChange={(e) => setWatermarkAngleDeg(Number(e.target.value))}
                  className="pdf-preview-range disabled:opacity-40"
                  style={{ height: 4 }}
                />
              </div>
            )}
            <div className="pdf-preview-slider-field">
              <div className="pdf-preview-slider-field__meta">
                <span className={`pdf-preview-field-label ${ui.label}`}>Opaklık</span>
                <span className={`shrink-0 tabular-nums ${ui.valueBadge}`}>
                  %{watermarkOpacity}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                disabled={!showWatermark}
                value={watermarkOpacity}
                onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                className="pdf-preview-range disabled:opacity-40"
                style={{ height: 4 }}
              />
            </div>
            <div className="pdf-preview-slider-field">
              <div className="pdf-preview-slider-field__meta">
                <span className={`pdf-preview-field-label ${ui.label}`}>Boyut</span>
                <span className={`shrink-0 tabular-nums ${ui.valueBadge}`}>
                  %{watermarkSize}
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={1}
                disabled={!showWatermark}
                value={watermarkSize}
                onChange={(e) => setWatermarkSize(Number(e.target.value))}
                className="pdf-preview-range disabled:opacity-40"
                style={{ height: 4 }}
              />
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span className={`pdf-preview-field-label w-[4.25rem] shrink-0 ${ui.label}`}>Logo</span>
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <div className="flex h-8 min-w-0 flex-1 items-center justify-center overflow-hidden rounded border border-dashed border-slate-600 bg-slate-950/50 px-1">
                  {watermarkLogoUrl ? (
                    <img
                      src={watermarkLogoUrl}
                      alt="Filigran logosu"
                      className="max-h-7 max-w-full object-contain opacity-70"
                    />
                  ) : (
                    <span className={`truncate ${ui.labelMuted}`}>Logo yok</span>
                  )}
                </div>
                <input
                  ref={watermarkLogoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    handleWatermarkLogoUpload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  disabled={!showWatermark}
                  onClick={() => watermarkLogoInputRef.current?.click()}
                  className={`shrink-0 px-2 py-1 ${ui.smallBtn} disabled:opacity-40`}
                >
                  Logo Yükle
                </button>
                {watermarkLogoUrl && (
                  <button
                    type="button"
                    disabled={!showWatermark}
                    onClick={() => setWatermarkLogoUrl(null)}
                    className={`shrink-0 px-1.5 py-1 ${ui.smallBtn} disabled:opacity-40`}
                    title="Logoyu kaldır"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Çerçeve ayarları"
          className="mb-0 pdf-preview-collapsible"
          contentClassName="pdf-preview-theme-groups"
          defaultOpen={false}
        >
          <div className="flex items-center justify-between gap-2">
            <span className={ui.labelStrong}>Sayfaya çerçeve ekle</span>
            <PinkToggle
              checked={showPageFrame}
              onChange={setShowPageFrame}
              label="Sayfaya çerçeve ekle"
            />
          </div>
          <div className={!showPageFrame ? "pointer-events-none space-y-2.5 opacity-40" : "space-y-2.5"}>
            <div className="pdf-preview-slider-field">
              <div className="pdf-preview-slider-field__meta">
                <span className={`pdf-preview-field-label ${ui.label}`}>İç boşluk</span>
                <span className={`shrink-0 tabular-nums ${ui.valueBadge}`}>
                  {pageFrameInnerGapMm.toFixed(1)} mm
                </span>
              </div>
              <input
                type="range"
                min={PAGE_FRAME_INNER_GAP_MIN_MM}
                max={PAGE_FRAME_INNER_GAP_MAX_MM}
                step={0.5}
                disabled={!showPageFrame}
                value={pageFrameInnerGapMm}
                onChange={(e) => setPageFrameInnerGapMm(Number(e.target.value))}
                className="pdf-preview-range disabled:opacity-40"
                style={{ height: 4 }}
              />
            </div>
            <div className="pdf-preview-slider-field">
              <div className="pdf-preview-slider-field__meta">
                <span className={`pdf-preview-field-label ${ui.label}`}>Köşe</span>
                <span className={`shrink-0 tabular-nums ${ui.valueBadge}`}>
                  {pageFrameCornerRadiusMm.toFixed(1)} mm
                </span>
              </div>
              <input
                type="range"
                min={PAGE_FRAME_CORNER_RADIUS_MIN_MM}
                max={PAGE_FRAME_CORNER_RADIUS_MAX_MM}
                step={0.5}
                disabled={!showPageFrame}
                value={pageFrameCornerRadiusMm}
                onChange={(e) => setPageFrameCornerRadiusMm(Number(e.target.value))}
                className="pdf-preview-range disabled:opacity-40"
                style={{ height: 4 }}
              />
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span className={`pdf-preview-field-label w-[4.25rem] shrink-0 ${ui.label}`}>Çizgi türü</span>
              <div className="flex min-w-0 flex-1 gap-1">
                {(
                  [
                    { id: "solid" as PageFrameLineStyle, t: "─" },
                    { id: "dashed" as PageFrameLineStyle, t: "┄" },
                    { id: "dotted" as PageFrameLineStyle, t: "⋯" },
                  ] as const
                ).map(({ id, t }) => (
                  <SegBtn
                    key={id}
                    active={pageFrameLineStyle === id}
                    disabled={!showPageFrame}
                    onClick={() => setPageFrameLineStyle(id)}
                    className="min-w-0 flex-1 py-1.5 text-[10px]"
                  >
                    {t}
                  </SegBtn>
                ))}
              </div>
            </div>
            <PageFrameColorRow
              themeColor={primaryColor}
              colorMode={pageFrameColorMode}
              customColor={pageFrameColor}
              palette={PRIMARY_PALETTE}
              onThemeSelect={() => {
                setThemeColor(primaryColor);
                setPageFrameColorMode("theme");
              }}
              onCustomColorChange={setPageFrameColor}
              disabled={!showPageFrame}
            />
            <div className="pdf-preview-slider-field">
              <div className="pdf-preview-slider-field__meta">
                <span className={`pdf-preview-field-label ${ui.label}`}>Kalınlık</span>
                <span className={`shrink-0 tabular-nums ${ui.valueBadge}`}>
                  {pageFrameWidthPt.toFixed(1)} pt
                </span>
              </div>
              <input
                type="range"
                min={0.3}
                max={6}
                step={0.1}
                disabled={!showPageFrame}
                value={pageFrameWidthPt}
                onChange={(e) => setPageFrameWidthPt(Number(e.target.value))}
                className="pdf-preview-range disabled:opacity-40"
                style={{ height: 4 }}
              />
            </div>
          </div>
        </CollapsibleCard>
      </div>
      </CollapseGroupProvider>
    </aside>
  );
}
