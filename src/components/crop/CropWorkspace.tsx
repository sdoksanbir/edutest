import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { CropBox } from "../../types";
import type { AnswerOption } from "../../types";
import {
  loadPdfFromFile,
  renderPageToDataUrl,
  cropImageToBase64,
  CROP_EXPORT_DPI,
} from "../../utils/pdfClient";
import {
  listLocalPdfs,
  listLocalImages,
  listLocalSources,
  addLocalPdfs,
  addLocalImages,
  setLastSelectedSource,
  getLastSelectedSource,
  getStoredPendingSelectionsForValidDocuments,
  setStoredPendingSelections,
  setLocalSourceForQuestion,
  getLocalSourceForQuestion,
  getLocalPdf,
  getLocalSource,
  getLocalImage,
  getPageIndex,
  setPageIndex,
  getZoomForSource,
  setZoomForSource,
  getChoiceCount,
  setChoiceCount,
  type LocalPdfEntry,
  type LocalImageEntry,
} from "../../store/cropLocalStore";
import { validateImageFile } from "../../utils/imageValidation";
import { useEditorStore } from "../../store/editorStore";
import { buildQuestionNumberMap, normalizeContentType } from "../../utils/questionNumbering";
import {
  percentCropToNormalizedRect,
  trimCropToContent,
  normalizedRectToPercentCrop,
  computeDisplayedSize,
  computeFitZoomByWidth,
  computeFitZoomByHeight,
} from "../../utils/cropCoordUtils";
import AnswerMarkPanel, { type CropLayoutMode } from "./AnswerMarkPanel";
import LocalPdfDeleteModal from "../modals/LocalPdfDeleteModal";
import SelectionOverlay from "./SelectionOverlay";
import SortableSelectionItem from "./SortableSelectionItem";

type PendingSelection = {
  id: string;
  pdf_id: string;
  page_number: number;
  crop: CropBox; // norm 0..1
  answer_key?: string;
  number: number;
  listBadge?: string;
  content_type?: string;
  explanation_caption_enabled?: boolean;
  explanation_caption_text?: string;
  remove_background?: boolean;
  display_scale?: number;
  /** Backend'de zaten kayıtlı mı (yüklemeden gelen) */
  backendId?: string;
  /** Local PDF modunda: sunucuya yüklenmemiş */
  isLocal?: boolean;
  /** Local PDF store id (kaydetme için doc erişimi) */
  localPdfId?: string;
  localFilename?: string;
};

export default function CropWorkspace() {
  const navigate = useNavigate();
  const location = useLocation();
  const questions = useEditorStore((s) => s.questions);
  const sections = useEditorStore((s) => s.sections);
  const fetchQuestions = useEditorStore((s) => s.fetchQuestions);
  const addQuestionsToWorkingDraft = useEditorStore((s) => s.addQuestionsToWorkingDraft);
  const removeQuestion = useEditorStore((s) => s.removeQuestion);
  const clearAllQuestions = useEditorStore((s) => s.clearAllQuestions);
  const setQuestionDisplayScale = useEditorStore((s) => s.setQuestionDisplayScale);
  const reorderQuestions = useEditorStore((s) => s.reorderQuestions);
  const updateQuestionCrop = useEditorStore((s) => s.updateQuestionCrop);
  const updateQuestionImage = useEditorStore((s) => s.updateQuestionImage);

  const [localPdfs, setLocalPdfs] = useState<LocalPdfEntry[]>([]);
  const [localImages, setLocalImages] = useState<LocalImageEntry[]>([]);
  /** local:id - combo değeri */
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [localPageDataUrls, setLocalPageDataUrls] = useState<Record<string, string>>({});
  const [localPdfLoading, setLocalPdfLoading] = useState(false);
  const [localImageLoading, setLocalImageLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const selectedLocalPdf = selectedSource.startsWith("local:")
    ? getLocalPdf(selectedSource.slice(6)) ?? null
    : null;
  const selectedLocalImage = selectedSource.startsWith("local:")
    ? getLocalImage(selectedSource.slice(6)) ?? null
    : null;
  const hasSource = !!selectedLocalPdf || !!selectedLocalImage;
  /** Her PDF için son görüntülenen sayfa (PDF’ler arası geçişte hatırlamak için) */
  const pdfPageIndicesRef = useRef<Record<string, number>>({});
  /** Zoom: 100 = 1:1 natural size. Tek source of truth. */
  const [zoom, setZoom] = useState(100);
  const DISPLAY_DPI = CROP_EXPORT_DPI;
  const [pendingSelections, setPendingSelections] = useState<PendingSelection[]>([]);
  const [showSelectionsPanel, setShowSelectionsPanel] = useState(false);

  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [editingSelectionId, setEditingSelectionId] = useState<string | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  /** naturalImageSize = image naturalWidth × naturalHeight. Canonical source. */
  const [naturalImageSize, setNaturalImageSize] = useState<{ w: number; h: number } | null>(null);
  /** PDF başına ilk sayfanın natural size (sayfa değişince zıplama olmasın) */
  const baseNaturalBySourceRef = useRef<Record<string, { w: number; h: number }>>({});
  const [error, setError] = useState<string | null>(null);
  const [inlineSelectedAnswer, setInlineSelectedAnswer] = useState<AnswerOption | null>(null);
  const [inlineLayout, setInlineLayout] = useState<CropLayoutMode>("dar");
  const [showLocalDeleteModal, setShowLocalDeleteModal] = useState(false);
  const [choiceCount, setChoiceCountState] = useState<3 | 4 | 5>(() => getChoiceCount() ?? 5);
  const cevapsizCount = pendingSelections.filter(
    (s) => !s.answer_key || !String(s.answer_key).trim()
  ).length;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const imgRef = useRef<HTMLImageElement | null>(null);
  const localPdfInputRef = useRef<HTMLInputElement | null>(null);
  const localImageInputRef = useRef<HTMLInputElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const [viewerSize, setViewerSize] = useState<{ w: number; h: number } | null>(null);
  const pendingAddPercentCropRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const editingCropRef = useRef<CropBox | null>(null);

  // Crop store'dan local PDF ve resimleri senkronize et (rota değişiminde)
  useEffect(() => {
    setLocalPdfs(listLocalPdfs());
    setLocalImages(listLocalImages());
  }, []);

  // Kaldırılan local PDF/resimlerin page cache'ini temizle
  useEffect(() => {
    const validIds = new Set([
      ...localPdfs.map((p) => p.id),
      ...localImages.map((i) => i.id),
    ]);
    setLocalPageDataUrls((prev) => {
      const next: Record<string, string> = {};
      for (const [key, url] of Object.entries(prev)) {
        const localId = key.split(":")[0];
        if (validIds.has(localId)) next[key] = url;
      }
      return next;
    });
  }, [localPdfs, localImages]);

  // Mount'ta son seçimi + sayfa + zoom geri yükle (store'dan)
  useEffect(() => {
    const localList = listLocalPdfs();
    const last = getLastSelectedSource();
    if (last?.startsWith("local:")) {
      const id = last.slice(6);
      if (getLocalPdf(id) || getLocalImage(id)) {
        setSelectedSource(last);
        const storedPage = getPageIndex(last);
        setCurrentPage(storedPage ?? pdfPageIndicesRef.current[last] ?? 1);
        const storedZoom = getZoomForSource(last);
        if (storedZoom != null) setZoom(storedZoom);
      }
    }
    // Sayfa indekslerini ref'e yükle (store'dan)
    [...localList, ...listLocalImages()].forEach((s) => {
      const key = `local:${s.id}`;
      const stored = getPageIndex(key);
      if (stored != null) pdfPageIndicesRef.current[key] = stored;
    });
  }, [localPdfs]);

  const VIEWER_PADDING = 48;
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    const measure = () => {
      requestAnimationFrame(() => {
        if (viewerRef.current) {
          setViewerSize({
            w: viewerRef.current.clientWidth,
            h: viewerRef.current.clientHeight,
          });
        }
      });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [selectedSource, showSelectionsPanel]);

  const locationState = location.state as {
    localPdfId?: string;
    pageNumber?: number;
  } | null;

  // Mevcut soruları yükle, numaraları sıfırlamadan devam et
  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Local PDF: sayfa render et ve cache'le (anahtar: localId:pageNum:dpi)
  useEffect(() => {
    if (!selectedLocalPdf || currentPage < 1 || currentPage > selectedLocalPdf.pageCount) return;
    const cacheKey = `${selectedLocalPdf.id}:${currentPage}:${DISPLAY_DPI}`;
    if (localPageDataUrls[cacheKey]) return;
    let cancelled = false;
    renderPageToDataUrl(selectedLocalPdf.doc, currentPage, DISPLAY_DPI)
      .then((dataUrl) => {
        if (!cancelled)
          setLocalPageDataUrls((prev) => ({ ...prev, [cacheKey]: dataUrl }));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Sayfa render edilemedi");
      });
    return () => {
      cancelled = true;
    };
  }, [selectedLocalPdf, currentPage, localPageDataUrls, DISPLAY_DPI]);

  // Local resim: dataUrl zaten hazır, cache'e yaz (tek sayfa)
  useEffect(() => {
    if (!selectedLocalImage || currentPage !== 1) return;
    const cacheKey = `${selectedLocalImage.id}:1`;
    if (localPageDataUrls[cacheKey]) return;
    setLocalPageDataUrls((prev) => ({ ...prev, [cacheKey]: selectedLocalImage.dataUrl }));
  }, [selectedLocalImage, currentPage, localPageDataUrls]);

  // Editördeki soruları crop listesine yansıt.
  useEffect(() => {
    const allEditorQuestions = [...questions].sort((a, b) => a.order_index - b.order_index);
    const numMap = buildQuestionNumberMap(allEditorQuestions, sections);
    const loaded: PendingSelection[] = allEditorQuestions.map((q) => {
      const isLocal = !!q.image_base64 || !q.pdf_id;
      const localSource = isLocal ? getLocalSourceForQuestion(q.id) : undefined;
      const localSrc = localSource ? getLocalSource(localSource.localPdfId) : undefined;
      const localPdfId = localSrc ? localSource!.localPdfId : (q as { localPdfId?: string }).localPdfId;
      const localFilename = localSrc ? localSrc.filename : (isLocal ? "Kaydedildi" : undefined);
      const dn = numMap.get(q.id);
      const listBadge =
        normalizeContentType(q.content_type) === "explanation"
          ? "Aç"
          : dn != null
            ? String(dn)
            : undefined;
      return {
        id: q.id,
        pdf_id: q.pdf_id ?? "",
        page_number: q.page_number,
        crop: q.crop,
        answer_key: q.answer_key ?? "",
        number: q.order_index + 1,
        listBadge,
        content_type: q.content_type,
        explanation_caption_enabled: q.explanation_caption_enabled,
        explanation_caption_text: q.explanation_caption_text,
        remove_background: q.remove_background ?? false,
        backendId: q.image_base64 ? undefined : q.id,
        isLocal,
        localPdfId: localPdfId ?? (q as { localPdfId?: string }).localPdfId,
        localFilename,
      };
    });
    const stored = getStoredPendingSelectionsForValidDocuments([]) as PendingSelection[];
    const storedNew = stored.filter((p) => !p.backendId);
    const loadedIds = new Set(loaded.map((l) => l.id));
    const merged = [
      ...loaded,
      ...storedNew.filter((p) => !loadedIds.has(p.id)),
    ].sort((a, b) => a.number - b.number);
    setPendingSelections(merged);

    // Sorular yüklendi, selectedSource boşsa ilk sorunun kaynağına git (veya ilk mevcut PDF)
    if (merged.length > 0 && !selectedSource) {
      const first = merged.find((s) => s.isLocal && s.localPdfId);
      let sourceVal = first?.localPdfId ? `local:${first.localPdfId}` : "";
      if (!sourceVal) {
        const loc = listLocalSources();
        if (loc.length > 0) sourceVal = `local:${loc[0].id}`;
      }
      if (sourceVal) {
        setSelectedSource(sourceVal);
        setLastSelectedSource(sourceVal);
        const page =
          first && sourceVal === `local:${first.localPdfId}`
            ? first.page_number
            : getPageIndex(sourceVal) ?? 1;
        setCurrentPage(page);
        setPageIndex(sourceVal, page);
      }
    }
  }, [questions, sections, localPdfs.length, selectedSource]);

  // Bekleyen seçimleri store'a yaz (kaydedilmemiş olanlar)
  useEffect(() => {
    const unsaved = pendingSelections.filter((s) => !s.backendId);
    setStoredPendingSelections(unsaved);
  }, [pendingSelections]);

  useEffect(() => {
    const page = locationState?.pageNumber ?? 1;
    if (locationState?.localPdfId) {
      const localSrc = getLocalSource(locationState.localPdfId);
      if (localSrc) {
        const key = `local:${locationState.localPdfId}`;
        setSelectedSource(key);
        setLastSelectedSource(key);
        setCurrentPage(page);
        setPageIndex(key, page);
        const storedZoom = getZoomForSource(key);
        if (storedZoom != null) setZoom(storedZoom);
      }
    }
  }, [locationState?.localPdfId, locationState?.pageNumber]);

  // Sayfa değiştiğinde bu kaynak için son sayfayı kaydet (ref + store)
  useEffect(() => {
    if (selectedSource && currentPage >= 1) {
      pdfPageIndicesRef.current[selectedSource] = currentPage;
      setPageIndex(selectedSource, currentPage);
    }
  }, [selectedSource, currentPage]);

  // Crop sayfasındayken tarayıcı zoom'unu engelle (sadece PDF zoom olsun)
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    const original = meta?.getAttribute("content") ?? "";
    if (meta) {
      meta.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no");
    }
    return () => {
      if (meta) meta.setAttribute("content", original);
    };
  }, []);

  useEffect(() => {
    const maxPage = selectedLocalPdf?.pageCount ?? selectedLocalImage?.pageCount ?? 0;
    if (maxPage > 0 && currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [selectedLocalPdf, selectedLocalImage, currentPage]);

  const handleLocalPdfSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setLocalPdfLoading(true);
    setError(null);
    try {
      const entries: LocalPdfEntry[] = [];
      for (let i = 0; i < files.length; i++) {
        const doc = await loadPdfFromFile(files[i]);
        entries.push({
          id: `local-${crypto.randomUUID()}`,
          doc: doc.doc,
          pageCount: doc.pageCount,
          filename: doc.filename,
        });
      }
      addLocalPdfs(entries);
      setLocalPdfs(listLocalPdfs());
      if (entries.length > 0) {
        const newSource = `local:${entries[0].id}`;
        setSelectedSource(newSource);
        setLastSelectedSource(newSource);
        setCurrentPage(1);
        setPageIndex(newSource, 1);
        setEditingSelectionId(null);
        setCrop(undefined);
        setCompletedCrop(null);
        pendingAddPercentCropRef.current = null;
      }
      if (localPdfInputRef.current) localPdfInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF açılamadı");
    } finally {
      setLocalPdfLoading(false);
    }
  };

  const handleLocalImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setLocalImageLoading(true);
    setError(null);
    try {
      const entries: LocalImageEntry[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const validation = validateImageFile(file);
        if (!validation.ok) {
          setError(validation.error);
          continue;
        }
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = reject;
          r.readAsDataURL(file);
        });
        entries.push({
          id: `local-${crypto.randomUUID()}`,
          dataUrl,
          pageCount: 1,
          filename: file.name,
        });
      }
      if (entries.length > 0) {
        addLocalImages(entries);
        setLocalImages(listLocalImages());
        const newSource = `local:${entries[0].id}`;
        setSelectedSource(newSource);
        setLastSelectedSource(newSource);
        setCurrentPage(1);
        setPageIndex(newSource, 1);
        setEditingSelectionId(null);
        setCrop(undefined);
        setCompletedCrop(null);
        pendingAddPercentCropRef.current = null;
      }
      if (localImageInputRef.current) localImageInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resim yüklenemedi");
    } finally {
      setLocalImageLoading(false);
    }
  };

  const renumberSelections = useCallback((list: PendingSelection[]) => {
    return list.map((s, i) => ({ ...s, number: i + 1 }));
  }, []);


  const handleLocalPdfRemoved = useCallback(
    (removedId: string) => {
      setPendingSelections((prev) =>
        renumberSelections(prev.filter((s) => !(s.isLocal && s.localPdfId === removedId)))
      );
      if (selectedSource === `local:${removedId}`) {
        const remaining = listLocalSources();
        setSelectedSource(remaining[0] ? `local:${remaining[0].id}` : "");
        setCurrentPage(1);
        setCrop(undefined);
        setCompletedCrop(null);
      }
      setLocalPdfs(listLocalPdfs());
      setLocalImages(listLocalImages());
    },
    [selectedSource, renumberSelections]
  );

  const onImageLoad = useCallback(() => {
    if (!imgRef.current) return;
    const w = imgRef.current.naturalWidth;
    const h = imgRef.current.naturalHeight;
    if (w <= 0 || h <= 0) return;
    setNaturalImageSize({ w, h });
    setImgLoaded(true);
  }, []);

  /** Kesim kaynağı: tam DPI sayfa önbelleği — ekran zoom’undan bağımsız. */
  const resolveCropSource = useCallback(
    async (sel: PendingSelection): Promise<HTMLImageElement | string | null> => {
      if (!sel.localPdfId) return null;

      const imgEntry = getLocalImage(sel.localPdfId);
      if (imgEntry) return imgEntry.dataUrl;

      const cacheKey = `${sel.localPdfId}:${sel.page_number}:${DISPLAY_DPI}`;
      const cached = localPageDataUrls[cacheKey];
      if (cached) return cached;

      const pdfEntry = getLocalPdf(sel.localPdfId);
      if (pdfEntry) {
        const dataUrl = await renderPageToDataUrl(pdfEntry.doc, sel.page_number, DISPLAY_DPI);
        setLocalPageDataUrls((prev) =>
          prev[cacheKey] ? prev : { ...prev, [cacheKey]: dataUrl }
        );
        return dataUrl;
      }
      return null;
    },
    [localPageDataUrls, DISPLAY_DPI]
  );

  /** Tek seçimi ana editöre anında ekler (local PDF/resim) */
  const addSelectionToEditor = useCallback(
    async (sel: PendingSelection) => {
      const t0 = performance.now();
      const existing = useEditorStore.getState().questions;
      const orderIndex = existing.length;
      if (!sel.localPdfId) return;

      try {
        const cropSource = await resolveCropSource(sel);
        if (!cropSource) return;

        const tCrop = performance.now();
        const imageBase64 = await cropImageToBase64(cropSource, sel.crop);
        const cropMs = performance.now() - tCrop;

        const qItem = {
          id: sel.id,
          pdf_id: "",
          page_number: sel.page_number,
          crop: sel.crop,
          answer_key: sel.answer_key ?? "",
          order_index: orderIndex,
          content_type: (sel.content_type ?? "question") as "question" | "explanation",
          remove_background: sel.remove_background ?? false,
          display_scale: sel.display_scale,
          image_base64: imageBase64.includes(",") ? imageBase64.split(",", 2)[1]! : imageBase64,
          localPdfId: sel.localPdfId,
        };
        addQuestionsToWorkingDraft([qItem]);
        setLocalSourceForQuestion(sel.id, sel.localPdfId, sel.page_number);

        if (import.meta.env.DEV) {
          console.debug(
            `[crop-perf] editöre ekle: crop=${cropMs.toFixed(1)}ms total=${(performance.now() - t0).toFixed(1)}ms`
          );
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Soru eklenemedi");
      }
    },
    [addQuestionsToWorkingDraft, resolveCropSource]
  );

  /** Dar/Geniş UI korunur; piksel küçültme yok (eski 0.88 DPI kaybı kaldırıldı). */
  const layoutToScale = (_layout: CropLayoutMode) => 1;

  const resetInlineCropUi = useCallback(() => {
    setCompletedCrop(null);
    setCrop(undefined);
    pendingAddPercentCropRef.current = null;
    setInlineSelectedAnswer(null);
    setInlineLayout("dar");
  }, []);

  const addSelection = (answer: AnswerOption | null, layout: CropLayoutMode) => {
    if (!selectedLocalPdf && !selectedLocalImage) return;
    const percentCrop = pendingAddPercentCropRef.current;
    if (!percentCrop || percentCrop.width <= 0 || percentCrop.height <= 0) return;

    pendingAddPercentCropRef.current = null;
    const t0 = performance.now();

    let box = percentCropToNormalizedRect(percentCrop);
    const imgForTrim = imgRef.current;
    if (imgForTrim) {
      try {
        const tTrim = performance.now();
        const trimmed = trimCropToContent(imgForTrim, percentCrop);
        if (import.meta.env.DEV) {
          console.debug(`[crop-perf] trim=${(performance.now() - tTrim).toFixed(1)}ms`);
        }
        if (trimmed) box = trimmed;
      } catch {
        /* CORS/tainted canvas: ham kutu kullanılır */
      }
    }

    const isLocal = true;
    const localSrc = selectedLocalPdf ?? selectedLocalImage;
    const displayScale = layoutToScale(layout);
    const newSel: PendingSelection = {
      id: crypto.randomUUID(),
      pdf_id: "",
      page_number: currentPage,
      crop: box,
      answer_key: answer ? answer : "",
      number: 0,
      remove_background: false,
      display_scale: displayScale,
      content_type: "question",
      isLocal,
      localPdfId: localSrc?.id,
      localFilename: localSrc?.filename,
    };

    resetInlineCropUi();
    setPendingSelections((prev) => {
      const nextNum = prev.length > 0 ? Math.max(...prev.map((s) => s.number)) + 1 : 1;
      return [...prev, { ...newSel, number: nextNum }].sort((a, b) => a.number - b.number);
    });

    if (import.meta.env.DEV) {
      console.debug(`[crop-perf] ui=${(performance.now() - t0).toFixed(1)}ms`);
    }

    void addSelectionToEditor(newSel);
  };

  const handleAnswerPicked = (answer: AnswerOption | null) => {
    addSelection(answer, inlineLayout);
  };

  const handleAnswerChange = (sel: PendingSelection, answer: AnswerOption | null) => {
    const key = answer ?? "";
    setPendingSelections((prev) =>
      prev.map((s) => (s.id === sel.id ? { ...s, answer_key: key } : s))
    );
    useEditorStore.setState((s) => ({
      questions: s.questions.map((x) => (x.id === sel.id ? { ...x, answer_key: key } : x)),
      isDirty: true,
    }));
  };

  const handleLayoutChange = (sel: PendingSelection, layout: CropLayoutMode) => {
    const scale = layoutToScale(layout);
    setPendingSelections((prev) =>
      prev.map((s) => (s.id === sel.id ? { ...s, display_scale: scale } : s))
    );
    setQuestionDisplayScale(sel.id, scale);
  };

  /** Seçimi hem crop listesinden hem editörden kaldırır */
  const removeSelectionFromEverywhere = useCallback(
    async (sel: PendingSelection) => {
      if (editingSelectionId === sel.id) setEditingSelectionId(null);
      const filtered = pendingSelections.filter((s) => s.id !== sel.id);
      const renumbered = renumberSelections(filtered);
      setPendingSelections(renumbered);
      setStoredPendingSelections(renumbered.filter((s) => !s.backendId));
      await removeQuestion(sel.id);
    },
    [editingSelectionId, pendingSelections, removeQuestion, renumberSelections]
  );

  /** Ana sayfa ile aynı: tüm soruları + kırpma listesini temizle */
  const clearAllSelections = useCallback(() => {
    setEditingSelectionId(null);
    setCrop(undefined);
    editingCropRef.current = null;
    pendingAddPercentCropRef.current = null;
    setCompletedCrop(null);
    setPendingSelections([]);
    clearAllQuestions();
  }, [clearAllQuestions]);

  /** Editördeki sorular silinince kırpma listesini senkron tut */
  useEffect(() => {
    const ids = new Set(questions.map((q) => q.id));
    setPendingSelections((prev) => {
      if (questions.length === 0) {
        if (prev.length === 0) return prev;
        return [];
      }
      const next = prev.filter((s) => ids.has(s.id));
      return next.length === prev.length ? prev : next;
    });
  }, [questions]);

  const handleDeleteSelection = (sel: PendingSelection) => {
    removeSelectionFromEverywhere(sel);
  };

  const handleStartEditSelection = (sel: PendingSelection) => {
    if (editingSelectionId === sel.id) {
      setEditingSelectionId(null);
      setCrop(undefined);
      editingCropRef.current = null;
    } else {
      setEditingSelectionId(sel.id);
      const norm = sel.crop as { x: number; y: number; width: number; height: number };
      editingCropRef.current = norm;
      setCrop({
        ...normalizedRectToPercentCrop(norm),
        unit: "%",
      });
    }
  };

  const handleEndEditSelection = async () => {
    const selId = editingSelectionId;
    const newCrop = editingCropRef.current;
    const sel = pendingSelections.find((s) => s.id === selId);

    setEditingSelectionId(null);
    setCrop(undefined);
    editingCropRef.current = null;

    if (!selId || !sel || !newCrop) return;

    const cropToUse = newCrop as CropBox;

    if (sel.isLocal && (selectedLocalPdf || selectedLocalImage)) {
      try {
        const pageDataUrl = selectedLocalImage
          ? (localPageDataUrls[`${selectedLocalImage.id}:1`] ?? selectedLocalImage.dataUrl)
          : localPageDataUrls[`${selectedLocalPdf!.id}:${currentPage}:${DISPLAY_DPI}`];
        if (pageDataUrl) {
          const base64 = await cropImageToBase64(pageDataUrl, cropToUse);
          const clean = base64.replace(/^data:[^;]+;base64,/, "");
          updateQuestionImage(sel.id, clean);
        }
      } catch (e) {
        console.error("Local soru kırpma güncellenemedi:", e);
      }
    }
    await updateQuestionCrop(sel.id, cropToUse);
  };


  const removePending = (sel: PendingSelection) => {
    removeSelectionFromEverywhere(sel);
  };

  const pageCount = selectedLocalPdf?.pageCount ?? selectedLocalImage?.pageCount ?? 0;
  const pageUrl = selectedLocalImage
    ? (localPageDataUrls[`${selectedLocalImage.id}:1`] ?? selectedLocalImage.dataUrl)
    : selectedLocalPdf
      ? localPageDataUrls[`${selectedLocalPdf.id}:${currentPage}:${DISPLAY_DPI}`] ?? null
      : null;
  /** Canonical: natural size for this PDF (ilk sayfadan, sayfa değişince sabit) */
  const canonicalNaturalSize = baseNaturalBySourceRef.current[selectedSource] ?? naturalImageSize;
  const hasCanonicalSize = Boolean(
    canonicalNaturalSize && canonicalNaturalSize.w > 0 && canonicalNaturalSize.h > 0
  );
  /** Overlay çizilebilir; image/container boyutu da aynı kaynaktan */
  const pageRenderReady = hasCanonicalSize;
  /** displayedSize = natural * zoom/100. Image, overlay, container AYNI formül. */
  const displayedSize = hasCanonicalSize
    ? computeDisplayedSize(canonicalNaturalSize!, zoom)
    : { w: 800, h: 1131 }; /* loading placeholder - overlay YOK (pageRenderReady false) */

  // ReactCrop onComplete -> percentCrop zoom'dan bağımsız, PixelCrop görüntüleme için (yeni seçim için)
  const handleCropComplete = useCallback(
    (pixelCrop: PixelCrop, percentCrop: { x: number; y: number; width: number; height: number }) => {
      if (editingSelectionId) return; // Düzenleme modundaysa yeni seçim olarak işleme
      setCompletedCrop(pixelCrop);
      pendingAddPercentCropRef.current = percentCrop;
      setInlineSelectedAnswer(null);
      setInlineLayout("dar");
    },
    [editingSelectionId]
  );

  // Sayfa değişti: crop sıfırla, img loaded beklenir. canonicalNaturalSize = baseNaturalBySourceRef
  useEffect(() => {
    setEditingSelectionId(null);
    setCrop(undefined);
    setCompletedCrop(null);
    pendingAddPercentCropRef.current = null;
    editingCropRef.current = null;
    setImgLoaded(false);
    setNaturalImageSize(null);
  }, [pageUrl]);

  // İlk sayfa yüklendiğinde natural size cache'le; sayfa değişince aynı base kullan
  useEffect(() => {
    if (!selectedSource || !imgLoaded || !naturalImageSize) return;
    const base = baseNaturalBySourceRef.current[selectedSource];
    if (!base) {
      baseNaturalBySourceRef.current[selectedSource] = { ...naturalImageSize };
    }
  }, [selectedSource, pageUrl, imgLoaded, naturalImageSize]);

  useEffect(() => {
    baseNaturalBySourceRef.current = {};
  }, [selectedSource]);

  const ZOOM_MIN = 10;
  const ZOOM_MAX = 400;
  const ZOOM_STEP = 10;

  // PDF değiştiğinde: saklı zoom varsa kullan, yoksa %100 (gerçek boyut) ile aç
  useLayoutEffect(() => {
    if (!selectedSource || !pageUrl) return;
    const storedZoom = getZoomForSource(selectedSource);
    if (storedZoom != null) {
      setZoom(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, storedZoom)));
      return;
    }
    setZoom(100);
    setZoomForSource(selectedSource, 100);
  }, [selectedSource, pageUrl]);

  const zoomIn = useCallback(() => {
    setZoom((z) => {
      const next = Math.min(ZOOM_MAX, z + ZOOM_STEP);
      if (selectedSource) setZoomForSource(selectedSource, next);
      return next;
    });
  }, [selectedSource]);
  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const next = Math.max(ZOOM_MIN, z - ZOOM_STEP);
      if (selectedSource) setZoomForSource(selectedSource, next);
      return next;
    });
  }, [selectedSource]);

  const applyFitByWidth = useCallback(() => {
    if (!selectedSource || !viewerSize || !hasCanonicalSize || !canonicalNaturalSize) return;
    const availW = Math.max(1, viewerSize.w - VIEWER_PADDING);
    const zoomVal = computeFitZoomByWidth(
      availW,
      canonicalNaturalSize.w,
      canonicalNaturalSize.h
    );
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomVal));
    setZoom(clamped);
    setZoomForSource(selectedSource, clamped);
  }, [selectedSource, viewerSize, hasCanonicalSize, canonicalNaturalSize]);

  const applyFitByHeight = useCallback(() => {
    if (!selectedSource || !viewerSize || !hasCanonicalSize || !canonicalNaturalSize) return;
    const availH = Math.max(1, viewerSize.h - VIEWER_PADDING);
    const zoomVal = computeFitZoomByHeight(
      availH,
      canonicalNaturalSize.w,
      canonicalNaturalSize.h
    );
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomVal));
    setZoom(clamped);
    setZoomForSource(selectedSource, clamped);
  }, [selectedSource, viewerSize, hasCanonicalSize, canonicalNaturalSize]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!hasSource) return;
      const isZoomIn = (e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+" || e.key === "Add");
      const isZoomOut = (e.ctrlKey || e.metaKey) && (e.key === "-" || e.key === "Subtract");
      if (isZoomIn) {
        e.preventDefault();
        e.stopPropagation();
        zoomIn();
      } else if (isZoomOut) {
        e.preventDefault();
        e.stopPropagation();
        zoomOut();
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (!hasSource || !(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY < 0) zoomIn();
      else if (e.deltaY > 0) zoomOut();
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("wheel", onWheel, { capture: true, passive: false });
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      window.removeEventListener("wheel", onWheel, { capture: true });
    };
  }, [hasSource, zoomIn, zoomOut]);

  const handleChoiceCountSelect = (n: 3 | 4 | 5) => {
    setChoiceCount(n);
    setChoiceCountState(n);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-slate-900" tabIndex={0}>
      {/* Top toolbar */}
      <div className="flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b border-slate-700 bg-slate-800 px-3 py-2 sm:gap-4 sm:px-4">
        <select
          value={selectedSource}
          onChange={(e) => {
            const val = e.target.value;
            if (selectedSource) {
              if (currentPage >= 1) setPageIndex(selectedSource, currentPage);
              setZoomForSource(selectedSource, zoom);
            }
            setSelectedSource(val);
            setLastSelectedSource(val);
            const page = val
              ? (getPageIndex(val) ?? pdfPageIndicesRef.current[val] ?? 1)
              : 1;
            setCurrentPage(page);
            const storedZoom = val ? getZoomForSource(val) : undefined;
            if (storedZoom != null) setZoom(storedZoom);
          }}
          className="min-w-[12rem] rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white"
        >
          <option value="">PDF seçin</option>
          {localPdfs.map((pdf) => (
            <option key={pdf.id} value={`local:${pdf.id}`}>
              📁 {pdf.filename}
            </option>
          ))}
          {localImages.map((img) => (
            <option key={img.id} value={`local:${img.id}`}>
              🖼 {img.filename}
            </option>
          ))}
        </select>

        <input
          ref={localPdfInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={handleLocalPdfSelect}
          className="hidden"
        />
        <input
          ref={localImageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleLocalImageSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => localPdfInputRef.current?.click()}
          disabled={localPdfLoading}
          className="rounded-lg border border-emerald-600 bg-emerald-900/40 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-800/60 disabled:opacity-50"
          title="PDF sunucuya yüklenmez, tarayıcıda işlenir"
        >
          {localPdfLoading ? "Yükleniyor…" : "PDF Ekle (Local)"}
        </button>
        <button
          type="button"
          onClick={() => localImageInputRef.current?.click()}
          disabled={localImageLoading}
          className="rounded-lg border border-sky-600 bg-sky-900/40 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-800/60 disabled:opacity-50"
          title="JPG, PNG, WebP resim dosyasından kırpma"
        >
          {localImageLoading ? "Yükleniyor…" : "Resim Ekle (JPG/PNG)"}
        </button>

        <button
          type="button"
          onClick={() => setShowLocalDeleteModal(true)}
          className="rounded-lg border border-amber-600 bg-amber-900/30 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-800/50"
          title="Local PDF / Resim listeden çıkar"
        >
          Local PDF Kaldır
        </button>

        <button
          type="button"
          onClick={() => setShowSelectionsPanel((v) => !v)}
          className="rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600"
        >
          Soruları Listele
          {pendingSelections.length > 0 && (
            <>
              <span> ({pendingSelections.length})</span>
              {cevapsizCount > 0 && (
                <span className="ml-1 rounded bg-amber-600/60 px-1.5 py-0.5 text-amber-100">
                  {cevapsizCount} cevapsız
                </span>
              )}
            </>
          )}
        </button>
        {hasSource && (
          <span className="text-xs text-slate-400">Toplam Soru: {pendingSelections.length}</span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-500"
          >
            Ana Editöre Dön
          </button>
        </div>
      </div>

      {/* Main canvas + optional selections panel */}
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${showSelectionsPanel ? "border-r border-slate-700" : ""}`}
        >
          {/* Large central viewer - Başta sayfaya sığar, zoom sonrası scrollbar ile yukarı/aşağı/sağa/sola kaydırılır */}
          <div
            ref={viewerRef}
            className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain bg-slate-900 p-6"
          >
            {!hasSource ? (
              <div className="flex min-h-full min-w-full items-center justify-center">
                <div className="rounded-xl border-2 border-dashed border-slate-600 bg-slate-800/50 p-12 text-center">
                  <p className="text-slate-400">PDF seçin veya ekleyin</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => localPdfInputRef.current?.click()}
                      disabled={localPdfLoading}
                      className="rounded-lg border border-emerald-600 bg-emerald-900/40 px-6 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-800/60 disabled:opacity-50"
                    >
                      PDF Ekle (Local)
                    </button>
                    <button
                      type="button"
                      onClick={() => localImageInputRef.current?.click()}
                      disabled={localImageLoading}
                      className="rounded-lg border border-sky-600 bg-sky-900/40 px-6 py-2 text-sm font-medium text-sky-300 hover:bg-sky-800/60 disabled:opacity-50"
                    >
                      Resim Ekle (JPG/PNG)
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="flex shrink-0 items-start justify-center overflow-visible"
                style={{
                  minWidth: "100%",
                  minHeight: "100%",
                  width: displayedSize.w,
                  height: displayedSize.h,
                }}
              >
                <div
                  className="relative shrink-0 overflow-visible [&_.ReactCrop]:!max-w-none [&_.ReactCrop__child-wrapper]:!max-w-none [&_.ReactCrop__child-wrapper>img]:!max-w-none [&_.ReactCrop__child-wrapper>img]:!max-h-none"
                  style={{
                    width: displayedSize.w,
                    height: displayedSize.h,
                  }}
                >
                {!imgLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                    <span className="text-slate-400">Yükleniyor…</span>
                  </div>
                )}
                <div className="relative h-full w-full overflow-visible">
                  <div
                  className="crop-workspace relative h-full w-full overflow-visible"
                  style={{
                    zIndex: completedCrop && !editingSelectionId ? 20 : 0,
                  }}
                >
                    <ReactCrop
                    key={pageUrl}
                    crop={crop}
                    onChange={(c, percentCrop) => {
                      setCrop(c);
                      if (editingSelectionId && percentCrop) {
                        const box = percentCropToNormalizedRect(percentCrop);
                        editingCropRef.current = box;
                        setPendingSelections((prev) =>
                          prev.map((s) =>
                            s.id === editingSelectionId ? { ...s, crop: box } : s
                          )
                        );
                      }
                    }}
                    onComplete={handleCropComplete}
                    className="cursor-crosshair"
                    renderSelectionAddon={
                      completedCrop && !editingSelectionId
                        ? () => (
                            <div className="absolute left-1/2 top-full z-30 mt-3 -translate-x-1/2 overflow-visible pointer-events-auto">
                              <AnswerMarkPanel
                                selectedAnswer={inlineSelectedAnswer}
                                onSelectAnswer={setInlineSelectedAnswer}
                                layout={inlineLayout}
                                onLayoutChange={setInlineLayout}
                                choiceCount={choiceCount}
                                onCancel={resetInlineCropUi}
                                onConfirm={() => handleAnswerPicked(inlineSelectedAnswer)}
                              />
                            </div>
                          )
                        : undefined
                    }
                  >
                    <img
                      ref={imgRef}
                      src={pageUrl!}
                      alt={`Sayfa ${currentPage}`}
                      onLoad={onImageLoad}
                      className="block rounded border border-slate-600 object-fill shadow-2xl"
                      style={{
                        width: displayedSize.w,
                        height: displayedSize.h,
                        display: "block",
                      }}
                    />
                  </ReactCrop>
                  </div>
                  {pageRenderReady && (
                    <SelectionOverlay
                      selections={pendingSelections}
                      currentPdfId={null}
                      currentLocalPdfId={selectedLocalPdf?.id ?? selectedLocalImage?.id ?? null}
                      currentPage={currentPage}
                      displayedW={displayedSize.w}
                      displayedH={displayedSize.h}
                      editingSelectionId={editingSelectionId}
                      choiceCount={choiceCount}
                      onStartEdit={handleStartEditSelection}
                      onEndEdit={handleEndEditSelection}
                      onAnswerChange={handleAnswerChange}
                      onDelete={handleDeleteSelection}
                      onLayoutChange={handleLayoutChange}
                    />
                  )}
                </div>
              </div>
            </div>
            )}
          </div>

          {/* Bottom toolbar - gruplar: Sayfa | Soru | Görüntüleme */}
          <div className="flex h-14 min-w-0 shrink-0 items-center gap-2 overflow-hidden border-t border-slate-700 bg-slate-800 px-4">
            {/* Grup: Sayfa navigasyonu */}
            <div className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="rounded border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-white disabled:opacity-40"
              >
                Önceki
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                disabled={currentPage >= pageCount}
                className="rounded border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-white disabled:opacity-40"
              >
                Sonraki
              </button>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-slate-400">Sayfa</label>
                <select
                  value={currentPage}
                  onChange={(e) => setCurrentPage(Number(e.target.value))}
                  disabled={!pageCount}
                  className="min-w-[4rem] rounded border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm text-white disabled:opacity-50"
                >
                  {Array.from({ length: pageCount || 0 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-400">/ {pageCount}</span>
              </div>
            </div>

            <div className="h-8 w-px shrink-0 bg-slate-600" aria-hidden="true" />

            {/* Grup: Soru ayarları */}
            <div className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2">
              <span className="text-xs text-slate-400">Şık sayısı</span>
              {([3, 4, 5] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleChoiceCountSelect(n)}
                  className={`rounded px-3 py-1.5 text-xs font-medium ${
                    choiceCount === n
                      ? "border border-orange-500 bg-orange-600 text-white"
                      : "border border-slate-600 bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {n} şıklı
                </button>
              ))}
            </div>

            <div className="h-8 w-px shrink-0 bg-slate-600" aria-hidden="true" />

            <div className="flex-1 min-w-0" />

            {/* Grup: Görüntüleme (sığdır + zoom) */}
            <div className="flex items-center gap-3 rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Sayfaya sığdır</span>
                <button
                  type="button"
                  onClick={applyFitByWidth}
                  disabled={!hasSource || !hasCanonicalSize}
                  className="rounded border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs text-white hover:bg-slate-600 disabled:opacity-50"
                  title="Genişlik sayfaya sığacak şekilde zoom"
                >
                  Genişlik
                </button>
                <button
                  type="button"
                  onClick={applyFitByHeight}
                  disabled={!hasSource || !hasCanonicalSize}
                  className="rounded border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs text-white hover:bg-slate-600 disabled:opacity-50"
                  title="Yükseklik sayfaya sığacak şekilde zoom"
                >
                  Yükseklik
                </button>
              </div>
              <div className="h-6 w-px bg-slate-600" aria-hidden="true" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Zoom</span>
                <button
                  type="button"
                  onClick={zoomOut}
                  disabled={!hasSource || zoom <= ZOOM_MIN}
                  className="flex h-8 w-8 items-center justify-center rounded border border-slate-600 bg-slate-700 text-lg font-bold text-white hover:bg-slate-600 disabled:opacity-40"
                  title="Zoom out (Ctrl+-)"
                >
                  −
                </button>
                <input
                  type="range"
                  min={ZOOM_MIN}
                  max={ZOOM_MAX}
                  step={ZOOM_STEP}
                  value={Math.min(zoom, ZOOM_MAX)}
                  onChange={(e) => {
                    const val = Math.min(ZOOM_MAX, Number(e.target.value));
                    setZoom(val);
                    if (selectedSource) setZoomForSource(selectedSource, val);
                  }}
                  className="h-2 w-24 accent-blue-500"
                />
                <button
                  type="button"
                  onClick={zoomIn}
                  disabled={!hasSource || zoom >= ZOOM_MAX}
                  className="flex h-8 w-8 items-center justify-center rounded border border-slate-600 bg-slate-700 text-lg font-bold text-white hover:bg-slate-600 disabled:opacity-40"
                  title="Zoom in (Ctrl++)"
                >
                  +
                </button>
                <span className="w-10 text-sm text-slate-300">{zoom}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selections panel */}
        {showSelectionsPanel && (
          <div className="w-72 shrink-0 overflow-auto border-l border-slate-700 bg-slate-800 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-white">Seçilen sorular</h4>
              <button
                type="button"
                disabled={pendingSelections.length === 0 && questions.length === 0}
                onClick={() => clearAllSelections()}
                className="shrink-0 rounded-md border border-slate-600 bg-slate-700/80 px-2 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                title="Ana sayfa ve kırpma listesindeki tüm soruları temizle"
              >
                Sıfırla
              </button>
            </div>
            <p className="mb-1 text-[0.625rem] text-slate-400">Sürükle-bırak ile sıralama</p>
            <p className="mb-2 text-[0.625rem] text-slate-400">Toplam: {pendingSelections.length} soru</p>
            {pendingSelections.length === 0 ? (
              <p className="text-xs text-slate-400">Henüz seçim yok</p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e: DragEndEvent) => {
                  const { active, over } = e;
                  if (!over || active.id === over.id) return;
                  const from = pendingSelections.findIndex((s) => s.id === active.id);
                  const to = pendingSelections.findIndex((s) => s.id === over.id);
                  if (from < 0 || to < 0 || from === to) return;
                  const next = [...pendingSelections];
                  const [removed] = next.splice(from, 1);
                  next.splice(to, 0, removed);
                  const renumbered = next.map((s, i) => ({ ...s, number: i + 1 }));
                  setPendingSelections(renumbered);
                  reorderQuestions(renumbered.map((s) => s.id));
                }}
              >
                <SortableContext items={pendingSelections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-2">
                    {pendingSelections.map((s) => (
                        <SortableSelectionItem
                          key={s.id}
                          sel={s}
                          localFilename={s.localFilename}
                          onRemove={removePending}
                          onNavigate={(sourceValue, pageNumber) => {
                            const id = sourceValue.startsWith("local:")
                              ? sourceValue.slice(6)
                              : "";
                            if (!getLocalPdf(id) && !getLocalImage(id)) {
                              setError("PDF kaldırılmış. Bu soruya gidemezsiniz.");
                              return;
                            }
                            setError(null);
                            setSelectedSource(sourceValue);
                            setLastSelectedSource(sourceValue);
                            setPageIndex(sourceValue, pageNumber);
                            setCurrentPage(pageNumber);
                          }}
                        />
                      ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-lg bg-rose-900/90 px-4 py-2 text-sm text-white">
          {error}
        </div>
      )}

      <LocalPdfDeleteModal
        open={showLocalDeleteModal}
        onClose={() => {
          setShowLocalDeleteModal(false);
          setError(null);
          setLocalPdfs(listLocalPdfs());
        }}
        onPdfRemoved={handleLocalPdfRemoved}
        localPdfIdsWithQuestions={[
          ...new Set([
            ...pendingSelections.filter((s) => s.isLocal && s.localPdfId).map((s) => s.localPdfId!),
            ...questions.flatMap((q) => {
              const lid = (q as { localPdfId?: string }).localPdfId ?? getLocalSourceForQuestion(q.id)?.localPdfId;
              return lid ? [lid] : [];
            }),
          ]),
        ]}
      />
    </div>
  );
}
