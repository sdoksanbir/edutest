import { ChevronsDown, ChevronsUp } from "lucide-react";
import { usePdfPreviewUi } from "./PdfPreviewUiThemeContext";

type PanelSide = "left" | "right";

type Props = {
  title: string;
  subtitle?: string;
  side: PanelSide;
  onCollapseAll?: () => void;
  onExpandAll?: () => void;
};

export default function PdfPreviewPanelHeader({
  title,
  subtitle,
  side,
  onCollapseAll,
  onExpandAll,
}: Props) {
  const { tokens: t } = usePdfPreviewUi();

  return (
    <div className={`pdf-preview-panel-header pdf-preview-panel-header--${side} shrink-0`}>
      <div className="pdf-preview-panel-header__inner">
        {onExpandAll ? (
          <button
            type="button"
            className="pdf-preview-panel-header__collapse-all pdf-preview-panel-header__collapse-all--left"
            onClick={onExpandAll}
            aria-label="Tüm bölümleri aç"
            title="Tüm bölümleri aç"
          >
            <ChevronsDown size={12} strokeWidth={2.5} aria-hidden />
          </button>
        ) : null}
        <div className="pdf-preview-panel-header__center">
          <h2 className="pdf-preview-panel-header__title">{title}</h2>
          {subtitle ? <p className={`pdf-preview-panel-header__subtitle ${t.hint}`}>{subtitle}</p> : null}
        </div>
        {onCollapseAll ? (
          <button
            type="button"
            className="pdf-preview-panel-header__collapse-all pdf-preview-panel-header__collapse-all--right"
            onClick={onCollapseAll}
            aria-label="Tüm bölümleri kapat"
            title="Tüm bölümleri kapat"
          >
            <ChevronsUp size={12} strokeWidth={2.5} aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
