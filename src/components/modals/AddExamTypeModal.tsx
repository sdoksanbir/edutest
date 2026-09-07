import { useState, useRef, useEffect } from "react";

type AddExamTypeModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
};

export default function AddExamTypeModal({ open, onClose, onConfirm }: AddExamTypeModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setError(null);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Sınav tipi adı girin");
      return;
    }
    onConfirm(trimmed);
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
        className="w-full max-w-sm rounded-2xl border border-slate-600/80 bg-slate-800 shadow-xl shadow-black/30 p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="add-exam-title"
      >
        <h3 id="add-exam-title" className="mb-4 text-lg font-semibold text-white">
          Yeni Sınav Tipi Ekle
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-xs text-slate-400">
            Sınav tipi adı
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="Örn: 3. Sınav"
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none ring-blue-500 focus:ring"
            />
          </label>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-500 bg-slate-700/80 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-600 hover:text-white"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              Ekle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
