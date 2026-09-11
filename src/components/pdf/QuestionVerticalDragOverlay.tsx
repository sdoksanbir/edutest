import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type MouseEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Frame, Minus, Plus, ZoomIn } from "lucide-react";
import type { LayoutItem } from "../../api/client";
import type { QuestionItem } from "../../types";
import { resolveRequestedScale } from "../../utils/questionScale";
import {
  QUESTION_SELECTION_CLASS,
  QUESTION_SELECTION_ACTIVE_CLASS,
  QUESTION_SELECTION_SELECTED_CLASS,
} from "../../utils/questionSelectionOutline";
import {
  computePageColumnBand,
  DEFAULT_HEADER_BOTTOM_GAP_MM,
  DEFAULT_OTHER_PAGE_HEADER_BOTTOM_GAP_MM,
  DEFAULT_QUESTION_NUMBER_IMAGE_GAP_MM,
  DEFAULT_QUESTION_NUMBER_LEFT_OFFSET_MM,
  FOOTER_TOP_OFFSET_MM,
  liveAlignmentYShiftPtForItem,
  mmToPdfPt,
  type LayoutGeometryInput,
} from "../../utils/pdfLayoutGeometry";
import {
  resolveScratchGridMetrics,
  resolveScratchGridRectPt,
  scratchOccupiedHeightPt,
  scratchPadTopPt,
  SCRATCH_PAD_BOTTOM_PT,
  FASIKUL_MIN_SCRATCH_ROWS,
} from "../../utils/questionScratchGrid";
import {
  clampDraggedYTopPt,
  clientDeltaToYTopDelta,
  getItemTopPt,
  getPageColumnDraggableMeta,
  layoutItemBlockTopPt,
  layoutItemToCanvasRect,
  resolveLayoutItemImageXPt,
  yTopDeltaToClientDelta,
} from "../../utils/questionVerticalDrag";
import {
  getPageColumnShiftMeta,
  type ColumnShiftDirection,
} from "../../utils/columnShift";
import {
  DEFAULT_FASIKUL_QUESTION_FRAME,
  FASIKUL_FRAME_PRESETS,
  buildFasikulOrnekNumberByOrderIndex,
  fasikulFrameShowsScratchGrid,
  normalizeFasikulQuestionFrame,
  type FasikulFrameApplyScope,
  type FasikulFramePresetId,
  type FasikulQuestionFrameSettings,
} from "../../utils/fasikulQuestionFrame";
import FasikulQuestionFrameMenu, {
  FasikulFramePreviewChrome,
} from "../fasikul/FasikulQuestionFrameMenu";
import { useEditorStore } from "../../store/editorStore";

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
    phase: "start" | "move" | "commit" | "cancel" | "persist" | "persistSoft"
  ) => void;
  /** Tutamaç: satır değişince alt soruları kaydır */
  onScratchHandleRowsChange?: (
    orderIndex: number,
    rows: number,
    cellPt: number,
    phase: "move" | "commit",
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
  /** Fasikül: solda çerçeve menü simgesi */
  fasikulFrameControls?: boolean;
  /** Fasikül: sağ tık → boş hazır tasarım ekle */
  onInsertEmptyFasikulFrameAfter?: (
    afterOrderIndex: number,
    presetId: FasikulFramePresetId,
  ) => void;
};

const MIN_SIZE_PCT = 50;
const MAX_SIZE_PCT = 200;

type ResizeCorner = "nw" | "ne" | "sw" | "se";

const RESIZE_CURSOR: Record<ResizeCorner, string> = {
  nw: "nwse-resize",
  se: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
};

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
  onScratchHandleRowsChange,
  getDisplayScaleMaxPct,
  questionNumberLeftOffsetMm = DEFAULT_QUESTION_NUMBER_LEFT_OFFSET_MM,
  questionNumberImageGapMm = DEFAULT_QUESTION_NUMBER_IMAGE_GAP_MM,
  headerBottomGapMm = DEFAULT_HEADER_BOTTOM_GAP_MM,
  otherPageHeaderBottomGapMm = DEFAULT_OTHER_PAGE_HEADER_BOTTOM_GAP_MM,
  layoutLiveRef,
  alignmentPreviewLiveRef,
  onRegisterRedraw,
  fasikulFrameControls = false,
  onInsertEmptyFasikulFrameAfter,
}: Props) {
  const setQuestionFasikulFrame = useEditorStore((s) => s.setQuestionFasikulFrame);
  const applyFasikulFrameToQuestions = useEditorStore((s) => s.applyFasikulFrameToQuestions);
  const setQuestionScratchGridRows = useEditorStore((s) => s.setQuestionScratchGridRows);
  const [frameMenu, setFrameMenu] = useState<{
    orderIndex: number;
    questionId: string;
    anchor: { x: number; y: number };
    avoidRect: { left: number; top: number; right: number; bottom: number };
  } | null>(null);
  const [applyScope, setApplyScope] = useState<FasikulFrameApplyScope>("this");
  const [ctxMenu, setCtxMenu] = useState<{
    orderIndex: number;
    x: number;
    y: number;
    openEkle: boolean;
  } | null>(null);

  const emptyPresets = useMemo(
    () => FASIKUL_FRAME_PRESETS.filter((p) => p.badgeStyle !== "ring-pill"),
    [],
  );

  const openContextMenu = useCallback(
    (e: MouseEvent, orderIndex: number) => {
      if (!fasikulFrameControls || !onInsertEmptyFasikulFrameAfter) return;
      e.preventDefault();
      e.stopPropagation();
      setFrameMenu(null);
      setCtxMenu({
        orderIndex,
        x: e.clientX,
        y: e.clientY,
        openEkle: false,
      });
    },
    [fasikulFrameControls, onInsertEmptyFasikulFrameAfter],
  );

  useEffect(() => {
    if (!ctxMenu) return;
    const close = (ev: Event) => {
      const t = ev.target as HTMLElement | null;
      if (t?.closest?.("[data-fasikul-ctx-menu]")) return;
      setCtxMenu(null);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setCtxMenu(null);
    };
    window.addEventListener("pointerdown", close, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [ctxMenu]);
  useEffect(() => {
    if (!frameMenu) return;
    if (selectedOrderIndices.length > 1) {
      setApplyScope("selected");
    }
  }, [frameMenu?.questionId, selectedOrderIndices.length]);

  const questionByOrder = useMemo(() => {
    const map = new Map<number, QuestionItem>();
    for (const q of questions) map.set(q.order_index, q);
    return map;
  }, [questions]);

  const ornekNumberByOrder = useMemo(
    () => buildFasikulOrnekNumberByOrderIndex(questions),
    [questions],
  );

  const pageOrderIndices = useMemo(
    () =>
      layout
        .filter((it) => it.page === pageNum && typeof it.order_index === "number")
        .map((it) => it.order_index as number),
    [layout, pageNum],
  );

  const frameMenuQuestion = frameMenu
    ? questionByOrder.get(frameMenu.orderIndex)
    : undefined;
  const frameMenuValue: FasikulQuestionFrameSettings = normalizeFasikulQuestionFrame(
    frameMenuQuestion?.fasikulFrame ?? DEFAULT_FASIKUL_QUESTION_FRAME,
  );

  const frameTargetIds = useMemo(() => {
    if (!frameMenuQuestion) return [] as string[];
    if (applyScope === "this") return [frameMenuQuestion.id];
    if (applyScope === "selected") {
      const ids = selectedOrderIndices
        .map((oi) => questionByOrder.get(oi)?.id)
        .filter((id): id is string => Boolean(id));
      return ids.length > 0 ? ids : [frameMenuQuestion.id];
    }
    if (applyScope === "page") {
      return pageOrderIndices
        .map((oi) => questionByOrder.get(oi)?.id)
        .filter((id): id is string => Boolean(id));
    }
    return questions.map((q) => q.id);
  }, [
    applyScope,
    frameMenuQuestion,
    pageOrderIndices,
    questionByOrder,
    questions,
    selectedOrderIndices,
  ]);

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
  const [resizeOrder, setResizeOrder] = useState<number | null>(null);
  const [scratchHoverOrder, setScratchHoverOrder] = useState<number | null>(null);
  const [scratchResizeOrder, setScratchResizeOrder] = useState<number | null>(null);
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
  const scratchResizeRef = useRef<{
    orderIndex: number;
    questionId: string;
    edge: "top" | "bottom";
    startClientY: number;
    startRows: number;
    absoluteMaxRows: number;
    cellPx: number;
    cellPt: number;
    liveRows: number;
  } | null>(null);
  const resizeRef = useRef<{
    orderIndex: number;
    corner: ResizeCorner;
    startPct: number;
    maxPct: number;
    livePct: number;
    startClientX: number;
    startClientY: number;
    startWidth: number;
    startHeight: number;
    element: HTMLElement | null;
  } | null>(null);
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
      ceilingTopPt: number | null;
    } | null;
  } | null>(null);

  const pageItems = useMemo(
    () => layoutData.filter((l) => l.page_num === pageNum && l.kind !== "answer_key_page"),
    [layoutData, pageNum]
  );

  const band = useMemo(() => computePageColumnBand(geometry), [geometry]);
  const metaByOrder = useMemo(
    () => getPageColumnDraggableMeta(layoutData, pageNum, band, geometry),
    [layoutData, pageNum, band, geometry]
  );
  const shiftMeta = useMemo(() => {
    if (!onColumnShift) return new Map<number, { showPrevColumnArrow: boolean; showNextColumnArrow: boolean }>();
    const bandForPage = (p: number) => computePageColumnBand({ ...geometry, pageNum: p });
    return getPageColumnShiftMeta(layoutData, pageNum, columns, maxQuestionPage, bandForPage);
  }, [onColumnShift, layoutData, pageNum, columns, maxQuestionPage, geometry]);

  const displayScaleByOrder = useMemo(() => {
    const m = new Map<number, number>();
    for (const q of questions) {
      m.set(q.order_index, Math.round(resolveRequestedScale(q) * 100));
    }
    return m;
  }, [questions]);

  /** Fasikül kareli alan: sayfa üzerinde konum + satır metrikleri */
  const scratchLayoutByOrder = useMemo(() => {
    const m = new Map<
      number,
      {
        /** Mevcut boşluğa sığan max (butonlar — kaydırma yok) */
        gapMaxRows: number;
        autoRows: number;
        /** Sayfa altına kadar teorik max (tutamaç — kaydırabilir) */
        absoluteMaxRows: number;
        rows: number;
        left: number;
        top: number;
        width: number;
        height: number;
        cellPx: number;
        cellPt: number;
        questionId: string;
      }
    >();
    if (!fasikulFrameControls) return m;
    const footerTopPt =
      mmToPdfPt(geometry.marginBottomMm) + mmToPdfPt(FOOTER_TOP_OFFSET_MM);
    const midX = geometry.pageWpt / 2;
    const numOffsetMm = questionNumberLeftOffsetMm;
    const numGapMm = questionNumberImageGapMm;

    for (const item of pageItems) {
      if (
        item.img_x_pt == null ||
        item.img_y_top_pt == null ||
        item.img_w_pt == null ||
        item.img_h_pt == null
      ) {
        continue;
      }
      const q = questionByOrder.get(item.order_index);
      if (!q) continue;
      if (!fasikulFrameShowsScratchGrid(q.fasikulFrame)) continue;
      const currBottomPt = item.img_y_top_pt - item.img_h_pt;
      const isLeft = item.img_x_pt < midX;
      const below = pageItems.filter(
        (l) =>
          l.img_x_pt != null &&
          l.img_y_top_pt != null &&
          (l.img_x_pt < midX) === isLeft &&
          (l.img_y_top_pt ?? 0) < (item.img_y_top_pt ?? 0),
      );
      const next = below.sort((a, b) => (b.img_y_top_pt ?? 0) - (a.img_y_top_pt ?? 0))[0];
      // Blok üstü = ÖRNEK badge üstü; kareli alan badge üzerine binmesin
      const gapBottomPt = next
        ? (next.y_top_pt ?? next.img_y_top_pt ?? footerTopPt)
        : footerTopPt;
      const questionLeftPt = resolveLayoutItemImageXPt(item, numOffsetMm, numGapMm, {
        committedLeftOffsetMm: questionNumberLeftOffsetMm,
        committedImageGapMm: questionNumberImageGapMm,
      });
      const gridWidthPt = Math.max(0, item.x_pt + item.w_pt - questionLeftPt);
      const metrics = resolveScratchGridMetrics({
        widthPt: gridWidthPt,
        questionBottomPt: currBottomPt,
        gapBottomPt,
        padBottomPt: SCRATCH_PAD_BOTTOM_PT,
      });
      if (!metrics) continue;
      const liveDrag =
        scratchResizeRef.current?.orderIndex === item.order_index
          ? scratchResizeRef.current.liveRows
          : null;
      const rowsOverride =
        liveDrag ??
        (q.scratchGridRows != null && Number.isFinite(q.scratchGridRows)
          ? q.scratchGridRows
          : null);
      const grid = resolveScratchGridRectPt({
        xPt: questionLeftPt,
        widthPt: gridWidthPt,
        questionBottomPt: currBottomPt,
        gapBottomPt,
        padBottomPt: SCRATCH_PAD_BOTTOM_PT,
        rowsOverride,
        minRows: FASIKUL_MIN_SCRATCH_ROWS,
      });
      if (!grid) continue;
      const padTop = scratchPadTopPt(metrics.cellPt);
      const spaceToFooter =
        currBottomPt - footerTopPt - padTop - SCRATCH_PAD_BOTTOM_PT;
      const absoluteMaxRows = Math.max(
        1,
        Math.floor(spaceToFooter / metrics.cellPt),
      );
      m.set(item.order_index, {
        gapMaxRows: metrics.maxRows,
        autoRows: metrics.maxRows,
        absoluteMaxRows,
        rows: grid.rows,
        left: grid.x * scale,
        top: (pageHpt - grid.yTop) * scale,
        width: grid.width * scale,
        height: grid.height * scale,
        cellPx: grid.cellPt * scale,
        cellPt: grid.cellPt,
        questionId: q.id,
      });
    }
    return m;
  }, [
    fasikulFrameControls,
    pageItems,
    geometry.marginBottomMm,
    geometry.pageWpt,
    questionNumberLeftOffsetMm,
    questionNumberImageGapMm,
    questionByOrder,
    scale,
    pageHpt,
    questions,
    scratchResizeOrder,
  ]);

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
      const raw = d.startYTop + clientDeltaToYTopDelta(dy, scale);
      const prevScratch = d.meta.prev
        ? scratchLayoutByOrder.get(d.meta.prev.order_index)
        : undefined;
      let prevScratchBelowPt = 0;
      if (prevScratch) {
        prevScratchBelowPt = scratchOccupiedHeightPt(
          prevScratch.rows,
          prevScratch.cellPt,
        );
      }
      // Kareli alan layout’ta yoksa uydurma yükseklik ekleme — yukarı sürüklemeyi kilitler
      const clamped = clampDraggedYTopPt(
        raw,
        d.item,
        d.meta.prev,
        d.meta.next,
        undefined,
        d.meta.floorTopPt,
        {
          prevScratchBelowPt,
          nextBlockTopPt: d.meta.next ? layoutItemBlockTopPt(d.meta.next) : null,
          startYTopPt: d.startYTop,
          ceilingTopPt: d.meta.ceilingTopPt,
        },
      );
      // Yalnızca gerçek konum değişiminde commit (tıklama / sınır snap yok)
      d.moved = Math.abs(clamped - d.startYTop) > 0.05;

      if (d.element) {
        d.element.style.willChange = "transform";
        const clampedDy = yTopDeltaToClientDelta(clamped - d.startYTop, scale);
        d.element.style.transform = `translate3d(0,${clampedDy}px,0)`;
      }
      onYTopChange(d.orderIndex, clamped, "move", pageNum);
    },
    [onYTopChange, scale, pageNum, scratchLayoutByOrder]
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

  const finishCornerResize = useCallback(() => {
    const d = resizeRef.current;
    resizeRef.current = null;
    setResizeOrder(null);
    if (!d) {
      unlockPageScroll();
      return;
    }
    const el = d.element;
    // Önce ölçeği state'e yaz; transform'u sonra kaldır.
    // width/height'ı "" yapma — React stilini silip hit-box'ı çökertiyordu (2. resize bozuluyordu).
    onDisplayScaleChange?.(d.orderIndex, d.livePct, "persistSoft");
    if (el) {
      el.style.transform = "";
      el.style.transformOrigin = "";
      el.style.willChange = "";
    }
    unlockPageScroll();
  }, [onDisplayScaleChange, unlockPageScroll]);

  const onCornerResizeMove = useCallback(
    (e: PointerEvent) => {
      const d = resizeRef.current;
      if (!d || !onDisplayScaleChange) return;
      const sx = d.corner === "nw" || d.corner === "sw" ? -1 : 1;
      const sy = d.corner === "nw" || d.corner === "ne" ? -1 : 1;
      const dx = e.clientX - d.startClientX;
      const dy = e.clientY - d.startClientY;
      const factorW =
        d.startWidth > 0 ? (d.startWidth + sx * dx) / d.startWidth : 1;
      const factorH =
        d.startHeight > 0 ? (d.startHeight + sy * dy) / d.startHeight : 1;
      // Orantılı ölçek — daha baskın ekseni kullan (daha akıcı his)
      const factor = Math.max(0.05, (Math.abs(factorW) + Math.abs(factorH)) / 2);
      const next = Math.max(
        MIN_SIZE_PCT,
        Math.min(d.maxPct, Math.round(d.startPct * factor)),
      );
      if (next === d.livePct) return;
      d.livePct = next;
      if (d.element) {
        const visual = next / d.startPct;
        d.element.style.willChange = "transform";
        d.element.style.transformOrigin = "0 0";
        d.element.style.transform = `scale(${visual})`;
      }
      // % etiketi için DOM (React re-render yok)
      const badge = d.element?.querySelector("[data-resize-pct-badge]");
      if (badge) badge.textContent = `%${next}`;
      onDisplayScaleChange(d.orderIndex, next, "move");
    },
    [onDisplayScaleChange],
  );

  useEffect(() => {
    if (resizeOrder == null) return;
    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      onCornerResizeMove(e);
    };
    const onUp = () => finishCornerResize();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [resizeOrder, onCornerResizeMove, finishCornerResize]);

  const startCornerResize = useCallback(
    (
      e: React.PointerEvent,
      item: LayoutItem,
      rect: { left: number; top: number; width: number; height: number },
      corner: ResizeCorner,
      sizePct: number,
    ) => {
      if (!onDisplayScaleChange) return;
      e.preventDefault();
      e.stopPropagation();
      onSelectQuestion(item.order_index, { skipScroll: true });
      // Önce session aç — maxPct / baseScale güncel layout+store ile hizalansın
      onDisplayScaleChange(item.order_index, sizePct, "start");
      const maxPct = Math.max(
        sizePct,
        getDisplayScaleMaxPct?.(item.order_index) ?? MAX_SIZE_PCT,
      );
      const startPct = Math.max(MIN_SIZE_PCT, Math.min(maxPct, sizePct));
      resizeRef.current = {
        orderIndex: item.order_index,
        corner,
        startPct,
        maxPct,
        livePct: startPct,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startWidth: Math.max(1, rect.width),
        startHeight: Math.max(1, rect.height),
        element: (e.currentTarget as HTMLElement).closest(
          "[data-question-hit]",
        ) as HTMLElement | null,
      };
      setResizeOrder(item.order_index);
      lockPageScroll();
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [onDisplayScaleChange, onSelectQuestion, getDisplayScaleMaxPct, lockPageScroll],
  );

  const finishScratchResize = useCallback(() => {
    const d = scratchResizeRef.current;
    scratchResizeRef.current = null;
    setScratchResizeOrder(null);
    if (!d) {
      unlockPageScroll();
      return;
    }
    if (onScratchHandleRowsChange) {
      onScratchHandleRowsChange(d.orderIndex, d.liveRows, d.cellPt, "commit");
    } else {
      setQuestionScratchGridRows(d.questionId, d.liveRows);
    }
    unlockPageScroll();
  }, [onScratchHandleRowsChange, setQuestionScratchGridRows, unlockPageScroll]);

  const onScratchResizeMove = useCallback(
    (e: PointerEvent) => {
      const d = scratchResizeRef.current;
      if (!d) return;
      const rawDelta = (e.clientY - d.startClientY) / Math.max(1, d.cellPx);
      const deltaRows = Math.round(d.edge === "top" ? -rawDelta : rawDelta);
      const next = Math.max(
        1,
        Math.min(d.absoluteMaxRows, d.startRows + deltaRows),
      );
      if (next === d.liveRows) return;
      d.liveRows = next;
      if (onScratchHandleRowsChange) {
        onScratchHandleRowsChange(d.orderIndex, next, d.cellPt, "move");
      } else {
        setQuestionScratchGridRows(d.questionId, next);
      }
      const badge = document.querySelector(
        `[data-scratch-resize-badge="${d.orderIndex}"]`,
      );
      if (badge) badge.textContent = `${next}`;
    },
    [onScratchHandleRowsChange, setQuestionScratchGridRows],
  );

  useEffect(() => {
    if (scratchResizeOrder == null) return;
    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      onScratchResizeMove(e);
    };
    const onUp = () => finishScratchResize();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [scratchResizeOrder, onScratchResizeMove, finishScratchResize]);

  const startScratchResize = useCallback(
    (
      e: React.PointerEvent,
      orderIndex: number,
      edge: "top" | "bottom",
      layout: {
        questionId: string;
        rows: number;
        absoluteMaxRows: number;
        cellPx: number;
        cellPt: number;
      },
    ) => {
      e.preventDefault();
      e.stopPropagation();
      onSelectQuestion(orderIndex, { skipScroll: true });
      scratchResizeRef.current = {
        orderIndex,
        questionId: layout.questionId,
        edge,
        startClientY: e.clientY,
        startRows: layout.rows,
        absoluteMaxRows: layout.absoluteMaxRows,
        cellPx: layout.cellPx,
        cellPt: layout.cellPt,
        liveRows: layout.rows,
      };
      setScratchResizeOrder(orderIndex);
      setHoverOrder(orderIndex);
      lockPageScroll();
      if (onScratchHandleRowsChange) {
        onScratchHandleRowsChange(
          orderIndex,
          layout.rows,
          layout.cellPt,
          "move",
        );
      } else {
        setQuestionScratchGridRows(layout.questionId, layout.rows);
      }
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [
      onSelectQuestion,
      lockPageScroll,
      onScratchHandleRowsChange,
      setQuestionScratchGridRows,
    ],
  );

  const adjustScratchRowsInGap = useCallback(
    (questionId: string, nextRows: number, gapMaxRows: number) => {
      const clamped = Math.max(1, Math.min(gapMaxRows, Math.round(nextRows)));
      setQuestionScratchGridRows(questionId, clamped);
    },
    [setQuestionScratchGridRows],
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

  // Seçim kalkınca kaydet (iptal etme) — boş tık ölçeği eski haline getirmesin
  useEffect(() => {
    if (selectedOrderIndices.length === 0 && sizeSliderOrder != null) {
      const pct =
        sliderPctByOrder.get(sizeSliderOrder) ??
        displayScaleByOrder.get(sizeSliderOrder) ??
        100;
      closeSizeSlider(sizeSliderOrder, false, pct);
    }
  }, [
    selectedOrderIndices.length,
    sizeSliderOrder,
    closeSizeSlider,
    sliderPctByOrder,
    displayScaleByOrder,
  ]);

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
        const qItem = questionByOrder.get(item.order_index);
        const frameSettings = normalizeFasikulQuestionFrame(
          qItem?.fasikulFrame ?? DEFAULT_FASIKUL_QUESTION_FRAME,
        );
        const rect = layoutItemToCanvasRect(
          item,
          pageHpt,
          scale,
          numOffsetMm,
          numGapMm,
          yShiftPt,
          {
            stretchWidthToColumn: frameSettings.enabled,
            committedLeftOffsetMm: questionNumberLeftOffsetMm,
            committedImageGapMm: questionNumberImageGapMm,
          },
        );
        if (!rect) return null;
        const resizeRect =
          layoutItemToCanvasRect(
            item,
            pageHpt,
            scale,
            numOffsetMm,
            numGapMm,
            yShiftPt,
            {
              stretchWidthToColumn: false,
              committedLeftOffsetMm: questionNumberLeftOffsetMm,
              committedImageGapMm: questionNumberImageGapMm,
            },
          ) ?? rect;
        const meta = metaByOrder.get(item.order_index);
        const draggable = meta?.draggable ?? false;
        const isHover = hoverOrder === item.order_index;
        const isDragging = dragOrder === item.order_index;
        const isResizing = resizeOrder === item.order_index;
        const isScratchResizing = scratchResizeOrder === item.order_index;
        const isScratchHover = scratchHoverOrder === item.order_index;
        const sizeSliderOpen = sizeSliderOrder === item.order_index;
        const frameMenuOpen = frameMenu?.orderIndex === item.order_index;
        const showControls =
          isHover ||
          isDragging ||
          isResizing ||
          isScratchResizing ||
          isScratchHover ||
          sizeSliderOpen ||
          frameMenuOpen;
        const sizePct =
          isResizing && resizeRef.current?.orderIndex === item.order_index
            ? resizeRef.current.livePct
            : (displayScaleByOrder.get(item.order_index) ?? 100);
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
            data-question-order={item.order_index}
            className={`pointer-events-auto absolute ${isDragging ? "cursor-grabbing" : draggable ? "cursor-ns-resize" : "cursor-pointer"}`}
            style={{
              left: rect.left,
              top: dragStartTop,
              width: rect.width,
              height: rect.height,
            }}
            onPointerEnter={() => setHoverOrder(item.order_index)}
            onPointerLeave={() => {
              if (
                dragOrder !== item.order_index &&
                resizeOrder !== item.order_index &&
                scratchResizeOrder !== item.order_index
              ) {
                setHoverOrder(null);
              }
            }}
            onContextMenu={(e) => openContextMenu(e, item.order_index)}
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest("[data-column-shift-arrow]")) return;
              if ((e.target as HTMLElement).closest("[data-question-size-control]")) return;
              if ((e.target as HTMLElement).closest("[data-question-resize-handle]")) return;
              if ((e.target as HTMLElement).closest("[data-scratch-grid-handle]")) return;
              if ((e.target as HTMLElement).closest("[data-scratch-grid-control]")) return;
              if ((e.target as HTMLElement).closest("[data-fasikul-frame-trigger]")) return;
              if ((e.target as HTMLElement).closest("[data-fasikul-frame-menu]")) return;
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
            {onDisplayScaleChange && (
              <div
                className={`pointer-events-none absolute inset-0 z-30 transition-opacity duration-100 ${
                  showControls ? "opacity-100" : "opacity-0"
                }`}
                aria-hidden={!showControls}
              >
                {(
                  [
                    ["nw", "left-0 top-0 -translate-x-1/2 -translate-y-1/2"],
                    ["ne", "right-0 top-0 translate-x-1/2 -translate-y-1/2"],
                    ["sw", "left-0 bottom-0 -translate-x-1/2 translate-y-1/2"],
                    ["se", "right-0 bottom-0 translate-x-1/2 translate-y-1/2"],
                  ] as const
                ).map(([corner, posClass]) => (
                  <button
                    key={corner}
                    type="button"
                    data-question-resize-handle
                    title="Boyutu değiştir"
                    aria-label={`Soru boyutunu ${corner} köşesinden değiştir`}
                    className={`pointer-events-auto absolute h-3 w-3 rounded-sm border-2 border-sky-500 bg-white shadow-sm ${posClass} ${
                      showControls ? "" : "pointer-events-none"
                    }`}
                    style={{ cursor: RESIZE_CURSOR[corner] }}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      startCornerResize(e, item, resizeRect, corner, sizePct);
                    }}
                  />
                ))}
                {isResizing && (
                  <div
                    data-resize-pct-badge
                    className="pointer-events-none absolute left-1/2 top-0 z-40 -translate-x-1/2 -translate-y-[120%] rounded bg-sky-600 px-1.5 py-0.5 text-[0.625rem] font-bold tabular-nums text-white shadow"
                  >
                    %{sizePct}
                  </div>
                )}
              </div>
            )}
            {fasikulFrameControls && (
              <FasikulFramePreviewChrome
                settings={frameSettings}
                questionNumber={
                  ornekNumberByOrder.get(item.order_index) ?? null
                }
              />
            )}
            {fasikulFrameControls && (
              <div
                className={`absolute left-0 top-3 z-20 -translate-x-1/2 transition-opacity duration-150 ${
                  showControls
                    ? "opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
                data-fasikul-frame-trigger
              >
                <button
                  type="button"
                  title="Soru çerçevesi"
                  aria-label="Soru çerçevesi menüsünü aç"
                  aria-expanded={frameMenuOpen}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!qItem) return;
                    const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                    if (frameMenuOpen) {
                      setFrameMenu(null);
                      return;
                    }
                    const hit = (e.currentTarget as HTMLElement).closest(
                      "[data-question-hit]",
                    ) as HTMLElement | null;
                    const hr = hit?.getBoundingClientRect();
                    setFrameMenu({
                      orderIndex: item.order_index,
                      questionId: qItem.id,
                      anchor: { x: r.right, y: r.top },
                      avoidRect: hr
                        ? {
                            left: hr.left,
                            top: hr.top,
                            right: hr.right,
                            bottom: hr.bottom,
                          }
                        : {
                            left: r.left,
                            top: r.top,
                            right: r.right,
                            bottom: r.bottom,
                          },
                    });
                    onSelectQuestion(item.order_index, { skipScroll: true });
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className={`pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full shadow-sm ring-1 transition hover:scale-105 active:scale-95 ${
                    frameMenuOpen
                      ? "bg-violet-600 text-white ring-violet-300"
                      : "bg-white/95 text-slate-700 ring-slate-300 hover:bg-violet-50 hover:text-violet-700"
                  }`}
                >
                  <Frame className="h-3.5 w-3.5" strokeWidth={2.25} />
                </button>
              </div>
            )}
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
                      <button
                        type="button"
                        title="Yazıyı küçült (−%5)"
                        aria-label="Yazı ölçeğini küçült"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const next = Math.max(MIN_SIZE_PCT, sizePct - 5);
                          onDisplayScaleChange(item.order_index, next, "start");
                          onDisplayScaleChange(item.order_index, next, "persist");
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="flex items-center justify-center px-1 py-0.5 transition hover:bg-red-600"
                      >
                        <Minus className="h-3 w-3 text-white" />
                      </button>
                      <span className="flex items-center border-x border-red-400 px-1 py-0.5 text-[0.625rem] font-bold leading-none text-white">
                        %{sizePct}
                      </span>
                      <button
                        type="button"
                        title="Yazıyı büyüt (+%5)"
                        aria-label="Yazı ölçeğini büyüt"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const maxPct = getDisplayScaleMaxPct?.(item.order_index) ?? MAX_SIZE_PCT;
                          const next = Math.min(maxPct, sizePct + 5);
                          onDisplayScaleChange(item.order_index, next, "start");
                          onDisplayScaleChange(item.order_index, next, "persist");
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="flex items-center justify-center px-1 py-0.5 transition hover:bg-red-600"
                      >
                        <Plus className="h-3 w-3 text-white" />
                      </button>
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
      {fasikulFrameControls &&
        Array.from(scratchLayoutByOrder.entries()).map(([orderIndex, g]) => {
          const showScratchChrome =
            hoverOrder === orderIndex ||
            scratchHoverOrder === orderIndex ||
            scratchResizeOrder === orderIndex ||
            selectedOrderIndices.includes(orderIndex);
          const isScratchResizing = scratchResizeOrder === orderIndex;
          const handleLayout = {
            questionId: g.questionId,
            rows: g.rows,
            absoluteMaxRows: g.absoluteMaxRows,
            cellPx: g.cellPx,
            cellPt: g.cellPt,
          };
          return (
            <div
              key={`scratch-hit-${orderIndex}`}
              data-scratch-grid-control
              className="pointer-events-auto absolute z-[19]"
              style={{
                left: g.left,
                top: g.top,
                width: g.width,
                height: Math.max(g.height, 12),
              }}
              onContextMenu={(e) => openContextMenu(e, orderIndex)}
            >
              {/* Üst kenar orta tutamaç — diğer sorular kayar */}
              <button
                type="button"
                data-scratch-grid-handle
                title="Kareli alan yüksekliği (sürükle — sorular kayar)"
                aria-label="Kareli alan üst tutamacı"
                className={`pointer-events-auto absolute left-1/2 top-0 z-20 flex h-3 w-14 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize items-center justify-center rounded-full border-2 border-emerald-500 bg-white shadow-md transition-opacity hover:scale-105 ${
                  showScratchChrome ? "opacity-100" : "pointer-events-none opacity-0"
                } ${isScratchResizing ? "bg-emerald-100" : ""}`}
                onPointerEnter={() => {
                  setScratchHoverOrder(orderIndex);
                  setHoverOrder(orderIndex);
                }}
                onPointerLeave={() => {
                  if (scratchResizeOrder !== orderIndex) setScratchHoverOrder(null);
                }}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  startScratchResize(e, orderIndex, "top", handleLayout);
                }}
              >
                <span className="block h-0.5 w-8 rounded-full bg-emerald-500" aria-hidden />
              </button>

              {/* Alt kenar orta tutamaç — diğer sorular kayar */}
              <button
                type="button"
                data-scratch-grid-handle
                title="Kareli alan yüksekliği (sürükle — sorular kayar)"
                aria-label="Kareli alan alt tutamacı"
                className={`pointer-events-auto absolute bottom-0 left-1/2 z-20 flex h-3 w-14 -translate-x-1/2 translate-y-1/2 cursor-ns-resize items-center justify-center rounded-full border-2 border-emerald-500 bg-white shadow-md transition-opacity hover:scale-105 ${
                  showScratchChrome ? "opacity-100" : "pointer-events-none opacity-0"
                } ${isScratchResizing ? "bg-emerald-100" : ""}`}
                onPointerEnter={() => {
                  setScratchHoverOrder(orderIndex);
                  setHoverOrder(orderIndex);
                }}
                onPointerLeave={() => {
                  if (scratchResizeOrder !== orderIndex) setScratchHoverOrder(null);
                }}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  startScratchResize(e, orderIndex, "bottom", handleLayout);
                }}
              >
                <span className="block h-0.5 w-8 rounded-full bg-emerald-500" aria-hidden />
              </button>

              {/* Sağ orta: + / satır / − — sadece satır, kaydırma yok */}
              <div
                className={`pointer-events-auto absolute right-0 top-1/2 z-20 flex -translate-y-1/2 translate-x-1/2 flex-col items-stretch overflow-hidden rounded border border-emerald-600 bg-emerald-700/95 shadow-md transition-opacity ${
                  showScratchChrome ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                data-scratch-grid-control
                onPointerEnter={() => {
                  setScratchHoverOrder(orderIndex);
                  setHoverOrder(orderIndex);
                }}
                onPointerLeave={() => {
                  if (scratchResizeOrder !== orderIndex) setScratchHoverOrder(null);
                }}
              >
                <button
                  type="button"
                  title="Satır ekle (sorular kaymaz)"
                  aria-label="Kareli alan satır artır"
                  disabled={g.rows >= g.gapMaxRows}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    adjustScratchRowsInGap(g.questionId, g.rows + 1, g.gapMaxRows);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="flex items-center justify-center px-1.5 py-1 text-white transition hover:bg-emerald-600 disabled:opacity-35"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <div
                  data-scratch-resize-badge={orderIndex}
                  className="min-w-[2rem] border-y border-emerald-500/80 px-1 py-0.5 text-center text-[0.625rem] font-bold tabular-nums leading-none text-white"
                  title={`Boşluk içi maks ${g.gapMaxRows} satır`}
                >
                  {g.rows}
                </div>
                <button
                  type="button"
                  title="Satır azalt (sorular kaymaz)"
                  aria-label="Kareli alan satır azalt"
                  disabled={g.rows <= 1}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    adjustScratchRowsInGap(g.questionId, g.rows - 1, g.gapMaxRows);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="flex items-center justify-center px-1.5 py-1 text-white transition hover:bg-emerald-600 disabled:opacity-35"
                >
                  <Minus className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      {fasikulFrameControls && frameMenu && frameMenuQuestion && (
        <FasikulQuestionFrameMenu
          open
          anchor={frameMenu.anchor}
          avoidRect={frameMenu.avoidRect}
          avoidOrderIndex={frameMenu.orderIndex}
          value={frameMenuValue}
          onChange={(next) => {
            if (applyScope === "this" || frameTargetIds.length <= 1) {
              setQuestionFasikulFrame(frameMenu.questionId, next);
              return;
            }
            applyFasikulFrameToQuestions(frameTargetIds, next);
          }}
          onClose={() => setFrameMenu(null)}
          applyScope={applyScope}
          onApplyScopeChange={setApplyScope}
          targetCount={frameTargetIds.length}
          selectedCount={selectedOrderIndices.length}
          onApplyNow={() => {
            const payload = {
              ...frameMenuValue,
              enabled: true,
            };
            if (applyScope === "this") {
              setQuestionFasikulFrame(frameMenu.questionId, payload);
            } else {
              applyFasikulFrameToQuestions(frameTargetIds, payload);
            }
          }}
        />
      )}
      {fasikulFrameControls &&
        ctxMenu &&
        onInsertEmptyFasikulFrameAfter &&
        createPortal(
          <div
            data-fasikul-ctx-menu
            className="fixed z-[10050] min-w-[11rem] rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
            onPointerDown={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
              onClick={(e) => {
                e.stopPropagation();
                setCtxMenu((m) => (m ? { ...m, openEkle: !m.openEkle } : m));
              }}
            >
              Ekle
              <span className="text-slate-400">{ctxMenu.openEkle ? "▾" : "▸"}</span>
            </button>
            {ctxMenu.openEkle && (
              <div className="border-t border-slate-100 py-1">
                {emptyPresets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] font-medium text-slate-600 hover:bg-orange-50 hover:text-orange-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInsertEmptyFasikulFrameAfter(
                        ctxMenu.orderIndex,
                        p.id as FasikulFramePresetId,
                      );
                      setCtxMenu(null);
                    }}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ background: p.accent }}
                      aria-hidden
                    />
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>,
          document.body,
        )}
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
