import type { QuestionItem } from "../../types";
import QuestionAnswerChips from "./QuestionAnswerChips";
import { useQuestionImageSrc } from "../../hooks/useQuestionImageSrc";
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

type QuestionCardContentProps = {
  question: QuestionItem;
  /** Overlay'da kullanırken butonları gizle */
  hideActions?: boolean;
  displayNumber: number | null;
  isExplanation: boolean;
};

/** Soru kartı içeriği - DragOverlay veya normal kart için */
export default function QuestionCardContent({
  question,
  hideActions,
  displayNumber,
  isExplanation,
}: QuestionCardContentProps) {
  const src = useQuestionImageSrc(question);
  const altText = displayNumber != null ? `Soru ${displayNumber}` : "Açıklama görseli";
  const difficulty = question.difficulty ?? null;

  return (
    <article
      className={`flex h-full min-w-0 flex-col overflow-hidden rounded-xl border p-1 ${questionDifficultyCardClass(difficulty, isExplanation)}`}
    >
      <div className="flex min-w-0 items-center justify-between gap-1.5 rounded-t-lg border border-slate-700 bg-slate-800 px-1.5 py-1 shadow-inner">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {displayNumber != null ? (
            <span className={questionDifficultyNumberBadgeClass(difficulty)}>
              {displayNumber}
            </span>
          ) : isExplanation ? (
            <span className="block h-5 w-1.5 shrink-0 rounded-sm bg-teal-400 shadow-sm" aria-hidden />
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
            >
              {QUESTION_DIFFICULTY_LABEL[difficulty]}
            </span>
          ) : null}
        </div>
        {!hideActions ? (
          <div className="flex shrink-0 gap-1" aria-hidden>
            <span className="h-6 w-6 rounded-md border border-sky-400/70 bg-slate-700" />
            <span className="h-6 w-6 rounded-md border border-orange-400/70 bg-slate-700" />
            <span className="h-6 w-6 rounded-md border border-rose-400/70 bg-slate-700" />
          </div>
        ) : null}
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {src ? (
          <div className={`${QUESTION_CARD_IMAGE_BOX_CLASS} rounded-none border-x border-slate-200`}>
            <img src={src} alt={altText} className={QUESTION_CARD_IMAGE_CLASS} />
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
            <QuestionAnswerChips
              questionId={question.id}
              selected={(question.answer_key || undefined) as import("../../store/editorStore").AnswerOption}
            />
          </div>
        ) : (
          <div className="mt-auto h-1 rounded-b-lg border border-t-0 border-slate-700 bg-slate-800" aria-hidden />
        )}
      </div>
    </article>
  );
}
