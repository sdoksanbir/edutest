import { useEffect, useState } from "react";
import {
  HEADER_STYLE_OPTIONS,
  normalizeHeaderStyleId,
  type HeaderStyleId,
} from "../../utils/headerStyles";
import ThemeHeaderPreview from "./ThemeHeaderPreview";

const THEME_COLORS = [
  "#f08c2e",
  "#2fa7d8",
  "#1da466",
  "#a78cc4",
  "#e8cbbf",
  "#f2e316",
  "#b7d7e6",
  "#f34a2f",
  "#bfbfbf",
];

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (styleId: HeaderStyleId, themeColor: string) => void;
  currentStyleId: string;
  currentColor: string;
  useDescriptionBox: boolean;
};

export default function ThemeSelectModal({
  open,
  onClose,
  onConfirm,
  currentStyleId,
  currentColor,
  useDescriptionBox,
}: Props) {
  const [styleId, setStyleId] = useState<HeaderStyleId>(normalizeHeaderStyleId(currentStyleId));
  const [color, setColor] = useState(currentColor || "#1E88E5");

  useEffect(() => {
    if (open) {
      setStyleId(normalizeHeaderStyleId(currentStyleId));
      setColor(currentColor || "#1E88E5");
    }
  }, [open, currentStyleId, currentColor]);

  if (!open) return null;

  const handleApply = () => {
    onConfirm(styleId, color);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-slate-800 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-base font-bold text-slate-100">Kurumsal Başlık Teması Seç</h3>
        <p className="mb-4 text-xs text-slate-400">
          1. sayfada tam banner, 2. ve sonraki sayfalarda kompakt üst şerit uygulanır.
          {useDescriptionBox
            ? " Açıklama kutusu Klasik Test (Minimal) temasında kullanılır."
            : ""}
        </p>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {HEADER_STYLE_OPTIONS.map((s) => (
            <label
              key={s.id}
              className="flex cursor-pointer flex-col gap-2 rounded-xl border-2 p-3 transition"
              style={{
                borderColor: styleId === s.id ? color : "rgb(51 65 85)",
                backgroundColor: styleId === s.id ? `${color}18` : "rgb(30 41 59 / 0.5)",
              }}
            >
              <input
                type="radio"
                name="style"
                checked={styleId === s.id}
                onChange={() => setStyleId(s.id)}
                className="sr-only"
              />
              <ThemeHeaderPreview styleId={s.id} selected={styleId === s.id} accentColor={color} />
              <div>
                <div className="text-sm font-semibold text-slate-100">{s.label}</div>
                <div className="text-[11px] text-slate-400">{s.shortLabel}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="mb-4">
          <h4 className="mb-2 text-sm font-semibold text-slate-300">Tema Rengi (Canlı)</h4>
          <div className="flex flex-wrap gap-2">
            {THEME_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="h-6 w-8 rounded-md border-2 transition"
                style={{
                  backgroundColor: c,
                  borderColor: color === c ? "white" : "transparent",
                }}
                aria-label={`Renk ${c}`}
              />
            ))}
            <label className="flex items-center gap-1 text-sm text-slate-400">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              Renk Seç…
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-500"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="rounded-lg px-4 py-2 text-sm font-bold text-white"
            style={{ backgroundColor: color }}
          >
            Uygula
          </button>
        </div>
      </div>
    </div>
  );
}
