/**
 * Yazılı sınav başlığı önizlemesi + başlık altı alan etiketleri.
 * DEĞİŞTİR: PDF’te o sütunun etiket metnini (ör. PUAN → NOT) ayarlar.
 * GİZLE / GÖSTER: Gizleyince o alan PDF başlığında çizilmez; GÖSTER ile tekrar açılır.
 */
import { useEffect, useMemo, useState } from "react";
import {
  WRITTEN_HEADER_MODAL_FIELD_KEYS,
  WRITTEN_HEADER_FIELD_LABELS,
  resolveWrittenHeaderLabel,
  writtenHeaderLabelPdfLeft,
  writtenHeaderLabelPdfPuan,
  type WrittenHeaderFieldKey,
  type WrittenHeaderFieldLabels,
} from "../../constants/writtenHeaderFields";
import { useEditorStore } from "../../store/editorStore";

type WrittenExamTitleModalProps = {
  open: boolean;
  onClose: () => void;
};

const currentYear = new Date().getFullYear();
const nextYear = currentYear + 1;

function pdfLabelPreview(fieldKey: WrittenHeaderFieldKey, labels: WrittenHeaderFieldLabels) {
  if (fieldKey === "puan") return writtenHeaderLabelPdfPuan(labels);
  if (fieldKey === "ad_soyad" || fieldKey === "numara" || fieldKey === "sinif") {
    return writtenHeaderLabelPdfLeft(fieldKey, labels);
  }
  return resolveWrittenHeaderLabel(fieldKey, labels);
}

function TitleFieldColumn({ fieldKey }: { fieldKey: WrittenHeaderFieldKey }) {
  const customLabel = useEditorStore((s) => s.writtenHeaderFieldLabels[fieldKey]);
  const allLabels = useEditorStore((s) => s.writtenHeaderFieldLabels);
  const hidden = useEditorStore((s) => s.writtenHeaderFieldHidden[fieldKey]);
  const setLabel = useEditorStore((s) => s.setWrittenHeaderFieldLabel);
  const setHidden = useEditorStore((s) => s.setWrittenHeaderFieldHidden);
  const [input, setInput] = useState("");

  const templateName = WRITTEN_HEADER_FIELD_LABELS[fieldKey];

  useEffect(() => {
    if (!hidden) setInput(customLabel ?? "");
  }, [customLabel, fieldKey, hidden]);

  const handleDegistir = () => {
    setLabel(fieldKey, input);
  };

  const resolvedPdf = pdfLabelPreview(fieldKey, allLabels);

  return (
    <div className="flex min-w-0 flex-col rounded border border-slate-600 bg-slate-700/50 p-3 text-left">
      <p className="text-center text-xs font-semibold text-slate-400">{templateName}</p>
      <p className="mt-0.5 text-center text-[0.625rem] text-slate-500">varsayılan şablon adı</p>
      {hidden ? (
        <div className="mt-2 min-h-[4.5rem] rounded border border-dashed border-slate-600/80 bg-slate-800/40 py-4 text-center">
          <p className="text-xs text-slate-500">PDF’te gizli</p>
          <button
            type="button"
            onClick={() => setHidden(fieldKey, false)}
            className="mt-2 rounded bg-sky-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-600"
          >
            GÖSTER
          </button>
        </div>
      ) : (
        <>
          <div className="mt-2 space-y-1 border-t border-slate-600/80 pt-2">
            <p className="text-[0.625rem] font-medium uppercase tracking-wide text-slate-500">PDF etiketi</p>
            <p className="min-h-[1.25rem] break-words border-b border-slate-600/60 pb-1 text-xs font-semibold text-slate-100">
              {resolvedPdf.trim() ? resolvedPdf : "\u00a0"}
            </p>
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleDegistir();
              }
            }}
            placeholder="PDF’te görünecek etiket…"
            className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs text-white outline-none ring-blue-500 focus:ring"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleDegistir}
              className="flex-1 rounded bg-emerald-700 px-2 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
            >
              DEĞİŞTİR
            </button>
            <button
              type="button"
              onClick={() => setHidden(fieldKey, true)}
              className="flex-1 rounded bg-slate-600 px-2 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-500"
            >
              GİZLE
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function WrittenExamTitleModal({ open, onClose }: WrittenExamTitleModalProps) {
  const testName = useEditorStore((s) => s.testName);
  const schoolName = useEditorStore((s) => s.schoolName);
  const examType = useEditorStore((s) => s.examType);
  const classSection = useEditorStore((s) => s.classSection);
  const group = useEditorStore((s) => s.group);
  const resetWrittenHeaderToDefaults = useEditorStore((s) => s.resetWrittenHeaderToDefaults);

  const builtTitle = useMemo(() => {
    const parts: string[] = [];
    parts.push(`${currentYear} - ${nextYear} EĞİTİM - ÖĞRETİM YILI`);
    if (schoolName?.trim()) parts.push(schoolName.trim().toUpperCase());
    if (classSection?.trim()) parts.push(`${classSection.trim()} SINIF`);
    if (testName?.trim()) parts.push(`${testName.trim()} DERSİ`);
    if (examType?.trim()) parts.push(examType.trim().toUpperCase());
    parts.push("SORULARI");
    return parts.join(" ");
  }, [schoolName, classSection, testName, examType, group]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-600/80 bg-slate-800 shadow-xl shadow-black/30"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="written-exam-title-modal-title"
      >
        <div
          className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-base font-bold tracking-wide text-white"
          style={{ backgroundColor: "#1E3A5F" }}
        >
          <h3 id="written-exam-title-modal-title" className="min-w-0 flex-1 text-center sm:text-left">
            YAZILI SINAV BAŞLIĞI
          </h3>
          <button
            type="button"
            onClick={() => resetWrittenHeaderToDefaults()}
            className="shrink-0 rounded-lg border border-white/50 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
            title="Tüm PDF etiketlerini, gizlemeleri ve çizgi satırlarını varsayılanlara döndürür"
          >
            Varsayılan
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-lg border border-amber-900/40 bg-amber-950/25 p-3 text-xs leading-relaxed text-amber-100/95">
            <strong className="font-semibold text-amber-50">Nasıl kullanılır:</strong> Üstteki metin okul, sınıf ve ders
            bilgilerinden otomatik oluşur. Her sütunda <strong className="text-amber-50">DEĞİŞTİR</strong> ile PDF’te
            görünecek <strong className="text-amber-50">etiket adını</strong> yazarsınız (ör. PUAN yerine NOT).
            Boş bırakıp DEĞİŞTİR derseniz varsayılan şablon adı kullanılır.
            <strong className="text-amber-50"> GİZLE</strong> ile o alanı kaldırırsınız; PDF’te çizilmez. Gizlenen sütunda{" "}
            <strong className="text-amber-50">GÖSTER</strong> ile yeniden açabilirsiniz. Ortadaki kitapçık harfi grup
            seçiminden gelir; puan kutusu başlık bloğunun sağındadır. Üst çubuktaki{" "}
            <strong className="text-amber-50">Varsayılan</strong> tüm etiketleri, gizlemeleri ve çizgi satırlarını başlangıç
            ayarlarına döndürür.
          </div>

          <div className="min-h-[80px] rounded-lg border border-slate-600 bg-white/5 p-4">
            <p className="text-sm font-bold leading-relaxed break-words whitespace-pre-wrap text-slate-100">
              {builtTitle}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Bu üst başlık form alanlarından oluşur. Altındaki sütunlar PDF’te başlığın hemen altında yer alır (gizlemediğiniz
              sürece).
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {WRITTEN_HEADER_MODAL_FIELD_KEYS.map((key) => (
              <TitleFieldColumn key={key} fieldKey={key} />
            ))}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-700 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-500 bg-slate-700/80 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-600"
            >
              İPTAL
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              TAMAM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
