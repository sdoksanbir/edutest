/** Canvas / HTML önizleme — yazılı soru çizimi (PDF pt → canvas px via scale) */

export const WRITTEN_BADGE_H_PT = 16;
export const WRITTEN_BADGE_GAP_PT = 8;
export const WRITTEN_STEM_LINE_PT = 12;
export const WRITTEN_ANSWER_LINE_GAP_PT = 14;

export function stripHtmlToPlain(html: string): string {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const paragraphs = text.split("\n");
  const lines: string[] = [];
  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let cur = words[0]!;
    for (let i = 1; i < words.length; i++) {
      const trial = `${cur} ${words[i]}`;
      if (ctx.measureText(trial).width <= maxWidth) {
        cur = trial;
      } else {
        lines.push(cur);
        cur = words[i]!;
      }
    }
    lines.push(cur);
  }
  return lines;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export type WrittenPaperDrawInput = {
  ctx: CanvasRenderingContext2D;
  /** Sol üst (canvas px) */
  x: number;
  y: number;
  w: number;
  h: number;
  /** PDF pt → px */
  scale: number;
  displayNumber: number;
  stemHtml?: string;
  answerArea?: "lines" | "box" | "none" | string;
  answerLines?: number;
  accentHex?: string;
};

/** Yazılı soru: Soru N rozeti + metin + noktalı satırlar / kutu */
export function drawWrittenOpenEndedOnCanvas(input: WrittenPaperDrawInput): void {
  const {
    ctx,
    x,
    y,
    w,
    h,
    scale,
    displayNumber,
    stemHtml = "",
    answerArea = "lines",
    answerLines = 5,
    accentHex = "#0D9488",
  } = input;
  if (!(w > 0) || !(h > 0)) return;

  const accent = accentHex || "#0D9488";
  const badgeH = WRITTEN_BADGE_H_PT * scale;
  const badgeGap = WRITTEN_BADGE_GAP_PT * scale;
  const stemLineH = WRITTEN_STEM_LINE_PT * scale;
  const lineGap = WRITTEN_ANSWER_LINE_GAP_PT * scale;

  // Rozet
  const label = `Soru ${displayNumber}`;
  ctx.font = `bold ${Math.max(9, 9 * scale)}px Helvetica, Arial, sans-serif`;
  const tw = ctx.measureText(label).width;
  const badgeW = Math.min(w, tw + 14 * scale);
  const badgeR = 3 * scale;
  ctx.fillStyle = `${accent}22`;
  roundRect(ctx, x, y, badgeW, badgeH, badgeR);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(x, y, 3 * scale, badgeH);
  ctx.fillStyle = accent;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + 8 * scale, y + badgeH / 2);

  let cy = y + badgeH + badgeGap;

  // Soru metni
  const stem = stripHtmlToPlain(stemHtml);
  if (stem) {
    ctx.font = `${Math.max(9, 10 * scale)}px Helvetica, Arial, sans-serif`;
    ctx.fillStyle = "#1e293b";
    ctx.textBaseline = "top";
    const lines = wrapText(ctx, stem, w);
    for (const line of lines) {
      if (cy + stemLineH > y + h) break;
      ctx.fillText(line, x, cy);
      cy += stemLineH;
    }
    cy += 2 * scale;
  }

  const area = answerArea || "lines";
  if (area === "none") return;

  if (area === "box") {
    const boxH = Math.min(Math.max(40 * scale, y + h - cy), 90 * scale);
    if (boxH > 8 * scale) {
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = Math.max(1, 1 * scale);
      ctx.setLineDash([4 * scale, 3 * scale]);
      roundRect(ctx, x, cy, w, boxH, 4 * scale);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    return;
  }

  // Noktalı cevap satırları
  const n = Math.max(1, Math.min(30, Math.round(Number(answerLines) || 5)));
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = Math.max(1, 0.9 * scale);
  ctx.setLineDash([2.5 * scale, 2.5 * scale]);
  for (let i = 0; i < n; i++) {
    const ly = cy + (i + 1) * lineGap;
    if (ly > y + h - 1) break;
    ctx.beginPath();
    ctx.moveTo(x, ly);
    ctx.lineTo(x + w, ly);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}
