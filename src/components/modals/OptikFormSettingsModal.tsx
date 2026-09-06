import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useEditorStore } from "../../store/editorStore";
import {
  DEFAULT_OPTICAL_FORM_SETTINGS,
  OPTICAL_PENALTY_RULE_OPTIONS,
  readOpticalFormSettings,
  type OpticalFormBookletType,
  type OpticalFormOptionCount,
  type OpticalFormPenaltyRule,
  type OpticalFormPlacement,
  type OpticalFormSettings,
} from "../../utils/opticalFormSettings";

type Props = {
  open: boolean;
  onClose: () => void;
};

const NAVY = "#183B66";
const RED = "#D32F2F";
const BORDER = "#D9E2EC";
const MUTED = "#66758A";
const TEXT = "#172033";

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.12em]" style={{ color: MUTED }}>
      {children}
    </p>
  );
}

function SegButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition"
      style={
        active
          ? { backgroundColor: NAVY, borderColor: NAVY, color: "#FFFFFF" }
          : { backgroundColor: "#FFFFFF", borderColor: BORDER, color: TEXT }
      }
    >
      {label}
    </button>
  );
}

function SegGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: BORDER, backgroundColor: "#F8FAFC" }}>
      <SectionLabel>{label}</SectionLabel>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <SegButton
            key={opt.value}
            active={value === opt.value}
            label={opt.label}
            onClick={() => onChange(opt.value)}
          />
        ))}
      </div>
    </div>
  );
}

function PenaltyRuleOption({
  active,
  label,
  tag,
  onClick,
}: {
  active: boolean;
  label: string;
  tag?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-xs transition"
      style={
        active
          ? { borderColor: RED, backgroundColor: "#FFF5F5", color: TEXT }
          : { borderColor: BORDER, backgroundColor: "#FFFFFF", color: TEXT }
      }
    >
      <span
        className="h-4 w-4 shrink-0 rounded-sm border"
        style={
          active
            ? { backgroundColor: RED, borderColor: RED }
            : { backgroundColor: "#FFFFFF", borderColor: "#C5D0DC" }
        }
        aria-hidden
      />
      <span className="flex-1">{label}</span>
      {tag ? (
        <span
          className="shrink-0 rounded px-1.5 py-0.5 text-[0.6rem] font-medium"
          style={{ backgroundColor: "#EEF2F6", color: MUTED }}
        >
          {tag}
        </span>
      ) : null}
    </button>
  );
}

export default function OptikFormSettingsModal({ open, onClose }: Props) {
  const themeColor = useEditorStore((s) => s.themeColor);
  const optikFormPlacement = useEditorStore((s) => s.optikFormPlacement);
  const optikFormOptionCount = useEditorStore((s) => s.optikFormOptionCount);
  const optikFormBookletType = useEditorStore((s) => s.optikFormBookletType);
  const optikFormNetRule = useEditorStore((s) => s.optikFormNetRule);
  const optikFormInstructionEnabled = useEditorStore((s) => s.optikFormInstructionEnabled);
  const optikFormInstructionText = useEditorStore((s) => s.optikFormInstructionText);
  const setOpticalFormSettings = useEditorStore((s) => s.setOpticalFormSettings);

  const [local, setLocal] = useState<OpticalFormSettings>(DEFAULT_OPTICAL_FORM_SETTINGS);

  useEffect(() => {
    if (!open) return;
    setLocal(
      readOpticalFormSettings({
        optikFormPlacement,
        optikFormOptionCount,
        optikFormBookletType,
        optikFormNetRule,
        optikFormInstructionEnabled,
        optikFormInstructionText,
      }),
    );
  }, [
    open,
    optikFormPlacement,
    optikFormOptionCount,
    optikFormBookletType,
    optikFormNetRule,
    optikFormInstructionEnabled,
    optikFormInstructionText,
  ]);

  if (!open) return null;

  const handleConfirm = () => {
    setOpticalFormSettings(local);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border bg-white p-5 shadow-xl"
        style={{ borderColor: BORDER }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="optik-settings-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="optik-settings-title" className="text-sm font-bold tracking-wide" style={{ color: NAVY }}>
            OPTİK FORM AYARLARI
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-2 py-0.5 text-xs hover:bg-slate-50"
            style={{ borderColor: BORDER, color: MUTED }}
            aria-label="Kapat"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <SegGroup<OpticalFormPlacement>
            label="Yerleştirme"
            value={local.placement}
            onChange={(v) => setLocal((s) => ({ ...s, placement: v }))}
            options={[
              { value: "compact", label: "Kompakt" },
              { value: "separate_page", label: "Ayrı Sayfa" },
            ]}
          />

          <SegGroup<OpticalFormOptionCount>
            label="Şık Sayısı"
            value={local.optionCount}
            onChange={(v) => setLocal((s) => ({ ...s, optionCount: v }))}
            options={[
              { value: "auto", label: "Otomatik" },
              { value: "4", label: "4 (A–D)" },
              { value: "5", label: "5 (A–E)" },
            ]}
          />

          <SegGroup<OpticalFormBookletType>
            label="Kitapçık Türü"
            value={local.bookletType}
            onChange={(v) => setLocal((s) => ({ ...s, bookletType: v }))}
            options={[
              { value: "none", label: "Yok" },
              { value: "2", label: "2 (A–B)" },
              { value: "3", label: "3 (A–C)" },
              { value: "4", label: "4 (A–D)" },
            ]}
          />

          <div className="rounded-lg border p-3" style={{ borderColor: BORDER, backgroundColor: "#F8FAFC" }}>
            <SectionLabel>Net Hesabı</SectionLabel>
            <div className="space-y-1.5">
              {OPTICAL_PENALTY_RULE_OPTIONS.map((opt) => (
                <PenaltyRuleOption
                  key={opt.value}
                  active={local.penaltyRule === opt.value}
                  label={opt.label}
                  tag={opt.tag}
                  onClick={() =>
                    setLocal((s) => ({ ...s, penaltyRule: opt.value as OpticalFormPenaltyRule }))
                  }
                />
              ))}
            </div>
          </div>

          <div className="rounded-lg border p-3" style={{ borderColor: BORDER, backgroundColor: "#F8FAFC" }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold" style={{ color: TEXT }}>
                  Talimat Satırı
                </p>
                <p className="mt-0.5 text-[0.65rem]" style={{ color: MUTED }}>
                  Kurşun kalem kullanınız…
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={local.showInstructions}
                onClick={() => setLocal((s) => ({ ...s, showInstructions: !s.showInstructions }))}
                className="relative h-5 w-9 shrink-0 rounded-full transition"
                style={{ backgroundColor: local.showInstructions ? NAVY : "#C5D0DC" }}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
                    local.showInstructions ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
            {local.showInstructions ? (
              <textarea
                value={local.instructionText}
                onChange={(e) => setLocal((s) => ({ ...s, instructionText: e.target.value }))}
                rows={2}
                className="mt-2 w-full rounded-lg border px-2.5 py-2 text-xs outline-none focus:border-[#183B66]"
                style={{ borderColor: BORDER, color: TEXT }}
                placeholder={DEFAULT_OPTICAL_FORM_SETTINGS.instructionText}
              />
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            style={{ borderColor: BORDER, color: TEXT }}
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-lg px-4 py-2 text-sm font-bold text-white"
            style={{ backgroundColor: themeColor || NAVY }}
          >
            Tamam
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
