import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GripVertical, RotateCcw, Undo2 } from "lucide-react";
import {
  FASIKUL_BADGE_STYLES,
  FASIKUL_BORDER_COLORS,
  FASIKUL_FILL_COLORS,
  FASIKUL_FRAME_ICONS,
  FASIKUL_FRAME_PRESETS,
  FASIKUL_LABEL_COLORS,
  FASIKUL_LABEL_POSITIONS,
  DEFAULT_FASIKUL_QUESTION_FRAME,
  applyFasikulPreset,
  getFasikulFrameIcon,
  getFasikulFramePreset,
  clampBadgeOffsetForPosition,
  isSideLabelPosition,
  isTopOrBottomLabelPosition,
  normalizeLabelPosition,
  withBorderStyle,
  type FasikulBadgeStyle,
  type FasikulBorderStyle,
  type FasikulFrameApplyScope,
  type FasikulFrameIconId,
  type FasikulFramePresetId,
  type FasikulIconTextPlacement,
  type FasikulLabelPosition,
  type FasikulLabelSideTextDir,
  type FasikulQuestionFrameSettings,
} from "../../utils/fasikulQuestionFrame";

type Props = {
  open: boolean;
  anchor: { x: number; y: number };
  /** Açılan sorunun ekran dikdörtgeni — popup bunun üzerine binmez */
  avoidRect?: FrameMenuAvoidRect | null;
  /** Scroll sonrası avoid rect’i DOM’dan yenilemek için */
  avoidOrderIndex?: number | null;
  value: FasikulQuestionFrameSettings;
  onChange: (next: FasikulQuestionFrameSettings) => void;
  onClose: () => void;
  /** Hedef kapsamı ve “şimdi uygula” */
  applyScope?: FasikulFrameApplyScope;
  onApplyScopeChange?: (scope: FasikulFrameApplyScope) => void;
  targetCount?: number;
  onApplyNow?: () => void;
  selectedCount?: number;
};

const PANEL_W = 360;
const VIEW_MARGIN = 12;
const AVOID_GAP = 14;

export type FrameMenuAvoidRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

function clampPanelPos(left: number, top: number, panelW: number, panelH: number) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 800;
  const vh = typeof window !== "undefined" ? window.innerHeight : 600;
  const maxL = Math.max(VIEW_MARGIN, vw - panelW - VIEW_MARGIN);
  const maxT = Math.max(VIEW_MARGIN, vh - panelH - VIEW_MARGIN);
  return {
    left: Math.max(VIEW_MARGIN, Math.min(left, maxL)),
    top: Math.max(VIEW_MARGIN, Math.min(top, maxT)),
  };
}

function rectsOverlap(
  a: { left: number; top: number; right: number; bottom: number },
  b: FrameMenuAvoidRect,
  pad = 0,
): boolean {
  return !(
    a.right + pad <= b.left ||
    a.left - pad >= b.right ||
    a.bottom + pad <= b.top ||
    a.top - pad >= b.bottom
  );
}

function findPreviewScrollEl(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector(".pdf-preview-scroll-area");
}

/**
 * Soruyu örtmeden, ekran içinde yerleştir.
 * Gerekirse önizleme alanını dikey kaydırır.
 */
function placeAvoidingQuestion(
  avoid: FrameMenuAvoidRect | null | undefined,
  panelW: number,
  panelH: number,
  preferred?: { x: number; y: number },
): { left: number; top: number } {
  const vw = typeof window !== "undefined" ? window.innerWidth : 800;
  const vh = typeof window !== "undefined" ? window.innerHeight : 600;

  if (!avoid) {
    const x = preferred?.x ?? VIEW_MARGIN;
    const y = preferred?.y ?? VIEW_MARGIN;
    return clampPanelPos(x + 10, y - 8, panelW, panelH);
  }

  const candidates: { left: number; top: number }[] = [
    { left: avoid.right + AVOID_GAP, top: avoid.top },
    { left: avoid.left - panelW - AVOID_GAP, top: avoid.top },
    { left: Math.min(avoid.left, vw - panelW - VIEW_MARGIN), top: avoid.bottom + AVOID_GAP },
    { left: Math.min(avoid.left, vw - panelW - VIEW_MARGIN), top: avoid.top - panelH - AVOID_GAP },
    { left: avoid.right + AVOID_GAP, top: Math.max(VIEW_MARGIN, (vh - panelH) / 2) },
    { left: avoid.left - panelW - AVOID_GAP, top: Math.max(VIEW_MARGIN, (vh - panelH) / 2) },
  ];

  let best = clampPanelPos(candidates[0]!.left, candidates[0]!.top, panelW, panelH);
  let bestOverlap = Infinity;

  for (const c of candidates) {
    const p = clampPanelPos(c.left, c.top, panelW, panelH);
    const box = {
      left: p.left,
      top: p.top,
      right: p.left + panelW,
      bottom: p.top + panelH,
    };
    if (!rectsOverlap(box, avoid, 2)) {
      return p;
    }
    const ox = Math.max(
      0,
      Math.min(box.right, avoid.right) - Math.max(box.left, avoid.left),
    );
    const oy = Math.max(
      0,
      Math.min(box.bottom, avoid.bottom) - Math.max(box.top, avoid.top),
    );
    const area = ox * oy;
    if (area < bestOverlap) {
      bestOverlap = area;
      best = p;
    }
  }

  // Hâlâ örtüşüyorsa: paneli sağa/üste sabitle, soruyu dikey scroll ile kaydır
  const scrollEl = findPreviewScrollEl();
  if (scrollEl) {
    const panelBox = {
      left: best.left,
      top: best.top,
      right: best.left + panelW,
      bottom: best.top + panelH,
    };
    if (rectsOverlap(panelBox, avoid, 4)) {
      const midP = (panelBox.top + panelBox.bottom) / 2;
      const midA = (avoid.top + avoid.bottom) / 2;
      if (midA <= midP) {
        // Soru panelin üstünde/ortasında → içeriği aşağı kaydır (soru viewport’ta aşağı iner)
        const delta = panelBox.bottom + AVOID_GAP - avoid.top;
        scrollEl.scrollBy({ top: -Math.max(0, delta), behavior: "smooth" });
      } else {
        // Soru panelin altında → içeriği yukarı kaydır
        const delta = avoid.bottom + AVOID_GAP - panelBox.top;
        scrollEl.scrollBy({ top: Math.max(0, delta), behavior: "smooth" });
      }
    }
  }

  return best;
}

const BORDER_STYLES: { id: FasikulBorderStyle; label: string; preview: string }[] = [
  { id: "none", label: "Yok", preview: "border-t border-slate-300" },
  { id: "solid", label: "Düz", preview: "border-t-2 border-slate-700" },
  { id: "dashed", label: "Kesik", preview: "border-t-2 border-dashed border-slate-700" },
  { id: "dotted", label: "Noktalı", preview: "border-t-2 border-dotted border-slate-700" },
  { id: "double", label: "Çift", preview: "border-t-4 border-double border-slate-700" },
];

const SCOPE_OPTIONS: { id: FasikulFrameApplyScope; label: string }[] = [
  { id: "this", label: "Yalnızca bu soru" },
  { id: "page", label: "Bu sayfadaki tüm sorular" },
  { id: "selected", label: "Seçili sorular" },
  { id: "all", label: "Tüm sorular" },
];

function FramePresetThumb({
  presetId,
  selected,
  onSelect,
}: {
  presetId: FasikulFramePresetId;
  selected: boolean;
  onSelect: () => void;
}) {
  const preset = getFasikulFramePreset(presetId);
  if (!preset) return null;
  const icon = getFasikulFrameIcon(preset.defaultIcon)?.glyph ?? "";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col gap-1.5 rounded-lg border-2 p-2 text-left transition ${
        selected
          ? "border-orange-500 bg-orange-50/40 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div
        className="relative h-[44px] w-full overflow-hidden rounded border"
        style={{ borderColor: preset.accent + "55", background: preset.fill }}
      >
        {preset.kind === "corner-tag" && (
          <span
            className="absolute left-0 top-0 inline-flex items-center gap-0.5 rounded-br px-1.5 py-0.5 text-[8px] font-bold text-white"
            style={{ background: preset.accent }}
          >
            {icon && <span className="text-[9px] leading-none">{icon}</span>}
            {preset.defaultLabel}
          </span>
        )}
        {preset.kind === "header-bar" && (
          <div
            className="flex h-5 w-full items-center gap-1 px-1.5 text-[8px] font-bold text-white"
            style={{ background: preset.accent }}
          >
            {icon && <span className="text-[9px] leading-none">{icon}</span>}
            {preset.defaultLabel}
          </div>
        )}
        {preset.kind === "ribbon" && (
          <span
            className="absolute -right-5 top-1.5 w-16 rotate-45 py-0.5 text-center text-[7px] font-bold text-white shadow"
            style={{ background: preset.accent }}
          >
            {preset.defaultLabel}
          </span>
        )}
        {(preset.kind === "seal" ||
          preset.kind === "tab" ||
          preset.kind === "dotted" ||
          preset.kind === "double-line") && (
          <span
            className="absolute left-1 top-1 text-[8px] font-bold"
            style={{ color: preset.accent }}
          >
            {preset.defaultLabel}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium leading-tight text-slate-600">{preset.name}</span>
    </button>
  );
}

function AlignIcon({ align }: { align: "left" | "center" | "right" }) {
  if (align === "center") {
    return (
      <svg width="12" height="10" viewBox="0 0 12 10" aria-hidden>
        <path d="M2 2h8M3.5 5h5M2 8h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (align === "right") {
    return (
      <svg width="12" height="10" viewBox="0 0 12 10" aria-hidden>
        <path d="M4 2h6M6 5h4M4 8h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="12" height="10" viewBox="0 0 12 10" aria-hidden>
      <path d="M2 2h6M2 5h4M2 8h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function BadgeStyleIcon({
  styleId,
  active,
}: {
  styleId: FasikulBadgeStyle;
  active: boolean;
}) {
  const stroke = active ? "#fff" : "#64748b";
  const fill = active ? "rgba(255,255,255,0.25)" : "#e2e8f0";
  if (styleId === "folded-tab") {
    return (
      <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden>
        <path d="M1 2h11l4 5v5H1V2z" fill={fill} stroke={stroke} strokeWidth="1.2" />
        <path d="M12 2v5h4" fill="none" stroke={stroke} strokeWidth="1.2" />
      </svg>
    );
  }
  if (styleId === "angular-ribbon") {
    return (
      <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden>
        <path d="M2 3l12 0 2 4-2 4H2l2-4-2-4z" fill={fill} stroke={stroke} strokeWidth="1.2" />
      </svg>
    );
  }
  if (styleId === "reverse-angular-ribbon") {
    return (
      <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden>
        <path d="M16 3H4L2 7l2 4h12l-2-4 2-4z" fill={fill} stroke={stroke} strokeWidth="1.2" />
      </svg>
    );
  }
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden>
      <rect x="1.5" y="3" width="15" height="8" rx="2" fill={fill} stroke={stroke} strokeWidth="1.2" />
    </svg>
  );
}

function LabelPositionPicker({
  value,
  onChange,
}: {
  value: FasikulLabelPosition;
  onChange: (pos: FasikulLabelPosition) => void;
}) {
  const selected = normalizeLabelPosition(value);
  const slot = (
    id: Exclude<FasikulLabelPosition, "left" | "center" | "right">,
    className: string,
  ) => {
    const active = selected === id;
    const title = FASIKUL_LABEL_POSITIONS.find((p) => p.id === id)?.title ?? id;
    return (
      <button
        type="button"
        title={title}
        aria-label={title}
        aria-pressed={active}
        onClick={() => onChange(id)}
        className={`absolute z-10 h-4 w-4 rounded-sm border-2 transition ${className} ${
          active
            ? "border-orange-500 bg-orange-400 shadow"
            : "border-slate-400 bg-white hover:border-orange-400 hover:bg-orange-50"
        }`}
      />
    );
  };

  return (
    <div className="relative mx-auto h-[112px] w-full max-w-[220px]">
      {/* Çerçeve gövdesi */}
      <div className="absolute inset-x-7 inset-y-6 rounded-md border-2 border-slate-400 bg-slate-50" />
      {/* Üst sıra — çerçevenin dışında */}
      {slot("top-left", "left-7 top-1 -translate-x-1/2 -translate-y-1/2")}
      {slot("top-center", "left-1/2 top-1 -translate-x-1/2 -translate-y-1/2")}
      {slot("top-right", "right-7 top-1 translate-x-1/2 -translate-y-1/2")}
      {/* Sol / sağ orta — dışarıda */}
      {slot("middle-left", "left-1 top-1/2 -translate-x-1/2 -translate-y-1/2")}
      {slot("middle-right", "right-1 top-1/2 translate-x-1/2 -translate-y-1/2")}
      {/* Alt sıra */}
      {slot("bottom-left", "bottom-1 left-7 -translate-x-1/2 translate-y-1/2")}
      {slot("bottom-center", "bottom-1 left-1/2 -translate-x-1/2 translate-y-1/2")}
      {slot("bottom-right", "bottom-1 right-7 translate-x-1/2 translate-y-1/2")}
      <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[9px] font-medium text-slate-400">
        Çerçeve
      </p>
    </div>
  );
}

function badgeLayoutClass(pos: FasikulLabelPosition): string {
  switch (normalizeLabelPosition(pos)) {
    case "top-center":
      return "left-1/2 top-0 -translate-x-1/2 -translate-y-full";
    case "top-right":
      return "right-0 top-0 -translate-y-full";
    case "middle-left":
      return "left-0 top-1/2";
    case "middle-right":
      return "right-0 top-1/2";
    case "bottom-left":
      return "left-0 top-full mt-0.5";
    case "bottom-center":
      return "left-1/2 top-full mt-0.5 -translate-x-1/2";
    case "bottom-right":
      return "right-0 top-full mt-0.5";
    case "top-left":
    default:
      return "left-0 top-0 -translate-y-full";
  }
}

function sideBadgeTransform(
  pos: FasikulLabelPosition,
  dir: FasikulLabelSideTextDir,
): string {
  const p = normalizeLabelPosition(pos);
  const base =
    p === "middle-left" ? "translate(-100%, -50%)" : "translate(100%, -50%)";
  return dir === "btt" ? `${base} rotate(180deg)` : base;
}

function SectionCard({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="h-3.5 w-3.5 rounded-sm" style={{ background: accent }} aria-hidden />
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">{title}</p>
      </div>
      {children}
    </div>
  );
}

export default function FasikulQuestionFrameMenu({
  open,
  anchor,
  avoidRect,
  avoidOrderIndex,
  value,
  onChange,
  onClose,
  applyScope = "this",
  onApplyScopeChange,
  targetCount = 1,
  onApplyNow,
  selectedCount = 0,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    origLeft: number;
    origTop: number;
  } | null>(null);
  const userMovedRef = useRef(false);
  const [history, setHistory] = useState<FasikulQuestionFrameSettings[]>([value]);
  const [pos, setPos] = useState({ left: VIEW_MARGIN, top: VIEW_MARGIN });

  const clampCurrent = useCallback((left: number, top: number) => {
    const w = panelRef.current?.offsetWidth ?? PANEL_W;
    const h = panelRef.current?.offsetHeight ?? 480;
    return clampPanelPos(left, top, w, h);
  }, []);

  const readAvoidFromDom = useCallback((): FrameMenuAvoidRect | null => {
    if (avoidOrderIndex == null) return avoidRect ?? null;
    const el = document.querySelector(
      `[data-question-hit][data-question-order="${avoidOrderIndex}"]`,
    );
    if (!el) return avoidRect ?? null;
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  }, [avoidOrderIndex, avoidRect]);

  const placeOpen = useCallback(() => {
    const w = panelRef.current?.offsetWidth ?? PANEL_W;
    const h = panelRef.current?.offsetHeight ?? 480;
    const avoid = readAvoidFromDom() ?? avoidRect ?? null;
    setPos(placeAvoidingQuestion(avoid, w, h, anchor));
  }, [anchor, avoidRect, readAvoidFromDom]);

  useEffect(() => {
    if (!open) {
      userMovedRef.current = false;
      return;
    }
    setHistory([value]);
    placeOpen();
    const t1 = window.setTimeout(placeOpen, 50);
    const t2 = window.setTimeout(placeOpen, 320);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- sadece açılışta hizala

  useEffect(() => {
    if (!open || userMovedRef.current) return;
    const id = requestAnimationFrame(() => placeOpen());
    return () => cancelAnimationFrame(id);
  }, [open, value.enabled, value.borderStyle, value.presetId, placeOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-fasikul-frame-menu]")) return;
      if (t.closest("[data-fasikul-frame-trigger]")) return;
      onClose();
    };
    const onResize = () => setPos((p) => clampCurrent(p.left, p.top));
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", onResize);
    };
  }, [open, onClose, clampCurrent]);

  const onDragHandlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest("input, button, label, select, a")) return;
      e.preventDefault();
      e.stopPropagation();
      userMovedRef.current = true;
      dragRef.current = {
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        origLeft: pos.left,
        origTop: pos.top,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pos.left, pos.top],
  );

  const onDragHandlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      e.preventDefault();
      const dx = e.clientX - d.startClientX;
      const dy = e.clientY - d.startClientY;
      setPos(clampCurrent(d.origLeft + dx, d.origTop + dy));
    },
    [clampCurrent],
  );

  const onDragHandlePointerUp = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  }, []);

  const push = (next: FasikulQuestionFrameSettings) => {
    setHistory((h) => [...h.slice(-20), next]);
    onChange(next);
  };

  const undo = () => {
    if (history.length < 2) return;
    const prev = history[history.length - 2]!;
    setHistory((h) => h.slice(0, -1));
    onChange(prev);
  };

  const resetOriginal = () => {
    push({ ...DEFAULT_FASIKUL_QUESTION_FRAME, enabled: false });
  };

  const selectedPreset = useMemo(
    () => getFasikulFramePreset(value.presetId),
    [value.presetId],
  );

  const scopeOptions = SCOPE_OPTIONS;

  if (!open) return null;

  return createPortal(
    <div
      ref={panelRef}
      data-fasikul-frame-menu
      className="fixed z-[80] flex max-h-[min(92vh,760px)] w-[min(94vw,360px)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
      style={{ left: pos.left, top: pos.top }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="flex cursor-grab select-none items-center gap-2 border-b border-slate-100 bg-slate-50/90 px-3 py-2.5 active:cursor-grabbing touch-none"
        title="Sürükleyerek taşı"
        onPointerDown={onDragHandlePointerDown}
        onPointerMove={onDragHandlePointerMove}
        onPointerUp={onDragHandlePointerUp}
        onPointerCancel={onDragHandlePointerUp}
      >
        <GripVertical className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => {
              if (e.target.checked) {
                push({
                  ...value,
                  enabled: true,
                  borderStyle: value.borderStyle === "none" ? "solid" : value.borderStyle,
                });
              } else {
                push({ ...value, enabled: false });
              }
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-slate-300 accent-orange-500"
          />
          Soru Çerçevesi
        </label>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        <div className="space-y-1.5">
          <p className="text-[12px] font-semibold text-slate-700">
            Çerçeve hangi sorulara uygulansın?
          </p>
          <select
            value={applyScope}
            onChange={(e) =>
              onApplyScopeChange?.(e.target.value as FasikulFrameApplyScope)
            }
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] font-medium text-slate-700 outline-none focus:border-blue-400"
          >
            {scopeOptions.map((o) => (
              <option key={o.id} value={o.id} disabled={o.id === "selected" && selectedCount < 2}>
                {o.label}
                {o.id === "selected" && selectedCount > 0 ? ` (${selectedCount})` : ""}
              </option>
            ))}
          </select>
          <p className="text-[11px] font-medium text-blue-600">
            {targetCount} soru hedefleniyor
            {applyScope === "selected" && selectedCount < 2
              ? " — önce Shift/Ctrl ile birden fazla soru seçin"
              : ""}
          </p>
          <button
            type="button"
            onClick={() => onApplyNow?.()}
            className="w-full rounded-lg bg-orange-500 px-3 py-2.5 text-[12px] font-bold text-white shadow-sm transition hover:bg-orange-600"
          >
            Mevcut çerçeveyi şimdi uygula
          </button>
        </div>

        <div className="grid grid-cols-5 gap-1">
          {BORDER_STYLES.map((s) => {
            const selected = value.borderStyle === s.id;
            return (
              <button
                key={s.id}
                type="button"
                title={s.label}
                onClick={() => push(withBorderStyle(value, s.id))}
                className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 transition ${
                  selected
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                <span className={`mt-1 block w-7 ${s.preview}`} aria-hidden />
                <span className="text-[9px] font-semibold">{s.label}</span>
              </button>
            );
          })}
        </div>

        <SectionCard title="Kenarlık" accent="#f97316">
          <p className="mb-1 text-[10px] font-semibold text-slate-500">Kalınlık</p>
          <div className="mb-2 flex gap-1.5">
            {([1, 2, 3, 4] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => push({ ...value, borderWidth: n, enabled: true })}
                className={`h-7 w-8 rounded-md border text-[11px] font-bold transition ${
                  value.borderWidth === n
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mb-1 text-[10px] font-semibold text-slate-500">Renk</p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {FASIKUL_BORDER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() =>
                  push({ ...value, borderColor: c, labelColor: c, enabled: true })
                }
                className={`h-6 w-6 rounded-md border-2 ${
                  value.borderColor.toLowerCase() === c.toLowerCase()
                    ? "border-slate-500"
                    : "border-transparent"
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold text-slate-500">Köşeler</p>
            <span className="text-[10px] font-bold text-orange-600">
              {value.cornerRadiusPx}px
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={24}
            value={value.cornerRadiusPx}
            onChange={(e) =>
              push({
                ...value,
                cornerRadiusPx: Number(e.target.value),
                enabled: true,
              })
            }
            className="mt-1 w-full"
            style={{ accentColor: "#f97316" }}
          />
        </SectionCard>

        <SectionCard title="Arkaplan" accent="#93c5fd">
          <p className="mb-1 text-[10px] font-semibold text-slate-500">Dolgu Rengi</p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {FASIKUL_FILL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => push({ ...value, fillColor: c, enabled: true })}
                className={`h-6 w-6 rounded-md border-2 ${
                  value.fillColor.toLowerCase() === c.toLowerCase()
                    ? "border-slate-500"
                    : "border-slate-200"
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold text-slate-500">Opaklık</p>
            <span className="text-[10px] font-bold text-blue-600">
              {value.fillOpacityPct}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={value.fillOpacityPct}
            onChange={(e) =>
              push({
                ...value,
                fillOpacityPct: Number(e.target.value),
                enabled: true,
              })
            }
            className="mt-1 w-full"
            style={{ accentColor: "#3b82f6" }}
          />
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold text-slate-500">İç boşluk</p>
            <span className="text-[10px] font-bold text-teal-700">
              {value.innerPaddingPx ?? 0}px
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={40}
            value={value.innerPaddingPx ?? 0}
            onChange={(e) =>
              push({
                ...value,
                innerPaddingPx: Number(e.target.value),
                enabled: true,
              })
            }
            className="mb-3 w-full"
            style={{ accentColor: "#0f766e" }}
          />
          <p className="mb-1 text-[10px] text-slate-400">
            Çerçeve kenarı ile soru görseli arası boşluk
          </p>
        </SectionCard>

        <SectionCard title="Başlık" accent="#fb923c">
          <p className="mb-1 text-[10px] font-semibold text-slate-500">Başlık</p>
          <input
            type="text"
            value={value.labelText}
            maxLength={40}
            onChange={(e) =>
              push({ ...value, labelText: e.target.value, enabled: true })
            }
            className="mb-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[12px] font-semibold uppercase text-slate-800 outline-none focus:border-blue-400"
          />
          <div className="mb-2 grid grid-cols-2 gap-1.5">
            {FASIKUL_BADGE_STYLES.map((s) => {
              const selected = value.badgeStyle === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    push({
                      ...value,
                      badgeStyle: s.id,
                      enabled: true,
                    })
                  }
                  className={`flex items-center gap-2 rounded-lg border px-2 py-2 text-left text-[11px] font-semibold transition ${
                    selected
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <BadgeStyleIcon styleId={s.id} active={selected} />
                  {s.name}
                </button>
              );
            })}
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold text-slate-500">Renk:</span>
            <button
              type="button"
              onClick={() =>
                push({
                  ...value,
                  labelColor: value.borderColor || DEFAULT_FASIKUL_QUESTION_FRAME.labelColor,
                  enabled: true,
                })
              }
              className="rounded-md border border-blue-500 px-2 py-1 text-[10px] font-bold text-blue-600"
            >
              Tema
            </button>
            {FASIKUL_LABEL_COLORS.slice(0, 6).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() =>
                  push({
                    ...value,
                    labelColor: c,
                    borderColor: c,
                    enabled: true,
                  })
                }
                className={`h-6 w-6 rounded-md border-2 ${
                  value.labelColor.toLowerCase() === c.toLowerCase()
                    ? "border-slate-600"
                    : "border-transparent"
                }`}
                style={{ background: c }}
              />
            ))}
            <div className="ml-auto flex gap-1">
              {(
                [
                  ["left", "Sol"],
                  ["center", "Orta"],
                  ["right", "Sağ"],
                ] as const
              ).map(([id, title]) => {
                const selected = (value.labelAlign ?? "left") === id;
                return (
                  <button
                    key={id}
                    type="button"
                    title={title}
                    onClick={() =>
                      push({ ...value, labelAlign: id, enabled: true })
                    }
                    className={`flex h-7 w-7 items-center justify-center rounded-md border text-[10px] font-bold ${
                      selected
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                    }`}
                  >
                    <AlignIcon align={id} />
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mb-1 text-[10px] font-semibold text-slate-500">İkon</p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {FASIKUL_FRAME_ICONS.map((ic) => {
              const selected = value.iconId === ic.id;
              return (
                <button
                  key={ic.id}
                  type="button"
                  title={ic.label}
                  onClick={() => push({ ...value, iconId: ic.id, enabled: true })}
                  className={`flex h-8 w-8 items-center justify-center rounded-md border text-sm transition ${
                    selected
                      ? "border-violet-500 bg-violet-50 ring-1 ring-violet-300"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span aria-hidden>{ic.glyph}</span>
                </button>
              );
            })}
          </div>
          <div className="mb-2 grid grid-cols-2 gap-2">
            {(
              [
                ["before", "Metnin Başına"],
                ["after", "Metnin Sonuna"],
              ] as const
            ).map(([id, label]) => {
              const selected = value.iconTextPlacement === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    push({
                      ...value,
                      iconTextPlacement: id as FasikulIconTextPlacement,
                      enabled: true,
                    })
                  }
                  className={`rounded-lg border px-2 py-2 text-[11px] font-semibold transition ${
                    selected
                      ? "border-violet-500 text-violet-700"
                      : "border-slate-200 text-slate-500"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="mb-1 text-[10px] font-semibold text-slate-500">
            Konum (çerçeve dışı)
          </p>
          <div className="mb-2 rounded-lg border border-slate-200 bg-white p-2">
            <LabelPositionPicker
              value={value.labelPosition}
              onChange={(pos) => {
                const clamped = clampBadgeOffsetForPosition(
                  pos,
                  value.badgeOffsetX ?? 0,
                  value.badgeOffsetY ?? 0,
                );
                push({
                  ...value,
                  labelPosition: pos,
                  ...clamped,
                  enabled: true,
                });
              }}
            />
          </div>
          <p className="mb-1 text-[10px] font-semibold text-slate-500">
            Kutu kaydır (ince ayar)
            {isTopOrBottomLabelPosition(value.labelPosition)
              ? " — sağa / sola"
              : " — yukarı / aşağı"}
          </p>
          {isTopOrBottomLabelPosition(value.labelPosition) ? (
            <div className="mb-2 flex items-center gap-1">
              <button
                type="button"
                title="Sola"
                onClick={() =>
                  push({
                    ...value,
                    badgeOffsetX: Math.max(-80, (value.badgeOffsetX ?? 0) - 2),
                    badgeOffsetY: 0,
                    enabled: true,
                  })
                }
                className="flex-1 rounded-md border border-slate-200 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
              >
                ←
              </button>
              <button
                type="button"
                title="Sıfırla"
                onClick={() =>
                  push({
                    ...value,
                    badgeOffsetX: 0,
                    badgeOffsetY: 0,
                    enabled: true,
                  })
                }
                className="rounded-md border border-slate-200 px-2 py-1.5 text-[9px] font-semibold text-slate-500 hover:bg-slate-50"
              >
                {value.badgeOffsetX ?? 0}
              </button>
              <button
                type="button"
                title="Sağa"
                onClick={() =>
                  push({
                    ...value,
                    badgeOffsetX: Math.min(80, (value.badgeOffsetX ?? 0) + 2),
                    badgeOffsetY: 0,
                    enabled: true,
                  })
                }
                className="flex-1 rounded-md border border-slate-200 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
              >
                →
              </button>
            </div>
          ) : (
            <div className="mb-2 flex flex-col items-stretch gap-1">
              <button
                type="button"
                title="Yukarı"
                onClick={() =>
                  push({
                    ...value,
                    badgeOffsetX: 0,
                    badgeOffsetY: Math.max(-80, (value.badgeOffsetY ?? 0) - 2),
                    enabled: true,
                  })
                }
                className="rounded-md border border-slate-200 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
              >
                ↑
              </button>
              <button
                type="button"
                title="Sıfırla"
                onClick={() =>
                  push({
                    ...value,
                    badgeOffsetX: 0,
                    badgeOffsetY: 0,
                    enabled: true,
                  })
                }
                className="rounded-md border border-slate-200 px-2 py-1 text-[9px] font-semibold text-slate-500 hover:bg-slate-50"
              >
                {value.badgeOffsetY ?? 0}
              </button>
              <button
                type="button"
                title="Aşağı"
                onClick={() =>
                  push({
                    ...value,
                    badgeOffsetX: 0,
                    badgeOffsetY: Math.min(80, (value.badgeOffsetY ?? 0) + 2),
                    enabled: true,
                  })
                }
                className="rounded-md border border-slate-200 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
              >
                ↓
              </button>
            </div>
          )}
          <div className="mb-2">
            {isTopOrBottomLabelPosition(value.labelPosition) ? (
              <label className="text-[10px] text-slate-500">
                Yatay
                <input
                  type="range"
                  min={-80}
                  max={80}
                  value={value.badgeOffsetX ?? 0}
                  onChange={(e) =>
                    push({
                      ...value,
                      badgeOffsetX: Number(e.target.value),
                      badgeOffsetY: 0,
                      enabled: true,
                    })
                  }
                  className="mt-0.5 w-full"
                  style={{ accentColor: "#7c3aed" }}
                />
              </label>
            ) : (
              <label className="text-[10px] text-slate-500">
                Dikey
                <input
                  type="range"
                  min={-80}
                  max={80}
                  value={value.badgeOffsetY ?? 0}
                  onChange={(e) =>
                    push({
                      ...value,
                      badgeOffsetX: 0,
                      badgeOffsetY: Number(e.target.value),
                      enabled: true,
                    })
                  }
                  className="mt-0.5 w-full"
                  style={{ accentColor: "#7c3aed" }}
                />
              </label>
            )}
          </div>
          {isSideLabelPosition(value.labelPosition) && (
            <div className="mb-2 grid grid-cols-2 gap-2">
              {(
                [
                  ["ttb", "Yukarı → Aşağı"],
                  ["btt", "Aşağı → Yukarı"],
                ] as const
              ).map(([id, label]) => {
                const selected = (value.labelSideTextDir ?? "ttb") === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      push({
                        ...value,
                        labelSideTextDir: id as FasikulLabelSideTextDir,
                        enabled: true,
                      })
                    }
                    className={`rounded-lg border px-2 py-2 text-[11px] font-semibold transition ${
                      selected
                        ? "border-violet-500 text-violet-700"
                        : "border-slate-200 text-slate-500"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </SectionCard>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Hazır Tasarımlar
          </p>
          <div className="grid grid-cols-2 gap-2">
            {FASIKUL_FRAME_PRESETS.map((p) => (
              <FramePresetThumb
                key={p.id}
                presetId={p.id}
                selected={value.enabled && value.presetId === p.id}
                onSelect={() => push(applyFasikulPreset(value, p.id))}
              />
            ))}
          </div>
          {selectedPreset && (
            <p className="mt-1.5 text-[10px] text-slate-400">
              Seçili hazır tasarım: {selectedPreset.name}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3">
        <button
          type="button"
          onClick={undo}
          disabled={history.length < 2}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
        >
          <Undo2 className="h-3.5 w-3.5" />
          Geri Al
        </button>
        <button
          type="button"
          onClick={resetOriginal}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Orijinale Dön
        </button>
      </div>
    </div>,
    document.body,
  );
}

/** Soru kutusu üzerinde çerçeve önizlemesi — rozet çerçevenin dışında. */
export function FasikulFramePreviewChrome({
  settings,
}: {
  settings: FasikulQuestionFrameSettings;
}) {
  if (!settings.enabled) return null;
  const preset = getFasikulFramePreset(settings.presetId);
  const icon =
    settings.iconId !== "none"
      ? getFasikulFrameIcon(settings.iconId as FasikulFrameIconId)?.glyph ?? ""
      : "";
  const text = (settings.labelText || preset?.defaultLabel || "KURAL").trim();
  const label =
    settings.iconTextPlacement === "before"
      ? `${icon ? `${icon} ` : ""}${text}`
      : `${text}${icon ? ` ${icon}` : ""}`;
  const accent = settings.labelColor || settings.borderColor;
  const pos = normalizeLabelPosition(settings.labelPosition);
  const side = isSideLabelPosition(pos);
  const sideDir = settings.labelSideTextDir === "btt" ? "btt" : "ttb";
  const badgeOffsets = clampBadgeOffsetForPosition(
    pos,
    settings.badgeOffsetX ?? 0,
    settings.badgeOffsetY ?? 0,
  );
  const badgeStyle = settings.badgeStyle || "folded-tab";
  const align = settings.labelAlign ?? "left";
  const borderCss =
    settings.borderStyle === "none"
      ? "none"
      : settings.borderStyle === "double"
        ? `${Math.max(3, settings.borderWidth + 1)}px double ${settings.borderColor}`
        : `${settings.borderWidth}px ${settings.borderStyle} ${settings.borderColor}`;

  const alignClass =
    align === "center" ? "justify-center text-center" : align === "right" ? "justify-end text-right" : "justify-start text-left";

  const badgeShapeClass =
    badgeStyle === "classic"
      ? "rounded-md px-2 py-0.5"
      : badgeStyle === "folded-tab"
        ? "rounded-tl-md rounded-bl-md pl-2 pr-3 py-0.5"
        : badgeStyle === "angular-ribbon"
          ? "px-3 py-0.5"
          : "px-3 py-0.5";

  const badgeClip =
    badgeStyle === "folded-tab"
      ? "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)"
      : badgeStyle === "angular-ribbon"
        ? "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)"
        : badgeStyle === "reverse-angular-ribbon"
          ? "polygon(0 0, calc(100% - 8px) 0, 100% 100%, 8px 100%)"
          : undefined;

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-visible" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          border: borderCss,
          borderRadius: settings.cornerRadiusPx,
          background: "transparent",
        }}
      />
      <span
        className={`absolute z-10 ${badgeLayoutClass(pos)}`}
        style={
          side
            ? {
                writingMode: "vertical-rl" as const,
                textOrientation: "mixed" as const,
                transform: sideBadgeTransform(pos, sideDir),
              }
            : undefined
        }
      >
        <span
          className={`inline-flex items-center gap-0.5 whitespace-nowrap text-[9px] font-bold uppercase tracking-wide text-white shadow-sm ${badgeShapeClass} ${alignClass}`}
          style={{
            background: accent,
            clipPath: badgeClip,
            transform: `translate(${badgeOffsets.badgeOffsetX}px, ${badgeOffsets.badgeOffsetY}px)`,
          }}
        >
          {label}
        </span>
      </span>
    </div>
  );
}
