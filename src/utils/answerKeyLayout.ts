/**
 * Cevap Anahtarı layout konfigürasyonu.
 * Preview (Canvas) ve PDF export için aynı ölçüler kullanılır.
 * Backend (desktop_export.py) bu değerlerle senkron tutulmalıdır.
 */

/** pt cinsinden - PDF/ReportLab ile aynı */
export const ANSWER_KEY_LAYOUT = {
  /** Başlık satırı yüksekliği (pt) */
  HEADER_HEIGHT_PT: 14,
  /** İçerik satır yüksekliği (pt) - tüm satırlar eşit */
  ROW_HEIGHT_PT: 14,
  /** Başlık font boyutu (pt) */
  TITLE_FONT_PT: 11,
  /** Hücre font boyutu (pt) */
  CELL_FONT_PT: 9,
  /** Dış çerçeve kalınlığı (pt) */
  BORDER_WIDTH_PT: 0.8,
  /** İç grid çizgi kalınlığı (pt) */
  GRID_LINE_WIDTH_PT: 0.3,
  /** Tablo alt boşluk (pt) - sadece görsel nefes için minimal */
  TABLE_BOTTOM_PADDING_PT: 2,
} as const;

export type AnswerKeyLayoutInput = {
  items: [number, string][];
  /** Kullanılabilir alan genişliği (px) */
  totalWidthPx: number;
  columnCount: number;
  /** pt → px dönüşümü (Canvas scale) */
  scale: number;
};

export type AnswerKeyLayoutResult = {
  /** px - Canvas çizimi için */
  tableWidthPx: number;
  tableHeightPx: number;
  headerHeightPx: number;
  rowHeightPx: number;
  cellWidthPx: number;
  rowCount: number;
  columnCount: number;
};

/**
 * Cevap anahtarı layout hesaplar.
 * - tableWidth = totalWidthPx (tam genişlik kullan)
 * - cellWidth = tableWidth / columnCount (eşit sütunlar)
 * - rowHeight = sabit (tüm satırlar eşit)
 * Preview ve PDF export aynı ölçüleri kullanır.
 */
export function computeAnswerKeyLayout(
  input: AnswerKeyLayoutInput
): AnswerKeyLayoutResult {
  const { items, totalWidthPx, columnCount, scale } = input;
  const cfg = ANSWER_KEY_LAYOUT;

  const colCount = Math.max(1, Math.floor(columnCount));
  const rowCount = Math.max(1, Math.ceil((items.length || 1) / colCount));

  const tableWidthPx = Math.max(1, totalWidthPx);
  const cellWidthPx = tableWidthPx / colCount;

  const headerHeightPx = cfg.HEADER_HEIGHT_PT * scale;
  const rowHeightPx = cfg.ROW_HEIGHT_PT * scale;
  const tableHeightPx =
    headerHeightPx +
    rowCount * rowHeightPx +
    cfg.TABLE_BOTTOM_PADDING_PT * scale;

  return {
    tableWidthPx,
    tableHeightPx,
    headerHeightPx,
    rowHeightPx,
    cellWidthPx,
    rowCount,
    columnCount: colCount,
  };
}
