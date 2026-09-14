import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { CropBox } from "../../types";
import type { AnswerOption } from "../../types";
import {
  clampNormRect,
  normalizedRectToDisplayRect,
} from "../../utils/cropCoordUtils";
import { normalizeContentType } from "../../utils/questionNumbering";
import AnswerMarkPanel, { type CropLayoutMode } from "./AnswerMarkPanel";

type SelectionWithNumber = {
  id: string;
  pdf_id: string;
  page_number: number;
  crop: CropBox;
  answer_key?: string;
  number: number;
  listBadge?: string;
  content_type?: string;
  explanation_caption_enabled?: boolean;
  explanation_caption_text?: string;
  remove_background?: boolean;
  display_scale?: number;
  layoutMode?: "single-column" | "full-width";
  isLocal?: boolean;
  localPdfId?: string;
};

type HandleDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | "move";

type SelectionOverlayProps = {
  selections: SelectionWithNumber[];
  currentPdfId: string | null;
  currentLocalPdfId: string | null;
  currentPage: number;
  displayedW: number;
  displayedH: number;
  editingSelectionId: string | null;
  choiceCount?: 3 | 4 | 5;
  onStartEdit: (sel: SelectionWithNumber) => void;
  onEndEdit: () => void;
  onAnswerChange: (sel: SelectionWithNumber, answer: AnswerOption | null) => void;
  onDelete: (sel: SelectionWithNumber) => void;
  onLayoutChange?: (sel: SelectionWithNumber, layout: CropLayoutMode) => void;
  onCropChange?: (sel: SelectionWithNumber, crop: CropBox) => void;
};

const HANDLES: Array<{ dir: HandleDir; style: CSSProperties; cursor: string }> = [
  { dir: "nw", style: { left: -5, top: -5 }, cursor: "nwse-resize" },
  { dir: "n", style: { left: "50%", top: -5, transform: "translateX(-50%)" }, cursor: "ns-resize" },
  { dir: "ne", style: { right: -5, top: -5 }, cursor: "nesw-resize" },
  { dir: "e", style: { right: -5, top: "50%", transform: "translateY(-50%)" }, cursor: "ew-resize" },
  { dir: "se", style: { right: -5, bottom: -5 }, cursor: "nwse-resize" },
  { dir: "s", style: { left: "50%", bottom: -5, transform: "translateX(-50%)" }, cursor: "ns-resize" },
  { dir: "sw", style: { left: -5, bottom: -5 }, cursor: "nesw-resize" },
  { dir: "w", style: { left: -5, top: "50%", transform: "translateY(-50%)" }, cursor: "ew-resize" },
];

const MIN_NORM = 0.02;

export default function SelectionOverlay({
  selections,
  currentPdfId,
  currentLocalPdfId,
  currentPage,
  displayedW,
  displayedH,
  editingSelectionId,
  choiceCount = 5,
  onStartEdit,
  onEndEdit,
  onAnswerChange,
  onDelete,
  onLayoutChange,
  onCropChange,
}: SelectionOverlayProps) {
  const currentSelections = selections.filter(
    (s) =>
      s.page_number === currentPage &&
      ((!s.isLocal && s.pdf_id === currentPdfId) ||
        (s.isLocal && s.localPdfId === currentLocalPdfId)),
  );

  const safeW = Math.max(1, displayedW);
  const safeH = Math.max(1, displayedH);

  const dragRef = useRef<{
    selId: string;
    dir: HandleDir;
    startX: number;
    startY: number;
    orig: { left: number; top: number; width: number; height: number };
  } | null>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);

  const applyDrag = useCallback(
    (clientX: number, clientY: number) => {
      const drag = dragRef.current;
      if (!drag) return;
      const sel = currentSelections.find((s) => s.id === drag.selId);
      if (!sel || !onCropChange) return;

      const dx = clientX - drag.startX;
      const dy = clientY - drag.startY;
      let { left, top, width, height } = drag.orig;
      const dir = drag.dir;

      if (dir === "move") {
        left += dx;
        top += dy;
      } else {
        if (dir.includes("e")) width += dx;
        if (dir.includes("s")) height += dy;
        if (dir.includes("w")) {
          left += dx;
          width -= dx;
        }
        if (dir.includes("n")) {
          top += dy;
          height -= dy;
        }
      }

      const minPx = Math.max(16, Math.min(safeW, safeH) * MIN_NORM);
      if (width < minPx) {
        if (dir.includes("w")) left = drag.orig.left + drag.orig.width - minPx;
        width = minPx;
      }
      if (height < minPx) {
        if (dir.includes("n")) top = drag.orig.top + drag.orig.height - minPx;
        height = minPx;
      }

      left = Math.max(0, Math.min(left, safeW - width));
      top = Math.max(0, Math.min(top, safeH - height));
      width = Math.min(width, safeW - left);
      height = Math.min(height, safeH - top);

      const next = clampNormRect({
        x: left / safeW,
        y: top / safeH,
        width: width / safeW,
        height: height / safeH,
      });
      onCropChange(sel, next);
    },
    [currentSelections, onCropChange, safeH, safeW],
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      applyDrag(e.clientX, e.clientY);
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setDraggingId(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [applyDrag]);

  const beginDrag = (
    e: React.PointerEvent,
    sel: SelectionWithNumber,
    dir: HandleDir,
    rect: { left: number; top: number; width: number; height: number },
  ) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      selId: sel.id,
      dir,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...rect },
    };
    setDraggingId(sel.id);
  };

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-10 overflow-visible"
      style={{ width: safeW, height: safeH }}
    >
      {currentSelections.map((sel) => {
        const rect = normalizedRectToDisplayRect(
          sel.crop as { x: number; y: number; width: number; height: number },
          safeW,
          safeH,
        );
        if (rect.width <= 0 || rect.height <= 0) return null;

        const currentAnswer: AnswerOption | null =
          sel.answer_key && ["A", "B", "C", "D", "E"].includes(sel.answer_key)
            ? (sel.answer_key as AnswerOption)
            : null;
        const isEditing = editingSelectionId === sel.id;
        const isExplanation = normalizeContentType(sel.content_type) === "explanation";

        return (
          <div
            key={sel.id}
            className={`absolute overflow-visible ${
              isEditing || draggingId === sel.id
                ? "pointer-events-auto z-20"
                : "pointer-events-auto"
            }`}
            style={{
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            }}
          >
            <div
              className={`tq-crop-selection-box absolute inset-0 ${
                isEditing ? "tq-crop-selection-box--editing" : ""
              }`}
              style={isEditing ? { cursor: "move" } : undefined}
              onPointerDown={
                isEditing
                  ? (e) => {
                      if ((e.target as HTMLElement).dataset.handle) return;
                      beginDrag(e, sel, "move", rect);
                    }
                  : undefined
              }
            />

            {!isEditing && (
              <div
                className="absolute right-0 z-10 flex -translate-y-full gap-1.5 pointer-events-auto"
                style={{ top: 0, marginTop: -2 }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartEdit(sel);
                  }}
                  className="rounded-md bg-slate-800/90 px-2.5 py-1 text-xs font-medium text-white shadow-sm hover:bg-slate-700"
                >
                  Düzenle
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(sel);
                  }}
                  className="rounded-md bg-slate-800/90 px-2.5 py-1 text-xs font-medium text-white shadow-sm hover:bg-slate-700 pointer-events-auto"
                >
                  Sil
                </button>
              </div>
            )}

            {isEditing && (
              <>
                {HANDLES.map((h) => (
                  <div
                    key={h.dir}
                    data-handle={h.dir}
                    className="tq-crop-resize-handle"
                    style={{ ...h.style, cursor: h.cursor }}
                    onPointerDown={(e) => beginDrag(e, sel, h.dir, rect)}
                  />
                ))}
                {!isExplanation && (
                  <div className="absolute left-1/2 top-full z-30 mt-3 -translate-x-1/2 pointer-events-auto">
                    <AnswerMarkPanel
                      selectedAnswer={currentAnswer}
                      onSelectAnswer={(a) => onAnswerChange(sel, a)}
                      layout={sel.layoutMode === "full-width" ? "genis" : "dar"}
                      onLayoutChange={(next) => {
                        onLayoutChange?.(sel, next);
                      }}
                      choiceCount={choiceCount}
                      onCancel={onEndEdit}
                      onConfirm={onEndEdit}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
