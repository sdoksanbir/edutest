/**
 * Test modülü — her başlık temasının fabrika varsayılanı.
 * "Varsayılana dön" ile canlı config + badgeByStyle sıfırlanır.
 */

import {
  CLASSIC_SUBJECT_PILL_PAD_X_DEFAULT_PT,
  CLASSIC_SUBJECT_PILL_PAD_Y_DEFAULT_PT,
  CLASSIC_SUBJECT_PILL_TEXT_OFFSET_Y_DEFAULT_PT,
} from "./classicBannerTopRow";
import { defaultHeaderConfig, type HeaderConfig } from "./corporateHeaderLayout";
import { style1BadgeDefaults, style2BadgeDefaults } from "./headerBadgeByStyle";
import {
  normalizeHeaderStyleId,
  type HeaderStyleId,
} from "./headerStyleIds";
import { SUBJECT_PILL_TEXT_OFFSET_Y_DEFAULT_PT } from "./modernCorporateHeaderShared";

/** Minimal ders adı arka plan — lacivert */
const MINIMAL_SUBJECT_PILL_FILL_DEFAULT = "#0A1931";

/** Fasikül varsayılan renkleri — test modülünden bağımsız */
export const FASIKUL_THEME_PRIMARY = "#0A1931";
export const FASIKUL_THEME_ACCENT = "#DC2626";

export type TestThemeDefaultsResult = {
  headerStyleId: HeaderStyleId;
  headerConfig: HeaderConfig;
  themeColor: string;
};

/** Aktif temaya göre fabrika ayarı; diğer temaların badge varsayılanları da temizlenir. */
export function buildTestThemeDefaults(
  activeStyleId: string | undefined,
): TestThemeDefaultsResult {
  const active = normalizeHeaderStyleId(activeStyleId);
  /** Yaprak vb. henüz yok — Kurumsal varsayılana düş */
  const target: HeaderStyleId =
    active === "style_2" ? "style_2" : "style_1";

  const base = defaultHeaderConfig();
  const primary = (base.primaryColor || MINIMAL_SUBJECT_PILL_FILL_DEFAULT).trim();
  const badgeByStyle = {
    style_1: style1BadgeDefaults(),
    style_2: style2BadgeDefaults(),
  };

  if (target === "style_2") {
    const school =
      (base.institutionLine1 || "").trim() ||
      (base.schoolName || "").trim() ||
      "";
    return {
      headerStyleId: "style_2",
      headerConfig: {
        ...base,
        primaryColor: primary,
        useYaprakBanner: false,
        useExamBanner: false,
        headerLeftMode: "publicationText",
        showClassicInfoBar: true,
        institutionLine1: school,
        institutionLine1Color: "#FFFFFF",
        institutionLine1FontPt: 11.5,
        institutionBadgeWidthPt: 160,
        institutionBadgeHeightPt: 18,
        institutionBadgePadXPt: 6,
        institutionBadgeRadiusPt: 2.5,
        logoPadYPt: 2,
        logoPadLeftPt: 4,
        subjectPillPadXPt: CLASSIC_SUBJECT_PILL_PAD_X_DEFAULT_PT,
        subjectPillPadYPt: CLASSIC_SUBJECT_PILL_PAD_Y_DEFAULT_PT,
        subjectPillTextOffsetYPt: CLASSIC_SUBJECT_PILL_TEXT_OFFSET_Y_DEFAULT_PT,
        subjectPillFillColor: MINIMAL_SUBJECT_PILL_FILL_DEFAULT,
        bannerRightMode: "testNo",
        testNoWidthPt: 60,
        testNoHeightPt: 18,
        testNoFillColor: "",
        testNoBorderColor: "",
        testNoLabelFontPt: 11.5,
        testNoNumFontPt: 10,
        badgeByStyle: {
          style_2: { ...style2BadgeDefaults(), bannerRightMode: "testNo" },
        },
      },
      themeColor: primary,
    };
  }

  return {
    headerStyleId: "style_1",
    headerConfig: {
      ...base,
      primaryColor: primary,
      useYaprakBanner: false,
      useExamBanner: false,
      subjectPillTextOffsetYPt: SUBJECT_PILL_TEXT_OFFSET_Y_DEFAULT_PT,
      badgeByStyle,
    },
    themeColor: primary,
  };
}

/** Fasikül — Standart / Minimal fabrika ayarı (lacivert + kırmızı) */
export function buildFasikulThemeDefaults(
  activeStyleId: string | undefined,
): TestThemeDefaultsResult {
  const built = buildTestThemeDefaults(activeStyleId);
  return {
    ...built,
    themeColor: FASIKUL_THEME_PRIMARY,
    headerConfig: {
      ...built.headerConfig,
      primaryColor: FASIKUL_THEME_PRIMARY,
      accentColor: FASIKUL_THEME_ACCENT,
      subjectPillFillColor:
        built.headerStyleId === "style_2"
          ? FASIKUL_THEME_PRIMARY
          : built.headerConfig.subjectPillFillColor,
    },
  };
}
