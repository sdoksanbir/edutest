/**
 * Özel Kenar Boşlukları modalı - Üst, Alt, Sol, Sağ margin (cm).
 * Görsel tasarıma uygun: iki sütun (girdi + önizleme), TAMAM/İPTAL.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type MarginSettings = {
  topCm: number;
  bottomCm: number;
  leftCm: number;
  rightCm: number;
};

function cmToMm(cm: number): number {
  return Math.round(cm * 10); // 1.5 cm → 15 mm
}
function mmToCm(mm: number): number {
  return Math.round(mm * 10) / 100;
}

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (margins: MarginSettings) => void;
  /** Mevcut değerler (mm) */
  marginTopMm?: number;
  marginBottomMm?: number;
  marginLeftMm?: number;
  marginRightMm?: number;
  /** Önizleme için sayfa boyutu (mm) */
  pageWidthMm?: number;
  pageHeightMm?: number;
};

export default function CustomMarginsModal({
  open,
  onClose,
  onConfirm,
  marginTopMm = 15,
  marginBottomMm = 15,
  marginLeftMm = 15,
  marginRightMm = 15,
  pageWidthMm = 210,
  pageHeightMm = 297,
}: Props) {
  const [top, setTop] = useState(mmToCm(marginTopMm));
  const [bottom, setBottom] = useState(mmToCm(marginBottomMm));
  const [left, setLeft] = useState(mmToCm(marginLeftMm));
  const [right, setRight] = useState(mmToCm(marginRightMm));

  useEffect(() => {
    if (open) {
      setTop(mmToCm(marginTopMm));
      setBottom(mmToCm(marginBottomMm));
      setLeft(mmToCm(marginLeftMm));
      setRight(mmToCm(marginRightMm));
    }
  }, [open, marginTopMm, marginBottomMm, marginLeftMm, marginRightMm]);

  if (!open) return null;

  const handleOk = () => {
    onConfirm({
      topCm: top,
      bottomCm: bottom,
      leftCm: left,
      rightCm: right,
    });
    onClose();
  };

  const inputs: { label: string; value: number; set: (v: number) => void }[] = [
    { label: "Üst:", value: top, set: setTop },
    { label: "Alt:", value: bottom, set: setBottom },
    { label: "Sol:", value: left, set: setLeft },
    { label: "Sağ:", value: right, set: setRight },
  ];

  const scale = 120 / pageHeightMm;
  const prevW = pageWidthMm * scale;
  const prevH = pageHeightMm * scale;
  const mT = top * 10 * scale;
  const mB = bottom * 10 * scale;
  const mL = left * 10 * scale;
  const mR = right * 10 * scale;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-margins-title"
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="custom-margins-title" className="text-center text-base font-bold text-[#1e3a5f]">
          ÖZEL KENAR BOŞLUKLARI
        </h3>
        <div className="my-4 border-b border-slate-200" />

        <div className="flex gap-6">
          <div className="flex flex-col gap-3">
            {inputs.map(({ label, value, set }) => (
              <div key={label} className="flex items-center gap-2">
                <label className="w-10 text-sm text-slate-700">{label}</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={0.1}
                  value={value}
                  onChange={(e) => set(parseFloat(e.target.value) || 0)}
                  className="h-9 w-24 rounded border border-slate-300 px-2 text-sm text-slate-800 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-1 flex-col items-center">
            <span className="mb-2 text-xs font-medium text-slate-500">Önizleme</span>
            <div
              className="relative shrink-0 rounded border border-slate-300 bg-slate-50"
              style={{ width: prevW, height: prevH }}
            >
              {/* Kenar boşlukları - gölgeli alan */}
              <div
                className="absolute left-0 top-0 bg-[rgba(176,196,222,0.4)]"
                style={{ width: prevW, height: mT }}
              />
              <div
                className="absolute bottom-0 left-0 bg-[rgba(176,196,222,0.4)]"
                style={{ width: prevW, height: mB }}
              />
              <div
                className="absolute left-0 top-0 bg-[rgba(176,196,222,0.4)]"
                style={{ width: mL, height: prevH }}
              />
              <div
                className="absolute right-0 top-0 bg-[rgba(176,196,222,0.4)]"
                style={{ width: mR, height: prevH }}
              />
              {/* İçerik alanı - kesikli çizgi */}
              <div
                className="absolute rounded-sm border border-dashed border-slate-400 bg-white"
                style={{
                  top: mT,
                  left: mL,
                  right: mR,
                  bottom: mB,
                }}
              />
              <div
                className="absolute inset-0 flex items-center justify-center text-[0.625rem] font-medium text-slate-500"
                style={{ fontSize: Math.max(8, prevH * 0.06) }}
              >
                {pageWidthMm} × {pageHeightMm} mm
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            İPTAL
          </button>
          <button
            type="button"
            onClick={handleOk}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            TAMAM
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export { cmToMm, mmToCm };
