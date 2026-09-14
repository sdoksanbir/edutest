import CollapsibleCard from "./CollapsibleCard";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { QuestionItem, SectionRange } from "../../types";
import { computeOptikFormStats, type OptikChoice } from "../../utils/optikFormStats";
import {
  isOptikAnswerableQuestion,
  readingOrderIdsAfterBulkMove,
  readingOrderIdsAfterMove,
  readingOrderIdsInsertAfter,
  resolveOptikFrameAccentColor,
  resolveOptikFrameFillColor,
  resolveOptikFrameSidebarLabel,
  swapReadingOrderIds,
} from "../../utils/optikFormOrder";
import {
  buildFasikulOrnekNumberByOrderIndex,
  normalizeFasikulQuestionFrame,
} from "../../utils/fasikulQuestionFrame";
import { SECTION_DEFAULT_FILL, SECTION_DEFAULT_TEXT } from "./ColorSwatchPicker";

type Props = {
  questions: QuestionItem[];
  sections?: SectionRange[];
  /** order_index → display_number (layout ile aynı) */
  displayNumberByOrder?: Map<number, number | null>;
  onReorder?: (orderedIds: string[]) => void | Promise<void>;
  onQuestionNavigate?: (questionId: string) => void;
  /** Shift ile iki soru (ve arası) seçildiğinde bölüm ekle */
  onRequestSectionRange?: (startIdx: number, endIdx: number) => void;
};

type SwapPrompt = {
  idA: string;
  idB: string;
  labelA: string;
  labelB: string;
};

function DistributionBar({
  label,
  count,
  maxCount,
}: {
  label: OptikChoice;
  count: number;
  maxCount: number;
}) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 shrink-0 text-xs font-semibold text-slate-600">{label}</span>
      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-4 shrink-0 text-right text-xs font-medium text-slate-500">{count}</span>
    </div>
  );
}

function normalizeAnswer(raw?: string): OptikChoice | null {
  const v = (raw ?? "").trim().toUpperCase();
  if (["A", "B", "C", "D", "E"].includes(v)) return v as OptikChoice;
  return null;
}

function SwapConfirmDialog({
  labelA,
  labelB,
  onConfirm,
  onCancel,
}: {
  labelA: string;
  labelB: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/45 p-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="optik-swap-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="optik-swap-title" className="text-sm font-bold text-slate-800">
          Soru yer değiştirme
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">
          <span className="font-semibold text-slate-800">{labelA}</span> ile{" "}
          <span className="font-semibold text-slate-800">{labelB}</span>
          {" "}öğelerinin yerini değiştirmek istiyor musunuz?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Hayır
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700"
          >
            Evet, değiştir
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function answerBubbleClass(selected: boolean, unmarked: boolean): string {
  if (selected) {
    return "optik-form-bubble flex shrink-0 items-center justify-center rounded-full border border-emerald-600 bg-emerald-600 font-bold text-white";
  }
  if (unmarked) {
    return "optik-form-bubble flex shrink-0 items-center justify-center rounded-full border border-red-400 bg-red-100 font-bold text-red-700";
  }
  return "optik-form-bubble flex shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white font-bold text-slate-500";
}

function optikRowShellClass(
  state: {
    isDragging: boolean;
    ctrlSelected: boolean;
    unmarked: boolean;
    frameFill?: string | null;
  },
): string {
  if (state.isDragging) {
    return "z-10 border-sky-400 bg-sky-50/90 opacity-80 shadow-md";
  }
  if (state.ctrlSelected) {
    return "border-sky-500 bg-sky-50 ring-2 ring-sky-400/60";
  }
  if (state.unmarked) {
    return "border-red-400 bg-red-50 ring-1 ring-red-200";
  }
  if (state.frameFill) {
    return "border-black/10";
  }
  return "border-slate-100 bg-slate-50/80";
}

function SortableOptikRow({
  question,
  number,
  label,
  isFrameRow,
  accentColor,
  fillColor,
  gridOptions,
  ctrlSelected,
  rangeSelected,
  bulkGhost,
  onCtrlSelect,
  onRowPointerDown,
  onNavigate,
}: {
  question: QuestionItem;
  number: number | null;
  label: string;
  isFrameRow: boolean;
  accentColor?: string | null;
  fillColor?: string | null;
  gridOptions: OptikChoice[];
  ctrlSelected?: boolean;
  rangeSelected?: boolean;
  bulkGhost?: boolean;
  onCtrlSelect?: (
    questionId: string,
    e: {
      ctrlKey: boolean;
      metaKey: boolean;
      shiftKey: boolean;
      preventDefault: () => void;
      stopPropagation: () => void;
    },
  ) => void;
  onRowPointerDown?: (
    questionId: string,
    e: {
      shiftKey: boolean;
      ctrlKey: boolean;
      metaKey: boolean;
      preventDefault: () => void;
      stopPropagation: () => void;
    },
  ) => void;
  onNavigate?: (questionId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  });
  const answer = normalizeAnswer(question.answer_key);
  const unmarked = !isFrameRow && answer === null;
  const showFrameChrome = Boolean(accentColor);
  const useFrameStyle =
    Boolean(fillColor) && !ctrlSelected && !rangeSelected && !isDragging && !unmarked;

  const handleGripPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      onCtrlSelect?.(question.id, e);
      return;
    }
    listeners?.onPointerDown?.(e);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: bulkGhost ? 0.35 : undefined,
        ...(useFrameStyle
          ? { backgroundColor: fillColor!, borderColor: accentColor ?? fillColor! }
          : null),
      }}
      onPointerDown={(e) => {
        if (e.shiftKey && onRowPointerDown) {
          e.preventDefault();
          e.stopPropagation();
          onRowPointerDown(question.id, e);
          return;
        }
        if ((e.ctrlKey || e.metaKey) && onCtrlSelect) {
          // Odaklanma / scrollIntoView tetiklenmesin
          e.preventDefault();
          e.stopPropagation();
          onCtrlSelect(question.id, e);
          return;
        }
      }}
      onClick={(e) => {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          e.preventDefault();
          return;
        }
        if ((e.target as HTMLElement).closest("button")) return;
        onNavigate?.(question.id);
      }}
      className={`optik-form-row flex items-center gap-1 rounded-lg border px-1 py-0.5 transition ${
        onNavigate || onRowPointerDown ? "cursor-pointer hover:brightness-[0.98]" : "cursor-default"
      } ${optikRowShellClass({
        isDragging,
        ctrlSelected: Boolean(ctrlSelected) || Boolean(rangeSelected),
        unmarked,
        frameFill: useFrameStyle ? fillColor : null,
      })}`}
    >
      <button
        type="button"
        className={`flex shrink-0 cursor-grab touch-none items-center justify-center rounded p-0.5 transition hover:bg-black/5 active:cursor-grabbing ${
          unmarked ? "text-red-500 hover:text-red-700" : "text-slate-400 hover:text-slate-600"
        }`}
        aria-label={isFrameRow || showFrameChrome ? `${label} taşı` : `Soru ${number} taşı`}
        title="Sürükleyerek sırala"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handleGripPointerDown}
        {...attributes}
        tabIndex={-1}
      >
        <GripVertical className="h-3.5 w-3.5" aria-hidden />
      </button>
      <span
        className={`min-w-[3.25rem] max-w-[7rem] shrink-0 truncate text-[0.6875rem] font-bold ${
          showFrameChrome ? "" : unmarked ? "text-red-700" : "text-slate-700"
        }`}
        style={showFrameChrome ? { color: accentColor ?? undefined } : undefined}
        title={label}
      >
        {isFrameRow || showFrameChrome ? label : number}
      </span>
      {!isFrameRow ? (
        <div className="optik-form-bubbles">
          {gridOptions.map((opt) => {
            const selected = answer === opt;
            return (
              <span
                key={opt}
                className={answerBubbleClass(selected, unmarked)}
                aria-label={`Soru ${number ?? label}, şık ${opt}${selected ? ", doğru cevap" : ""}`}
              >
                {opt}
              </span>
            );
          })}
        </div>
      ) : (
        <span className="truncate text-[0.625rem] font-medium text-slate-400">cevap yok</span>
      )}
    </div>
  );
}

function OptikRowPreview({
  question,
  number,
  label,
  isFrameRow,
  accentColor,
  fillColor,
  gridOptions,
  bulkCount,
}: {
  question: QuestionItem;
  number: number | null;
  label: string;
  isFrameRow: boolean;
  accentColor?: string | null;
  fillColor?: string | null;
  gridOptions: OptikChoice[];
  bulkCount?: number;
}) {
  const answer = normalizeAnswer(question.answer_key);
  const unmarked = !isFrameRow && answer === null;
  const showFrameChrome = Boolean(accentColor);
  return (
    <div className="relative">
      {bulkCount != null && bulkCount > 1 ? (
        <span className="absolute -right-1 -top-1 z-10 rounded-full bg-sky-600 px-1.5 py-0.5 text-[0.625rem] font-bold text-white shadow">
          {bulkCount}
        </span>
      ) : null}
      <div
        className={`optik-form-row flex items-center gap-1 rounded-lg border px-1 py-0.5 shadow-lg ${optikRowShellClass(
          {
            isDragging: false,
            ctrlSelected: false,
            unmarked,
            frameFill: fillColor,
          },
        )}`}
        style={
          fillColor && !unmarked
            ? { backgroundColor: fillColor, borderColor: accentColor ?? fillColor }
            : undefined
        }
      >
        <GripVertical
          className={`h-3 w-3 shrink-0 ${unmarked ? "text-red-600" : "text-slate-500"}`}
          aria-hidden
        />
        <span
          className={`min-w-[3.25rem] max-w-[7rem] shrink-0 truncate text-[0.6875rem] font-bold ${
            showFrameChrome ? "" : unmarked ? "text-red-700" : "text-slate-700"
          }`}
          style={showFrameChrome ? { color: accentColor ?? undefined } : undefined}
        >
          {isFrameRow || showFrameChrome ? label : number}
        </span>
        {!isFrameRow ? (
          <div className="optik-form-bubbles">
            {gridOptions.map((opt) => {
              const selected = answer === opt;
              return (
                <span key={opt} className={answerBubbleClass(selected, unmarked)}>
                  {opt}
                </span>
              );
            })}
          </div>
        ) : (
          <span className="truncate text-[0.625rem] font-medium text-slate-400">cevap yok</span>
        )}
      </div>
    </div>
  );
}

export default function OptikFormSidebar({
  questions,
  sections = [],
  displayNumberByOrder,
  onReorder,
  onQuestionNavigate,
  onRequestSectionRange,
}: Props) {
  const stats = useMemo(() => computeOptikFormStats(questions), [questions]);
  const gridOptions = stats.activeOptions;
  const sectionByStart = useMemo(() => {
    const m = new Map<number, SectionRange>();
    for (const s of sections) m.set(s.start_idx, s);
    return m;
  }, [sections]);

  const rowMeta = useMemo(() => {
    let fallbackN = 0;
    const ornekByOrder = buildFasikulOrnekNumberByOrderIndex(questions);
    return questions.map((q) => {
      const answerable = isOptikAnswerableQuestion(q);
      const frame = q.fasikulFrame
        ? normalizeFasikulQuestionFrame(q.fasikulFrame)
        : null;
      const frameEnabled = Boolean(frame?.enabled);
      const accentColor = resolveOptikFrameAccentColor(q);
      const fillColor = resolveOptikFrameFillColor(q);
      if (!answerable) {
        const label = resolveOptikFrameSidebarLabel(q, ornekByOrder);
        return {
          id: q.id,
          isFrameRow: true as const,
          number: null as number | null,
          label,
          swapLabel: label,
          accentColor,
          fillColor,
        };
      }
      fallbackN += 1;
      const fromLayout = displayNumberByOrder?.get(q.order_index);
      const n =
        fromLayout != null && Number.isFinite(fromLayout) ? fromLayout : fallbackN;
      const frameLabel = frameEnabled
        ? resolveOptikFrameSidebarLabel(q, ornekByOrder)
        : null;
      return {
        id: q.id,
        isFrameRow: false as const,
        number: n,
        label: frameLabel ?? String(n),
        swapLabel: frameLabel ?? `${n}. soru`,
        accentColor: frameEnabled ? accentColor : null,
        fillColor: frameEnabled ? fillColor : null,
      };
    });
  }, [questions, displayNumberByOrder]);
  const metaById = useMemo(() => {
    const m = new Map<string, (typeof rowMeta)[number]>();
    for (const r of rowMeta) m.set(r.id, r);
    return m;
  }, [rowMeta]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ctrlSelectedIds, setCtrlSelectedIds] = useState<string[]>([]);
  const [shiftAnchorId, setShiftAnchorId] = useState<string | null>(null);
  const [rangeSelectedIds, setRangeSelectedIds] = useState<string[]>([]);
  const [swapPrompt, setSwapPrompt] = useState<SwapPrompt | null>(null);
  const [bulkDragCount, setBulkDragCount] = useState(0);
  const dragMoveIdsRef = useRef<string[]>([]);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const listScrollTopRef = useRef(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  // Seçim bandı açılınca / satır ring değişince scrollIntoView kaymasını geri al
  useLayoutEffect(() => {
    const el = listScrollRef.current;
    if (!el) return;
    el.scrollTop = listScrollTopRef.current;
  }, [ctrlSelectedIds]);

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    setActiveId(id);
    setRangeSelectedIds([]);
    setSwapPrompt(null);
    if (ctrlSelectedIds.includes(id) && ctrlSelectedIds.length > 1) {
      const ordered = questions
        .map((q) => q.id)
        .filter((qid) => ctrlSelectedIds.includes(qid));
      dragMoveIdsRef.current = ordered;
      setBulkDragCount(ordered.length);
    } else {
      dragMoveIdsRef.current = [id];
      setBulkDragCount(1);
      if (!ctrlSelectedIds.includes(id)) {
        setCtrlSelectedIds([]);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    setBulkDragCount(0);
    const { active, over } = event;
    const moving = dragMoveIdsRef.current;
    dragMoveIdsRef.current = [];
    if (!over || !onReorder) return;
    const overId = String(over.id);
    const activeIdStr = String(active.id);
    if (moving.length <= 1) {
      if (overId === activeIdStr) return;
      const ids = questions.map((q) => q.id);
      onReorder(readingOrderIdsAfterMove(ids, activeIdStr, overId));
      setCtrlSelectedIds([]);
      return;
    }
    if (moving.includes(overId)) return;
    const ids = questions.map((q) => q.id);
    onReorder(readingOrderIdsAfterBulkMove(ids, moving, overId));
    setCtrlSelectedIds([]);
  };

  const handleCtrlSelect = (
    questionId: string,
    e: {
      ctrlKey: boolean;
      metaKey: boolean;
      shiftKey?: boolean;
      preventDefault: () => void;
      stopPropagation: () => void;
    },
  ) => {
    if (!onReorder || swapPrompt) return;
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    e.stopPropagation();
    if (listScrollRef.current) {
      listScrollTopRef.current = listScrollRef.current.scrollTop;
    }
    setRangeSelectedIds([]);
    setShiftAnchorId(null);

    // Ctrl+Shift: seçim aralığını genişlet (bölüm modalı açmadan)
    if (e.shiftKey && ctrlSelectedIds.length > 0) {
      const ids = questions.map((q) => q.id);
      const anchorId = ctrlSelectedIds[ctrlSelectedIds.length - 1]!;
      const a = ids.indexOf(anchorId);
      const b = ids.indexOf(questionId);
      if (a >= 0 && b >= 0) {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        const range = ids.slice(lo, hi + 1);
        setCtrlSelectedIds((prev) => {
          const set = new Set(prev);
          for (const id of range) set.add(id);
          return ids.filter((id) => set.has(id));
        });
      }
      return;
    }

    setCtrlSelectedIds((prev) => {
      if (prev.includes(questionId)) {
        return prev.filter((id) => id !== questionId);
      }
      return [...prev, questionId];
    });
  };

  const handleShiftRange = (
    questionId: string,
    e: {
      shiftKey: boolean;
      ctrlKey: boolean;
      metaKey: boolean;
      preventDefault: () => void;
      stopPropagation: () => void;
    },
  ) => {
    if (!e.shiftKey) return;
    // Ctrl+Shift seçim için ctrl handler'a bırak
    if (e.ctrlKey || e.metaKey) return;
    if (!onRequestSectionRange) return;
    e.preventDefault();
    e.stopPropagation();
    setCtrlSelectedIds([]);
    setSwapPrompt(null);

    const orders = questions.map((q) => q.order_index);
    const ids = questions.map((q) => q.id);
    const clickedIdx = ids.indexOf(questionId);
    if (clickedIdx < 0) return;

    if (!shiftAnchorId) {
      setShiftAnchorId(questionId);
      setRangeSelectedIds([questionId]);
      onQuestionNavigate?.(questionId);
      return;
    }

    const anchorIdx = ids.indexOf(shiftAnchorId);
    if (anchorIdx < 0) {
      setShiftAnchorId(questionId);
      setRangeSelectedIds([questionId]);
      return;
    }

    const startPos = Math.min(anchorIdx, clickedIdx);
    const endPos = Math.max(anchorIdx, clickedIdx);
    const rangeIds = ids.slice(startPos, endPos + 1);
    setRangeSelectedIds(rangeIds);

    const startOrder = Math.min(orders[startPos]!, orders[endPos]!);
    const endOrder = Math.max(orders[startPos]!, orders[endPos]!);
    if (endOrder > startOrder || rangeIds.length > 1) {
      onRequestSectionRange(startOrder, endOrder);
    }
  };

  const cancelSwap = () => {
    setSwapPrompt(null);
  };

  const confirmSwap = () => {
    if (!swapPrompt || !onReorder) {
      cancelSwap();
      return;
    }
    const ids = questions.map((q) => q.id);
    onReorder(swapReadingOrderIds(ids, swapPrompt.idA, swapPrompt.idB));
    setSwapPrompt(null);
    setCtrlSelectedIds([]);
  };

  const openSwapFromSelection = () => {
    if (ctrlSelectedIds.length !== 2) return;
    const [idA, idB] = ctrlSelectedIds;
    if (!idA || !idB) return;
    setSwapPrompt({
      idA,
      idB,
      labelA: metaById.get(idA)?.swapLabel ?? idA,
      labelB: metaById.get(idB)?.swapLabel ?? idB,
    });
  };

  /** Seçili soruları hedef sorunun altına taşı (Ctrl seçim + normal tık) */
  const moveSelectionUnder = (targetId: string) => {
    if (!onReorder || ctrlSelectedIds.length === 0) return false;
    if (ctrlSelectedIds.includes(targetId)) return false;
    const ids = questions.map((q) => q.id);
    const orderedSelected = ids.filter((id) => ctrlSelectedIds.includes(id));
    if (orderedSelected.length === 0) return false;
    const next = readingOrderIdsInsertAfter(ids, orderedSelected, targetId);
    if (next === ids || next.every((id, i) => id === ids[i])) return false;
    onReorder(next);
    setCtrlSelectedIds([]);
    setRangeSelectedIds([]);
    return true;
  };

  const activeQuestion = activeId ? questions.find((q) => q.id === activeId) : null;
  const activeMeta = activeId ? metaById.get(activeId) : undefined;

  return (
    <>
      <aside className="pdf-preview-sidebar-scroll flex h-full min-h-0 w-full min-w-0 max-w-full shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-[#eef2f6] shadow-inner">
        <div className="flex shrink-0 items-center border-b border-slate-200/80 bg-white/70 px-2.5 py-2">
          <h2 className="truncate text-xs font-bold tracking-wide text-slate-700">Optik form</h2>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2">
          <CollapsibleCard
            variant="panel"
            title="Cevap dağılımı"
            titleClassName="mb-0 text-[0.6875rem] font-bold uppercase tracking-wide text-slate-600"
            className="mb-0 shrink-0"
            defaultOpen={false}
            headerExtra={
              <span
                className={`rounded-full px-2 py-0.5 text-[0.625rem] font-semibold ${
                  stats.isBalanced
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {stats.isBalanced ? "Dengeli ✓" : "Dengesiz"}
              </span>
            }
          >
            <div className="space-y-1.5">
              {gridOptions.map((opt) => (
                <DistributionBar
                  key={opt}
                  label={opt}
                  count={stats.counts[opt]}
                  maxCount={stats.maxCount}
                />
              ))}
            </div>
          </CollapsibleCard>

          <CollapsibleCard
            variant="panel"
            title="İşaretlenmemiş"
            titleClassName="mb-0 text-[0.6875rem] font-bold uppercase tracking-wide text-slate-600"
            className="mb-0 shrink-0"
            defaultOpen={false}
            headerExtra={
              <span
                className={`rounded-full px-2 py-0.5 text-[0.625rem] font-semibold ${
                  stats.unmarkedCount === 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {stats.unmarkedCount} soru
              </span>
            }
          >
            <p
              className={`text-xs ${
                stats.unmarkedCount === 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {stats.unmarkedCount === 0
                ? "Tüm sorular işaretli"
                : `${stats.unmarkedCount} sorunun cevabı eksik`}
            </p>
          </CollapsibleCard>

          <CollapsibleCard
            variant="panel"
            title="Optik form"
            titleClassName="mb-0 text-[0.6875rem] font-bold uppercase tracking-wide text-slate-600"
            className="mb-0 min-h-0 flex-1"
            fill
            defaultOpen
            headerExtra={
              onReorder && questions.length > 1 ? (
                <span className="text-[0.625rem] text-slate-400">Ctrl · Shift</span>
              ) : undefined
            }
            contentClassName="flex min-h-0 flex-1 flex-col"
          >
            {onReorder && questions.length > 1 && (
              <p className="mb-1 shrink-0 text-[0.625rem] text-slate-400">
                Ctrl+tık: seç · sonra hedef soruya tıkla (altına taşınır) · Shift: bölüm
              </p>
            )}
            <div
              ref={listScrollRef}
              className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden pr-0.5"
              onScroll={(e) => {
                listScrollTopRef.current = e.currentTarget.scrollTop;
              }}
            >
              {onReorder && ctrlSelectedIds.length > 0 && (
                <div className="sticky top-0 z-10 mb-1 flex flex-wrap items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50/95 px-2 py-1 shadow-sm backdrop-blur-sm">
                  <span className="text-[0.625rem] font-semibold text-sky-800">
                    {ctrlSelectedIds.length} soru seçili
                  </span>
                  <span className="text-[0.625rem] text-sky-700">
                    · altına eklemek için hedef soruya tıklayın
                  </span>
                  {ctrlSelectedIds.length === 2 ? (
                    <button
                      type="button"
                      onClick={openSwapFromSelection}
                      className="rounded-md bg-sky-600 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white hover:bg-sky-700"
                    >
                      Yer değiştir
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setCtrlSelectedIds([])}
                    className="ml-auto rounded-md border border-sky-300 px-1.5 py-0.5 text-[0.625rem] font-medium text-sky-700 hover:bg-white"
                  >
                    Temizle
                  </button>
                </div>
              )}
              {!onReorder && onRequestSectionRange && questions.length > 1 && (
                <p className="mb-1 shrink-0 text-[0.625rem] text-slate-400">
                  Shift+tık ile iki soru seçerek bölüm ekleyin
                </p>
              )}
              {questions.length === 0 ? (
                <p className="text-xs text-slate-400">Henüz soru yok.</p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                    {questions.map((q) => {
                      const meta = metaById.get(q.id)!;
                      const section = sectionByStart.get(q.order_index);
                      return (
                        <div key={q.id} className="space-y-1">
                          {section ? (
                            <div
                              className="rounded-md px-2 py-1 text-[0.625rem] font-bold tracking-wide shadow-sm"
                              style={{
                                backgroundColor: section.fill_color || SECTION_DEFAULT_FILL,
                                color: section.text_color || SECTION_DEFAULT_TEXT,
                              }}
                              title={`Soru ${section.start_idx + 1}–${section.end_idx + 1}`}
                            >
                              {(section.title || "Bölüm").trim()}
                            </div>
                          ) : null}
                          <SortableOptikRow
                            question={q}
                            number={meta.number}
                            label={meta.label}
                            isFrameRow={meta.isFrameRow}
                            accentColor={meta.accentColor}
                            fillColor={meta.fillColor}
                            gridOptions={gridOptions}
                            ctrlSelected={ctrlSelectedIds.includes(q.id)}
                            rangeSelected={rangeSelectedIds.includes(q.id)}
                            bulkGhost={
                              bulkDragCount > 1 &&
                              ctrlSelectedIds.includes(q.id) &&
                              q.id !== activeId
                            }
                            onCtrlSelect={handleCtrlSelect}
                            onRowPointerDown={
                              onRequestSectionRange ? handleShiftRange : undefined
                            }
                            onNavigate={(id) => {
                              if (ctrlSelectedIds.length > 0 && !ctrlSelectedIds.includes(id)) {
                                if (moveSelectionUnder(id)) {
                                  onQuestionNavigate?.(id);
                                  return;
                                }
                              }
                              setShiftAnchorId(id);
                              setRangeSelectedIds([]);
                              setCtrlSelectedIds([]);
                              onQuestionNavigate?.(id);
                            }}
                          />
                        </div>
                      );
                    })}
                  </SortableContext>
                  <DragOverlay dropAnimation={null}>
                    {activeQuestion && activeMeta ? (
                      <OptikRowPreview
                        question={activeQuestion}
                        number={activeMeta.number}
                        label={activeMeta.label}
                        isFrameRow={activeMeta.isFrameRow}
                        accentColor={activeMeta.accentColor}
                        fillColor={activeMeta.fillColor}
                        gridOptions={gridOptions}
                        bulkCount={bulkDragCount}
                      />
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </div>
          </CollapsibleCard>
        </div>
      </aside>
      {swapPrompt ? (
        <SwapConfirmDialog
          labelA={swapPrompt.labelA}
          labelB={swapPrompt.labelB}
          onConfirm={confirmSwap}
          onCancel={cancelSwap}
        />
      ) : null}
    </>
  );
}
