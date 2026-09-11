import { Check, RotateCcw } from "lucide-react";
import {
  APP_ACCENT_DEFAULT,
  APP_ACCENT_PALETTE,
  APP_COLOR_DEFAULT,
  APP_COLOR_SWATCH_PALETTE,
  APP_FILL_TEXT_PALETTE,
  APP_PRIMARY_PALETTE,
  APP_TEXT_ON_FILL_DEFAULT,
  ColorSwatchPicker,
} from "./ColorSwatchPicker";
import TrialBannerMetaFields from "./TrialBannerMetaFields";
import {
  DEFAULT_TRIAL_YONERGE_TEXT,
  defaultLgsYonergeHtml,
} from "../../utils/trialYonergeDefaults";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import CollapsibleCard, { CollapseGroupProvider } from "./CollapsibleCard";
import PdfPreviewPanelHeader from "./PdfPreviewPanelHeader";
import {
  defaultLgsPageDecor,
  parseLgsPageDecor,
  resolvePageDecorForBanner,
  type LgsPageDecor,
} from "../../utils/lgsPageDecor";
import { useEditorStore, type WatermarkLayout } from "../../store/editorStore";
import { FASIKUL_THEME_PRIMARY } from "../../utils/testThemeDefaults";
import type { HeaderConfig } from "../../utils/corporateHeaderLayout";
import type { HeaderLeftMode } from "../../utils/headerLeftColumn";
import {
  clampPublicationLineFontPt,
  PUBLICATION_LINE1_COLOR_DEFAULT,
  PUBLICATION_LINE1_FONT_DEFAULT_PT,
  PUBLICATION_LINE2_COLOR_DEFAULT,
  PUBLICATION_LINE2_FONT_DEFAULT_PT,
  PUBLICATION_LINE_FONT_MAX_PT,
  PUBLICATION_LINE_FONT_MIN_PT,
} from "../../utils/headerLeftColumn";
import {
  PRESET_HEADER_LOGOS,
  resolveHeaderLogoUrl,
  resolveLgsOfficialLogoUrl,
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
  headerFieldBold,
  headerFieldColor,
  headerFieldItalic,
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
  CLASSIC_SUBJECT_PILL_PAD_X_DEFAULT_PT,
  CLASSIC_SUBJECT_PILL_PAD_Y_DEFAULT_PT,
} from "../../utils/classicBannerTopRow";
import {
  clampExamTypeBoxBorderWidthPt,
  clampExamTypeBoxManualWidthPt,
  clampExamTypeBoxManualHeightPt,
  clampExamTypeBoxPadXPt,
  clampExamTypeBoxPadYPt,
  clampExamTypeOffsetXPt,
  clampExamTypeOffsetYPt,
  resolveExamTypeOffsetXPt,
  resolveExamTypeOffsetYPt,
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
  EXAM_TYPE_OFFSET_X_MAX_PT,
  EXAM_TYPE_OFFSET_X_MIN_PT,
  EXAM_TYPE_OFFSET_Y_MAX_PT,
  EXAM_TYPE_OFFSET_Y_MIN_PT,
  type ExamTypeBoxBorderStyle,
  type ExamTypeTextAlign,
} from "../../utils/examTypeBox";
import {
  resolveBannerRightMode,
  type BannerRightMode,
  clampTestNoWidthPt,
  clampTestNoHeightPt,
  clampTestNoFontPt,
  clampRightSlotOffsetYPt,
  clampTestNoGapXPt,
  clampTestNoOffsetXPt,
  clampScoreBoxWidthPt,
  clampScoreBoxHeightPt,
  clampScoreBoxLabelFontPt,
  resolveTestNoWidthPt,
  resolveTestNoHeightPt,
  resolveTestNoLabelFontPt,
  resolveTestNoLabelColor,
  resolveTestNoNumColor,
  resolveTestNoNumFontPt,
  resolveTestNoOffsetYPt,
  resolveTestNoGapXPt,
  resolveTestNoOffsetXPt,
  resolveScoreBoxWidthPt,
  resolveScoreBoxHeightPt,
  resolveScoreBoxLabelFontPt,
  resolveScoreBoxOffsetYPt,
  STYLE_1_TEST_NO_W_MIN_PT,
  STYLE_1_TEST_NO_W_MAX_PT,
  STYLE_1_TEST_NO_H_MIN_PT,
  STYLE_1_TEST_NO_H_MAX_PT,
  STYLE_1_TEST_NO_FONT_MIN_PT,
  STYLE_1_TEST_NO_FONT_MAX_PT,
  STYLE_1_RIGHT_OFFSET_Y_MIN_PT,
  STYLE_1_RIGHT_OFFSET_Y_MAX_PT,
  STYLE_1_TEST_NO_GAP_X_MIN_PT,
  STYLE_1_TEST_NO_GAP_X_MAX_PT,
  STYLE_1_TEST_NO_OFFSET_X_MIN_PT,
  STYLE_1_TEST_NO_OFFSET_X_MAX_PT,
  STYLE_1_SCORE_BOX_W_MIN_PT,
  STYLE_1_SCORE_BOX_W_MAX_PT,
  STYLE_1_SCORE_BOX_H_MIN_PT,
  STYLE_1_SCORE_BOX_H_MAX_PT,
  STYLE_1_SCORE_LABEL_MIN_PT,
  STYLE_1_SCORE_LABEL_MAX_PT,
} from "../../utils/bannerRightMode";
import {
  bannerRightModeFromSlots,
  resolveBannerRightSlots,
  setBannerRightSlotVisible,
  type BannerRightSlot,
} from "../../utils/bannerRightSlots";
import {
  clampInstitutionBadgePadXPt,
  clampInstitutionBadgeRadiusPt,
  clampLogoPadPt,
  INSTITUTION_BADGE_PAD_X_MIN_PT,
  INSTITUTION_BADGE_PAD_X_MAX_PT,
  INSTITUTION_BADGE_RADIUS_MIN_PT,
  INSTITUTION_BADGE_RADIUS_MAX_PT,
  LOGO_PAD_MIN_PT,
  LOGO_PAD_MAX_PT,
  resolveLogoPadYPt,
  resolveLogoPadLeftPt,
} from "../../utils/classicLeftBadge";
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
import {
  SCRATCH_COLOR_BLACK,
  SCRATCH_COLOR_SOFT_GRAY,
  SCRATCH_CORNER_RADIUS_MAX_PT,
  SCRATCH_CORNER_RADIUS_MIN_PT,
  type ScratchGridColorMode,
} from "../../utils/questionScratchGrid";

const COLOR_SWATCH_PALETTE = APP_COLOR_SWATCH_PALETTE;
const PRIMARY_PALETTE = APP_PRIMARY_PALETTE;
const ACCENT_PALETTE = APP_ACCENT_PALETTE;
const SUBJECT_PILL_TEXT_PALETTE = APP_FILL_TEXT_PALETTE;

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

/** Deneme modülü — ÖSYM (Minimal, alt bilgi şeridi yok) + LGS */
const TRIAL_HEADER_TEMPLATE_SLOTS: (
  | {
      kind: "osym";
      styleId: "style_2";
      label: string;
    }
  | { kind: "lgs"; label: string }
)[] = [
  { kind: "osym", styleId: "style_2", label: "ÖSYM" },
  { kind: "lgs", label: "LGS" },
];

/** Fasikül — Standart + Minimal (test şablonlarıyla aynı yapı, ayarlar bağımsız) */
const FASIKUL_HEADER_TEMPLATE_SLOTS: {
  kind: "standart" | "minimal";
  styleId: "style_1" | "style_2";
  label: string;
}[] = [
  { kind: "standart", styleId: "style_1", label: "Standart" },
  { kind: "minimal", styleId: "style_2", label: "Minimal" },
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
  { key: "subTopic", label: "Alt Konu", placeholder: "Bölme İşlemi" },
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

/** Yan yana swatch + sonda özel renk (+) */
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
  return (
    <ColorSwatchPicker
      color={color}
      onColorChange={onColorChange}
      palette={palette}
      disabled={disabled}
      customTitle={customTitle}
    />
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

function ScratchGridColorRow({
  themeColor,
  colorMode,
  customColor,
  palette,
  onGraySelect,
  onBlackSelect,
  onThemeSelect,
  onCustomColorChange,
}: {
  themeColor: string;
  colorMode: ScratchGridColorMode;
  customColor: string;
  palette: readonly { label: string; color: string }[];
  onGraySelect: () => void;
  onBlackSelect: () => void;
  onThemeSelect: () => void;
  onCustomColorChange: (c: string) => void;
}) {
  const { tokens: ui } = usePdfPreviewUi();
  const graySelected = colorMode === "gray";
  const blackSelected = colorMode === "black";
  const themeSelected = colorMode === "theme";
  const pickerColor =
    colorMode === "custom"
      ? customColor
      : colorMode === "theme"
        ? themeColor
        : colorMode === "black"
          ? SCRATCH_COLOR_BLACK
          : SCRATCH_COLOR_SOFT_GRAY;

  return (
    <div className="pdf-preview-color-row">
      <span className={`pdf-preview-field-label ${ui.microLabel}`}>Renk</span>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={onGraySelect}
          title="Yumuşak gri"
          aria-label="Yumuşak gri"
          className={`flex h-3.5 shrink-0 items-center rounded-[2px] border px-1 text-[7px] font-semibold transition ${
            graySelected
              ? "border-white ring-1 ring-blue-400 ring-offset-1 ring-offset-slate-950 text-slate-900"
              : "border-slate-600/70 bg-slate-900 text-slate-400 hover:border-slate-400"
          }`}
          style={graySelected ? { backgroundColor: SCRATCH_COLOR_SOFT_GRAY } : undefined}
        >
          Gri
        </button>
        <button
          type="button"
          onClick={onBlackSelect}
          title="Siyah"
          aria-label="Siyah"
          className={`flex h-3.5 shrink-0 items-center rounded-[2px] border px-1 text-[7px] font-semibold transition ${
            blackSelected
              ? "border-white ring-1 ring-blue-400 ring-offset-1 ring-offset-slate-950 bg-black text-white"
              : "border-slate-600/70 bg-slate-900 text-slate-400 hover:border-slate-400"
          }`}
        >
          Siyah
        </button>
        <button
          type="button"
          onClick={onThemeSelect}
          title="Tema rengi"
          aria-label="Tema rengi"
          className={`flex h-3.5 shrink-0 items-center rounded-[2px] border px-1 text-[7px] font-semibold transition ${
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
    <div className="flex min-w-0 items-center gap-2">
      <span className={`shrink-0 max-w-[7rem] text-[10px] leading-snug ${ui.label}`}>
        {label}
      </span>
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
        className="pdf-preview-range min-w-0 flex-1"
        style={{ height: 4 }}
      />
      <span className={`shrink-0 tabular-nums ${ui.valueBadge}`}>{value}</span>
    </div>
  );
}

function PtStepButtons({
  value,
  onChange,
  ariaLabel,
  minPt = PUBLICATION_LINE_FONT_MIN_PT,
  maxPt = PUBLICATION_LINE_FONT_MAX_PT,
  clampPt = clampPublicationLineFontPt,
}: {
  value: number;
  onChange: (pt: number) => void;
  ariaLabel: string;
  minPt?: number;
  maxPt?: number;
  clampPt?: (pt: number) => number;
}) {
  const step = 0.5;
  const atMin = value <= minPt;
  const atMax = value >= maxPt;
  const bump = (delta: number) =>
    onChange(clampPt(Math.round((value + delta) * 10) / 10));

  return (
    <div
      className="flex shrink-0 items-center gap-0.5"
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        disabled={atMin}
        onClick={() => bump(-step)}
        className="flex h-5 w-5 items-center justify-center rounded border border-slate-600/80 bg-slate-900 text-[11px] font-semibold leading-none text-slate-200 transition hover:border-slate-400 hover:bg-slate-800 disabled:cursor-default disabled:opacity-35"
        aria-label={`${ariaLabel} azalt`}
        title="Küçült"
      >
        −
      </button>
      <span className="min-w-[2.25rem] text-center font-mono text-[8px] tabular-nums text-slate-300">
        {value}
        <span className="text-slate-500">pt</span>
      </span>
      <button
        type="button"
        disabled={atMax}
        onClick={() => bump(step)}
        className="flex h-5 w-5 items-center justify-center rounded border border-slate-600/80 bg-slate-900 text-[11px] font-semibold leading-none text-slate-200 transition hover:border-slate-400 hover:bg-slate-800 disabled:cursor-default disabled:opacity-35"
        aria-label={`${ariaLabel} artır`}
        title="Büyüt"
      >
        +
      </button>
    </div>
  );
}

/** Test No Ad/No: etiket | input | renk (punto alttaki sliderlarda) */
function TestNoTextFieldRow({
  label,
  value,
  onValueChange,
  placeholder,
  color,
  onColorChange,
  palette = COLOR_SWATCH_PALETTE,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
  color: string;
  onColorChange: (c: string) => void;
  palette?: readonly { label: string; color: string }[];
}) {
  const { tokens: ui } = usePdfPreviewUi();
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className={`w-7 shrink-0 text-[11px] font-medium ${ui.label}`}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        maxLength={28}
        className={`h-7 min-w-0 flex-1 rounded border px-2 text-[11px] ${ui.input}`}
      />
      <ColorSwatchPicker
        color={color}
        onColorChange={onColorChange}
        palette={palette}
        customTitle={`${label} rengi`}
        variant="popover"
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
  const { tokens: ui } = usePdfPreviewUi();
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className={`w-7 shrink-0 text-[11px] font-medium ${ui.label}`}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        maxLength={28}
        className={`h-7 min-w-0 flex-1 rounded border px-2 text-[11px] ${ui.input}`}
      />
      <PtStepButtons value={fontPt} onChange={onFontPtChange} ariaLabel={`${label} punto`} />
      <ColorSwatchPicker
        color={color}
        onColorChange={onColorChange}
        palette={palette}
        customTitle={`${label} rengi`}
        variant="popover"
      />
    </div>
  );
}

/** Başlık Bilgileri tek alan — checkbox + input + font + renkler */
function HeaderInfoFieldBlock({
  fieldKey,
  label,
  placeholder,
  fieldValue,
  visible,
  multiline,
  fieldColor,
  colorPalette,
  showTextColor,
  showBgColor,
  bgColor,
  onBgColorChange,
  isBold,
  isItalic,
  showStyleButtons,
  headerConfig,
  headerStyleId,
  ui,
  onVisibleChange,
  onValueChange,
  onFontSizeChange,
  onTextColorChange,
  onBoldToggle,
  onItalicToggle,
}: {
  fieldKey: HeaderFontFieldKey;
  label: string;
  placeholder: string;
  fieldValue: string;
  visible: boolean;
  multiline: boolean;
  fieldColor: string;
  colorPalette: readonly { label: string; color: string }[];
  showTextColor: boolean;
  showBgColor: boolean;
  bgColor?: string;
  onBgColorChange?: (c: string) => void;
  isBold: boolean;
  isItalic: boolean;
  showStyleButtons: boolean;
  headerConfig: HeaderConfig;
  headerStyleId: string;
  ui: ReturnType<typeof usePdfPreviewUi>["tokens"];
  onVisibleChange: (visible: boolean) => void;
  onValueChange: (v: string) => void;
  onFontSizeChange: (pt: number) => void;
  onTextColorChange: (c: string) => void;
  onBoldToggle: () => void;
  onItalicToggle: () => void;
}) {
  const lineCount = Math.max(1, fieldValue.split(/\n/).length);
  return (
    <div className={`flex min-w-0 flex-col gap-2 ${visible ? "" : "opacity-50"}`}>
      <div className="flex min-w-0 items-center gap-2">
        <input
          type="checkbox"
          id={`header-field-visible-${fieldKey}`}
          checked={visible}
          onChange={(e) => onVisibleChange(e.target.checked)}
          className="pdf-preview-checkbox pdf-preview-checkbox--sm shrink-0 cursor-pointer"
          aria-label={`${label} göster`}
          title={visible ? "Başlıkta göster" : "Başlıkta gizle"}
        />
        <label
          htmlFor={`header-field-visible-${fieldKey}`}
          className={`min-w-0 flex-1 cursor-pointer text-[11px] font-medium ${ui.label}`}
        >
          {label}
        </label>
      </div>
      <div className="flex min-w-0 items-start gap-2">
        {multiline ? (
          <textarea
            id={`header-field-${fieldKey}`}
            value={fieldValue}
            rows={lineCount}
            onChange={(e) => onValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) e.preventDefault();
            }}
            placeholder={placeholder}
            title={`${label} — örnek: ${placeholder} (Shift+Enter: yeni satır)`}
            aria-label={label}
            className={`pdf-preview-header-field-row__input min-h-7 min-w-0 flex-1 resize-none leading-snug ${ui.input} !py-1 !text-xs`}
            style={{ height: `${Math.max(28, lineCount * 20 + 8)}px` }}
          />
        ) : (
          <input
            id={`header-field-${fieldKey}`}
            type="text"
            value={fieldValue}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={placeholder}
            title={`${label} — örnek: ${placeholder}`}
            aria-label={label}
            className={`pdf-preview-header-field-row__input h-7 min-w-0 flex-1 ${ui.input} !py-1 !text-xs`}
          />
        )}
        <div className="shrink-0 pt-0.5">
          <FieldFontSizeStepper
            fieldKey={fieldKey}
            styleId={headerStyleId}
            headerConfig={headerConfig}
            onChange={onFontSizeChange}
          />
        </div>
      </div>
      {(showTextColor || showBgColor || showStyleButtons) && (
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          {showTextColor ? (
            <div className="flex items-center gap-2">
              <span className={`text-[10px] ${ui.microLabel}`}>Yazı</span>
              <ColorSwatchPicker
                color={fieldColor}
                onColorChange={onTextColorChange}
                palette={colorPalette}
                customTitle={`${label} yazı rengi`}
                variant="popover"
              />
            </div>
          ) : null}
          {showBgColor && bgColor != null && onBgColorChange ? (
            <div className="flex items-center gap-2">
              <span className={`text-[10px] ${ui.microLabel}`}>Arka plan</span>
              <ColorSwatchPicker
                color={bgColor}
                onColorChange={onBgColorChange}
                palette={APP_COLOR_SWATCH_PALETTE}
                customTitle="Ders adı arka plan rengi"
                variant="popover"
              />
            </div>
          ) : null}
          {showStyleButtons ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-pressed={isBold}
                aria-label={`${label} kalın`}
                title="Kalın"
                onClick={onBoldToggle}
                className={`flex h-7 w-7 items-center justify-center rounded text-xs font-bold ${
                  isBold ? ui.segActive : ui.segInactive
                }`}
              >
                B
              </button>
              <button
                type="button"
                aria-pressed={isItalic}
                aria-label={`${label} italik`}
                title="İtalik"
                onClick={onItalicToggle}
                className={`flex h-7 w-7 items-center justify-center rounded text-xs italic ${
                  isItalic ? ui.segActive : ui.segInactive
                }`}
              >
                I
              </button>
            </div>
          ) : null}
        </div>
      )}
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

export default function ThemeCustomizerSidebar({
  variant = "test",
}: {
  variant?: "test" | "written" | "trial" | "fasikul";
}) {
  const { tokens: ui, mode } = usePdfPreviewUi();
  const sectionBorder = mode === "light" ? "border-slate-200" : "border-[#30363d]";
  const headerStyleId = useEditorStore((s) => s.headerStyleId);
  const headerConfig = useEditorStore((s) => s.headerConfig);
  const themeColor = useEditorStore((s) => s.themeColor);
  const updateHeaderConfig = useEditorStore((s) => s.updateHeaderConfig);
  const applyHeaderStyleAndConfig = useEditorStore((s) => s.applyHeaderStyleAndConfig);
  const resetTestThemesToDefaults = useEditorStore((s) => s.resetTestThemesToDefaults);
  const setThemeColor = useEditorStore((s) => s.setThemeColor);
  const setTrialTestNameBgColor = useEditorStore((s) => s.setTrialTestNameBgColor);
  const setAllowSlightOverflow = useEditorStore((s) => s.setAllowSlightOverflow);
  const toggleOption = useEditorStore((s) => s.toggleOption);
  const setDescriptionColumns = useEditorStore((s) => s.setDescriptionColumns);
  const options = useEditorStore((s) => s.options);
  const questions = useEditorStore((s) => s.questions);
  const [badgePanel, setBadgePanel] = useState<BannerRightSlot>("examType");

  const isTrial = variant === "trial";
  const isFasikul = variant === "fasikul";
  const activeStyle = normalizeHeaderStyleId(headerStyleId);
  const useExamBanner = headerConfig.useExamBanner === true;
  const useYaprakBanner = headerConfig.useYaprakBanner === true && !useExamBanner;
  const useLeafRefBanner =
    useExamBanner && headerConfig.examBannerTemplate === "leaf-ref-corporate";
  const useLgsRefBanner =
    useExamBanner && headerConfig.examBannerTemplate === "lgs-verbal-ref";
  const useLgsOfficialBanner =
    useExamBanner && headerConfig.examBannerTemplate === "lgs-official-ref";
  const activeBannerTemplate = normalizeBannerTemplateId(headerConfig.bannerTemplate);
  const activeExamTemplate = normalizeExamBannerTemplateId(headerConfig.examBannerTemplate);
  const primaryColor = headerConfig.primaryColor || themeColor;
  const accentColor = headerConfig.accentColor || APP_ACCENT_DEFAULT;
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
  const isOsymTrialTemplate = isTrial && isClassicBanner;
  const [themeCollapseEpoch, setThemeCollapseEpoch] = useState(0);
  const [themeExpandEpoch, setThemeExpandEpoch] = useState(0);
  const headerLogoInputRef = useRef<HTMLInputElement>(null);
  const watermarkLogoInputRef = useRef<HTMLInputElement>(null);

  const applyClassicMinimalConfig = (showClassicInfoBar: boolean) => {
    const hasStyle2Badge =
      !!headerConfig.badgeByStyle?.style_2 &&
      Object.keys(headerConfig.badgeByStyle.style_2).length > 0;
    /** Fasikül Minimal: sol kurum adı yok; alt şerit açık; Sınıf görünür; şerit D/Y/B kapalı; Test No kapalı */
    if (isFasikul) {
      applyHeaderStyleAndConfig("style_2", {
        useYaprakBanner: false,
        useExamBanner: false,
        showClassicInfoBar: true,
        showClassicInfoBarScore: false,
        showHeaderLeft: false,
        fieldHidden: {
          ...(headerConfig.fieldHidden ?? {}),
          examType: false,
        },
        ...patchHeaderBadge(headerConfig, "style_2", {
          bannerRightMode: "examType",
          bannerRightSlots: ["examType"],
          testNoWidthPt: 60,
          testNoHeightPt: 18,
          testNoFillColor: "",
          testNoBorderColor: "",
          testNoLabelFontPt: 11.5,
          testNoNumFontPt: 10,
          scoreBoxOffsetYPt: -1,
          examTypeBoxBorderStyle: "none",
          examTypeBoxFillEnabled: true,
          examTypeBoxFillColor: FASIKUL_THEME_PRIMARY,
        }),
      });
      updateHeaderConfig({
        showClassicInfoBar: true,
        showClassicInfoBarScore: false,
        showHeaderLeft: false,
        fieldHidden: {
          ...(useEditorStore.getState().headerConfig.fieldHidden ?? {}),
          examType: false,
        },
        ...patchHeaderBadge(useEditorStore.getState().headerConfig, "style_2", {
          bannerRightMode: "examType",
          bannerRightSlots: ["examType"],
          scoreBoxOffsetYPt: -1,
          examTypeBoxBorderStyle: "none",
          examTypeBoxFillEnabled: true,
          examTypeBoxFillColor: FASIKUL_THEME_PRIMARY,
        }),
      });
      return;
    }
    applyHeaderStyleAndConfig("style_2", {
      useYaprakBanner: false,
      useExamBanner: false,
      showClassicInfoBar,
      ...(hasStyle2Badge
        ? {}
        : patchHeaderBadge(headerConfig, "style_2", {
            bannerRightMode: "testNo",
            testNoWidthPt: 60,
            testNoHeightPt: 18,
            testNoFillColor: "",
            testNoBorderColor: "",
            testNoLabelFontPt: 11.5,
            testNoNumFontPt: 10,
          })),
    });
  };

  const applyTrialOsymYonerge = () => {
    if (!options.includeDescription) toggleOption("includeDescription");
    setDescriptionColumns(1, [DEFAULT_TRIAL_YONERGE_TEXT], false);
  };

  const applyTrialLgsYonerge = () => {
    if (!options.includeDescription) toggleOption("includeDescription");
    setDescriptionColumns(1, [defaultLgsYonergeHtml(questions.length || 20)], false);
  };

  // Deneme: ÖSYM varsayılanı — yalnızca deneme paneli açıkken bir kez
  useEffect(() => {
    if (!isTrial) return;
    // LGS / yaprak vb. seçiliyse ÖSYM’ye zorlama
    if (useYaprakBanner || useExamBanner) return;
    if (activeStyle !== "style_2") {
      applyClassicMinimalConfig(false);
      return;
    }
    if (headerConfig.showClassicInfoBar !== false) {
      updateHeaderConfig({ showClassicInfoBar: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnızca deneme açılışında şablonu sabitle
  }, [isTrial]);

  const logoSizePct = headerConfig.logoSizePct ?? 100;
  const showHeaderLeft = headerConfig.showHeaderLeft !== false;
  const headerLeftModeRaw = String(headerConfig.headerLeftMode ?? "logo");
  const headerLeftMode: HeaderLeftMode =
    headerLeftModeRaw === "publicationText" || headerLeftModeRaw === "institutionText"
      ? "publicationText"
      : "logo";
  /** Minimal sol kutu beyaz yazı bırakır; kurumsal beyaz zeminde görünmez */
  const isNearWhiteHex = (hex: string) => /^#([fF]{6}|[fF]{3})$/.test(hex.trim());
  const line1Color = isClassicBanner
    ? headerConfig.institutionLine1Color || "#FFFFFF"
    : (() => {
        const c = (headerConfig.institutionLine1Color || "").trim();
        if (!c || isNearWhiteHex(c)) return primaryColor || PUBLICATION_LINE1_COLOR_DEFAULT;
        return c;
      })();
  const line2Color = (() => {
    const c = (headerConfig.institutionLine2Color || "").trim();
    if (!c) return accentColor || PUBLICATION_LINE2_COLOR_DEFAULT;
    return c;
  })();
  const line1FontPt = headerConfig.institutionLine1FontPt ?? (isClassicBanner ? 11.5 : 9);
  const line2FontPt = headerConfig.institutionLine2FontPt ?? 7;
  const badgeStyleId = isClassicBanner ? "style_2" : activeStyle;
  const badgeConfigRaw = mergeHeaderBadgeConfig(headerConfig, badgeStyleId);
  /** Fasikül Standart: D/Y/B rozeti yok (Şerit D/Y/B kullanır); Minimal’de Test No + Sınıf */
  const badgeConfig =
    isFasikul && !isClassicBanner
      ? {
          ...badgeConfigRaw,
          bannerRightSlots: (resolveBannerRightSlots(badgeConfigRaw) as BannerRightSlot[]).filter(
            (s) => s !== "score",
          ),
          bannerRightMode:
            resolveBannerRightSlots(badgeConfigRaw).filter((s) => s !== "score")[0] ??
            "hidden",
        }
      : badgeConfigRaw;
  const bannerRightModeRaw = resolveBannerRightMode(badgeConfig);
  /** Minimal (test): yalnızca Test No / Kapalı; Fasikül Minimal: slot’lar */
  const bannerRightMode: BannerRightMode = isClassicBanner
    ? isFasikul
      ? bannerRightModeRaw
      : bannerRightModeRaw === "hidden"
        ? "hidden"
        : "testNo"
    : bannerRightModeRaw;
  const bannerRightSlots: BannerRightSlot[] = isClassicBanner
    ? isFasikul
      ? resolveBannerRightSlots(badgeConfig).filter(
          (s): s is BannerRightSlot => s === "testNo" || s === "examType",
        )
      : bannerRightMode === "hidden"
        ? []
        : ["testNo"]
    : resolveBannerRightSlots(badgeConfig);

  const examTypeLine1 = badgeConfig.examTypeLine1 ?? "SINIF";
  const examTypeLine1Color = badgeConfig.examTypeLine1Color || APP_TEXT_ON_FILL_DEFAULT;
  const examTypeLine1FontPt = badgeConfig.examTypeLine1FontPt ?? 11;
  const examTypeBoxBorderStyle = (badgeConfig.examTypeBoxBorderStyle ?? "none") as ExamTypeBoxBorderStyle;
  const examTypeBoxBorderColor = badgeConfig.examTypeBoxBorderColor || primaryColor;
  const examTypeBoxBorderWidthPt = badgeConfig.examTypeBoxBorderWidthPt ?? 1.5;
  const examTypeBoxManualWidthPt = badgeConfig.examTypeBoxManualWidthPt ?? resolveTestNoWidthPt(badgeConfig);
  const examTypeBoxManualHeightPt = badgeConfig.examTypeBoxManualHeightPt ?? 22;
  const examTypeBoxPadXPt = badgeConfig.examTypeBoxPadXPt ?? 4;
  const examTypeBoxPadYPt = badgeConfig.examTypeBoxPadYPt ?? 4;
  const examTypeBoxFillEnabled = badgeConfig.examTypeBoxFillEnabled ?? true;
  const examTypeBoxFillColor = badgeConfig.examTypeBoxFillColor || APP_COLOR_DEFAULT;
  const examTypeTextAlign = (badgeConfig.examTypeTextAlign ?? "center") as ExamTypeTextAlign;
  const subjectPillPadXPt = isClassicBanner
    ? headerConfig.subjectPillPadXPt ?? CLASSIC_SUBJECT_PILL_PAD_X_DEFAULT_PT
    : headerConfig.subjectPillPadXPt ?? SUBJECT_PILL_PAD_X_DEFAULT_PT;
  const subjectPillPadYPt = isClassicBanner
    ? headerConfig.subjectPillPadYPt ?? CLASSIC_SUBJECT_PILL_PAD_Y_DEFAULT_PT
    : headerConfig.subjectPillPadYPt ?? SUBJECT_PILL_PAD_Y_DEFAULT_PT;
  const subjectPillFillColor = isClassicBanner
    ? headerConfig.subjectPillFillColor?.trim() || APP_COLOR_DEFAULT
    : headerConfig.subjectPillFillColor?.trim() || accentColor;
  const subjectPillTextColor =
    headerConfig.subjectPillTextColor?.trim() || "#FFFFFF";
  const subjectPillTextOffsetYPt =
    headerConfig.subjectPillTextOffsetYPt ?? SUBJECT_PILL_TEXT_OFFSET_Y_DEFAULT_PT;
  const subjectTopicGapPt = headerConfig.subjectTopicGapPt ?? SUBJECT_TOPIC_GAP_DEFAULT_PT;
  const topicSubTopicGapPt = headerConfig.topicSubTopicGapPt ?? TOPIC_SUBTOPIC_GAP_DEFAULT_PT;
  const presetLogoId = headerConfig.presetLogoId ?? "5";
  const activeLogoUrl = resolveHeaderLogoUrl(headerConfig);
  const isCustomLogo = presetLogoId === "custom";
  const logoUseThemeColors = headerConfig.logoUseThemeColors ?? true;
  const logoColorPrimary = headerConfig.logoColorPrimary ?? primaryColor;
  const logoColorSecondary = headerConfig.logoColorSecondary ?? accentColor;
  const effectiveLogoPrimary = logoUseThemeColors ? primaryColor : logoColorPrimary;
  const effectiveLogoSecondary = logoUseThemeColors ? accentColor : logoColorSecondary;

  const storeShowWatermark = useEditorStore((s) => s.showWatermark);
  const storeShowColumnDivider = useEditorStore((s) => s.showColumnDivider);
  const storeShowColumnDividerText = useEditorStore((s) => s.showColumnDividerText);
  const storeColumnDividerText = useEditorStore((s) => s.columnDividerText);
  const storeColumnDividerWidthPt = useEditorStore((s) => s.columnDividerWidthPt);
  const storeCenterLineBold = useEditorStore((s) => s.centerLineBold);
  const storeCenterLineItalic = useEditorStore((s) => s.centerLineItalic);
  const setShowColumnDivider = useEditorStore((s) => s.setShowColumnDivider);
  const setColumnDividerText = useEditorStore((s) => s.setColumnDividerText);
  const setShowColumnDividerText = useEditorStore((s) => s.setShowColumnDividerText);
  const setColumnDividerWidthPt = useEditorStore((s) => s.setColumnDividerWidthPt);
  const setCenterLineBold = useEditorStore((s) => s.setCenterLineBold);
  const setCenterLineItalic = useEditorStore((s) => s.setCenterLineItalic);
  const storeWatermarkText = useEditorStore((s) => s.watermarkText);
  const storeWatermarkLayout = useEditorStore((s) => s.watermarkLayout);
  const storeWatermarkAngleDeg = useEditorStore((s) => s.watermarkAngleDeg);
  const storeWatermarkOpacity = useEditorStore((s) => s.watermarkOpacity);
  const storeWatermarkSize = useEditorStore((s) => s.watermarkSize);
  const storeWatermarkLogoUrl = useEditorStore((s) => s.watermarkLogoUrl);
  const setShowWatermark = useEditorStore((s) => s.setShowWatermark);
  const setWatermarkText = useEditorStore((s) => s.setWatermarkText);
  const setWatermarkLayout = useEditorStore((s) => s.setWatermarkLayout);
  const setWatermarkAngleDeg = useEditorStore((s) => s.setWatermarkAngleDeg);
  const setWatermarkOpacity = useEditorStore((s) => s.setWatermarkOpacity);
  const setWatermarkSize = useEditorStore((s) => s.setWatermarkSize);
  const setWatermarkLogoUrl = useEditorStore((s) => s.setWatermarkLogoUrl);
  const storeShowPageFrame = useEditorStore((s) => s.showPageFrame);
  const storePageFrameColorMode = useEditorStore((s) => s.pageFrameColorMode);
  const storePageFrameColor = useEditorStore((s) => s.pageFrameColor);
  const storePageFrameWidthPt = useEditorStore((s) => s.pageFrameWidthPt);
  const storePageFrameInnerGapMm = useEditorStore((s) => s.pageFrameInnerGapMm);
  const storePageFrameCornerRadiusMm = useEditorStore((s) => s.pageFrameCornerRadiusMm);
  const storePageFrameLineStyle = useEditorStore((s) => s.pageFrameLineStyle);
  const setShowPageFrame = useEditorStore((s) => s.setShowPageFrame);
  const setPageFrameColorMode = useEditorStore((s) => s.setPageFrameColorMode);
  const setPageFrameColor = useEditorStore((s) => s.setPageFrameColor);
  const setPageFrameWidthPt = useEditorStore((s) => s.setPageFrameWidthPt);
  const setPageFrameInnerGapMm = useEditorStore((s) => s.setPageFrameInnerGapMm);
  const setPageFrameCornerRadiusMm = useEditorStore((s) => s.setPageFrameCornerRadiusMm);
  const setPageFrameLineStyle = useEditorStore((s) => s.setPageFrameLineStyle);
  const scratchGridCornerRadiusPt = useEditorStore((s) => s.scratchGridCornerRadiusPt);
  const setScratchGridCornerRadiusPt = useEditorStore((s) => s.setScratchGridCornerRadiusPt);
  const scratchGridColorMode = useEditorStore((s) => s.scratchGridColorMode);
  const scratchGridColor = useEditorStore((s) => s.scratchGridColor);
  const setScratchGridColorMode = useEditorStore((s) => s.setScratchGridColorMode);
  const setScratchGridColor = useEditorStore((s) => s.setScratchGridColor);

  const pageDecor = resolvePageDecorForBanner(
    useLgsOfficialBanner,
    headerConfig.lgsPageDecor,
    {
      showColumnDivider: storeShowColumnDivider,
      columnDividerText: storeColumnDividerText,
      columnDividerWidthPt: storeColumnDividerWidthPt,
      showColumnDividerText: storeShowColumnDividerText,
      centerLineBold: storeCenterLineBold,
      centerLineItalic: storeCenterLineItalic,
      showWatermark: storeShowWatermark,
      watermarkText: storeWatermarkText,
      watermarkLayout: storeWatermarkLayout,
      watermarkAngleDeg: storeWatermarkAngleDeg,
      watermarkOpacity: storeWatermarkOpacity,
      watermarkSize: storeWatermarkSize,
      watermarkLogoUrl: storeWatermarkLogoUrl,
      showPageFrame: storeShowPageFrame,
      pageFrameColorMode: storePageFrameColorMode,
      pageFrameColor: storePageFrameColor,
      pageFrameWidthPt: storePageFrameWidthPt,
      pageFrameInnerGapMm: storePageFrameInnerGapMm,
      pageFrameCornerRadiusMm: storePageFrameCornerRadiusMm,
      pageFrameLineStyle: storePageFrameLineStyle,
    },
  );

  const showWatermark = pageDecor.showWatermark;
  const showColumnDivider = pageDecor.showColumnDivider;
  const showColumnDividerText = pageDecor.showColumnDividerText;
  const columnDividerText = pageDecor.columnDividerText;
  const columnDividerWidthPt = pageDecor.columnDividerWidthPt;
  const centerLineBold = pageDecor.centerLineBold;
  const centerLineItalic = pageDecor.centerLineItalic;
  const watermarkText = pageDecor.watermarkText;
  const watermarkLayout = pageDecor.watermarkLayout;
  const watermarkAngleDeg = pageDecor.watermarkAngleDeg;
  const watermarkOpacity = pageDecor.watermarkOpacity;
  const watermarkSize = pageDecor.watermarkSize;
  const watermarkLogoUrl = pageDecor.watermarkLogoUrl;
  const showPageFrame = pageDecor.showPageFrame;
  const pageFrameColorMode = pageDecor.pageFrameColorMode;
  const pageFrameColor = pageDecor.pageFrameColor;
  const pageFrameWidthPt = pageDecor.pageFrameWidthPt;
  const pageFrameInnerGapMm = pageDecor.pageFrameInnerGapMm;
  const pageFrameCornerRadiusMm = pageDecor.pageFrameCornerRadiusMm;
  const pageFrameLineStyle = pageDecor.pageFrameLineStyle;

  const patchPageDecor = (partial: Partial<LgsPageDecor>) => {
    if (useLgsOfficialBanner) {
      updateHeaderConfig({
        lgsPageDecor: {
          ...parseLgsPageDecor(headerConfig.lgsPageDecor ?? defaultLgsPageDecor()),
          ...partial,
        },
      });
      return;
    }
    if (partial.showColumnDivider !== undefined) setShowColumnDivider(partial.showColumnDivider);
    if (partial.columnDividerText !== undefined) setColumnDividerText(partial.columnDividerText);
    if (partial.showColumnDividerText !== undefined)
      setShowColumnDividerText(partial.showColumnDividerText);
    if (partial.columnDividerWidthPt !== undefined)
      setColumnDividerWidthPt(partial.columnDividerWidthPt);
    if (partial.centerLineBold !== undefined) setCenterLineBold(partial.centerLineBold);
    if (partial.centerLineItalic !== undefined) setCenterLineItalic(partial.centerLineItalic);
    if (partial.showWatermark !== undefined) setShowWatermark(partial.showWatermark);
    if (partial.watermarkText !== undefined) setWatermarkText(partial.watermarkText);
    if (partial.watermarkLayout !== undefined) setWatermarkLayout(partial.watermarkLayout);
    if (partial.watermarkAngleDeg !== undefined) setWatermarkAngleDeg(partial.watermarkAngleDeg);
    if (partial.watermarkOpacity !== undefined) setWatermarkOpacity(partial.watermarkOpacity);
    if (partial.watermarkSize !== undefined) setWatermarkSize(partial.watermarkSize);
    if (partial.watermarkLogoUrl !== undefined) setWatermarkLogoUrl(partial.watermarkLogoUrl);
    if (partial.showPageFrame !== undefined) setShowPageFrame(partial.showPageFrame);
    if (partial.pageFrameColorMode !== undefined) setPageFrameColorMode(partial.pageFrameColorMode);
    if (partial.pageFrameColor !== undefined) setPageFrameColor(partial.pageFrameColor);
    if (partial.pageFrameWidthPt !== undefined) setPageFrameWidthPt(partial.pageFrameWidthPt);
    if (partial.pageFrameInnerGapMm !== undefined)
      setPageFrameInnerGapMm(partial.pageFrameInnerGapMm);
    if (partial.pageFrameCornerRadiusMm !== undefined)
      setPageFrameCornerRadiusMm(partial.pageFrameCornerRadiusMm);
    if (partial.pageFrameLineStyle !== undefined) setPageFrameLineStyle(partial.pageFrameLineStyle);
  };

  const handleColumnDividerTextChange = (text: string) => {
    patchPageDecor({ columnDividerText: text });
  };

  const columnDividerTextActive = showColumnDivider && showColumnDividerText;

  const handleWatermarkLogoUpload = (file: File | undefined) => {
    if (!file || !/^image\/(png|jpe?g)$/i.test(file.type)) return;
    const reader = new FileReader();
    reader.onload = () => patchPageDecor({ watermarkLogoUrl: String(reader.result ?? "") });
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

  const handleLgsLogoUpload = (file: File | undefined) => {
    if (!file || !/^image\/(png|jpe?g|webp)$/i.test(file.type)) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const raw = String(reader.result ?? "");
      try {
        const transparent = await removeWhiteBackgroundFromDataUrl(raw);
        updateHeaderConfig({
          lgsLogoUrl: transparent,
          lgsPresetLogoId: "custom",
          lgsShowLogo: true,
        });
      } catch {
        updateHeaderConfig({
          lgsLogoUrl: raw,
          lgsPresetLogoId: "custom",
          lgsShowLogo: true,
        });
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
    if (isTrial) {
      setTrialTestNameBgColor(color);
      return;
    }
    // primaryColor headerInfoByStyle’a yazılır; themeColor store’da senkronlanır
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

  const setFieldColor = (field: HeaderFontFieldKey, color: string) => {
    updateHeaderConfig({
      fieldColors: {
        ...(headerConfig.fieldColors ?? {}),
        [field]: color,
      },
    });
  };

  const setFieldFontStyle = (
    field: HeaderFontFieldKey,
    patch: { bold?: boolean; italic?: boolean },
  ) => {
    const prev = headerConfig.fieldFontStyles?.[field] ?? {};
    updateHeaderConfig({
      fieldFontStyles: {
        ...(headerConfig.fieldFontStyles ?? {}),
        [field]: { ...prev, ...patch },
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

  const updateBadge = (partial: HeaderBadgeSettings) => {
    // Yalnızca badgeByStyle — kök alanlara yazma (tema sızıntısı olmasın)
    updateHeaderConfig(patchHeaderBadge(headerConfig, badgeStyleId, partial));
  };

  /** Minimal: Test No / Kapalı (tek seçim); Fasikül Minimal slot kullanır */
  const setBannerRightMode = (mode: BannerRightMode) => {
    if (isClassicBanner && isFasikul) {
      const next =
        mode === "hidden" ? ([] as BannerRightSlot[]) : (["testNo"] as BannerRightSlot[]);
      setBannerRightSlots(next);
      return;
    }
    const next =
      isClassicBanner && (mode === "score" || mode === "examType") ? "testNo" : mode;
    const slots: BannerRightSlot[] = next === "hidden" ? [] : next === "testNo" ? ["testNo"] : [];
    updateBadge({ bannerRightMode: next, bannerRightSlots: slots });
  };

  /** Kurumsal: Sınıf / D·Y·B / Test No — görünürlük (en fazla 3) */
  const setBannerRightSlots = (slots: BannerRightSlot[]) => {
    const cleaned = isFasikul ? slots.filter((s) => s !== "score") : slots;
    const mode = bannerRightModeFromSlots(cleaned);
    const hidden = { ...(headerConfig.fieldHidden ?? {}) };
    if (cleaned.includes("examType")) delete hidden.examType;
    else hidden.examType = true;
    const openInfoForSinif =
      isFasikul && isClassicBanner && cleaned.includes("examType");
    updateHeaderConfig({
      fieldHidden: hidden,
      ...(openInfoForSinif ? { showClassicInfoBar: true } : {}),
      ...patchHeaderBadge(headerConfig, badgeStyleId, {
        bannerRightMode: mode,
        bannerRightSlots: cleaned,
      }),
    });
  };

  const setSlotVisible = (slot: BannerRightSlot, visible: boolean) => {
    setBannerRightSlots(setBannerRightSlotVisible(bannerRightSlots, slot, visible));
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
            {isFasikul ? (
              <div className="grid grid-cols-2 gap-1.5">
                {FASIKUL_HEADER_TEMPLATE_SLOTS.map((slot) => {
                  const selected =
                    !useYaprakBanner && !useExamBanner && activeStyle === slot.styleId;
                  return (
                    <button
                      key={slot.kind}
                      type="button"
                      onClick={() => {
                        if (slot.kind === "standart") {
                          setAllowSlightOverflow(false);
                          applyHeaderStyleAndConfig("style_1", {
                            useYaprakBanner: false,
                            useExamBanner: false,
                            ...patchHeaderBadge(headerConfig, "style_1", {
                              bannerRightMode: "examType",
                              bannerRightSlots: ["examType"],
                            }),
                          });
                          return;
                        }
                        applyClassicMinimalConfig(true);
                      }}
                      className={`group relative pdf-preview-header-theme-card${selected ? " pdf-preview-header-theme-card--selected" : ""}`}
                      aria-pressed={selected}
                      aria-label={`${slot.label} başlık şablonu`}
                    >
                      <div className="pdf-preview-header-theme-card__preview-wrap pdf-preview-header-theme-card__preview-wrap--schematic">
                        <ThemeHeaderPreview
                          styleId={slot.styleId}
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
            ) : isTrial ? (
              <div className="grid grid-cols-2 gap-1.5">
                {TRIAL_HEADER_TEMPLATE_SLOTS.map((slot) => {
                  const selected =
                    slot.kind === "osym"
                      ? isOsymTrialTemplate
                      : useLgsOfficialBanner;
                  return (
                    <button
                      key={slot.kind}
                      type="button"
                      onClick={() => {
                        if (slot.kind === "osym") {
                          applyClassicMinimalConfig(false);
                          applyTrialOsymYonerge();
                          return;
                        }
                        setAllowSlightOverflow(false);
                        applyHeaderStyleAndConfig("style_1", {
                          useYaprakBanner: false,
                          useExamBanner: true,
                          examBannerTemplate: "lgs-official-ref",
                          primaryColor: "#39B54A",
                          accentColor: "#E4F0D4",
                          academicYear: "2026 - 2027 EĞİTİM - ÖĞRETİM YILI",
                          examBannerTitle:
                            "SINAVLA ÖĞRENCİ ALACAK ORTAÖĞRETİM KURUMLARINA İLİŞKİN MERKEZİ SINAV",
                          subject:
                            headerConfig.subject?.trim() || "MATEMATİK",
                          lgsYearFillColor: "",
                          lgsYearTextColor: "#000000",
                          lgsYearFontPt: 17,
                          lgsYearPadXPt: 18,
                          lgsYearPadYPt: 8,
                          lgsTitleFontPt: 19,
                          lgsTitleTextColor: "#000000",
                          lgsTitleBold: true,
                          lgsSubjectFontPt: 24,
                          lgsSubjectTextColor: "#000000",
                          lgsSubjectBold: true,
                          lgsSubjectBandWidthPt: 480,
                          lgsInstructionFontPt: 15,
                          lgsBookletType: "",
                          lgsShowLogo: true,
                          lgsLogoSizePct: 100,
                          lgsPresetLogoId: headerConfig.lgsPresetLogoId || "5",
                          lgsLogoUrl:
                            headerConfig.lgsLogoUrl?.trim() ||
                            PRESET_HEADER_LOGOS.find(
                              (p) => p.id === (headerConfig.lgsPresetLogoId || "5"),
                            )?.url ||
                            "",
                        });
                        setThemeColor("#39B54A");
                        applyTrialLgsYonerge();
                      }}
                      className={`group relative pdf-preview-header-theme-card${selected ? " pdf-preview-header-theme-card--selected" : ""}`}
                      aria-pressed={selected}
                      aria-label={`${slot.label} başlık şablonu`}
                    >
                      <div className="pdf-preview-header-theme-card__preview-wrap pdf-preview-header-theme-card__preview-wrap--schematic">
                        <ThemeHeaderPreview
                          styleId={slot.kind === "osym" ? "style_2" : "style_1"}
                          selected={selected}
                          accentColor={slot.kind === "lgs" ? "#39B54A" : accentColor}
                          variant="schematic"
                          schematicPreset={slot.kind === "osym" ? "exam-sheet" : "default"}
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
            ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {MAIN_HEADER_TEMPLATE_SLOTS.map((slot) => {
                const comingSoon = slot.kind === "leaf-ref";
                const selected =
                  !comingSoon &&
                  (slot.kind === "classic"
                    ? !useYaprakBanner && !useExamBanner && activeStyle === slot.styleId
                    : useLeafRefBanner);
                const key = slot.kind === "classic" ? slot.styleId : "leaf-ref-corporate";
                const schematicStyleId = slot.kind === "classic" ? slot.styleId : "style_3";
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={comingSoon}
                    title={comingSoon ? "Yakında" : undefined}
                    onClick={() => {
                      if (comingSoon) return;
                      if (slot.kind === "classic") {
                        if (slot.styleId === "style_1") {
                          setAllowSlightOverflow(false);
                          applyHeaderStyleAndConfig("style_1", {
                            useYaprakBanner: false,
                            useExamBanner: false,
                          });
                          if (isTrial) {
                            const restored =
                              useEditorStore.getState().headerConfig.primaryColor?.trim() ||
                              "#0A1931";
                            setTrialTestNameBgColor(restored);
                          }
                        } else {
                          applyClassicMinimalConfig(true);
                        }
                      }
                    }}
                    className={`group relative pdf-preview-header-theme-card${selected ? " pdf-preview-header-theme-card--selected" : ""}${comingSoon ? " pdf-preview-header-theme-card--coming-soon" : ""}`}
                    aria-pressed={selected}
                    aria-label={
                      comingSoon
                        ? `${slot.label} — Yakında`
                        : `${slot.label} başlık şablonu`
                    }
                    aria-disabled={comingSoon}
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
                    <span className="pdf-preview-header-theme-card__label">
                      {slot.label}
                      {comingSoon ? " · Yakında" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
            )}

            {!isTrial ? (
              <button
                type="button"
                onClick={() => resetTestThemesToDefaults()}
                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                aria-label="Seçili temayı varsayılan ayarlara döndür"
                title="Aktif temayı fabrika varsayılanına alır; diğer temaların rozet varsayılanlarını da temizler"
              >
                <RotateCcw className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                Varsayılana dön
              </button>
            ) : null}

            {useLeafRefBanner ? (
              <div className="test-banner-live-preview test-banner-live-preview--compact mt-2">
                <LeafTestCorporateBanner
                  data={leafBannerPreviewData}
                  thumbnail
                  ariaLabel="Seçili banner canlı önizleme"
                />
              </div>
            ) : useLgsOfficialBanner ? null : useExamBanner ? (
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
            ) : null}
            {isClassicBanner ? (
              <p className={`mt-2 ${ui.labelMuted}`}>
                {isOsymTrialTemplate
                  ? "ÖSYM: sol sınav kodu, orta test adı, sağ kitapçık; alt bilgi şeridi yoktur."
                  : isFasikul
                    ? "Orta kutu ders adını gösterir. Sınıf alt şeridin sağında; Test No üst sağda; D / Y / B alt şeridin ortasında (Başlık Rozeti’nden)."
                    : "Orta kutu ders adını, sağ kutu Test No’yu gösterir; sol kutuda logo sola yaslıdır. D / Y / B alt şeridin sağındadır. Açıklama kutusu sol panelde Yönerge ile açılır."}
              </p>
            ) : null}
            {isClassicBanner && !isOsymTrialTemplate ? (
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className={ui.labelStrong}>Alt bilgi şeridi</span>
                    <p className={`mt-0.5 text-[11px] leading-snug ${ui.labelMuted}`}>
                      Konu ve alt konuyu gösterir
                    </p>
                  </div>
                  <PinkToggle
                    checked={headerConfig.showClassicInfoBar !== false}
                    onChange={(v) => updateHeaderConfig({ showClassicInfoBar: v })}
                    label="Alt bilgi şeridi"
                  />
                </div>
              </div>
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
            key={
              isTrial
                ? "trial-banner-meta"
                : isClassicBanner
                  ? bannerRightMode
                  : "kurumsal-badge"
            }
            title="Başlık Rozeti"
            className="mb-0 pdf-preview-collapsible"
            contentClassName="space-y-0 pdf-preview-badge-sections"
            defaultOpen={
              isTrial ||
              (isClassicBanner
                ? isFasikul
                  ? bannerRightSlots.includes("examType") ||
                    bannerRightSlots.includes("testNo") ||
                    headerConfig.showClassicInfoBarScore !== false
                  : bannerRightMode !== "hidden"
                : true)
            }
          >
            {isTrial ? (
              <TrialBannerMetaFields />
            ) : (
              <>
                {isClassicBanner ? (
                  isFasikul ? (
                  <div className="space-y-1.5">
                    <div className="grid min-w-0 grid-cols-3 gap-1">
                      {(
                        [
                          { id: "examType" as BannerRightSlot, label: "Sınıf" },
                          { id: "testNo" as BannerRightSlot, label: "Test No" },
                          { id: "score" as BannerRightSlot, label: "D / Y / B" },
                        ] as const
                      ).map(({ id, label }) => {
                        const visible =
                          id === "score"
                            ? headerConfig.showClassicInfoBarScore !== false
                            : bannerRightSlots.includes(id);
                        return (
                          <SegBtn
                            key={id}
                            active={visible}
                            onClick={() => setBadgePanel(id)}
                            className={`py-1.5 text-[10px] ${
                              badgePanel === id ? "ring-2 ring-rose-300/80 ring-offset-1" : ""
                            }`}
                          >
                            {label}
                          </SegBtn>
                        );
                      })}
                    </div>
                    <p className={`text-[10px] leading-snug ${ui.labelMuted}`}>
                      Kırmızı = görünür — Sınıf şerit sağında; Test No üstte; D/Y/B şerit ortasında
                    </p>
                  </div>
                  ) : (
                  <div className="grid min-w-0 grid-cols-2 gap-1">
                    {(
                      [
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
                  )
                ) : (
                  <div className="space-y-1.5">
                    <div className="grid min-w-0 grid-cols-3 gap-1">
                      {(
                        [
                          { id: "examType" as BannerRightSlot, label: "Sınıf" },
                          ...(isFasikul
                            ? []
                            : [{ id: "score" as BannerRightSlot, label: "D / Y / B" }]),
                          { id: "testNo" as BannerRightSlot, label: "Test No" },
                        ] as const
                      ).map(({ id, label }) => {
                        const visible = bannerRightSlots.includes(id);
                        return (
                          <SegBtn
                            key={id}
                            active={visible}
                            onClick={() => setBadgePanel(id)}
                            className={`py-1.5 text-[10px] ${
                              badgePanel === id ? "ring-2 ring-rose-300/80 ring-offset-1" : ""
                            }`}
                          >
                            {label}
                          </SegBtn>
                        );
                      })}
                    </div>
                    <p className={`text-[10px] leading-snug ${ui.labelMuted}`}>
                      Kırmızı = görünür — sekmeye tıklayıp Göster ile aç/kapat
                    </p>
                  </div>
                )}

                <div className="space-y-2.5">
                  {isClassicBanner && !isFasikul ? (
                    bannerRightMode === "hidden" ? (
                      <p className={`text-[11px] leading-snug ${ui.labelMuted}`}>
                        Sağ alan kapalı — göstermek için bir sekme seçin
                      </p>
                    ) : (
                      <div className="space-y-4">
                        <div className="pdf-preview-collapsible-section space-y-2.5">
                          <SectionHeading>Rozet Metinleri</SectionHeading>
                          <div className="flex flex-col gap-2">
                            <TestNoTextFieldRow
                              label="Ad"
                              value={badgeConfig.testType ?? ""}
                              onValueChange={(v) => updateBadge({ testType: v })}
                              placeholder="TEST"
                              color={resolveTestNoLabelColor(badgeConfig)}
                              onColorChange={(c) => updateBadge({ testNoLabelColor: c })}
                            />
                            <TestNoTextFieldRow
                              label="No"
                              value={badgeConfig.testNumber ?? ""}
                              onValueChange={(v) => updateBadge({ testNumber: v })}
                              placeholder="01"
                              color={resolveTestNoNumColor(badgeConfig)}
                              onColorChange={(c) => updateBadge({ testNoNumColor: c })}
                            />
                          </div>
                        </div>
                        <div className="pdf-preview-collapsible-section space-y-2.5">
                          <SectionHeading>Rozet Boyutu</SectionHeading>
                          <div className="flex flex-col gap-2.5">
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
                            <CompactPtSliderRow
                              label="Dikey"
                              value={resolveTestNoOffsetYPt(badgeConfig)}
                              min={STYLE_1_RIGHT_OFFSET_Y_MIN_PT}
                              max={STYLE_1_RIGHT_OFFSET_Y_MAX_PT}
                              onChange={(pt) =>
                                updateBadge({
                                  testNoOffsetYPt: clampRightSlotOffsetYPt(pt),
                                })
                              }
                            />
                          </div>
                        </div>
                        <div className="pdf-preview-collapsible-section space-y-2.5">
                          <SectionHeading>Rozet Rengi</SectionHeading>
                          <div className="pdf-preview-color-row">
                            <span className={`pdf-preview-field-label ${ui.label}`}>Kutu Rengi</span>
                            <ColorSwatchCluster
                              color={
                                badgeConfig.testNoFillColor?.trim() ||
                                badgeConfig.testNoBorderColor?.trim() ||
                                primaryColor
                              }
                              onColorChange={(c) =>
                                updateBadge({ testNoFillColor: c, testNoBorderColor: c })
                              }
                              palette={PRIMARY_PALETTE}
                              customTitle="Test No kutu rengi (dolgu + çerçeve)"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="space-y-5">
                      {badgePanel === "examType" && (
                        <div className="pdf-preview-collapsible-section space-y-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <SectionHeading>Sınıf</SectionHeading>
                            <PinkToggle
                              checked={bannerRightSlots.includes("examType")}
                              onChange={(v) => setSlotVisible("examType", v)}
                              label="Sınıf göster"
                            />
                          </div>
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
                          <CompactExamLineRow
                            label="Metin"
                            value={examTypeLine1}
                            onValueChange={(v) =>
                              updateBadge({
                                examTypeLine1: v,
                                examType: v.trim(),
                                examTypeLine2: "",
                              })
                            }
                            placeholder="SINIF"
                            fontPt={examTypeLine1FontPt}
                            onFontPtChange={(pt) => updateBadge({ examTypeLine1FontPt: pt })}
                            color={examTypeLine1Color}
                            onColorChange={(c) => updateBadge({ examTypeLine1Color: c })}
                            palette={SUBJECT_PILL_TEXT_PALETTE}
                          />
                          <div className="flex flex-col gap-2.5">
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
                                    palette={PRIMARY_PALETTE}
                                    customTitle="Kutu dolgu rengi"
                                  />
                                )}
                              </div>
                            </div>
                            <CompactPtSliderRow
                              label="Genişlik"
                              value={examTypeBoxManualWidthPt}
                              min={EXAM_TYPE_BOX_MANUAL_MIN_W_PT}
                              max={EXAM_TYPE_BOX_MANUAL_MAX_W_PT}
                              onChange={(pt) =>
                                updateBadge({
                                  examTypeBoxManualWidthPt: clampExamTypeBoxManualWidthPt(pt),
                                })
                              }
                            />
                            <CompactPtSliderRow
                              label="Yükseklik"
                              value={examTypeBoxManualHeightPt}
                              min={EXAM_TYPE_BOX_MANUAL_MIN_H_PT}
                              max={EXAM_TYPE_BOX_MANUAL_MAX_H_PT}
                              onChange={(pt) =>
                                updateBadge({
                                  examTypeBoxManualHeightPt: clampExamTypeBoxManualHeightPt(pt),
                                })
                              }
                            />
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
                            <CompactPtSliderRow
                              label="Yatay"
                              value={resolveExamTypeOffsetXPt(badgeConfig)}
                              min={EXAM_TYPE_OFFSET_X_MIN_PT}
                              max={EXAM_TYPE_OFFSET_X_MAX_PT}
                              onChange={(pt) =>
                                updateBadge({
                                  examTypeOffsetXPt: clampExamTypeOffsetXPt(pt),
                                })
                              }
                            />
                            <CompactPtSliderRow
                              label="Dikey"
                              value={resolveExamTypeOffsetYPt(badgeConfig)}
                              min={EXAM_TYPE_OFFSET_Y_MIN_PT}
                              max={EXAM_TYPE_OFFSET_Y_MAX_PT}
                              onChange={(pt) =>
                                updateBadge({
                                  examTypeOffsetYPt: clampExamTypeOffsetYPt(pt),
                                })
                              }
                            />
                          </div>
                        </div>
                      )}

                      {badgePanel === "score" && (
                        <div className="pdf-preview-collapsible-section space-y-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <SectionHeading>
                              {isFasikul ? "Şerit D / Y / B" : "D / Y / B"}
                            </SectionHeading>
                            <PinkToggle
                              checked={
                                isFasikul
                                  ? headerConfig.showClassicInfoBarScore !== false
                                  : bannerRightSlots.includes("score")
                              }
                              onChange={(v) => {
                                if (isFasikul) {
                                  updateHeaderConfig({
                                    showClassicInfoBarScore: v,
                                    ...(v ? { showClassicInfoBar: true } : {}),
                                  });
                                  if (v && bannerRightSlots.includes("score")) {
                                    setBannerRightSlots(
                                      bannerRightSlots.filter((s) => s !== "score"),
                                    );
                                  }
                                } else {
                                  setSlotVisible("score", v);
                                }
                              }}
                              label="D/Y/B göster"
                            />
                          </div>
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
                            label="Dikey"
                            value={resolveScoreBoxOffsetYPt(badgeConfig)}
                            min={STYLE_1_RIGHT_OFFSET_Y_MIN_PT}
                            max={STYLE_1_RIGHT_OFFSET_Y_MAX_PT}
                            onChange={(pt) =>
                              updateBadge({
                                scoreBoxOffsetYPt: clampRightSlotOffsetYPt(pt),
                              })
                            }
                          />
                          <CompactPtSliderRow
                            label="Yazı"
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
                        </div>
                      )}

                      {badgePanel === "testNo" && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between gap-3">
                            <SectionHeading>Test No</SectionHeading>
                            <PinkToggle
                              checked={bannerRightSlots.includes("testNo")}
                              onChange={(v) => setSlotVisible("testNo", v)}
                              label="Test No göster"
                            />
                          </div>
                          <div className="pdf-preview-collapsible-section space-y-2.5">
                            <SectionHeading>Rozet Metinleri</SectionHeading>
                            <div className="flex flex-col gap-2">
                              <TestNoTextFieldRow
                                label="Ad"
                                value={badgeConfig.testType ?? ""}
                                onValueChange={(v) => updateBadge({ testType: v })}
                                placeholder="TEST"
                                color={resolveTestNoLabelColor(badgeConfig)}
                                onColorChange={(c) => updateBadge({ testNoLabelColor: c })}
                              />
                              <TestNoTextFieldRow
                                label="No"
                                value={badgeConfig.testNumber ?? ""}
                                onValueChange={(v) => updateBadge({ testNumber: v })}
                                placeholder="01"
                                color={resolveTestNoNumColor(badgeConfig)}
                                onColorChange={(c) => updateBadge({ testNoNumColor: c })}
                              />
                            </div>
                            <CompactPtSliderRow
                              label="Ad Yazı"
                              value={resolveTestNoLabelFontPt(badgeConfig)}
                              min={STYLE_1_TEST_NO_FONT_MIN_PT}
                              max={STYLE_1_TEST_NO_FONT_MAX_PT}
                              step={0.5}
                              onChange={(pt) =>
                                updateBadge({ testNoLabelFontPt: clampTestNoFontPt(pt) })
                              }
                            />
                            <CompactPtSliderRow
                              label="No Yazı"
                              value={resolveTestNoNumFontPt(badgeConfig)}
                              min={STYLE_1_TEST_NO_FONT_MIN_PT}
                              max={STYLE_1_TEST_NO_FONT_MAX_PT}
                              step={0.5}
                              onChange={(pt) =>
                                updateBadge({ testNoNumFontPt: clampTestNoFontPt(pt) })
                              }
                            />
                          </div>
                          <div className="pdf-preview-collapsible-section space-y-2.5">
                            <SectionHeading>Rozet Boyutu</SectionHeading>
                            <div className="flex flex-col gap-2.5">
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
                              <CompactPtSliderRow
                                label="Aralık"
                                value={resolveTestNoGapXPt(badgeConfig)}
                                min={STYLE_1_TEST_NO_GAP_X_MIN_PT}
                                max={STYLE_1_TEST_NO_GAP_X_MAX_PT}
                                onChange={(pt) =>
                                  updateBadge({ testNoGapXPt: clampTestNoGapXPt(pt) })
                                }
                              />
                              <CompactPtSliderRow
                                label="Yatay"
                                value={resolveTestNoOffsetXPt(badgeConfig)}
                                min={STYLE_1_TEST_NO_OFFSET_X_MIN_PT}
                                max={STYLE_1_TEST_NO_OFFSET_X_MAX_PT}
                                onChange={(pt) =>
                                  updateBadge({ testNoOffsetXPt: clampTestNoOffsetXPt(pt) })
                                }
                              />
                              <CompactPtSliderRow
                                label="Dikey"
                                value={resolveTestNoOffsetYPt(badgeConfig)}
                                min={STYLE_1_RIGHT_OFFSET_Y_MIN_PT}
                                max={STYLE_1_RIGHT_OFFSET_Y_MAX_PT}
                                onChange={(pt) =>
                                  updateBadge({
                                    testNoOffsetYPt: clampRightSlotOffsetYPt(pt),
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div className="pdf-preview-collapsible-section space-y-2.5">
                            <SectionHeading>Rozet Rengi</SectionHeading>
                            <div className="flex flex-col gap-2">
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
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </CollapsibleCard>
        )}

        {!isTrial && (
        <CollapsibleCard
          title="Başlık bilgileri"
          className="mb-0 pdf-preview-collapsible"
          contentClassName="pdf-preview-theme-groups"
          defaultOpen={isClassicBanner}
        >
          <div className="flex flex-col gap-4">
            {(() => {
              const renderField = (
                { key, label, placeholder }: FieldDef,
                opts?: { forceShowBg?: boolean },
              ) => {
                const visible = isHeaderFieldVisible(headerConfig, key);
                const isMultilineTopic = key === "topic" || key === "subTopic";
                const fieldValue = String(headerConfig[key] ?? "");
                const defaultBold = key === "topic";
                const fieldColorFallback = key === "subTopic" ? accentColor : primaryColor;
                const fieldColor = headerFieldColor(headerConfig, key, fieldColorFallback);
                const isBold = headerFieldBold(headerConfig, key, defaultBold);
                const isItalic = headerFieldItalic(headerConfig, key, key === "subTopic");
                const showTextColor =
                  isMultilineTopic || key === "subject" || key === "brandName";
                const showBg =
                  opts?.forceShowBg === true ||
                  (key === "subject" && isClassicBanner && !isOsymTrialTemplate);
                return (
                  <HeaderInfoFieldBlock
                    key={key}
                    fieldKey={key}
                    label={label}
                    placeholder={placeholder}
                    fieldValue={fieldValue}
                    visible={visible}
                    multiline={isMultilineTopic}
                    fieldColor={fieldColor}
                    colorPalette={key === "subTopic" ? ACCENT_PALETTE : PRIMARY_PALETTE}
                    showTextColor={showTextColor}
                    showBgColor={showBg}
                    bgColor={subjectPillFillColor}
                    onBgColorChange={(c) => updateHeaderConfig({ subjectPillFillColor: c })}
                    isBold={isBold}
                    isItalic={isItalic}
                    showStyleButtons={isMultilineTopic}
                    headerConfig={headerConfig}
                    headerStyleId={headerStyleId}
                    ui={ui}
                    onVisibleChange={(checked) => {
                      const next = { ...(headerConfig.fieldHidden ?? {}) };
                      if (checked) delete next[key];
                      else next[key] = true;
                      updateHeaderConfig({ fieldHidden: next });
                    }}
                    onValueChange={(v) => updateHeaderConfig({ [key]: v })}
                    onFontSizeChange={(pt) => setFieldFontSize(key, pt)}
                    onTextColorChange={(c) => setFieldColor(key, c)}
                    onBoldToggle={() => setFieldFontStyle(key, { bold: !isBold })}
                    onItalicToggle={() => setFieldFontStyle(key, { italic: !isItalic })}
                  />
                );
              };

              const subjectField = fields.find((f) => f.key === "subject");
              const topicFields = fields.filter(
                (f) => f.key === "topic" || f.key === "subTopic",
              );
              const otherFields = fields.filter(
                (f) =>
                  f.key !== "subject" &&
                  f.key !== "topic" &&
                  f.key !== "subTopic" &&
                  !(
                    isTrial &&
                    f.key === "brandName" &&
                    (activeStyle === "style_1" || isClassicBanner)
                  ),
              );

              return (
                <>
                  {!isTrial && subjectField ? (
                    <div className="pdf-preview-collapsible-section space-y-2.5">
                      <SectionHeading>Ders Bilgisi</SectionHeading>
                      {renderField(subjectField, { forceShowBg: true })}
                    </div>
                  ) : null}

                  {topicFields.length > 0 ? (
                    <div className="pdf-preview-collapsible-section space-y-2.5">
                      <SectionHeading>Konu Bilgisi</SectionHeading>
                      <div className="flex flex-col gap-3">
                        {topicFields.map((f) => renderField(f))}
                      </div>
                    </div>
                  ) : null}

                  {otherFields.length > 0 ? (
                    <div className="pdf-preview-collapsible-section space-y-2.5">
                      <SectionHeading>Diğer Bilgiler</SectionHeading>
                      <div className="flex flex-col gap-3">
                        {otherFields.map((f) => renderField(f))}
                      </div>
                    </div>
                  ) : null}
                </>
              );
            })()}
            {BANNER_EXTRA_FIELDS.filter((field) => {
              if (isClassicBanner) return false;
              // Tema 1 kurumsal: sınıf / test / no girişleri Sağ Alan'da yönetilir
              if (activeStyle === "style_1" && !useYaprakBanner && !useExamBanner) {
                return false;
              }
              return !useLgsRefBanner || field.key === "gradeLevel";
            }).map(({ key, fontKey, label, placeholder }) => (
              <div key={key} className="flex min-w-0 items-center gap-2">
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
                ) : null}
              </div>
            ))}
          </div>

          {(activeStyle === "style_1" || isClassicBanner) && (
            <div className="pdf-preview-collapsible-section flex flex-col gap-2.5">
              <SectionHeading>Ders / Konu Boşlukları</SectionHeading>
              <PaletteColorRow
                label="Ders Arka Plan"
                color={subjectPillFillColor}
                palette={APP_COLOR_SWATCH_PALETTE}
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
              {!isClassicBanner ? (
                <CompactPtSliderRow
                  label="Ders Adı - Konu Adı Arasındaki Boşluk"
                  value={subjectTopicGapPt}
                  min={SUBJECT_TOPIC_GAP_MIN_PT}
                  max={SUBJECT_TOPIC_GAP_MAX_PT}
                  onChange={(pt) =>
                    updateHeaderConfig({ subjectTopicGapPt: clampSubjectTopicGapPt(pt) })
                  }
                />
              ) : null}
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
        )}

        {useLgsOfficialBanner ? (
        <CollapsibleCard
          title="LGS Logo ayarları"
          className="mb-0 pdf-preview-collapsible"
          contentClassName="pdf-preview-theme-groups space-y-2"
          defaultOpen
        >
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <span className={ui.labelStrong}>Logo ekle</span>
            <PinkToggle
              checked={headerConfig.lgsShowLogo !== false}
              onChange={(v) => updateHeaderConfig({ lgsShowLogo: v })}
              label="Logo ekle"
            />
          </div>
          {headerConfig.lgsShowLogo === false ? (
            <p className="text-[9px] text-slate-500">LGS banner logosu kapalı</p>
          ) : (
            <>
              <div className="grid grid-cols-5 gap-1">
                {PRESET_HEADER_LOGOS.map(({ id, label, url }) => {
                  const selected =
                    (headerConfig.lgsPresetLogoId || "5") !== "custom" &&
                    (headerConfig.lgsPresetLogoId || "5") === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      title={label}
                      onClick={() =>
                        updateHeaderConfig({
                          lgsPresetLogoId: id as PresetHeaderLogoId,
                          lgsLogoUrl: url,
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
                        primaryColor={primaryColor}
                        accentColor={accentColor}
                        alt={label}
                        className="max-h-full max-w-full object-contain"
                      />
                    </button>
                  );
                })}
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-12 min-w-0 flex-1 items-center justify-center overflow-hidden rounded border border-dashed border-slate-600 bg-white/95 px-2">
                  {resolveLgsOfficialLogoUrl(headerConfig) ? (
                    <img
                      src={resolveLgsOfficialLogoUrl(headerConfig)}
                      alt="LGS logosu"
                      className="max-h-10 max-w-full object-contain"
                    />
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
                    handleLgsLogoUpload(e.target.files?.[0]);
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
              {(headerConfig.lgsPresetLogoId || "") === "custom" ? (
                <p className="text-[9px] text-emerald-400/90">Özel logo yüklendi</p>
              ) : null}
              <div className="pdf-preview-slider-field">
                <div className="pdf-preview-slider-field__meta">
                  <span className={`pdf-preview-field-label ${ui.label}`}>Boyut</span>
                  <span className={`shrink-0 tabular-nums ${ui.valueBadge}`}>
                    %{headerConfig.lgsLogoSizePct ?? 100}
                  </span>
                </div>
                <input
                  type="range"
                  min={HEADER_LOGO_SIZE_MIN_PCT}
                  max={HEADER_LOGO_SIZE_MAX_PCT}
                  step={1}
                  value={headerConfig.lgsLogoSizePct ?? 100}
                  onChange={(e) =>
                    updateHeaderConfig({
                      lgsLogoSizePct: clampHeaderLogoSizePct(Number(e.target.value)),
                    })
                  }
                  className="pdf-preview-range"
                  style={{ height: 4 }}
                />
              </div>
            </>
          )}
        </CollapsibleCard>
        ) : !isTrial ? (
        <CollapsibleCard
          title={isClassicBanner ? "Sol kutu (logo / kurum)" : "Logo ayarları"}
          className="mb-0 pdf-preview-collapsible"
          contentClassName="pdf-preview-theme-groups"
          defaultOpen={isClassicBanner}
        >
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <span className={ui.labelStrong}>{isClassicBanner ? "Sol kutu" : "Logo ekle"}</span>
                <PinkToggle
                  checked={showHeaderLeft}
                  onChange={(v) => updateHeaderConfig({ showHeaderLeft: v })}
                  label="Logo ekle"
                />
              </div>
              {!showHeaderLeft ? (
                <p className="text-[9px] text-slate-500">
                  Sol kutu kapalı — logo veya kurum adı için switch&apos;i açın
                </p>
              ) : (
                <>
                  <div className="flex gap-1">
                    {(
                      [
                        { id: "logo" as HeaderLeftMode, label: "Logo" },
                        { id: "publicationText" as HeaderLeftMode, label: isClassicBanner ? "Kurum Adı" : "Yayın Adı" },
                      ] as const
                    ).map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          if (id === "publicationText" && isClassicBanner) {
                            updateHeaderConfig({
                              headerLeftMode: id,
                              institutionLine1Color:
                                headerConfig.institutionLine1Color?.trim() || "#FFFFFF",
                              institutionLine1FontPt:
                                headerConfig.institutionLine1FontPt ?? 11.5,
                              institutionBadgeWidthPt:
                                headerConfig.institutionBadgeWidthPt ||
                                resolveTestNoWidthPt(badgeConfig),
                              institutionBadgeHeightPt:
                                headerConfig.institutionBadgeHeightPt || 18,
                              institutionBadgePadXPt:
                                headerConfig.institutionBadgePadXPt ?? 6,
                              institutionBadgeRadiusPt:
                                headerConfig.institutionBadgeRadiusPt ?? 2.5,
                            });
                          } else if (id === "publicationText") {
                            const rawL1 = (headerConfig.institutionLine1Color || "").trim();
                            const nextL1Color =
                              !rawL1 || /^#([fF]{6}|[fF]{3})$/.test(rawL1)
                                ? PUBLICATION_LINE1_COLOR_DEFAULT
                                : rawL1;
                            updateHeaderConfig({
                              headerLeftMode: id,
                              showHeaderLeft: true,
                              institutionLine1:
                                headerConfig.institutionLine1?.trim() ||
                                headerConfig.brandName?.trim() ||
                                "EDUMATH",
                              institutionLine2:
                                headerConfig.institutionLine2?.trim() || "YAYINLARI",
                              institutionLine1Color: nextL1Color,
                              institutionLine2Color:
                                headerConfig.institutionLine2Color?.trim() ||
                                PUBLICATION_LINE2_COLOR_DEFAULT,
                              institutionLine1FontPt:
                                headerConfig.institutionLine1FontPt ??
                                PUBLICATION_LINE1_FONT_DEFAULT_PT,
                              institutionLine2FontPt:
                                headerConfig.institutionLine2FontPt ??
                                PUBLICATION_LINE2_FONT_DEFAULT_PT,
                            });
                          } else {
                            updateHeaderConfig({ headerLeftMode: id });
                          }
                        }}
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

                  {headerLeftMode === "logo" ? (
                    <>
                      {!isClassicBanner && (
                        <PaletteColorRow
                          label="Arka plan"
                          color={headerConfig.headerLeftFillColor?.trim() || primaryColor}
                          palette={PRIMARY_PALETTE}
                          onColorChange={(c) => updateHeaderConfig({ headerLeftFillColor: c })}
                        />
                      )}
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
                      {isClassicBanner && (
                        <div className="space-y-2">
                          <CompactPtSliderRow
                            label="Dikey boşluk"
                            value={resolveLogoPadYPt(headerConfig)}
                            min={LOGO_PAD_MIN_PT}
                            max={LOGO_PAD_MAX_PT}
                            step={0.5}
                            onChange={(pt) =>
                              updateHeaderConfig({ logoPadYPt: clampLogoPadPt(pt) })
                            }
                          />
                          <CompactPtSliderRow
                            label="Sol boşluk"
                            value={resolveLogoPadLeftPt(headerConfig)}
                            min={LOGO_PAD_MIN_PT}
                            max={LOGO_PAD_MAX_PT}
                            step={0.5}
                            onChange={(pt) =>
                              updateHeaderConfig({ logoPadLeftPt: clampLogoPadPt(pt) })
                            }
                          />
                        </div>
                      )}
                    </>
                  ) : isClassicBanner ? (
                    <div className="space-y-2">
                      <CompactPtSliderRow
                        label="Max genişlik"
                        value={clampTestNoWidthPt(
                          headerConfig.institutionBadgeWidthPt ||
                            resolveTestNoWidthPt(badgeConfig),
                        )}
                        min={STYLE_1_TEST_NO_W_MIN_PT}
                        max={STYLE_1_TEST_NO_W_MAX_PT}
                        onChange={(pt) =>
                          updateHeaderConfig({
                            institutionBadgeWidthPt: clampTestNoWidthPt(pt),
                          })
                        }
                      />
                      <CompactPtSliderRow
                        label="Yükseklik"
                        value={clampTestNoHeightPt(
                          headerConfig.institutionBadgeHeightPt ||
                            resolveTestNoHeightPt(badgeConfig),
                        )}
                        min={STYLE_1_TEST_NO_H_MIN_PT}
                        max={STYLE_1_TEST_NO_H_MAX_PT}
                        onChange={(pt) =>
                          updateHeaderConfig({
                            institutionBadgeHeightPt: clampTestNoHeightPt(pt),
                          })
                        }
                      />
                      <CompactPtSliderRow
                        label="İç boşluk"
                        value={clampInstitutionBadgePadXPt(
                          headerConfig.institutionBadgePadXPt ?? 6,
                        )}
                        min={INSTITUTION_BADGE_PAD_X_MIN_PT}
                        max={INSTITUTION_BADGE_PAD_X_MAX_PT}
                        step={0.5}
                        onChange={(pt) =>
                          updateHeaderConfig({
                            institutionBadgePadXPt: clampInstitutionBadgePadXPt(pt),
                          })
                        }
                      />
                      <CompactPtSliderRow
                        label="Radius"
                        value={clampInstitutionBadgeRadiusPt(
                          headerConfig.institutionBadgeRadiusPt ?? 2.5,
                        )}
                        min={INSTITUTION_BADGE_RADIUS_MIN_PT}
                        max={INSTITUTION_BADGE_RADIUS_MAX_PT}
                        step={0.5}
                        onChange={(pt) =>
                          updateHeaderConfig({
                            institutionBadgeRadiusPt: clampInstitutionBadgeRadiusPt(pt),
                          })
                        }
                      />
                      <CompactExamLineRow
                        label="Ad"
                        value={headerConfig.brandName?.trim() || ""}
                        onValueChange={(v) => updateHeaderConfig({ brandName: v })}
                        placeholder="EDUMATH"
                        fontPt={line1FontPt}
                        onFontPtChange={(pt) =>
                          updateHeaderConfig({ institutionLine1FontPt: pt })
                        }
                        color={line1Color}
                        onColorChange={(c) =>
                          updateHeaderConfig({ institutionLine1Color: c })
                        }
                      />
                      <p className="text-[8px] text-slate-500">
                        Başlık bilgilerindeki Kurum Adı ile aynıdır
                      </p>
                      <div className="pdf-preview-color-row">
                        <span className={`pdf-preview-field-label ${ui.label}`}>
                          Kutu Rengi
                        </span>
                        <ColorSwatchCluster
                          color={
                            headerConfig.headerLeftFillColor?.trim() ||
                            badgeConfig.testNoFillColor?.trim() ||
                            badgeConfig.testNoBorderColor?.trim() ||
                            primaryColor
                          }
                          onColorChange={(c) =>
                            updateHeaderConfig({ headerLeftFillColor: c })
                          }
                          palette={PRIMARY_PALETTE}
                          customTitle="Kurum adı kutu rengi (dolgu + çerçeve)"
                        />
                      </div>
                    </div>
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
        ) : null}

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
                onChange={(v) => patchPageDecor({ showColumnDivider: v })}
                label="Sütun çizgisini aç/kapat"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className={ui.labelStrong}>Çizgi üstü yazı</span>
              <PinkToggle
                checked={showColumnDividerText}
                onChange={(v) => patchPageDecor({ showColumnDividerText: v })}
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
                onClick={() => patchPageDecor({ centerLineBold: !centerLineBold })}
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
                onClick={() => patchPageDecor({ centerLineItalic: !centerLineItalic })}
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
                onChange={(e) =>
                  patchPageDecor({ columnDividerWidthPt: Number(e.target.value) })
                }
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
              onChange={(v) => patchPageDecor({ showWatermark: v })}
              label="Filigran ekle"
            />
          </div>
          <div className={!showWatermark ? "pointer-events-none space-y-2.5 opacity-40" : "space-y-2.5"}>
            <input
              type="text"
              value={watermarkText}
              onChange={(e) => patchPageDecor({ watermarkText: e.target.value })}
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
                  onClick={() => patchPageDecor({ watermarkLayout: id })}
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
                  onChange={(e) =>
                    patchPageDecor({ watermarkAngleDeg: Number(e.target.value) })
                  }
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
                onChange={(e) => patchPageDecor({ watermarkOpacity: Number(e.target.value) })}
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
                onChange={(e) => patchPageDecor({ watermarkSize: Number(e.target.value) })}
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
                    onClick={() => patchPageDecor({ watermarkLogoUrl: null })}
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
              onChange={(v) => patchPageDecor({ showPageFrame: v })}
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
                onChange={(e) =>
                  patchPageDecor({ pageFrameInnerGapMm: Number(e.target.value) })
                }
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
                onChange={(e) =>
                  patchPageDecor({ pageFrameCornerRadiusMm: Number(e.target.value) })
                }
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
                    onClick={() => patchPageDecor({ pageFrameLineStyle: id })}
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
                patchPageDecor({ pageFrameColorMode: "theme" });
              }}
              onCustomColorChange={(c) =>
                patchPageDecor({ pageFrameColor: c, pageFrameColorMode: "custom" })
              }
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
                onChange={(e) =>
                  patchPageDecor({ pageFrameWidthPt: Number(e.target.value) })
                }
                className="pdf-preview-range disabled:opacity-40"
                style={{ height: 4 }}
              />
            </div>
          </div>
        </CollapsibleCard>

        {isFasikul ? (
          <CollapsibleCard
            title="Kareli alan"
            className="mb-0 pdf-preview-collapsible"
            contentClassName="pdf-preview-theme-groups"
            defaultOpen={false}
          >
            <ScratchGridColorRow
              themeColor={primaryColor}
              colorMode={scratchGridColorMode}
              customColor={scratchGridColor}
              palette={PRIMARY_PALETTE}
              onGraySelect={() => setScratchGridColorMode("gray")}
              onBlackSelect={() => setScratchGridColorMode("black")}
              onThemeSelect={() => setScratchGridColorMode("theme")}
              onCustomColorChange={(c) => setScratchGridColor(c)}
            />
            <div className="pdf-preview-slider-field">
              <div className="pdf-preview-slider-field__meta">
                <span className={`pdf-preview-field-label ${ui.label}`}>Köşe</span>
                <span className={`shrink-0 tabular-nums ${ui.valueBadge}`}>
                  {scratchGridCornerRadiusPt.toFixed(1)} pt
                </span>
              </div>
              <input
                type="range"
                min={SCRATCH_CORNER_RADIUS_MIN_PT}
                max={SCRATCH_CORNER_RADIUS_MAX_PT}
                step={0.5}
                value={scratchGridCornerRadiusPt}
                onChange={(e) =>
                  setScratchGridCornerRadiusPt(Number(e.target.value))
                }
                className="pdf-preview-range"
                style={{ height: 4 }}
              />
            </div>
          </CollapsibleCard>
        ) : null}
      </div>
      </CollapseGroupProvider>
    </aside>
  );
}
