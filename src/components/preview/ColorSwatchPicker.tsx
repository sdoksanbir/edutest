/** Yan yana preset swatch + sonda özel renk (+) — uygulama genelinde ortak. */

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export const APP_COLOR_SWATCH_PALETTE = [
  { label: "Lacivert", color: "#0A1931" },
  { label: "Kırmızı", color: "#F34A2F" },
  { label: "Turuncu", color: "#F08C2E" },
  { label: "Mavi", color: "#2FA7D8" },
  { label: "Yeşil", color: "#1DA466" },
  { label: "Mor", color: "#A78CC4" },
  { label: "Somon", color: "#E8CBBF" },
  { label: "Sarı", color: "#F2E316" },
  { label: "Açık mavi", color: "#B7D7E6" },
] as const;

export const APP_COLOR_DEFAULT = "#0A1931";
/** Vurgu / Sınıf dolgu varsayılanı — palette 2. (accent paletinde 1.) */
export const APP_ACCENT_DEFAULT = "#F34A2F";
export const APP_TEXT_ON_FILL_DEFAULT = "#FFFFFF";

export type AppColorSwatch = { label: string; color: string };

export function normalizeHexColor(color: string, fallback = APP_COLOR_DEFAULT): string {
  const t = (color || "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t.toUpperCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(t)) {
    const r = t[1]!;
    const g = t[2]!;
    const b = t[3]!;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return fallback.toUpperCase();
}

/** Varsayılan rengi başa al; kalanlar ortak sırada. */
export function paletteWithDefaultFirst(
  defaultColor: string,
  base: readonly AppColorSwatch[] = APP_COLOR_SWATCH_PALETTE,
): AppColorSwatch[] {
  const want = normalizeHexColor(defaultColor, defaultColor);
  const match = base.find((p) => p.color.toUpperCase() === want);
  const first: AppColorSwatch = match ?? { label: "Varsayılan", color: want };
  const rest = base.filter((p) => p.color.toUpperCase() !== first.color.toUpperCase());
  return [first, ...rest];
}

export const APP_PRIMARY_PALETTE = paletteWithDefaultFirst(APP_COLOR_DEFAULT);
export const APP_ACCENT_PALETTE = paletteWithDefaultFirst(APP_ACCENT_DEFAULT);
export const APP_FILL_TEXT_PALETTE: AppColorSwatch[] = [
  { label: "Beyaz", color: APP_TEXT_ON_FILL_DEFAULT },
  ...APP_COLOR_SWATCH_PALETTE,
];

/** Bölüm başlığı — varsayılan kırmızı dolgu + beyaz yazı */
export const SECTION_DEFAULT_FILL = APP_ACCENT_DEFAULT;
export const SECTION_DEFAULT_TEXT = APP_TEXT_ON_FILL_DEFAULT;
/** Çizgi kapalı (PDF/canvas stroke yok) */
export const SECTION_LINE_NONE = "none";

/** Beyaz kağıt üzerinde okunaklı bölüm dolgu renkleri */
export const SECTION_FILL_PALETTE: AppColorSwatch[] = [
  { label: "Kırmızı", color: "#F34A2F" },
  { label: "Lacivert", color: "#0A1931" },
  { label: "Bordo", color: "#B71C1C" },
  { label: "Turuncu", color: "#E65100" },
  { label: "Yeşil", color: "#1B7A4E" },
  { label: "Mavi", color: "#1565C0" },
  { label: "Teal", color: "#00796B" },
  { label: "Mor", color: "#6A1B9A" },
  { label: "Açık kırmızı", color: "#FFCDD2" },
  { label: "Açık mavi", color: "#BBDEFB" },
  { label: "Açık yeşil", color: "#C8E6C9" },
  { label: "Krem", color: "#FFF3E0" },
  { label: "Açık gri", color: "#ECEFF1" },
];

/** Dolgu ile uyumlu yazı seçenekleri */
export const SECTION_TEXT_PALETTE: AppColorSwatch[] = [
  { label: "Beyaz", color: "#FFFFFF" },
  { label: "Lacivert", color: "#0A1931" },
  { label: "Siyah", color: "#111827" },
  { label: "Koyu gri", color: "#374151" },
  { label: "Kırmızı", color: "#F34A2F" },
];

/** Tek tıkla dolgu + yazı (beyaz kağıda uygun) */
export const SECTION_STYLE_COMBOS: readonly {
  label: string;
  fill: string;
  text: string;
}[] = [
  { label: "Kırmızı / Beyaz", fill: "#F34A2F", text: "#FFFFFF" },
  { label: "Lacivert / Beyaz", fill: "#0A1931", text: "#FFFFFF" },
  { label: "Bordo / Beyaz", fill: "#B71C1C", text: "#FFFFFF" },
  { label: "Turuncu / Beyaz", fill: "#E65100", text: "#FFFFFF" },
  { label: "Yeşil / Beyaz", fill: "#1B7A4E", text: "#FFFFFF" },
  { label: "Mavi / Beyaz", fill: "#1565C0", text: "#FFFFFF" },
  { label: "Teal / Beyaz", fill: "#00796B", text: "#FFFFFF" },
  { label: "Mor / Beyaz", fill: "#6A1B9A", text: "#FFFFFF" },
  { label: "Açık kırmızı / Lacivert", fill: "#FFCDD2", text: "#0A1931" },
  { label: "Açık mavi / Lacivert", fill: "#BBDEFB", text: "#0A1931" },
  { label: "Açık yeşil / Lacivert", fill: "#C8E6C9", text: "#0A1931" },
  { label: "Krem / Lacivert", fill: "#FFF3E0", text: "#0A1931" },
];

export function isSectionLineEnabled(lineColor?: string | null): boolean {
  const t = (lineColor || "").trim().toLowerCase();
  if (!t || t === "none" || t === "transparent" || t === "off") return false;
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(t);
}

/** Açık dolgu → koyu yazı; koyu dolgu → beyaz yazı */
export function suggestedSectionTextColor(fillHex: string): string {
  const n = normalizeHexColor(fillHex, SECTION_DEFAULT_FILL);
  const r = parseInt(n.slice(1, 3), 16);
  const g = parseInt(n.slice(3, 5), 16);
  const b = parseInt(n.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#0A1931" : "#FFFFFF";
}

const PANEL_ATTR = "data-edutest-color-panel";

function ColorSwatch({
  color,
  label,
  selected,
  onSelect,
  disabled = false,
}: {
  color: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={label}
      aria-label={label}
      disabled={disabled}
      className={`pdf-preview-color-picker__swatch ${
        selected ? "pdf-preview-color-picker__swatch--selected" : ""
      } ${disabled ? "opacity-70" : ""}`}
      style={{ backgroundColor: color }}
    />
  );
}

function ColorSwatchGrid({
  normalized,
  palette,
  customActive,
  customTitle,
  disabled,
  onSwatchSelect,
  onCustomColorChange,
  onCustomPickerOpen,
  onCustomPickerClose,
}: {
  normalized: string;
  palette: readonly { label: string; color: string }[];
  customActive: boolean;
  customTitle: string;
  disabled: boolean;
  onSwatchSelect: (c: string) => void;
  onCustomColorChange: (c: string) => void;
  onCustomPickerOpen?: () => void;
  onCustomPickerClose?: () => void;
}) {
  return (
    <div className="pdf-preview-color-picker__swatches">
      {palette.map(({ label: swatchLabel, color: swatchColor }) => (
        <ColorSwatch
          key={swatchColor}
          color={swatchColor}
          label={swatchLabel}
          selected={normalized.toLowerCase() === swatchColor.toLowerCase()}
          onSelect={() => onSwatchSelect(swatchColor)}
          disabled={disabled}
        />
      ))}
      <label
        className={`pdf-preview-color-picker__custom ${
          customActive ? "pdf-preview-color-picker__custom--active" : ""
        } ${disabled ? "pointer-events-none opacity-70" : "cursor-pointer"}`}
        title={customTitle}
      >
        <span className="pdf-preview-color-picker__plus" aria-hidden>
          +
        </span>
        <input
          type="color"
          value={normalized}
          disabled={disabled}
          onChange={(e) => onCustomColorChange(e.target.value)}
          onInput={(e) => onCustomColorChange((e.target as HTMLInputElement).value)}
          onFocus={() => onCustomPickerOpen?.()}
          onBlur={() => onCustomPickerClose?.()}
          onClick={(e) => {
            e.stopPropagation();
            onCustomPickerOpen?.();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onCustomPickerOpen?.();
          }}
          className="absolute inset-0 z-[1] h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
          aria-label={customTitle}
        />
      </label>
    </div>
  );
}

type PanelPos = { top: number; left: number };

function clampPanelToViewport(
  trigger: DOMRect,
  panelW: number,
  panelH: number,
): PanelPos {
  const gap = 6;
  const pad = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top = trigger.bottom + gap;
  if (top + panelH > vh - pad) {
    top = trigger.top - gap - panelH;
  }
  top = Math.max(pad, Math.min(top, vh - panelH - pad));

  let left = trigger.right - panelW;
  if (left < pad) left = trigger.left;
  left = Math.max(pad, Math.min(left, vw - panelW - pad));

  return { top, left };
}

function eventHitsPicker(
  e: Event,
  root: HTMLElement | null,
  panel: HTMLElement | null,
): boolean {
  const path = typeof e.composedPath === "function" ? e.composedPath() : [];
  for (const node of path) {
    if (node === root || node === panel) return true;
    if (node instanceof Element && node.hasAttribute(PANEL_ATTR)) return true;
  }
  const t = e.target;
  if (!(t instanceof Node)) return false;
  if (root?.contains(t) || panel?.contains(t)) return true;
  if (t instanceof Element && t.closest(`[${PANEL_ATTR}]`)) return true;
  return false;
}

function portalParent(): HTMLElement {
  return (
    document.querySelector<HTMLElement>(".pdf-preview-modal") || document.body
  );
}

export function ColorSwatchPicker({
  color,
  onColorChange,
  palette = APP_COLOR_SWATCH_PALETTE,
  disabled = false,
  customTitle = "Özel renk",
  className = "",
  /** inline = sürekli açık grid; popover = tek tetikleyici + panel */
  variant = "popover",
}: {
  color: string;
  onColorChange: (c: string) => void;
  palette?: readonly { label: string; color: string }[];
  disabled?: boolean;
  customTitle?: string;
  className?: string;
  variant?: "inline" | "popover";
}) {
  const normalized = normalizeHexColor(color);
  const customActive = !palette.some(
    (p) => p.color.toLowerCase() === normalized.toLowerCase(),
  );
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<PanelPos>({ top: 0, left: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  /** Native &lt;input type=color&gt; paleti açıkken dışarı tık paneli kapatmasın */
  const nativePickerOpenRef = useRef(false);
  const nativePickerCloseTimerRef = useRef<number | null>(null);
  const panelId = useId();

  const markNativePickerOpen = () => {
    if (nativePickerCloseTimerRef.current != null) {
      window.clearTimeout(nativePickerCloseTimerRef.current);
      nativePickerCloseTimerRef.current = null;
    }
    nativePickerOpenRef.current = true;
  };

  const markNativePickerClosedSoon = () => {
    if (nativePickerCloseTimerRef.current != null) {
      window.clearTimeout(nativePickerCloseTimerRef.current);
    }
    // OS/Chromium paleti tıklanınca input blur olabilir; hemen kapatma
    nativePickerCloseTimerRef.current = window.setTimeout(() => {
      nativePickerOpenRef.current = false;
      nativePickerCloseTimerRef.current = null;
    }, 400);
  };

  const updatePosition = () => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const panelW = panel?.offsetWidth || 132;
    const panelH = panel?.offsetHeight || 72;
    setPanelPos(clampPanelToViewport(rect, panelW, panelH));
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const id = requestAnimationFrame(() => updatePosition());
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) {
      nativePickerOpenRef.current = false;
      return;
    }

    const onDoc = (e: Event) => {
      if (nativePickerOpenRef.current) return;
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement &&
        active.type === "color" &&
        (panelRef.current?.contains(active) || rootRef.current?.contains(active))
      ) {
        return;
      }
      if (eventHitsPicker(e, rootRef.current, panelRef.current)) return;
      setOpen(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !nativePickerOpenRef.current) setOpen(false);
    };

    const onReposition = () => updatePosition();

    let removeDoc: (() => void) | undefined;
    const attachId = window.setTimeout(() => {
      document.addEventListener("pointerdown", onDoc);
      removeDoc = () => document.removeEventListener("pointerdown", onDoc);
    }, 0);

    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    // Chromium native renk paleti açılınca pencere blur olur
    window.addEventListener("blur", markNativePickerOpen);
    window.addEventListener("focus", markNativePickerClosedSoon);

    return () => {
      window.clearTimeout(attachId);
      if (nativePickerCloseTimerRef.current != null) {
        window.clearTimeout(nativePickerCloseTimerRef.current);
      }
      removeDoc?.();
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("blur", markNativePickerOpen);
      window.removeEventListener("focus", markNativePickerClosedSoon);
    };
  }, [open]);

  /** Hazır swatch: uygula ve paneli kapat */
  const pickSwatch = (c: string) => {
    onColorChange(c);
    if (variant === "popover") setOpen(false);
  };

  /** Native palet: canlı güncelle, paneli açık tut */
  const pickCustom = (c: string) => {
    markNativePickerOpen();
    onColorChange(c);
  };

  const gridProps = {
    normalized,
    palette,
    customActive,
    customTitle,
    disabled,
    onSwatchSelect: variant === "inline" ? onColorChange : pickSwatch,
    onCustomColorChange: variant === "inline" ? onColorChange : pickCustom,
    onCustomPickerOpen: markNativePickerOpen,
    onCustomPickerClose: markNativePickerClosedSoon,
  };

  if (variant === "inline") {
    return (
      <div
        className={`pdf-preview-color-picker ${className}`.trim()}
        role="group"
        aria-label={customTitle}
        title={customTitle}
      >
        <ColorSwatchGrid {...gridProps} />
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`pdf-preview-color-picker pdf-preview-color-picker--popover ${className}`.trim()}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className="pdf-preview-color-picker__trigger"
        style={{ backgroundColor: normalized }}
        aria-label={customTitle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        title={customTitle}
        onClick={() => setOpen((v) => !v)}
      />
      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-label={customTitle}
              data-edutest-color-panel=""
              className="pdf-preview-color-picker__panel pdf-preview-color-picker__panel--fixed"
              style={{ top: panelPos.top, left: panelPos.left }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <ColorSwatchGrid {...gridProps} />
            </div>,
            portalParent(),
          )
        : null}
    </div>
  );
}
