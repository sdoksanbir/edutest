/**
 * Fasikül cevap anahtarı satırları — yalnızca ÖSYM / Örnek (cevaplanabilir);
 * etiket: ÖRNEK 1, ÖSYM, …
 */

import type { LayoutItem } from "../api/client";
import type { QuestionItem } from "../types";
import {
  isFasikulOrnekNumberedFrame,
  buildFasikulOrnekNumberByOrderIndex,
  getFasikulFramePreset,
  normalizeFasikulQuestionFrame,
  resolveFasikulPresetId,
} from "./fasikulQuestionFrame";
import {
  isFasikulQuestionWrapperFrame,
  isOptikAnswerableQuestion,
} from "./optikFormOrder";

export type AnswerKeyLabeledItem = {
  label: string;
  answer: string;
  /** Sıralama / sayfalama için */
  displayNumber: number;
};

/** Cevap anahtarında görünen çerçeve etiketi (ÖRNEK 1, ÖSYM). */
export function resolveFasikulAnswerKeyLabel(
  q: QuestionItem,
  ornekNumberByOrder: Map<number, number>,
  fallbackNum: number,
): string {
  const frame = q.fasikulFrame
    ? normalizeFasikulQuestionFrame(q.fasikulFrame)
    : null;
  if (!frame?.enabled || !isFasikulQuestionWrapperFrame(frame)) {
    return String(fallbackNum);
  }

  const preset = getFasikulFramePreset(frame.presetId);
  const custom = (frame.labelText || "").trim();
  const presetId = resolveFasikulPresetId(frame.presetId);

  if (isFasikulOrnekNumberedFrame(frame)) {
    const base = custom || preset?.defaultLabel || "ÖRNEK";
    const n = ornekNumberByOrder.get(q.order_index);
    return n != null ? `${base} ${n}` : base;
  }

  if (presetId === "kural") {
    return custom || "ÖSYM";
  }

  return custom || preset?.defaultLabel || String(fallbackNum);
}

/**
 * Layout + sorulardan cevap anahtarı satırları.
 * display_number yok / içerik kutusu → dahil edilmez.
 */
export function buildFasikulAnswerKeyItems(
  layout: LayoutItem[],
  questions: QuestionItem[],
): AnswerKeyLabeledItem[] {
  const ornekByOrder = buildFasikulOrnekNumberByOrderIndex(questions);
  const qByOrder = new Map(questions.map((q) => [q.order_index, q]));

  return layout
    .filter((l) => l.kind !== "answer_key_page" && l.display_number != null)
    .sort((a, b) => (a.display_number as number) - (b.display_number as number))
    .flatMap((l) => {
      const q = qByOrder.get(l.order_index);
      if (!q || !isOptikAnswerableQuestion(q)) return [];
      const dn = l.display_number as number;
      return [
        {
          label: resolveFasikulAnswerKeyLabel(q, ornekByOrder, dn),
          answer: (l.answer_key || q.answer_key || "?").trim().toUpperCase() || "?",
          displayNumber: dn,
        },
      ];
    });
}

/** Önizleme / eski [num, answer] API’si için */
export function answerKeyItemsAsTuples(
  items: AnswerKeyLabeledItem[],
): Array<[string, string]> {
  return items.map((i) => [i.label, i.answer]);
}
