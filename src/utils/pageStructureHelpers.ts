/** Kenar boşluğu hazır ayarları (cm → mm) */
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
    /** Üst/Alt/Sol/Sağ: 1,25 cm */
    topMm: 12.5,
    bottomMm: 12.5,
    leftMm: 12.5,
    rightMm: 12.5,
  },
  {
    id: "cilt",
    label: "Cilt",
    /** Sol (cilt): 1,5 cm — üst / sağ / alt: 1 cm */
    topMm: 10,
    bottomMm: 10,
    leftMm: 15,
    rightMm: 10,
  },
] as const;

export type MarginPresetId = (typeof MARGIN_PRESETS)[number]["id"];

export const DEFAULT_QUESTION_GAP_MM = 25;

/** Cilt — üst boşluk (1 cm); sol için leftMm kullanın */
export const DEFAULT_MARGIN_MM = MARGIN_PRESETS.find((p) => p.id === "cilt")!.topMm;
export const DEFAULT_MARGIN_LEFT_MM = MARGIN_PRESETS.find((p) => p.id === "cilt")!.leftMm;

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

export const DEFAULT_THEME_ACCENT_HEX = "#F34A2F";

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
