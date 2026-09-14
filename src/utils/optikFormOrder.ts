import type { LayoutItem } from "../api/client";
import type { QuestionItem } from "../types";
import { normalizeContentType } from "./questionNumbering";
import {
  getFasikulFramePreset,
  normalizeFasikulQuestionFrame,
  resolveFasikulPresetId,
  isFasikulOrnekNumberedFrame,
  formatFasikulBadgeQuestionNumber,
  buildFasikulOrnekNumberByOrderIndex,
  type FasikulQuestionFrameSettings,
} from "./fasikulQuestionFrame";
import { getLayoutItemsInReadingOrder } from "./columnRedistribute";
import {
  computePageColumnBand,
  type LayoutGeometryInput,
} from "./pdfLayoutGeometry";

/**
 * Gerçek soru sarmalayan hazır tasarımlar (ÖSYM / Örnek).
 * Formül, Kural, Unutma vb. içerik kutusu — optikte adıyla görünür.
 */
export function isFasikulQuestionWrapperFrame(
  frame: FasikulQuestionFrameSettings | null | undefined,
): boolean {
  if (!frame?.enabled) return false;
  const id = resolveFasikulPresetId(frame.presetId);
  if (id === "kural" || id === "ogreniyorum") return true;
  return frame.badgeStyle === "ring-pill";
}

/** Cevap işaretlenebilir optik sorusu mu?
 * Formül / Kural / Unutma vb. içerik kutusu → hayır.
 * ÖSYM / Örnek (soru sarmalayan) ve çerçevesiz sorular → evet.
 */
export function isOptikAnswerableQuestion(q: QuestionItem): boolean {
  if (normalizeContentType(q.content_type) === "explanation") return false;
  if ((q.fasikulEmptyRows ?? 0) > 0) return false;
  const frame = q.fasikulFrame
    ? normalizeFasikulQuestionFrame(q.fasikulFrame)
    : null;
  if (frame?.enabled && !isFasikulQuestionWrapperFrame(frame)) return false;
  return true;
}

/** Optik satır etiketi rengi (preset accent / labelColor) */
export function resolveOptikFrameAccentColor(q: QuestionItem): string | null {
  const frame = q.fasikulFrame
    ? normalizeFasikulQuestionFrame(q.fasikulFrame)
    : null;
  if (!frame?.enabled) return null;
  const preset = getFasikulFramePreset(frame.presetId);
  const hex = (frame.labelColor || preset?.accent || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : preset?.accent ?? null;
}

/** Optik satır arka planı (preset fill) */
export function resolveOptikFrameFillColor(q: QuestionItem): string | null {
  const frame = q.fasikulFrame
    ? normalizeFasikulQuestionFrame(q.fasikulFrame)
    : null;
  if (!frame?.enabled) return null;
  const preset = getFasikulFramePreset(frame.presetId);
  const hex = (frame.fillColor || preset?.fill || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : preset?.fill ?? null;
}

/** Optik panelde çerçeve / açıklama satırı etiketi (FORMÜL, ÖRNEK 01, …) */
export function resolveOptikFrameSidebarLabel(
  q: QuestionItem,
  ornekNumberByOrder?: Map<number, number>,
): string {
  const frame = q.fasikulFrame
    ? normalizeFasikulQuestionFrame(q.fasikulFrame)
    : null;
  if (frame?.enabled) {
    const preset = getFasikulFramePreset(frame.presetId);
    const text = (frame.labelText || preset?.defaultLabel || "").trim();
    if (text) {
      if (isFasikulOrnekNumberedFrame(frame)) {
        const n =
          ornekNumberByOrder?.get(q.order_index) ??
          buildFasikulOrnekNumberByOrderIndex([q]).get(q.order_index);
        if (n != null) {
          return `${text} ${formatFasikulBadgeQuestionNumber(n)}`;
        }
      }
      return text;
    }
  }
  return "Açıklama";
}

export type OptikReadingOrderOptions = {
  columns?: number;
  geometry?: LayoutGeometryInput;
};

/**
 * PDF okuma sırası: sayfa → (geniş kesmelerle) sol sütun↑↓ → sağ sütun↑↓ …
 * Geniş sorular dikey konumlarına göre araya girer (sütun listesinden düşmez).
 */
export function questionsInLayoutReadingOrder(
  questions: QuestionItem[],
  layout: LayoutItem[],
  opts?: OptikReadingOrderOptions,
): QuestionItem[] {
  const rankById = new Map<string, number>();
  let rank = 0;

  const cols = Math.max(1, opts?.columns ?? 1);
  const geometry = opts?.geometry;
  const modeByOrder = new Map(
    questions.map((q) => [q.order_index, q.layoutMode] as const),
  );

  if (geometry && layout.length > 0) {
    const pageNums = [
      ...new Set(
        layout
          .filter((l) => l.kind !== "answer_key_page")
          .map((l) => l.page_num)
          .filter((p) => p > 0),
      ),
    ].sort((a, b) => a - b);

    for (const pageNum of pageNums) {
      const band = computePageColumnBand({ ...geometry, pageNum });
      const items = getLayoutItemsInReadingOrder(layout, pageNum, cols, band, {
        questionLayoutModeByOrder: modeByOrder,
      });
      for (const item of items) {
        const q = questions.find((x) => x.order_index === item.order_index);
        if (!q || rankById.has(q.id)) continue;
        rankById.set(q.id, rank++);
      }
    }
  } else {
    const items = layout
      .filter((item) => item.kind !== "answer_key_page")
      .slice()
      .sort((a, b) => {
        if (a.page_num !== b.page_num) return a.page_num - b.page_num;
        if (Math.abs(a.x_pt - b.x_pt) > 0.01) return a.x_pt - b.x_pt;
        const dy = b.y_top_pt - a.y_top_pt;
        if (Math.abs(dy) > 0.01) return dy;
        return a.order_index - b.order_index;
      });

    for (const item of items) {
      const q = questions.find((x) => x.order_index === item.order_index);
      if (!q || rankById.has(q.id)) continue;
      rankById.set(q.id, rank++);
    }
  }

  return [...questions].sort((a, b) => {
    const ra = rankById.get(a.id);
    const rb = rankById.get(b.id);
    if (ra != null && rb != null) return ra - rb;
    if (ra != null) return -1;
    if (rb != null) return 1;
    return a.order_index - b.order_index;
  });
}

/** Okuma sırasında iki sorunun yerini değiştirir. */
export function swapReadingOrderIds(
  readingOrderIds: string[],
  idA: string,
  idB: string,
): string[] {
  const i = readingOrderIds.indexOf(idA);
  const j = readingOrderIds.indexOf(idB);
  if (i < 0 || j < 0 || i === j) return readingOrderIds;
  const next = [...readingOrderIds];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

/** Okuma sırasındaki id listesini sürükle-bırak sonrası günceller. */
export function readingOrderIdsAfterMove(
  readingOrderIds: string[],
  activeId: string,
  overId: string,
): string[] {
  const from = readingOrderIds.indexOf(activeId);
  const to = readingOrderIds.indexOf(overId);
  if (from < 0 || to < 0 || from === to) return readingOrderIds;
  const next = [...readingOrderIds];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

/**
 * Seçili soruları (okuma sırasındaki göreli düzen korunarak) overId konumuna toplu taşır.
 * over seçimin içindeyse değişiklik yapılmaz.
 */
export function readingOrderIdsAfterBulkMove(
  readingOrderIds: string[],
  selectedIds: string[],
  overId: string,
): string[] {
  const selectedSet = new Set(selectedIds);
  const moving = readingOrderIds.filter((id) => selectedSet.has(id));
  if (moving.length === 0) return readingOrderIds;
  if (moving.length === 1) {
    return readingOrderIdsAfterMove(readingOrderIds, moving[0]!, overId);
  }
  if (selectedSet.has(overId)) return readingOrderIds;

  const overIndex = readingOrderIds.indexOf(overId);
  if (overIndex < 0) return readingOrderIds;

  const firstSelectedIndex = readingOrderIds.findIndex((id) => selectedSet.has(id));
  if (firstSelectedIndex < 0) return readingOrderIds;

  const remaining = readingOrderIds.filter((id) => !selectedSet.has(id));
  let insertAt = remaining.indexOf(overId);
  if (insertAt < 0) return readingOrderIds;
  // Aşağı taşırken hedefin arkasına, yukarı taşırken önüne yerleştir
  if (firstSelectedIndex < overIndex) insertAt += 1;

  const next = [...remaining];
  next.splice(insertAt, 0, ...moving);
  return next;
}

/** Seçili soruları afterId'nin hemen altına (sonrasına) yerleştirir. */
export function readingOrderIdsInsertAfter(
  readingOrderIds: string[],
  selectedIds: string[],
  afterId: string,
): string[] {
  const selectedSet = new Set(selectedIds);
  const moving = readingOrderIds.filter((id) => selectedSet.has(id));
  if (moving.length === 0) return readingOrderIds;
  if (selectedSet.has(afterId)) return readingOrderIds;

  const remaining = readingOrderIds.filter((id) => !selectedSet.has(id));
  const afterIdx = remaining.indexOf(afterId);
  if (afterIdx < 0) return readingOrderIds;

  const next = [...remaining];
  next.splice(afterIdx + 1, 0, ...moving);
  return next;
}
