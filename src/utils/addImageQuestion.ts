import { cropImageToBase64 } from "./pdfClient";
import { percentCropToNormalizedRect, trimCropToContent, type NormRect } from "./cropCoordUtils";
import { addLocalImages, setLocalSourceForQuestion } from "../store/cropLocalStore";
import { useEditorStore } from "../store/editorStore";
import { validateImageFile } from "./imageValidation";

const FULL_PERCENT_CROP = { x: 0, y: 0, width: 100, height: 100 };

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function resolveCropFromSelection(
  percentCrop: { x: number; y: number; width: number; height: number },
  img?: HTMLImageElement | null,
): NormRect {
  let box = percentCropToNormalizedRect(percentCrop);
  const isFullFrame =
    percentCrop.x <= 0.5 &&
    percentCrop.y <= 0.5 &&
    percentCrop.width >= 99.5 &&
    percentCrop.height >= 99.5;

  if (isFullFrame && img) {
    try {
      const trimmed = trimCropToContent(img, FULL_PERCENT_CROP);
      if (trimmed) box = trimmed;
    } catch {
      /* tainted canvas — tam kare kullan */
    }
  }

  return box;
}

export async function addImageAsQuestion(opts: {
  dataUrl: string;
  filename: string;
  crop: NormRect;
  answerKey?: string;
}): Promise<void> {
  const { addQuestionsToWorkingDraft } = useEditorStore.getState();
  const orderIndex = useEditorStore.getState().questions.length;
  const localId = `local-${crypto.randomUUID()}`;
  const questionId = crypto.randomUUID();

  addLocalImages([
    {
      id: localId,
      dataUrl: opts.dataUrl,
      pageCount: 1,
      filename: opts.filename,
    },
  ]);

  const rawBase64 = await cropImageToBase64(opts.dataUrl, opts.crop);
  const imageBase64 = rawBase64.includes(",") ? rawBase64.split(",", 2)[1]! : rawBase64;

  addQuestionsToWorkingDraft([
    {
      id: questionId,
      pdf_id: "",
      page_number: 1,
      crop: opts.crop,
      answer_key: opts.answerKey ?? "",
      order_index: orderIndex,
      content_type: "question",
      remove_background: false,
      image_base64: imageBase64,
      localPdfId: localId,
    },
  ]);

  setLocalSourceForQuestion(questionId, localId, 1);
}

export async function registerLocalImageFile(file: File): Promise<{ id: string; filename: string }> {
  const validation = validateImageFile(file);
  if (!validation.ok) throw new Error(validation.error);

  const dataUrl = await readFileAsDataUrl(file);
  const id = `local-${crypto.randomUUID()}`;

  addLocalImages([
    {
      id,
      dataUrl,
      pageCount: 1,
      filename: file.name,
    },
  ]);

  return { id, filename: file.name };
}
