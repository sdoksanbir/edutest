import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type RefObject } from "react";
import { ZoomIn } from "lucide-react";
import type { LayoutItem } from "../../api/client";
import type { QuestionItem } from "../../types";
import {
  QUESTION_SELECTION_CLASS,
  QUESTION_SELECTION_ACTIVE_CLASS,
  QUESTION_SELECTION_SELECTED_CLASS,
} from "../../utils/questionSelectionOutline";
import {
  clampDraggedYTopPt,
  clientDeltaToYTopDelta,
  getItemTopPt,
  getPageColumnDraggableMeta,
  layoutItemToCanvasRect,
  yTopDeltaToClientDelta,
} from "../../utils/questionVerticalDrag";
import {
  computePageColumnBand,
  DEFAULT_HEADER_BOTTOM_GAP_MM,
  DEFAULT_OTHER_PAGE_HEADER_BOTTOM_GAP_MM,
  DEFAULT_QUESTION_NUMBER_IMAGE_GAP_MM,
  DEFAULT_QUESTION_NUMBER_LEFT_OFFSET_MM,
  liveAlignmentYShiftPtForItem,
  type LayoutGeometryInput,
} from "../../utils/pdfLayoutGeometry";
import {
  getPageColumnShiftMeta,
  type ColumnShiftDirection,
} from "../../utils/columnShift";

type Props = {
  enabled: boolean;
  layout: LayoutItem[];
  pageNum: number;
  pageHpt: number;
  pageWpx: number;
  pageHpx: number;
  scale: number;
  geometry: LayoutGeometryInput;
  questions: QuestionItem[];
  selectedOrderIndices: number[];
  columns: number;
  maxQuestionPage: number;
  onSelectQuestion: (
    orderIndex: number,
    options?: { additive?: boolean; range?: boolean; skipScroll?: boolean },
  ) => void;
  onYTopChange: (
    orderIndex: number,
    yTopPt: number,
    phase: "move" | "commit",
    pageNum?: number,
  ) => void;
  onColumnShift?: (
    orderIndex: number,
    direction: ColumnShiftDirection,
    options?: { force?: boolean }
  ) => void;
  onDisplayScaleChange?: (
    orderIndex: number,
    sizePct: number,
    phase: "start" | "move" | "commit" | "cancel" | "persist"
  ) => void;
  getDisplayScaleMaxPct?: (orderIndex: number) => number;
  questionNumberLeftOffsetMm?: number;
  questionNumberImageGapMm?: number;
  headerBottomGapMm?: number;
  otherPageHeaderBottomGapMm?: number;
  layoutLiveRef?: RefObject<LayoutItem[] | null>;
  alignmentPreviewLiveRef?: RefObject<{
    headerBottomGapMm?: number;
    otherPageHeaderBottomGapMm?: number;
    leftOffsetMm?: number;
    imageGapMm?: number;
  } | null>;
  onRegisterRedraw?: (redraw: () => void) => void | (() => void);
};

const MIN_SIZE_PCT = 50;
const MAX_SIZE_PCT = 200;

function ColumnShiftArrow({
  direction,
  tone,
  onClick,
  title,
}: {
  direction: "left" | "right";
  tone: "normal" | "force";
  onClick: () => void;
  title: string;
}) {
  const size = tone === "force" ? "h-6 w-6" : "h-7 w-7";
  const iconSize = tone === "force" ? 10 : 12;
  const bg =
    tone === "force"
      ? "bg-red-500/75 hover:bg-red-600/90"
      : direction === "left"
        ? "bg-emerald-500/75 hover:bg-emerald-600/90"
        : "bg-amber-500/75 hover:bg-amber-600/90";

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={`pointer-events-auto flex ${size} items-center justify-center rounded-full ${bg} text-white/90 opacity-70 shadow-sm ring-1 ring-white/60 transition hover:scale-105 hover:opacity-100 active:scale-95`}
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" aria-hidden>
        {tone === "force" ? (
          direction === "left" ? (
            <>
              <polygon points="10,2 6,8 10,14" fill="currentColor" />
              <polygon points="6,2 2,8 6,14" fill="currentColor" />
            </>
          ) : (
            <>
              <polygon points="6,2 10,8 6,14" fill="currentColor" />
              <polygon points="10,2 14,8 10,14" fill="currentColor" />
            </>
          )
        ) : direction === "left" ? (
          <polygon points="11,2 5,8 11,14" fill="currentColor" />
        ) : (
          <polygon points="5,2 11,8 5,14" fill="currentColor" />
        )}
      </svg>
    </button>
  );
}

export default function QuestionVerticalDragOverlay({
  enabled,
  layout,
  pageNum,
  pageHpt,
  pageWpx,
  pageHpx,
  scale,
  geometry,
  questions,
  selectedOrderIndices,
  columns,
  maxQuestionPage,
  onSelectQuestion,
  onYTopChange,
  onColumnShift,
  onDisplayScaleChange,
  getDisplayScaleMaxPct,
  questionNumberLeftOffsetMm = DEFAULT_QUESTION_NUMBER_LEFT_OFFSET_MM,
  questionNumberImageGapMm = DEFAULT_QUESTION_NUMBER_IMAGE_GAP_MM,
  headerBottomGapMm = DEFAULT_HEADER_BOTTOM_GAP_MM,
  otherPageHeaderBottomGapMm = DEFAULT_OTHER_PAGE_HEADER_BOTTOM_GAP_MM,
  layoutLiveRef,
  alignmentPreviewLiveRef,
  onRegisterRedraw,
}: Props) {
  const [, bumpLiveFrame] = useReducer((n: number) => n + 1, 0);
  const layoutData =
    layoutLiveRef?.current && layoutLiveRef.current.length > 0
      ? layoutLiveRef.current
      : layout;
  const useLiveReflowLayout = Boolean(
    layoutLiveRef?.current && layoutLiveRef.current.length > 0,
  );
  const numOffsetMm =
    alignmentPreviewLiveRef?.current?.leftOffsetMm ?? questionNumberLeftOffsetMm;
  const numGapMm =
    alignmentPreviewLiveRef?.current?.imageGapMm ?? questionNumberImageGapMm;
  const liveAlignment = alignmentPreviewLiveRef?.current;

  useEffect(() => {
    if (!enabled || !onRegisterRedraw) return;
    return onRegisterRedraw(() => {
      bumpLiveFrame();
    });
  }, [enabled, onRegisterRedraw]);

  const [hoverOrder, setHoverOrder] = useState<number | null>(null);
  const [dragOrder, setDragOrder] = useState<number | null>(null);
  const [sizeSliderOrder, setSizeSliderOrder] = useState<number | null>(null);
  const [sliderPctByOrder, setSliderPctByOrder] = useState<Map<number, number>>(new Map());
  const pageOverlayRef = useRef<HTMLDivElement>(null);
  const scrollLockRef = useRef<{ el: HTMLElement; top: number; left: number } | null>(null);
  const sizeSliderAnchorRef = useRef<{
    orderIndex: number;
    right: number;
    top: number;
  } | null>(null);
  const scaleSliderActiveRef = useRef(false);
  const dragRef = useRef<{
    orderIndex: number;
    startClientY: number;
    startYTop: number;
    startRectTop: number;
    moved: boolean;
    element: HTMLElement | null;
    item: LayoutItem;
    meta: {
      draggable: boolean;
      prev: LayoutItem | null;
      next: LayoutItem | null;
      floorTopPt: number | null;
    } | null;
  } | null>(null);

  const pageItems = useMemo(
    () => layoutData.filter((l) => l.page_num === pageNum && l.kind !== "answer_key_page"),
    [layoutData, pageNum]
  );

  const band = useMemo(() => computePageColumnBand(geometry), [geometry]);
  const metaByOrder = useMemo(
    () => getPageColumnDraggableMeta(layoutData, pageNum, band),
    [layoutData, pageNum, band]
  );
  const shiftMeta = useMemo(() => {
    if (!onColumnShift) return new Map<number, { showPrevColumnArrow: boolean; showNextColumnArrow: boolean }>();
    const bandForPage = (p: number) => computePageColumnBand({ ...geometry, pageNum: p });
    return getPageColumnShiftMeta(layoutData, pageNum, columns, maxQuestionPage, bandForPage);
  }, [onColumnShift, layoutData, pageNum, columns, maxQuestionPage, geometry]);

  const displayScaleByOrder = useMemo(() => {
    const m = new Map<number, number>();
    for (const q of questions) {
      m.set(q.order_index, Math.round((q.display_scale ?? 1) * 100));
    }
    return m;
  }, [questions]);

  const lockPageScroll = useCallback(() => {
    const el = pageOverlayRef.current?.closest(".pdf-preview-scroll-area") as HTMLElement | null;
    if (!el) return;
    scrollLockRef.current = { el, top: el.scrollTop, left: el.scrollLeft };
    el.style.overscrollBehavior = "none";
  }, []);

  const restorePageScroll = useCallback(() => {
    const lock = scrollLockRef.current;
    if (!lock) return;
    if (lock.el.scrollTop !== lock.top) lock.el.scrollTop = lock.top;
    if (lock.el.scrollLeft !== lock.left) lock.el.scrollLeft = lock.left;
  }, []);

  const unlockPageScroll = useCallback(() => {
    const lock = scrollLockRef.current;
    if (!lock) return;
    lock.el.style.overscrollBehavior = "";
    lock.el.scrollTop = lock.top;
    lock.el.scrollLeft = lock.left;
    scrollLockRef.current = null;
  }, []);

  const clearDragTransform = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    el.style.transform = "";
    el.style.willChange = "";
  }, []);

  const finishVerticalDrag = useCallback(() => {
    if (scaleSliderActiveRef.current) return;
    const d = dragRef.current;
    dragRef.current = null;
    setDragOrder(null);
    if (!d) {
      unlockPageScroll();
      return;
    }
    clearDragTransform(d.element);
    if (d.moved) {
      onYTopChange(d.orderIndex, 0, "commit", pageNum);
    }
    unlockPageScroll();
  }, [onYTopChange, unlockPageScroll, clearDragTransform, pageNum]);

  const onVerticalPointerMove = useCallback(
    (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d?.meta?.draggable) return;

      const dy = e.clientY - d.startClientY;
      if (Math.abs(dy) > 2) d.moved = true;

      const raw = d.startYTop + clientDeltaToYTopDelta(dy, scale);
      const clamped = clampDraggedYTopPt(
        raw,
        d.item,
        d.meta.prev,
        d.meta.next,
        undefined,
        d.meta.floorTopPt,
      );
      if (d.element) {
        d.element.style.willChange = "transform";
        const clampedDy = yTopDeltaToClientDelta(clamped - d.startYTop, scale);
        d.element.style.transform = `translate3d(0,${clampedDy}px,0)`;
      }
      onYTopChange(d.orderIndex, clamped, "move", pageNum);
    },
    [onYTopChange, scale, pageNum]
  );

  useEffect(() => {
    if (dragOrder == null) return;
    const onScroll = () => restorePageScroll();
    const lock = scrollLockRef.current;
    lock?.el.addEventListener("scroll", onScroll, { passive: true });
    const preventTouchScroll = (e: TouchEvent) => {
      if (scrollLockRef.current) e.preventDefault();
    };
    window.addEventListener("touchmove", preventTouchScroll, { passive: false });
    return () => {
      lock?.el.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchmove", preventTouchScroll);
    };
  }, [dragOrder, restorePageScroll]);

  useEffect(() => {
    if (dragOrder == null) return;
    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      onVerticalPointerMove(e);
    };
    const onUp = () => finishVerticalDrag();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragOrder, onVerticalPointerMove, finishVerticalDrag]);

  const startVerticalDrag = useCallback(
    (e: React.PointerEvent, item: LayoutItem, rectTop: number) => {
      e.preventDefault();
      e.stopPropagation();
      const meta = metaByOrder.get(item.order_index);
      const el = e.currentTarget as HTMLElement;
      dragRef.current = {
        orderIndex: item.order_index,
        startClientY: e.clientY,
        startYTop: getItemTopPt(item),
        startRectTop: rectTop,
        moved: false,
        element: el,
        item,
        meta: meta ?? null,
      };
      setDragOrder(item.order_index);
      lockPageScroll();
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [lockPageScroll, metaByOrder],
  );

  const closeSizeSlider = useCallback(
    (orderIndex: number, cancel: boolean, pctOverride?: number) => {
      if (cancel) {
        onDisplayScaleChange?.(orderIndex, 0, "cancel");
      } else {
        const pct = pctOverride ?? displayScaleByOrder.get(orderIndex) ?? 100;
        onDisplayScaleChange?.(orderIndex, pct, "persist");
      }
      setSliderPctByOrder((prev) => {
        const next = new Map(prev);
        next.delete(orderIndex);
        return next;
      });
      setSizeSliderOrder(null);
      sizeSliderAnchorRef.current = null;
    },
    [onDisplayScaleChange, displayScaleByOrder]
  );

  const openSizeSlider = useCallback(
    (item: LayoutItem, rect: { left: number; top: number; width: number; height: number }, sizePct: number) => {
      if (sizeSliderOrder != null && sizeSliderOrder !== item.order_index) {
        const prevPct =
          sliderPctByOrder.get(sizeSliderOrder) ??
          displayScaleByOrder.get(sizeSliderOrder) ??
          100;
        closeSizeSlider(sizeSliderOrder, false, prevPct);
      }
      onSelectQuestion(item.order_index);
      setSliderPctByOrder((prev) => new Map(prev).set(item.order_index, sizePct));
      sizeSliderAnchorRef.current = {
        orderIndex: item.order_index,
        right: rect.left + rect.width,
        top: rect.top,
      };
      setSizeSliderOrder(item.order_index);
      onDisplayScaleChange?.(item.order_index, sizePct, "start");
    },
    [onSelectQuestion, onDisplayScaleChange, sizeSliderOrder, closeSizeSlider, sliderPctByOrder, displayScaleByOrder]
  );

  const floatingSliderOrder = sizeSliderOrder;
  const floatingAnchor = sizeSliderAnchorRef.current;
  const floatingSliderPct =
    floatingSliderOrder != null
      ? (sliderPctByOrder.get(floatingSliderOrder) ??
        displayScaleByOrder.get(floatingSliderOrder) ??
        100)
      : 100;
  const floatingSliderMaxPct =
    floatingSliderOrder != null
      ? (getDisplayScaleMaxPct?.(floatingSliderOrder) ?? MAX_SIZE_PCT)
      : MAX_SIZE_PCT;

  useEffect(() => {
    if (selectedOrderIndices.length === 0 && sizeSliderOrder != null) {
      closeSizeSlider(sizeSliderOrder, true);
    }
  }, [selectedOrderIndices.length, sizeSliderOrder, closeSizeSlider]);

  if (!enabled || pageItems.length === 0) return null;

  return (
    <div
      ref={pageOverlayRef}
      className="pointer-events-none absolute left-0 top-0 z-[18]"
      style={{ width: pageWpx, height: pageHpx }}
    >
      {pageItems.map((item) => {
        const yShiftPt = useLiveReflowLayout
          ? 0
          : liveAlignmentYShiftPtForItem(item, {
              pageNum,
              columns,
              band,
              live: liveAlignment,
              committedHeaderBottomGapMm: headerBottomGapMm,
              committedOtherPageHeaderBottomGapMm: otherPageHeaderBottomGapMm,
            });
        const rect = layoutItemToCanvasRect(
          item,
          pageHpt,
          scale,
          numOffsetMm,
          numGapMm,
          yShiftPt,
        );
        if (!rect) return null;
        const meta = metaByOrder.get(item.order_index);
        const draggable = meta?.draggable ?? false;
        const isHover = hoverOrder === item.order_index;
        const isDragging = dragOrder === item.order_index;
        const sizeSliderOpen = sizeSliderOrder === item.order_index;
        const showControls = isHover || isDragging || sizeSliderOpen;
        const sizePct = displayScaleByOrder.get(item.order_index) ?? 100;
        const shift = shiftMeta.get(item.order_index ?? -1);
        const showShiftArrows = Boolean(onColumnShift && shift);
        const isSelected = selectedOrderIndices.includes(item.order_index);

        const isHighlighted = isSelected || isHover || isDragging;

        const dragStartTop =
          isDragging && dragRef.current?.orderIndex === item.order_index
            ? dragRef.current.startRectTop
            : rect.top;

        return (
          <div
            key={item.order_index}
            data-question-hit
            className={`pointer-events-auto absolute ${isDragging ? "cursor-grabbing" : draggable ? "cursor-ns-resize" : "cursor-pointer"}`}
            style={{
              left: rect.left,
              top: dragStartTop,
              width: rect.width,
              height: rect.height,
            }}
            onPointerEnter={() => setHoverOrder(item.order_index)}
            onPointerLeave={() => {
              if (dragOrder !== item.order_index) setHoverOrder(null);
            }}
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest("[data-column-shift-arrow]")) return;
              if ((e.target as HTMLElement).closest("[data-question-size-control]")) return;
              if (e.button !== 0) return;
              e.preventDefault();
              e.stopPropagation();
              const selectOptions = {
                additive: e.metaKey || e.ctrlKey,
                range: e.shiftKey,
              };
              if (selectOptions.additive || selectOptions.range) {
                onSelectQuestion(item.order_index, selectOptions);
                return;
              }
              onSelectQuestion(item.order_index, { skipScroll: draggable });
              if (draggable) {
                startVerticalDrag(e, item, rect.top);
              }
            }}
          >
            <div
              className={`${QUESTION_SELECTION_CLASS} ${
                isHighlighted ? QUESTION_SELECTION_ACTIVE_CLASS : ""
              } ${isSelected ? QUESTION_SELECTION_SELECTED_CLASS : ""}`}
              aria-hidden
            />
            {showShiftArrows && shift!.showPrevColumnArrow && (
              <div
                className={`absolute left-0 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 transition-opacity duration-150 ${
                  showControls ? "opacity-75" : "pointer-events-none opacity-0"
                }`}
                data-column-shift-arrow
              >
                <ColumnShiftArrow
                  direction="left"
                  tone="normal"
                  title="Önceki sütunun sonuna taşı"
                  onClick={() => onColumnShift!(item.order_index ?? 0, "prev_column")}
                />
                <ColumnShiftArrow
                  direction="left"
                  tone="force"
                  title="Zorla önceki sütuna taşı (boşluk sınırını yok say)"
                  onClick={() =>
                    onColumnShift!(item.order_index ?? 0, "prev_column", { force: true })
                  }
                />
              </div>
            )}
            {showShiftArrows && shift!.showNextColumnArrow && (
              <div
                className={`absolute right-0 top-1/2 z-10 flex translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 transition-opacity duration-150 ${
                  showControls ? "opacity-75" : "pointer-events-none opacity-0"
                }`}
                data-column-shift-arrow
              >
                <ColumnShiftArrow
                  direction="right"
                  tone="normal"
                  title="Sonraki sütunun başına taşı"
                  onClick={() => onColumnShift!(item.order_index ?? 0, "next_column")}
                />
                <ColumnShiftArrow
                  direction="right"
                  tone="force"
                  title="Zorla sonraki sütuna taşı (boşluk sınırını yok say)"
                  onClick={() =>
                    onColumnShift!(item.order_index ?? 0, "next_column", { force: true })
                  }
                />
              </div>
            )}
            {showControls && (
              <>
                {onDisplayScaleChange && !sizeSliderOpen && (
                  <div
                    className="absolute right-0 top-0 z-20 flex -translate-y-full flex-col items-end gap-1"
                    data-question-size-control
                  >
                    <div className="flex items-stretch overflow-hidden rounded border-2 border-red-600 bg-red-500 shadow-sm">
                      <span className="flex items-center px-1 py-0.5 text-[0.625rem] font-bold leading-none text-white">
                        %{sizePct}
                      </span>
                      <button
                        type="button"
                        title="Soru boyutu"
                        aria-label="Soru boyutu ayarla"
                        aria-expanded={false}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openSizeSlider(item, rect, sizePct);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="flex items-center justify-center border-l border-red-400 px-1 py-0.5 transition hover:bg-red-600"
                      >
                        <ZoomIn className="h-3.5 w-3.5 text-white" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
      {onDisplayScaleChange &&
        floatingSliderOrder != null &&
        floatingAnchor?.orderIndex === floatingSliderOrder && (
          <div
            className="pointer-events-auto absolute z-30 flex flex-col items-end gap-1"
            data-question-size-control
            style={{
              left: floatingAnchor.right,
              top: floatingAnchor.top,
              transform: "translate(-100%, calc(-100% - 4px))",
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-stretch overflow-hidden rounded border-2 border-red-600 bg-red-500 shadow-sm">
              <span className="flex items-center px-1 py-0.5 text-[0.625rem] font-bold leading-none text-white">
                %{floatingSliderPct}
              </span>
              <button
                type="button"
                title="Boyut panelini kapat"
                aria-label="Boyut panelini kapat"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  closeSizeSlider(floatingSliderOrder, false, floatingSliderPct);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex items-center justify-center border-l border-red-400 px-1 py-0.5 hover:bg-red-600"
              >
                <ZoomIn className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
            <div className="flex w-40 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 py-1.5 shadow-md">
              <ZoomIn className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
              <input
                type="range"
                min={MIN_SIZE_PCT}
                max={floatingSliderMaxPct}
                step={1}
                value={floatingSliderPct}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setSliderPctByOrder((prev) => new Map(prev).set(floatingSliderOrder, next));
                  onDisplayScaleChange(floatingSliderOrder, next, "move");
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  scaleSliderActiveRef.current = true;
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  scaleSliderActiveRef.current = false;
                  const v = Number((e.currentTarget as HTMLInputElement).value);
                  onDisplayScaleChange(floatingSliderOrder, v, "commit");
                }}
                className="min-w-0 flex-1"
                style={{ accentColor: "#dc2626", height: 4 }}
                aria-label={`Soru boyutu yüzde ${floatingSliderPct}`}
              />
              <span className="w-8 shrink-0 text-right text-[0.625rem] font-semibold tabular-nums text-slate-700">
                {floatingSliderPct}%
              </span>
            </div>
          </div>
        )}
    </div>
  );
}
