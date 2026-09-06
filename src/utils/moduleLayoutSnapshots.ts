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

export type PaperLayoutModule = "test" | "trial";

/** Test / Deneme — başlık + yönerge anlık görüntüsü (birbirinden bağımsız) */
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
};

export function paperLayoutModuleFromTab(
  tab: string | null | undefined,
): PaperLayoutModule | null {
  if (tab === "trial-exam") return "trial";
  if (tab === "test-paper") return "test";
  return null;
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
  };
}

export function applyModuleLayout(snap: ModuleLayoutSnapshot): Partial<LayoutLiveSlice> & {
  optionsPatch: { includeDescription: boolean };
} {
  const col = snap.descriptionColumnCount;
  const descriptionColumnCount: 1 | 2 | 3 =
    col === 2 || col === 3 ? col : 1;
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
  };
}
