import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  /** Seçim kutusu + görüntü analiziyle hesaplanan başlangıç boyutu (px). */
  suggestedFontPx: number;
  /** Doluysa düzenleme modu */
  editingOverlayId?: string | null;
  initialText?: string;
  initialFontPx?: number;
  onClose: () => void;
  onPlace: (text: string, fontSizePx: number) => Promise<void>;
  /** Canlı önizleme (punto / metin değişince). */
  onLiveDraftChange?: (draft: { text: string; fontPx: number }) => void;
};

const FONT_MIN = 10;
const FONT_MAX = 96;

export default function QuestionImageMathTextModal({
  open,
  suggestedFontPx,
  editingOverlayId,
  initialText,
  initialFontPx,
  onClose,
  onPlace,
  onLiveDraftChange,
}: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [fontPx, setFontPx] = useState(18);
  const [placing, setPlacing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragOffsetRef = useRef(dragOffset);
  dragOffsetRef.current = dragOffset;
  const dragStartRef = useRef<{ cx: number; cy: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setText("");
      setPlacing(false);
      setDragOffset({ x: 0, y: 0 });
      return;
    }
    setDragOffset({ x: 0, y: 0 });
    if (editingOverlayId) {
      setText(initialText ?? "");
      setFontPx(
        Math.round(Math.max(FONT_MIN, Math.min(FONT_MAX, initialFontPx ?? 18)))
      );
    } else {
      setText("");
      setFontPx(
        Math.round(Math.max(FONT_MIN, Math.min(FONT_MAX, suggestedFontPx || 18)))
      );
    }
    const t = window.setTimeout(() => taRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [open, suggestedFontPx, editingOverlayId, initialText, initialFontPx]);

  useEffect(() => {
    if (!open) return;
    onLiveDraftChange?.({ text, fontPx });
  }, [open, text, fontPx, onLiveDraftChange]);

  const handleHeaderPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    const o = dragOffsetRef.current;
    dragStartRef.current = {
      cx: e.clientX,
      cy: e.clientY,
      ox: o.x,
      oy: o.y,
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const handleHeaderPointerMove = useCallback((e: React.PointerEvent) => {
    const s = dragStartRef.current;
    if (!s) return;
    setDragOffset({
      x: s.ox + (e.clientX - s.cx),
      y: s.oy + (e.clientY - s.cy),
    });
  }, []);

  const endHeaderDrag = useCallback((e: React.PointerEvent) => {
    dragStartRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const handlePlace = async () => {
    if (!text.trim()) return;
    setPlacing(true);
    try {
      await onPlace(text, fontPx);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Metin yerleştirilemedi. Lütfen tekrar deneyin.");
    } finally {
      setPlacing(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/25 p-3"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="pointer-events-auto flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl"
        style={{
          position: "absolute",
          left: `calc(50% + ${dragOffset.x}px)`,
          top: `calc(50% + ${dragOffset.y}px)`,
          transform: "translate(-50%, -50%)",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="qimg-text-title"
      >
        <div
          className="flex cursor-grab select-none items-center justify-between border-b border-slate-200 px-4 py-3 active:cursor-grabbing"
          onPointerDown={handleHeaderPointerDown}
          onPointerMove={handleHeaderPointerMove}
          onPointerUp={endHeaderDrag}
          onPointerCancel={endHeaderDrag}
        >
          <h2 id="qimg-text-title" className="text-sm font-bold text-slate-900">
            {editingOverlayId ? "Metni düzenle" : "Görüntüye metin ekle"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Kapat"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="border-b border-slate-100 px-4 py-3">
          <p className="mb-3 text-xs leading-relaxed text-slate-600">
            Başlığı sürükleyerek pencereyi kaydırın. Punto, seçtiğiniz alandaki soru yazısından tahmin edilir; slider veya
            sayı alanından değiştirebilirsiniz. Yeni metin eklerken alttaki görsel üzerinde canlı önizleme görünür;
            düzenlemede punto doğrudan metin kutusunda yansır.
          </p>
          <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
            Yazı boyutu (px): {fontPx}
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="range"
              min={FONT_MIN}
              max={FONT_MAX}
              value={fontPx}
              onChange={(e) => setFontPx(Number(e.target.value))}
              className="h-2 min-w-[12rem] flex-1 accent-sky-600"
            />
            <input
              type="number"
              min={FONT_MIN}
              max={FONT_MAX}
              value={fontPx}
              onChange={(e) =>
                setFontPx(
                  Math.max(FONT_MIN, Math.min(FONT_MAX, Number(e.target.value) || FONT_MIN))
                )
              }
              className="w-16 rounded border border-slate-300 px-2 py-1 text-sm tabular-nums"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 px-4 py-3">
          <label htmlFor="qimg-plain-ta" className="sr-only">
            Metin
          </label>
          <textarea
            ref={taRef}
            id="qimg-plain-ta"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            spellCheck
            className="w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-slate-900 outline-none ring-sky-500/30 focus:border-sky-500 focus:ring-2"
            style={{
              fontFamily:
                'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              fontSize: `${fontPx}px`,
              lineHeight: 1.3,
              fontWeight: 500,
            }}
            placeholder="Metninizi yazın…"
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            İptal
          </button>
          <button
            type="button"
            disabled={!text.trim() || placing}
            onClick={() => void handlePlace()}
            className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {placing ? "…" : editingOverlayId ? "Kaydet" : "Yerleştir"}
          </button>
        </div>
      </div>
    </div>
  );
}
