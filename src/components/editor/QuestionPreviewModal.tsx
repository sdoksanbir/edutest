import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { QuestionContentType, QuestionImageTextOverlay, QuestionItem } from "../../types";
import { useEditorStore } from "../../store/editorStore";
import { getLocalSource, getLocalSourceForQuestion } from "../../store/cropLocalStore";
import { useQuestionImageSrc } from "../../hooks/useQuestionImageSrc";
import { plainTextToCanvasSync } from "../../utils/plainTextPreviewCanvas";
import { suggestFontPxFromSelection } from "../../utils/questionImageFontEstimate";
import ExplanationCaptionModal from "./ExplanationCaptionModal";
import QuestionImageMathTextModal from "./QuestionImageMathTextModal";

type QuestionPreviewModalProps = {
  question: QuestionItem;
  isOpen: boolean;
  onClose: () => void;
};

const ERASER_SIZE_MIN = 8;
const ERASER_SIZE_MAX = 80;
const ERASER_SIZE_DEFAULT = 24;

const ERASER_CURSOR =
  "url('data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e293b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20H7L3 16a2 2 0 0 1 0-2.83l11.17-11.17a2 2 0 0 1 2.83 0L20 10"/><rect x="2" y="14" width="6" height="6" rx="1"/></svg>'
  ) +
  "') 4 20, crosshair";

const REMOVE_BG_THRESHOLD = 220;

export default function QuestionPreviewModal({
  question,
  isOpen,
  onClose,
}: QuestionPreviewModalProps) {
  const navigate = useNavigate();
  const updateRemoveBackground = useEditorStore((s) => s.updateRemoveBackground);
  const flattenQuestionImageToSingleLayer = useEditorStore((s) => s.flattenQuestionImageToSingleLayer);
  const addQuestionImageTextOverlay = useEditorStore((s) => s.addQuestionImageTextOverlay);
  const updateQuestionImageTextOverlay = useEditorStore((s) => s.updateQuestionImageTextOverlay);
  const removeQuestionImageTextOverlay = useEditorStore((s) => s.removeQuestionImageTextOverlay);
  const recomposeQuestionImage = useEditorStore((s) => s.recomposeQuestionImage);
  const setQuestionContentType = useEditorStore((s) => s.setQuestionContentType);
  const latestQuestion =
    useEditorStore((s) => s.questions.find((x) => x.id === question.id)) ?? question;
  const imageSrc = useQuestionImageSrc(latestQuestion);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [eraserActive, setEraserActive] = useState(false);
  const [eraserSize, setEraserSize] = useState(ERASER_SIZE_DEFAULT);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number }>({ w: 400, h: 300 });
  const naturalSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const [canUndoRemoveBg, setCanUndoRemoveBg] = useState(false);
  const imageBeforeRemoveBgRef = useRef<string | null>(null);
  const [captionModalOpen, setCaptionModalOpen] = useState(false);
  const [textToolActive, setTextToolActive] = useState(false);
  const [textDrag, setTextDrag] = useState<{
    x0: number;
    y0: number;
    x: number;
    y: number;
  } | null>(null);
  const [mathModalOpen, setMathModalOpen] = useState(false);
  const [pendingTextRect, setPendingTextRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [textModalSuggestedPx, setTextModalSuggestedPx] = useState(18);
  const [editingOverlayId, setEditingOverlayId] = useState<string | null>(null);
  const [editOverlayText, setEditOverlayText] = useState("");
  const [editOverlayFontPx, setEditOverlayFontPx] = useState(18);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  /** Taşıma sırasında yalnızca görsel; bırakınca store + tek recompose. */
  const [overlayDragLive, setOverlayDragLive] = useState<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const overlayDragRafRef = useRef<number | null>(null);
  const overlayDragPendingRef = useRef<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [textModalDraft, setTextModalDraft] = useState<{ text: string; fontPx: number } | null>(null);
  const [liveTextPreview, setLiveTextPreview] = useState<{
    url: string;
    kw: number;
    kh: number;
  } | null>(null);
  const textPreviewRafRef = useRef<number | null>(null);

  const isExplanation = (latestQuestion.content_type ?? "question") === "explanation";

  const textPreviewRect = useMemo(() => {
    if (pendingTextRect) return pendingTextRect;
    if (editingOverlayId) {
      const ov = latestQuestion.image_text_overlays?.find((o) => o.id === editingOverlayId);
      if (ov) return { x: ov.x, y: ov.y, w: ov.w, h: ov.h };
    }
    return null;
  }, [pendingTextRect, editingOverlayId, latestQuestion.image_text_overlays]);

  const onTextModalLiveDraft = useCallback((d: { text: string; fontPx: number }) => {
    setTextModalDraft(d);
  }, []);

  const setContentType = (t: QuestionContentType) => {
    void setQuestionContentType(latestQuestion.id, t);
  };

  const loadImageToCanvas = useCallback(() => {
    if (!imageSrc) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const img = new Image();
    if (!imageSrc.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      const cw = img.naturalWidth;
      const ch = img.naturalHeight;
      naturalSizeRef.current = { w: cw, h: ch };

      const maxW = Math.min(container.clientWidth || 800, 900);
      const maxH = Math.min(window.innerHeight * 0.7, 700);
      const scale = Math.min(maxW / cw, maxH / ch, 1);
      setDisplaySize({ w: cw * scale, h: ch * scale });

      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0);
      setImageLoaded(true);
    };
    img.onerror = () => setImageLoaded(false);
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    if (isOpen) {
      setImageLoaded(false);
      setEraserActive(false);
      setEraserSize(ERASER_SIZE_DEFAULT);
      setCanUndoRemoveBg(false);
      imageBeforeRemoveBgRef.current = null;
      setCaptionModalOpen(false);
      setTextToolActive(false);
      setTextDrag(null);
      setMathModalOpen(false);
      setPendingTextRect(null);
      setTextModalSuggestedPx(18);
      setEditingOverlayId(null);
      setEditOverlayText("");
      setEditOverlayFontPx(18);
      setSelectedOverlayId(null);
      setOverlayDragLive(null);
      overlayDragPendingRef.current = null;
      if (overlayDragRafRef.current != null) {
        cancelAnimationFrame(overlayDragRafRef.current);
        overlayDragRafRef.current = null;
      }
      setTextModalDraft(null);
      setLiveTextPreview(null);
      if (textPreviewRafRef.current != null) {
        cancelAnimationFrame(textPreviewRafRef.current);
        textPreviewRafRef.current = null;
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && imageSrc) loadImageToCanvas();
  }, [isOpen, imageSrc, loadImageToCanvas]);

  useEffect(() => {
    if (!mathModalOpen || !imageLoaded || !textPreviewRect || editingOverlayId) {
      setLiveTextPreview(null);
      return;
    }
    const draft = textModalDraft;
    if (!draft?.text.trim()) {
      setLiveTextPreview(null);
      return;
    }
    if (textPreviewRafRef.current != null) cancelAnimationFrame(textPreviewRafRef.current);
    textPreviewRafRef.current = requestAnimationFrame(() => {
      textPreviewRafRef.current = null;
      try {
        const c = plainTextToCanvasSync(draft.text, draft.fontPx, textPreviewRect.w);
        setLiveTextPreview({
          url: c.toDataURL("image/png"),
          kw: c.width,
          kh: c.height,
        });
      } catch {
        setLiveTextPreview(null);
      }
    });
    return () => {
      if (textPreviewRafRef.current != null) {
        cancelAnimationFrame(textPreviewRafRef.current);
        textPreviewRafRef.current = null;
      }
    };
  }, [mathModalOpen, imageLoaded, textPreviewRect, textModalDraft, editingOverlayId]);

  const getCanvasPoint = (e: React.MouseEvent | React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const clientToCanvas = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const eraseAt = useCallback(
    (x: number, y: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx || !canvas) return;

      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, eraserSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
    [eraserSize]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!imageLoaded) return;
    const p = getCanvasPoint(e);
    if (!p) return;
    if (!textToolActive && !eraserActive && selectedOverlayId) {
      setSelectedOverlayId(null);
    }
    if (textToolActive) {
      e.preventDefault();
      setTextDrag({ x0: p.x, y0: p.y, x: p.x, y: p.y });
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      return;
    }
    if (!eraserActive) return;
    e.preventDefault();
    lastPosRef.current = p;
    setIsDrawing(true);
    eraseAt(p.x, p.y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!imageLoaded) return;
    if (textToolActive && textDrag) {
      e.preventDefault();
      const p = getCanvasPoint(e);
      if (p) setTextDrag((d) => (d ? { ...d, x: p.x, y: p.y } : null));
      return;
    }
    if (!eraserActive || !isDrawing) return;
    e.preventDefault();
    const p = getCanvasPoint(e);
    if (p) {
      const last = lastPosRef.current;
      if (last) {
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) {
          ctx.save();
          ctx.globalCompositeOperation = "destination-out";
          ctx.beginPath();
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(p.x, p.y);
          ctx.lineWidth = eraserSize;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeStyle = "rgba(0,0,0,1)";
          ctx.stroke();
          ctx.restore();
        }
      }
      lastPosRef.current = p;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (textToolActive && textDrag) {
      const { x0, y0, x, y } = textDrag;
      setTextDrag(null);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const rx = Math.min(x0, x);
      const ry = Math.min(y0, y);
      const rw = Math.abs(x - x0);
      const rh = Math.abs(y - y0);
      if (rw >= 12 && rh >= 12) {
        const rect = { x: rx, y: ry, w: rw, h: rh };
        setPendingTextRect(rect);
        const c = canvasRef.current;
        setTextModalSuggestedPx(suggestFontPxFromSelection(c, rect));
        setMathModalOpen(true);
      }
      return;
    }
    setIsDrawing(false);
    lastPosRef.current = null;
  };

  const handlePlaceTextOnImage = useCallback(
    async (raw: string, fontSizePx: number) => {
      const qid = latestQuestion.id;
      const canvas = canvasRef.current;
      if (editingOverlayId) {
        updateQuestionImageTextOverlay(
          qid,
          editingOverlayId,
          { text: raw.trim(), fontSizePx },
          { skipRecompose: true }
        );
        await recomposeQuestionImage(qid);
        setEditingOverlayId(null);
        return;
      }
      const rect = pendingTextRect;
      if (!rect || !canvas) return;
      const underSnap = canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
      addQuestionImageTextOverlay(
        qid,
        {
          x: rect.x,
          y: rect.y,
          w: rect.w,
          h: rect.h,
          text: raw.trim(),
          fontSizePx,
        },
        underSnap
      );
      await recomposeQuestionImage(qid);
      setPendingTextRect(null);
    },
    [
      editingOverlayId,
      pendingTextRect,
      latestQuestion.id,
      addQuestionImageTextOverlay,
      updateQuestionImageTextOverlay,
      recomposeQuestionImage,
    ]
  );

  const handleOverlayPointerDown = useCallback(
    (e: React.PointerEvent, ov: QuestionImageTextOverlay) => {
      if (textToolActive || eraserActive || !imageLoaded) return;
      e.preventDefault();
      e.stopPropagation();
      setSelectedOverlayId(ov.id);
      const p = clientToCanvas(e.clientX, e.clientY);
      const cw = naturalSizeRef.current.w;
      const ch = naturalSizeRef.current.h;
      const drag = {
        id: ov.id,
        ptr0: p,
        pos0: { x: ov.x, y: ov.y },
        w: ov.w,
        h: ov.h,
        cw,
        ch,
      };
      let dragMoved = false;
      let lastX = ov.x;
      let lastY = ov.y;

      const flushVisual = () => {
        overlayDragRafRef.current = null;
        const pending = overlayDragPendingRef.current;
        if (pending) setOverlayDragLive(pending);
      };

      const onMove = (ev: PointerEvent) => {
        const p2 = clientToCanvas(ev.clientX, ev.clientY);
        const dx = p2.x - drag.ptr0.x;
        const dy = p2.y - drag.ptr0.y;
        let nx = drag.pos0.x + dx;
        let ny = drag.pos0.y + dy;
        nx = Math.max(0, Math.min(nx, drag.cw - drag.w));
        ny = Math.max(0, Math.min(ny, drag.ch - drag.h));
        if (nx !== drag.pos0.x || ny !== drag.pos0.y) dragMoved = true;
        lastX = nx;
        lastY = ny;
        overlayDragPendingRef.current = {
          id: drag.id,
          x: nx,
          y: ny,
          w: drag.w,
          h: drag.h,
        };
        if (overlayDragRafRef.current == null) {
          overlayDragRafRef.current = requestAnimationFrame(flushVisual);
        }
      };
      const endDrag = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", endDrag);
        window.removeEventListener("pointercancel", endDrag);
        if (overlayDragRafRef.current != null) {
          cancelAnimationFrame(overlayDragRafRef.current);
          overlayDragRafRef.current = null;
        }
        overlayDragPendingRef.current = null;
        setOverlayDragLive(null);
        if (dragMoved) {
          updateQuestionImageTextOverlay(
            latestQuestion.id,
            drag.id,
            { x: lastX, y: lastY },
            { skipRecompose: true }
          );
          void recomposeQuestionImage(latestQuestion.id);
        }
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", endDrag);
      window.addEventListener("pointercancel", endDrag);
    },
    [
      textToolActive,
      eraserActive,
      imageLoaded,
      latestQuestion.id,
      updateQuestionImageTextOverlay,
      recomposeQuestionImage,
    ]
  );

  const handleOverlayDoubleClick = useCallback(
    (e: React.MouseEvent, ov: QuestionImageTextOverlay) => {
      if (textToolActive || eraserActive) return;
      e.preventDefault();
      e.stopPropagation();
      setEditingOverlayId(ov.id);
      setEditOverlayText(ov.text);
      setEditOverlayFontPx(ov.fontSizePx);
      setMathModalOpen(true);
    },
    [textToolActive, eraserActive]
  );

  useEffect(() => {
    if (!isOpen || !selectedOverlayId) return;
    const onKey = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (ev.key !== "Delete" && ev.key !== "Backspace") return;
      ev.preventDefault();
      removeQuestionImageTextOverlay(latestQuestion.id, selectedOverlayId);
      setSelectedOverlayId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, selectedOverlayId, latestQuestion.id, removeQuestionImageTextOverlay]);

  const handleApplyEraser = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
      flattenQuestionImageToSingleLayer(latestQuestion.id, base64);
    } catch {
      console.error("Silinen görüntü kaydedilemedi (CORS).");
      alert("Silinen görüntü kaydedilemedi. Lütfen soruyu tekrar seçin veya PDF'den yeniden kırpın.");
    }
  };

  const handleApplyRemoveBackground = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !imageLoaded) return;
    try {
      const dataUrlBefore = canvas.toDataURL("image/png");
      const base64Before = dataUrlBefore.replace(/^data:image\/png;base64,/, "");
      if (!imageBeforeRemoveBgRef.current) {
        imageBeforeRemoveBgRef.current = base64Before;
      }

      const w = canvas.width;
      const h = canvas.height;
      const imageData = ctx.getImageData(0, 0, w, h);
      const pixels = imageData.data;
      for (let i = 0; i < pixels.length; i += 4) {
        const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        if (avg >= REMOVE_BG_THRESHOLD) {
          pixels[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      const dataUrl = canvas.toDataURL("image/png");
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
      flattenQuestionImageToSingleLayer(latestQuestion.id, base64);
      updateRemoveBackground(latestQuestion.id, true);
      setCanUndoRemoveBg(true);
    } catch {
      console.error("Arka plan kaldırılamadı.");
      alert("Arka plan kaldırılamadı. Lütfen tekrar deneyin.");
    }
  };

  const handleUndoRemoveBackground = () => {
    const before = imageBeforeRemoveBgRef.current;
    if (!before) return;
    try {
      flattenQuestionImageToSingleLayer(latestQuestion.id, before);
      updateRemoveBackground(latestQuestion.id, false);
      imageBeforeRemoveBgRef.current = null;
      setCanUndoRemoveBg(false);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = `data:image/png;base64,${before}`;
      }
    } catch {
      console.error("Geri alınamadı.");
    }
  };

  const handleGoToQuestion = () => {
    onClose();
    const localSrc = getLocalSourceForQuestion(latestQuestion.id);
    const localPdfId = localSrc?.localPdfId ?? latestQuestion.localPdfId;
    if (localPdfId) {
      const page = localSrc?.pageNumber ?? latestQuestion.page_number;
      navigate("/crop-tool", { state: { localPdfId, pageNumber: page } });
    }
  };

  const canGoToQuestion = useMemo(() => {
    const q = latestQuestion;
    const mapped = getLocalSourceForQuestion(q.id);
    const lid = mapped?.localPdfId ?? q.localPdfId;
    return !!(lid && getLocalSource(lid));
  }, [latestQuestion]);

  if (!isOpen) return null;

  return (
    <>
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/70 p-6"
      onClick={onClose}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className={`w-full max-w-4xl rounded-2xl bg-white p-4 shadow-2xl ${
          isExplanation ? "border-l-[5px] border-l-teal-500 ring-1 ring-teal-200/50" : ""
        }`}
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div
              className="inline-flex rounded-lg border border-slate-200/90 bg-slate-50 p-0.5 shadow-sm"
              role="group"
              aria-label="İçerik türü"
            >
              <button
                type="button"
                onClick={() => setContentType("question")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  !isExplanation ? "bg-orange-500 text-white shadow-sm" : "text-slate-600 hover:bg-white"
                }`}
              >
                Soru ifadesi
              </button>
              <button
                type="button"
                onClick={() => setContentType("explanation")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  isExplanation ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:bg-white"
                }`}
              >
                Açıklama
              </button>
            </div>
            {isExplanation ? (
              <button
                type="button"
                onClick={() => setCaptionModalOpen(true)}
                title="Açıklama metni ekle veya düzenle"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/80 bg-teal-50 text-teal-800 transition hover:border-teal-500 hover:bg-teal-100"
                aria-label="Açıklama metni"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                  <path d="M16 13H8" />
                  <path d="M16 17H8" />
                  <path d="M10 9H8" />
                </svg>
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canGoToQuestion && (
              <button
                type="button"
                onClick={handleGoToQuestion}
                title="Kırpma aracında bu sorunun olduğu sayfaya git"
                className="flex items-center gap-1.5 rounded-md border border-blue-400 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Soruya Git
              </button>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setTextToolActive((v) => {
                    const next = !v;
                    if (next) {
                      setEraserActive(false);
                      setIsDrawing(false);
                    }
                    return next;
                  });
                }}
                title="Görüntü üzerinde alan seçip düz metin yerleştir (boyut otomatik önerilir)"
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-md border text-sm font-bold leading-none ${
                  textToolActive
                    ? "border-sky-600 bg-sky-600 text-white hover:bg-sky-500"
                    : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                }`}
                aria-label="Metin ekle"
                aria-pressed={textToolActive}
              >
                T
              </button>
              <button
                type="button"
                onClick={() => {
                  setEraserActive((v) => {
                    const next = !v;
                    if (next) {
                      setTextToolActive(false);
                      setTextDrag(null);
                    }
                    return next;
                  });
                }}
                title="Silgi ile istemediğiniz yerleri silebilirsiniz"
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium ${
                  eraserActive
                    ? "bg-amber-600 text-white hover:bg-amber-500"
                    : "border border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 20H7L3 16a2 2 0 0 1 0-2.83l11.17-11.17a2 2 0 0 1 2.83 0L20 10" />
                </svg>
                Silgi {eraserActive ? "✓" : ""}
              </button>
              {eraserActive && (
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-slate-600">Boyut:</label>
                  <input
                    type="range"
                    min={ERASER_SIZE_MIN}
                    max={ERASER_SIZE_MAX}
                    value={eraserSize}
                    onChange={(e) => setEraserSize(Number(e.target.value))}
                    className="h-1.5 w-20 accent-amber-500"
                  />
                  <span className="min-w-[2rem] text-xs text-slate-500">{eraserSize}px</span>
                </div>
              )}
            </div>
            {eraserActive && imageLoaded && (
              <button
                type="button"
                onClick={handleApplyEraser}
                className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500"
              >
                Uygula
              </button>
            )}
            <button
              type="button"
              onClick={handleApplyRemoveBackground}
              disabled={!imageLoaded}
              title="Açık renkli arka planı şeffaf yap ve soruya uygula"
              className={`rounded-md px-3 py-1 text-xs font-medium disabled:opacity-50 ${
                latestQuestion.remove_background
                  ? "bg-orange-600 text-white hover:bg-orange-500"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {latestQuestion.remove_background ? "Arka plan kaldır ✓" : "Arka planı kaldır"}
            </button>
            {canUndoRemoveBg && (
              <button
                type="button"
                onClick={handleUndoRemoveBackground}
                title="Arka plan kaldırma işlemini geri al"
                className="flex items-center gap-1 rounded-md border border-slate-400 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                Geri Al
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
            >
              Kapat
            </button>
          </div>
        </div>

        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-xl bg-[repeating-conic-gradient(slate-200_0%_25%,white_0%_50%)] bg-[length:12px_12px]"
        >
          {!imageLoaded && (
            <div className="flex min-h-[200px] items-center justify-center text-slate-500">
              Yükleniyor…
            </div>
          )}
          <div className="relative inline-block max-w-full">
            <canvas
              ref={canvasRef}
              className="block rounded-xl"
              style={{
                width: displaySize.w,
                height: displaySize.h,
                maxWidth: "100%",
                cursor: textToolActive ? "crosshair" : eraserActive ? ERASER_CURSOR : "default",
                touchAction: "none",
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={(e) => {
                if (!textToolActive) handlePointerUp(e);
              }}
              onPointerCancel={handlePointerUp}
            />
            {mathModalOpen &&
              !editingOverlayId &&
              liveTextPreview &&
              textPreviewRect &&
              imageLoaded &&
              (() => {
                const cw = canvasRef.current?.width ?? 1;
                const ch = canvasRef.current?.height ?? 1;
                const dw = displaySize.w;
                const dh = displaySize.h;
                const rect = textPreviewRect;
                const boxLeft = (rect.x / cw) * dw;
                const boxTop = (rect.y / ch) * dh;
                const boxW = (rect.w / cw) * dw;
                const boxH = (rect.h / ch) * dh;
                const padDisplay = (4 / cw) * dw;
                const innerW = Math.max(1, boxW - 2 * padDisplay);
                const innerH = Math.max(1, boxH - 2 * padDisplay);
                const scale = Math.min(innerW / liveTextPreview.kw, innerH / liveTextPreview.kh, 1);
                const dispW = liveTextPreview.kw * scale;
                const dispH = liveTextPreview.kh * scale;
                const left = boxLeft + (boxW - dispW) / 2;
                const top = boxTop + (boxH - dispH) / 2;
                return (
                  <img
                    src={liveTextPreview.url}
                    alt=""
                    className="pointer-events-none absolute z-[12]"
                    style={{ left, top, width: dispW, height: dispH }}
                  />
                );
              })()}
            {textToolActive && textDrag && imageLoaded && (
              <div
                className="pointer-events-none absolute left-0 top-0 rounded-md border-2 border-dashed border-sky-500 bg-sky-400/15"
                style={(() => {
                  const cw = canvasRef.current?.width ?? 1;
                  const ch = canvasRef.current?.height ?? 1;
                  const dw = displaySize.w;
                  const dh = displaySize.h;
                  const left = (Math.min(textDrag.x0, textDrag.x) / cw) * dw;
                  const top = (Math.min(textDrag.y0, textDrag.y) / ch) * dh;
                  const w = (Math.abs(textDrag.x - textDrag.x0) / cw) * dw;
                  const h = (Math.abs(textDrag.y - textDrag.y0) / ch) * dh;
                  return { width: w, height: h, left, top };
                })()}
              />
            )}
            {imageLoaded &&
              !textToolActive &&
              !eraserActive &&
              (latestQuestion.image_text_overlays?.length ?? 0) > 0 &&
              (() => {
                const cw = canvasRef.current?.width ?? 1;
                const ch = canvasRef.current?.height ?? 1;
                const dw = displaySize.w;
                const dh = displaySize.h;
                return (
                  <div
                    className="absolute left-0 top-0 touch-none"
                    style={{ width: dw, height: dh, pointerEvents: "auto" }}
                  >
                    {(latestQuestion.image_text_overlays ?? []).map((ov) => {
                      const live = overlayDragLive?.id === ov.id ? overlayDragLive : null;
                      const px = live?.x ?? ov.x;
                      const py = live?.y ?? ov.y;
                      return (
                      <div
                        key={ov.id}
                        role="button"
                        tabIndex={0}
                        title="Sürükleyin; çift tıklayarak düzenleyin. Silmek için seçip Delete."
                        className={`absolute cursor-grab active:cursor-grabbing rounded border-2 ${
                          selectedOverlayId === ov.id
                            ? "border-sky-500 bg-sky-400/20"
                            : "border-transparent bg-transparent hover:border-sky-400/50"
                        }`}
                        style={{
                          left: (px / cw) * dw,
                          top: (py / ch) * dh,
                          width: (ov.w / cw) * dw,
                          height: (ov.h / ch) * dh,
                        }}
                        onPointerDown={(e) => handleOverlayPointerDown(e, ov)}
                        onDoubleClick={(e) => handleOverlayDoubleClick(e, ov)}
                      />
                    );
                    })}
                  </div>
                );
              })()}
          </div>
          {textToolActive && imageLoaded && (
            <p className="mt-2 text-center text-xs text-slate-600">
              Metin aracı: sürükleyerek alan seçin; yazı boyutu soru görseline göre tahmin edilir, isterseniz pencereden ayarlarsınız.
            </p>
          )}
          {!textToolActive && !eraserActive && imageLoaded && (latestQuestion.image_text_overlays?.length ?? 0) > 0 && (
            <p className="mt-2 text-center text-xs text-slate-600">
              Metin kutularını sürükleyerek taşıyın; çift tıklayarak yeniden düzenleyin; seçili kutuyu Delete ile kaldırın.
            </p>
          )}
        </div>
      </div>
    </div>
    <ExplanationCaptionModal
      open={captionModalOpen}
      onClose={() => setCaptionModalOpen(false)}
      question={latestQuestion}
    />
    <QuestionImageMathTextModal
      open={mathModalOpen}
      suggestedFontPx={textModalSuggestedPx}
      editingOverlayId={editingOverlayId}
      initialText={editOverlayText}
      initialFontPx={editOverlayFontPx}
      onLiveDraftChange={onTextModalLiveDraft}
      onClose={() => {
        setMathModalOpen(false);
        setPendingTextRect(null);
        setEditingOverlayId(null);
        setTextModalDraft(null);
        setLiveTextPreview(null);
      }}
      onPlace={handlePlaceTextOnImage}
    />
    </>
  );
}
