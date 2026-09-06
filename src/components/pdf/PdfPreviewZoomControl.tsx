type PdfPreviewZoomControlProps = {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  minZoom?: number;
  maxZoom?: number;
};

function ZoomMagnifierIcon({ plus }: { plus: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="10.5" cy="10.5" r="5.75" stroke="currentColor" strokeWidth="1.75" />
      <path d="M15 15L20 20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path
        d={plus ? "M10.5 8v5M8 10.5h5" : "M8 10.5h5"}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function PdfPreviewZoomControl({
  zoom,
  onZoomIn,
  onZoomOut,
  minZoom = 0.3,
  maxZoom = 3,
}: PdfPreviewZoomControlProps) {
  const pct = Math.round(zoom * 100);

  return (
    <div
      className="pdf-preview-zoom-control pointer-events-auto flex flex-col items-center gap-1.5"
      role="group"
      aria-label="Yakınlaştırma"
    >
      <button
        type="button"
        className="pdf-preview-zoom-control__btn flex h-9 w-9 items-center justify-center rounded-xl transition disabled:cursor-default disabled:opacity-40"
        onClick={onZoomIn}
        disabled={zoom >= maxZoom - 0.001}
        title="Büyüt"
        aria-label="Büyüt"
      >
        <ZoomMagnifierIcon plus />
      </button>
      <div
        className="pdf-preview-zoom-control__badge flex h-8 min-w-[3.25rem] items-center justify-center rounded-full px-2.5 text-[11px] font-bold tabular-nums"
        aria-live="polite"
        aria-label={`Yakınlaştırma yüzde ${pct}`}
      >
        %{pct}
      </div>
      <button
        type="button"
        className="pdf-preview-zoom-control__btn flex h-9 w-9 items-center justify-center rounded-xl transition disabled:cursor-default disabled:opacity-40"
        onClick={onZoomOut}
        disabled={zoom <= minZoom + 0.001}
        title="Küçült"
        aria-label="Küçült"
      >
        <ZoomMagnifierIcon plus={false} />
      </button>
    </div>
  );
}
