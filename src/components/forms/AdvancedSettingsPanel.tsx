import { useState } from "react";
import { useEditorStore } from "../../store/editorStore";
import { PAPER_SIZE_OPTIONS, PAPER_PRESETS_MM } from "../../constants/paperSizes";
import WatermarkModal from "../modals/WatermarkModal";
import CustomMarginsModal, { cmToMm } from "../modals/CustomMarginsModal";
import { detectMarginPreset, MARGIN_PRESETS } from "../../utils/pageStructureHelpers";

export default function AdvancedSettingsPanel() {
  const paperSize = useEditorStore((s) => s.paperSize);
  const setPaperSize = useEditorStore((s) => s.setPaperSize);
  const paperWidthMm = useEditorStore((s) => s.paperWidthMm);
  const paperHeightMm = useEditorStore((s) => s.paperHeightMm);
  const setPaperSizeCustom = useEditorStore((s) => s.setPaperSizeCustom);
  const orientation = useEditorStore((s) => s.orientation);
  const setOrientation = useEditorStore((s) => s.setOrientation);
  const columns = useEditorStore((s) => s.columns);
  const setColumns = useEditorStore((s) => s.setColumns);
  const watermarkEnabled = useEditorStore((s) => s.watermarkEnabled);
  const watermarkSettings = useEditorStore((s) => s.watermarkSettings);
  const themeColor = useEditorStore((s) => s.themeColor);
  const setWatermarkEnabled = useEditorStore((s) => s.setWatermarkEnabled);
  const setWatermarkSettings = useEditorStore((s) => s.setWatermarkSettings);
  const marginTopMm = useEditorStore((s) => s.marginTopMm);
  const marginBottomMm = useEditorStore((s) => s.marginBottomMm);
  const marginLeftMm = useEditorStore((s) => s.marginLeftMm);
  const marginRightMm = useEditorStore((s) => s.marginRightMm);
  const setMargins = useEditorStore((s) => s.setMargins);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const tabBeforeSettings = useEditorStore((s) => s.tabBeforeSettings);
  const [watermarkModalOpen, setWatermarkModalOpen] = useState(false);
  const [marginsModalOpen, setMarginsModalOpen] = useState(false);
  const isCustom = paperSize === "Tam Boyutu Belirleyin";

  const handleWatermarkCheck = (checked: boolean) => {
    if (checked) {
      setWatermarkModalOpen(true);
    } else {
      setWatermarkEnabled(false);
    }
  };

  const handleWatermarkConfirm = (settings: import("../modals/WatermarkModal").WatermarkSettings) => {
    setWatermarkSettings(settings);
    setWatermarkEnabled(true);
    setWatermarkModalOpen(false);
  };

  const marginPreset = detectMarginPreset(
    marginTopMm,
    marginBottomMm,
    marginLeftMm,
    marginRightMm,
  );

  const settingsRowClass =
    "grid min-w-0 items-center gap-x-2 gap-y-1 [grid-template-columns:minmax(5.5rem,7.5rem)_1fr]";

  return (
    <section className="flex min-w-0 flex-col gap-4 text-slate-100">
      <h3 className="tq-sidebar-section-title text-slate-100">Gelişmiş Ayarlar</h3>

      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          className="h-4 w-4 shrink-0 rounded border-slate-500"
          checked={watermarkEnabled}
          onChange={(e) => handleWatermarkCheck(e.target.checked)}
        />
        <span className="tq-row-label">Filigran ekle</span>
        {watermarkEnabled && (
          <button
            type="button"
            onClick={() => setWatermarkModalOpen(true)}
            className="tq-link-quiet ml-1 text-blue-400 underline-offset-2 hover:text-blue-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            (Ayarla)
          </button>
        )}
      </label>
      <WatermarkModal
        isOpen={watermarkModalOpen}
        onClose={() => setWatermarkModalOpen(false)}
        onConfirm={handleWatermarkConfirm}
        initial={watermarkSettings}
        themeColor={themeColor}
      />

      <div className="flex flex-col gap-3">
        <div className={settingsRowClass}>
          <span className="tq-field-label text-slate-300">Kağıt boyutu</span>
          <select value={paperSize} onChange={(e) => setPaperSize(e.target.value)} className="tq-select min-w-0">
            {PAPER_SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        {isCustom && (
          <div className={settingsRowClass}>
            <span className="tq-field-label text-slate-300">En × Boy (mm)</span>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <input
                type="number"
                min={50}
                max={1000}
                value={paperWidthMm}
                onChange={(e) => setPaperSizeCustom(Number(e.target.value) || 210, paperHeightMm)}
                className="tq-input tq-input--number tq-input--narrow"
              />
              <span className="tq-field-label shrink-0 text-slate-400">×</span>
              <input
                type="number"
                min={50}
                max={1000}
                value={paperHeightMm}
                onChange={(e) => setPaperSizeCustom(paperWidthMm, Number(e.target.value) || 297)}
                className="tq-input tq-input--number tq-input--narrow"
              />
              <span className="tq-field-label shrink-0 text-slate-400">mm</span>
            </div>
          </div>
        )}
        <div className={settingsRowClass}>
          <span className="tq-field-label text-slate-300">Yönlendirme</span>
          <select
            value={orientation}
            onChange={(e) => setOrientation(e.target.value as "portrait" | "landscape")}
            className="tq-select min-w-0"
          >
            <option value="portrait">Dikey</option>
            <option value="landscape">Yatay</option>
          </select>
        </div>
        <div className={settingsRowClass}>
          <span className="tq-field-label text-slate-300">Sütun sayısı</span>
          <select
            value={columns}
            onChange={(e) => setColumns(Number(e.target.value))}
            className="tq-select min-w-0"
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="tq-subsection-title">Kenar boşluklarını ayarla</h4>
        <div className="tq-options-card flex gap-3">
          <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded border border-slate-600 bg-gradient-to-b from-sky-900/50 to-slate-700">
            <div
              className="absolute border border-dashed border-slate-500"
              style={{
                top: 4,
                left: 4,
                right: 4,
                bottom: 4,
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div className="flex justify-between gap-2">
                <span className="tq-row-label">Üst:</span>
                <span className="tq-row-label tabular-nums">{(marginTopMm / 10).toLocaleString("tr-TR")} cm</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="tq-row-label">Alt:</span>
                <span className="tq-row-label tabular-nums">{(marginBottomMm / 10).toLocaleString("tr-TR")} cm</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="tq-row-label">Sol:</span>
                <span className="tq-row-label tabular-nums">{(marginLeftMm / 10).toLocaleString("tr-TR")} cm</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="tq-row-label">Sağ:</span>
                <span className="tq-row-label tabular-nums">{(marginRightMm / 10).toLocaleString("tr-TR")} cm</span>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                className="tq-select w-auto min-w-[6.5rem] max-w-full shrink-0"
                value={marginPreset ?? "ozel"}
                onChange={(e) => {
                  if (e.target.value === "ozel") {
                    setMarginsModalOpen(true);
                    return;
                  }
                  const preset = MARGIN_PRESETS.find((p) => p.id === e.target.value);
                  if (preset) {
                    setMargins(preset.topMm, preset.bottomMm, preset.leftMm, preset.rightMm);
                  }
                }}
              >
                {MARGIN_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
                <option value="ozel">Özel</option>
              </select>
              <button
                type="button"
                onClick={() => setMarginsModalOpen(true)}
                className="tq-link-quiet border-b border-dotted border-slate-400 text-slate-300 transition hover:border-slate-300 hover:text-white focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                Özel kenar boşlukları
              </button>
            </div>
          </div>
        </div>
      </div>
      <CustomMarginsModal
        open={marginsModalOpen}
        onClose={() => setMarginsModalOpen(false)}
        onConfirm={(m) => {
          setMargins(cmToMm(m.topCm), cmToMm(m.bottomCm), cmToMm(m.leftCm), cmToMm(m.rightCm));
        }}
        marginTopMm={marginTopMm}
        marginBottomMm={marginBottomMm}
        marginLeftMm={marginLeftMm}
        marginRightMm={marginRightMm}
        pageWidthMm={isCustom ? paperWidthMm : (PAPER_PRESETS_MM[paperSize]?.[0] ?? 210)}
        pageHeightMm={isCustom ? paperHeightMm : (PAPER_PRESETS_MM[paperSize]?.[1] ?? 297)}
      />

      <div>
        <button
          type="button"
          onClick={() => setActiveTab(tabBeforeSettings ?? "test-paper")}
          className="tq-btn-primary min-h-[var(--tq-control-height)] px-8"
        >
          Tamam
        </button>
      </div>
    </section>
  );
}
