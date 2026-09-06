import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePdfPreviewUi } from "./PdfPreviewUiThemeContext";

const CollapseGroupContext = createContext<{ closeEpoch: number; openEpoch: number } | null>(
  null,
);

export function CollapseGroupProvider({
  closeEpoch,
  openEpoch = 0,
  children,
}: {
  closeEpoch: number;
  openEpoch?: number;
  children: ReactNode;
}) {
  return (
    <CollapseGroupContext.Provider value={{ closeEpoch, openEpoch }}>
      {children}
    </CollapseGroupContext.Provider>
  );
}

export function CollapseChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

type CollapsibleCardProps = {
  title: ReactNode;
  titleClassName?: string;
  defaultOpen?: boolean;
  variant?: "card" | "nested" | "section" | "panel";
  className?: string;
  headerExtra?: ReactNode;
  contentClassName?: string;
  fill?: boolean;
  collapseLabel?: string;
  children: ReactNode;
};

export default function CollapsibleCard({
  title,
  titleClassName,
  defaultOpen = false,
  variant = "card",
  className = "",
  headerExtra,
  contentClassName = "",
  fill = false,
  collapseLabel,
  children,
}: CollapsibleCardProps) {
  const { tokens: t } = usePdfPreviewUi();
  const [open, setOpen] = useState(defaultOpen);
  const group = useContext(CollapseGroupContext);
  const closeEpoch = group?.closeEpoch ?? 0;
  const openEpoch = group?.openEpoch ?? 0;

  useEffect(() => {
    if (closeEpoch > 0) setOpen(false);
  }, [closeEpoch]);

  useEffect(() => {
    if (openEpoch > 0) setOpen(true);
  }, [openEpoch]);

  const shellClass =
    variant === "nested"
      ? t.nestedCard
      : variant === "section"
        ? `${t.sectionCard} overflow-hidden`
        : variant === "panel"
          ? "rounded-xl border border-slate-200/80 bg-white shadow-sm"
          : t.card;

  const defaultTitleClass =
    variant === "nested"
      ? t.sectionSubtitle
      : variant === "section"
        ? t.accentBlueTitle
        : variant === "panel"
          ? t.cardTitle.replace("mb-3 ", "")
          : "pdf-preview-collapsible__title";

  const resolvedTitleClass = titleClassName ?? defaultTitleClass;

  const label =
    collapseLabel ??
    (typeof title === "string" ? `${title} bölümünü ${open ? "gizle" : "göster"}` : "Bölümü aç/kapat");

  const toggle = () => setOpen((v) => !v);

  const headerPad =
    variant === "section" ? "px-3.5 py-3" : variant === "panel" ? "px-2.5 py-2" : "";

  const contentWrapClass =
    variant === "section"
      ? "space-y-3 border-t border-slate-800 px-3 pb-3 pt-2.5"
      : variant === "panel"
        ? "border-t border-slate-200/80 px-2.5 pb-2.5 pt-2"
        : variant === "nested"
          ? "mt-2.5 space-y-2.5"
          : "mt-3 space-y-0";

  return (
    <div
      className={`pdf-preview-collapsible pdf-preview-collapsible--${open ? "open" : "closed"} min-w-0 ${variant === "panel" && fill ? "" : "mb-3"} ${shellClass}${fill ? " flex min-h-0 flex-1 flex-col" : ""}${className ? ` ${className}` : ""}`}
    >
      <div className={`pdf-preview-collapsible__header flex items-center justify-between gap-2 ${headerPad}`}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label={label}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className={`${resolvedTitleClass} min-w-0 truncate`}>{title}</span>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {headerExtra}
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-label={label}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${t.collapseBtn}`}
          >
            <CollapseChevron open={open} />
          </button>
        </div>
      </div>
      {open && (
        <div
          className={`${contentWrapClass}${fill ? " flex min-h-0 flex-1 flex-col" : ""}${contentClassName ? ` ${contentClassName}` : ""}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
