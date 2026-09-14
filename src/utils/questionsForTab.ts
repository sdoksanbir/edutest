import type { QuestionItem } from "../types";

export function isWrittenQuestionItem(q: QuestionItem): boolean {
  return Boolean(q.writtenType);
}

/** Aktif modüle göre görünen sorular — yazılı sorular yalnızca yazılı modülde */
export function questionsForTab(
  questions: QuestionItem[],
  tab: string | null | undefined,
): QuestionItem[] {
  if (tab === "written-paper") {
    return questions.filter(isWrittenQuestionItem);
  }
  return questions.filter((q) => !isWrittenQuestionItem(q));
}
