import { useMemo } from "react";
import type { QuestionItem } from "../../types";
import { useEditorStore } from "../../store/editorStore";
import { buildQuestionNumberMap, normalizeContentType } from "../../utils/questionNumbering";
import QuestionCard from "./QuestionCard";

type QuestionGridProps = {
  questions: QuestionItem[];
};

export default function QuestionGrid({ questions }: QuestionGridProps) {
  const sections = useEditorStore((s) => s.sections);
  const numberById = useMemo(
    () => buildQuestionNumberMap(questions, sections),
    [questions, sections]
  );

  return (
    <div className="grid grid-cols-2 content-start gap-2 sm:grid-cols-3 sm:gap-2.5 md:grid-cols-4 lg:grid-cols-5">
      {questions.map((question) => (
        <QuestionCard
          key={question.id}
          question={question}
          displayNumber={numberById.get(question.id) ?? null}
          isExplanation={normalizeContentType(question.content_type) === "explanation"}
        />
      ))}
    </div>
  );
}
