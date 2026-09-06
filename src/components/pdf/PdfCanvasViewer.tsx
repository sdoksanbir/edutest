import { useEffect, useRef, useState } from "react";
import type { LayoutItem } from "../../api/client";
import {
  QUESTION_SELECTION_CLASS,
  QUESTION_SELECTION_ACTIVE_CLASS,
  QUESTION_SELECTION_SELECTED_CLASS,
} from "../../utils/questionSelectionOutline";

/** pdf.js belgesi — getPage / destroy yeterli */
type PdfDocLike = {
  getPage: (pageNumber: number) => Promise<{
    getViewport: (params: { scale: number }) => { width: number; height: number };
    render: (params: {
      canvasContext: CanvasRenderingContext2D;
      viewport: { width: number; height: number };
      canvas: HTMLCanvasElement;
      intent: string;
    }) => { promise: Promise<void> };
  }>;
};

type PdfCanvasViewerProps = {
  /** Paylaşılan pdf.js belgesi — blob URL yerine (revoke yarışı yok) */
  pdfDoc: PdfDocLike | null;
  layout: LayoutItem[];
  pageWpt: number;
  pageHpt: number;
  currentPage: number;
  zoom: number;
  selectedQuestions: number[];
  onQuestionSelect: (
    index: number,
    options?: { additive?: boolean; range?: boolean },
  ) => void;
};

/** Canvas-based PDF viewer with clickable question overlays */
export default function PdfCanvasViewer({
  pdfDoc,
  layout,
  pageWpt,
  pageHpt,
  currentPage,
  zoom,
  selectedQuestions,
  onQuestionSelect,
}: PdfCanvasViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [viewSize, setViewSize] = useState<{ w: number; h: number } | null>(null);

  /** Zoom ile senkron viewSize - gecikme olmadan overlay güncellemesi (72pt=1in, 96px=1in) */
  const computedViewSize =
    viewSize ?? (pdfDoc ? { w: (pageWpt / 72) * 96 * zoom, h: (pageHpt / 72) * 96 * zoom } : null);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;
    const dpr = window.devicePixelRatio || 1;
    pdfDoc
      .getPage(currentPage)
      .then((page) => {
        if (cancelled) return;
        const scale = zoom * dpr;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const displayW = viewport.width / dpr;
        const displayH = viewport.height / dpr;
        canvas.style.width = `${displayW}px`;
        canvas.style.height = `${displayH}px`;
        setViewSize({ w: displayW, h: displayH });
        return page.render({ canvasContext: ctx, viewport, canvas, intent: "display" }).promise;
      })
      .then(() => {
        if (!cancelled) setRenderError(null);
      })
      .catch((e) => {
        if (!cancelled) setRenderError(e?.message ?? "Sayfa çizilemedi");
      });
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, currentPage, zoom]);

  if (!pdfDoc) return null;

  const pageItems = layout.filter((l) => l.page_num === currentPage);

  /** pt → ekran: PDF koordinatları (origin sol-alt, y yukarı) → ekran (origin sol-üst, y aşağı) */
  const ptToScreen = (item: LayoutItem) => {
    if (!computedViewSize) return { x: 0, y: 0, w: 0, h: 0 };
    const hasImg =
      item.img_x_pt != null &&
      item.img_y_top_pt != null &&
      item.img_w_pt != null &&
      item.img_h_pt != null;
    const x = hasImg ? item.img_x_pt! : item.x_pt;
    const yTop = hasImg ? item.img_y_top_pt! : item.y_top_pt;
    const w = hasImg ? item.img_w_pt! : item.w_pt;
    const h = hasImg ? item.img_h_pt! : item.h_pt;
    return {
      x: (x / pageWpt) * computedViewSize.w,
      y: ((pageHpt - yTop) / pageHpt) * computedViewSize.h,
      w: (w / pageWpt) * computedViewSize.w,
      h: (h / pageHpt) * computedViewSize.h,
    };
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <canvas
        ref={canvasRef}
        className="block rounded-lg border border-slate-200 bg-white shadow-lg"
      />
      {renderError && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-rose-50/90 text-rose-700">
          {renderError}
        </div>
      )}
      {layout.length > 0 && computedViewSize && (
        <div
          className="absolute left-0 top-0 pointer-events-none"
          style={{ width: computedViewSize.w, height: computedViewSize.h }}
        >
          {pageItems.map((item) => {
            const { x, y, w, h } = ptToScreen(item);
            const isSelected = selectedQuestions.includes(item.order_index);
            return (
              <div
                key={item.order_index}
                className={`absolute ${
                  isSelected
                    ? `${QUESTION_SELECTION_CLASS} ${QUESTION_SELECTION_ACTIVE_CLASS} ${QUESTION_SELECTION_SELECTED_CLASS}`
                    : ""
                }`}
                style={{ left: x, top: y, width: w, height: h }}
              />
            );
          })}
        </div>
      )}
      {layout.length > 0 && computedViewSize && (
        <div
          className="absolute left-0 top-0"
          style={{ width: computedViewSize.w, height: computedViewSize.h }}
        >
          {pageItems.map((item) => {
            const { x, y, w, h } = ptToScreen(item);
            const isSelected = selectedQuestions.includes(item.order_index);
            return (
              <button
                key={item.order_index}
                type="button"
                data-question-hit
                onClick={(e) =>
                  onQuestionSelect(item.order_index, {
                    additive: e.metaKey || e.ctrlKey,
                    range: e.shiftKey,
                  })
                }
                className={`absolute cursor-pointer rounded-sm transition-colors ${
                  isSelected ? "" : "hover:bg-slate-400/10"
                }`}
                style={{ left: x, top: y, width: w, height: h }}
                aria-label={
                  item.display_number != null
                    ? `Soru ${item.display_number}`
                    : "Açıklama bloğu"
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
