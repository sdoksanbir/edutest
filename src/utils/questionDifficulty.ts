/** Soru zorluk sınıflandırması — editör kart / önizleme ipucu renkleri. */

export type QuestionDifficulty = "kolay" | "orta" | "zor";

export const QUESTION_DIFFICULTIES: QuestionDifficulty[] = ["kolay", "orta", "zor"];

export const QUESTION_DIFFICULTY_LABEL: Record<QuestionDifficulty, string> = {
  kolay: "Kolay",
  orta: "Orta",
  zor: "Zor",
};

/** Kart kenarı / arka plan (Tailwind sınıfları). */
export function questionDifficultyCardClass(
  difficulty: QuestionDifficulty | null | undefined,
  isExplanation: boolean,
): string {
  if (isExplanation) {
    return "border-teal-400/55 bg-gradient-to-br from-teal-50/90 via-white to-slate-50/80 shadow-[0_6px_18px_rgba(13,148,136,0.12)] ring-1 ring-teal-200/40";
  }
  switch (difficulty) {
    case "kolay":
      return "border-emerald-400/80 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 shadow-[0_6px_18px_rgba(16,185,129,0.18)] ring-1 ring-emerald-200/50";
    case "orta":
      return "border-amber-400/80 bg-gradient-to-br from-amber-50 via-white to-amber-50/40 shadow-[0_6px_18px_rgba(245,158,11,0.18)] ring-1 ring-amber-200/50";
    case "zor":
      return "border-rose-400/80 bg-gradient-to-br from-rose-50 via-white to-rose-50/40 shadow-[0_6px_18px_rgba(244,63,94,0.18)] ring-1 ring-rose-200/50";
    default:
      return "border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.12)]";
  }
}

export function questionDifficultyNumberClass(
  difficulty: QuestionDifficulty | null | undefined,
): string {
  switch (difficulty) {
    case "kolay":
      return "text-emerald-700";
    case "orta":
      return "text-amber-700";
    case "zor":
      return "text-rose-700";
    default:
      return "text-orange-600";
  }
}

/** Soru numarası badge (kart başlığı). */
export function questionDifficultyNumberBadgeClass(
  difficulty: QuestionDifficulty | null | undefined,
): string {
  const base =
    "inline-flex min-w-[1.75rem] items-center justify-center rounded-md px-1.5 py-0.5 text-sm font-extrabold tabular-nums leading-none shadow-sm ring-1";
  switch (difficulty) {
    case "kolay":
      return `${base} bg-emerald-600 text-white ring-emerald-700/40`;
    case "orta":
      return `${base} bg-amber-500 text-white ring-amber-700/40`;
    case "zor":
      return `${base} bg-rose-600 text-white ring-rose-800/40`;
    default:
      return `${base} bg-orange-500 text-white ring-orange-700/40`;
  }
}

/** Önizleme / canvas — RGB 0–1. */
export function questionDifficultyRgb(
  difficulty: QuestionDifficulty | null | undefined,
): [number, number, number] | null {
  switch (difficulty) {
    case "kolay":
      return [16 / 255, 185 / 255, 129 / 255];
    case "orta":
      return [245 / 255, 158 / 255, 11 / 255];
    case "zor":
      return [244 / 255, 63 / 255, 94 / 255];
    default:
      return null;
  }
}

export function parseQuestionDifficulty(v: unknown): QuestionDifficulty | null {
  if (v === "kolay" || v === "orta" || v === "zor") return v;
  return null;
}
