/**
 * Fasikül — soru çerçevesi / etiket ayarları.
 * Önizleme overlay + taslakta QuestionItem.fasikulFrame olarak saklanır.
 */

export type FasikulFramePresetId =
  | "none"
  | "kural"
  | "ogreniyorum"
  | "formul"
  | "unutma"
  | "bilgi-notu"
  | "onemli"
  | "ipucu"
  | "kisa-yol"
  /** Eski taslaklar */
  | "classic-label"
  | "green-label"
  | "warning-label"
  | "navy-header"
  | "burgundy-header"
  | "turquoise-header"
  | "red-ribbon"
  | "gold-ribbon"
  | "seal-badge"
  | "seal-badge-pink"
  | "tab-label"
  | "dotted-separator"
  | "classic-double-line";

export type FasikulFrameIconId =
  | "none"
  | "warning"
  | "star"
  | "pin"
  | "check"
  | "circle"
  | "bulb"
  | "notepad"
  | "target"
  | "exclaim"
  | "fire";

export type FasikulIconTextPlacement = "before" | "after";
/** Rozet konumu — çerçevenin dışında */
export type FasikulLabelPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  /** Geriye dönük */
  | "left"
  | "center"
  | "right";

/** Sol/sağ orta rozetlerde dikey yazı yönü */
export type FasikulLabelSideTextDir = "ttb" | "btt";

/**
 * Başlık şekilleri — referans görseldeki stiller.
 * slash-trail = Örnek/Formül, slash-corner-dot = Kısa Yol (+ sağ üst nokta)
 */
export type FasikulBadgeStyle =
  | "slash-trail"
  | "ring-pill"
  | "fold-flag"
  | "flat-bar-dots"
  | "chevron-bar"
  | "tip-pill"
  | "note-pill"
  | "warn-pill"
  | "slash-corner-dot"
  /** Eski */
  | "classic"
  | "folded-tab"
  | "angular-ribbon"
  | "reverse-angular-ribbon";

export type FasikulBorderStyle = "none" | "solid" | "dashed" | "dotted" | "double";
export type FasikulFrameApplyScope = "this" | "page" | "all" | "selected";

export type FasikulQuestionFrameSettings = {
  enabled: boolean;
  presetId: FasikulFramePresetId;
  iconId: FasikulFrameIconId;
  iconTextPlacement: FasikulIconTextPlacement;
  labelPosition: FasikulLabelPosition;
  /** middle-left / middle-right için: ttb = yukarı→aşağı, btt = aşağı→yukarı */
  labelSideTextDir: FasikulLabelSideTextDir;
  badgeStyle: FasikulBadgeStyle;
  /** Etiket yatay hizası (rozet içinde) */
  labelAlign: "left" | "center" | "right";
  labelColor: string;
  labelText: string;
  borderStyle: FasikulBorderStyle;
  borderWidth: 1 | 2 | 3 | 4;
  borderColor: string;
  cornerRadiusPx: number;
  fillColor: string;
  fillOpacityPct: number;
  /** Çerçeve ile görsel arası iç boşluk (px) */
  innerPaddingPx: number;
  /** Başlık kutusu ince ayar ofseti (px) */
  badgeOffsetX: number;
  badgeOffsetY: number;
  /**
   * Soru altı kareli alan.
   * Örnek (numara) dışında hazır tasarım seçilince varsayılan kapalı.
   */
  showScratchGrid: boolean;
};

export const FASIKUL_BADGE_STYLES: {
  id: FasikulBadgeStyle;
  name: string;
}[] = [
  { id: "slash-trail", name: "Eğik şerit" },
  { id: "ring-pill", name: "Örnek + no" },
  { id: "fold-flag", name: "Katlı bayrak" },
  { id: "flat-bar-dots", name: "Şerit + noktalar" },
  { id: "chevron-bar", name: "Chevron şerit" },
  { id: "tip-pill", name: "Kural hap" },
  { id: "note-pill", name: "Not hap" },
  { id: "warn-pill", name: "Unutma hap" },
  { id: "slash-corner-dot", name: "Eğik + köşe nokta" },
];

const LEGACY_BADGE_MAP: Record<string, FasikulBadgeStyle> = {
  classic: "ring-pill",
  "folded-tab": "fold-flag",
  "angular-ribbon": "slash-trail",
  "reverse-angular-ribbon": "slash-trail",
};

export function normalizeFasikulBadgeStyle(raw: unknown): FasikulBadgeStyle {
  const v = String(raw || "");
  if (LEGACY_BADGE_MAP[v]) return LEGACY_BADGE_MAP[v]!;
  if (FASIKUL_BADGE_STYLES.some((s) => s.id === v)) return v as FasikulBadgeStyle;
  return "slash-trail";
}

const LEGACY_PRESET_MAP: Record<string, FasikulFramePresetId> = {
  "classic-label": "kural",
  "green-label": "ogreniyorum",
  "warning-label": "unutma",
  "navy-header": "onemli",
  "burgundy-header": "formul",
  "turquoise-header": "ipucu",
  "red-ribbon": "kisa-yol",
  "gold-ribbon": "bilgi-notu",
  "seal-badge": "ogreniyorum",
  "seal-badge-pink": "formul",
  "tab-label": "unutma",
  "dotted-separator": "bilgi-notu",
  "classic-double-line": "kural",
};

export const FASIKUL_LABEL_POSITIONS: {
  id: Exclude<FasikulLabelPosition, "left" | "center" | "right">;
  title: string;
}[] = [
  { id: "top-left", title: "Üst sol" },
  { id: "top-center", title: "Üst orta" },
  { id: "top-right", title: "Üst sağ" },
  { id: "middle-left", title: "Sol orta" },
  { id: "middle-right", title: "Sağ orta" },
  { id: "bottom-left", title: "Alt sol" },
  { id: "bottom-center", title: "Alt orta" },
  { id: "bottom-right", title: "Alt sağ" },
];

export function normalizeLabelPosition(raw: unknown): FasikulLabelPosition {
  const v = String(raw || "");
  if (v === "left") return "top-left";
  if (v === "center") return "top-center";
  if (v === "right") return "top-right";
  if (FASIKUL_LABEL_POSITIONS.some((p) => p.id === v)) {
    return v as FasikulLabelPosition;
  }
  return "top-left";
}

export function isSideLabelPosition(pos: FasikulLabelPosition): boolean {
  const p = normalizeLabelPosition(pos);
  return p === "middle-left" || p === "middle-right";
}

/** Üst/alt rozet: yalnızca yatay kaydırma */
export function isTopOrBottomLabelPosition(pos: FasikulLabelPosition): boolean {
  return !isSideLabelPosition(pos);
}

/** Konuma göre geçersiz ekseni sıfırla */
export function clampBadgeOffsetForPosition(
  pos: FasikulLabelPosition,
  offsetX: number,
  offsetY: number,
): { badgeOffsetX: number; badgeOffsetY: number } {
  if (isSideLabelPosition(pos)) {
    return { badgeOffsetX: 0, badgeOffsetY: offsetY };
  }
  return { badgeOffsetX: offsetX, badgeOffsetY: 0 };
}

export const FASIKUL_LABEL_COLORS = [
  "#16a34a",
  "#0f172a",
  "#1d4ed8",
  "#dc2626",
  "#15803d",
  "#ea580c",
  "#7c3aed",
  "#475569",
] as const;

export const FASIKUL_BORDER_COLORS = [
  "#86efac",
  "#0f172a",
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#ea580c",
  "#7c3aed",
  "#334155",
] as const;

export const FASIKUL_FILL_COLORS = [
  "#f0fdf4",
  "#eff6ff",
  "#fef2f2",
  "#fff7ed",
  "#faf5ff",
  "#f8fafc",
  "#fefce8",
  "#ffffff",
] as const;

export const FASIKUL_FRAME_ICONS: {
  id: FasikulFrameIconId;
  glyph: string;
  label: string;
}[] = [
  { id: "none", glyph: "—", label: "Yok" },
  { id: "warning", glyph: "⚠️", label: "Uyarı" },
  { id: "star", glyph: "⭐", label: "Yıldız" },
  { id: "pin", glyph: "📌", label: "Raptiye" },
  { id: "check", glyph: "✅", label: "Onay" },
  { id: "circle", glyph: "🔴", label: "Nokta" },
  { id: "bulb", glyph: "💡", label: "Ampul" },
  { id: "notepad", glyph: "📝", label: "Not" },
  { id: "target", glyph: "🎯", label: "Hedef" },
  { id: "exclaim", glyph: "❗", label: "Ünlem" },
  { id: "fire", glyph: "🔥", label: "Ateş" },
];

export type FasikulFramePresetDef = {
  id: FasikulFramePresetId;
  name: string;
  defaultLabel: string;
  accent: string;
  fill: string;
  badgeStyle: FasikulBadgeStyle;
  defaultIcon: FasikulFrameIconId;
  borderStyle?: FasikulBorderStyle;
  borderWidth?: 1 | 2 | 3 | 4;
  /** Preset seçilince iç boşluk (px); yoksa mevcut değer korunur */
  defaultInnerPaddingPx?: number;
};

/** Referans görseldeki 8 çerçeve + başlık */
export const FASIKUL_FRAME_PRESETS: FasikulFramePresetDef[] = [
  {
    id: "kural",
    name: "ÖSYM Sorusu",
    defaultLabel: "ÖSYM SORUSU",
    accent: "#E65100",
    fill: "#FFF3E0",
    badgeStyle: "slash-trail",
    defaultIcon: "none",
    borderStyle: "solid",
    borderWidth: 2,
    defaultInnerPaddingPx: 3,
  },
  {
    id: "ogreniyorum",
    name: "Örnek (numara)",
    defaultLabel: "ÖRNEK",
    accent: "#C62828",
    fill: "#FFFFFF",
    badgeStyle: "ring-pill",
    defaultIcon: "none",
    borderStyle: "none",
    borderWidth: 1,
    defaultInnerPaddingPx: 3,
  },
  {
    id: "formul",
    name: "Formül",
    defaultLabel: "FORMÜL",
    accent: "#8B1D47",
    fill: "#F8EFF4",
    badgeStyle: "slash-trail",
    defaultIcon: "none",
    borderStyle: "solid",
    borderWidth: 2,
    defaultInnerPaddingPx: 3,
  },
  {
    id: "unutma",
    name: "Unutma",
    defaultLabel: "UNUTMA",
    accent: "#1565C0",
    fill: "#E3F2FD",
    badgeStyle: "warn-pill",
    defaultIcon: "none",
    borderStyle: "solid",
    borderWidth: 2,
    defaultInnerPaddingPx: 3,
  },
  {
    id: "bilgi-notu",
    name: "Bilgi Notu",
    defaultLabel: "BİLGİ NOTU",
    accent: "#F9A825",
    fill: "#FFF8E1",
    badgeStyle: "note-pill",
    defaultIcon: "none",
    borderStyle: "solid",
    borderWidth: 2,
    defaultInnerPaddingPx: 3,
  },
  {
    id: "onemli",
    name: "Önemli",
    defaultLabel: "ÖNEMLİ",
    accent: "#1A5A8A",
    fill: "#EDF7FC",
    badgeStyle: "chevron-bar",
    defaultIcon: "none",
    borderStyle: "solid",
    borderWidth: 2,
    defaultInnerPaddingPx: 3,
  },
  {
    id: "ipucu",
    name: "Kural",
    defaultLabel: "KURAL",
    accent: "#2E7D32",
    fill: "#E8F5E9",
    badgeStyle: "tip-pill",
    defaultIcon: "none",
    borderStyle: "solid",
    borderWidth: 2,
    defaultInnerPaddingPx: 3,
  },
  {
    id: "kisa-yol",
    name: "Kısa Yol",
    defaultLabel: "KISA YOL",
    accent: "#7B1FA2",
    fill: "#F3E5F5",
    badgeStyle: "slash-corner-dot",
    defaultIcon: "none",
    borderStyle: "solid",
    borderWidth: 2,
    defaultInnerPaddingPx: 3,
  },
];

export function resolveFasikulPresetId(raw: unknown): FasikulFramePresetId {
  const v = String(raw || "");
  if (LEGACY_PRESET_MAP[v]) return LEGACY_PRESET_MAP[v]!;
  if (v === "none" || FASIKUL_FRAME_PRESETS.some((p) => p.id === v)) {
    return v as FasikulFramePresetId;
  }
  return "kural";
}

/** Köşe yuvarlaklığı (px) — menü kaydırıcısı / clamp */
export const FASIKUL_CORNER_RADIUS_DEFAULT_PX = 5;
export const FASIKUL_CORNER_RADIUS_MIN_PX = 0;
export const FASIKUL_CORNER_RADIUS_MAX_PX = 40;

export function clampFasikulCornerRadiusPx(px: number): number {
  if (!Number.isFinite(px)) return FASIKUL_CORNER_RADIUS_DEFAULT_PX;
  return Math.max(
    FASIKUL_CORNER_RADIUS_MIN_PX,
    Math.min(FASIKUL_CORNER_RADIUS_MAX_PX, Math.round(px)),
  );
}

export const DEFAULT_FASIKUL_QUESTION_FRAME: FasikulQuestionFrameSettings = {
  enabled: false,
  presetId: "kural",
  iconId: "none",
  iconTextPlacement: "before",
  labelPosition: "top-left",
  labelSideTextDir: "ttb",
  badgeStyle: "slash-trail",
  labelAlign: "left",
  labelColor: "#E65100",
  labelText: "ÖSYM SORUSU",
  borderStyle: "solid",
  borderWidth: 2,
  borderColor: "#E65100",
  cornerRadiusPx: FASIKUL_CORNER_RADIUS_DEFAULT_PX,
  fillColor: "#FFF3E0",
  fillOpacityPct: 100,
  innerPaddingPx: 3,
  badgeOffsetX: 0,
  badgeOffsetY: 0,
  showScratchGrid: true,
};

function isHex(c: unknown): c is string {
  return typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c);
}

export function getFasikulFramePreset(
  id: FasikulFramePresetId,
): FasikulFramePresetDef | undefined {
  const resolved = resolveFasikulPresetId(id);
  return FASIKUL_FRAME_PRESETS.find((p) => p.id === resolved);
}

export function getFasikulFrameIcon(id: FasikulFrameIconId) {
  return FASIKUL_FRAME_ICONS.find((i) => i.id === id);
}

/** Çerçeve açıkken soru numarası çizilmez (numara rozette gösterilir). */
export function fasikulFrameHidesQuestionNumber(
  frame: FasikulQuestionFrameSettings | null | undefined,
): boolean {
  return Boolean(frame?.enabled);
}

/** Görünür kutu (kenarlık / dolgu) var mı? Rozet-only modda false. */
export function fasikulFrameHasVisibleBox(
  frame: FasikulQuestionFrameSettings | null | undefined | unknown,
): boolean {
  const f = normalizeFasikulQuestionFrame(frame);
  if (!f.enabled) return false;
  if (f.borderStyle !== "none") return true;
  return f.fillOpacityPct > 0;
}

/** Soru numarası rozet metni: 01, 02, … */
export function formatFasikulBadgeQuestionNumber(n: number): string {
  const v = Math.max(1, Math.round(Number(n) || 1));
  return String(v).padStart(2, "0");
}

/** Örnek (numara) — ring-pill çerçeve; sıra numarası yalnızca bunlarda artar */
export function isFasikulOrnekNumberedFrame(
  frame: FasikulQuestionFrameSettings | null | undefined | unknown,
): boolean {
  const f = normalizeFasikulQuestionFrame(frame);
  return f.enabled && normalizeFasikulBadgeStyle(f.badgeStyle) === "ring-pill";
}

/**
 * Layout sırasına göre Örnek rozet numarası (01, 02…).
 * Örnek dışı çerçeveli / çerçevesiz sorular atlanır.
 */
export function buildFasikulOrnekNumberByOrderIndex(
  questions: Array<{ order_index?: number; fasikulFrame?: unknown }>,
): Map<number, number> {
  const sorted = [...questions].sort(
    (a, b) => (Number(a.order_index) || 0) - (Number(b.order_index) || 0),
  );
  const map = new Map<number, number>();
  let n = 0;
  for (const q of sorted) {
    const oi = Number(q.order_index);
    if (!Number.isFinite(oi)) continue;
    if (!isFasikulOrnekNumberedFrame(q.fasikulFrame)) continue;
    n += 1;
    map.set(oi, n);
  }
  return map;
}

/** Öğreniyorum / Örnek-numara hazır ayarı */
export function buildOgreniyorumFasikulFrame(
  current?: Partial<FasikulQuestionFrameSettings>,
): FasikulQuestionFrameSettings {
  return applyFasikulPreset(
    { ...DEFAULT_FASIKUL_QUESTION_FRAME, ...current },
    "ogreniyorum",
  );
}

/**
 * Dış başlık (üst konum) için dikey rezerv — kutu üstünde çakışmayı önler.
 * ring-pill yuvarlağı 28px; üstteki kareli alan ile ekstra boşluk.
 */
export const FASIKUL_FRAME_BADGE_HEIGHT_PX = 28;
export const FASIKUL_FRAME_BADGE_OUTSIDE_GAP_PX = 16;
export const FASIKUL_FRAME_BADGE_TOP_RESERVE_PX =
  FASIKUL_FRAME_BADGE_HEIGHT_PX + FASIKUL_FRAME_BADGE_OUTSIDE_GAP_PX;
export const FASIKUL_FRAME_BADGE_TOP_RESERVE_PT =
  FASIKUL_FRAME_BADGE_TOP_RESERVE_PX * 0.75;

export function fasikulFrameNeedsTopBadgeReserve(
  frame: FasikulQuestionFrameSettings | null | undefined | unknown,
): boolean {
  const f = normalizeFasikulQuestionFrame(frame);
  if (!f.enabled) return false;
  const pos = normalizeLabelPosition(f.labelPosition);
  return pos === "top-left" || pos === "top-center" || pos === "top-right";
}

export function fasikulFrameBadgeTopReservePt(
  frame: FasikulQuestionFrameSettings | null | undefined | unknown,
): number {
  return fasikulFrameNeedsTopBadgeReserve(frame)
    ? FASIKUL_FRAME_BADGE_TOP_RESERVE_PT
    : 0;
}

/**
 * Çerçeve dış kutusu — kareli alan ile aynı sol kenar / genişlik
 * (soru solundan sütun sağına).
 */
export function resolveFasikulFrameOuterWidthPt(args: {
  leftPt: number;
  columnXPt: number;
  columnWidthPt: number;
}): number {
  const colRight = args.columnXPt + args.columnWidthPt;
  return Math.max(0, colRight - args.leftPt);
}

export function normalizeFasikulQuestionFrame(
  raw: unknown,
): FasikulQuestionFrameSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_FASIKUL_QUESTION_FRAME };
  const o = raw as Partial<FasikulQuestionFrameSettings>;
  const iconOk = FASIKUL_FRAME_ICONS.some((i) => i.id === o.iconId);
  const borderStyles: FasikulBorderStyle[] = ["none", "solid", "dashed", "dotted", "double"];
  const borderStyle = borderStyles.includes(o.borderStyle as FasikulBorderStyle)
    ? (o.borderStyle as FasikulBorderStyle)
    : DEFAULT_FASIKUL_QUESTION_FRAME.borderStyle;
  const bw = Number(o.borderWidth);
  const borderWidth = ([1, 2, 3, 4] as const).includes(bw as 1 | 2 | 3 | 4)
    ? (bw as 1 | 2 | 3 | 4)
    : DEFAULT_FASIKUL_QUESTION_FRAME.borderWidth;
  const corner = Number(o.cornerRadiusPx);
  const opacity = Number(o.fillOpacityPct);
  const labelPosition = normalizeLabelPosition(o.labelPosition);
  const badgeOxRaw = Number(o.badgeOffsetX);
  const badgeOyRaw = Number(o.badgeOffsetY);
  const badgeOx = Number.isFinite(badgeOxRaw)
    ? Math.max(-80, Math.min(80, Math.round(badgeOxRaw)))
    : DEFAULT_FASIKUL_QUESTION_FRAME.badgeOffsetX;
  const badgeOy = Number.isFinite(badgeOyRaw)
    ? Math.max(-80, Math.min(80, Math.round(badgeOyRaw)))
    : DEFAULT_FASIKUL_QUESTION_FRAME.badgeOffsetY;
  const badgeOffsets = clampBadgeOffsetForPosition(labelPosition, badgeOx, badgeOy);
  return {
    enabled: Boolean(o.enabled),
    presetId: resolveFasikulPresetId(o.presetId),
    iconId: iconOk ? (o.iconId as FasikulFrameIconId) : DEFAULT_FASIKUL_QUESTION_FRAME.iconId,
    iconTextPlacement: o.iconTextPlacement === "after" ? "after" : "before",
    labelPosition,
    labelSideTextDir: o.labelSideTextDir === "btt" ? "btt" : "ttb",
    badgeStyle: normalizeFasikulBadgeStyle(o.badgeStyle),
    labelAlign:
      o.labelAlign === "center" || o.labelAlign === "right" ? o.labelAlign : "left",
    labelColor: isHex(o.labelColor) ? o.labelColor : DEFAULT_FASIKUL_QUESTION_FRAME.labelColor,
    labelText:
      typeof o.labelText === "string" && o.labelText.trim()
        ? o.labelText.slice(0, 40)
        : DEFAULT_FASIKUL_QUESTION_FRAME.labelText,
    borderStyle,
    borderWidth,
    borderColor: isHex(o.borderColor) ? o.borderColor : DEFAULT_FASIKUL_QUESTION_FRAME.borderColor,
    cornerRadiusPx: Number.isFinite(corner)
      ? clampFasikulCornerRadiusPx(corner)
      : DEFAULT_FASIKUL_QUESTION_FRAME.cornerRadiusPx,
    fillColor: isHex(o.fillColor) ? o.fillColor : DEFAULT_FASIKUL_QUESTION_FRAME.fillColor,
    fillOpacityPct: Number.isFinite(opacity)
      ? Math.max(0, Math.min(100, Math.round(opacity)))
      : DEFAULT_FASIKUL_QUESTION_FRAME.fillOpacityPct,
    innerPaddingPx: (() => {
      const p = Number(o.innerPaddingPx);
      return Number.isFinite(p)
        ? Math.max(0, Math.min(48, Math.round(p)))
        : DEFAULT_FASIKUL_QUESTION_FRAME.innerPaddingPx;
    })(),
    badgeOffsetX: badgeOffsets.badgeOffsetX,
    badgeOffsetY: badgeOffsets.badgeOffsetY,
    showScratchGrid: (() => {
      if (typeof o.showScratchGrid === "boolean") return o.showScratchGrid;
      const style = normalizeFasikulBadgeStyle(o.badgeStyle);
      // Eski kayıtlar: Örnek (numara) dışında çerçevede kareli alan kapalı
      if (Boolean(o.enabled) && style !== "ring-pill") return false;
      return DEFAULT_FASIKUL_QUESTION_FRAME.showScratchGrid;
    })(),
  };
}

export function applyFasikulPreset(
  current: FasikulQuestionFrameSettings,
  presetId: FasikulFramePresetId,
): FasikulQuestionFrameSettings {
  const resolved = resolveFasikulPresetId(presetId);
  const preset = getFasikulFramePreset(resolved);
  if (!preset) return { ...current, enabled: true, presetId: resolved };
  const isRing = preset.badgeStyle === "ring-pill";
  return {
    ...current,
    enabled: true,
    presetId: resolved,
    iconId: "none",
    labelText: preset.defaultLabel,
    labelColor: preset.accent,
    borderColor: preset.accent,
    fillColor: preset.fill,
    /** Hazır şablonlarda dolgu varsayılan kapalı */
    fillOpacityPct: 0,
    borderStyle: preset.borderStyle ?? "solid",
    borderWidth: preset.borderWidth ?? 2,
    badgeStyle: preset.badgeStyle,
    labelPosition: "top-left",
    badgeOffsetX: 0,
    badgeOffsetY: 0,
    innerPaddingPx: preset.defaultInnerPaddingPx ?? 3,
    /** Örnek (numara) dışında kareli alan varsayılan kapalı */
    showScratchGrid: isRing,
  };
}

/** Çerçeve açıkken bu soruda kareli alan çizilsin mi? */
export function fasikulFrameShowsScratchGrid(
  frame: FasikulQuestionFrameSettings | null | undefined | unknown,
): boolean {
  const f = normalizeFasikulQuestionFrame(frame);
  if (!f.enabled) return true;
  return f.showScratchGrid === true;
}

export function withBorderStyle(
  current: FasikulQuestionFrameSettings,
  borderStyle: FasikulBorderStyle,
): FasikulQuestionFrameSettings {
  // Kenarlık yok = yalnızca rozet / dolgu; çerçeveyi kapatmaz (checkbox kapatır)
  return { ...current, borderStyle, enabled: true };
}

export function fasikulFillRgba(
  hex: string,
  opacityPct: number,
): { r: number; g: number; b: number; a: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || "").trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
    a: Math.max(0, Math.min(100, opacityPct)) / 100,
  };
}

/** Canvas: kart dolgusu + kağıt tonu (görsel 1’deki pastel arkaplan). */
export function drawFasikulFrameFillBehind(
  ctx: CanvasRenderingContext2D,
  args: {
    x: number;
    y: number;
    w: number;
    h: number;
    frame: FasikulQuestionFrameSettings;
    padPx?: number;
  },
): void {
  if (!args.frame.enabled) return;
  const rgba = fasikulFillRgba(args.frame.fillColor, args.frame.fillOpacityPct);
  if (!rgba || rgba.a <= 0) return;
  const pad = Math.max(0, args.padPx ?? 0);
  const x = args.x - pad;
  const y = args.y - pad;
  const w = args.w + pad * 2;
  const h = args.h + pad * 2;
  const r = Math.max(0, Math.min(args.frame.cornerRadiusPx, w / 2, h / 2));

  const pathRound = () => {
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
  };

  ctx.save();
  pathRound();
  ctx.clip();
  // Kart zemini
  ctx.fillStyle = `rgba(${rgba.r},${rgba.g},${rgba.b},${rgba.a})`;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/** Görsel çizildikten sonra: beyaz alanlara pastel ton (filigran / kağıt). */
export function drawFasikulFramePaperTint(
  ctx: CanvasRenderingContext2D,
  args: {
    x: number;
    y: number;
    w: number;
    h: number;
    frame: FasikulQuestionFrameSettings;
  },
): void {
  if (!args.frame.enabled) return;
  const rgba = fasikulFillRgba(args.frame.fillColor, args.frame.fillOpacityPct);
  if (!rgba || rgba.a <= 0) return;
  const r = Math.max(0, Math.min(args.frame.cornerRadiusPx, args.w / 2, args.h / 2));
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(args.x, args.y, args.w, args.h, r);
  } else {
    ctx.rect(args.x, args.y, args.w, args.h);
  }
  ctx.clip();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = Math.max(0.12, Math.min(0.55, rgba.a * 0.45));
  ctx.fillStyle = `rgb(${rgba.r},${rgba.g},${rgba.b})`;
  ctx.fillRect(args.x, args.y, args.w, args.h);
  ctx.restore();
}

/**
 * Soru görselindeki kağıt beyazını şeffaf yapar — çerçeve dolgusu altta görünür.
 * threshold: bu değerin üstündeki griye-yakın pikseller silinir.
 * Sonuç canvas önbellekte tutulur (30+ soruda her boyamada getImageData spam’i olmasın).
 */
const knockoutCache = new WeakMap<
  CanvasImageSource,
  Map<string, HTMLCanvasElement>
>();

function knockoutCacheKey(
  tw: number,
  th: number,
  thr: number,
  fillHex: string | undefined,
): string {
  return `${tw}x${th}|${thr}|${fillHex ?? ""}`;
}

export function drawImageWithNearWhiteKnockout(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  opts?: { threshold?: number; fillHex?: string },
): void {
  const tw = Math.max(1, Math.round(dw));
  const th = Math.max(1, Math.round(dh));
  const thr = Math.max(200, Math.min(255, opts?.threshold ?? 242));
  const soft = Math.max(0, thr - 22);
  const fillHex = opts?.fillHex;
  const fillMatch = /^#?([0-9a-f]{6})$/i.exec(String(fillHex ?? "").trim());
  const fill = fillMatch
    ? {
        r: parseInt(fillMatch[1]!.slice(0, 2), 16),
        g: parseInt(fillMatch[1]!.slice(2, 4), 16),
        b: parseInt(fillMatch[1]!.slice(4, 6), 16),
      }
    : null;

  const key = knockoutCacheKey(tw, th, thr, fillHex);
  let byKey = knockoutCache.get(img);
  if (!byKey) {
    byKey = new Map();
    knockoutCache.set(img, byKey);
  }
  let off = byKey.get(key);
  if (!off) {
    off = document.createElement("canvas");
    off.width = tw;
    off.height = th;
    const o = off.getContext("2d", { willReadFrequently: true });
    if (!o) {
      ctx.drawImage(img, dx, dy, dw, dh);
      return;
    }
    o.drawImage(img, 0, 0, tw, th);
    const imageData = o.getImageData(0, 0, tw, th);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i]!;
      const g = d[i + 1]!;
      const b = d[i + 2]!;
      const minC = Math.min(r, g, b);
      const maxC = Math.max(r, g, b);
      const isPaperish = maxC - minC <= 18 && minC >= soft;
      if (!isPaperish) continue;
      if (fill) {
        if (minC >= thr) {
          d[i] = fill.r;
          d[i + 1] = fill.g;
          d[i + 2] = fill.b;
          d[i + 3] = 255;
        } else {
          const t = (thr - minC) / Math.max(1, thr - soft);
          const k = 1 - t;
          d[i] = Math.round(r * t + fill.r * k);
          d[i + 1] = Math.round(g * t + fill.g * k);
          d[i + 2] = Math.round(b * t + fill.b * k);
          d[i + 3] = 255;
        }
      } else if (minC >= thr) {
        d[i + 3] = 0;
      } else {
        const t = (thr - minC) / Math.max(1, thr - soft);
        d[i + 3] = Math.round(d[i + 3]! * t);
      }
    }
    o.putImageData(imageData, 0, 0);
    // Boyut başına en fazla birkaç varyant tut
    if (byKey.size > 8) {
      const first = byKey.keys().next().value;
      if (first != null) byKey.delete(first);
    }
    byKey.set(key, off);
  }
  ctx.drawImage(off, dx, dy, dw, dh);
}
