import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { QuestionItem } from "../../types";
import { useEditorStore } from "../../store/editorStore";
import { pickEtDraftFileFromComputer } from "../../utils/etDraftFileFlow";
import ModalShell from "./ModalShell";

function cloneSelectedQuestions(
  source: QuestionItem[],
  selectedIds: Set<string>,
  startOrderIndex: number
): QuestionItem[] {
  const picked = source
    .filter((q) => selectedIds.has(q.id))
    .sort((a, b) => a.order_index - b.order_index);

  return picked.map((q, i) => ({
    ...q,
    id: crypto.randomUUID(),
    order_index: startOrderIndex + i,
  }));
}

function questionThumbSrc(q: QuestionItem): string | null {
  const b64 = q.image_base64?.trim();
  if (!b64) return null;
  return b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`;
}

export default function PickDraftQuestionsModal({ onClose }: { onClose: () => void }) {
  const [loadingFile, setLoadingFile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [draftQuestions, setDraftQuestions] = useState<QuestionItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const openedOnceRef = useRef(false);

  const workingCount = useEditorStore((s) => s.questions.length);
  const addQuestionsToWorkingDraft = useEditorStore((s) => s.addQuestionsToWorkingDraft);

  const applyPickedFile = useCallback(async () => {
    setError(null);
    setLoadingFile(true);
    try {
      const picked = await pickEtDraftFileFromComputer();
      if (picked.canceled) {
        if (!fileLabel) onClose();
        return;
      }
      if (!picked.ok || !picked.draft) {
        setError("Taslak dosyası açılamadı veya geçersiz.");
        return;
      }
      const questions = [...(picked.draft.questions ?? [])].sort(
        (a, b) => a.order_index - b.order_index
      );
      const label = picked.fileName || picked.draft.name || "taslak";
      setFileLabel(label);
      setDraftQuestions(questions);
      setSelectedIds(new Set(questions.map((q) => q.id)));
      if (questions.length === 0) {
        setError("Bu taslakta soru yok.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dosya açılamadı");
    } finally {
      setLoadingFile(false);
    }
  }, [fileLabel, onClose]);

  useEffect(() => {
    if (openedOnceRef.current) return;
    openedOnceRef.current = true;
    void applyPickedFile();
  }, [applyPickedFile]);

  const allSelected = draftQuestions.length > 0 && selectedIds.size === draftQuestions.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(draftQuestions.map((q) => q.id)));
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedCount = selectedIds.size;

  const sortedDraftQuestions = useMemo(
    () => [...draftQuestions].sort((a, b) => a.order_index - b.order_index),
    [draftQuestions]
  );

  const handleAdd = useCallback(() => {
    if (selectedCount === 0) {
      setError("En az bir soru seçin.");
      return;
    }
    const cloned = cloneSelectedQuestions(draftQuestions, selectedIds, workingCount);
    addQuestionsToWorkingDraft(cloned);
    onClose();
  }, [
    addQuestionsToWorkingDraft,
    draftQuestions,
    onClose,
    selectedCount,
    selectedIds,
    workingCount,
  ]);

  return (
    <ModalShell title="Taslaktan Soru Seç" onClose={onClose} wide>
      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

      {loadingFile && !fileLabel ? (
        <p className="text-sm text-slate-500">Dosya seçici açılıyor…</p>
      ) : !fileLabel ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Bilgisayarınızdan bir <span className="font-medium">.et</span> taslak dosyası seçin.
          </p>
          <button
            type="button"
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
            onClick={() => void applyPickedFile()}
          >
            Dosya seç
          </button>
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              disabled={loadingFile}
              className="rounded border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              onClick={() => void applyPickedFile()}
            >
              Başka dosya seç
            </button>
            <span className="text-sm font-medium text-slate-700">{fileLabel}.et</span>
            <button
              type="button"
              className="rounded border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
              onClick={toggleAll}
            >
              {allSelected ? "Seçimi kaldır" : "Tümünü seç"}
            </button>
          </div>

          {loadingFile ? (
            <p className="text-sm text-slate-500">Sorular yükleniyor…</p>
          ) : sortedDraftQuestions.length === 0 ? (
            <p className="text-sm text-slate-500">Bu taslakta soru yok.</p>
          ) : (
            <ul className="max-h-[min(24rem,50vh)] space-y-2 overflow-y-auto">
              {sortedDraftQuestions.map((q, idx) => {
                const thumb = questionThumbSrc(q);
                const checked = selectedIds.has(q.id);
                return (
                  <li key={q.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 ${
                        checked
                          ? "border-violet-400 bg-violet-50/80"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(q.id)}
                        className="h-4 w-4 shrink-0 accent-violet-600"
                      />
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded border border-slate-200 object-contain bg-white"
                        />
                      ) : (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-[0.625rem] text-slate-400">
                          Soru
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-800">
                          Soru {idx + 1}
                        </span>
                        <span className="block text-xs text-slate-500">
                          Cevap: {q.answer_key?.trim() || "—"}
                          {q.content_type === "explanation" ? " · Açıklama" : ""}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <span className="mr-auto text-xs text-slate-500">{selectedCount} soru seçili</span>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={onClose}
            >
              İptal
            </button>
            <button
              type="button"
              disabled={selectedCount === 0 || loadingFile}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleAdd}
            >
              Seçilenleri ekle ({selectedCount})
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}
