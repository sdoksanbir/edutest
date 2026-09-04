import { useEffect, useRef, useState, type RefObject } from "react";
import type {
  ExplanationCaptionAlign,
  ExplanationCaptionBoxCorner,
  ExplanationCaptionBoxWidth,
  QuestionItem,
} from "../../types";
import { useEditorStore } from "../../store/editorStore";

/** Görseldeki ilk satır — yazı ve kutu rengi ortak (11 renk). */
export const CAPTION_COLOR_PRESETS = [
  "#f08c2e",
  "#2fa7d8",
  "#1da466",
  "#a78cc4",
  "#e8cbbf",
  "#f2e316",
  "#b7d7e6",
  "#f34a2f",
  "#bfbfbf",
  "#0f172a",
  "#1e293b",
] as const;

const FONT_UI =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function normHex(h: string): string {
  const s = (h || "").trim().toLowerCase();
  return s.length === 7 && s.startsWith("#") ? s : "";
}

function isPresetColor(hex: string): boolean {
  const n = normHex(hex);
  return n !== "" && CAPTION_COLOR_PRESETS.some((p) => p.toLowerCase() === n);
}

type SwatchRowProps = {
  value: string;
  onChange: (hex: string) => void;
  disabled: boolean;
  label: string;
  inputId: string;
  colorInputRef: RefObject<HTMLInputElement | null>;
};

function PresetColorRow({ value, onChange, disabled, label, inputId, colorInputRef }: SwatchRowProps) {
  const customActive = !isPresetColor(value);
  const safeVal = normHex(value) || "#0f172a";

  return (
    <div className="mb-3">
      <span className="mb-2 block text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        ref={colorInputRef}
        id={inputId}
        type="color"
        value={safeVal}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
      <div className="flex flex-wrap items-center gap-2">
        {CAPTION_COLOR_PRESETS.map((c) => {
          const sel = normHex(value) === c.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              disabled={disabled}
              title={c}
              onClick={() => onChange(c)}
              className={`h-8 w-8 shrink-0 rounded-2xl border-2 shadow-md transition disabled:opacity-50 ${
                sel ? "border-teal-600 ring-2 ring-teal-400 ring-offset-1" : "border-slate-200/90"
              }`}
              style={{ backgroundColor: c }}
            />
          );
        })}
        <button
          type="button"
          disabled={disabled}
          title="Özel renk seç"
          onClick={() => colorInputRef.current?.click()}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border-2 bg-gradient-to-br from-slate-50 to-slate-200 text-lg font-bold leading-none text-teal-700 shadow-md transition disabled:opacity-50 ${
            customActive ? "border-teal-600 ring-2 ring-teal-400 ring-offset-1" : "border-slate-300"
          }`}
        >
          +
        </button>
      </div>
    </div>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  question: QuestionItem;
};

const aligns: { id: ExplanationCaptionAlign; label: string }[] = [
  { id: "left", label: "Sol" },
  { id: "center", label: "Orta" },
  { id: "right", label: "Sağ" },
];

export default function ExplanationCaptionModal({ open, onClose, question }: Props) {
  const setCaption = useEditorStore((s) => s.setQuestionExplanationCaption);
  const textColorInputRef = useRef<HTMLInputElement>(null);
  const boxColorInputRef = useRef<HTMLInputElement>(null);

  const [enabled, setEnabled] = useState(false);
  const [text, setText] = useState("");
  const [align, setAlign] = useState<ExplanationCaptionAlign>("left");
  const [color, setColor] = useState("#0f172a");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [fontPt, setFontPt] = useState(9);
  const [boxEnabled, setBoxEnabled] = useState(false);
  const [boxColor, setBoxColor] = useState("#b7d7e6");
  const [boxCorner, setBoxCorner] = useState<ExplanationCaptionBoxCorner>("rounded");
  const [boxWidth, setBoxWidth] = useState<ExplanationCaptionBoxWidth>("full");

  useEffect(() => {
    if (!open) return;
    setEnabled(question.explanation_caption_enabled === true);
    setText(question.explanation_caption_text ?? "");
    setAlign((question.explanation_caption_align ?? "left") as ExplanationCaptionAlign);
    setColor(question.explanation_caption_color ?? "#0f172a");
    setBold(question.explanation_caption_bold === true);
    setItalic(question.explanation_caption_italic === true);
    const fp = Number(question.explanation_caption_font_pt);
    setFontPt(Number.isFinite(fp) ? Math.min(16, Math.max(6, fp)) : 9);
    setBoxEnabled(question.explanation_caption_box_enabled === true);
    setBoxColor(question.explanation_caption_box_color ?? "#b7d7e6");
    setBoxCorner((question.explanation_caption_box_corner ?? "rounded") as ExplanationCaptionBoxCorner);
    setBoxWidth((question.explanation_caption_box_width ?? "full") as ExplanationCaptionBoxWidth);
  }, [open, question]);

  if (!open) return null;

  const handleSave = () => {
    const fp = Math.min(16, Math.max(6, Math.round(fontPt * 2) / 2));
    void setCaption(question.id, {
      explanation_caption_enabled: enabled,
      explanation_caption_text: text,
      explanation_caption_align: align,
      explanation_caption_placement: "above",
      explanation_caption_side_flow: "horizontal",
      explanation_caption_color: color || "#0f172a",
      explanation_caption_bold: bold,
      explanation_caption_italic: italic,
      explanation_caption_font_pt: fp,
      explanation_caption_box_enabled: boxEnabled,
      explanation_caption_box_color: boxColor || "#b7d7e6",
      explanation_caption_box_corner: boxCorner,
      explanation_caption_box_width: boxWidth,
    });
    onClose();
  };

  const uiFont = { fontFamily: FONT_UI } as const;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[min(90vh,640px)] w-full max-w-md overflow-y-auto rounded-2xl border border-teal-200/80 bg-white p-4 shadow-xl"
        style={uiFont}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="expl-caption-title"
      >
        <h3 id="expl-caption-title" className="mb-3 text-sm font-bold text-slate-900">
          Açıklama metni (PDF)
        </h3>

        <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-teal-400 text-teal-600"
          />
          <span className="font-medium">Açıklama yazısı ekle</span>
        </label>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={1}
          disabled={!enabled}
          className="mb-3 w-full resize-none overflow-x-auto overflow-y-hidden rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-800 disabled:opacity-50"
          style={{ ...uiFont, minHeight: "2.25rem", maxHeight: "2.25rem", lineHeight: "1.25rem" }}
        />

        <PresetColorRow
          label="Yazı rengi — hazır"
          value={color}
          onChange={setColor}
          disabled={!enabled}
          inputId="expl-caption-text-color"
          colorInputRef={textColorInputRef}
        />

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <span className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
              Punto ({fontPt})
            </span>
            <input
              type="range"
              min={6}
              max={16}
              step={0.5}
              value={fontPt}
              onChange={(e) => setFontPt(Number(e.target.value))}
              disabled={!enabled}
              className="mt-2 w-full disabled:opacity-50"
            />
          </div>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={bold}
                onChange={(e) => setBold(e.target.checked)}
                disabled={!enabled}
                className="h-3.5 w-3.5 rounded border-teal-400 text-teal-600 disabled:opacity-50"
              />
              <span className="font-medium">Kalın</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={italic}
                onChange={(e) => setItalic(e.target.checked)}
                disabled={!enabled}
                className="h-3.5 w-3.5 rounded border-teal-400 text-teal-600 disabled:opacity-50"
              />
              <span className="font-medium italic">İtalik</span>
            </label>
          </div>
        </div>

        <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50/90 p-2">
          <label className="mb-2 flex cursor-pointer items-center gap-2 text-xs text-slate-800">
            <input
              type="checkbox"
              checked={boxEnabled}
              onChange={(e) => setBoxEnabled(e.target.checked)}
              disabled={!enabled}
              className="h-3.5 w-3.5 rounded border-teal-400 text-teal-600 disabled:opacity-50"
            />
            <span className="font-semibold">Metni kutu içine al</span>
          </label>
          {boxEnabled ? (
            <>
              <div className="mb-2">
                <span className="mb-1 block text-[0.6rem] font-semibold uppercase tracking-wide text-slate-500">
                  Kutu boyutu
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={!enabled}
                    onClick={() => setBoxWidth("full")}
                    className={`flex-1 rounded-lg px-2 py-1.5 text-[0.65rem] font-semibold disabled:opacity-50 ${
                      boxWidth === "full"
                        ? "bg-teal-600 text-white"
                        : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Satır genişliğinde
                  </button>
                  <button
                    type="button"
                    disabled={!enabled}
                    onClick={() => setBoxWidth("tight")}
                    className={`flex-1 rounded-lg px-2 py-1.5 text-[0.65rem] font-semibold disabled:opacity-50 ${
                      boxWidth === "tight"
                        ? "bg-teal-600 text-white"
                        : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Yazı kadar
                  </button>
                </div>
              </div>
              <PresetColorRow
                label="Kutu rengi — hazır"
                value={boxColor}
                onChange={setBoxColor}
                disabled={!enabled}
                inputId="expl-caption-box-color"
                colorInputRef={boxColorInputRef}
              />
              <span className="mb-1 block text-[0.6rem] font-semibold uppercase tracking-wide text-slate-500">
                Köşeler
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={!enabled}
                  onClick={() => setBoxCorner("rounded")}
                  className={`flex-1 rounded-lg px-2 py-1 text-[0.65rem] font-semibold disabled:opacity-50 ${
                    boxCorner === "rounded" ? "bg-teal-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
                  }`}
                >
                  Oval
                </button>
                <button
                  type="button"
                  disabled={!enabled}
                  onClick={() => setBoxCorner("sharp")}
                  className={`flex-1 rounded-lg px-2 py-1 text-[0.65rem] font-semibold disabled:opacity-50 ${
                    boxCorner === "sharp" ? "bg-teal-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
                  }`}
                >
                  Sivri
                </button>
              </div>
            </>
          ) : null}
        </div>

        <div className="mb-4">
          <span className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
            Satır hizası
          </span>
          <div className="flex flex-wrap gap-1">
            {aligns.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={!enabled}
                onClick={() => setAlign(a.id)}
                className={`rounded-md px-2 py-1 text-[0.65rem] font-semibold disabled:opacity-50 ${
                  align === a.id ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
