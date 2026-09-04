import { useNavigate } from "react-router-dom";
import { useEditorStore } from "../../store/editorStore";
import { openGoogleDriveFlow } from "../../utils/openGoogleDriveFlow";

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

const QUICK_ACTIONS = [
  { id: "crop", label: "PDF Kırpma", icon: CropIcon, action: "crop" as const },
  { id: "image", label: "Görsel Ekle", icon: ImagePlusIcon, action: "image" as const },
  { id: "drive", label: "Drive'dan Aç", icon: DriveIcon, action: "drive" as const },
];

export default function EmptyQuestionCanvas() {
  const navigate = useNavigate();
  const setOpenModal = useEditorStore((s) => s.setOpenModal);

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
