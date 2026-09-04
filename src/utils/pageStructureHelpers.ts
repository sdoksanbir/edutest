/** Kenar boşluğu hazır ayarları — dört kenar eşit (cm → mm) */
export const MARGIN_PRESETS = [
  {
    id: "dar",
    label: "Dar",
    /** Üst/Alt/Sol/Sağ: 0,5 cm */
    topMm: 5,
    bottomMm: 5,
    leftMm: 5,
    rightMm: 5,
  },
  {
    id: "normal",
    label: "Normal",
    /** Üst/Alt/Sol/Sağ: 1,5 cm */
    topMm: 15,
    bottomMm: 15,
    leftMm: 15,
    rightMm: 15,
  },
  {
    id: "genis",
    label: "Geniş",
    /** Üst/Alt/Sol/Sağ: 2,5 cm */
    topMm: 25,
    bottomMm: 25,
    leftMm: 25,
    rightMm: 25,
  },
] as const;

export type MarginPresetId = (typeof MARGIN_PRESETS)[number]["id"];

export const DEFAULT_QUESTION_GAP_MM = 25;

/** Normal — 1,5 cm */
export const DEFAULT_MARGIN_MM = MARGIN_PRESETS.find((p) => p.id === "normal")!.topMm;

export type PageNumberFormat = "plain" | "fraction";
export type QuestionNumberColorMode = "theme" | "black";

const MARGIN_MATCH_EPS_MM = 0.05;

function marginsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= MARGIN_MATCH_EPS_MM;
}

export function detectMarginPreset(
  top: number,
  bottom: number,
  left: number,
  right: number,
): MarginPresetId | null {
  const found = MARGIN_PRESETS.find(
    (p) =>
      marginsMatch(top, p.topMm) &&
      marginsMatch(bottom, p.bottomMm) &&
      marginsMatch(left, p.leftMm) &&
      marginsMatch(right, p.rightMm),
  );
  return found?.id ?? null;
}

export function formatPageNumberLabel(
  pageNum: number,
  totalPages: number,
  start: number,
  format: PageNumberFormat,
): string {
  const displayPage = pageNum + Math.max(1, start) - 1;
  const displayTotal = totalPages + Math.max(1, start) - 1;
  if (format === "fraction") return `${displayPage}/${displayTotal}`;
  return String(displayPage);
}

export function resolveThemePrimaryHex(
  primaryColor?: string | null,
  themeColorFallback?: string | null,
): string {
  const raw = primaryColor?.trim();
  if (raw) return raw;
  const fallback = themeColorFallback?.trim();
  return fallback || "#1E88E5";
}

export const DEFAULT_THEME_ACCENT_HEX = "#DC2626";

export function resolveThemeAccentHex(accentColor?: string | null): string {
  const raw = accentColor?.trim();
  return raw || DEFAULT_THEME_ACCENT_HEX;
}

export function questionNumberDrawColor(
  mode: QuestionNumberColorMode,
  primaryColor: string,
): string {
  return mode === "black" ? "#000000" : primaryColor;
}
