/**
 * Fasikül — soru çerçevesi / etiket ayarları.
 * Önizleme overlay + taslakta QuestionItem.fasikulFrame olarak saklanır.
 */

export type FasikulFramePresetId =
  | "none"
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

/** Başlık rozeti şekli (görsel 2) */
export type FasikulBadgeStyle =
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
};

export const FASIKUL_BADGE_STYLES: {
  id: FasikulBadgeStyle;
  name: string;
}[] = [
  { id: "classic", name: "Klasik" },
  { id: "folded-tab", name: "Katlı sekme" },
  { id: "angular-ribbon", name: "Köşeli şerit" },
  { id: "reverse-angular-ribbon", name: "Ters köşeli şerit" },
];

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
  kind: "corner-tag" | "header-bar" | "ribbon" | "seal" | "tab" | "dotted" | "double-line";
  defaultIcon: FasikulFrameIconId;
  borderStyle?: FasikulBorderStyle;
};

export const FASIKUL_FRAME_PRESETS: FasikulFramePresetDef[] = [
  {
    id: "classic-label",
    name: "Klasik Etiket",
    defaultLabel: "SORU",
    accent: "#6d28d9",
    fill: "#ede9fe",
    kind: "corner-tag",
    defaultIcon: "pin",
    borderStyle: "solid",
  },
  {
    id: "green-label",
    name: "Yeşil Etiket",
    defaultLabel: "SORU",
    accent: "#15803d",
    fill: "#dcfce7",
    kind: "corner-tag",
    defaultIcon: "check",
    borderStyle: "solid",
  },
  {
    id: "warning-label",
    name: "Uyarı Etiketi",
    defaultLabel: "UYARI",
    accent: "#ea580c",
    fill: "#ffedd5",
    kind: "corner-tag",
    defaultIcon: "warning",
    borderStyle: "solid",
  },
  {
    id: "navy-header",
    name: "Lacivert Başlık Çubuğu",
    defaultLabel: "SORU",
    accent: "#1e3a5f",
    fill: "#ffffff",
    kind: "header-bar",
    defaultIcon: "star",
    borderStyle: "solid",
  },
  {
    id: "burgundy-header",
    name: "Bordo Başlık Çubuğu",
    defaultLabel: "ETKİNLİK",
    accent: "#9f1239",
    fill: "#ffffff",
    kind: "header-bar",
    defaultIcon: "notepad",
    borderStyle: "solid",
  },
  {
    id: "turquoise-header",
    name: "Turkuaz Başlık Çubuğu",
    defaultLabel: "İNCELE",
    accent: "#0f766e",
    fill: "#ffffff",
    kind: "header-bar",
    defaultIcon: "target",
    borderStyle: "solid",
  },
  {
    id: "red-ribbon",
    name: "Kırmızı Köşe Şeridi",
    defaultLabel: "YENİ",
    accent: "#dc2626",
    fill: "#ffffff",
    kind: "ribbon",
    defaultIcon: "none",
    borderStyle: "solid",
  },
  {
    id: "gold-ribbon",
    name: "Altın Köşe Şeridi",
    defaultLabel: "ÖNEMLİ",
    accent: "#d97706",
    fill: "#ffffff",
    kind: "ribbon",
    defaultIcon: "none",
    borderStyle: "solid",
  },
  {
    id: "seal-badge",
    name: "Mühür Rozet",
    defaultLabel: "1",
    accent: "#2563eb",
    fill: "#dbeafe",
    kind: "seal",
    defaultIcon: "none",
    borderStyle: "solid",
  },
  {
    id: "seal-badge-pink",
    name: "Mühür Rozet (Pembe)",
    defaultLabel: "★",
    accent: "#db2777",
    fill: "#fce7f3",
    kind: "seal",
    defaultIcon: "star",
    borderStyle: "solid",
  },
  {
    id: "tab-label",
    name: "Sekme Etiketi",
    defaultLabel: "SORU",
    accent: "#475569",
    fill: "#ffffff",
    kind: "tab",
    defaultIcon: "none",
    borderStyle: "solid",
  },
  {
    id: "dotted-separator",
    name: "Noktalı Ayraç",
    defaultLabel: "SORU",
    accent: "#64748b",
    fill: "#ffffff",
    kind: "dotted",
    defaultIcon: "none",
    borderStyle: "dotted",
  },
  {
    id: "classic-double-line",
    name: "Klasik Çift Çizgi",
    defaultLabel: "SORU",
    accent: "#0f172a",
    fill: "#ffffff",
    kind: "double-line",
    defaultIcon: "none",
    borderStyle: "double",
  },
];

export const DEFAULT_FASIKUL_QUESTION_FRAME: FasikulQuestionFrameSettings = {
  enabled: false,
  presetId: "classic-label",
  iconId: "none",
  iconTextPlacement: "before",
  labelPosition: "top-left",
  labelSideTextDir: "ttb",
  badgeStyle: "folded-tab",
  labelAlign: "left",
  labelColor: "#0f766e",
  labelText: "KURAL",
  borderStyle: "solid",
  borderWidth: 2,
  borderColor: "#0f766e",
  cornerRadiusPx: 12,
  fillColor: "#e8f4f4",
  fillOpacityPct: 100,
  innerPaddingPx: 8,
  badgeOffsetX: 0,
  badgeOffsetY: 0,
};

function isHex(c: unknown): c is string {
  return typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c);
}

export function getFasikulFramePreset(
  id: FasikulFramePresetId,
): FasikulFramePresetDef | undefined {
  return FASIKUL_FRAME_PRESETS.find((p) => p.id === id);
}

export function getFasikulFrameIcon(id: FasikulFrameIconId) {
  return FASIKUL_FRAME_ICONS.find((i) => i.id === id);
}

/** Çerçeve açıkken soru numarası çizilmez. */
export function fasikulFrameHidesQuestionNumber(
  frame: FasikulQuestionFrameSettings | null | undefined,
): boolean {
  return Boolean(frame?.enabled);
}

export function normalizeFasikulQuestionFrame(
  raw: unknown,
): FasikulQuestionFrameSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_FASIKUL_QUESTION_FRAME };
  const o = raw as Partial<FasikulQuestionFrameSettings>;
  const presetOk = FASIKUL_FRAME_PRESETS.some((p) => p.id === o.presetId) || o.presetId === "none";
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
    presetId: presetOk
      ? (o.presetId as FasikulFramePresetId)
      : DEFAULT_FASIKUL_QUESTION_FRAME.presetId,
    iconId: iconOk ? (o.iconId as FasikulFrameIconId) : DEFAULT_FASIKUL_QUESTION_FRAME.iconId,
    iconTextPlacement: o.iconTextPlacement === "after" ? "after" : "before",
    labelPosition,
    labelSideTextDir: o.labelSideTextDir === "btt" ? "btt" : "ttb",
    badgeStyle: FASIKUL_BADGE_STYLES.some((s) => s.id === o.badgeStyle)
      ? (o.badgeStyle as FasikulBadgeStyle)
      : DEFAULT_FASIKUL_QUESTION_FRAME.badgeStyle,
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
      ? Math.max(0, Math.min(24, Math.round(corner)))
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
  };
}

export function applyFasikulPreset(
  current: FasikulQuestionFrameSettings,
  presetId: FasikulFramePresetId,
): FasikulQuestionFrameSettings {
  const preset = getFasikulFramePreset(presetId);
  if (!preset) return { ...current, enabled: true, presetId };
  return {
    ...current,
    enabled: true,
    presetId,
    iconId: preset.defaultIcon,
    labelText: preset.defaultLabel,
    labelColor: preset.accent,
    borderColor: preset.accent,
    fillColor: preset.fill,
    borderStyle: preset.borderStyle ?? "solid",
  };
}

export function withBorderStyle(
  current: FasikulQuestionFrameSettings,
  borderStyle: FasikulBorderStyle,
): FasikulQuestionFrameSettings {
  if (borderStyle === "none") {
    return { ...current, borderStyle, enabled: false };
  }
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
  if (!rgba) return;
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
