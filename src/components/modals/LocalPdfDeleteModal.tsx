import { useEffect, useState } from "react";
import {
  listLocalPdfs,
  listLocalImages,
  removeLocalPdf,
  removeLocalImage,
} from "../../store/cropLocalStore";
import ConfirmModal from "./ConfirmModal";

type LocalSourceItem = { id: string; filename: string; type: "pdf" | "image" };

type LocalPdfDeleteModalProps = {
  open: boolean;
  onClose: () => void;
  onPdfRemoved?: (removedId: string) => void;
  /** Bu local kaynaklarda seçili soru var, kaldırılamaz (PDF + resim id'leri) */
  localPdfIdsWithQuestions?: string[];
};

export default function LocalPdfDeleteModal({
  open,
  onClose,
  onPdfRemoved,
  localPdfIdsWithQuestions = [],
}: LocalPdfDeleteModalProps) {
  const [sources, setSources] = useState<LocalSourceItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmItem, setConfirmItem] = useState<LocalSourceItem | null>(null);

  const refreshList = () => {
    const pdfItems: LocalSourceItem[] = listLocalPdfs().map((p) => ({
      id: p.id,
      filename: p.filename,
      type: "pdf" as const,
    }));
    const imgItems: LocalSourceItem[] = listLocalImages().map((i) => ({
      id: i.id,
      filename: i.filename,
      type: "image" as const,
    }));
    setSources([...pdfItems, ...imgItems]);
  };

  useEffect(() => {
    if (open) {
      setError(null);
      refreshList();
    }
  }, [open]);

  const doRemove = (item: LocalSourceItem) => {
    setConfirmItem(null);
    setRemovingId(item.id);
    setError(null);
    try {
      if (item.type === "pdf") {
        removeLocalPdf(item.id);
      } else {
        removeLocalImage(item.id);
      }
      onPdfRemoved?.(item.id);
      refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaynak kaldırılamadı");
    } finally {
      setRemovingId(null);
    }
  };

  const handleRemoveClick = (item: LocalSourceItem) => {
    if (localPdfIdsWithQuestions.includes(item.id)) {
      setError("Bu kaynakta seçili sorular var, o yüzden kaldırılamaz. Önce soruları kaldırın.");
      return;
    }
    setError(null);
    setConfirmItem(item);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-600 bg-slate-800 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="local-pdf-delete-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 id="local-pdf-delete-title" className="text-base font-semibold text-white">
            Local PDF / Resim Kaldır
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-500 bg-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-600"
          >
            Kapat
          </button>
        </div>

        {error && (
          <p className="mb-3 text-sm text-rose-400">{error}</p>
        )}

        <div className="max-h-72 overflow-auto rounded-lg border border-slate-600">
          {sources.length === 0 ? (
            <p className="p-4 text-center text-sm text-slate-400">
              Henüz local PDF veya resim yok.
            </p>
          ) : (
            <ul className="divide-y divide-slate-600">
              {sources.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <span className="truncate text-sm text-slate-300" title={item.filename}>
                    {item.type === "pdf" ? "📁 " : "🖼 "}
                    {item.filename}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveClick(item)}
                    disabled={removingId === item.id}
                    className="shrink-0 rounded border border-amber-600 bg-amber-600/20 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-600/40 disabled:opacity-50"
                  >
                    {removingId === item.id ? "Kaldırılıyor…" : "Kaldır"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <ConfirmModal
          open={!!confirmItem}
          title="Local kaynak kaldırılsın mı?"
          message={confirmItem ? `"${confirmItem.filename}" listeden çıkarılacak.` : ""}
          confirmLabel="Kaldır"
          cancelLabel="Vazgeç"
          variant="danger"
          onConfirm={() => confirmItem && doRemove(confirmItem)}
          onCancel={() => setConfirmItem(null)}
        />
      </div>
    </div>
  );
}
