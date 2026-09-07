import { useEffect, useState } from "react";

export type QuestionGapSettings = {
  preferredGapMm: number;
  minGapMm: number;
  autoCompact: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (settings: QuestionGapSettings) => void;
  currentGapMm: number;
  currentMinGapMm?: number;
  currentAutoCompact?: boolean;
};

const PRESET_MM = [15, 20, 25, 30, 35, 40, 45, 50, 55];
const MIN_GAP_RANGE = [6, 8, 10, 12, 14, 16, 18, 20] as const;

export default function QuestionGapModal({
  open,
  onClose,
  onConfirm,
  currentGapMm,
  currentMinGapMm = 12,
  currentAutoCompact = true,
}: Props) {
  const [gapMm, setGapMm] = useState(currentGapMm);
  const [customInput, setCustomInput] = useState(String(currentGapMm));
  const [useCustom, setUseCustom] = useState(!PRESET_MM.includes(currentGapMm));
  const [minGapMm, setMinGapMm] = useState(currentMinGapMm);
  const [autoCompact, setAutoCompact] = useState(currentAutoCompact);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setGapMm(currentGapMm);
      setCustomInput(String(currentGapMm));
      setUseCustom(!PRESET_MM.includes(currentGapMm));
      setMinGapMm(currentMinGapMm);
      setAutoCompact(currentAutoCompact);
      setError("");
    }
  }, [open, currentGapMm, currentMinGapMm, currentAutoCompact]);

  if (!open) return null;

  const handleApply = () => {
    setError("");
    const val = useCustom ? parseFloat(customInput) : gapMm;
    const num = Number.isNaN(val) ? 15 : val;
    if (num < 6 || num > 100) {
      setError("Boşluk değeri 6 ile 100 mm arasında olmalıdır. Lütfen geçerli bir değer girin.");
      return;
    }
    if (minGapMm < 6 || minGapMm > num) {
      setError("Minimum boşluk 6 mm ile tercih edilen boşluk arasında olmalıdır.");
      return;
    }
    onConfirm({ preferredGapMm: num, minGapMm, autoCompact });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-sm font-bold text-slate-800">
          Sorular arası boşluk miktarını seçin:
        </h3>
        <p className="mb-4 text-xs text-slate-500">
          Geçerli aralık: 6 – 100 mm
        </p>
        <div className="space-y-3">
          {!useCustom ? (
            <select
              value={gapMm}
              onChange={(e) => {
                setGapMm(Number(e.target.value));
                setError("");
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            >
              {PRESET_MM.map((mm) => (
                <option key={mm} value={mm}>
                  {mm} milimetre
                </option>
              ))}
            </select>
          ) : (
            <div>
              <label className="text-xs text-slate-600">Boşluk miktarı (mm)</label>
              <input
                type="number"
                min={6}
                max={100}
                step={0.5}
                value={customInput}
                onChange={(e) => {
                  setCustomInput(e.target.value);
                  setError("");
                }}
                onBlur={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!Number.isNaN(v) && v >= 6 && v <= 100) setGapMm(v);
                }}
                placeholder="6 - 100 arası girin (örn: 18)"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                autoFocus
              />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={useCustom}
              onChange={(e) => {
                const checked = e.target.checked;
                setUseCustom(checked);
                if (checked) setCustomInput("");
                setError("");
              }}
              className="h-4 w-4"
            />
            Başka değer belirle
          </label>
          <div className="mt-4 border-t border-slate-200 pt-3">
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              Yerleşim optimizasyonu
            </label>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-slate-600">Minimum boşluk (sıkıştırma sınırı):</span>
                <select
                  value={minGapMm}
                  onChange={(e) => setMinGapMm(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  {MIN_GAP_RANGE.map((mm) => (
                    <option key={mm} value={mm}>
                      {mm} mm
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={autoCompact}
                  onChange={(e) => setAutoCompact(e.target.checked)}
                  className="h-4 w-4"
                />
                Otomatik sıkıştırma (sığdırmak için boşlukları azalt)
              </label>
            </div>
          </div>
        </div>
        {error && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {error}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
          >
            İPTAL
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500"
          >
            TAMAM
          </button>
        </div>
      </div>
    </div>
  );
}
