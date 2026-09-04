import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactCrop, { type Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import ModalShell from "./ModalShell";
import InlineAnswerBar from "../crop/InlineAnswerBar";
import { getChoiceCount } from "../../store/cropLocalStore";
import {
  addImageAsQuestion,
  readFileAsDataUrl,
  registerLocalImageFile,
  resolveCropFromSelection,
} from "../../utils/addImageQuestion";
import { validateImageFile } from "../../utils/imageValidation";
import type { AnswerOption } from "../../types";

const FULL_CROP: Crop = { unit: "%", x: 0, y: 0, width: 100, height: 100 };

type AddMode = "quick" | "crop";

export default function AddImageModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const pendingCropRef = useRef(FULL_CROP);
  const pendingModeRef = useRef<AddMode>("quick");

  const [step, setStep] = useState<"choose" | "quick">("choose");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [crop, setCrop] = useState<Crop>(FULL_CROP);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<AnswerOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openFilePicker = (mode: AddMode) => {
    pendingModeRef.current = mode;
    setError(null);
    fileInputRef.current?.click();
  };

  const resetToChoose = () => {
    setStep("choose");
    setDataUrl(null);
    setFilename("");
    setCrop(FULL_CROP);
    setImgLoaded(false);
    setSelectedAnswer(null);
    setError(null);
    pendingCropRef.current = FULL_CROP;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    const mode = pendingModeRef.current;

    if (mode === "crop") {
      setBusy(true);
      setError(null);
      try {
        const { id } = await registerLocalImageFile(file);
        onClose();
        navigate("/crop-tool", { state: { localPdfId: id, pageNumber: 1 } });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Görsel yüklenemedi.");
      } finally {
        setBusy(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      return;
    }

    try {
      const url = await readFileAsDataUrl(file);
      setDataUrl(url);
      setFilename(file.name);
      setCrop(FULL_CROP);
      setImgLoaded(false);
      pendingCropRef.current = FULL_CROP;
      setError(null);
      setStep("quick");
    } catch {
      setError("Görsel okunamadı.");
    }
  };

  const handleAdd = useCallback(async () => {
    if (!dataUrl || busy) return;

    const percentCrop =
      crop.unit === "%" && crop.width > 0
        ? { x: crop.x, y: crop.y, width: crop.width, height: crop.height }
        : pendingCropRef.current;
    if (percentCrop.width <= 0 || percentCrop.height <= 0) {
      setError("Geçerli bir kırpma alanı seçin.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const normCrop = resolveCropFromSelection(percentCrop, imgRef.current);
      await addImageAsQuestion({
        dataUrl,
        filename,
        crop: normCrop,
        answerKey: selectedAnswer ?? "",
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Görsel eklenemedi.");
    } finally {
      setBusy(false);
    }
  }, [busy, crop, dataUrl, filename, onClose, selectedAnswer]);

  const choiceCount = getChoiceCount() ?? 5;

  return (
    <ModalShell title="Görsel Ekle" onClose={onClose} wide>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {step === "choose" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={busy}
            className="tq-add-image-option tq-add-image-option--quick"
            onClick={() => openFilePicker("quick")}
          >
            <span className="tq-add-image-option__icon" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m21 15-5-5L5 21" />
                <path d="M16 5v3" />
                <path d="M14.5 6.5h3" />
              </svg>
            </span>
            <span className="tq-add-image-option__title">Soru Olarak Ekle</span>
            <span className="tq-add-image-option__text">
              Görseli seçin; gerekirse hızlıca kırpın ve doğrudan soru listesine ekleyin.
            </span>
          </button>

          <button
            type="button"
            disabled={busy}
            className="tq-add-image-option tq-add-image-option--crop"
            onClick={() => openFilePicker("crop")}
          >
            <span className="tq-add-image-option__icon" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="6" cy="6" r="3" />
                <circle cx="6" cy="18" r="3" />
                <path d="M8.5 8.5 20 20" />
                <path d="m20 4-8.5 8.5" />
              </svg>
            </span>
            <span className="tq-add-image-option__title">Kırparak Ekle</span>
            <span className="tq-add-image-option__text">
              Görseli yükleyin ve Kırpma Aracı&apos;nda detaylı seçim yaparak soru ekleyin.
            </span>
          </button>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">
            Tüm görseli eklemek için doğrudan <strong>Soru Olarak Ekle</strong>&apos;ye basın. Sadece bir bölüm
            gerekiyorsa alanı sürükleyerek kırpın.
          </p>

          <div className="mb-3 max-h-[50vh] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
            <ReactCrop
              crop={crop}
              onChange={(next) => setCrop(next)}
              onComplete={(_pixelCrop, percentCrop) => {
                pendingCropRef.current = percentCrop;
              }}
            >
              <img
                ref={imgRef}
                src={dataUrl!}
                alt="Seçilen görsel"
                className="max-h-[44vh] w-auto max-w-full"
                onLoad={() => setImgLoaded(true)}
              />
            </ReactCrop>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Cevap (isteğe bağlı):</span>
            <InlineAnswerBar
              selectedAnswer={selectedAnswer}
              onSelect={setSelectedAnswer}
              onConfirm={handleAdd}
              choiceCount={choiceCount}
              compact
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !imgLoaded}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
              onClick={handleAdd}
            >
              {busy ? "Ekleniyor…" : "Soru Olarak Ekle"}
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              onClick={resetToChoose}
            >
              Geri
            </button>
          </div>
        </>
      )}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {busy && step === "choose" ? <p className="mt-3 text-sm text-slate-500">Görsel yükleniyor…</p> : null}
    </ModalShell>
  );
}
