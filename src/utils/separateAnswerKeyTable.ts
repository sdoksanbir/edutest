/**
 * Ayrı sayfa cevap anahtarı — şık tablo (önizleme canvas).
 */

/** Cevap anahtarı sabit renkleri — tema renginden bağımsız */
export const ANSWER_KEY_NAVY_HEX = "#0A1931";
export const ANSWER_KEY_RED_HEX = "#DC2626";

export const SEPARATE_AK = {
  HEADER_H_PT: 28,
  ROW_H_PT: 22,
  BORDER_PT: 1,
  GRID_PT: 0.45,
  TITLE_FONT_PT: 13,
  NUM_FONT_PT: 9.5,
  ANS_FONT_PT: 11,
  /** Satırda kaç soru (No+Cevap çifti) */
  PAIRS_PER_ROW: 5,
  BOTTOM_PAD_PT: 2,
  CORNER_R_PT: 6,
  PILL_PAD_X_PT: 5,
  PILL_H_PT: 15,
  ACCENT_BAR_PT: 2.75,
  TOP_GAP_PT: 6,
} as const;

export type SeparateAkItem = [string | number, string];

export type SeparateAkLayout = {
  tableWidthPx: number;
  tableHeightPx: number;
  headerHeightPx: number;
  rowHeightPx: number;
  pairWidthPx: number;
  rowCount: number;
  pairsPerRow: number;
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h.padEnd(6, "0").slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return [10, 25, 49];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(r: number, g: number, b: number, a: number): string {
  return `rgba(${r},${g},${b},${a})`;
}

export function computeSeparateAnswerKeyLayout(input: {
  itemCount: number;
  totalWidthPx: number;
  scale: number;
  pairsPerRow?: number;
}): SeparateAkLayout {
  const pairs = Math.max(1, input.pairsPerRow ?? SEPARATE_AK.PAIRS_PER_ROW);
  const rowCount = Math.max(1, Math.ceil(Math.max(1, input.itemCount) / pairs));
  const s = input.scale;
  return {
    tableWidthPx: Math.max(1, input.totalWidthPx),
    tableHeightPx:
      (SEPARATE_AK.HEADER_H_PT +
        rowCount * SEPARATE_AK.ROW_H_PT +
        SEPARATE_AK.BOTTOM_PAD_PT) *
      s,
    headerHeightPx: SEPARATE_AK.HEADER_H_PT * s,
    rowHeightPx: SEPARATE_AK.ROW_H_PT * s,
    pairWidthPx: Math.max(1, input.totalWidthPx) / pairs,
    rowCount,
    pairsPerRow: pairs,
  };
}

/** Ayrı sayfada sığan satır sayısı / kapasite */
export function separateAnswerKeyCapacity(params: {
  availableHeightPt: number;
  pairsPerRow?: number;
}): { maxRows: number; capacity: number; pairsPerRow: number } {
  const pairs = Math.max(1, params.pairsPerRow ?? SEPARATE_AK.PAIRS_PER_ROW);
  const available = Math.max(
    0,
    params.availableHeightPt - SEPARATE_AK.HEADER_H_PT - SEPARATE_AK.BOTTOM_PAD_PT,
  );
  const maxRows =
    available >= SEPARATE_AK.ROW_H_PT
      ? Math.floor(available / SEPARATE_AK.ROW_H_PT)
      : 0;
  return { maxRows, capacity: maxRows * pairs, pairsPerRow: pairs };
}

export function drawSeparateAnswerKeyTableCanvas(params: {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  width: number;
  scale: number;
  items: SeparateAkItem[];
  title?: string;
  /** @deprecated Tema rengi yok sayılır — sabit lacivert/kırmızı */
  primaryHex?: string;
  /** @deprecated Tema rengi yok sayılır — sabit lacivert/kırmızı */
  accentHex?: string;
  pairsPerRow?: number;
}): SeparateAkLayout {
  const {
    ctx,
    x,
    y,
    width,
    scale: s,
    items,
    title = "CEVAP ANAHTARI",
  } = params;

  const layout = computeSeparateAnswerKeyLayout({
    itemCount: items.length,
    totalWidthPx: width,
    scale: s,
    pairsPerRow: params.pairsPerRow,
  });
  const {
    tableWidthPx: tw,
    tableHeightPx: th,
    headerHeightPx: hh,
    rowHeightPx: rh,
    pairWidthPx: pw,
    rowCount,
    pairsPerRow,
  } = layout;

  const [pr, pg, pb] = hexToRgb(ANSWER_KEY_NAVY_HEX);
  const [ar, ag, ab] = hexToRgb(ANSWER_KEY_RED_HEX);
  const primary = `rgb(${pr},${pg},${pb})`;
  const accent = `rgb(${ar},${ag},${ab})`;
  const cornerR = SEPARATE_AK.CORNER_R_PT * s;
  const borderW = SEPARATE_AK.BORDER_PT * s;

  ctx.save();

  // Gölge hafif
  ctx.shadowColor = "rgba(10,25,49,0.08)";
  ctx.shadowBlur = 8 * s;
  ctx.shadowOffsetY = 2 * s;

  // Dış gövde
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(x, y, tw, th, cornerR);
  ctx.fill();
  ctx.shadowColor = "transparent";

  // Başlık bandı
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, tw, hh, [cornerR, cornerR, 0, 0]);
  ctx.clip();
  ctx.fillStyle = primary;
  ctx.fillRect(x, y, tw, hh);
  ctx.restore();

  // Accent şerit
  const barH = SEPARATE_AK.ACCENT_BAR_PT * s;
  ctx.fillStyle = accent;
  ctx.fillRect(x, y + hh - barH, tw, barH);

  // Başlık metni
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${SEPARATE_AK.TITLE_FONT_PT * s}px "Segoe UI", Arial, Helvetica, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    title.trim().toUpperCase().slice(0, 48),
    x + tw / 2,
    y + (hh - barH) / 2,
  );

  // Satırlar
  for (let r = 0; r < rowCount; r++) {
    const rowY = y + hh + r * rh;
    if (r % 2 === 1) {
      ctx.fillStyle = rgba(pr, pg, pb, 0.045);
      ctx.fillRect(x, rowY, tw, rh);
    }

    for (let c = 0; c < pairsPerRow; c++) {
      const idx = r * pairsPerRow + c;
      if (idx >= items.length) break;
      const [num, ansRaw] = items[idx]!;
      const ans = (ansRaw || "?").trim().toUpperCase() || "?";
      const cellX = x + c * pw;
      const midY = rowY + rh / 2;
      const label = String(num);

      // Soru no / ÖRNEK 1 / ÖSYM
      ctx.fillStyle = rgba(pr, pg, pb, 0.72);
      const labelFontPt =
        label.length > 4 ? SEPARATE_AK.NUM_FONT_PT * 0.88 : SEPARATE_AK.NUM_FONT_PT;
      ctx.font = `600 ${labelFontPt * s}px "Segoe UI", Arial, Helvetica, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, cellX + pw * 0.32, midY, pw * 0.5);

      // Cevap hapı
      const pillH = SEPARATE_AK.PILL_H_PT * s;
      const pillPadX = SEPARATE_AK.PILL_PAD_X_PT * s;
      ctx.font = `700 ${SEPARATE_AK.ANS_FONT_PT * s}px "Segoe UI", Arial, Helvetica, sans-serif`;
      const ansW = Math.max(
        pillH,
        ctx.measureText(ans).width + pillPadX * 2,
      );
      const pillX = cellX + pw * 0.72 - ansW / 2;
      const pillY = midY - pillH / 2;
      ctx.fillStyle = rgba(ar, ag, ab, 0.12);
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, ansW, pillH, pillH / 2);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.fillText(ans, pillX + ansW / 2, midY);
    }
  }

  // Dikey ayırıcılar
  ctx.strokeStyle = rgba(pr, pg, pb, 0.12);
  ctx.lineWidth = SEPARATE_AK.GRID_PT * s;
  for (let c = 1; c < pairsPerRow; c++) {
    const lx = x + c * pw;
    ctx.beginPath();
    ctx.moveTo(lx, y + hh);
    ctx.lineTo(lx, y + th);
    ctx.stroke();
  }

  // Yatay satır çizgileri
  for (let r = 1; r < rowCount; r++) {
    const ly = y + hh + r * rh;
    ctx.beginPath();
    ctx.moveTo(x, ly);
    ctx.lineTo(x + tw, ly);
    ctx.stroke();
  }

  // Dış çerçeve
  ctx.strokeStyle = primary;
  ctx.lineWidth = borderW;
  ctx.beginPath();
  ctx.roundRect(x, y, tw, th, cornerR);
  ctx.stroke();

  ctx.restore();
  return layout;
}
