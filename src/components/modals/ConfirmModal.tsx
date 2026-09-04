type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** alert: yalnızca onay butonu (bilgi / hata popup) */
  mode?: "confirm" | "alert";
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Evet",
  cancelLabel = "Vazgeç",
  mode = "confirm",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  const isDanger = variant === "danger";
  const isAlert = mode === "alert";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-600/80 bg-slate-800 shadow-xl shadow-black/30 p-6"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
      >
        <div className="mb-4 flex items-start gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
              isDanger ? "bg-rose-500/20" : "bg-amber-500/20"
            }`}
          >
            <svg
              className={`h-6 w-6 ${isDanger ? "text-rose-400" : "text-amber-400"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 id="confirm-title" className="text-lg font-semibold text-white">
              {title}
            </h3>
            <p id="confirm-desc" className="mt-1.5 text-sm leading-relaxed text-slate-300">
              {message}
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          {!isAlert && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-500 bg-slate-700/80 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-600 hover:text-white"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-5 py-2.5 text-sm font-medium text-white transition ${
              isDanger
                ? "bg-rose-600 hover:bg-rose-500"
                : "bg-amber-600 hover:bg-amber-500"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
