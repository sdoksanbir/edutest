import type { OptikChoice } from "./optikFormStats";
import type { OptikFormNetRule } from "./optikFormSettings";
import type { OptikScoringState } from "./optikFormTypes";
import type { OpticalFormPenaltyRule } from "./opticalFormSettings";
import { penaltyRuleToNetRule } from "./opticalFormSettings";

export type OptikScoringInput = {
  answers: (OptikChoice | null)[];
  key: (OptikChoice | null)[];
  netRule: OptikFormNetRule;
  penaltyRule?: OpticalFormPenaltyRule;
};

export function penaltyRatioFromNetRule(rule: OptikFormNetRule): number | null {
  if (rule === "none") return null;
  return Number(rule);
}

export function countOptikResults(
  answers: (OptikChoice | null)[],
  key: (OptikChoice | null)[],
): Pick<OptikScoringState, "correctCount" | "wrongCount" | "blankCount"> {
  const n = Math.max(answers.length, key.length);
  let correctCount = 0;
  let wrongCount = 0;
  let blankCount = 0;

  for (let i = 0; i < n; i += 1) {
    const ans = answers[i] ?? null;
    const expected = key[i] ?? null;
    if (!ans) {
      blankCount += 1;
    } else if (!expected) {
      wrongCount += 1;
    } else if (ans === expected) {
      correctCount += 1;
    } else {
      wrongCount += 1;
    }
  }

  return { correctCount, wrongCount, blankCount };
}

export function computeOptikNet(
  correctCount: number,
  wrongCount: number,
  netRule: OptikFormNetRule,
): number {
  const ratio = penaltyRatioFromNetRule(netRule);
  if (ratio == null) return correctCount;
  return correctCount - wrongCount / ratio;
}

export function computeOptikScoring(input: OptikScoringInput): OptikScoringState {
  const netRule = input.penaltyRule ? penaltyRuleToNetRule(input.penaltyRule) : input.netRule;
  const counts = countOptikResults(input.answers, input.key);
  const penaltyRatio = penaltyRatioFromNetRule(netRule);
  const net = computeOptikNet(counts.correctCount, counts.wrongCount, netRule);

  return {
    penaltyRatio,
    correctCount: counts.correctCount,
    wrongCount: counts.wrongCount,
    blankCount: counts.blankCount,
    net: Math.max(0, Math.round(net * 100) / 100),
    score: null,
  };
}

export function decodeAnswerKeyString(
  key: string,
  options: OptikChoice[],
): (OptikChoice | null)[] {
  const map: Record<string, OptikChoice> = {};
  options.forEach((opt, i) => {
    map[String(i)] = opt;
  });

  return key.split("").map((ch) => {
    if (ch === "?") return null;
    return map[ch] ?? null;
  });
}
