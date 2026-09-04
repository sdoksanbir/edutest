/**
 * Filigran Ekle modalı - Metin veya Görsel filigran ayarları.
 * PDF önizleme ve export'a uygulanır.
 */
import { useEffect, useRef, useState } from "react";

export type WatermarkMode = "text" | "image";

export type WatermarkSettings = {
  mode: WatermarkMode;
  text: string;
  textOpacityPct: number;
  textSizePct: number;
  textAngleDeg: number;
  textColor: string;
  imageBase64: string | null;
  imageOpacityPct: number;
  imageSizePct: number;
};

const DEFAULT_TEXT: WatermarkSettings = {
  mode: "text",
  text: "",
  textOpacityPct: 20,
  textSizePct: 90,
  textAngleDeg: 45,
  textColor: "#1E88E5",  // Varsayılan tema rengi
  imageBase64: null,
  imageOpacityPct: 15,
  imageSizePct: 50,
};

type WatermarkModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (settings: WatermarkSettings) => void;
  initial?: Partial<WatermarkSettings>;
  /** Sayfa tema rengi - filigran rengi varsayılanı */
  themeColor?: string;
};

export default function WatermarkModal({
  isOpen,
  onClose,
  onConfirm,
  initial,
  themeColor = "#1E88E5",
}: WatermarkModalProps) {
  const [mode, setMode] = useState<WatermarkMode>("text");
  const [text, setText] = useState("");
  const [textOpacityPct, setTextOpacityPct] = useState(20);
  const [textSizePct, setTextSizePct] = useState(90);
  const [textAngleDeg, setTextAngleDeg] = useState(45);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageOpacityPct, setImageOpacityPct] = useState(15);
  const [imageSizePct, setImageSizePct] = useState(50);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const s = { ...DEFAULT_TEXT, ...initial };
    setMode(s.mode);
    setText(s.text);
    setTextOpacityPct(s.textOpacityPct);
    setTextSizePct(s.textSizePct);
    setTextAngleDeg(s.textAngleDeg);
    setImageBase64(s.imageBase64);
    setImageOpacityPct(s.imageOpacityPct);
    setImageSizePct(s.imageSizePct);
  }, [isOpen, initial, themeColor]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      setImageBase64(data.replace(/^data:[^;]+;base64,/, ""));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleConfirm = () => {
    if (mode === "text" && !text.trim()) return;
    if (mode === "image" && !imageBase64) return;
    onConfirm({
      mode,
      text: text.trim(),
      textOpacityPct,
      textSizePct,
      textAngleDeg,
      textColor: themeColor,
      imageBase64,
      imageOpacityPct,
      imageSizePct,
    });
    onClose();
  };

  if (!isOpen) return null;

  const textActive = mode === "text";
  const imageActive = mode === "image";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-slate-800 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-5 text-center text-base font-bold text-slate-100">
          FİLİGRAN EKLE
        </h3>

        <div className="space-y-5">
          {/* Metin / Görsel seçimi */}
          <div className="flex gap-4">
            <label
              className={`flex cursor-pointer items-center gap-2 text-sm ${
                textActive ? "text-blue-400" : "text-slate-400"
              }`}
            >
              <input
                type="radio"
                name="watermark-mode"
                checked={textActive}
                onChange={() => setMode("text")}
                className="h-4 w-4"
              />
              Metin Filigranı
            </label>
            <label
              className={`flex cursor-pointer items-center gap-2 text-sm ${
                imageActive ? "text-blue-400" : "text-slate-400"
              }`}
            >
              <input
                type="radio"
                name="watermark-mode"
                checked={imageActive}
                onChange={() => setMode("image")}
                className="h-4 w-4"
              />
              Görsel Filigran
            </label>
          </div>

          {/* Metin Filigranı */}
          <div className={`space-y-4 ${!textActive ? "opacity-50 pointer-events-none" : ""}`}>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Basılı filigran için yazı belirleyin"
              className="w-full rounded-lg border border-blue-500/60 bg-slate-700/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Opaklık: %{textOpacityPct}
                </label>
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={textOpacityPct}
                  onChange={(e) => setTextOpacityPct(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Büyüklük: %{textSizePct}
                </label>
                <input
                  type="range"
                  min={20}
                  max={150}
                  value={textSizePct}
                  onChange={(e) => setTextSizePct(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Açı: {textAngleDeg}°
                </label>
                <input
                  type="range"
                  min={0}
                  max={90}
                  value={textAngleDeg}
                  onChange={(e) => setTextAngleDeg(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Renk:</label>
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-12 rounded border border-slate-600 shrink-0"
                    style={{ backgroundColor: themeColor }}
                  />
                  <span className="text-xs text-slate-500">Test teması</span>
                </div>
              </div>
            </div>
          </div>

          {/* Görsel Filigran */}
          <div className={`space-y-4 ${!imageActive ? "opacity-50 pointer-events-none" : ""}`}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-lg border border-dashed border-slate-500 bg-slate-700/50 px-3 py-2 text-sm text-slate-400 hover:border-blue-500 hover:text-slate-200"
            >
              {imageBase64 ? "Görsel seçildi ✓" : "Görsel seçin"}
            </button>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Opaklık: %{imageOpacityPct}
                </label>
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={imageOpacityPct}
                  onChange={(e) => setImageOpacityPct(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Büyüklük: %{imageSizePct}
                </label>
                <input
                  type="range"
                  min={20}
                  max={150}
                  value={imageSizePct}
                  onChange={(e) => setImageSizePct(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-500 bg-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-600"
          >
            İPTAL
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={(mode === "text" && !text.trim()) || (mode === "image" && !imageBase64)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            TAMAM
          </button>
        </div>
      </div>
    </div>
  );
}
