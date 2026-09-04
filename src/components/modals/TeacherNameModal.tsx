/**
 * ÖĞRETMEN İSMİ EKLEYİN - Görsel 3
 * + EKLE ile yeni Ad Soyad / İsim Altına Yazı satırları eklenir.
 * PDF sonunda yan yana / alt alta sıralanır, altına imza satırı çizilir.
 */
import { useLayoutEffect } from "react";
import { useEditorStore } from "../../store/editorStore";

type TeacherNameModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function TeacherNameModal({ open, onClose }: TeacherNameModalProps) {
  const teacherNames = useEditorStore((s) => s.teacherNames);
  const appendTeacherRow = useEditorStore((s) => s.addTeacherName);
  const updateTeacherName = useEditorStore((s) => s.updateTeacherName);
  const removeTeacherName = useEditorStore((s) => s.removeTeacherName);
  const setTeacherNames = useEditorStore((s) => s.setTeacherNames);

  useLayoutEffect(() => {
    if (!open) return;
    if (useEditorStore.getState().teacherNames.length === 0) {
      setTeacherNames([{ name: "", title: "" }]);
    }
  }, [open, setTeacherNames]);

  const handleAdd = () => {
    appendTeacherRow({ name: "", title: "" });
  };

  const handleOk = () => {
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-600/80 bg-slate-800 shadow-xl shadow-black/30 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="teacher-name-modal-title"
      >
        <div
          className="flex items-center justify-center py-3 text-white font-bold text-base tracking-wide"
          style={{ backgroundColor: "#1E3A5F" }}
        >
          <h3 id="teacher-name-modal-title">ÖĞRETMEN İSMİ EKLEYİN</h3>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                Öğretmen İsmi:
              </label>
              <div className="space-y-2">
                {teacherNames.map((entry, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={entry.name ?? ""}
                      onChange={(e) => updateTeacherName(i, { name: e.target.value })}
                      className="flex-1 min-w-0 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none ring-blue-500 focus:ring"
                    />
                    <button
                      type="button"
                      onClick={() => removeTeacherName(i)}
                      className="shrink-0 rounded p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-700"
                      title="Kaldır"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                İsim Altına Yazı Ekle:
              </label>
              <div className="space-y-2">
                {teacherNames.map((entry, i) => (
                  <input
                    key={i}
                    type="text"
                    value={entry.title ?? ""}
                    onChange={(e) => updateTeacherName(i, { title: e.target.value })}
                    className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none ring-blue-500 focus:ring"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={handleAdd}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              + EKLE
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-500 bg-slate-700/80 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-600"
              >
                İPTAL
              </button>
              <button
                type="button"
                onClick={handleOk}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                TAMAM
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
