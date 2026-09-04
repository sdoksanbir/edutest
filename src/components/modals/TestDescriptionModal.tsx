import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ReactQuill from "react-quill-new";
import "quill/dist/quill.snow.css";

const quillModules = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    ["clean"],
  ],
};

const quillFormats = [
  "header",
  "bold",
  "italic",
  "underline",
  "list",
  "bullet",
  "indent",
];

type ColumnCount = 1 | 2 | 3;

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (columnCount: ColumnCount, texts: string[], columnDividers: boolean) => void;
  initialColumnCount: ColumnCount;
  initialTexts: string[];
  /** 2+ sütunda kutuda dikey ayırıcı çizgiler */
  initialColumnDividers?: boolean;
  themeColor: string;
};

export default function TestDescriptionModal({
  open,
  onClose,
  onConfirm,
  initialColumnCount,
  initialTexts,
  initialColumnDividers = false,
  themeColor,
}: Props) {
  const [columnCount, setColumnCount] = useState<ColumnCount>(initialColumnCount);
  const [texts, setTexts] = useState<string[]>(
    initialTexts.length >= 1 ? initialTexts : [""]
  );
  const [columnDividers, setColumnDividers] = useState(initialColumnDividers);

  useEffect(() => {
    if (open) {
      setColumnCount(initialColumnCount);
      setColumnDividers(initialColumnDividers);
      const t =
        initialTexts.length >= initialColumnCount
          ? initialTexts.slice(0, initialColumnCount)
          : [
              ...initialTexts,
              ...Array(initialColumnCount - initialTexts.length).fill(""),
            ];
      setTexts(t);
    }
  }, [open, initialColumnCount, initialTexts, initialColumnDividers]);

  useEffect(() => {
    if (!open) return;
    setTexts((prev) => {
      if (columnCount > prev.length) {
        return [...prev, ...Array(columnCount - prev.length).fill("")];
      }
      if (columnCount < prev.length) return prev.slice(0, columnCount);
      return prev;
    });
  }, [columnCount, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);

  if (!open) return null;

  const handleApply = () => {
    const dividers = columnCount >= 2 && columnDividers;
    onConfirm(columnCount, texts.slice(0, columnCount), dividers);
    onClose();
  };

  const setTextAt = (index: number, value: string) => {
    setTexts((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-semibold text-slate-800">
          Yönerge ekle
        </h3>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Sütun sayısı
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-2">
            <div className="flex flex-wrap gap-2">
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setColumnCount(n)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    columnCount === n
                      ? "border-transparent text-white"
                      : "border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                  style={
                    columnCount === n
                      ? { backgroundColor: themeColor }
                      : undefined
                  }
                >
                  {n} Sütun
                </button>
              ))}
            </div>
            <label
              className={`flex shrink-0 cursor-pointer items-center gap-2 text-sm ${
                columnCount < 2 ? "text-slate-400" : "text-slate-700"
              }`}
            >
              <input
                type="checkbox"
                checked={columnCount >= 2 && columnDividers}
                disabled={columnCount < 2}
                onChange={(e) => setColumnDividers(e.target.checked)}
                className="h-4 w-4 rounded border-slate-400"
              />
              Sütunlar arasında çizgi ekle
            </label>
          </div>
        </div>

        <div className="mb-4 flex max-h-[50vh] flex-col gap-3 overflow-y-auto">
          {Array.from({ length: columnCount }, (_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-600">
                Sütun {i + 1}
              </label>
              <div className="[&_.ql-container]:min-h-[120px] [&_.ql-editor]:min-h-[120px]">
                <ReactQuill
                  theme="snow"
                  value={texts[i] ?? ""}
                  onChange={(v) => setTextAt(i, v)}
                  placeholder={`Sütun ${i + 1} yönerge metni...`}
                  modules={quillModules}
                  formats={quillFormats}
                  className="rounded-lg [&_.ql-container]:rounded-b-lg [&_.ql-editor]:text-slate-800 [&_.ql-toolbar]:rounded-t-lg"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="rounded-lg px-4 py-2 text-sm font-bold text-white"
            style={{ backgroundColor: themeColor }}
          >
            Tamam
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
