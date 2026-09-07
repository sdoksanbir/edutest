import type { ReactNode } from "react";
import type { SidebarTab } from "../../store/editorStore";
import AppTopBarRight from "./AppTopBarRight";
import AppModuleNav from "./AppModuleNav";

type AppTopBarProps = {
  className?: string;
  onModuleSelect?: (tab: SidebarTab) => void;
  extraActions?: ReactNode;
  /** Sol üst (ör. PDF düzenlemede Geri dön) */
  leftSlot?: ReactNode;
  /** PDF düzenleme gibi bağlamlarda sağ menüyü gizle */
  hideRightActions?: boolean;
};

export default function AppTopBar({
  className = "",
  onModuleSelect,
  extraActions,
  leftSlot,
  hideRightActions = false,
}: AppTopBarProps) {
  return (
    <header className={`tq-app-topbar${className ? ` ${className}` : ""}`}>
      <div className={`tq-app-topbar__side${leftSlot ? " tq-app-topbar__side--filled" : ""}`}>
        {leftSlot}
      </div>
      <AppModuleNav className="tq-app-topbar__modules" onModuleSelect={onModuleSelect} />
      <div className="tq-app-topbar__actions">
        {extraActions}
        {!hideRightActions ? <AppTopBarRight bare /> : null}
      </div>
    </header>
  );
}
