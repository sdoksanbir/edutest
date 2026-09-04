import { useEffect, useState } from "react";

/** Viewport ≤ 90rem (~1440px CSS) — PDF modal compact layout */
const COMPACT_MQ = "(max-width: 90rem)";

export function useCompactViewport(): boolean {
  const [compact, setCompact] = useState(
    () => typeof window !== "undefined" && window.matchMedia(COMPACT_MQ).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(COMPACT_MQ);
    const onChange = () => setCompact(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return compact;
}

/** Thumbnail canvas width derived from --pdf-panel-thumb-width (all breakpoints) */
export function usePdfThumbCanvasWidthPx(): number {
  const [width, setWidth] = useState(131);

  useEffect(() => {
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:absolute;visibility:hidden;pointer-events:none;width:var(--pdf-panel-thumb-width);";
    document.body.appendChild(probe);

    const read = () => {
      const panelPx = probe.offsetWidth;
      setWidth(Math.max(90, Math.round(panelPx - 24)));
    };

    read();
    window.addEventListener("resize", read);
    return () => {
      window.removeEventListener("resize", read);
      probe.remove();
    };
  }, []);

  return width;
}
