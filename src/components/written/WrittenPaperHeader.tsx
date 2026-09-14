import { useMemo } from "react";
import { useEditorStore } from "../../store/editorStore";
import {
  WRITTEN_STUDENT_FIELD_OPTIONS,
  clampBookletLetter,
  defaultWrittenPaperUi,
  type WrittenStudentFieldKey,
} from "../../utils/writtenPaperUi";
import type { QuestionItem } from "../../types";

type Props = {
  questions?: QuestionItem[];
  className?: string;
};

/** Yazılı kağıdı üst başlığı — sol panel ayarlarına bağlı canlı önizleme */
export default function WrittenPaperHeader({ questions, className = "" }: Props) {
  const schoolName = useEditorStore((s) => s.schoolName);
  const uiRaw = useEditorStore((s) => s.writtenPaperUi);
  const ui = useMemo(() => {
    const base = { ...defaultWrittenPaperUi(), ...(uiRaw ?? {}) };
    const count = (base.bookletCount === 3 || base.bookletCount === 4 ? base.bookletCount : 2) as
      | 2
      | 3
      | 4;
    const legacyLetter =
      (uiRaw as { bookletLetter?: string; bookletMode?: string } | null | undefined)?.bookletLetter ??
      ((uiRaw as { bookletMode?: string } | null | undefined)?.bookletMode === "auto-b" ? "B" : "A");
    return {
      ...base,
      bookletCount: count,
      bookletLetter: clampBookletLetter(legacyLetter, count),
      studentFields: {
        ...defaultWrittenPaperUi().studentFields,
        ...(uiRaw?.studentFields ?? {}),
      },
    };
  }, [uiRaw]);
  const storeQuestions = useEditorStore((s) => s.questions);
  const qs = useMemo(() => {
    const src = questions ?? storeQuestions;
    return src.filter((q) => q.writtenType).sort((a, b) => a.order_index - b.order_index);
  }, [questions, storeQuestions]);

  const accent = ui.accentColor || "#0D9488";
  const letter = ui.bookletEnabled ? ui.bookletLetter : null;

  const hasTitleBlock =
    Boolean(schoolName.trim()) || Boolean(ui.academicYear.trim()) || Boolean(ui.examTitle.trim());

  const studentKeys = useMemo(
    () =>
      WRITTEN_STUDENT_FIELD_OPTIONS.filter((o) => ui.studentFields[o.key as WrittenStudentFieldKey]).map(
        (o) => o,
      ),
    [ui.studentFields],
  );

  const baremCols = useMemo(() => {
    return qs.map((q, i) => ({
      label: `S.${i + 1}`,
      points: q.writtenPoints ?? 0,
    }));
  }, [qs]);

  const frameStyle = ui.showFrame
    ? {
        borderColor: accent,
        borderWidth: 2,
        borderStyle: "solid" as const,
      }
    : {
        borderColor: "#e2e8f0",
        borderWidth: 1,
        borderStyle: "solid" as const,
      };

  const titleCls = hasTitleBlock ? "text-slate-700" : "text-slate-400";

  return (
    <header
      className={`written-paper-header rounded-xl bg-white p-3 ${className}`}
      style={frameStyle}
    >
      <div className="flex items-start gap-3">
        {ui.showLogo ? (
          <div className="flex w-[4.5rem] shrink-0 flex-col items-center justify-center">
            {ui.logoDataUrl ? (
              <img
                src={ui.logoDataUrl}
                alt="Logo"
                className="max-h-14 max-w-[4.5rem] object-contain"
              />
            ) : (
              <div className="flex h-14 w-[4.5rem] items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-[0.55rem] font-semibold text-slate-400">
                Logo
              </div>
            )}
          </div>
        ) : (
          <div className="w-2 shrink-0" />
        )}

        <div className={`min-w-0 flex-1 space-y-0.5 pt-0.5 text-center ${titleCls}`}>
          {hasTitleBlock ? (
            <>
              <p className="text-[0.8rem] font-bold uppercase leading-snug tracking-wide">
                {schoolName.trim() || "\u00a0"}
              </p>
              <p className="text-[0.75rem] font-semibold leading-snug">
                {ui.academicYear.trim() || "\u00a0"}
              </p>
              <p className="text-[0.75rem] font-bold uppercase leading-snug tracking-wide">
                {ui.examTitle.trim() || "\u00a0"}
              </p>
            </>
          ) : (
            <p className="text-sm font-medium leading-snug">
              Okul adı, eğitim yılı ve sınav başlığını girin
            </p>
          )}
        </div>

        <div className="flex w-[4.5rem] shrink-0 flex-col items-end gap-0.5">
          {ui.showExamDate ? (
            <span className="text-[0.7rem] font-medium text-slate-600">{ui.examDate}</span>
          ) : null}
          {ui.showExamDuration && ui.examDuration.trim() ? (
            <span className="text-[0.65rem] font-semibold text-slate-600">
              Süre: {ui.examDuration.trim()}
            </span>
          ) : null}
          {letter ? (
            <span className="mt-0.5 text-3xl font-black leading-none" style={{ color: accent }}>
              {letter}
            </span>
          ) : null}
        </div>
      </div>

      {studentKeys.length > 0 ? (
        <>
          <div className="my-2.5 border-t border-slate-200" />
          <div
            className="grid gap-x-3 gap-y-1.5"
            style={{
              gridTemplateColumns: `repeat(${Math.min(studentKeys.length, 5)}, minmax(0, 1fr))`,
            }}
          >
            {studentKeys.map((f) => (
              <div key={f.key} className="flex min-w-0 items-baseline gap-1 text-[0.7rem]">
                <span className="shrink-0 font-semibold text-slate-700">{f.label}:</span>
                <span className="min-w-0 flex-1 border-b border-dotted border-slate-400" />
              </div>
            ))}
          </div>
        </>
      ) : null}

      {ui.showBaremTable && baremCols.length > 0 ? (
        <div className="mt-2.5 overflow-hidden rounded-md border" style={{ borderColor: `${accent}55` }}>
          <table className="w-full border-collapse text-[0.65rem]">
            <thead>
              <tr style={{ backgroundColor: `${accent}18` }}>
                {baremCols.map((c) => (
                  <th
                    key={c.label}
                    className="border-r px-1.5 py-1 font-semibold last:border-r-0"
                    style={{ color: accent, borderColor: `${accent}33` }}
                  >
                    {c.label} {c.points}p
                  </th>
                ))}
                <th className="px-1.5 py-1 font-bold" style={{ color: accent }}>
                  Toplam
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {baremCols.map((c) => (
                  <td
                    key={`v-${c.label}`}
                    className="h-6 border-r border-t last:border-r-0"
                    style={{ borderColor: `${accent}33` }}
                  />
                ))}
                <td className="h-6 border-t" style={{ borderColor: `${accent}33` }} />
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}

      {ui.showScoreBox && baremCols.length === 0 ? (
        <div
          className="mt-2 ml-auto flex h-8 w-16 items-center justify-center rounded-md border-2 text-[0.65rem] font-bold"
          style={{ borderColor: accent, color: accent }}
        >
          Puan
        </div>
      ) : null}
    </header>
  );
}
