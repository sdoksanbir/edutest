import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import QuestionGrid from "./QuestionGrid";
import QuestionCardContent from "./QuestionCardContent";
import EmptyQuestionCanvas from "./EmptyQuestionCanvas";
import { useEditorStore } from "../../store/editorStore";
import { buildQuestionNumberMap, normalizeContentType } from "../../utils/questionNumbering";

export default function QuestionCanvas() {
  const questions = useEditorStore((state) => state.questions);
  const sections = useEditorStore((state) => state.sections);
  const fetchQuestions = useEditorStore((state) => state.fetchQuestions);
  const reorderQuestions = useEditorStore((state) => state.reorderQuestions);
  const clearAllQuestions = useEditorStore((state) => state.clearAllQuestions);
  const numberById = useMemo(() => buildQuestionNumberMap(questions, sections), [questions, sections]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lastOverId, setLastOverId] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 3 } }));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setLastOverId(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (event.over) setLastOverId(String(event.over.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const overId = over ? String(over.id) : lastOverId;
    setActiveId(null);
    setLastOverId(null);
    if (!overId || String(active.id) === overId) return;
    const ids = questions.map((q) => q.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(overId);
    if (from < 0 || to < 0 || from === to) return;
    reorderQuestions(arrayMove(ids, from, to));
  };

  const activeQuestion = activeId ? questions.find((q) => q.id === activeId) : null;
  const isEmpty = questions.length === 0;

  return (
    <section className="tq-canvas-shell">
      <div className="tq-canvas-header">
        <h2 className="tq-main-section-title">Seçilen Sorular</h2>
        <div className="flex min-w-0 items-center gap-2">
          {!isEmpty && (
            <button
              type="button"
              onClick={() => clearAllQuestions()}
              className="rounded-md border border-rose-300/80 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100"
              title="Tüm seçilen soruları temizle"
            >
              Sıfırla
            </button>
          )}
          {!isEmpty && (
            <span className="tq-main-pill tq-canvas-header__pill">
              Sürükle-bırak ile sıralama
            </span>
          )}
        </div>
      </div>

      <div className="tq-canvas-stage">
        <div className="tq-canvas-frame">
          <div className={`tq-canvas-paper${isEmpty ? " tq-canvas-paper--empty" : ""}`}>
            {isEmpty ? (
              <EmptyQuestionCanvas />
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={pointerWithin}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={questions.map((q) => q.id)} strategy={rectSortingStrategy}>
                  <QuestionGrid questions={questions} />
                </SortableContext>
                <DragOverlay dropAnimation={null}>
                  {activeQuestion ? (
                    <div className="cursor-grabbing opacity-95 shadow-xl">
                      <QuestionCardContent
                        question={activeQuestion}
                        hideActions
                        displayNumber={numberById.get(activeQuestion.id) ?? null}
                        isExplanation={normalizeContentType(activeQuestion.content_type) === "explanation"}
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
