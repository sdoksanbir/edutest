/** Başlık rozeti ayarları — tema bazında bağımsız */

import type { HeaderConfig } from "./corporateHeaderLayout";
import { normalizeHeaderStyleId, type HeaderStyleId } from "./headerStyleIds";

export type HeaderBadgeSettings = {
  bannerRightMode?: "examType" | "score" | "testNo" | "hidden";
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
  scoreBoxWidthPt?: number;
  scoreBoxHeightPt?: number;
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
  "scoreBoxWidthPt",
  "scoreBoxHeightPt",
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

/** Tema 2 — kurumsal varsayılanlardan kopuk başlangıç */
export function style2BadgeDefaults(): HeaderBadgeSettings {
  return {
    bannerRightMode: "testNo",
    testType: "TEST",
    testNumber: "01",
    testNoLabelFontPt: 8,
    testNoNumFontPt: 10,
    testNoLabelColor: "#FFFFFF",
    testNoNumColor: "",
    testNoFillColor: "",
    testNoBorderColor: "",
    testNoWidthPt: 72,
    testNoHeightPt: 22,
    scoreBoxWidthPt: 113,
    scoreBoxHeightPt: 37,
    scoreBoxLabelFontPt: 7,
    scoreBoxLabelColor: "",
    scoreBoxBorderColor: "",
    scoreBoxFillColor: "#FFFFFF",
    scoreBoxBorderWidthPt: 1.25,
    scoreBoxLineWidthPt: 0.75,
    examType: "TYT-AYT TEST",
    examTypeLine1: "TYT-AYT",
    examTypeLine2: "TEST",
    examTypeLine1FontPt: 9,
    examTypeLine2FontPt: 10,
    examTypeLine1Color: "",
    examTypeLine2Color: "",
    examTypeBoxBorderStyle: "solid",
    examTypeBoxBorderColor: "",
    examTypeBoxBorderWidthPt: 1.5,
    examTypeBoxManualWidthPt: 96,
    examTypeBoxManualHeightPt: 36,
    examTypeBoxPadXPt: 4,
    examTypeBoxPadYPt: 4,
    examTypeBoxFillEnabled: false,
    examTypeBoxFillColor: "#F3F4F6",
    examTypeTextAlign: "center",
    examTypeDividerStyle: "none",
    examTypeDividerColor: "",
    examTypeDividerWidthPt: 0.75,
  };
}

export function mergeHeaderBadgeConfig(
  config: HeaderConfig,
  styleId?: string,
): HeaderConfig {
  const id = normalizeHeaderStyleId(styleId);
  const overlay = config.badgeByStyle?.[id];
  if (id === "style_2") {
    return { ...config, ...style2BadgeDefaults(), ...overlay };
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
