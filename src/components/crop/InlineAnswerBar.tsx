import type { AnswerOption } from "../../types";

const ALL_OPTIONS: AnswerOption[] = ["A", "B", "C", "D", "E"];

type InlineAnswerBarProps = {
  selectedAnswer: AnswerOption | null;
  onSelect: (answer: AnswerOption | null) => void;
  onConfirm: () => void;
  /** Kaç şık gösterilecek: 3 (A-C), 4 (A-D) veya 5 (A-E). Varsayılan 5. */
  choiceCount?: 3 | 4 | 5;
  /** Tamam butonu göster */
  showConfirm?: boolean;
  /** İptal butonu (yeni seçim akışında) */
  onCancel?: () => void;
  /** Sadece butonları render et (overlay için kendi container kullanılır) */
  bare?: boolean;
  /** Karanlık mod (crop workspace ile uyumlu) */
  dark?: boolean;
  /** Daha küçük butonlar (şıklar + Tamam/İptal) */
  compact?: boolean;
  /** Daha da küçük (düzenle popover için) */
  compactSmall?: boolean;
};

export default function InlineAnswerBar({
  selectedAnswer,
  onSelect,
  onConfirm,
  showConfirm = true,
  onCancel,
  bare = false,
  dark = false,
  compact = false,
  compactSmall = false,
  choiceCount = 5,
}: InlineAnswerBarProps) {
  const options = ALL_OPTIONS.slice(0, choiceCount);
  const sizeClass = compactSmall
    ? "h-6 w-6 text-[0.625rem]"
    : compact
      ? "h-7 w-7 text-xs"
      : "h-9 w-9 text-sm";
  const confirmClass = compactSmall
    ? "ml-0.5 rounded bg-blue-600 px-2 py-1 text-[0.625rem] font-medium text-white hover:bg-blue-500"
    : compact
    ? "ml-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
    : "ml-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500";
  const cancelClass = compactSmall
    ? dark
      ? "rounded border border-slate-500 bg-slate-700 px-1.5 py-1 text-[0.625rem] text-slate-200 hover:bg-slate-600"
      : "rounded border border-slate-300 bg-white px-1.5 py-1 text-[0.625rem] text-slate-600 hover:bg-slate-50"
    : compact
      ? dark
        ? "rounded-md border border-slate-500 bg-slate-700 px-2 py-1.5 text-xs text-slate-200 hover:bg-slate-600"
        : "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
    : dark
      ? "rounded-lg border border-slate-500 bg-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-600"
      : "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50";

  const content = (
    <>
      {options.map((letter) => (
        <button
          key={letter}
          type="button"
          onClick={() => onSelect(selectedAnswer === letter ? null : letter)}
          className={`flex items-center justify-center border font-bold transition ${compactSmall ? "rounded-md" : "rounded-lg"} ${sizeClass} ${
            selectedAnswer === letter
              ? "border-blue-600 bg-blue-600 text-white"
              : dark
                ? "border-slate-500 bg-slate-700 text-slate-200 hover:bg-slate-600 hover:border-slate-400"
                : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {letter}
        </button>
      ))}
      {showConfirm && (
        <button type="button" onClick={onConfirm} className={confirmClass}>
          Tamam
        </button>
      )}
      {onCancel && (
        <button type="button" onClick={onCancel} className={cancelClass}>
          İptal
        </button>
      )}
    </>
  );

  if (bare) return content;

  return (
    <div
      className={
        dark
          ? "flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 shadow-lg"
          : "flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg"
      }
    >
      {content}
    </div>
  );
}
