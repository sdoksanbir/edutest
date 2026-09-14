import { useNavigate } from "react-router-dom";
import { useEditorStore } from "../../store/editorStore";
import { openGoogleDriveFlow } from "../../utils/openGoogleDriveFlow";
import { loadEtDraftFromComputer } from "../../utils/etDraftFileFlow";

function CropIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M8.5 8.5 20 20" />
      <path d="m20 4-8.5 8.5" />
    </svg>
  );
}

function ImagePlusIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.6" strokeLinecap="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10.5" r="1.5" fill="#94a3b8" stroke="none" />
      <path d="m21 15-5-5L5 21" />
      <path d="M16 5v3" />
      <path d="M14.5 6.5h3" />
    </svg>
  );
}

function DriveIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M8.4 3.6 2.2 14.4h7.2z" />
      <path fill="#FBBC04" d="M2.2 14.4 8.4 20.4h15.4L17.8 14.4z" />
      <path fill="#0F9D58" d="M8.4 20.4h15.4L17.8 14.4H8.4z" />
      <path fill="#EA4335" d="M15.6 3.6 22 14.4h-7.2L8.6 3.6z" />
    </svg>
  );
}

/** Yazılı boş durum — kağıt + kalem */
function WrittenDocPencilIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden>
      <rect x="18" y="12" width="32" height="42" rx="3" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.5" />
      <path d="M24 24h16M24 30h16M24 36h10" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M40 44.5 52.5 22.5a2.2 2.2 0 0 1 3 3L43 47.5l-5.5 1.5 1.5-5.5Z"
        fill="#FDA4AF"
        stroke="#FB7185"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M50.8 24.8 55.2 28" stroke="#FB7185" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

const QUICK_ACTIONS = [
  { id: "crop", label: "PDF Kırpma", icon: CropIcon, action: "crop" as const },
  { id: "image", label: "Görsel Ekle", icon: ImagePlusIcon, action: "image" as const },
  { id: "drive", label: "Drive'dan Aç", icon: DriveIcon, action: "drive" as const },
];

function WrittenEmptyState() {
  const setOpenModal = useEditorStore((s) => s.setOpenModal);

  const handleAddQuestion = () => {
    setOpenModal("question-editor");
  };

  const handleLoadDraft = () => {
    void loadEtDraftFromComputer().catch((e) => {
      window.alert(e instanceof Error ? e.message : "Taslak yüklenemedi");
    });
  };

  return (
    <div className="tq-empty-state tq-empty-state--written">
      <div className="tq-empty-state__icon-wrap tq-empty-state__icon-wrap--written" aria-hidden>
        <WrittenDocPencilIcon />
      </div>
      <h3 className="tq-empty-state__title tq-empty-state__title--written">
        Yazılı sınav sorusu henüz eklenmedi
      </h3>
      <div className="tq-empty-written-actions">
        <button type="button" className="tq-empty-written-btn tq-empty-written-btn--primary" onClick={handleAddQuestion}>
          <span aria-hidden>+</span> Soru Ekle
        </button>
        <button type="button" className="tq-empty-written-btn tq-empty-written-btn--secondary" onClick={handleLoadDraft}>
          Taslak Yükle
        </button>
      </div>
    </div>
  );
}

export default function EmptyQuestionCanvas() {
  const navigate = useNavigate();
  const setOpenModal = useEditorStore((s) => s.setOpenModal);
  const activeTab = useEditorStore((s) => s.activeTab);

  if (activeTab === "written-paper") {
    return <WrittenEmptyState />;
  }

  const handleQuick = (action: (typeof QUICK_ACTIONS)[number]["action"]) => {
    if (action === "crop") navigate("/crop-tool");
    else if (action === "image") setOpenModal("add-image");
    else void openGoogleDriveFlow(setOpenModal);
  };

  return (
    <div className="tq-empty-state">
      <div className="tq-empty-state__icon-wrap" aria-hidden>
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-orange-600"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="3 2" />
          <path d="M8 8h8" />
          <path d="M8 12h8" />
          <path d="M8 16h4" />
        </svg>
      </div>

      <h3 className="tq-empty-state__title">Henüz soru seçilmedi</h3>
      <p className="tq-empty-state__text">
        Kırpma Aracı ile PDF&apos;den soru alanlarını seçin. Seçtiğiniz sorular otomatik olarak buraya
        eklenecek.
      </p>

      <div className="tq-empty-quick-row">
        {QUICK_ACTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className="tq-empty-quick-card"
              onClick={() => handleQuick(item.action)}
            >
              <Icon />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
