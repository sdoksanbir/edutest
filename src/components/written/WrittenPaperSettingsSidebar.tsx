import { useRef } from "react";
import { useEditorStore } from "../../store/editorStore";
import {
  WRITTEN_STUDENT_FIELD_OPTIONS,
  bookletLettersForCount,
  clampBookletLetter,
  defaultWrittenPaperUi,
  type WrittenBookletLetter,
  type WrittenStudentFieldKey,
} from "../../utils/writtenPaperUi";

function useWrittenPaperUi() {
  const uiRaw = useEditorStore((s) => s.writtenPaperUi);
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
    examDuration: base.examDuration ?? "40 dk",
    studentFields: {
      ...defaultWrittenPaperUi().studentFields,
      ...(uiRaw?.studentFields ?? {}),
    },
  };
}

function Toggle({
  on,
  onChange,
  accent = "teal",
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  accent?: "teal" | "violet";
}) {
  const onCls =
    accent === "violet" ? "bg-violet-500" : "bg-teal-500";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        on ? onCls : "bg-slate-600"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
          on ? "left-5" : "left-0.5"
        }`}
      />
    </button>
  );
}

function DashedRule() {
  return <div className="my-3 border-t border-dashed border-slate-600/80" />;
}

function SectionTitle({ children, tone = "violet" }: { children: string; tone?: "violet" | "orange" | "slate" }) {
  const cls =
    tone === "orange"
      ? "text-orange-400"
      : tone === "slate"
        ? "text-slate-300"
        : "text-violet-400";
  return (
    <h3 className={`mb-3 text-[0.7rem] font-bold uppercase tracking-wider ${cls}`}>
      {children}
    </h3>
  );
}

function HeaderInfoPanel() {
  const schoolName = useEditorStore((s) => s.schoolName);
  const setSchoolName = useEditorStore((s) => s.setSchoolName);
  const ui = useWrittenPaperUi();
  const patch = useEditorStore((s) => s.patchWrittenPaperUi);
  const toggleField = useEditorStore((s) => s.toggleWrittenStudentField);
  const fileRef = useRef<HTMLInputElement>(null);

  const onLogoFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        patch({ logoDataUrl: reader.result, showLogo: true });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="rounded-xl bg-slate-800/90 p-3 text-slate-100 shadow-inner">
      <SectionTitle>Başlık Bilgileri</SectionTitle>
      <input
        type="text"
        value={schoolName}
        onChange={(e) => setSchoolName(e.target.value)}
        placeholder="Okul / Kurum Adı..."
        className="mb-2 w-full rounded-lg border border-slate-600 bg-slate-900/80 px-2.5 py-2 text-xs text-slate-100 placeholder:text-slate-500"
      />
      <div className="mb-3 grid grid-cols-2 gap-2">
        <input
          type="text"
          value={ui.academicYear}
          onChange={(e) => patch({ academicYear: e.target.value })}
          placeholder="Eğitim Yılı..."
          className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-2.5 py-2 text-xs text-slate-100 placeholder:text-slate-500"
        />
        <input
          type="text"
          value={ui.examTitle}
          onChange={(e) => patch({ examTitle: e.target.value })}
          placeholder="Sınav Başlığı..."
          className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-2.5 py-2 text-xs text-slate-100 placeholder:text-slate-500"
        />
      </div>

      <p className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">
        Öğrenci Alanları
      </p>
      <div className="mb-1 flex flex-wrap gap-1.5">
        {WRITTEN_STUDENT_FIELD_OPTIONS.map((opt) => {
          const on = ui.studentFields[opt.key];
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => toggleField(opt.key)}
              className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold transition ${
                on
                  ? "bg-sky-500/90 text-white"
                  : "bg-slate-700 text-slate-400 hover:bg-slate-600"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <DashedRule />

      {(
        [
          ["showFrame", "Çerçeve"],
          ["showScoreBox", "Puan Kutusu"],
          ["showExamDate", "Sınav Tarihi"],
          ["showBaremTable", "Barem Tablosu"],
        ] as const
      ).map(([key, label]) => (
        <div key={key} className="mb-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-200">{label}</span>
            <Toggle on={ui[key]} onChange={(v) => patch({ [key]: v })} />
          </div>
          {key === "showExamDate" && ui.showExamDate ? (
            <input
              type="text"
              value={ui.examDate}
              onChange={(e) => patch({ examDate: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-slate-600 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-100"
              placeholder="GG/AA/YYYY"
            />
          ) : null}
        </div>
      ))}

      <DashedRule />

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-violet-300">Logo</span>
        <Toggle
          on={ui.showLogo}
          onChange={(v) => patch({ showLogo: v })}
          accent="violet"
        />
      </div>
      {ui.showLogo ? (
        <div className="mt-2 flex items-center gap-2">
          {ui.logoDataUrl ? (
            <img
              src={ui.logoDataUrl}
              alt="Logo"
              className="h-10 w-10 rounded-md border border-slate-600 bg-white object-contain p-0.5"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-slate-500 text-[0.55rem] text-slate-400">
              —
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onLogoFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-md bg-violet-600 px-2.5 py-1.5 text-[0.65rem] font-semibold text-white hover:bg-violet-500"
          >
            Yükle
          </button>
          {ui.logoDataUrl ? (
            <button
              type="button"
              onClick={() => patch({ logoDataUrl: null })}
              className="rounded-md bg-rose-700/80 px-2.5 py-1.5 text-[0.65rem] font-semibold text-white hover:bg-rose-600"
            >
              Kaldır
            </button>
          ) : null}
        </div>
      ) : (
        <p className="mt-1.5 text-[0.65rem] text-slate-500">
          Kapalı. Açıp kendi logonuzu yükleyebilirsiniz.
        </p>
      )}
    </section>
  );
}

function ExamSettingsCard() {
  const ui = useWrittenPaperUi();
  const patch = useEditorStore((s) => s.patchWrittenPaperUi);
  const letters = bookletLettersForCount(ui.bookletCount);

  return (
    <section className="rounded-xl bg-slate-800/90 p-3 text-slate-100 shadow-inner">
      <SectionTitle tone="orange">Sınav Ayarları</SectionTitle>

      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-white">Kitapçık Türü</span>
        <Toggle
          on={ui.bookletEnabled}
          onChange={(v) => patch({ bookletEnabled: v })}
        />
      </div>
      {ui.bookletEnabled ? (
        <>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {([2, 3, 4] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() =>
                  patch({
                    bookletCount: n,
                    bookletLetter: clampBookletLetter(ui.bookletLetter, n),
                  })
                }
                className={`rounded-lg px-2.5 py-1.5 text-[0.7rem] font-semibold transition ${
                  ui.bookletCount === n
                    ? "bg-teal-500 text-white"
                    : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                }`}
              >
                {n} Kitapçık
              </button>
            ))}
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {letters.map((L) => (
              <button
                key={L}
                type="button"
                onClick={() => patch({ bookletLetter: L as WrittenBookletLetter })}
                className={`min-w-[2.25rem] rounded-lg px-2.5 py-1.5 text-[0.75rem] font-bold transition ${
                  ui.bookletLetter === L
                    ? "bg-teal-500 text-white"
                    : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                }`}
              >
                {L}
              </button>
            ))}
          </div>
        </>
      ) : null}

      <DashedRule />

      <div className="mb-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-200">Sınav Süresi</span>
          <Toggle
            on={ui.showExamDuration}
            onChange={(v) => patch({ showExamDuration: v })}
          />
        </div>
        {ui.showExamDuration ? (
          <input
            type="text"
            value={ui.examDuration}
            onChange={(e) => patch({ examDuration: e.target.value })}
            placeholder="Örn. 40 dk"
            className="mt-1.5 w-full rounded-lg border border-slate-600 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
          />
        ) : null}
      </div>

      {(
        [
          ["showSignatureBlock", "İmza Bloğu"],
          ["showWishText", "Dilek Metni"],
        ] as const
      ).map(([key, label]) => (
        <div key={key} className="mb-2.5 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-200">{label}</span>
          <Toggle on={ui[key]} onChange={(v) => patch({ [key]: v })} />
        </div>
      ))}
    </section>
  );
}

function PageStructureCard() {
  const orientation = useEditorStore((s) => s.orientation);
  const setOrientation = useEditorStore((s) => s.setOrientation);
  const columns = useEditorStore((s) => s.columns);
  const setColumns = useEditorStore((s) => s.setColumns);
  const questionGapMm = useEditorStore((s) => s.questionGapMm);
  const setQuestionGapMm = useEditorStore((s) => s.setQuestionGapMm);
  const marginLeftMm = useEditorStore((s) => s.marginLeftMm);
  const marginRightMm = useEditorStore((s) => s.marginRightMm);
  const marginTopMm = useEditorStore((s) => s.marginTopMm);
  const marginBottomMm = useEditorStore((s) => s.marginBottomMm);
  const setMargins = useEditorStore((s) => s.setMargins);
  const questionNumberingEnabled = useEditorStore((s) => s.questionNumberingEnabled);
  const setQuestionNumberingEnabled = useEditorStore((s) => s.setQuestionNumberingEnabled);
  const pageNumberingEnabled = useEditorStore((s) => s.pageNumberingEnabled);
  const setPageNumberingEnabled = useEditorStore((s) => s.setPageNumberingEnabled);
  const pageNumberStart = useEditorStore((s) => s.pageNumberStart);
  const setPageNumberStart = useEditorStore((s) => s.setPageNumberStart);
  const pageNumberFormat = useEditorStore((s) => s.pageNumberFormat);
  const setPageNumberFormat = useEditorStore((s) => s.setPageNumberFormat);
  const questionNumberColorMode = useEditorStore((s) => s.questionNumberColorMode);
  const setQuestionNumberColorMode = useEditorStore((s) => s.setQuestionNumberColorMode);

  const marginPreset = (() => {
    const avg = (marginLeftMm + marginRightMm + marginTopMm + marginBottomMm) / 4;
    if (avg <= 12) return "dar";
    if (avg >= 20) return "genis";
    return "normal";
  })();

  const applyMarginPreset = (preset: "dar" | "normal" | "genis") => {
    const v = preset === "dar" ? 10 : preset === "genis" ? 22 : 15;
    setMargins(v, v, v, v);
  };

  return (
    <section className="rounded-xl bg-slate-800/90 p-3 text-slate-100 shadow-inner">
      <SectionTitle tone="slate">Sayfa Yapısı</SectionTitle>

      <div className="mb-3 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => setOrientation("portrait")}
          className={`rounded-lg py-2 text-xs font-semibold ${
            orientation === "portrait" ? "bg-sky-500 text-white" : "bg-slate-700 text-slate-400"
          }`}
        >
          Dikey
        </button>
        <button
          type="button"
          onClick={() => setOrientation("landscape")}
          className={`rounded-lg py-2 text-xs font-semibold ${
            orientation === "landscape" ? "bg-sky-500 text-white" : "bg-slate-700 text-slate-400"
          }`}
        >
          Yatay
        </button>
      </div>

      <p className="mb-1.5 text-xs font-medium text-slate-300">Sütun Sayısı</p>
      <div className="mb-3 flex flex-wrap gap-1">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setColumns(n)}
            className={`h-8 w-8 rounded-md text-xs font-bold ${
              columns === n ? "bg-sky-500 text-white" : "bg-slate-700 text-slate-400"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-medium text-slate-300">
          Sorular Arası Boşluk{" "}
          <span className="text-slate-400">{Math.round(questionGapMm)}mm</span>
        </p>
        <button
          type="button"
          onClick={() => setQuestionGapMm(25)}
          className="text-[0.65rem] font-semibold text-rose-400 hover:underline"
        >
          sıfırla
        </button>
      </div>
      <input
        type="range"
        min={5}
        max={50}
        value={questionGapMm}
        onChange={(e) => setQuestionGapMm(Number(e.target.value))}
        className="mb-3 w-full accent-sky-500"
      />

      <div className="mb-3 flex gap-1.5">
        {(
          [
            ["dar", "Dar"],
            ["normal", "Normal"],
            ["genis", "Geniş"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => applyMarginPreset(id)}
            className={`flex-1 rounded-lg py-1.5 text-[0.7rem] font-semibold ${
              marginPreset === id ? "bg-sky-500 text-white" : "bg-slate-700 text-slate-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <DashedRule />

      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-200">Soru numaralandırma</span>
        <Toggle on={questionNumberingEnabled} onChange={setQuestionNumberingEnabled} />
      </div>
      <p className="mb-1.5 text-xs text-slate-400">Numara rengi</p>
      <div className="mb-3 flex gap-1.5">
        <button
          type="button"
          onClick={() => setQuestionNumberColorMode("theme")}
          className={`flex-1 rounded-lg py-1.5 text-[0.7rem] font-semibold ${
            questionNumberColorMode === "theme"
              ? "bg-sky-500 text-white"
              : "bg-slate-700 text-slate-400"
          }`}
        >
          Tema rengi
        </button>
        <button
          type="button"
          onClick={() => setQuestionNumberColorMode("black")}
          className={`flex-1 rounded-lg py-1.5 text-[0.7rem] font-semibold ${
            questionNumberColorMode === "black"
              ? "bg-sky-500 text-white"
              : "bg-slate-700 text-slate-400"
          }`}
        >
          Siyah
        </button>
      </div>

      <DashedRule />

      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-200">Sayfa numaralandırma</span>
        <Toggle on={pageNumberingEnabled} onChange={setPageNumberingEnabled} />
      </div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400">Başlangıç sayfa no</span>
        <input
          type="number"
          min={1}
          value={pageNumberStart}
          onChange={(e) => setPageNumberStart(Math.max(1, Number(e.target.value) || 1))}
          className="w-14 rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100"
        />
      </div>
      <p className="mb-1.5 text-xs text-slate-400">Numara biçimi</p>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setPageNumberFormat("plain")}
          className={`flex-1 rounded-lg py-1.5 text-[0.7rem] font-semibold ${
            pageNumberFormat === "plain"
              ? "bg-sky-500 text-white"
              : "bg-slate-700 text-slate-400"
          }`}
        >
          1, 2, 3
        </button>
        <button
          type="button"
          onClick={() => setPageNumberFormat("fraction")}
          className={`flex-1 rounded-lg py-1.5 text-[0.7rem] font-semibold ${
            pageNumberFormat === "fraction"
              ? "bg-sky-500 text-white"
              : "bg-slate-700 text-slate-400"
          }`}
        >
          1/4, 2/4
        </button>
      </div>
    </section>
  );
}

/** Yazılı modülü sol paneli — başlık / sınav / sayfa */
export default function WrittenPaperSettingsSidebar() {
  return (
    <div className="tq-dash-panel tq-dash-panel--scroll space-y-3 p-2">
      <HeaderInfoPanel />
      <ExamSettingsCard />
      <PageStructureCard />
    </div>
  );
}

export type { WrittenStudentFieldKey };
