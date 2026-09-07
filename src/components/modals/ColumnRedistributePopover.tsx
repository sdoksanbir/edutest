import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

export type ColumnRedistributeMode = "equal" | "anchored";

const PANEL_W = 340;
const VIEW_MARGIN = 12;

function getBoundsRect(boundsRef?: RefObject<HTMLElement | null>): DOMRect | null {
  return boundsRef?.current?.getBoundingClientRect() ?? null;
}

function clampPanelPosition(
  left: number,
  top: number,
  panelW: number,
  panelH: number,
  bounds: DOMRect | null
): { left: number; top: number } {
  if (!bounds) {
    const vw = typeof window !== "undefined" ? window.innerWidth : 800;
    const vh = typeof window !== "undefined" ? window.innerHeight : 600;
    const maxL = Math.max(VIEW_MARGIN, vw - panelW - VIEW_MARGIN);
    const maxT = Math.max(VIEW_MARGIN, vh - panelH - VIEW_MARGIN);
    return {
      left: Math.max(VIEW_MARGIN, Math.min(left, maxL)),
      top: Math.max(VIEW_MARGIN, Math.min(top, maxT)),
    };
  }

  const minL = bounds.left + VIEW_MARGIN;
  const minT = bounds.top + VIEW_MARGIN;
  const maxL = bounds.right - panelW - VIEW_MARGIN;
  const maxT = bounds.bottom - panelH - VIEW_MARGIN;

  return {
    left: Math.min(Math.max(left, minL), Math.max(minL, maxL)),
    top: Math.min(Math.max(top, minT), Math.max(minT, maxT)),
  };
}

function placeNearAnchor(
  anchorX: number,
  anchorY: number,
  panelW: number,
  panelH: number,
  bounds: DOMRect | null
): { left: number; top: number } {
  const offset = 12;
  let left = anchorX + offset;
  let top = anchorY + offset;

  if (bounds) {
    if (left + panelW > bounds.right - VIEW_MARGIN) {
      left = anchorX - panelW - offset;
    }
    if (top + panelH > bounds.bottom - VIEW_MARGIN) {
      top = anchorY - panelH - offset;
    }
  }

  const clamped = clampPanelPosition(left, top, panelW, panelH, bounds);

  if (bounds) {
    const fits =
      clamped.left >= bounds.left + VIEW_MARGIN - 0.5 &&
      clamped.top >= bounds.top + VIEW_MARGIN - 0.5 &&
      clamped.left + panelW <= bounds.right - VIEW_MARGIN + 0.5 &&
      clamped.top + panelH <= bounds.bottom - VIEW_MARGIN + 0.5;
    if (!fits) {
      return clampPanelPosition(
        bounds.left + (bounds.width - panelW) / 2,
        bounds.top + (bounds.height - panelH) / 2,
        panelW,
        panelH,
        bounds
      );
    }
  }

  return clamped;
}

type ColumnRedistributePopoverProps = {
  open: boolean;
  anchor: { x: number; y: number };
  /** Popover bu alanın görünür sınırları içinde kalır (önizleme kaydırma alanı). */
  boundsRef?: RefObject<HTMLElement | null>;
  displayColumnNumber: number;
  mode: ColumnRedistributeMode;
  onModeChange: (m: ColumnRedistributeMode) => void;
  bottomGapMmInput: string;
  onBottomGapMmChange: (v: string) => void;
  anchoredDisabled: boolean;
  equalDisabled: boolean;
  inlineError: string | null;
  onPreview: () => void;
  onApply: () => void;
  onCancel: () => void;
  onReset: () => void;
};

export default function ColumnRedistributePopover({
  open,
  anchor,
  boundsRef,
  displayColumnNumber,
  mode,
  onModeChange,
  bottomGapMmInput,
  onBottomGapMmChange,
  anchoredDisabled,
  equalDisabled,
  inlineError,
  onPreview,
  onApply,
  onCancel,
  onReset,
}: ColumnRedistributePopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    origLeft: number;
    origTop: number;
  } | null>(null);
  const [pos, setPos] = useState({ left: VIEW_MARGIN, top: VIEW_MARGIN });

  const clampCurrentPosition = useCallback(
    (left: number, top: number) => {
      const h = panelRef.current?.offsetHeight ?? 420;
      const bounds = getBoundsRect(boundsRef);
      return clampPanelPosition(left, top, PANEL_W, h, bounds);
    },
    [boundsRef]
  );

  const placeFromAnchor = useCallback(() => {
    const bounds = getBoundsRect(boundsRef);
    const estH = panelRef.current?.offsetHeight ?? 420;
    setPos(placeNearAnchor(anchor.x, anchor.y, PANEL_W, estH, bounds));
  }, [anchor.x, anchor.y, boundsRef]);

  useLayoutEffect(() => {
    if (!open) return;
    placeFromAnchor();
  }, [open, anchor.x, anchor.y, placeFromAnchor]);

  useLayoutEffect(() => {
    if (!open) return;
    const h = panelRef.current?.offsetHeight;
    if (!h) return;
    setPos((p) => clampCurrentPosition(p.left, p.top));
  }, [open, clampCurrentPosition, inlineError, mode, bottomGapMmInput]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => {
      setPos((p) => clampCurrentPosition(p.left, p.top));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, clampCurrentPosition]);

  useEffect(() => {
    if (!open || !boundsRef?.current) return;
    const el = boundsRef.current;
    const onScroll = () => {
      setPos((p) => clampCurrentPosition(p.left, p.top));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [open, boundsRef, clampCurrentPosition]);

  const onDragHandlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragRef.current = {
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        origLeft: pos.left,
        origTop: pos.top,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pos.left, pos.top]
  );

  const onDragHandlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      const dx = e.clientX - d.startClientX;
      const dy = e.clientY - d.startClientY;
      setPos(clampCurrentPosition(d.origLeft + dx, d.origTop + dy));
    },
    [clampCurrentPosition]
  );

  const onDragHandlePointerUp = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* capture already released */
    }
  }, []);

  if (!open) return null;

  const panel = (
    <div
      ref={panelRef}
      className="fixed z-[60] w-[340px] overflow-hidden rounded-xl border border-slate-600 bg-slate-900 text-slate-100 shadow-2xl"
      style={{ left: pos.left, top: pos.top }}
      role="dialog"
      aria-labelledby="col-redist-title"
    >
      <div
        className="flex cursor-grab select-none items-center gap-2 border-b border-slate-600 bg-slate-800/90 px-3 py-2.5 active:cursor-grabbing touch-none"
        title="Sürükleyerek taşı"
        onPointerDown={onDragHandlePointerDown}
        onPointerMove={onDragHandlePointerMove}
        onPointerUp={onDragHandlePointerUp}
        onPointerCancel={onDragHandlePointerUp}
      >
        <span className="flex shrink-0 flex-col gap-0.5 text-slate-500" aria-hidden>
          <span className="flex gap-0.5">
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
          </span>
          <span className="flex gap-0.5">
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
          </span>
        </span>
        <h3 id="col-redist-title" className="min-w-0 flex-1 text-sm font-bold text-white">
          Sütunu Yeniden Düzenle
        </h3>
      </div>

      <div className="p-4 pt-3">
        <p className="text-xs text-slate-400">
          Seçili sütun: <span className="font-semibold text-slate-200">{displayColumnNumber}</span>
        </p>

        <div className="mt-3 grid gap-2">
          <button
            type="button"
            disabled={equalDisabled}
            onClick={() => onModeChange("equal")}
            className={`rounded-lg border p-3 text-left transition ${
              mode === "equal"
                ? "border-blue-500 bg-blue-950/50 ring-1 ring-blue-500/60"
                : "border-slate-600 bg-slate-800/80 hover:border-slate-500"
            } disabled:cursor-not-allowed disabled:opacity-45`}
          >
            <div className="text-xs font-bold text-white">Otomatik eşit dağıt</div>
            <p className="mt-1 text-[0.6875rem] leading-snug text-slate-400">
              Sütunda kalan tüm boşluk hesaplanır; her sorunun altına (son soru dahil, sütun tabanına kadar)
              aynı yükseklikte boşluk konur.
            </p>
            <div className="mt-2 flex justify-center text-slate-500" aria-hidden>
              <svg width="48" height="28" viewBox="0 0 48 28" fill="none">
                <rect x="4" y="4" width="10" height="6" rx="1" fill="currentColor" opacity="0.35" />
                <rect x="4" y="14" width="10" height="6" rx="1" fill="currentColor" opacity="0.35" />
                <rect x="4" y="4" width="10" height="16" rx="1" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
              </svg>
            </div>
          </button>

          <button
            type="button"
            disabled={anchoredDisabled}
            onClick={() => onModeChange("anchored")}
            className={`rounded-lg border p-3 text-left transition ${
              mode === "anchored"
                ? "border-blue-500 bg-blue-950/50 ring-1 ring-blue-500/60"
                : "border-slate-600 bg-slate-800/80 hover:border-slate-500"
            } disabled:cursor-not-allowed disabled:opacity-45`}
          >
            <div className="text-xs font-bold text-white">Alt boşluk sabit</div>
            <p className="mt-1 text-[0.6875rem] leading-snug text-slate-400">
              İlk soru sabit; son soruda görselin alt kenarı ile sayfa altındaki footer üst çizgisi arası
              tam girilen boşluk olur; aradaki sorular eşit aralıkla (en az 3 soru).
            </p>
            {anchoredDisabled && (
              <p className="mt-2 text-[0.625rem] text-amber-400/90">
                Bu seçenek için sütunda en az 3 soru olmalı.
              </p>
            )}
          </button>
        </div>

        {mode === "anchored" && !anchoredDisabled && (
          <label className="mt-3 block text-xs text-slate-400">
            <span className="font-medium text-slate-300">
              Görsel altı — footer üst çizgisi arası
            </span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={0.5}
                value={bottomGapMmInput}
                onChange={(e) => onBottomGapMmChange(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-white"
              />
              <span className="shrink-0 text-slate-500">mm</span>
            </div>
            <span className="mt-0.5 block text-[0.625rem] text-slate-500">
              Sayfa kenar boşlukları ve sorular arası boşluklarla aynı birim (mm); layout PDF pt ile hesaplanır.
            </span>
          </label>
        )}

        {inlineError && (
          <p className="mt-2 rounded-lg border border-rose-800/80 bg-rose-950/40 px-2 py-1.5 text-[0.6875rem] text-rose-200">
            {inlineError}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPreview}
            disabled={
              (mode === "equal" && equalDisabled) || (mode === "anchored" && anchoredDisabled)
            }
            className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Önizle
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={
              (mode === "equal" && equalDisabled) || (mode === "anchored" && anchoredDisabled)
            }
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Uygula
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-slate-500 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
          >
            Sıfırla
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="ml-auto rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            İptal
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
