import type { QuestionItem } from "../types";
import type { OptikChoice } from "./optikFormStats";
import { computeOptikFormStats } from "./optikFormStats";

export type OptikFormOptionCount = "auto" | "4" | "5";
export type OptikFormBookletType = "none" | "2" | "3" | "4";
export type OptikFormNetRule = "4" | "3" | "2" | "1" | "none";

export type OptikFormSettings = {
  optionCount: OptikFormOptionCount;
  bookletType: OptikFormBookletType;
  netRule: OptikFormNetRule;
  instructionEnabled: boolean;
  instructionText: string;
};

export const DEFAULT_OPTIK_INSTRUCTION =
  "Kurşun kalem kullanınız. Taşırmadan işaretleyiniz.";

export const OPTIK_NET_RULE_OPTIONS: {
  value: OptikFormNetRule;
  label: string;
  tag?: string;
}[] = [
  { value: "4", label: "Her 4 yanlış 1 doğruyu götürür", tag: "TYT / AYT" },
  { value: "3", label: "Her 3 yanlış 1 doğruyu götürür", tag: "LGS" },
  { value: "2", label: "Her 2 yanlış 1 doğruyu götürür" },
  { value: "1", label: "1 yanlış 1 doğruyu götürür" },
  { value: "none", label: "Ceza yok — sadece doğrular sayılır", tag: "Okul içi" },
];

export function resolveOptikActiveOptions(
  questions: QuestionItem[],
  mode: OptikFormOptionCount,
): OptikChoice[] {
  if (mode === "4") return ["A", "B", "C", "D"];
  if (mode === "5") return ["A", "B", "C", "D", "E"];
  return computeOptikFormStats(questions).activeOptions;
}

export function countOptikFormPages(
  enabled: boolean,
  placement: string,
  rowCount = 0,
): number {
  if (!enabled || rowCount <= 0) return 0;
  if (placement === "separate_page") return 1;
  return 0;
}
