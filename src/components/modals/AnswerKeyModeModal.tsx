import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useEditorStore, type AnswerKeyMode } from "../../store/editorStore";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (mode: AnswerKeyMode) => void;
  currentMode: AnswerKeyMode;
  themeColor: string;
};

export default function AnswerKeyModeModal({ open, onClose, onConfirm, currentMode, themeColor }: Props) {
  const activeTab = useEditorStore((s) => s.activeTab);
  const writtenOnly = activeTab === "written-paper";

  const [selected, setSelected] = useState<AnswerKeyMode>(currentMode);

  useEffect(() => {
    if (!open) return;
    if (writtenOnly) {
      setSelected("separate_page");
      return;
    }
    setSelected(currentMode);
  }, [open, currentMode, writtenOnly]);

  if (!open) return null;

  const handleApply = () => {
    onConfirm(selected);
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-bold text-slate-800">Cevap anahtarı nereye eklensin?</h3>
        {writtenOnly && (
          <p className="mb-3 text-xs text-slate-500">
            Yazılı kağıdında cevap anahtarı yalnızca ayrı sayfada yer alır.
          </p>
        )}
        <div className="space-y-2">
          {(writtenOnly
            ? ([{ value: "separate_page" as const, label: "Ayrı sayfaya ekle" }] as const)
            : ([
                { value: "per_page" as const, label: "Her sayfanın altına ekle" },
                { value: "separate_page" as const, label: "Ayrı sayfaya ekle" },
                { value: "end_of_test" as const, label: "Testin sonuna ekle" },
              ] as const)
          ).map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <input
                type="radio"
                name="answerKeyMode"
                checked={selected === opt.value}
                onChange={() => setSelected(opt.value)}
                className="h-4 w-4"
              />
              {opt.label}
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            İPTAL
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="rounded-lg px-4 py-2 text-sm font-bold text-white"
            style={{ backgroundColor: themeColor }}
          >
            UYGULA
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
