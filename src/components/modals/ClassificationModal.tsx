import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { useEditorStore } from "../../store/editorStore";
import type { BankSettings, PdfFolder } from "../../types";
import {
  BANK_NO_TOPIC_LABEL,
  ensureBankFolderPath,
  ensureKonuAndFolder,
  mergeKonuOptions,
} from "../../utils/bankQuestionUtils";
import {
  QUESTION_DIFFICULTIES,
  QUESTION_DIFFICULTY_LABEL,
  type QuestionDifficulty,
} from "../../utils/questionDifficulty";

type ClassificationModalProps = {
  open: boolean;
  questionIds: string[];
  onClose: () => void;
};

/**
 * Ders / Konu (soru bankası listelerinden) + zorluk.
 */
export default function ClassificationModal({
  open,
  questionIds,
  onClose,
}: ClassificationModalProps) {
  const questions = useEditorStore((s) => s.questions);
  const setQuestionsDifficulty = useEditorStore((s) => s.setQuestionsDifficulty);
  const setQuestionsDersKonu = useEditorStore((s) => s.setQuestionsDersKonu);

  const targets = useMemo(
    () => questions.filter((q) => questionIds.includes(q.id)),
    [questions, questionIds],
  );

  const [settings, setSettings] = useState<BankSettings | null>(null);
  const [folders, setFolders] = useState<PdfFolder[]>([]);
  const [ders, setDers] = useState("");
  const [konu, setKonu] = useState<string | null>(null);
  const [newDersOpen, setNewDersOpen] = useState(false);
  const [newDersName, setNewDersName] = useState("");
  const [newKonuOpen, setNewKonuOpen] = useState(false);
  const [newKonuName, setNewKonuName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sharedDifficulty = useMemo((): QuestionDifficulty | null | "mixed" => {
    if (targets.length === 0) return null;
    const first = targets[0]?.difficulty ?? null;
    return targets.every((q) => (q.difficulty ?? null) === first) ? first : "mixed";
  }, [targets]);

  useEffect(() => {
    if (!open) {
      setNewDersOpen(false);
      setNewDersName("");
      setNewKonuOpen(false);
      setNewKonuName("");
      setError(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [{ settings: s }, { folders: f }] = await Promise.all([
          api.bankQuestions.getSettings(),
          api.pdfs.folders.list(),
        ]);
        if (cancelled) return;
        setSettings(s);
        setFolders(f);
        const first = targets[0];
        const rootDers = f
          .filter((x) => (x.parent_id ?? null) === null)
          .map((x) => x.name.trim())
          .filter(Boolean);
        const dersMerged = [...new Set([...(s.dersList ?? []), ...rootDers])];
        const initialDers =
          first?.ders?.trim() ||
          (dersMerged.includes(s.defaultDers) ? s.defaultDers : dersMerged[0] || s.defaultDers);
        setDers(initialDers);
        setKonu(first?.konu ?? first?.category ?? null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Listeler yüklenemedi");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, targets]);

  const dersOptions = useMemo(() => {
    const root = folders
      .filter((f) => (f.parent_id ?? null) === null)
      .map((f) => f.name.trim())
      .filter(Boolean);
    const list = [...new Set([...(settings?.dersList ?? []), ...root, ...(ders ? [ders] : [])])];
    return list.sort((a, b) => a.localeCompare(b, "tr"));
  }, [folders, settings, ders]);

  const konuOptions = useMemo(
    () => mergeKonuOptions(ders, folders, settings?.konuByDers),
    [ders, folders, settings],
  );

  if (!open || questionIds.length === 0) return null;

  const countLabel =
    targets.length === 1
      ? "1 soru düzenlenecek"
      : `${targets.length} soru düzenlenecek`;

  const applyDifficulty = (d: QuestionDifficulty | null) => {
    setQuestionsDifficulty(questionIds, d);
  };

  const applyDersKonu = (nextDers: string, nextKonu: string | null) => {
    setQuestionsDersKonu(questionIds, nextDers.trim() || null, nextKonu);
  };

  const submitNewDers = async () => {
    const name = newDersName.trim();
    if (!name) return;
    try {
      const { settings: s } = await api.bankQuestions.addDers(name);
      await ensureBankFolderPath(name, null);
      const { folders: f } = await api.pdfs.folders.list();
      setSettings(s);
      setFolders(f);
      setDers(name);
      setKonu(null);
      applyDersKonu(name, null);
      await api.bankQuestions.updateSettings({ defaultDers: name });
      setNewDersName("");
      setNewDersOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ders eklenemedi");
    }
  };

  const submitNewKonu = async () => {
    const name = newKonuName.trim();
    if (!name || !ders.trim()) return;
    try {
      await ensureKonuAndFolder(ders, name);
      const [{ settings: s }, { folders: f }] = await Promise.all([
        api.bankQuestions.getSettings(),
        api.pdfs.folders.list(),
      ]);
      setSettings(s);
      setFolders(f);
      setKonu(name);
      applyDersKonu(ders, name);
      setNewKonuName("");
      setNewKonuOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Konu eklenemedi");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="classification-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="classification-title" className="text-lg font-semibold text-slate-900">
              Sınıflandırma
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">{countLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Kapat"
          >
            ×
          </button>
        </div>

        {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
        {loading ? (
          <p className="mb-4 text-sm text-slate-500">Yükleniyor…</p>
        ) : (
          <>
            <section className="mb-4">
              <label className="mb-1.5 block text-sm font-semibold text-slate-800">Ders adı</label>
              <select
                value={ders}
                onChange={(e) => {
                  const next = e.target.value;
                  setDers(next);
                  setKonu(null);
                  applyDersKonu(next, null);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {dersOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {newDersOpen ? (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={newDersName}
                    onChange={(e) => setNewDersName(e.target.value)}
                    placeholder="Yeni ders adı"
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-white"
                    onClick={() => void submitNewDers()}
                  >
                    Ekle
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="mt-2 text-xs text-blue-600 hover:underline"
                  onClick={() => setNewDersOpen(true)}
                >
                  + Yeni ders ekle
                </button>
              )}
            </section>

            <section className="mb-5">
              <label className="mb-1.5 block text-sm font-semibold text-slate-800">Konu adı</label>
              <select
                value={konu ?? ""}
                onChange={(e) => {
                  const next = e.target.value.trim() ? e.target.value : null;
                  setKonu(next);
                  applyDersKonu(ders, next);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">{BANK_NO_TOPIC_LABEL}</option>
                {konuOptions.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              {newKonuOpen ? (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={newKonuName}
                    onChange={(e) => setNewKonuName(e.target.value)}
                    placeholder="Yeni konu adı"
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-white"
                    onClick={() => void submitNewKonu()}
                  >
                    Ekle
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="mt-2 text-xs text-blue-600 hover:underline"
                  onClick={() => setNewKonuOpen(true)}
                >
                  + Yeni konu ekle
                </button>
              )}
            </section>
          </>
        )}

        <section className="mb-2">
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Zorluk</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyDifficulty(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                sharedDifficulty === null
                  ? "bg-slate-800 text-white"
                  : "border border-slate-300 text-slate-600"
              }`}
            >
              Seçilmedi
            </button>
            {QUESTION_DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => applyDifficulty(d)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  sharedDifficulty === d
                    ? "bg-blue-600 text-white"
                    : "border border-slate-300 text-slate-600"
                }`}
              >
                {QUESTION_DIFFICULTY_LABEL[d]}
              </button>
            ))}
          </div>
          {sharedDifficulty === "mixed" ? (
            <p className="mt-2 text-xs text-amber-700">Seçili sorularda farklı zorluklar var.</p>
          ) : null}
        </section>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
}
