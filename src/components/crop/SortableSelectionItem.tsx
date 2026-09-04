import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CropBox } from "../../types";

type PendingSelection = {
  id: string;
  pdf_id: string;
  page_number: number;
  crop: CropBox;
  number: number;
  /** Editörden gelenlerde: PDF soru numarası veya açıklama kısaltması */
  listBadge?: string;
  backendId?: string;
  answer_key?: string;
  isLocal?: boolean;
  localPdfId?: string;
  localFilename?: string;
};

type SortableSelectionItemProps = {
  sel: PendingSelection;
  localFilename?: string;
  onRemove: (sel: PendingSelection) => void | Promise<void>;
  onNavigate: (sourceValue: string, pageNumber: number) => void;
};

export default function SortableSelectionItem({
  sel,
  localFilename,
  onRemove,
  onNavigate,
}: SortableSelectionItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sel.id });

  const label = sel.isLocal ? localFilename ?? "Local PDF" : "Kayıtlı soru";
  const canNavigate = !!(sel.isLocal && sel.localPdfId);
  const hasAnswer = !!(sel.answer_key && sel.answer_key.trim());
  const fullText = `${label} · s.${sel.page_number}${hasAnswer ? ` · ${sel.answer_key}` : " · Cevapsız"}`;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex cursor-grab items-center gap-2 rounded border p-2 text-xs active:cursor-grabbing ${isDragging ? "opacity-60" : ""} ${hasAnswer ? "border-slate-600 bg-slate-700/50" : "border-amber-500/70 bg-amber-900/30"}`}
      title={fullText}
      {...attributes}
      {...listeners}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-slate-600 bg-slate-800 text-center text-[0.65rem] font-semibold leading-tight text-slate-300">
        {sel.listBadge ?? sel.number}
      </div>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => {
            if (!canNavigate || !sel.localPdfId) return;
            onNavigate(`local:${sel.localPdfId}`, sel.page_number);
          }}
          className="w-full truncate text-left text-slate-300 hover:text-white hover:underline disabled:cursor-default disabled:opacity-70"
          disabled={!canNavigate}
        >
          {label} · s.{sel.page_number}
          {hasAnswer ? (
            ` · ${sel.answer_key}`
          ) : (
            <span className="ml-1 inline-flex items-center rounded border border-amber-500/60 bg-amber-800/40 px-1.5 py-0.5 text-[0.625rem] font-medium text-amber-300">
              Cevapsız
            </span>
          )}
        </button>
      </div>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(sel);
        }}
        className="shrink-0 text-rose-400 hover:text-rose-300"
      >
        Kaldır
      </button>
    </li>
  );
}
