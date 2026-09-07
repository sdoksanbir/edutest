import type { QuestionItem } from "../types";
import { normalizeContentType } from "./questionNumbering";

export function computeProjectStats(questions: QuestionItem[]) {
  const realQuestions = questions.filter((q) => normalizeContentType(q.content_type) === "question");
  const answered = realQuestions.filter((q) => Boolean(q.answer_key?.trim())).length;
  return {
    total: questions.length,
    answered,
    unanswered: realQuestions.length - answered,
    testGroups: 1,
  };
}
