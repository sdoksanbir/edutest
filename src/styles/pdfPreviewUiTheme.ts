export type PdfPreviewUiMode = "light" | "dark";



/** PDF sayfa önizlemesinin arkasındaki çalışma alanı rengi */

export const PDF_PREVIEW_CANVAS_BG = "var(--canvas-bg)";



export type PdfPreviewUiTokens = {

  shell: string;

  topBar: string;

  topBarTitle: string;

  topBarBtn: string;

  topBarBtnActive: string;

  sidebar: string;

  sidebarBorder: string;

  sidebarHeader: string;

  sidebarTitle: string;

  card: string;

  cardTitle: string;

  cardAccent: string;

  label: string;

  labelStrong: string;

  labelMuted: string;

  body: string;

  hint: string;

  monoValue: string;

  link: string;

  input: string;

  select: string;

  numberInput: string;

  toggleOff: string;

  toggleOn: string;

  segActive: string;

  segInactive: string;

  divider: string;

  edgeToggle: string;

  thumbPanel: string;

  thumbTitle: string;

  bottomBar: string;

  bottomBarBorder: string;

  bottomBarBtn: string;

  bottomBarText: string;

  bottomBarSelect: string;

  bottomBarPrimary: string;

  bottomBarCancel: string;

  questionGrid: string;

  questionGridHeader: string;

  questionBoxDefault: string;

  questionBoxSelected: string;

  valueBadge: string;

  nestedCard: string;

  nestedBorder: string;

  collapseBtn: string;

  chipActive: string;

  chipInactive: string;

  microLabel: string;

  smallBtn: string;

  sectionSubtitle: string;

  previewCanvasWrap: string;

  previewPageFrame: string;

  sectionCard: string;

  accentBlueTitle: string;

  canvasArea: string;

};



const light: PdfPreviewUiTokens = {

  shell: "bg-[var(--app-bg)] text-[var(--text-primary)]",

  topBar:

    "border-b border-[var(--border)] bg-[var(--panel-bg)] shadow-[var(--shadow-card)]",

  topBarTitle: "text-sm font-bold text-[var(--text-primary)]",

  topBarBtn:

    "rounded-full border border-[var(--border)] bg-[var(--surface-hover)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-module)] transition hover:border-[var(--border-strong)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]",

  topBarBtnActive:

    "border-[var(--primary)] bg-[var(--primary)] text-[var(--text-on-primary)] shadow-[var(--shadow-primary-sm)] font-semibold",

  sidebar: "bg-[var(--surface-secondary)]",

  sidebarBorder: "border-r border-[var(--border)]",

  sidebarHeader: "rounded-xl border border-[var(--border-light)] bg-[var(--primary-soft)] py-3 shadow-[var(--shadow-card)]",

  sidebarTitle: "text-center text-sm font-bold text-[var(--primary)] tracking-tight",

  card: "rounded-xl border border-[var(--border)] bg-[var(--panel-bg)] p-3.5 shadow-[var(--shadow-card)]",

  cardTitle:

    "mb-3 border-l-2 border-[var(--primary)] pl-2.5 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]",

  cardAccent:

    "mb-3 border-l-2 border-[var(--primary)] pl-2.5 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]",

  label: "text-xs font-medium text-[var(--text-secondary)]",

  labelStrong: "text-xs font-semibold text-[var(--text-primary)]",

  labelMuted: "text-xs font-medium text-[var(--text-muted)]",

  body: "text-sm text-[var(--text-panel)]",

  hint: "text-xs text-[var(--text-muted)]",

  monoValue: "font-mono text-xs font-semibold text-[var(--primary)]",

  link: "text-sm font-medium text-[var(--text-panel)] hover:text-[var(--primary)]",

  input:

    "w-full rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] px-2.5 py-2 text-sm text-[var(--text-panel)] shadow-[var(--shadow-card)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:shadow-[var(--focus-ring)] disabled:bg-[var(--surface-hover)] disabled:text-[var(--text-muted)]",

  select:

    "w-full rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] px-2.5 py-2 text-sm text-[var(--text-panel)] shadow-[var(--shadow-card)] outline-none focus:border-[var(--border-focus)] focus:shadow-[var(--focus-ring)] disabled:bg-[var(--surface-hover)] disabled:text-[var(--text-muted)]",

  numberInput:

    "pdf-preview-number-input h-7 w-[2.75rem] min-w-[2.75rem] shrink-0 rounded-md border border-[var(--border)] bg-[var(--panel-bg)] px-1 text-center font-mono text-xs font-semibold text-[var(--text-panel)] shadow-[var(--shadow-card)] outline-none focus:border-[var(--border-focus)] focus:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:bg-[var(--surface-hover)] disabled:text-[var(--text-muted)] disabled:opacity-50",

  toggleOff: "bg-[var(--border-strong)]",

  toggleOn: "bg-[var(--accent)]",

  segActive: "border border-[var(--accent)] bg-[var(--accent)] text-[var(--text-on-primary)] shadow-[var(--shadow-card)]",

  segInactive:

    "border border-[var(--border)] bg-[var(--panel-bg)] text-black shadow-[var(--shadow-card)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-black",

  divider: "border-t border-dotted border-[var(--border)]",

  edgeToggle:

    "border border-[var(--border)] bg-[var(--panel-bg)] text-[var(--text-icon)] shadow-[var(--shadow-floating)] hover:border-[var(--border-strong)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]",

  thumbPanel: "border-r border-[var(--border)] bg-[var(--panel-bg)] shadow-[var(--shadow-card)]",

  thumbTitle: "text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]",

  bottomBar: "bg-[var(--panel-bg)] shadow-[var(--shadow-card)]",

  bottomBarBorder: "border-t border-[var(--border)]",

  bottomBarBtn:

    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] text-[var(--text-module)] shadow-[var(--shadow-card)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-30",

  bottomBarText: "text-xs font-semibold text-[var(--text-secondary)]",

  bottomBarSelect:

    "h-8 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] pl-3 pr-7 text-xs font-medium text-[var(--text-module)] shadow-[var(--shadow-card)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] focus:border-[var(--border-focus)] focus:shadow-[var(--focus-ring)]",

  bottomBarPrimary:

    "shrink-0 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-on-primary)] shadow-[var(--shadow-primary-sm)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50",

  bottomBarCancel:

    "shrink-0 rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-module)] shadow-[var(--shadow-card)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]",

  questionGrid: "rounded-xl border border-[var(--border)] bg-[var(--panel-bg)] shadow-[var(--shadow-card)]",

  questionGridHeader: "flex h-8 items-center justify-center rounded-t-xl text-xs font-bold text-[var(--text-on-primary)]",

  questionBoxDefault:

    "border-[var(--border)] bg-[var(--panel-bg)] text-[var(--text-panel)] shadow-[var(--shadow-card)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]",

  questionBoxSelected: "border-[var(--primary)] bg-[var(--primary)] text-[var(--text-on-primary)] shadow-[var(--shadow-primary-sm)]",

  valueBadge:

    "pdf-preview-value-badge rounded-md border border-[var(--primary)]/40 bg-[color-mix(in_srgb,var(--primary)_16%,white)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--primary)] shadow-sm",

  nestedCard: "rounded-xl border border-[var(--border)] bg-[var(--panel-bg)] p-3 shadow-[var(--shadow-card)]",

  nestedBorder: "border-[var(--border)]",

  collapseBtn: "text-[var(--text-icon)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--primary)]",

  chipActive: "border border-[var(--accent)] bg-[var(--accent)] text-[var(--text-on-primary)] ring-2 ring-[var(--accent-soft)] shadow-[var(--shadow-card)]",

  chipInactive:

    "border border-[var(--border)] bg-[var(--panel-bg)] text-black shadow-[var(--shadow-card)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]",

  microLabel: "text-xs font-medium text-[var(--text-secondary)]",

  smallBtn:

    "rounded-md border border-[var(--border)] bg-[var(--panel-bg)] px-2 py-1 text-xs font-semibold text-black shadow-[var(--shadow-card)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]",

  sectionSubtitle: "text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]",

  previewCanvasWrap:

    "rounded-sm bg-[var(--panel-bg)] shadow-[var(--shadow-page)] ring-1 ring-[var(--border-page)]",

  previewPageFrame:

    "rounded-sm bg-[var(--panel-bg)] shadow-[var(--shadow-page)] border border-[var(--border-page)]",

  sectionCard: "rounded-xl border border-[var(--border)] bg-[var(--panel-bg)] shadow-[var(--shadow-card)] overflow-hidden",

  accentBlueTitle:

    "border-l-2 border-[var(--primary)] pl-2.5 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]",

  canvasArea: "bg-[var(--canvas-bg)]",

};



const dark: PdfPreviewUiTokens = {

  shell: "bg-[#0d1117] text-[#e6edf3]",

  topBar: "border-b border-[#30363d] bg-[#161b22]",

  topBarTitle: "text-sm font-semibold text-[#e6edf3]",

  topBarBtn:

    "rounded-lg border border-[#30363d] bg-[#21262d] px-2.5 py-1.5 text-xs font-medium text-[#8b949e] transition hover:bg-[#30363d] hover:text-[#e6edf3]",

  topBarBtnActive:

    "border-[#35a9b8]/60 bg-[#35a9b8]/15 text-[#56cfe8] ring-1 ring-[#35a9b8]/40",

  sidebar: "bg-[#161b22]",

  sidebarBorder: "border-r border-[#30363d]",

  sidebarHeader: "rounded-lg border border-[#30363d] bg-[#1c2128] py-3 shadow-inner",

  sidebarTitle: "text-center text-sm font-semibold text-[#e6edf3]",

  card: "rounded-xl border border-[#30363d] bg-[#1c2128] p-3.5 shadow-sm",

  cardTitle: "mb-3 text-sm font-semibold text-[#e3b341]",

  cardAccent: "mb-3 text-sm font-semibold text-[#e3b341]",

  label: "text-xs text-[#8b949e]",

  labelStrong: "text-xs font-medium text-[#e6edf3]",

  labelMuted: "text-xs text-[#6e7681]",

  body: "text-sm text-[#c9d1d9]",

  hint: "text-xs text-[#8b949e]",

  monoValue: "font-mono text-xs text-[#56cfe8]",

  link: "text-sm text-[#e6edf3] hover:text-[#56cfe8]",

  input:

    "w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-2.5 py-2 text-sm text-[#e6edf3] outline-none placeholder:text-[#6e7681] focus:border-[#35a9b8] focus:ring-1 focus:ring-[#35a9b8]/30",

  select:

    "w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-2.5 py-2 text-sm text-[#e6edf3] outline-none focus:border-[#35a9b8] focus:ring-1 focus:ring-[#35a9b8]/30",

  numberInput:

    "pdf-preview-number-input h-7 w-[2.75rem] min-w-[2.75rem] shrink-0 rounded border border-[#30363d] bg-[#0d1117] px-1 text-center font-mono text-xs text-[#e6edf3] disabled:cursor-not-allowed disabled:opacity-50",

  toggleOff: "bg-[#30363d]",

  toggleOn: "bg-[var(--accent)]",

  segActive: "border border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm",

  segInactive:

    "border border-[#30363d] bg-[#21262d] text-[#8b949e] hover:border-[#484f58] hover:bg-[#30363d] hover:text-[#e6edf3]",

  divider: "border-t border-dotted border-[#484f58]",

  edgeToggle:

    "border border-[#30363d] bg-[#21262d] text-[#8b949e] shadow-lg hover:bg-[#30363d] hover:text-[#e6edf3]",

  thumbPanel: "border-r border-[#30363d] bg-[#161b22] shadow-inner",

  thumbTitle: "text-xs font-semibold text-[#c9d1d9]",

  bottomBar: "bg-[#161b22]",

  bottomBarBorder: "border-t border-[#30363d]",

  bottomBarBtn:

    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#21262d] text-[#c9d1d9] shadow-sm transition hover:bg-[#30363d] hover:text-white disabled:cursor-not-allowed disabled:opacity-30",

  bottomBarText: "text-xs font-medium text-[#8b949e]",

  bottomBarSelect:

    "h-8 shrink-0 rounded-lg border border-[#30363d] bg-[#21262d] pl-3 pr-7 text-xs text-[#e6edf3] transition hover:bg-[#30363d] [&>option]:bg-[#161b22]",

  bottomBarPrimary:

    "shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50",

  bottomBarCancel:

    "shrink-0 rounded-lg border border-rose-600 bg-rose-600/20 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-600/40",

  questionGrid: "rounded-lg border border-[#30363d] bg-[#1c2128]",

  questionGridHeader: "flex h-8 items-center justify-center rounded-t-lg text-xs font-semibold text-white",

  questionBoxDefault:

    "border-[#484f58] bg-[#21262d] text-[#c9d1d9] hover:border-[#6e7681] hover:bg-[#30363d]",

  questionBoxSelected: "border-[#35a9b8] bg-[#35a9b8] text-[#0d1117]",

  valueBadge:
    "pdf-preview-value-badge rounded-md border border-[#56cfe8]/55 bg-[#1a2332] px-2 py-0.5 font-mono text-xs font-semibold text-[#7ee7f0] shadow-[inset_0_0_0_1px_rgba(86,207,232,0.12)]",

  nestedCard: "rounded-lg border border-[#30363d] bg-[#21262d]",

  nestedBorder: "border-[#30363d]",

  collapseBtn: "text-[#8b949e] transition hover:bg-[#21262d] hover:text-[#e6edf3]",

  chipActive: "bg-[var(--accent)] text-white ring-2 ring-[var(--accent-soft)]",

  chipInactive:

    "border border-[#30363d] bg-[#1c2128] text-[#8b949e] hover:border-[#484f58] hover:bg-[#21262d]",

  microLabel: "text-xs text-[#8b949e]",

  smallBtn:

    "rounded border border-[#30363d] bg-[#21262d] px-2 py-1 text-xs font-medium text-[#c9d1d9] transition hover:bg-[#30363d]",

  sectionSubtitle: "text-xs font-medium text-[#8b949e]",

  previewCanvasWrap:

    "rounded-sm bg-[var(--panel-bg)] shadow-[var(--shadow-page)] ring-1 ring-[var(--border-page)]",

  previewPageFrame:

    "rounded-sm bg-[var(--panel-bg)] shadow-[var(--shadow-page)] border border-[var(--border-page)]",

  sectionCard: "rounded-xl border border-[#30363d] bg-[#1c2128] shadow-sm",

  accentBlueTitle: "text-sm font-semibold text-[#56cfe8]",

  canvasArea: "bg-[#b8c5d3]",

};



export const pdfPreviewUiThemes: Record<PdfPreviewUiMode, PdfPreviewUiTokens> = {

  light,

  dark,

};



export const PDF_PREVIEW_UI_STORAGE_KEY = "edutest-pdf-preview-ui-mode";



export function loadPdfPreviewUiMode(): PdfPreviewUiMode {

  try {

    const v = localStorage.getItem(PDF_PREVIEW_UI_STORAGE_KEY);

    if (v === "light" || v === "dark") return v;

  } catch {

    /* ignore */

  }

  return "light";

}

