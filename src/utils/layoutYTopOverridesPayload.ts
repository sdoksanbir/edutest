import type { LayoutItem } from "../api/client";
import type { QuestionItem } from "../types";
import type { LayoutPlacementOverride } from "./columnShiftPlacement";
import {
  columnIndexFromQuestionXPt,
  computePageColumnBand,
  type LayoutGeometryInput,
} from "./pdfLayoutGeometry";

/**
 * Store (soru id → y_top_pt) → API’nin beklediği order_index listesi.
 * Soru sırası değişince güncel `questions` ile tekrar üretilir.
 */
export function buildLayoutYTopOverridesForApi(
  overridesByQuestionId: Record<string, number>,
  questions: QuestionItem[]
): { order_index: number; y_top_pt: number }[] {
  const out: { order_index: number; y_top_pt: number }[] = [];
  for (const [id, y_top_pt] of Object.entries(overridesByQuestionId)) {
    const q = questions.find((x) => x.id === id);
    if (q) out.push({ order_index: q.order_index, y_top_pt });
  }
  return out;
}

export function layoutYTopOverridesApiPayload(
  overridesByQuestionId: Record<string, number>,
  questions: QuestionItem[]
): { layout_y_top_overrides?: { order_index: number; y_top_pt: number }[] } {
  const list = buildLayoutYTopOverridesForApi(overridesByQuestionId, questions);
  return list.length > 0 ? { layout_y_top_overrides: list } : {};
}

type SaveFilterInput = {
  overridesByQuestionId: Record<string, number>;
  placementOverrides: Record<string, LayoutPlacementOverride>;
  questions: QuestionItem[];
  layout: LayoutItem[];
  baseLayout: LayoutItem[];
  columns: number;
  pageWpt: number;
  pageHpt: number;
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
};

function bandForPage(input: Omit<LayoutGeometryInput, "pageNum">, pageNum: number) {
  return computePageColumnBand({ ...input, pageNum });
}

function geoBaseFromInput(input: {
  columns: number;
  pageWpt: number;
  pageHpt: number;
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
}): Omit<LayoutGeometryInput, "pageNum"> {
  return {
    pageWpt: input.pageWpt,
    pageHpt: input.pageHpt,
    marginTopMm: input.marginTopMm,
    marginBottomMm: input.marginBottomMm,
    marginLeftMm: input.marginLeftMm,
    marginRightMm: input.marginRightMm,
    columns: input.columns,
    columnGapMm: 8,
    writtenPaperHeader: false,
    includeDescription: false,
    descriptionColumnCount: 1,
    descriptionTexts: [],
  };
}

/** Yerleşim taşımasından etkilenen sütun anahtarları (page:col). */
export function collectPlacementAffectedColumnKeys(input: {
  placementOverrides: Record<string, LayoutPlacementOverride>;
  questions: QuestionItem[];
  baseLayout: LayoutItem[];
  columns: number;
  pageWpt: number;
  pageHpt: number;
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
}): Set<string> {
  const geoBase = geoBaseFromInput(input);
  const affectedColumns = new Set<string>();

  for (const ov of Object.values(input.placementOverrides)) {
    affectedColumns.add(`${ov.page_num}:${ov.column_index}`);
  }

  for (const qid of Object.keys(input.placementOverrides)) {
    const q = input.questions.find((x) => x.id === qid);
    if (!q) continue;
    const baseItem = input.baseLayout.find((l) => l.order_index === q.order_index);
    if (!baseItem) continue;
    const page = baseItem.page_num ?? 1;
    const band = bandForPage(geoBase, page);
    const col = columnIndexFromQuestionXPt(baseItem.x_pt, band);
    affectedColumns.add(`${page}:${col}`);
  }

  return affectedColumns;
}

/** Etkilenen sütunlardaki soru id'leri — taşıma sonrası y override temizliği için. */
export function questionIdsInPlacementAffectedColumns(input: {
  placementOverrides: Record<string, LayoutPlacementOverride>;
  questions: QuestionItem[];
  layout: LayoutItem[];
  baseLayout: LayoutItem[];
  columns: number;
  pageWpt: number;
  pageHpt: number;
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
}): string[] {
  if (Object.keys(input.placementOverrides).length === 0) return [];

  const affectedColumns = collectPlacementAffectedColumnKeys(input);
  const geoBase = geoBaseFromInput(input);
  const ids: string[] = [];

  for (const q of input.questions) {
    const item = input.layout.find((l) => l.order_index === q.order_index);
    if (!item) continue;
    const page = item.page_num ?? 1;
    const band = bandForPage(geoBase, page);
    const col = columnIndexFromQuestionXPt(item.x_pt, band);
    if (affectedColumns.has(`${page}:${col}`)) ids.push(q.id);
  }

  return ids;
}

/** Sütun yerleşimi varken repack edilen sütunların y override'larını çıkarır. */
export function filterYTopOverridesForPlacementSave(
  input: SaveFilterInput
): Record<string, number> {
  const {
    overridesByQuestionId,
    placementOverrides,
    questions,
    layout,
    baseLayout,
    columns,
  } = input;
  if (Object.keys(placementOverrides).length === 0) return overridesByQuestionId;

  const affectedColumns = collectPlacementAffectedColumnKeys({
    placementOverrides,
    questions,
    baseLayout,
    columns,
    pageWpt: input.pageWpt,
    pageHpt: input.pageHpt,
    marginTopMm: input.marginTopMm,
    marginBottomMm: input.marginBottomMm,
    marginLeftMm: input.marginLeftMm,
    marginRightMm: input.marginRightMm,
  });

  const placementQuestionIds = new Set(Object.keys(placementOverrides));
  const geoBase = geoBaseFromInput({ ...input, columns });
  const filtered: Record<string, number> = {};

  for (const [id, yTop] of Object.entries(overridesByQuestionId)) {
    if (placementQuestionIds.has(id)) continue;
    const q = questions.find((x) => x.id === id);
    if (!q) continue;
    const item = layout.find((l) => l.order_index === q.order_index);
    if (!item) {
      filtered[id] = yTop;
      continue;
    }
    const page = item.page_num ?? 1;
    const band = bandForPage(geoBase, page);
    const col = columnIndexFromQuestionXPt(item.x_pt, band);
    if (affectedColumns.has(`${page}:${col}`)) continue;
    filtered[id] = yTop;
  }

  return filtered;
}

export function layoutYTopOverridesApiPayloadForSave(
  input: SaveFilterInput
): { layout_y_top_overrides?: { order_index: number; y_top_pt: number }[] } {
  const filtered = filterYTopOverridesForPlacementSave(input);
  return layoutYTopOverridesApiPayload(filtered, input.questions);
}
