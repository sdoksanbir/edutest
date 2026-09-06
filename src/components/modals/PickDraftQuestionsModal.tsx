import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import type { DraftInfo, QuestionItem } from "../../types";
import { useEditorStore } from "../../store/editorStore";
import type { DraftFilePayload } from "../../store/editorStore";
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
  const [drafts, setDrafts] = useState<DraftInfo[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDraftName, setActiveDraftName] = useState<string | null>(null);
  const [draftQuestions, setDraftQuestions] = useState<QuestionItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const workingCount = useEditorStore((s) => s.questions.length);
  const addQuestionsToWorkingDraft = useEditorStore((s) => s.addQuestionsToWorkingDraft);

  useEffect(() => {
    void api.drafts
      .list()
      .then((res) => setDrafts(res.items))
      .catch((e) => setError(e instanceof Error ? e.message : "Taslaklar yüklenemedi"))
      .finally(() => setLoadingDrafts(false));
  }, []);

  const openDraft = async (name: string) => {
    setError(null);
    setLoadingQuestions(true);
    try {
      const draft = (await api.drafts.load(name)) as DraftFilePayload;
      const questions = [...(draft.questions ?? [])].sort(
        (a, b) => a.order_index - b.order_index
      );
      setActiveDraftName(name);
      setDraftQuestions(questions);
      setSelectedIds(new Set(questions.map((q) => q.id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Taslak açılamadı");
    } finally {
      setLoadingQuestions(false);
    }
  };

  const backToList = () => {
    setActiveDraftName(null);
    setDraftQuestions([]);
    setSelectedIds(new Set());
    setError(null);
  };

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

      {!activeDraftName ? (
        <>
          <p className="mb-3 text-sm text-slate-500">
            Bir taslak seçin; ardından ana editöre eklemek istediğiniz soruları işaretleyin.
          </p>
          {loadingDrafts ? (
            <p className="text-sm text-slate-500">Taslaklar yükleniyor…</p>
          ) : drafts.length === 0 ? (
            <p className="text-sm text-slate-500">Kayıtlı taslak bulunamadı.</p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {drafts.map((item) => (
                <li key={item.name}>
                  <button
                    type="button"
                    disabled={loadingQuestions}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
                    onClick={() => void openDraft(item.name)}
                  >
                    <span className="font-medium text-slate-800">{item.name}</span>
                    <span className="text-slate-400">{item.question_count} soru</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className="rounded border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
              onClick={backToList}
            >
              ← Taslak listesi
            </button>
            <span className="text-sm font-medium text-slate-700">{activeDraftName}</span>
            <button
              type="button"
              className="rounded border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
              onClick={toggleAll}
            >
              {allSelected ? "Seçimi kaldır" : "Tümünü seç"}
            </button>
          </div>

          {loadingQuestions ? (
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
              disabled={selectedCount === 0 || loadingQuestions}
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
