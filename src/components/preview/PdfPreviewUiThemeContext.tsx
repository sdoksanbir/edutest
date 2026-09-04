import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  loadPdfPreviewUiMode,
  pdfPreviewUiThemes,
  PDF_PREVIEW_UI_STORAGE_KEY,
  type PdfPreviewUiMode,
  type PdfPreviewUiTokens,
} from "../../styles/pdfPreviewUiTheme";

type PdfPreviewUiContextValue = {
  mode: PdfPreviewUiMode;
  tokens: PdfPreviewUiTokens;
  setMode: (mode: PdfPreviewUiMode) => void;
  toggleMode: () => void;
};

const PdfPreviewUiContext = createContext<PdfPreviewUiContextValue | null>(null);

export function PdfPreviewUiThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<PdfPreviewUiMode>(loadPdfPreviewUiMode);

  const setMode = useCallback((next: PdfPreviewUiMode) => {
    setModeState(next);
    try {
      localStorage.setItem(PDF_PREVIEW_UI_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "light" ? "dark" : "light");
  }, [mode, setMode]);

  const value = useMemo(
    () => ({
      mode,
      tokens: pdfPreviewUiThemes[mode],
      setMode,
      toggleMode,
    }),
    [mode, setMode, toggleMode],
  );

  return (
    <PdfPreviewUiContext.Provider value={value}>{children}</PdfPreviewUiContext.Provider>
  );
}

export function usePdfPreviewUi() {
  const ctx = useContext(PdfPreviewUiContext);
  if (!ctx) {
    throw new Error("usePdfPreviewUi must be used within PdfPreviewUiThemeProvider");
  }
  return ctx;
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function PdfPreviewThemeToggle({
  compact = false,
  variant = "panel",
}: {
  compact?: boolean;
  /** topbar: anasayfa üst banner stiline uyumlu */
  variant?: "panel" | "topbar";
}) {
  const { mode, setMode, tokens: t } = usePdfPreviewUi();

  const sizeClass = compact ? "gap-1 px-2 py-1 text-[0.6875rem]" : "gap-1.5 px-2.5 py-1.5 text-xs";

  if (variant === "topbar") {
    return (
      <div
        className="pdf-preview-theme-toggle flex shrink-0 items-center gap-0.5 rounded-lg border border-white/28 bg-black/14 p-0.5"
        role="group"
        aria-label="PDF düzenleme teması"
      >
        <button
          type="button"
          onClick={() => setMode("light")}
          className={`pdf-preview-theme-toggle__btn flex items-center rounded-md font-medium transition ${sizeClass} ${
            mode === "light" ? "pdf-preview-theme-toggle__btn--active" : ""
          }`}
          aria-pressed={mode === "light"}
          title="Açık tema"
        >
          <SunIcon />
          {!compact && "Açık"}
        </button>
        <button
          type="button"
          onClick={() => setMode("dark")}
          className={`pdf-preview-theme-toggle__btn flex items-center rounded-md font-medium transition ${sizeClass} ${
            mode === "dark" ? "pdf-preview-theme-toggle__btn--active" : ""
          }`}
          aria-pressed={mode === "dark"}
          title="Koyu tema"
        >
          <MoonIcon />
          {!compact && "Koyu"}
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/80 p-0.5 dark:border-[#475569]"
      role="group"
      aria-label="Arayüz teması"
    >
      <button
        type="button"
        onClick={() => setMode("light")}
        className={`flex items-center rounded-md font-medium transition ${
          compact ? "gap-1 px-2 py-1 text-[0.6875rem]" : "gap-1.5 px-2.5 py-1.5 text-xs"
        } ${mode === "light" ? t.topBarBtnActive : t.topBarBtn}`}
        aria-pressed={mode === "light"}
        title="Açık tema"
      >
        <SunIcon />
        {!compact && "Açık"}
      </button>
      <button
        type="button"
        onClick={() => setMode("dark")}
        className={`flex items-center rounded-md font-medium transition ${
          compact ? "gap-1 px-2 py-1 text-[0.6875rem]" : "gap-1.5 px-2.5 py-1.5 text-xs"
        } ${mode === "dark" ? t.topBarBtnActive : t.topBarBtn}`}
        aria-pressed={mode === "dark"}
        title="Koyu tema"
      >
        <MoonIcon />
        {!compact && "Koyu"}
      </button>
    </div>
  );
}
