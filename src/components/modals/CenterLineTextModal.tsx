import { useEffect, useState } from "react";

type TextDirection = "up" | "down";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (text: string, bold: boolean, italic: boolean, direction: TextDirection) => void;
  initialText: string;
  initialBold: boolean;
  initialItalic: boolean;
  initialDirection: TextDirection;
  themeColor: string;
};

export default function CenterLineTextModal({
  open,
  onClose,
  onConfirm,
  initialText,
  initialBold,
  initialItalic,
  initialDirection,
  themeColor,
}: Props) {
  const [text, setText] = useState(initialText);
  const [bold, setBold] = useState(initialBold);
  const [italic, setItalic] = useState(initialItalic);
  const [direction, setDirection] = useState<TextDirection>(initialDirection);

  useEffect(() => {
    if (open) {
      setText(initialText);
      setBold(initialBold);
      setItalic(initialItalic);
      setDirection(initialDirection);
    }
  }, [open, initialText, initialBold, initialItalic, initialDirection]);

  if (!open) return null;

  const handleApply = () => {
    onConfirm(text.trim(), bold, italic, direction);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-semibold text-slate-800">Çizgi Üzeri Yazı</h3>
        <div className="relative mb-4 flex w-full items-center rounded-lg border border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Yazıyı girin..."
            className="w-full flex-1 rounded-lg border-0 bg-transparent px-3 py-2 pr-16 text-sm text-slate-800 placeholder-slate-400 outline-none"
          />
          <div className="absolute right-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBold(!bold)}
              className={`group relative flex h-7 w-7 items-center justify-center rounded text-xs font-bold transition ${
                bold ? "bg-orange-500 text-white shadow-md ring-2 ring-orange-400" : "bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-700"
              }`}
            >
              K
              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                Kalın
              </span>
            </button>
            <button
              type="button"
              onClick={() => setItalic(!italic)}
              className={`group relative flex h-7 w-7 items-center justify-center rounded text-xs italic transition ${
                italic ? "bg-orange-500 text-white shadow-md ring-2 ring-orange-400" : "bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-700"
              }`}
            >
              İ
              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                İtalik
              </span>
            </button>
          </div>
        </div>
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-slate-600">Yazı yönü</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDirection("up")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                direction === "up"
                  ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Yukarı
            </button>
            <button
              type="button"
              onClick={() => setDirection("down")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                direction === "down"
                  ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Aşağı
            </button>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
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
    </div>
  );
}
