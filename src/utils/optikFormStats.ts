import type { QuestionItem } from "../types";

export type OptikChoice = "A" | "B" | "C" | "D" | "E";

const VALID: OptikChoice[] = ["A", "B", "C", "D", "E"];

export type OptikFormRow = {
  number: number;
  answer: OptikChoice | null;
};

export type OptikFormStats = {
  rows: OptikFormRow[];
  counts: Record<OptikChoice, number>;
  markedCount: number;
  unmarkedCount: number;
  activeOptions: OptikChoice[];
  isBalanced: boolean;
  maxCount: number;
};

function normalizeAnswer(raw?: string): OptikChoice | null {
  const v = (raw ?? "").trim().toUpperCase();
  if (VALID.includes(v as OptikChoice)) return v as OptikChoice;
  return null;
}

/** Soru listesinden optik form satırları ve cevap dağılımı istatistikleri. */
export function computeOptikFormStats(questions: QuestionItem[]): OptikFormStats {
  const rows: OptikFormRow[] = questions.map((q, i) => ({
    number: i + 1,
    answer: normalizeAnswer(q.answer_key),
  }));

  const counts: Record<OptikChoice, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  let unmarkedCount = 0;

  for (const row of rows) {
    if (!row.answer) {
      unmarkedCount += 1;
    } else {
      counts[row.answer] += 1;
    }
  }

  const displayOptions: OptikChoice[] =
    counts.E > 0 ? ["A", "B", "C", "D", "E"] : ["A", "B", "C", "D"];

  const markedCounts = displayOptions.map((k) => counts[k]);
  const maxCount = markedCounts.length ? Math.max(...markedCounts) : 0;
  const minCount = markedCounts.length ? Math.min(...markedCounts) : 0;
  const markedCount = rows.length - unmarkedCount;
  const isBalanced =
    unmarkedCount === 0 && markedCount > 0 && maxCount - minCount <= 2;

  return {
    rows,
    counts,
    markedCount,
    unmarkedCount,
    activeOptions: displayOptions,
    isBalanced,
    maxCount: Math.max(maxCount, 1),
  };
}
