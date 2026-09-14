import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { CropBox } from "../../types";
import { clampNormRect, normalizedRectToDisplayRect } from "../../utils/cropCoordUtils";

export type DetectionDraft = {
  id: string;
  crop: CropBox;
};

type HandleDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | "move";

type Props = {
  drafts: DetectionDraft[];
  displayedW: number;
  displayedH: number;
  onCropChange: (id: string, crop: CropBox) => void;
  onRemove: (id: string) => void;
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

export default function DetectionDraftOverlay({
  drafts,
  displayedW,
  displayedH,
  onCropChange,
  onRemove,
}: Props) {
  const safeW = Math.max(1, displayedW);
  const safeH = Math.max(1, displayedH);

  const dragRef = useRef<{
    id: string;
    dir: HandleDir;
    startX: number;
    startY: number;
    orig: { left: number; top: number; width: number; height: number };
  } | null>(null);

  const applyDrag = useCallback(
    (clientX: number, clientY: number) => {
      const drag = dragRef.current;
      if (!drag) return;
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

      onCropChange(
        drag.id,
        clampNormRect({
          x: left / safeW,
          y: top / safeH,
          width: width / safeW,
          height: height / safeH,
        }),
      );
    },
    [onCropChange, safeH, safeW],
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      applyDrag(e.clientX, e.clientY);
    };
    const onUp = () => {
      dragRef.current = null;
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

  if (drafts.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-30 overflow-visible"
      style={{ width: safeW, height: safeH }}
    >
      {drafts.map((d, idx) => {
        const rect = normalizedRectToDisplayRect(
          d.crop as { x: number; y: number; width: number; height: number },
          safeW,
          safeH,
        );
        if (rect.width <= 0 || rect.height <= 0) return null;

        return (
          <div
            key={d.id}
            className="pointer-events-auto absolute overflow-visible"
            style={{
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            }}
          >
            <div
              className="tq-crop-selection-box tq-crop-selection-box--editing absolute inset-0"
              style={{ cursor: "move" }}
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).dataset.handle) return;
                e.preventDefault();
                e.stopPropagation();
                dragRef.current = {
                  id: d.id,
                  dir: "move",
                  startX: e.clientX,
                  startY: e.clientY,
                  orig: { ...rect },
                };
              }}
            />

            <div
              className="absolute left-0 z-10 flex -translate-y-full items-center gap-1.5"
              style={{ top: 0, marginTop: -2 }}
            >
              <span className="rounded-md bg-sky-700/95 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                {idx + 1}
              </span>
            </div>

            <div
              className="absolute right-0 z-10 flex -translate-y-full gap-1.5"
              style={{ top: 0, marginTop: -2 }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(d.id);
                }}
                className="rounded-md bg-slate-800/90 px-2.5 py-1 text-xs font-medium text-white shadow-sm hover:bg-slate-700"
              >
                Sil
              </button>
            </div>

            {HANDLES.map((h) => (
              <div
                key={h.dir}
                data-handle={h.dir}
                className="tq-crop-resize-handle"
                style={{ ...h.style, cursor: h.cursor }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dragRef.current = {
                    id: d.id,
                    dir: h.dir,
                    startX: e.clientX,
                    startY: e.clientY,
                    orig: { ...rect },
                  };
                }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
