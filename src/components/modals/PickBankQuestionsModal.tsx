import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useEditorStore } from "../../store/editorStore";
import type { BankQuestionItem, PdfFolder, QuestionDifficulty } from "../../types";
import {
  bankQuestionToQuestionItem,
  BANK_NO_TOPIC_LABEL,
  mergeKonuOptions,
} from "../../utils/bankQuestionUtils";
import {
  QUESTION_DIFFICULTIES,
  QUESTION_DIFFICULTY_LABEL,
} from "../../utils/questionDifficulty";
import ModalShell from "./ModalShell";

export default function PickBankQuestionsModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const workingCount = useEditorStore((s) => s.questions.length);
  const addQuestionsToWorkingDraft = useEditorStore((s) => s.addQuestionsToWorkingDraft);

  const [items, setItems] = useState<BankQuestionItem[]>([]);
  const [thumbById, setThumbById] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dersFilter, setDersFilter] = useState<string>("");
  const [konuFilter, setKonuFilter] = useState<string>("");
  const [difficultyFilter, setDifficultyFilter] = useState<QuestionDifficulty | "">("");
  const [search, setSearch] = useState("");
  const [settings, setSettings] = useState<{ dersList: string[]; konuByDers: Record<string, string[]> } | null>(
    null,
  );
  const [folders, setFolders] = useState<PdfFolder[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ settings: s }, { items: list }, { folders: f }] = await Promise.all([
        api.bankQuestions.getSettings(),
        api.bankQuestions.list({
          ders: dersFilter || undefined,
          konu: konuFilter === BANK_NO_TOPIC_LABEL ? null : konuFilter || undefined,
          difficulty: difficultyFilter || undefined,
          search: search.trim() || undefined,
        }),
        api.pdfs.folders.list(),
      ]);
      setSettings(s);
      setFolders(f);
      setItems(list);
      const thumbs: Record<string, string> = {};
      await Promise.all(
        list.slice(0, 80).map(async (q) => {
          try {
            thumbs[q.id] = await api.bankQuestions.getImageDataUrl(q.id);
          } catch {
            /* ignore */
          }
        }),
      );
      setThumbById(thumbs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Soru bankası yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [dersFilter, konuFilter, difficultyFilter, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const dersOptions = useMemo(() => {
    const root = folders
      .filter((f) => (f.parent_id ?? null) === null)
      .map((f) => f.name.trim())
      .filter(Boolean);
    return [...new Set([...(settings?.dersList ?? []), ...root])].sort((a, b) =>
      a.localeCompare(b, "tr"),
    );
  }, [folders, settings]);

  const konuOptions = useMemo(() => {
    if (!dersFilter) return [];
    return mergeKonuOptions(dersFilter, folders, settings?.konuByDers);
  }, [settings, dersFilter, folders]);

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const selectedCount = selectedIds.size;

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map((q) => q.id)));
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selectedCount === 0) {
      setError("En az bir soru seçin.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const picked = items.filter((q) => selectedIds.has(q.id));
      const cloned = await Promise.all(
        picked.map(async (q, i) => {
          const dataUrl = thumbById[q.id] ?? (await api.bankQuestions.getImageDataUrl(q.id));
          const raw = dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl;
          return bankQuestionToQuestionItem({ ...q, image_path: q.image_path }, raw, workingCount + i);
        }),
      );
      addQuestionsToWorkingDraft(cloned);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sorular eklenemedi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Soru Bankasından Seç" onClose={onClose} wide>
      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <select
          value={dersFilter}
          onChange={(e) => {
            setDersFilter(e.target.value);
            setKonuFilter("");
          }}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">Tüm dersler</option>
          {dersOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={konuFilter}
          onChange={(e) => setKonuFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          disabled={!dersFilter}
        >
          <option value="">Tüm konular</option>
          <option value={BANK_NO_TOPIC_LABEL}>{BANK_NO_TOPIC_LABEL}</option>
          {konuOptions.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value as QuestionDifficulty | "")}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">Tüm zorluklar</option>
          {QUESTION_DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {QUESTION_DIFFICULTY_LABEL[d]}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ara…"
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>

      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm text-slate-600">{items.length} soru</span>
        <button
          type="button"
          className="rounded border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
          onClick={toggleAll}
          disabled={items.length === 0}
        >
          {allSelected ? "Seçimi kaldır" : "Tümünü seç"}
        </button>
      </div>

      {loading && items.length === 0 ? (
        <p className="text-sm text-slate-500">Sorular yükleniyor…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">
          Bu filtrede soru yok. Kırpma aracından soru ekleyip &quot;Soru Bankasına Kaydet&quot; kullanın.
        </p>
      ) : (
        <ul className="max-h-[min(24rem,50vh)] space-y-2 overflow-y-auto">
          {items.map((q, idx) => {
            const thumb = thumbById[q.id];
            const checked = selectedIds.has(q.id);
            return (
              <li key={q.id}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 ${
                    checked ? "border-blue-400 bg-blue-50/80" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOne(q.id)}
                    className="h-4 w-4 shrink-0 accent-blue-600"
                  />
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded border border-slate-200 bg-white object-contain"
                    />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-[0.625rem] text-slate-400">
                      Soru
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-800">
                      {q.ders}
                      {q.konu ? ` · ${q.konu}` : ` · ${BANK_NO_TOPIC_LABEL}`}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {q.source_pdf_filename} · s.{q.page_number}
                      {q.difficulty ? ` · ${QUESTION_DIFFICULTY_LABEL[q.difficulty]}` : ""}
                      {q.answer_key?.trim() ? ` · Cevap: ${q.answer_key}` : ""}
                    </span>
                  </span>
                  <span className="text-xs text-slate-400">#{idx + 1}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          className="mr-auto text-xs text-blue-600 hover:underline"
          onClick={() => {
            onClose();
            navigate("/soru-bankasi");
          }}
        >
          Soru bankası sayfasını aç
        </button>
        <span className="text-xs text-slate-500">{selectedCount} soru seçili</span>
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          onClick={onClose}
        >
          İptal
        </button>
        <button
          type="button"
          disabled={selectedCount === 0 || loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => void handleAdd()}
        >
          Teste ekle ({selectedCount})
        </button>
      </div>
    </ModalShell>
  );
}
