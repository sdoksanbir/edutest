import { useState } from "react";
import { useEditorStore } from "../../store/editorStore";
import ThemeSelectModal from "../modals/ThemeSelectModal";

export default function ThemeButton() {
  const [open, setOpen] = useState(false);
  const headerStyleId = useEditorStore((state) => state.headerStyleId);
  const themeColor = useEditorStore((state) => state.themeColor);
  const options = useEditorStore((state) => state.options);
  const setHeaderStyleId = useEditorStore((state) => state.setHeaderStyleId);
  const setThemeColor = useEditorStore((state) => state.setThemeColor);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="tq-sidebar-cta tq-sidebar-cta--theme shadow-sm">
        Tema Seç
      </button>
      <ThemeSelectModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={(styleId, color) => {
          setHeaderStyleId(styleId);
          setThemeColor(color);
          setOpen(false);
        }}
        currentStyleId={headerStyleId}
        currentColor={themeColor}
        useDescriptionBox={options.includeDescription}
      />
    </>
  );
}
