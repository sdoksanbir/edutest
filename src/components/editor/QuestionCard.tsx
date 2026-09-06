import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import type { QuestionItem } from "../../types";
import { useQuestionImageSrc } from "../../hooks/useQuestionImageSrc";
import { useEditorStore } from "../../store/editorStore";
import QuestionAnswerChips from "./QuestionAnswerChips";
import QuestionPreviewModal from "./QuestionPreviewModal";
import ExplanationCaptionModal from "./ExplanationCaptionModal";

type QuestionCardProps = {
  question: QuestionItem;
  displayNumber: number | null;
  isExplanation: boolean;
};

/** Sürükle-bırak ile sıralanabilir soru kartı - DndContext + SortableContext içinde kullanılmalı */
export default function QuestionCard({ question, displayNumber, isExplanation }: QuestionCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });
  const removeQuestion = useEditorStore((state) => state.removeQuestion);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCaptionOpen, setIsCaptionOpen] = useState(false);
  const imageSrc = useQuestionImageSrc(question);
  const altText =
    displayNumber != null ? `Soru ${displayNumber}` : "Açıklama görseli";

  return (
    <>
      <article
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className={`group relative min-w-0 cursor-grab rounded-xl border p-1.5 active:cursor-grabbing ${
          isExplanation
            ? "border-teal-400/55 bg-gradient-to-br from-teal-50/90 via-white to-slate-50/80 shadow-[0_6px_18px_rgba(13,148,136,0.12)] ring-1 ring-teal-200/40"
            : "border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.12)]"
        } ${isDragging ? "opacity-60" : "opacity-100"}`}
        {...attributes}
        {...listeners}
      >
        <div
          className="mb-1 flex min-w-0 items-center justify-between gap-1"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <div className="flex w-[1.375rem] shrink-0 items-center justify-start self-stretch">
              {displayNumber != null ? (
                <span className="text-[0.6875rem] font-bold tabular-nums leading-none text-orange-600">
                  {displayNumber}.
                </span>
              ) : isExplanation ? (
                <span
                  className="block h-4 w-1 shrink-0 rounded-sm bg-teal-500 shadow-sm"
                  title="Açıklama (numarasız)"
                  aria-hidden
                />
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
              {isExplanation ? (
                <button
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsCaptionOpen(true);
                  }}
                  className="grid h-4 w-4 place-items-center rounded border border-teal-400/75 bg-teal-50 text-teal-800 transition hover:border-teal-500 hover:bg-teal-100"
                  aria-label="Açıklama metni ekle veya düzenle"
                  title="Açıklama metni"
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                    <path d="M16 13H8" />
                    <path d="M16 17H8" />
                    <path d="M10 9H8" />
                  </svg>
                </button>
              ) : null}
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsPreviewOpen(true);
                }}
                className="grid h-4 w-4 place-items-center rounded border border-orange-300/80 bg-orange-50 text-orange-700 transition hover:border-orange-400 hover:bg-orange-100"
                aria-label="Öğeyi büyüt"
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </button>
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  removeQuestion(question.id);
                }}
                className="grid h-4 w-4 place-items-center rounded border border-rose-300/80 bg-rose-50 text-rose-600 transition hover:border-rose-400 hover:bg-rose-100"
                aria-label="Öğeyi sil"
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
          </div>
        </div>

        <div className="min-w-0">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={altText}
              className={`block h-[4.25rem] w-full object-cover sm:h-[4.5rem] ${
                isExplanation ? "rounded-lg" : "rounded-t-lg"
              }`}
            />
          ) : (
            <div className="flex h-[4.25rem] items-center justify-center bg-slate-100 text-xs text-slate-400 sm:h-[4.5rem]">
              Yükleniyor…
            </div>
          )}
          {!isExplanation ? (
            <div className="rounded-b-lg border border-orange-200/80 bg-orange-50/90 px-1 py-0.5 shadow-inner">
              <QuestionAnswerChips questionId={question.id} selected={(question.answer_key || undefined) as import("../../store/editorStore").AnswerOption} />
            </div>
          ) : null}
        </div>
      </article>

      <QuestionPreviewModal
        question={question}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
      <ExplanationCaptionModal
        open={isCaptionOpen}
        onClose={() => setIsCaptionOpen(false)}
        question={question}
      />
    </>
  );
}
