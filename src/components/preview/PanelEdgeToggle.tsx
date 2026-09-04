import { usePdfPreviewUi } from "./PdfPreviewUiThemeContext";

type Props = {
  /** Panel sol taraftaysa "left", sağ taraftaysa "right" */
  side: "left" | "right";
  open: boolean;
  onToggle: () => void;
  ariaLabel: string;
};

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {direction === "left" ? (
        <path d="M15 18l-6-6 6-6" />
      ) : (
        <path d="M9 18l6-6-6-6" />
      )}
    </svg>
  );
}

/** Kenar sekmesi — paneli gizle/göster oku (PDF düzenleme panelleri). */
export default function PanelEdgeToggle({ side, open, onToggle, ariaLabel }: Props) {
  const { tokens: t } = usePdfPreviewUi();
  const chevron =
    side === "left"
      ? open
        ? "left"
        : "right"
      : open
        ? "right"
        : "left";

  const rounded = side === "left" ? "rounded-r-md border-l-0" : "rounded-l-md border-r-0";
  const position = side === "left" ? "right-0" : "left-0";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={ariaLabel}
      aria-expanded={open}
      title={ariaLabel}
      className={`absolute top-1/2 z-30 flex h-14 w-5 -translate-y-1/2 items-center justify-center transition ${t.edgeToggle} ${rounded} ${position}`}
    >
      <ChevronIcon direction={chevron} />
    </button>
  );
}
