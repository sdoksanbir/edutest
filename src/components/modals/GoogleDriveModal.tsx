import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { addLocalPdfs } from "../../store/cropLocalStore";
import { loadPdfFromBytes } from "../../utils/pdfClient";
import { openGoogleDriveFlow } from "../../utils/openGoogleDriveFlow";
import { useEditorStore } from "../../store/editorStore";
import ModalShell from "./ModalShell";

type DrivePdf = {
  id: string;
  name: string;
  modifiedTime?: string;
  size?: string;
};

function formatDriveDate(value?: string) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatDriveSize(value?: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function GoogleDriveModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const setOpenModal = useEditorStore((s) => s.setOpenModal);
  const [configured, setConfigured] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<DrivePdf[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = useCallback(async (search?: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.drive.listPdfs(search);
      setFiles(res.items);
      setSelectedId((prev) =>
        prev && res.items.some((f) => f.id === prev) ? prev : (res.items[0]?.id ?? null)
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Drive dosyaları yüklenemedi");
      setFiles([]);
      setSelectedId(null);
    } finally {
      setBusy(false);
    }
  }, []);

  const connectAndLoad = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await api.drive.signIn();
      const next = await api.drive.status();
      setConfigured(next.configured);
      setSignedIn(next.signedIn);
      if (next.signedIn) {
        await loadFiles();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google oturumu açılamadı");
    } finally {
      setBusy(false);
    }
  }, [loadFiles]);

  const pickCredentials = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.drive.importCredentials();
      if (result.canceled) {
        setError("Kimlik dosyası seçilmedi.");
        return;
      }
      setConfigured(result.configured);
      if (result.configured) {
        await connectAndLoad();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kimlik dosyası yüklenemedi");
    } finally {
      setBusy(false);
    }
  }, [connectAndLoad]);

  useEffect(() => {
    void (async () => {
      try {
        const status = await api.drive.status();
        setConfigured(status.configured);
        setSignedIn(status.signedIn);
        if (status.signedIn) {
          await loadFiles();
        } else if (status.configured) {
          setError("Google oturumu açılamadı. Tekrar deneyin.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Drive açılamadı");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadFiles]);

  const selectedFile = useMemo(
    () => files.find((f) => f.id === selectedId) ?? null,
    [files, selectedId]
  );

  const importToCropTool = async () => {
    if (!selectedFile) {
      setError("Bir PDF seçin.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const downloaded = await api.drive.downloadPdf(selectedFile.id);
      const bytes = Uint8Array.from(atob(downloaded.data), (c) => c.charCodeAt(0));
      const loaded = await loadPdfFromBytes(bytes.buffer);
      const localId = `drive-${selectedFile.id}`;
      addLocalPdfs([
        {
          id: localId,
          doc: loaded.doc,
          pageCount: loaded.pageCount,
          filename: downloaded.name || selectedFile.name,
        },
      ]);
      onClose();
      navigate("/crop-tool", { state: { localPdfId: localId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF aktarılamadı");
    } finally {
      setBusy(false);
    }
  };

  const importToBank = async () => {
    if (!selectedFile) {
      setError("Bir PDF seçin.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const downloaded = await api.drive.downloadPdf(selectedFile.id);
      const bytes = Uint8Array.from(atob(downloaded.data), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const file = new File([blob], downloaded.name || selectedFile.name, {
        type: "application/pdf",
      });
      await api.pdfs.upload([file]);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Soru bankasına eklenemedi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title="Google Drive'dan Yükle" onClose={onClose} wide>
      {error && (
        <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      {loading || (busy && !signedIn && configured) ? (
        <p className="text-sm text-slate-500">Google hesap penceresi açılıyor…</p>
      ) : !configured ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Google Drive kullanmak için Google Cloud OAuth kimlik dosyanızı seçin. Test Studio
            kullanıyorsanız aynı JSON dosyasını seçebilirsiniz.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void pickCredentials()}
            className="rounded-lg bg-[#1a73e8] px-4 py-2 text-sm font-medium text-white hover:bg-[#1765cc] disabled:opacity-50"
          >
            Kimlik dosyası seç
          </button>
        </div>
      ) : !signedIn ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Google oturumu açılamadı.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void connectAndLoad()}
              className="rounded-lg bg-[#1a73e8] px-4 py-2 text-sm font-medium text-white hover:bg-[#1765cc] disabled:opacity-50"
            >
              Tekrar dene
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void pickCredentials()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Kimlik dosyasını değiştir
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="PDF ara…"
              className="min-w-[12rem] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void loadFiles(query)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Ara
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                await api.drive.signOut();
                setSignedIn(false);
                setFiles([]);
                void openGoogleDriveFlow(setOpenModal);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Hesap değiştir
            </button>
          </div>

          {busy && files.length === 0 ? (
            <p className="text-sm text-slate-500">Drive dosyaları yükleniyor…</p>
          ) : files.length === 0 ? (
            <p className="text-sm text-slate-500">Drive&apos;da PDF bulunamadı.</p>
          ) : (
            <ul className="max-h-[min(22rem,50vh)] space-y-2 overflow-y-auto">
              {files.map((file) => {
                const active = file.id === selectedId;
                return (
                  <li key={file.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(file.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                        active
                          ? "border-sky-400 bg-sky-50"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span className="min-w-0 truncate font-medium text-slate-800">{file.name}</span>
                      <span className="shrink-0 text-xs text-slate-500">
                        {[formatDriveSize(file.size), formatDriveDate(file.modifiedTime)]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              disabled={busy || !selectedFile}
              onClick={() => void importToBank()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Soru Bankasına Ekle
            </button>
            <button
              type="button"
              disabled={busy || !selectedFile}
              onClick={() => void importToCropTool()}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              Kırpma Aracına Aktar
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}
