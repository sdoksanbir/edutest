import { useMemo } from "react";
import {
  PenLine,
  Trash2,
  Eye,
  Maximize2,
} from "lucide-react";
import { useEditorStore } from "../../store/editorStore";
import type { QuestionItem, WrittenAnswerArea } from "../../types";
import { loadEtDraftFromComputer, saveEtDraftToComputer } from "../../utils/etDraftFileFlow";
import WrittenPaperSheet from "../written/WrittenPaperSheet";

const TYPE_LABEL: Record<string, string> = {
  "open-ended": "Açık Uçlu",
};

function isWrittenQuestion(q: QuestionItem): boolean {
  return Boolean(q.writtenType);
}

function AnswerLinesPreview({ lines }: { lines: number }) {
  const n = Math.max(0, Math.min(30, lines));
  return (
    <div className="flex flex-1 flex-col justify-center gap-2.5 px-4 py-3">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="h-px w-full bg-slate-300" />
      ))}
      {n === 0 ? (
        <p className="text-center text-xs text-slate-400">Cevap alanı yok</p>
      ) : null}
    </div>
  );
}

function OpenEndedCard({
  question,
  displayNumber,
}: {
  question: QuestionItem;
  displayNumber: number;
}) {
  const updateWrittenQuestion = useEditorStore((s) => s.updateWrittenQuestion);
  const removeQuestion = useEditorStore((s) => s.removeQuestion);

  const answerArea = (question.writtenAnswerArea ?? "lines") as WrittenAnswerArea;
  const lines = question.writtenAnswerLines ?? 5;
  const points = question.writtenPoints ?? 10;
  const stem = question.writtenStemHtml ?? "";

  return (
    <article className="overflow-hidden rounded-xl border-2 border-blue-400 bg-white shadow-sm">
      <header className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-sm font-bold text-slate-700">
          {displayNumber}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <PenLine className="h-4 w-4 text-sky-600" aria-hidden />
          {TYPE_LABEL[question.writtenType ?? ""] ?? question.writtenType}
        </span>
        <span className="ml-auto text-xs font-semibold text-slate-500">{points} puan</span>
        <button
          type="button"
          onClick={() => removeQuestion(question.id)}
          className="rounded-md p-1.5 text-rose-500 transition hover:bg-rose-50"
          title="Soruyu sil"
          aria-label="Soruyu sil"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </header>

      <div className="relative mx-3 mt-3 min-h-[7.5rem] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
        {answerArea === "lines" ? (
          <AnswerLinesPreview lines={lines} />
        ) : answerArea === "box" ? (
          <div className="m-3 min-h-[6rem] flex-1 rounded-md border-2 border-dashed border-slate-300 bg-white/70" />
        ) : (
          <div className="flex min-h-[5rem] items-center justify-center text-xs text-slate-400">
            Cevap alanı yok
          </div>
        )}
        <div className="absolute right-2 top-2 flex flex-col gap-1">
          <span className="rounded bg-white/90 p-1 text-slate-400 shadow-sm" title="Önizleme">
            <Eye className="h-3.5 w-3.5" />
          </span>
          <span className="rounded bg-white/90 p-1 text-slate-400 shadow-sm" title="Boyut">
            <Maximize2 className="h-3.5 w-3.5" />
          </span>
        </div>
        <span className="absolute bottom-1.5 right-2 text-[0.65rem] font-medium text-slate-400">
          Önizleme
        </span>
      </div>

      <div className="space-y-2 px-3 py-3">
        <label className="block text-xs font-semibold text-slate-600">Soru Metni</label>
        <div className="written-quill overflow-hidden rounded-lg border border-slate-200 bg-white">
          <textarea
            value={stem.replace(/<[^>]+>/g, "")}
            onChange={(e) =>
              updateWrittenQuestion(question.id, {
                writtenStemHtml: e.target.value
                  ? `<p>${e.target.value
                      .replace(/&/g, "&amp;")
                      .replace(/</g, "&lt;")
                      .replace(/>/g, "&gt;")
                      .replace(/\n/g, "<br/>")}</p>`
                  : "",
              })
            }
            placeholder="Soruyu yazın..."
            rows={5}
            className="min-h-[7rem] w-full resize-y border-0 bg-transparent px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 border-t border-slate-100 px-3 py-3">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-slate-600">Cevap Alanı</p>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {(
              [
                ["lines", "Satırlar"],
                ["box", "Kutu"],
                ["none", "Yok"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  updateWrittenQuestion(question.id, { writtenAnswerArea: value })
                }
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  answerArea === value
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {answerArea === "lines" ? (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600" htmlFor={`lines-${question.id}`}>
              Satır Sayısı
            </label>
            <input
              id={`lines-${question.id}`}
              type="number"
              min={1}
              max={30}
              value={lines}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isFinite(v)) return;
                updateWrittenQuestion(question.id, {
                  writtenAnswerLines: Math.max(1, Math.min(30, Math.round(v))),
                });
              }}
              className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
            />
          </div>
        ) : null}

        <div className="ml-auto">
          <label className="mb-1.5 block text-xs font-semibold text-slate-600" htmlFor={`pts-${question.id}`}>
            Puan:
          </label>
          <input
            id={`pts-${question.id}`}
            type="number"
            min={0}
            max={100}
            value={points}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isFinite(v)) return;
              updateWrittenQuestion(question.id, {
                writtenPoints: Math.max(0, Math.min(100, Math.round(v))),
              });
            }}
            className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
          />
        </div>
      </div>
    </article>
  );
}

export default function WrittenQuestionsEditor() {
  const questions = useEditorStore((s) => s.questions);
  const clearAllQuestions = useEditorStore((s) => s.clearAllQuestions);
  const updateWrittenQuestion = useEditorStore((s) => s.updateWrittenQuestion);
  const setOpenModal = useEditorStore((s) => s.setOpenModal);
  const writtenPaperPrepared = useEditorStore((s) => s.writtenPaperPrepared);

  const written = useMemo(
    () => questions.filter(isWrittenQuestion).sort((a, b) => a.order_index - b.order_index),
    [questions],
  );

  const totalPoints = useMemo(
    () => written.reduce((sum, q) => sum + (q.writtenPoints ?? 0), 0),
    [written],
  );

  const distributeTo100 = () => {
    if (written.length === 0) return;
    const base = Math.floor(100 / written.length);
    let rem = 100 - base * written.length;
    written.forEach((q, i) => {
      const pts = base + (i < rem ? 1 : 0);
      updateWrittenQuestion(q.id, { writtenPoints: pts });
    });
  };

  const handleSave = () => {
    void saveEtDraftToComputer().catch((e) => {
      window.alert(e instanceof Error ? e.message : "Kaydedilemedi");
    });
  };

  const handleLoad = () => {
    void loadEtDraftFromComputer().catch((e) => {
      window.alert(e instanceof Error ? e.message : "Taslak yüklenemedi");
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <h2 className="text-base font-bold text-slate-800">
          Yazılı Soruları{" "}
          <span className="font-semibold text-slate-500">({written.length} soru)</span>
        </h2>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Kaydet
          </button>
          <button
            type="button"
            onClick={handleLoad}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Yükle
          </button>
          <button
            type="button"
            onClick={() => {
              if (written.length === 0) return;
              if (!window.confirm("Tüm yazılı sorular silinsin mi?")) return;
              clearAllQuestions();
            }}
            className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
          >
            Temizle
          </button>
          <button
            type="button"
            onClick={() => setOpenModal("question-editor")}
            className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            + Soru Ekle
          </button>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <p className="text-sm text-slate-600">
          Toplam: <span className="font-semibold text-slate-800">{totalPoints} puan</span>
          <span className="mx-1.5 text-slate-300">|</span>
          <span className="font-medium">{written.length} soru</span>
        </p>
        <button
          type="button"
          onClick={distributeTo100}
          disabled={written.length === 0}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
        >
          100&apos;e Eşit Dağıt
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {writtenPaperPrepared ? (
          <WrittenPaperSheet questions={written} />
        ) : (
          written.map((q, i) => (
            <OpenEndedCard key={q.id} question={q} displayNumber={i + 1} />
          ))
        )}
      </div>
    </div>
  );
}
