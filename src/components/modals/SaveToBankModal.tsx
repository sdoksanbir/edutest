import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { useEditorStore } from "../../store/editorStore";
import type { BankSettings, PdfFolder, QuestionDifficulty } from "../../types";
import {
  BANK_NO_TOPIC_LABEL,
  ensureBankFolderPath,
  ensureKonuAndFolder,
  findDuplicateBankQuestion,
  getQuestionImageBase64Raw,
  mergeKonuOptions,
  resolveSourcePdfMeta,
} from "../../utils/bankQuestionUtils";
import {
  QUESTION_DIFFICULTIES,
  QUESTION_DIFFICULTY_LABEL,
} from "../../utils/questionDifficulty";
import ModalShell from "./ModalShell";

export default function SaveToBankModal({ onClose }: { onClose: () => void }) {
  const questionIds = useEditorStore((s) => s.saveToBankQuestionIds);
  const questions = useEditorStore((s) => s.questions);

  const targets = useMemo(
    () =>
      questions.filter(
        (q) => questionIds.includes(q.id) && !q.bankSourceId,
      ),
    [questions, questionIds],
  );

  const bankAlreadyCount = useMemo(
    () =>
      questions.filter(
        (q) => questionIds.includes(q.id) && !!q.bankSourceId,
      ).length,
    [questions, questionIds],
  );

  const [settings, setSettings] = useState<BankSettings | null>(null);
  const [folders, setFolders] = useState<PdfFolder[]>([]);
  const [ders, setDers] = useState("");
  const [konu, setKonu] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | null>(null);
  const [newDersOpen, setNewDersOpen] = useState(false);
  const [newDersName, setNewDersName] = useState("");
  const [newKonuOpen, setNewKonuOpen] = useState(false);
  const [newKonuName, setNewKonuName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [duplicateHint, setDuplicateHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      setDuplicateHint(null);
      try {
        const [{ settings: s }, { folders: f }] = await Promise.all([
          api.bankQuestions.getSettings(),
          api.pdfs.folders.list(),
        ]);
        if (cancelled) return;
        setSettings(s);
        setFolders(f);
        const rootDers = f
          .filter((x) => (x.parent_id ?? null) === null)
          .map((x) => x.name.trim())
          .filter(Boolean);
        const dersMerged = [...new Set([...(s.dersList ?? []), ...rootDers])];
        const first = targets[0];
        const fromQuestion = first?.ders?.trim() || "";
        if (fromQuestion && (dersMerged.includes(fromQuestion) || dersMerged.length === 0)) {
          setDers(fromQuestion);
        } else if (dersMerged.length > 0 && !dersMerged.includes(s.defaultDers)) {
          setDers(dersMerged[0]!);
        } else {
          setDers(fromQuestion || s.defaultDers);
        }
        setKonu(first?.konu ?? first?.category ?? null);
        setDifficulty(first?.difficulty ?? null);

        // Aynı kırpım bankada mı? Ön uyarı
        const dups: string[] = [];
        for (const q of targets) {
          const dup = await findDuplicateBankQuestion(q);
          if (dup) {
            dups.push(
              `s.${q.page_number} · ${dup.ders}${dup.konu ? ` / ${dup.konu}` : ""}`,
            );
          }
        }
        if (!cancelled && dups.length > 0) {
          setDuplicateHint(
            dups.length === 1
              ? `Bu soru zaten soru bankasında var (${dups[0]}).`
              : `Seçili sorulardan ${dups.length} tanesi zaten soru bankasında var.`,
          );
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Ayarlar yüklenemedi");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targets]);

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

  if (questionIds.length === 0) return null;

  if (targets.length === 0) {
    return (
      <ModalShell title="Soru Bankasına Kaydet" onClose={onClose}>
        <p className="text-sm text-amber-800">
          {bankAlreadyCount > 0
            ? "Seçili sorular zaten soru bankasından geldi; tekrar kaydedilemez."
            : "Kaydedilecek soru bulunamadı."}
        </p>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white"
            onClick={onClose}
          >
            Tamam
          </button>
        </div>
      </ModalShell>
    );
  }

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
      await api.bankQuestions.updateSettings({ defaultDers: name });
      setNewDersName("");
      setNewDersOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ders eklenemedi");
    }
  };

  const submitNewKonu = async () => {
    const name = newKonuName.trim();
    if (!name || !ders) return;
    try {
      await ensureKonuAndFolder(ders, name);
      const [{ settings: s }, { folders: f }] = await Promise.all([
        api.bankQuestions.getSettings(),
        api.pdfs.folders.list(),
      ]);
      setSettings(s);
      setFolders(f);
      setKonu(name);
      setNewKonuName("");
      setNewKonuOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Konu eklenemedi");
    }
  };

  const handleSave = async () => {
    if (!ders.trim()) {
      setError("Ders seçimi zorunludur.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const duplicateIds: string[] = [];
      for (const q of targets) {
        const dup = await findDuplicateBankQuestion(q);
        if (dup) duplicateIds.push(q.id);
      }
      if (duplicateIds.length > 0) {
        const msg =
          duplicateIds.length === targets.length
            ? "Bu soru zaten soru bankasında var. Yine de kaydetmek istiyor musunuz?"
            : `Seçili sorulardan ${duplicateIds.length} tanesi zaten soru bankasında var. Yine de kaydetmek istiyor musunuz?`;
        const ok = window.confirm(msg);
        if (!ok) {
          setDuplicateHint(
            duplicateIds.length === 1
              ? "Bu soru zaten soru bankasında var."
              : `${duplicateIds.length} soru zaten soru bankasında var.`,
          );
          setSaving(false);
          return;
        }
      }

      await api.bankQuestions.updateSettings({ defaultDers: ders.trim() });
      const { folderId } = await ensureKonuAndFolder(ders.trim(), konu);
      const savedMap = new Map<string, string>();
      let count = 0;
      for (const q of targets) {
        const imageBase64 = await getQuestionImageBase64Raw(q);
        const { sourcePdfId, sourcePdfFilename } = await resolveSourcePdfMeta(q);
        const created = await api.bankQuestions.create({
          ders: ders.trim(),
          konu,
          difficulty,
          folder_id: folderId,
          source_pdf_id: sourcePdfId,
          source_pdf_filename: sourcePdfFilename,
          page_number: q.page_number,
          crop: q.crop,
          answer_key: q.answer_key,
          content_type: q.content_type,
          remove_background: q.remove_background,
          image_base64: imageBase64,
          layoutMode: q.layoutMode,
          manualScale: q.manualScale,
          normalizationScale: q.normalizationScale,
          capture: q.capture,
          fontReference: q.fontReference,
        });
        savedMap.set(q.id, created.id);
        count += 1;
      }

      const dersVal = ders.trim();
      const konuVal = konu?.trim() || null;
      useEditorStore.setState((s) => ({
        questions: s.questions.map((q) => {
          const bankId = savedMap.get(q.id);
          if (!bankId) return q;
          return {
            ...q,
            bankSourceId: bankId,
            ders: dersVal,
            konu: konuVal,
            category: konuVal,
            difficulty: difficulty ?? q.difficulty ?? null,
          };
        }),
        isDirty: true,
      }));

      setSavedCount(count);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Soru bankasına kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  const countLabel =
    targets.length === 1 ? "1 soru kaydedilecek" : `${targets.length} soru kaydedilecek`;

  if (savedCount > 0) {
    return (
      <ModalShell title="Soru Bankasına Kaydedildi" onClose={onClose}>
        <p className="text-sm text-slate-600">
          {savedCount} soru soru bankasına eklendi. Ders adı: <strong>{ders}</strong>
          {konu ? (
            <>
              {" "}
              · Konu adı: <strong>{konu}</strong>
            </>
          ) : (
            <> · {BANK_NO_TOPIC_LABEL}</>
          )}
        </p>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            onClick={onClose}
          >
            Tamam
          </button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell title="Soru Bankasına Kaydet" onClose={onClose}>
      <p className="mb-4 text-sm text-slate-500">{countLabel}</p>
      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
      {duplicateHint && (
        <p className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {duplicateHint}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Yükleniyor…</p>
      ) : (
        <div className="space-y-4">
          <section>
            <label className="mb-1.5 block text-sm font-semibold text-slate-800">
              Ders adı <span className="text-rose-500">*</span>
            </label>
            <select
              value={ders}
              onChange={(e) => {
                setDers(e.target.value);
                setKonu(null);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {(dersOptions.length > 0 ? dersOptions : settings?.dersList ?? []).map((d) => (
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

          <section>
            <label className="mb-1.5 block text-sm font-semibold text-slate-800">Konu adı</label>
            <select
              value={konu ?? ""}
              onChange={(e) => setKonu(e.target.value.trim() ? e.target.value : null)}
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

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Zorluk (isteğe bağlı)</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDifficulty(null)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  difficulty === null
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
                  onClick={() => setDifficulty(d)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    difficulty === d
                      ? "bg-blue-600 text-white"
                      : "border border-slate-300 text-slate-600"
                  }`}
                >
                  {QUESTION_DIFFICULTY_LABEL[d]}
                </button>
              ))}
            </div>
          </section>

          <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
            Kaynak PDF bilgisi otomatik kaydedilir. Konu seçmezseniz soru &quot;{BANK_NO_TOPIC_LABEL}&quot;
            altında listelenir; daha sonra düzenleyebilirsiniz.
          </p>
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          onClick={onClose}
          disabled={saving}
        >
          İptal
        </button>
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          onClick={() => void handleSave()}
          disabled={loading || saving || !ders.trim()}
        >
          {saving ? "Kaydediliyor…" : "Soru Bankasına Kaydet"}
        </button>
      </div>
    </ModalShell>
  );
}
