import PdfPreviewPanelRailButton from "./PdfPreviewPanelRailButton";

type PanelSide = "left" | "right";

type Props = {
  side: PanelSide;
  onClose: () => void;
  closeLabel?: string;
};

export default function PdfPreviewPanelCollapseButton({ side, onClose, closeLabel }: Props) {
  const variant = side === "left" ? "edit" : "theme";

  return (
    <PdfPreviewPanelRailButton
      variant={variant}
      mode="collapse"
      onClick={onClose}
      ariaLabel={closeLabel}
    />
  );
}
