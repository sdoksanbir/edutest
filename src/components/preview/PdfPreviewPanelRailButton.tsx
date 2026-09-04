export type PanelRailVariant = "edit" | "theme" | "pages" | "optik";

type Props = {
  variant: PanelRailVariant;
  mode: "collapse" | "expand";
  onClick: () => void;
  label?: string;
  ariaLabel?: string;
};

const LABELS: Record<PanelRailVariant, string> = {
  edit: "Düzenleme",
  theme: "Tema",
  pages: "Sayfalar",
  optik: "Optik",
};

function collapseSideClass(variant: PanelRailVariant) {
  if (variant === "edit") return "left";
  if (variant === "pages") return "pages";
  return "right";
}

function ChevronLeftIcon({ variant }: { variant: PanelRailVariant }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`pdf-preview-${variant}-rail__icon shrink-0`} aria-hidden>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ variant }: { variant: PanelRailVariant }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`pdf-preview-${variant}-rail__icon shrink-0`} aria-hidden>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function railArrow(variant: PanelRailVariant, mode: "collapse" | "expand") {
  const pointsOutward = variant === "edit" ? mode === "collapse" : mode === "expand";

  return pointsOutward ? <ChevronRightIcon variant={variant} /> : <ChevronLeftIcon variant={variant} />;
}

export default function PdfPreviewPanelRailButton({ variant, mode, onClick, label, ariaLabel }: Props) {
  const text = label ?? LABELS[variant];
  const defaultAria =
    mode === "collapse"
      ? `${text} panelini gizle`
      : `${text} panelini göster`;

  const railClass =
    mode === "collapse"
      ? `pdf-preview-panel-collapse-rail pdf-preview-panel-collapse-rail--${collapseSideClass(variant)}`
      : `pdf-preview-panel-rail pdf-preview-${variant}-rail flex shrink-0 flex-col items-center justify-center gap-2 transition`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={railClass}
      aria-label={ariaLabel ?? defaultAria}
      title={ariaLabel ?? defaultAria}
    >
      {railArrow(variant, mode)}
      <span className={`pdf-preview-${variant}-rail__label`}>{text}</span>
    </button>
  );
}
