import { useMemo } from "react";
import { useEditorStore } from "../../store/editorStore";
import {
  defaultWrittenPaperUi,
} from "../../utils/writtenPaperUi";
import { stripHtmlToPlain } from "../../utils/writtenQuestionPaperDraw";
import WrittenPaperHeader from "./WrittenPaperHeader";
import type { QuestionItem, WrittenAnswerArea } from "../../types";

type Props = {
  questions: QuestionItem[];
  className?: string;
};

function PaperQuestionBlock({
  question,
  displayNumber,
  accent,
}: {
  question: QuestionItem;
  displayNumber: number;
  accent: string;
}) {
  const area = (question.writtenAnswerArea ?? "lines") as WrittenAnswerArea;
  const lines = Math.max(1, Math.min(30, question.writtenAnswerLines ?? 5));
  const stem = stripHtmlToPlain(question.writtenStemHtml ?? "");

  return (
    <div className="mb-5 break-inside-avoid">
      <div
        className="mb-2 inline-flex items-stretch overflow-hidden rounded-md text-[0.7rem] font-bold"
        style={{ backgroundColor: `${accent}22`, color: accent }}
      >
        <span className="w-1.5 shrink-0" style={{ backgroundColor: accent }} />
        <span className="px-2.5 py-1">Soru {displayNumber}</span>
      </div>
      {stem ? (
        <p className="mb-2 whitespace-pre-wrap text-[0.8rem] leading-snug text-slate-800">{stem}</p>
      ) : null}
      {area === "box" ? (
        <div className="min-h-[4.5rem] rounded-md border border-dashed border-slate-400/80" />
      ) : area === "lines" ? (
        <div className="flex flex-col gap-3 pt-1">
          {Array.from({ length: lines }, (_, i) => (
            <div
              key={i}
              className="h-px w-full border-t border-dotted border-slate-400"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Kağıdı Hazırla sonrası canlı kağıt önizlemesi — başlık + iki sütun sorular */
export default function WrittenPaperSheet({ questions, className = "" }: Props) {
  const uiRaw = useEditorStore((s) => s.writtenPaperUi);
  const columns = useEditorStore((s) => s.columns);
  const accent = useMemo(() => {
    const ui = { ...defaultWrittenPaperUi(), ...(uiRaw ?? {}) };
    return ui.accentColor || "#0D9488";
  }, [uiRaw]);

  const sorted = useMemo(
    () => [...questions].sort((a, b) => a.order_index - b.order_index),
    [questions],
  );

  const colCount = Math.max(1, Math.min(3, Number(columns) || 2));

  return (
    <div
      className={`mx-auto w-full max-w-[52rem] rounded-sm bg-white shadow-lg ring-1 ring-slate-200 ${className}`}
    >
      <div className="p-4 sm:p-5">
        <WrittenPaperHeader questions={sorted} className="mb-4" />
        <div
          className="relative grid gap-x-4"
          style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
        >
          {colCount > 1
            ? Array.from({ length: colCount - 1 }, (_, i) => (
                <div
                  key={`div-${i}`}
                  className="pointer-events-none absolute bottom-0 top-0 w-px"
                  style={{
                    left: `${((i + 1) / colCount) * 100}%`,
                    backgroundColor: `${accent}55`,
                    transform: "translateX(-50%)",
                  }}
                />
              ))
            : null}
          {sorted.map((q, i) => (
            <PaperQuestionBlock
              key={q.id}
              question={q}
              displayNumber={i + 1}
              accent={accent}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
