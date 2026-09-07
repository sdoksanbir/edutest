import { useEffect, useState } from "react";
import { useEditorStore } from "../../store/editorStore";
import SidebarPencilButton from "./SidebarPencilButton";
import AddExamTypeModal from "../modals/AddExamTypeModal";
import PdfPreviewModal from "../modals/PdfPreviewModal";
import TeacherNameModal from "../modals/TeacherNameModal";
import WrittenExamTitleModal from "../modals/WrittenExamTitleModal";

const EXAM_TYPES = [
  "1. Dönem 1. Yazılı",
  "1. Dönem 2. Yazılı",
  "2. Dönem 1. Yazılı",
  "2. Dönem 2. Yazılı",
  "1. Dönem 1. Çoktan Seçmeli Test Sınavı",
  "1. Dönem 2. Çoktan Seçmeli Test Sınavı",
  "2. Dönem 1. Çoktan Seçmeli Test Sınavı",
  "2. Dönem 2. Çoktan Seçmeli Test Sınavı",
] as const;

const ADD_NEW_VALUE = "__add_new__";

const GROUP_OPTIONS = ["Grup Yok", "Grup A", "Grup B", "Grup C"];

const LEGACY_GROUP_VALUES = new Set(["2 Gruplu (A - B)", "3 Gruplu (A - B - C)"]);

export default function WrittenPaperForm() {
  const testName = useEditorStore((s) => s.testName);
  const schoolName = useEditorStore((s) => s.schoolName);
  const examType = useEditorStore((s) => s.examType);
  const classSection = useEditorStore((s) => s.classSection);
  const group = useEditorStore((s) => s.group);
  const writtenPaperOptions = useEditorStore((s) => s.writtenPaperOptions);
  const questions = useEditorStore((s) => s.questions);

  const setTestName = useEditorStore((s) => s.setTestName);
  const setSchoolName = useEditorStore((s) => s.setSchoolName);
  const setExamType = useEditorStore((s) => s.setExamType);
  const setClassSection = useEditorStore((s) => s.setClassSection);
  const setGroup = useEditorStore((s) => s.setGroup);
  const addCustomExamType = useEditorStore((s) => s.addCustomExamType);
  const customExamTypes = useEditorStore((s) => s.customExamTypes);
  const toggleWrittenPaperOption = useEditorStore((s) => s.toggleWrittenPaperOption);

  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (LEGACY_GROUP_VALUES.has(group)) setGroup("Grup Yok");
  }, [group, setGroup]);

  const handlePrepareClick = () => {
    if (questions.length === 0) {
      setError("PDF oluşturmak için en az bir soru gerekli");
      return;
    }
    setError(null);
    setShowPreview(true);
  };

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <label className="tq-field">
        <span className="tq-field-label">Ders</span>
        <input
          value={testName}
          onChange={(e) => setTestName(e.target.value)}
          placeholder="MATEMATİK"
          className="tq-input"
        />
      </label>

      <label className="tq-field">
        <span className="tq-field-label">Okul Adı</span>
        <input
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          placeholder="Okul Adı"
          className="tq-input"
        />
      </label>

      <label className="tq-field">
        <span className="tq-field-label">Sınav tipi</span>
        <select
          value={examType}
          onChange={(e) => {
            const val = e.target.value;
            if (val === ADD_NEW_VALUE) {
              setShowAddExamModal(true);
              return;
            }
            setExamType(val);
          }}
          className="tq-select"
        >
          {EXAM_TYPES.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
          {customExamTypes.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
          <option value={ADD_NEW_VALUE}>+ Başka Sınav Ekle</option>
        </select>
      </label>

      <AddExamTypeModal
        open={showAddExamModal}
        onClose={() => setShowAddExamModal(false)}
        onConfirm={(name) => {
          addCustomExamType(name);
          setShowAddExamModal(false);
        }}
      />

      <div className="tq-field-grid-2">
        <label className="tq-field">
          <span className="tq-field-label">Sınıf/Şube</span>
          <input
            value={classSection}
            onChange={(e) => setClassSection(e.target.value)}
            placeholder="Sınıf/Şube"
            className="tq-input"
          />
        </label>
        <label className="tq-field">
          <span className="tq-field-label">Grup</span>
          <select value={group} onChange={(e) => setGroup(e.target.value)} className="tq-select">
            {GROUP_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="tq-options-card space-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={writtenPaperOptions.addTeacherName}
              onChange={() => toggleWrittenPaperOption("addTeacherName")}
              className="h-4 w-4 shrink-0 rounded border-slate-500"
            />
            <span className="tq-row-label text-teal-200">Kağıda öğretmen ismi ekle</span>
          </label>
          <SidebarPencilButton onClick={() => setShowTeacherModal(true)} label="Öğretmen bilgisini düzenle" />
        </div>
      </div>

      <TeacherNameModal open={showTeacherModal} onClose={() => setShowTeacherModal(false)} />
      <WrittenExamTitleModal open={showTitleModal} onClose={() => setShowTitleModal(false)} />
      <PdfPreviewModal isOpen={showPreview} onClose={() => setShowPreview(false)} variant="written" />

      <div className="flex min-w-0 items-center gap-2">
        <svg className="h-4 w-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span className="tq-row-label min-w-0 flex-1">Sınav başlığı için önizleme göster</span>
        <SidebarPencilButton onClick={() => setShowTitleModal(true)} label="Başlık önizlemesini düzenle" />
      </div>

      {error && <p className="tq-helper-error">{error}</p>}

      <button
        type="button"
        onClick={handlePrepareClick}
        disabled={questions.length === 0}
        className="tq-sidebar-cta tq-sidebar-cta--prepare"
      >
        Kağıdı Hazırla
      </button>
    </section>
  );
}
