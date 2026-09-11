import {
  defaultHeaderConfig,
  type HeaderConfig,
} from "./corporateHeaderLayout";
import {
  CLASSIC_SUBJECT_PILL_PAD_X_DEFAULT_PT,
  CLASSIC_SUBJECT_PILL_PAD_Y_DEFAULT_PT,
  CLASSIC_SUBJECT_PILL_TEXT_OFFSET_Y_DEFAULT_PT,
} from "./classicBannerTopRow";
import { DEFAULT_TRIAL_YONERGE_TEXT } from "./trialYonergeDefaults";
import {
  defaultLgsPageDecor,
  parseLgsPageDecor,
  type LgsPageDecor,
} from "./lgsPageDecor";
import { style2BadgeDefaults } from "./headerBadgeByStyle";
import {
  FASIKUL_THEME_ACCENT,
  FASIKUL_THEME_PRIMARY,
} from "./testThemeDefaults";

export type PaperLayoutModule = "test" | "trial" | "fasikul";

/** Modül bazlı sütun / filigran / çerçeve (diğer modüllerden bağımsız) */
export type ModulePageDecor = LgsPageDecor;

export function defaultModulePageDecor(): ModulePageDecor {
  return {
    ...defaultLgsPageDecor(),
    columnDividerText: "SERKAN DOKSANBİR",
    watermarkText: "ANADOLU LİSESİ",
    watermarkOpacity: 25,
    watermarkSize: 50,
  };
}

/** Test / Deneme / Fasikül — başlık + yönerge + sayfa dekoru anlık görüntüsü */
export type ModuleLayoutSnapshot = {
  headerStyleId: string;
  headerConfig: HeaderConfig;
  themeColor: string;
  includeDescription: boolean;
  testDescription: string;
  descriptionColumnCount: 1 | 2 | 3;
  descriptionTexts: string[];
  descriptionColumnDividers: boolean;
  descriptionBoxPadYPt: number;
  descriptionBoxPadXPt: number;
  pageDecor: ModulePageDecor;
};

export function paperLayoutModuleFromTab(
  tab: string | null | undefined,
): PaperLayoutModule | null {
  if (tab === "trial-exam") return "trial";
  if (tab === "test-paper") return "test";
  if (tab === "fasikul-paper") return "fasikul";
  return null;
}

function pageDecorFromLive(state: Partial<LayoutLiveSlice>): ModulePageDecor {
  return parseLgsPageDecor({
    showColumnDivider: state.showColumnDivider,
    columnDividerText: state.columnDividerText,
    columnDividerWidthPt: state.columnDividerWidthPt,
    showColumnDividerText: state.showColumnDividerText,
    centerLineBold: state.centerLineBold,
    centerLineItalic: state.centerLineItalic,
    showWatermark: state.showWatermark,
    watermarkText: state.watermarkText,
    watermarkLayout: state.watermarkLayout,
    watermarkAngleDeg: state.watermarkAngleDeg,
    watermarkOpacity: state.watermarkOpacity,
    watermarkSize: state.watermarkSize,
    watermarkLogoUrl: state.watermarkLogoUrl,
    showPageFrame: state.showPageFrame,
    pageFrameColorMode: state.pageFrameColorMode,
    pageFrameColor: state.pageFrameColor,
    pageFrameWidthPt: state.pageFrameWidthPt,
    pageFrameInnerGapMm: state.pageFrameInnerGapMm,
    pageFrameCornerRadiusMm: state.pageFrameCornerRadiusMm,
    pageFrameLineStyle: state.pageFrameLineStyle,
  });
}

/** Store alanlarına yayılacak dekor yaması */
export function pageDecorStorePatch(d: ModulePageDecor): ModulePageDecor & {
  // alias alanları canlı store ile aynı isimde
} {
  return {
    showColumnDivider: d.showColumnDivider,
    columnDividerText: d.columnDividerText,
    columnDividerWidthPt: d.columnDividerWidthPt,
    showColumnDividerText: d.showColumnDividerText,
    centerLineBold: d.centerLineBold,
    centerLineItalic: d.centerLineItalic,
    showWatermark: d.showWatermark,
    watermarkText: d.watermarkText,
    watermarkLayout: d.watermarkLayout,
    watermarkAngleDeg: d.watermarkAngleDeg,
    watermarkOpacity: d.watermarkOpacity,
    watermarkSize: d.watermarkSize,
    watermarkLogoUrl: d.watermarkLogoUrl,
    showPageFrame: d.showPageFrame,
    pageFrameColorMode: d.pageFrameColorMode,
    pageFrameColor: d.pageFrameColor,
    pageFrameWidthPt: d.pageFrameWidthPt,
    pageFrameInnerGapMm: d.pageFrameInnerGapMm,
    pageFrameCornerRadiusMm: d.pageFrameCornerRadiusMm,
    pageFrameLineStyle: d.pageFrameLineStyle,
  };
}

export function defaultTestModuleLayout(): ModuleLayoutSnapshot {
  return {
    headerStyleId: "style_1",
    headerConfig: defaultHeaderConfig(),
    themeColor: "#1E88E5",
    includeDescription: false,
    testDescription: "",
    descriptionColumnCount: 1,
    descriptionTexts: [""],
    descriptionColumnDividers: false,
    descriptionBoxPadYPt: 5,
    descriptionBoxPadXPt: 8,
    pageDecor: defaultModulePageDecor(),
  };
}

/** Deneme ÖSYM varsayılanı — Minimal + alt bilgi şeridi kapalı */
export function defaultTrialModuleLayout(): ModuleLayoutSnapshot {
  const base = defaultHeaderConfig();
  return {
    headerStyleId: "style_2",
    headerConfig: {
      ...base,
      useYaprakBanner: false,
      useExamBanner: false,
      showClassicInfoBar: false,
      subjectPillPadXPt: CLASSIC_SUBJECT_PILL_PAD_X_DEFAULT_PT,
      subjectPillPadYPt: CLASSIC_SUBJECT_PILL_PAD_Y_DEFAULT_PT,
      subjectPillTextOffsetYPt: CLASSIC_SUBJECT_PILL_TEXT_OFFSET_Y_DEFAULT_PT,
      headerLeftMode: "publicationText",
      institutionLine1Color: "#FFFFFF",
      institutionLine1FontPt: 11.5,
      institutionBadgeWidthPt: 160,
      institutionBadgeHeightPt: 18,
      institutionBadgePadXPt: 6,
      institutionBadgeRadiusPt: 2.5,
      primaryColor: "#0A1931",
    },
    themeColor: "#0A1931",
    includeDescription: true,
    testDescription: "",
    descriptionColumnCount: 1,
    descriptionTexts: [DEFAULT_TRIAL_YONERGE_TEXT],
    descriptionColumnDividers: false,
    descriptionBoxPadYPt: 5,
    descriptionBoxPadXPt: 8,
    pageDecor: defaultModulePageDecor(),
  };
}

/** Fasikül — Standart + Minimal; lacivert ana / kırmızı vurgu (test’ten bağımsız) */
export function defaultFasikulModuleLayout(): ModuleLayoutSnapshot {
  const base = defaultHeaderConfig();
  return {
    headerStyleId: "style_1",
    headerConfig: {
      ...base,
      useYaprakBanner: false,
      useExamBanner: false,
      primaryColor: FASIKUL_THEME_PRIMARY,
      accentColor: FASIKUL_THEME_ACCENT,
      fieldHidden: {
        ...(base.fieldHidden ?? {}),
        examType: false,
      },
      /** Standart: D/Y/B yok — yalnızca Sınıf */
      badgeByStyle: {
        ...(base.badgeByStyle ?? {}),
        style_1: {
          ...(base.badgeByStyle?.style_1 ?? {}),
          bannerRightMode: "examType",
          bannerRightSlots: ["examType"],
        },
        /** Minimal: Sınıf açık; Test No + D/Y/B kapalı; sol kurum adı yok */
        style_2: {
          ...(base.badgeByStyle?.style_2 ?? {}),
          ...style2BadgeDefaults(),
          bannerRightMode: "examType",
          bannerRightSlots: ["examType"],
          scoreBoxOffsetYPt: -1,
          examTypeBoxBorderStyle: "none",
          examTypeBoxFillEnabled: true,
          examTypeBoxFillColor: FASIKUL_THEME_PRIMARY,
        },
      },
      headerInfoByStyle: {
        ...(base.headerInfoByStyle ?? {}),
        style_2: {
          ...(base.headerInfoByStyle?.style_2 ?? {}),
          showHeaderLeft: false,
          showClassicInfoBar: true,
          showClassicInfoBarScore: false,
          headerLeftMode: "publicationText",
          institutionLine1Color: "#FFFFFF",
          institutionLine1FontPt: 11.5,
          institutionBadgeWidthPt: 160,
          institutionBadgeHeightPt: 18,
          institutionBadgePadXPt: 6,
          institutionBadgeRadiusPt: 2.5,
          subjectPillPadXPt: CLASSIC_SUBJECT_PILL_PAD_X_DEFAULT_PT,
          subjectPillPadYPt: CLASSIC_SUBJECT_PILL_PAD_Y_DEFAULT_PT,
          subjectPillTextOffsetYPt: CLASSIC_SUBJECT_PILL_TEXT_OFFSET_Y_DEFAULT_PT,
          subjectPillFillColor: FASIKUL_THEME_PRIMARY,
          primaryColor: FASIKUL_THEME_PRIMARY,
          accentColor: FASIKUL_THEME_ACCENT,
        },
      },
    },
    themeColor: FASIKUL_THEME_PRIMARY,
    includeDescription: false,
    testDescription: "",
    descriptionColumnCount: 1,
    descriptionTexts: [""],
    descriptionColumnDividers: false,
    descriptionBoxPadYPt: 5,
    descriptionBoxPadXPt: 8,
    pageDecor: defaultModulePageDecor(),
  };
}

export type LayoutLiveSlice = {
  headerStyleId: string;
  headerConfig: HeaderConfig;
  themeColor: string;
  options: { includeDescription: boolean };
  testDescription: string;
  descriptionColumnCount: 1 | 2 | 3;
  descriptionTexts: string[];
  descriptionColumnDividers: boolean;
  descriptionBoxPadYPt: number;
  descriptionBoxPadXPt: number;
  showColumnDivider?: boolean;
  columnDividerText?: string;
  columnDividerWidthPt?: number;
  showColumnDividerText?: boolean;
  centerLineBold?: boolean;
  centerLineItalic?: boolean;
  showWatermark?: boolean;
  watermarkText?: string;
  watermarkLayout?: ModulePageDecor["watermarkLayout"];
  watermarkAngleDeg?: number;
  watermarkOpacity?: number;
  watermarkSize?: number;
  watermarkLogoUrl?: string | null;
  showPageFrame?: boolean;
  pageFrameColorMode?: ModulePageDecor["pageFrameColorMode"];
  pageFrameColor?: string;
  pageFrameWidthPt?: number;
  pageFrameInnerGapMm?: number;
  pageFrameCornerRadiusMm?: number;
  pageFrameLineStyle?: ModulePageDecor["pageFrameLineStyle"];
};

export function captureModuleLayout(state: LayoutLiveSlice): ModuleLayoutSnapshot {
  return {
    headerStyleId: state.headerStyleId,
    headerConfig: { ...state.headerConfig },
    themeColor: state.themeColor,
    includeDescription: !!state.options.includeDescription,
    testDescription: state.testDescription,
    descriptionColumnCount: state.descriptionColumnCount,
    descriptionTexts: [...(state.descriptionTexts ?? [""])],
    descriptionColumnDividers: !!state.descriptionColumnDividers,
    descriptionBoxPadYPt: state.descriptionBoxPadYPt,
    descriptionBoxPadXPt: state.descriptionBoxPadXPt,
    pageDecor: pageDecorFromLive(state),
  };
}

export function applyModuleLayout(snap: ModuleLayoutSnapshot): Partial<LayoutLiveSlice> & {
  optionsPatch: { includeDescription: boolean };
  pageDecor: ModulePageDecor;
} {
  const col = snap.descriptionColumnCount;
  const descriptionColumnCount: 1 | 2 | 3 =
    col === 2 || col === 3 ? col : 1;
  const pageDecor = parseLgsPageDecor(snap.pageDecor ?? defaultModulePageDecor());
  return {
    headerStyleId: snap.headerStyleId || "style_1",
    headerConfig: { ...defaultHeaderConfig(), ...snap.headerConfig },
    themeColor: snap.themeColor || "#1E88E5",
    testDescription: snap.testDescription ?? "",
    descriptionColumnCount,
    descriptionTexts:
      snap.descriptionTexts?.length > 0 ? [...snap.descriptionTexts] : [""],
    descriptionColumnDividers: !!snap.descriptionColumnDividers,
    descriptionBoxPadYPt: snap.descriptionBoxPadYPt ?? 5,
    descriptionBoxPadXPt: snap.descriptionBoxPadXPt ?? 8,
    optionsPatch: { includeDescription: !!snap.includeDescription },
    pageDecor,
  };
}

export function defaultLayoutForModule(mod: PaperLayoutModule): ModuleLayoutSnapshot {
  if (mod === "trial") return defaultTrialModuleLayout();
  if (mod === "fasikul") return defaultFasikulModuleLayout();
  return defaultTestModuleLayout();
}

export function ensureModuleLayouts(
  raw: Partial<Record<PaperLayoutModule, unknown>> | null | undefined,
): Record<PaperLayoutModule, ModuleLayoutSnapshot> {
  return {
    test: parseModuleLayoutSnapshot(raw?.test, defaultTestModuleLayout()),
    trial: parseModuleLayoutSnapshot(raw?.trial, defaultTrialModuleLayout()),
    fasikul: parseModuleLayoutSnapshot(raw?.fasikul, defaultFasikulModuleLayout()),
  };
}

export function parseModuleLayoutSnapshot(
  raw: unknown,
  fallback: ModuleLayoutSnapshot,
): ModuleLayoutSnapshot {
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Partial<ModuleLayoutSnapshot>;
  const col = o.descriptionColumnCount;
  const descriptionColumnCount: 1 | 2 | 3 =
    col === 2 || col === 3 ? col : fallback.descriptionColumnCount;
  return {
    headerStyleId: o.headerStyleId || fallback.headerStyleId,
    headerConfig: { ...fallback.headerConfig, ...(o.headerConfig ?? {}) },
    themeColor: o.themeColor || fallback.themeColor,
    includeDescription:
      o.includeDescription !== undefined
        ? !!o.includeDescription
        : fallback.includeDescription,
    testDescription: o.testDescription ?? fallback.testDescription,
    descriptionColumnCount,
    descriptionTexts:
      Array.isArray(o.descriptionTexts) && o.descriptionTexts.length > 0
        ? o.descriptionTexts.map(String)
        : [...fallback.descriptionTexts],
    descriptionColumnDividers:
      o.descriptionColumnDividers !== undefined
        ? !!o.descriptionColumnDividers
        : fallback.descriptionColumnDividers,
    descriptionBoxPadYPt: o.descriptionBoxPadYPt ?? fallback.descriptionBoxPadYPt,
    descriptionBoxPadXPt: o.descriptionBoxPadXPt ?? fallback.descriptionBoxPadXPt,
    pageDecor: parseLgsPageDecor(o.pageDecor ?? fallback.pageDecor),
  };
}
