import type { OptikFormBookletType, OptikFormNetRule, OptikFormOptionCount } from "./optikFormSettings";

/** editorStore AnswerKeyMode ile aynı — döngüsel import önlenir */
export type OptikFormPlacementMode = "per_page" | "separate_page" | "end_of_test";
/** OMR optik form ayarları — tek kaynak tip. */
export type OpticalFormPlacement = "compact" | "separate_page";

export type OpticalFormOptionCount = OptikFormOptionCount;

export type OpticalFormBookletType = OptikFormBookletType;

export type OpticalFormPenaltyRule =
  | "tyt_ayt"
  | "lgs"
  | "two_to_one"
  | "one_to_one"
  | "none";

export type OpticalFormSettings = {
  placement: OpticalFormPlacement;
  optionCount: OpticalFormOptionCount;
  bookletType: OpticalFormBookletType;
  penaltyRule: OpticalFormPenaltyRule;
  showInstructions: boolean;
  instructionText: string;
};

export const DEFAULT_OPTICAL_FORM_SETTINGS: OpticalFormSettings = {
  placement: "compact",
  optionCount: "auto",
  bookletType: "none",
  penaltyRule: "tyt_ayt",
  showInstructions: true,
  instructionText: "Kurşun kalem kullanınız. Taşırmadan işaretleyiniz.",
};

export const OPTICAL_PENALTY_RULE_OPTIONS: {
  value: OpticalFormPenaltyRule;
  label: string;
  tag?: string;
}[] = [
  { value: "tyt_ayt", label: "Her 4 yanlış 1 doğruyu götürür", tag: "TYT / AYT" },
  { value: "lgs", label: "Her 3 yanlış 1 doğruyu götürür", tag: "LGS" },
  { value: "two_to_one", label: "Her 2 yanlış 1 doğruyu götürür" },
  { value: "one_to_one", label: "1 yanlış 1 doğruyu götürür" },
  { value: "none", label: "Ceza yok — sadece doğrular sayılır", tag: "Okul içi" },
];

export function placementToAnswerKeyMode(p: OpticalFormPlacement): OptikFormPlacementMode {
  return p === "compact" ? "end_of_test" : "separate_page";
}

export function answerKeyModeToPlacement(mode: OptikFormPlacementMode): OpticalFormPlacement {
  return mode === "separate_page" ? "separate_page" : "compact";
}

export function penaltyRuleToNetRule(rule: OpticalFormPenaltyRule): OptikFormNetRule {
  const map: Record<OpticalFormPenaltyRule, OptikFormNetRule> = {
    tyt_ayt: "4",
    lgs: "3",
    two_to_one: "2",
    one_to_one: "1",
    none: "none",
  };
  return map[rule];
}

export function netRuleToPenaltyRule(rule: OptikFormNetRule): OpticalFormPenaltyRule {
  const map: Record<OptikFormNetRule, OpticalFormPenaltyRule> = {
    "4": "tyt_ayt",
    "3": "lgs",
    "2": "two_to_one",
    "1": "one_to_one",
    none: "none",
  };
  return map[rule];
}

export type OpticalFormStoreSlice = {
  optikFormPlacement: OptikFormPlacementMode;
  optikFormOptionCount: OptikFormOptionCount;
  optikFormBookletType: OptikFormBookletType;
  optikFormNetRule: OptikFormNetRule;
  optikFormInstructionEnabled: boolean;
  optikFormInstructionText: string;
};

export function readOpticalFormSettings(state: OpticalFormStoreSlice): OpticalFormSettings {
  return {
    placement: answerKeyModeToPlacement(state.optikFormPlacement),
    optionCount: state.optikFormOptionCount,
    bookletType: state.optikFormBookletType,
    penaltyRule: netRuleToPenaltyRule(state.optikFormNetRule),
    showInstructions: state.optikFormInstructionEnabled,
    instructionText: state.optikFormInstructionText,
  };
}

export function applyOpticalFormSettings(
  settings: OpticalFormSettings,
): Partial<OpticalFormStoreSlice> {
  return {
    optikFormPlacement: placementToAnswerKeyMode(settings.placement),
    optikFormOptionCount: settings.optionCount,
    optikFormBookletType: settings.bookletType,
    optikFormNetRule: penaltyRuleToNetRule(settings.penaltyRule),
    optikFormInstructionEnabled: settings.showInstructions,
    optikFormInstructionText: settings.instructionText.trim() || DEFAULT_OPTICAL_FORM_SETTINGS.instructionText,
  };
}

export function isSeparateOpticalPage(placement: OpticalFormPlacement | string): boolean {
  return placement === "separate_page";
}

export function isCompactOpticalPlacement(placement: OpticalFormPlacement | string): boolean {
  return placement === "compact" || placement === "end_of_test";
}
