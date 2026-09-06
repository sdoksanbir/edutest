import type { OptikChoice } from "./optikFormStats";

export const OPTIK_FORM_LAYOUT = {
  HEADER_HEIGHT_PT: 18,
  OPTION_HEADER_HEIGHT_PT: 12,
  ROW_HEIGHT_PT: 11,
  TITLE_FONT_PT: 10,
  SUBTITLE_FONT_PT: 7,
  LABEL_FONT_PT: 7,
  BUBBLE_FONT_PT: 6,
  NUM_COL_WIDTH_PT: 14,
  BUBBLE_DIAMETER_PT: 7,
  BUBBLE_GAP_PT: 2.5,
  BORDER_WIDTH_PT: 0.8,
  GRID_LINE_WIDTH_PT: 0.3,
  TABLE_BOTTOM_PADDING_PT: 3,
  COLUMN_GAP_PT: 8,
  MAX_COLUMNS: 4,
} as const;

export type OptikFormDrawRow = {
  number: number;
  answer: OptikChoice | null;
};

export type OptikFormLayoutInput = {
  rows: OptikFormDrawRow[];
  activeOptions: OptikChoice[];
  totalWidthPx: number;
  maxHeightPx: number;
  scale: number;
};

export type OptikFormLayoutResult = {
  tableWidthPx: number;
  tableHeightPx: number;
  headerHeightPx: number;
  optionHeaderHeightPx: number;
  rowHeightPx: number;
  columnCount: number;
  rowsPerColumn: number;
  columnWidthPx: number;
  bubbleDiameterPx: number;
  bubbleGapPx: number;
  numColWidthPx: number;
};

function columnCountForHeight(
  rowCount: number,
  maxHeightPx: number,
  scale: number,
): number {
  const cfg = OPTIK_FORM_LAYOUT;
  const fixedPx =
    (cfg.HEADER_HEIGHT_PT + cfg.OPTION_HEADER_HEIGHT_PT + cfg.TABLE_BOTTOM_PADDING_PT) * scale;
  const rowHeightPx = cfg.ROW_HEIGHT_PT * scale;
  const available = Math.max(rowHeightPx, maxHeightPx - fixedPx);
  const rowsPerCol = Math.max(1, Math.floor(available / rowHeightPx));
  return Math.min(
    cfg.MAX_COLUMNS,
    Math.max(1, Math.ceil(rowCount / rowsPerCol)),
  );
}

export function computeOptikFormLayout(input: OptikFormLayoutInput): OptikFormLayoutResult {
  const { rows, activeOptions, totalWidthPx, maxHeightPx, scale } = input;
  const cfg = OPTIK_FORM_LAYOUT;
  const rowCount = Math.max(1, rows.length);
  const columnCount = columnCountForHeight(rowCount, maxHeightPx, scale);
  const rowsPerColumn = Math.ceil(rowCount / columnCount);

  const columnGapPx = cfg.COLUMN_GAP_PT * scale;
  const tableWidthPx = Math.max(1, totalWidthPx);
  const columnWidthPx = (tableWidthPx - columnGapPx * (columnCount - 1)) / columnCount;

  const headerHeightPx = cfg.HEADER_HEIGHT_PT * scale;
  const optionHeaderHeightPx = cfg.OPTION_HEADER_HEIGHT_PT * scale;
  const rowHeightPx = cfg.ROW_HEIGHT_PT * scale;
  const tableHeightPx =
    headerHeightPx +
    optionHeaderHeightPx +
    rowsPerColumn * rowHeightPx +
    cfg.TABLE_BOTTOM_PADDING_PT * scale;

  return {
    tableWidthPx,
    tableHeightPx,
    headerHeightPx,
    optionHeaderHeightPx,
    rowHeightPx,
    columnCount,
    rowsPerColumn,
    columnWidthPx,
    bubbleDiameterPx: cfg.BUBBLE_DIAMETER_PT * scale,
    bubbleGapPx: cfg.BUBBLE_GAP_PT * scale,
    numColWidthPx: cfg.NUM_COL_WIDTH_PT * scale,
  };
}

export function optikRowsFromLayoutItems(
  layout: { display_number?: number | null; order_index: number; answer_key?: string | null }[],
  questions: { id: string; order_index: number; answer_key?: string }[],
): OptikFormDrawRow[] {
  const valid = new Set(["A", "B", "C", "D", "E"]);
  const items = layout
    .filter((l) => l.display_number != null)
    .sort((a, b) => (a.display_number as number) - (b.display_number as number));

  const mapRow = (
    number: number,
    orderIndex: number,
    answerKey?: string | null,
  ): OptikFormDrawRow => {
    const q = questions.find((x) => x.order_index === orderIndex);
    const raw = (q?.answer_key ?? answerKey ?? "").trim().toUpperCase();
    const answer = valid.has(raw) ? (raw as OptikChoice) : null;
    return { number, answer };
  };

  if (items.length > 0) {
    return items.map((item) => mapRow(item.display_number as number, item.order_index, item.answer_key));
  }

  // Numaralandırma kapalıysa layout'ta display_number olmayabilir — soru sırasını kullan
  const sorted = [...questions].sort((a, b) => a.order_index - b.order_index);
  return sorted.map((q, i) => mapRow(i + 1, q.order_index, q.answer_key));
}
