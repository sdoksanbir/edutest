import { useEditorStore, type SidebarTab } from "../../store/editorStore";

function TestModuleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </svg>
  );
}

function WrittenModuleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function FascicleModuleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8" />
      <path d="M8 11h5" />
    </svg>
  );
}

function TrialModuleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

type ModuleTone = "test" | "written" | "fasikul" | "trial";

export const APP_MODULES: Array<{
  id: SidebarTab;
  label: string;
  shortLabel: string;
  icon: typeof TestModuleIcon;
  tone: ModuleTone;
}> = [
  { id: "test-paper", label: "Test Modülü", shortLabel: "Test", icon: TestModuleIcon, tone: "test" },
  { id: "written-paper", label: "Yazılı Modülü", shortLabel: "Yazılı", icon: WrittenModuleIcon, tone: "written" },
  { id: "fasikul-paper", label: "Fasikül Modülü", shortLabel: "Fasikül", icon: FascicleModuleIcon, tone: "fasikul" },
  { id: "trial-exam", label: "Deneme Modülü", shortLabel: "Deneme", icon: TrialModuleIcon, tone: "trial" },
];

type AppModuleNavProps = {
  className?: string;
  compact?: boolean;
  onModuleSelect?: (tab: SidebarTab) => void;
};

export default function AppModuleNav({ className = "", compact = false, onModuleSelect }: AppModuleNavProps) {
  const activeTab = useEditorStore((s) => s.activeTab);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);

  return (
    <nav className={className} aria-label="Hazırlık modülü">
      {APP_MODULES.map((module) => {
        const Icon = module.icon;
        const isActive = activeTab === module.id;
        return (
          <button
            key={module.id}
            type="button"
            className={`tq-app-topbar__module tq-app-topbar__module--${module.tone}${isActive ? " tq-app-topbar__module--active" : ""}`}
            aria-current={isActive ? "page" : undefined}
            title={module.label}
            onClick={() => {
              setActiveTab(module.id);
              onModuleSelect?.(module.id);
            }}
          >
            <Icon />
            <span>{compact ? module.shortLabel : module.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
