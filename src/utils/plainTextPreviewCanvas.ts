const SANS_STACK =
  'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/**
 * html2canvas kullanmadan düz metin önizlemesi — canlı punto değişiminde hızlı.
 * Yerleştirme ile aynı font ağırlığı / satır aralığı hedefi.
 */
export function plainTextToCanvasSync(
  raw: string,
  fontSizePx: number,
  maxWidthPx: number
): HTMLCanvasElement {
  const pad = 4;
  const lineHeight = fontSizePx * 1.3;
  const font = `500 ${fontSizePx}px ${SANS_STACK}`;
  const measureCv = document.createElement("canvas");
  const mctx = measureCv.getContext("2d");
  if (!mctx) {
    const c = document.createElement("canvas");
    c.width = 8;
    c.height = 8;
    return c;
  }
  mctx.font = font;
  const maxW = Math.max(24, maxWidthPx - 2 * pad);
  const text = raw.trim() || "\u00a0";
  const lines: string[] = [];

  const pushBrokenWord = (word: string) => {
    let rest = word;
    while (rest.length > 0) {
      let lo = 1;
      let hi = rest.length;
      let fit = "";
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const slice = rest.slice(0, mid);
        if (mctx.measureText(slice).width <= maxW) {
          fit = slice;
          lo = mid + 1;
        } else hi = mid - 1;
      }
      if (!fit) fit = rest.slice(0, 1);
      lines.push(fit);
      rest = rest.slice(fit.length);
    }
  };

  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const w of words) {
      if (mctx.measureText(w).width > maxW) {
        if (line) {
          lines.push(line);
          line = "";
        }
        pushBrokenWord(w);
        continue;
      }
      const test = line ? `${line} ${w}` : w;
      if (mctx.measureText(test).width <= maxW) line = test;
      else {
        if (line) lines.push(line);
        line = w;
      }
    }
    if (line) lines.push(line);
    if (words.length === 0) lines.push("");
  }

  let maxLineW = 0;
  for (const ln of lines) {
    maxLineW = Math.max(maxLineW, mctx.measureText(ln).width);
  }
  const cw = Math.min(maxWidthPx, Math.ceil(maxLineW + 2 * pad));
  const ch = Math.ceil(Math.max(lineHeight, lines.length * lineHeight + 2 * pad));

  const out = document.createElement("canvas");
  out.width = Math.max(1, cw);
  out.height = Math.max(1, ch);
  const ctx = out.getContext("2d");
  if (!ctx) return out;
  ctx.font = font;
  ctx.fillStyle = "#0f172a";
  ctx.textBaseline = "top";
  let y = pad;
  for (const ln of lines) {
    ctx.fillText(ln, pad, y);
    y += lineHeight;
  }
  return out;
}
