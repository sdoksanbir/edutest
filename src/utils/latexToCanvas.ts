import katex from "katex";
import html2canvas from "html2canvas";
import "katex/dist/katex.min.css";

const SANS_STACK =
  'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export type RenderToCanvasOptions = {
  /** Düz metin için punto (ekranda ve rasterde aynı mantık). */
  fontSizePx?: number;
  /** true ise LaTeX ayrıştırılmaz; tamamı düz metin gibi çizilir. */
  plainTextOnly?: boolean;
};

/**
 * Metin veya LaTeX'i raster görüntüye çevirir — soru canvas'ına drawImage için.
 */
export async function renderMathOrTextToCanvas(
  input: string,
  maxWidthPx: number,
  extra?: RenderToCanvasOptions
): Promise<HTMLCanvasElement> {
  const fontSizePx = extra?.fontSizePx ?? 18;
  const plainOnly = extra?.plainTextOnly === true;

  const wrap = document.createElement("div");
  wrap.style.position = "fixed";
  wrap.style.left = "-12000px";
  wrap.style.top = "0";
  wrap.style.zIndex = "-1";
  wrap.style.maxWidth = `${Math.max(80, maxWidthPx)}px`;
  wrap.style.padding = "6px";
  wrap.style.background = "transparent";
  document.body.appendChild(wrap);
  try {
    const trimmed = input.trim();
    if (!trimmed) {
      wrap.innerHTML = "";
      wrap.appendChild(document.createTextNode("\u00a0"));
    } else {
      const looksLatex =
        !plainOnly &&
        (trimmed.includes("\\") ||
          /^\$.*\$$/.test(trimmed) ||
          (trimmed.includes("{") && trimmed.includes("}")) ||
          trimmed.includes("^"));
      if (looksLatex) {
        const raw = trimmed.replace(/^\$+|\$+$/g, "").trim();
        katex.render(raw || "\\;", wrap, {
          displayMode: true,
          throwOnError: false,
          trust: false,
        });
      } else {
        wrap.style.fontFamily = SANS_STACK;
        wrap.style.fontSize = `${fontSizePx}px`;
        wrap.style.lineHeight = "1.3";
        wrap.style.fontWeight = "500";
        wrap.style.color = "#0f172a";
        wrap.style.whiteSpace = "pre-wrap";
        wrap.textContent = trimmed;
      }
    }
    await document.fonts.ready;
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    return await html2canvas(wrap, {
      scale: Math.min(2, window.devicePixelRatio || 2),
      backgroundColor: null,
      logging: false,
      useCORS: true,
    });
  } finally {
    document.body.removeChild(wrap);
  }
}
