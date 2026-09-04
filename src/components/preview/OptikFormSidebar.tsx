import CollapsibleCard from "./CollapsibleCard";
import { useMemo, useState } from "react";
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
import type { QuestionItem } from "../../types";
import { computeOptikFormStats, type OptikChoice } from "../../utils/optikFormStats";
import {
  readingOrderIdsAfterMove,
  swapReadingOrderIds,
} from "../../utils/optikFormOrder";

type Props = {
  questions: QuestionItem[];
  onReorder?: (orderedIds: string[]) => void | Promise<void>;
  onQuestionNavigate?: (questionId: string) => void;
};

type SwapPrompt = {
  idA: string;
  idB: string;
  numA: number;
  numB: number;
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
  numA,
  numB,
  onConfirm,
  onCancel,
}: {
  numA: number;
  numB: number;
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
          <span className="font-semibold text-slate-800">{numA}. soru</span> ile{" "}
          <span className="font-semibold text-slate-800">{numB}. soru</span>nun yerini değiştirmek
          istiyor musunuz?
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
  state: { isDragging: boolean; ctrlSelected: boolean; unmarked: boolean },
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
  return "border-slate-100 bg-slate-50/80";
}

function SortableOptikRow({
  question,
  number,
  gridOptions,
  ctrlSelected,
  onCtrlSelect,
  onNavigate,
}: {
  question: QuestionItem;
  number: number;
  gridOptions: OptikChoice[];
  ctrlSelected?: boolean;
  onCtrlSelect?: (questionId: string, number: number, e: { ctrlKey: boolean; metaKey: boolean; preventDefault: () => void; stopPropagation: () => void }) => void;
  onNavigate?: (questionId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  });
  const answer = normalizeAnswer(question.answer_key);
  const unmarked = answer === null;

  const handleGripPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      onCtrlSelect?.(question.id, number, e);
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
      }}
      onPointerDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && onCtrlSelect) {
          onCtrlSelect(question.id, number, e);
        }
      }}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey) return;
        if ((e.target as HTMLElement).closest("button")) return;
        onNavigate?.(question.id);
      }}
      className={`optik-form-row flex items-center gap-1 rounded-lg border px-1 py-0.5 transition ${
        onNavigate ? "cursor-pointer hover:brightness-[0.98]" : "cursor-default"
      } ${optikRowShellClass({
        isDragging,
        ctrlSelected: Boolean(ctrlSelected),
        unmarked,
      })}`}
    >
      <button
        type="button"
        className={`flex shrink-0 cursor-grab touch-none items-center justify-center rounded p-0.5 transition hover:bg-black/5 active:cursor-grabbing ${
          unmarked ? "text-red-500 hover:text-red-700" : "text-slate-400 hover:text-slate-600"
        }`}
        aria-label={`Soru ${number} taşı`}
        title="Sürükleyerek sırala"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handleGripPointerDown}
        {...attributes}
      >
        <GripVertical className="h-3.5 w-3.5" aria-hidden />
      </button>
      <span
        className={`w-3.5 shrink-0 text-[0.6875rem] font-bold ${
          unmarked ? "text-red-700" : "text-slate-700"
        }`}
      >
        {number}
      </span>
      <div className="optik-form-bubbles">
        {gridOptions.map((opt) => {
          const selected = answer === opt;
          return (
            <span
              key={opt}
              className={answerBubbleClass(selected, unmarked)}
              aria-label={`Soru ${number}, şık ${opt}${selected ? ", doğru cevap" : ""}`}
            >
              {opt}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function OptikRowPreview({
  question,
  number,
  gridOptions,
}: {
  question: QuestionItem;
  number: number;
  gridOptions: OptikChoice[];
}) {
  const answer = normalizeAnswer(question.answer_key);
  const unmarked = answer === null;
  return (
    <div
      className={`optik-form-row flex items-center gap-1 rounded-lg border px-1 py-0.5 shadow-lg ${optikRowShellClass({
        isDragging: false,
        ctrlSelected: false,
        unmarked,
      })}`}
    >
      <GripVertical
        className={`h-3 w-3 shrink-0 ${unmarked ? "text-red-600" : "text-sky-600"}`}
        aria-hidden
      />
      <span
        className={`w-3.5 shrink-0 text-[0.6875rem] font-bold ${
          unmarked ? "text-red-700" : "text-slate-700"
        }`}
      >
        {number}
      </span>
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
    </div>
  );
}

export default function OptikFormSidebar({ questions, onReorder, onQuestionNavigate }: Props) {
  const stats = useMemo(() => computeOptikFormStats(questions), [questions]);
  const gridOptions = stats.activeOptions;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ctrlSelectedIds, setCtrlSelectedIds] = useState<string[]>([]);
  const [swapPrompt, setSwapPrompt] = useState<SwapPrompt | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setCtrlSelectedIds([]);
    setSwapPrompt(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || String(active.id) === String(over.id)) return;
    const ids = questions.map((q) => q.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0 || from === to) return;
    onReorder?.(readingOrderIdsAfterMove(ids, String(active.id), String(over.id)));
  };

  const handleCtrlSelect = (
    questionId: string,
    number: number,
    e: { ctrlKey: boolean; metaKey: boolean; preventDefault: () => void; stopPropagation: () => void },
  ) => {
    if (!onReorder || swapPrompt) return;
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    e.stopPropagation();

    if (ctrlSelectedIds.includes(questionId)) {
      setCtrlSelectedIds((prev) => prev.filter((id) => id !== questionId));
      return;
    }
    if (ctrlSelectedIds.length === 0) {
      setCtrlSelectedIds([questionId]);
      return;
    }
    if (ctrlSelectedIds.length === 1 && ctrlSelectedIds[0] !== questionId) {
      const firstId = ctrlSelectedIds[0]!;
      const numA = questions.findIndex((q) => q.id === firstId) + 1;
      setCtrlSelectedIds([firstId, questionId]);
      setSwapPrompt({ idA: firstId, idB: questionId, numA, numB: number });
      return;
    }
    setCtrlSelectedIds([questionId]);
  };

  const cancelSwap = () => {
    setSwapPrompt(null);
    setCtrlSelectedIds([]);
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

  const activeQuestion = activeId ? questions.find((q) => q.id === activeId) : null;
  const activeIndex = activeId ? questions.findIndex((q) => q.id === activeId) : -1;

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
                <span className="text-[0.625rem] text-slate-400">Ctrl+tık ile yer değiştir</span>
              ) : undefined
            }
            contentClassName="flex min-h-0 flex-1 flex-col"
          >
            {onReorder && questions.length > 1 && (
              <p className="mb-1 shrink-0 text-[0.625rem] text-slate-400">
                İki soruyu Ctrl (veya ⌘) + tık ile seçip yer değiştirin; sürükleyerek de sıralayabilirsiniz
              </p>
            )}
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden pr-0.5">
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
                    {questions.map((q, i) => (
                      <SortableOptikRow
                        key={q.id}
                        question={q}
                        number={i + 1}
                        gridOptions={gridOptions}
                        ctrlSelected={ctrlSelectedIds.includes(q.id)}
                        onCtrlSelect={handleCtrlSelect}
                        onNavigate={onQuestionNavigate}
                      />
                    ))}
                  </SortableContext>
                  <DragOverlay dropAnimation={null}>
                    {activeQuestion && activeIndex >= 0 ? (
                      <OptikRowPreview
                        question={activeQuestion}
                        number={activeIndex + 1}
                        gridOptions={gridOptions}
                      />
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </div>
          </CollapsibleCard>
        </div>
      </aside>

      {swapPrompt && (
        <SwapConfirmDialog
          numA={swapPrompt.numA}
          numB={swapPrompt.numB}
          onConfirm={confirmSwap}
          onCancel={cancelSwap}
        />
      )}
    </>
  );
}
