/**
 * Bölüm Ekle modalı - original-desktop pdf_preview_dialog.py SectionRange paneliyle uyumlu.
 * Yeni bölüm ekle / Düzenle, bölüm aralığı seçimi, çakışma kontrolü, stil ayarları.
 */
import { useEffect, useState } from "react";
import { useEditorStore } from "../../store/editorStore";
import type { SectionRange } from "../../types";

type SectionAddModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Seçili soru (order_index). Modal açıldığında bu soru bir bölümün başlangıcıysa form doldurulur. */
  selectedQuestion?: number;
};

export default function SectionAddModal({
  isOpen,
  onClose,
  selectedQuestion = -1,
}: SectionAddModalProps) {
  const questions = useEditorStore((s) => s.questions);
  const sections = useEditorStore((s) => s.sections);
  const addSection = useEditorStore((s) => s.addSection);
  const updateSection = useEditorStore((s) => s.updateSection);
  const removeSection = useEditorStore((s) => s.removeSection);

  const [mode, setMode] = useState<"new" | "edit">("new");
  const [editIndex, setEditIndex] = useState(-1);
  const [title, setTitle] = useState("");
  const [startIdx, setStartIdx] = useState<number | null>(null);
  const [endIdx, setEndIdx] = useState<number | null>(null);
  const [restartNumbering, setRestartNumbering] = useState(false);
  const [startNewPage, setStartNewPage] = useState(false);
  const [fillColor, setFillColor] = useState("#FFFFFF");
  const [textColor, setTextColor] = useState("#000000");
  const [lineColor, setLineColor] = useState("#000000");
  const [fontPt, setFontPt] = useState(12);

  const totalQuestions = questions.length;

  const resetForm = () => {
    setMode("new");
    setEditIndex(-1);
    setTitle("");
    setStartIdx(null);
    setEndIdx(null);
    setRestartNumbering(false);
    setStartNewPage(false);
    setFillColor("#FFFFFF");
    setTextColor("#000000");
    setLineColor("#000000");
    setFontPt(12);
  };

  // Modal açıldığında: seçili soru bir bölümün başlangıcıysa formu doldur (_sync_section_panel_for_selected_question)
  useEffect(() => {
    if (!isOpen) return;
    resetForm();
    if (totalQuestions === 0) return;
    if (selectedQuestion < 0) return;
    const idx = selectedQuestion;
    const match = sections.find((r) => r.start_idx === idx);
    if (match) {
      const si = sections.indexOf(match);
      setMode("edit");
      setEditIndex(si);
      setTitle(match.title);
      setStartIdx(match.start_idx);
      setEndIdx(match.end_idx);
      setRestartNumbering(match.restart_numbering ?? false);
      setStartNewPage(match.start_new_page ?? false);
      setFillColor(match.fill_color ?? "#FFFFFF");
      setTextColor(match.text_color ?? "#000000");
      setLineColor(match.line_color ?? "#000000");
      setFontPt(match.font_pt ?? 12);
    } else {
      setStartIdx(0);
      setEndIdx(Math.max(0, totalQuestions - 1));
    }
  }, [isOpen, totalQuestions, selectedQuestion]); // sections değişince sync etmeyiz - sadece açılışta

  const handleApply = () => {
    const s = startIdx ?? 0;
    const e = endIdx ?? Math.max(0, totalQuestions - 1);
    const start = Math.max(0, Math.min(s, totalQuestions - 1));
    const end = Math.max(start, Math.min(e, totalQuestions - 1));

    const finalTitle = title.trim() || `Bölüm ${sections.length + 1}`;
    const editingOldStart = mode === "edit" && editIndex >= 0 ? sections[editIndex]?.start_idx : null;
    const editingOldEnd = mode === "edit" && editIndex >= 0 ? sections[editIndex]?.end_idx : null;
    const isEditing = editingOldStart != null && editingOldEnd != null;
    const skipOverlap =
      isEditing && editingOldStart === start && editingOldEnd === end;

    if (!skipOverlap) {
      const overlaps: number[] = [];
      const others = sections.filter((_, i) => mode !== "edit" || i !== editIndex);
      for (const r of others) {
        const si = r.start_idx;
        const ei = r.end_idx;
        const oStart = Math.max(si, start);
        const oEnd = Math.min(ei, end);
        if (oStart <= oEnd) {
          for (let i = oStart; i <= oEnd; i++) overlaps.push(i);
        }
      }
      if (overlaps.length > 0) {
        const uniq = [...new Set(overlaps)].sort((a, b) => a - b);
        const qNums = uniq.map((i) => i + 1).join(", ");
        alert(
          `Yeni bölüm aralığı mevcut bir bölüm ile çakışıyor.\nÇakışan sorular: ${qNums}\nLütfen başka bir aralık seçin.`
        );
        return;
      }
    }

    const section: SectionRange = {
      start_idx: start,
      end_idx: end,
      title: finalTitle,
      restart_numbering: restartNumbering,
      start_new_page: startNewPage,
      fill_color: fillColor,
      text_color: textColor,
      line_color: lineColor,
      font_pt: fontPt,
    };

    if (mode === "edit" && editIndex >= 0) {
      updateSection(editIndex, section);
    } else {
      addSection(section);
    }
    resetForm();
    setStartIdx(0);
    setEndIdx(Math.max(0, totalQuestions - 1));
  };

  const handleEdit = (index: number) => {
    const sec = sections[index];
    setMode("edit");
    setEditIndex(index);
    setTitle(sec.title);
    setStartIdx(sec.start_idx);
    setEndIdx(sec.end_idx);
    setRestartNumbering(sec.restart_numbering ?? false);
    setStartNewPage(sec.start_new_page ?? false);
    setFillColor(sec.fill_color ?? "#FFFFFF");
    setTextColor(sec.text_color ?? "#000000");
    setLineColor(sec.line_color ?? "#000000");
    setFontPt(sec.font_pt ?? 12);
  };

  const handleNewMode = () => {
    setMode("new");
    setEditIndex(-1);
    setTitle("");
    setStartIdx(startIdx ?? 0);
    setEndIdx(endIdx ?? Math.max(0, totalQuestions - 1));
    setRestartNumbering(false);
    setStartNewPage(false);
    setFillColor("#FFFFFF");
    setTextColor("#000000");
    setLineColor("#000000");
    setFontPt(12);
  };

  const sortedSections = [...sections].sort((a, b) => a.start_idx - b.start_idx);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-600 bg-slate-800 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-100">
          📌 Bölüm Bilgileri
        </h2>

        {/* Yeni bölüm ekle / Düzenle (original-desktop rb_new_section, rb_edit_section) */}
        <div className="mb-4 flex gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="radio"
              checked={mode === "new"}
              onChange={handleNewMode}
              className="accent-blue-500"
            />
            Yeni bölüm ekle
          </label>
          {sections.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="radio"
                checked={mode === "edit"}
                onChange={() => setMode("edit")}
                className="accent-blue-500"
              />
              Düzenle
            </label>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Bölüm adı</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bölüm adı giriniz"
              className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
            />
          </div>

          {/* Bölüm aralığı - original-desktop section_start_cb, section_end_cb (Soru 1, Soru 2...) */}
          <div>
            <label className="mb-1 block text-xs text-slate-400">Bölüm aralığı</label>
            <div className="flex gap-3">
              <div className="flex-1">
                <span className="mb-1 block text-xs text-slate-500">Başlangıç:</span>
                <select
                  value={startIdx ?? ""}
                  onChange={(e) =>
                    setStartIdx(
                      e.target.value === "" ? null : Number(e.target.value)
                    )
                  }
                  className="w-full rounded border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm text-slate-100"
                >
                  <option value="">Seç</option>
                  {Array.from({ length: totalQuestions }, (_, i) => (
                    <option key={i} value={i}>
                      Soru {i + 1}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <span className="mb-1 block text-xs text-slate-500">Bitiş:</span>
                <select
                  value={endIdx ?? ""}
                  onChange={(e) =>
                    setEndIdx(
                      e.target.value === "" ? null : Number(e.target.value)
                    )
                  }
                  className="w-full rounded border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm text-slate-100"
                >
                  <option value="">Seç</option>
                  {Array.from({ length: totalQuestions }, (_, i) => (
                    <option key={i} value={i}>
                      Soru {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Toplam {totalQuestions} soru (1–{totalQuestions})
            </p>
          </div>

          {/* Soru Numaraları - original-desktop section_rb_continue, section_rb_restart */}
          <div className="rounded-lg border border-slate-600 bg-slate-700/50 p-3">
            <p className="mb-2 text-xs font-medium text-slate-400">Soru Numaraları</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="radio"
                  checked={!restartNumbering}
                  onChange={() => setRestartNumbering(false)}
                  className="accent-blue-500"
                />
                Soru numarasını sırası ile devam et
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="radio"
                  checked={restartNumbering}
                  onChange={() => setRestartNumbering(true)}
                  className="accent-blue-500"
                />
                Soru numarasını 1&apos;den başlat
              </label>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={startNewPage}
              onChange={(e) => setStartNewPage(e.target.checked)}
              className="rounded accent-blue-500"
            />
            Soruları yeni sayfadan başlat
          </label>

          {/* Bölüm Stili - original-desktop sectionStyleBox */}
          <div className="rounded-lg border border-slate-600 bg-slate-700/50 p-3">
            <p className="mb-2 text-xs font-medium text-slate-400">Bölüm Stili</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="mb-0.5 block text-xs text-slate-500">Dolgu</label>
                <input
                  type="color"
                  value={fillColor}
                  onChange={(e) => setFillColor(e.target.value)}
                  className="h-8 w-full cursor-pointer rounded border border-slate-600 bg-slate-700"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-xs text-slate-500">Yazı</label>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="h-8 w-full cursor-pointer rounded border border-slate-600 bg-slate-700"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-xs text-slate-500">Çizgi</label>
                <input
                  type="color"
                  value={lineColor}
                  onChange={(e) => setLineColor(e.target.value)}
                  className="h-8 w-full cursor-pointer rounded border border-slate-600 bg-slate-700"
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="mb-0.5 block text-xs text-slate-500">Yazı boyutu (pt)</label>
              <input
                type="number"
                min={8}
                max={24}
                value={fontPt}
                onChange={(e) => setFontPt(Number(e.target.value) || 12)}
                className="w-20 rounded border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm text-slate-100"
              />
            </div>
          </div>

          {/* Uygula - original-desktop section_apply_btn */}
          <button
            type="button"
            onClick={handleApply}
            disabled={
              (startIdx == null || endIdx == null) ||
              (startIdx > endIdx) ||
              !title.trim()
            }
            className="w-full rounded bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mode === "edit" ? "Güncelle" : "Uygula"}
          </button>

          {/* Bölümler listesi - original-desktop sections_list */}
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-400">
              Bölümler
            </label>
            {sortedSections.length === 0 ? (
              <p className="rounded border border-slate-600 bg-slate-700/30 px-3 py-2 text-xs text-slate-500">
                Henüz bölüm oluşturulmamıştır
              </p>
            ) : (
              <ul className="space-y-1">
                {sortedSections.map((sec) => {
                  const origIdx = sections.indexOf(sec);
                  return (
                    <li
                      key={origIdx}
                      className="flex items-center justify-between rounded border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-slate-200"
                    >
                      <span>
                        {sec.title} (Soru {sec.start_idx + 1}–{sec.end_idx + 1})
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(origIdx)}
                          className="text-xs text-amber-400 hover:underline"
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSection(origIdx)}
                          className="text-xs text-rose-400 hover:underline"
                        >
                          Sil
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-600 bg-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-600"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
