/**
 * Bölüm Ekle modalı - original-desktop pdf_preview_dialog.py SectionRange paneliyle uyumlu.
 * Yeni bölüm ekle / Düzenle, bölüm aralığı seçimi, çakışma kontrolü, stil ayarları.
 */
import { useEffect, useState } from "react";
import { useEditorStore } from "../../store/editorStore";
import type { SectionRange } from "../../types";
import {
  ColorSwatchPicker,
  SECTION_DEFAULT_FILL,
  SECTION_DEFAULT_TEXT,
  SECTION_FILL_PALETTE,
  SECTION_LINE_NONE,
  SECTION_STYLE_COMBOS,
  SECTION_TEXT_PALETTE,
  isSectionLineEnabled,
  suggestedSectionTextColor,
} from "../preview/ColorSwatchPicker";

type SectionAddModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Seçili soru (order_index). Modal açıldığında bu soru bir bölümün başlangıcıysa form doldurulur. */
  selectedQuestion?: number;
  /** Shift ile seçilen aralık — yeni bölüm için başlangıç/bitiş önceden doldurulur */
  initialStartIdx?: number | null;
  initialEndIdx?: number | null;
};

const DEFAULT_LINE_WHEN_ON = "#0A1931";

export default function SectionAddModal({
  isOpen,
  onClose,
  selectedQuestion = -1,
  initialStartIdx = null,
  initialEndIdx = null,
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
  const [fillColor, setFillColor] = useState(SECTION_DEFAULT_FILL);
  const [textColor, setTextColor] = useState(SECTION_DEFAULT_TEXT);
  const [lineEnabled, setLineEnabled] = useState(false);
  const [lineColor, setLineColor] = useState(DEFAULT_LINE_WHEN_ON);
  const [fontPt, setFontPt] = useState(12);
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);

  const totalQuestions = questions.length;

  const resetForm = () => {
    setMode("new");
    setEditIndex(-1);
    setTitle("");
    setStartIdx(null);
    setEndIdx(null);
    setRestartNumbering(false);
    setStartNewPage(false);
    setFillColor(SECTION_DEFAULT_FILL);
    setTextColor(SECTION_DEFAULT_TEXT);
    setLineEnabled(false);
    setLineColor(DEFAULT_LINE_WHEN_ON);
    setFontPt(12);
    setOverlapWarning(null);
  };

  const applyFillWithMatchedText = (fill: string) => {
    setFillColor(fill);
    setTextColor(suggestedSectionTextColor(fill));
  };

  const setStartIdxSafe = (v: number | null) => {
    setOverlapWarning(null);
    setStartIdx(v);
  };

  const setEndIdxSafe = (v: number | null) => {
    setOverlapWarning(null);
    setEndIdx(v);
  };

  /** 0-based indeksleri "3–5, 8" gibi okunaklı metne çevir */
  const formatQuestionRanges = (indices: number[]): string => {
    if (indices.length === 0) return "";
    const sorted = [...indices].sort((a, b) => a - b);
    const parts: string[] = [];
    let from = sorted[0]!;
    let to = from;
    for (let i = 1; i < sorted.length; i++) {
      const n = sorted[i]!;
      if (n === to + 1) {
        to = n;
        continue;
      }
      parts.push(from === to ? `Soru ${from + 1}` : `Soru ${from + 1}–${to + 1}`);
      from = to = n;
    }
    parts.push(from === to ? `Soru ${from + 1}` : `Soru ${from + 1}–${to + 1}`);
    return parts.join(", ");
  };

  // Modal açıldığında: seçili soru bir bölümün başlangıcıysa formu doldur (_sync_section_panel_for_selected_question)
  useEffect(() => {
    if (!isOpen) return;
    resetForm();
    if (totalQuestions === 0) return;

    const hasRange =
      initialStartIdx != null &&
      initialEndIdx != null &&
      Number.isFinite(initialStartIdx) &&
      Number.isFinite(initialEndIdx);

    if (hasRange) {
      const start = Math.max(0, Math.min(initialStartIdx!, totalQuestions - 1));
      const end = Math.max(start, Math.min(initialEndIdx!, totalQuestions - 1));
      const match = sections.find((r) => r.start_idx === start && r.end_idx === end);
      if (match) {
        const si = sections.indexOf(match);
        setMode("edit");
        setEditIndex(si);
        setTitle(match.title);
        setStartIdx(match.start_idx);
        setEndIdx(match.end_idx);
        setRestartNumbering(match.restart_numbering ?? false);
        setStartNewPage(match.start_new_page ?? false);
        setFillColor(match.fill_color ?? SECTION_DEFAULT_FILL);
        setTextColor(match.text_color ?? SECTION_DEFAULT_TEXT);
        const lineOn = isSectionLineEnabled(match.line_color);
        setLineEnabled(lineOn);
        setLineColor(lineOn ? String(match.line_color) : DEFAULT_LINE_WHEN_ON);
        setFontPt(match.font_pt ?? 12);
      } else {
        setStartIdx(start);
        setEndIdx(end);
      }
      return;
    }

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
      setFillColor(match.fill_color ?? SECTION_DEFAULT_FILL);
      setTextColor(match.text_color ?? SECTION_DEFAULT_TEXT);
      const lineOn = isSectionLineEnabled(match.line_color);
      setLineEnabled(lineOn);
      setLineColor(lineOn ? String(match.line_color) : DEFAULT_LINE_WHEN_ON);
      setFontPt(match.font_pt ?? 12);
    } else {
      setStartIdx(0);
      setEndIdx(Math.max(0, totalQuestions - 1));
    }
  }, [isOpen, totalQuestions, selectedQuestion, initialStartIdx, initialEndIdx]); // sections değişince sync etmeyiz - sadece açılışta

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
        setOverlapWarning(
          `Bu aralık mevcut bir bölümle çakışıyor (${formatQuestionRanges(uniq)}). Başlangıç veya bitiş sorusunu değiştirip tekrar deneyin.`,
        );
        return;
      }
    }

    setOverlapWarning(null);

    const section: SectionRange = {
      start_idx: start,
      end_idx: end,
      title: finalTitle,
      restart_numbering: restartNumbering,
      start_new_page: startNewPage,
      fill_color: fillColor,
      text_color: textColor,
      line_color: lineEnabled ? lineColor : SECTION_LINE_NONE,
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
    setFillColor(sec.fill_color ?? SECTION_DEFAULT_FILL);
    setTextColor(sec.text_color ?? SECTION_DEFAULT_TEXT);
    const lineOn = isSectionLineEnabled(sec.line_color);
    setLineEnabled(lineOn);
    setLineColor(lineOn ? String(sec.line_color) : DEFAULT_LINE_WHEN_ON);
    setFontPt(sec.font_pt ?? 12);
    setOverlapWarning(null);
  };

  const handleNewMode = () => {
    setMode("new");
    setEditIndex(-1);
    setTitle("");
    setStartIdx(startIdx ?? 0);
    setEndIdx(endIdx ?? Math.max(0, totalQuestions - 1));
    setRestartNumbering(false);
    setStartNewPage(false);
    setFillColor(SECTION_DEFAULT_FILL);
    setTextColor(SECTION_DEFAULT_TEXT);
    setLineEnabled(false);
    setLineColor(DEFAULT_LINE_WHEN_ON);
    setFontPt(12);
    setOverlapWarning(null);
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
                    setStartIdxSafe(
                      e.target.value === "" ? null : Number(e.target.value)
                    )
                  }
                  className={`w-full rounded border bg-slate-700 px-2 py-1.5 text-sm text-slate-100 ${
                    overlapWarning ? "border-amber-500/70" : "border-slate-600"
                  }`}
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
                    setEndIdxSafe(
                      e.target.value === "" ? null : Number(e.target.value)
                    )
                  }
                  className={`w-full rounded border bg-slate-700 px-2 py-1.5 text-sm text-slate-100 ${
                    overlapWarning ? "border-amber-500/70" : "border-slate-600"
                  }`}
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
            {overlapWarning && (
              <div
                role="alert"
                className="mt-2.5 flex gap-2.5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5"
              >
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/25 text-[11px] font-bold text-amber-300"
                  aria-hidden
                >
                  !
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-amber-200">Aralık çakışması</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-amber-100/85">
                    {overlapWarning}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOverlapWarning(null)}
                  className="shrink-0 self-start rounded-md px-1.5 py-0.5 text-xs text-amber-200/80 hover:bg-amber-500/20 hover:text-amber-100"
                  aria-label="Uyarıyı kapat"
                >
                  ✕
                </button>
              </div>
            )}
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

          {/* Bölüm Stili — uyumlu dolgu/yazı + çizgi varsayılan kapalı */}
          <div className="rounded-lg border border-slate-600 bg-slate-700/50 p-3">
            <p className="mb-3 text-xs font-medium text-slate-400">Bölüm Stili</p>
            <div className="mb-3">
              <p className="mb-1.5 text-[11px] text-slate-500">Hazır kombinler</p>
              <div className="flex flex-wrap gap-1.5">
                {SECTION_STYLE_COMBOS.map((combo) => {
                  const active =
                    fillColor.toUpperCase() === combo.fill.toUpperCase() &&
                    textColor.toUpperCase() === combo.text.toUpperCase();
                  return (
                    <button
                      key={combo.label}
                      type="button"
                      title={combo.label}
                      onClick={() => {
                        setFillColor(combo.fill);
                        setTextColor(combo.text);
                      }}
                      className={`h-7 min-w-[2.75rem] rounded-md border px-2 text-[10px] font-bold shadow-sm transition ${
                        active
                          ? "ring-2 ring-blue-400 ring-offset-1 ring-offset-slate-800"
                          : "border-slate-500/60 hover:brightness-110"
                      }`}
                      style={{ backgroundColor: combo.fill, color: combo.text }}
                    >
                      Aa
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-[3.5rem] text-xs font-medium text-slate-300">Dolgu</span>
                <ColorSwatchPicker
                  color={fillColor}
                  onColorChange={applyFillWithMatchedText}
                  palette={SECTION_FILL_PALETTE}
                  customTitle="Dolgu rengi"
                  className="justify-end"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-[3.5rem] text-xs font-medium text-slate-300">Yazı</span>
                <ColorSwatchPicker
                  color={textColor}
                  onColorChange={setTextColor}
                  palette={SECTION_TEXT_PALETTE}
                  customTitle="Yazı rengi"
                  className="justify-end"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={lineEnabled}
                    onChange={(e) => setLineEnabled(e.target.checked)}
                    className="rounded accent-blue-500"
                  />
                  Çizgi
                </label>
                {lineEnabled && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pl-6">
                    <span className="min-w-[3.5rem] text-xs font-medium text-slate-300">Renk</span>
                    <ColorSwatchPicker
                      color={lineColor}
                      onColorChange={setLineColor}
                      palette={SECTION_FILL_PALETTE}
                      customTitle="Çizgi rengi"
                      className="justify-end"
                    />
                  </div>
                )}
              </div>
            </div>
            <div
              className="mt-3 flex h-9 items-center justify-center rounded-md border border-slate-600/80 text-sm font-bold"
              style={{ backgroundColor: fillColor, color: textColor }}
              aria-hidden
            >
              {(title.trim() || "Bölüm önizleme").slice(0, 28)}
            </div>
            <div className="mt-3">
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
