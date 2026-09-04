export const DISPLAY_SCALE_MIN_PCT = 50;
export const DISPLAY_SCALE_MAX_PCT = 200;
export const DISPLAY_SCALE_NEUTRAL_PCT = 100;

export function clampDisplayScalePct(pct: number): number {
  return Math.max(
    DISPLAY_SCALE_MIN_PCT,
    Math.min(DISPLAY_SCALE_MAX_PCT, Math.round(pct)),
  );
}

export function displayScaleFromPct(pct: number): number {
  return clampDisplayScalePct(pct) / 100;
}
