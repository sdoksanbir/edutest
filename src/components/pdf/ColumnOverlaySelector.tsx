import type { ColumnContentRectPx } from "../../utils/pdfLayoutGeometry";

type ColumnOverlaySelectorProps = {
  enabled: boolean;
  columnRects: ColumnContentRectPx[];
  /** 0-based, seçili sütun vurgusu */
  selectedColumnIndex: number | null;
  onColumnPointerDown: (columnIndex: number, clientX: number, clientY: number) => void;
  labels?: boolean;
};

/**
 * PDF önizleme canvas üzerinde sütun tıklama alanları — soru seçiminden önce yakalar.
 */
export default function ColumnOverlaySelector({
  enabled,
  columnRects,
  selectedColumnIndex,
  onColumnPointerDown,
  labels = true,
}: ColumnOverlaySelectorProps) {
  if (!enabled || columnRects.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-[15]"
      data-column-overlay
      aria-hidden={!enabled}
    >
      {columnRects.map((r, i) => (
        <button
          key={i}
          type="button"
          className={`pointer-events-auto absolute flex flex-col items-center justify-start border-2 border-dashed transition-colors ${
            selectedColumnIndex === i
              ? "border-blue-400 bg-blue-500/15"
              : "border-slate-400/50 bg-slate-500/5 hover:border-blue-300/70 hover:bg-blue-500/10"
          }`}
          style={{
            left: r.leftPx,
            top: r.topPx,
            width: r.widthPx,
            height: r.heightPx,
          }}
          title={`${i + 1}. sütun`}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onColumnPointerDown(i, e.clientX, e.clientY);
          }}
        >
          {labels && (
            <span className="mt-1 rounded bg-slate-900/70 px-1.5 py-0.5 text-[0.625rem] font-bold text-white">
              {i + 1}. sütun
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
