import type { QuestionItem } from "../../types";
import QuestionAnswerChips from "./QuestionAnswerChips";
import { useQuestionImageSrc } from "../../hooks/useQuestionImageSrc";

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

  return (
    <article
      className={`min-w-0 rounded-xl border p-1.5 ${
        isExplanation
          ? "border-teal-400/55 bg-gradient-to-br from-teal-50/90 via-white to-slate-50/80 shadow-[0_6px_18px_rgba(13,148,136,0.12)] ring-1 ring-teal-200/40"
          : "border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.12)]"
      }`}
    >
      <div className="mb-1 flex min-w-0 items-center justify-between gap-1">
        <div className="flex w-[1.375rem] shrink-0 items-center justify-start">
          {displayNumber != null ? (
            <span className="text-[0.6875rem] font-bold tabular-nums leading-none text-orange-600">
              {displayNumber}.
            </span>
          ) : isExplanation ? (
            <span className="block h-4 w-1 shrink-0 rounded-sm bg-teal-500 shadow-sm" aria-hidden />
          ) : null}
        </div>
        {!hideActions ? (
          <div className="flex shrink-0 gap-0.5" aria-hidden>
            <span className="h-4 w-4 rounded border border-orange-300/80 bg-orange-50" />
            <span className="h-4 w-4 rounded border border-rose-300/80 bg-rose-50" />
          </div>
        ) : null}
      </div>
      <div className="min-w-0">
        {src ? (
          <img
            src={src}
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
            <QuestionAnswerChips
              questionId={question.id}
              selected={(question.answer_key || undefined) as import("../../store/editorStore").AnswerOption}
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}
