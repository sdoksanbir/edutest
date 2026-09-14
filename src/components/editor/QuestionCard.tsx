import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import type { QuestionItem } from "../../types";
import { useQuestionImageSrc } from "../../hooks/useQuestionImageSrc";
import { useEditorStore } from "../../store/editorStore";
import QuestionAnswerChips from "./QuestionAnswerChips";
import QuestionPreviewModal from "./QuestionPreviewModal";
import ExplanationCaptionModal from "./ExplanationCaptionModal";
import ClassificationModal from "../modals/ClassificationModal";
import {
  questionDifficultyCardClass,
  questionDifficultyNumberBadgeClass,
  QUESTION_DIFFICULTY_LABEL,
} from "../../utils/questionDifficulty";
import {
  QUESTION_CARD_IMAGE_BOX_CLASS,
  QUESTION_CARD_IMAGE_CLASS,
  QUESTION_CARD_IMAGE_PLACEHOLDER_CLASS,
} from "../../utils/questionCardLayout";

type QuestionCardProps = {
  question: QuestionItem;
  displayNumber: number | null;
  isExplanation: boolean;
};

/** Sürükle-bırak ile sıralanabilir soru kartı - DndContext + SortableContext içinde kullanılmalı */
export default function QuestionCard({ question, displayNumber, isExplanation }: QuestionCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });
  const removeQuestion = useEditorStore((state) => state.removeQuestion);
  const openSaveToBank = useEditorStore((state) => state.openSaveToBank);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCaptionOpen, setIsCaptionOpen] = useState(false);
  const [isClassifyOpen, setIsClassifyOpen] = useState(false);
  const imageSrc = useQuestionImageSrc(question);
  const altText =
    displayNumber != null ? `Soru ${displayNumber}` : "Açıklama görseli";
  const difficulty = question.difficulty ?? null;
  /** Bankadan gelen sorularda kaydet butonu gizlenir; yalnızca kırpılanlarda görünür */
  const canSaveToBank = !isExplanation && !question.bankSourceId;

  return (
    <>
      <article
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className={`group relative flex h-full min-w-0 cursor-grab flex-col overflow-hidden rounded-xl border p-1 active:cursor-grabbing ${questionDifficultyCardClass(
          difficulty,
          isExplanation,
        )} ${isDragging ? "opacity-60" : "opacity-100"}`}
        {...attributes}
        {...listeners}
      >
        <div
          className="mb-0 flex min-w-0 items-center justify-between gap-1.5 rounded-t-lg border border-slate-700 bg-slate-800 px-1.5 py-1 shadow-inner"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {displayNumber != null ? (
              <span className={questionDifficultyNumberBadgeClass(difficulty)}>
                {displayNumber}
              </span>
            ) : isExplanation ? (
              <span
                className="block h-5 w-1.5 shrink-0 rounded-sm bg-teal-400 shadow-sm"
                title="Açıklama (numarasız)"
                aria-hidden
              />
            ) : null}
            {!isExplanation && difficulty ? (
              <span
                className={`truncate rounded px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide ${
                  difficulty === "kolay"
                    ? "bg-emerald-500/25 text-emerald-200 ring-1 ring-emerald-400/40"
                    : difficulty === "orta"
                      ? "bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/40"
                      : "bg-rose-500/25 text-rose-200 ring-1 ring-rose-400/40"
                }`}
                title={QUESTION_DIFFICULTY_LABEL[difficulty]}
              >
                {QUESTION_DIFFICULTY_LABEL[difficulty]}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isExplanation ? (
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsCaptionOpen(true);
                }}
                className="grid h-6 w-6 place-items-center rounded-md border border-teal-400/70 bg-slate-700 text-teal-200 transition hover:bg-slate-600"
                aria-label="Açıklama metni ekle veya düzenle"
                title="Açıklama metni"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                  <path d="M16 13H8" />
                  <path d="M16 17H8" />
                  <path d="M10 9H8" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsClassifyOpen(true);
                }}
                className="grid h-6 w-6 place-items-center rounded-md border border-sky-400/70 bg-slate-700 text-sky-200 transition hover:bg-slate-600"
                aria-label="Sınıflandırma"
                title="Sınıflandırma (zorluk / ders / konu)"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 6h16" />
                  <path d="M4 12h10" />
                  <path d="M4 18h6" />
                </svg>
              </button>
            )}
            {canSaveToBank ? (
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  openSaveToBank([question.id]);
                }}
                className="grid h-6 w-6 place-items-center rounded-md border border-blue-400/70 bg-slate-700 text-blue-200 transition hover:bg-slate-600"
                aria-label="Soru bankasına kaydet"
                title="Soru bankasına kaydet"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
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
              className="grid h-6 w-6 place-items-center rounded-md border border-orange-400/70 bg-slate-700 text-orange-200 transition hover:bg-slate-600"
              aria-label="Öğeyi büyüt"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
              className="grid h-6 w-6 place-items-center rounded-md border border-rose-400/70 bg-slate-700 text-rose-200 transition hover:bg-slate-600"
              aria-label="Öğeyi sil"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {imageSrc ? (
            <div
              className={`${QUESTION_CARD_IMAGE_BOX_CLASS} rounded-none border-x border-slate-200`}
            >
              <img
                src={imageSrc}
                alt={altText}
                className={QUESTION_CARD_IMAGE_CLASS}
              />
            </div>
          ) : (
            <div
              className={`${QUESTION_CARD_IMAGE_PLACEHOLDER_CLASS} rounded-none border-x border-slate-200`}
            >
              Yükleniyor…
            </div>
          )}
          {!isExplanation ? (
            <div className="mt-auto rounded-b-lg border border-slate-700 bg-slate-800 px-1 py-0.5 shadow-inner">
              <QuestionAnswerChips questionId={question.id} selected={(question.answer_key || undefined) as import("../../store/editorStore").AnswerOption} />
            </div>
          ) : (
            <div className="mt-auto h-1 rounded-b-lg border border-t-0 border-slate-700 bg-slate-800" aria-hidden />
          )}
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
      <ClassificationModal
        open={isClassifyOpen}
        questionIds={[question.id]}
        onClose={() => setIsClassifyOpen(false)}
      />
    </>
  );
}
