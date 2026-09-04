import { useNavigate } from "react-router-dom";
import { useEditorStore } from "../../store/editorStore";
import { openGoogleDriveFlow } from "../../utils/openGoogleDriveFlow";
import { loadEtDraftFromComputer, saveEtDraftToComputer } from "../../utils/etDraftFileFlow";

function BankIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8" />
      <path d="M8 11h6" />
    </svg>
  );
}

function CropIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M8.5 8.5 20 20" />
      <path d="m20 4-8.5 8.5" />
    </svg>
  );
}

function EditorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function ImagePlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10.5" r="1.5" fill="currentColor" stroke="none" />
      <path d="m21 15-5-5L5 21" />
      <path d="M16 5v3" />
      <path d="M14.5 6.5h3" />
    </svg>
  );
}

function DraftPickIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  );
}

function DriveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M8.4 3.6 2.2 14.4h7.2z" />
      <path fill="#FBBC04" d="M2.2 14.4 8.4 20.4h15.4L17.8 14.4z" />
      <path fill="#0F9D58" d="M8.4 20.4h15.4L17.8 14.4H8.4z" />
      <path fill="#EA4335" d="M15.6 3.6 22 14.4h-7.2L8.6 3.6z" />
    </svg>
  );
}

type ActionTone = "blue" | "orange" | "fuchsia" | "emerald" | "amber" | "teal" | "sky" | "violet";

const ACTIONS: Array<
  | {
      label: string;
      shortLabel: string;
      tone: ActionTone;
      icon: typeof BankIcon;
      route: string;
      wide?: boolean;
    }
  | {
      label: string;
      shortLabel: string;
      tone: ActionTone;
      icon: typeof BankIcon;
      modal: "pdf-bank" | "question-editor" | "add-image" | "save-draft" | "load-draft" | "pick-draft-questions" | "google-drive";
      wide?: boolean;
      brandIcon?: boolean;
    }
> = [
  { label: "Soru Bankasından Seçin", shortLabel: "Soru Bankası", tone: "blue", icon: BankIcon, route: "/soru-bankasi" },
  {
    label: "Taslaktan Soru Seç",
    shortLabel: "Taslaktan Seç",
    tone: "violet",
    icon: DraftPickIcon,
    modal: "pick-draft-questions",
  },
  { label: "Kırpma Aracı", shortLabel: "Kırpma Aracı", tone: "orange", icon: CropIcon, route: "/crop-tool" },
  { label: "Görsel Ekle", shortLabel: "Görsel Ekle", tone: "teal", icon: ImagePlusIcon, modal: "add-image" },
  {
    label: "Google Drive'dan Ekle",
    shortLabel: "Drive'dan Ekle",
    tone: "sky",
    icon: DriveIcon,
    modal: "google-drive",
    brandIcon: true,
  },
  { label: "Soru Editörü", shortLabel: "Soru Editörü", tone: "fuchsia", icon: EditorIcon, modal: "question-editor" },
  { label: "Taslağı Kaydet", shortLabel: "Taslağı Kaydet", tone: "emerald", icon: SaveIcon, modal: "save-draft" },
  {
    label: "Taslağı Geri Yükle",
    shortLabel: "Geri Yükle",
    tone: "amber",
    icon: RestoreIcon,
    modal: "load-draft",
  },
];

export default function SidebarActionButtons() {
  const navigate = useNavigate();
  const setOpenModal = useEditorStore((s) => s.setOpenModal);

  return (
    <section className="tq-dash-section tq-dash-section--actions" aria-label="Hızlı işlemler">
      <div className="tq-dash-section-heading">
        <span className="tq-dash-section-heading__line" aria-hidden />
        <h3 className="tq-dash-section-heading__title">Hızlı İşlemler</h3>
        <span className="tq-dash-section-heading__line tq-dash-section-heading__line--right" aria-hidden />
      </div>
      <div className="tq-dash-action-grid">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              className={`tq-dash-action-card tq-dash-action-card--${action.tone}${action.wide ? " tq-dash-action-card--wide" : ""}`}
              title={action.label}
              onClick={() => {
                if ("route" in action) navigate(action.route);
                else if (action.modal === "google-drive") void openGoogleDriveFlow(setOpenModal);
                else if (action.modal === "save-draft") {
                  void saveEtDraftToComputer().catch((e) => {
                    window.alert(e instanceof Error ? e.message : "Taslak kaydedilemedi");
                  });
                } else if (action.modal === "load-draft") {
                  void loadEtDraftFromComputer().catch((e) => {
                    window.alert(e instanceof Error ? e.message : "Taslak yüklenemedi");
                  });
                } else setOpenModal(action.modal);
              }}
            >
              <span
                className={`tq-dash-action-card__icon${"brandIcon" in action && action.brandIcon ? " tq-dash-action-card__icon--brand" : ""}`}
                aria-hidden
              >
                <Icon />
              </span>
              <span className="tq-dash-action-card__label">{action.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
