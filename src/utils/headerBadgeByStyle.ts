/** Başlık rozeti ayarları — tema bazında bağımsız */

import type { HeaderConfig } from "./corporateHeaderLayout";
import { normalizeHeaderStyleId, type HeaderStyleId } from "./headerStyleIds";

export type HeaderBadgeSettings = {
  bannerRightMode?: "examType" | "score" | "testNo" | "hidden";
  bannerRightSlots?: Array<"examType" | "score" | "testNo">;
  testType?: string;
  testNumber?: string;
  testNoLabelFontPt?: number;
  testNoNumFontPt?: number;
  testNoLabelColor?: string;
  testNoNumColor?: string;
  testNoFillColor?: string;
  testNoBorderColor?: string;
  testNoWidthPt?: number;
  testNoHeightPt?: number;
  testNoOffsetYPt?: number;
  testNoGapXPt?: number;
  testNoOffsetXPt?: number;
  scoreBoxWidthPt?: number;
  scoreBoxHeightPt?: number;
  scoreBoxOffsetYPt?: number;
  scoreBoxLabelFontPt?: number;
  scoreBoxLabelColor?: string;
  scoreBoxBorderColor?: string;
  scoreBoxFillColor?: string;
  scoreBoxBorderWidthPt?: number;
  scoreBoxLineWidthPt?: number;
  examType?: string;
  examTypeLine1?: string;
  examTypeLine2?: string;
  examTypeLine1FontPt?: number;
  examTypeLine2FontPt?: number;
  examTypeLine1Color?: string;
  examTypeLine2Color?: string;
  examTypeBoxBorderStyle?: "none" | "solid" | "dashed" | "dotted";
  examTypeBoxBorderColor?: string;
  examTypeBoxBorderWidthPt?: number;
  examTypeBoxManualWidthPt?: number;
  examTypeBoxManualHeightPt?: number;
  examTypeBoxPadXPt?: number;
  examTypeBoxPadYPt?: number;
  examTypeOffsetXPt?: number;
  examTypeOffsetYPt?: number;
  examTypeBoxFillEnabled?: boolean;
  examTypeBoxFillColor?: string;
  examTypeTextAlign?: "left" | "center" | "right";
  examTypeDividerStyle?: "none" | "solid" | "dashed" | "dotted";
  examTypeDividerColor?: string;
  examTypeDividerWidthPt?: number;
};

export type HeaderBadgeByStyle = Partial<Record<HeaderStyleId, HeaderBadgeSettings>>;

const BADGE_KEYS: (keyof HeaderBadgeSettings)[] = [
  "bannerRightMode",
  "bannerRightSlots",
  "testType",
  "testNumber",
  "testNoLabelFontPt",
  "testNoNumFontPt",
  "testNoLabelColor",
  "testNoNumColor",
  "testNoFillColor",
  "testNoBorderColor",
  "testNoWidthPt",
  "testNoHeightPt",
  "testNoOffsetYPt",
  "testNoGapXPt",
  "testNoOffsetXPt",
  "scoreBoxWidthPt",
  "scoreBoxHeightPt",
  "scoreBoxOffsetYPt",
  "scoreBoxLabelFontPt",
  "scoreBoxLabelColor",
  "scoreBoxBorderColor",
  "scoreBoxFillColor",
  "scoreBoxBorderWidthPt",
  "scoreBoxLineWidthPt",
  "examType",
  "examTypeLine1",
  "examTypeLine2",
  "examTypeLine1FontPt",
  "examTypeLine2FontPt",
  "examTypeLine1Color",
  "examTypeLine2Color",
  "examTypeBoxBorderStyle",
  "examTypeBoxBorderColor",
  "examTypeBoxBorderWidthPt",
  "examTypeBoxManualWidthPt",
  "examTypeBoxManualHeightPt",
  "examTypeBoxPadXPt",
  "examTypeBoxPadYPt",
  "examTypeOffsetXPt",
  "examTypeOffsetYPt",
  "examTypeBoxFillEnabled",
  "examTypeBoxFillColor",
  "examTypeTextAlign",
  "examTypeDividerStyle",
  "examTypeDividerColor",
  "examTypeDividerWidthPt",
];

function pickBadgeSettings(raw: unknown): HeaderBadgeSettings {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: HeaderBadgeSettings = {};
  for (const key of BADGE_KEYS) {
    if (o[key] !== undefined) (out as Record<string, unknown>)[key] = o[key];
  }
  return out;
}

export function parseHeaderBadgeByStyle(raw: unknown): HeaderBadgeByStyle {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: HeaderBadgeByStyle = {};
  for (const id of ["style_1", "style_2", "style_3", "style_4"] as HeaderStyleId[]) {
    const bag = o[id];
    if (bag && typeof bag === "object") out[id] = pickBadgeSettings(bag);
  }
  return out;
}

/** Tema 1 (Kurumsal) — rozet fabrika ölçüleri */
export function style1BadgeDefaults(): HeaderBadgeSettings {
  return {
    bannerRightMode: "examType",
    bannerRightSlots: ["examType", "score"],
    testNoWidthPt: 100,
    testNoHeightPt: 22,
    testNoLabelFontPt: 15,
    testNoNumFontPt: 11,
    testNoLabelColor: "",
    testNoNumColor: "#FFFFFF",
    testNoOffsetYPt: 3,
    testNoGapXPt: 3,
    testNoOffsetXPt: 23,
    scoreBoxWidthPt: 100,
    scoreBoxHeightPt: 17,
    scoreBoxLabelFontPt: 10,
    scoreBoxOffsetYPt: 9,
    examTypeBoxManualWidthPt: 100,
    examTypeBoxManualHeightPt: 22,
    examTypeOffsetXPt: 0,
    examTypeOffsetYPt: 7,
    examType: "9. Sınıf",
    examTypeLine1: "9. Sınıf",
    examTypeLine2: "",
    examTypeLine1FontPt: 11,
    examTypeLine1Color: "#FFFFFF",
    examTypeBoxBorderStyle: "none",
    examTypeBoxFillEnabled: true,
    examTypeBoxFillColor: "#0A1931",
  };
}

/** Tema 2 — kurumsal varsayılanlardan kopuk başlangıç */
export function style2BadgeDefaults(): HeaderBadgeSettings {
  return {
    bannerRightMode: "testNo",
    testType: "TEST",
    testNumber: "01",
    testNoLabelFontPt: 11,
    testNoNumFontPt: 10,
    testNoLabelColor: "",
    testNoNumColor: "#FFFFFF",
    testNoFillColor: "",
    testNoBorderColor: "",
    testNoWidthPt: 60,
    testNoHeightPt: 18,
    scoreBoxWidthPt: 100,
    scoreBoxHeightPt: 17,
    scoreBoxLabelFontPt: 10,
    scoreBoxLabelColor: "",
    scoreBoxBorderColor: "",
    scoreBoxFillColor: "#FFFFFF",
    scoreBoxBorderWidthPt: 1.25,
    scoreBoxLineWidthPt: 0.75,
    examType: '9. Sınıf',
    examTypeLine1: '9. Sınıf',
    examTypeLine2: '',
    examTypeLine1FontPt: 9,
    examTypeLine2FontPt: 10,
    examTypeLine1Color: "",
    examTypeLine2Color: "",
    examTypeBoxBorderStyle: "solid",
    examTypeBoxBorderColor: "",
    examTypeBoxBorderWidthPt: 1.5,
    examTypeBoxManualWidthPt: 72,
    examTypeBoxManualHeightPt: 22,
    examTypeBoxPadXPt: 4,
    examTypeBoxPadYPt: 4,
    examTypeOffsetXPt: 0,
    examTypeOffsetYPt: 0,
    examTypeBoxFillEnabled: false,
    examTypeBoxFillColor: "#F3F4F6",
    examTypeTextAlign: "center",
    examTypeDividerStyle: "none",
    examTypeDividerColor: "",
    examTypeDividerWidthPt: 0.75,
  };
}

/** Eski fabrika ölçüleri — yeni varsayılanlara bırak */
function stripLegacyScoreBoxDefaults(
  overlay: HeaderBadgeSettings | undefined,
): HeaderBadgeSettings {
  if (!overlay) return {}
  const next = { ...overlay }
  const w = Number(next.scoreBoxWidthPt)
  const h = Number(next.scoreBoxHeightPt)
  const f = Number(next.scoreBoxLabelFontPt)
  const testW = Number(next.testNoWidthPt)
  const labelPt = Number(next.testNoLabelFontPt)
  const numPt = Number(next.testNoNumFontPt)
  const gapX = Number(next.testNoGapXPt)
  const testOy = Number(next.testNoOffsetYPt)
  const testOx = Number(next.testNoOffsetXPt)
  const examW = Number(next.examTypeBoxManualWidthPt)
  const examOy = Number(next.examTypeOffsetYPt)
  if (w === 113 || w === 108) delete next.scoreBoxWidthPt
  if (h === 37 || h === 22) delete next.scoreBoxHeightPt
  if (f === 7) delete next.scoreBoxLabelFontPt
  if (testW === 72 || testW === 60) delete next.testNoWidthPt
  if (labelPt === 8 || labelPt === 11 || labelPt === 11.5) delete next.testNoLabelFontPt
  if (numPt === 10) delete next.testNoNumFontPt
  if (gapX === 4) delete next.testNoGapXPt
  if (testOy === 0) delete next.testNoOffsetYPt
  if (testOx === 0) delete next.testNoOffsetXPt
  if (examW === 72 || examW === 96) delete next.examTypeBoxManualWidthPt
  if (examOy === 0 || examOy === 4) delete next.examTypeOffsetYPt
  if (Number(next.examTypeLine1FontPt) === 9) delete next.examTypeLine1FontPt
  {
    const slots = next.bannerRightSlots
    if (
      Array.isArray(slots) &&
      slots.length === 1 &&
      slots[0] === "score"
    ) {
      delete next.bannerRightSlots
      if (next.bannerRightMode === "score") delete next.bannerRightMode
    }
  }
  if (next.testNoLabelColor === "#FFFFFF" || next.testNoLabelColor === "#ffffff") {
    delete next.testNoLabelColor
  }
  if (next.examTypeLine1Color === "" || next.examTypeLine1Color == null) {
    delete next.examTypeLine1Color
  }
  if (next.examTypeLine1 === "" || next.examTypeLine1 == null) {
    delete next.examTypeLine1
  }
  {
    const line1 = String(next.examTypeLine1 ?? "").trim()
    if (line1 === "TYT-AYT" || line1 === "TYT-AYT TEST") delete next.examTypeLine1
    const et = String(next.examType ?? "").trim()
    if (et === "TYT-AYT" || et === "TYT-AYT TEST") delete next.examType
  }
  {
    const fill = String(next.examTypeBoxFillColor ?? "").trim().toLowerCase()
    if (fill === "#dc2626" || fill === "#f34a2f") delete next.examTypeBoxFillColor
    if (
      next.examTypeBoxFillEnabled === false &&
      (fill === "" || fill === "#f3f4f6")
    ) {
      delete next.examTypeBoxFillEnabled
      delete next.examTypeBoxFillColor
    }
  }
  if (
    Number(next.scoreBoxOffsetYPt) === -6 ||
    Number(next.scoreBoxOffsetYPt) === 0
  ) {
    delete next.scoreBoxOffsetYPt
  }
  return next
}

export function mergeHeaderBadgeConfig(
  config: HeaderConfig,
  styleId?: string,
): HeaderConfig {
  const id = normalizeHeaderStyleId(styleId);
  const overlay = config.badgeByStyle?.[id];
  if (id === "style_2") {
    const next = { ...(overlay ?? {}) };
    if (next.testNoLabelColor === "#FFFFFF" || next.testNoLabelColor === "#ffffff") {
      delete next.testNoLabelColor;
    }
    return { ...config, ...style2BadgeDefaults(), ...next };
  }
  if (id === "style_1") {
    return {
      ...config,
      ...style1BadgeDefaults(),
      ...stripLegacyScoreBoxDefaults(overlay),
    };
  }
  return overlay ? { ...config, ...overlay } : config;
}

export function patchHeaderBadge(
  config: HeaderConfig,
  styleId: string | undefined,
  patch: HeaderBadgeSettings,
): Pick<HeaderConfig, "badgeByStyle"> {
  const id = normalizeHeaderStyleId(styleId);
  return {
    badgeByStyle: {
      ...config.badgeByStyle,
      [id]: { ...config.badgeByStyle?.[id], ...patch },
    },
  };
}
