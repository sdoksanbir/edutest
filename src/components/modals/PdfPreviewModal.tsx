import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { api, type LayoutItem } from "../../api/client";
import {
  columnContentRectsPx,
  columnIndexFromQuestionXPt,
  computePageColumnBand,
  contentTopPtForColumn,
  FOOTER_TOP_OFFSET_MM,
  mmToPdfPt,
  questionNumberImageGapPt,
  type LayoutGeometryInput,
} from "../../utils/pdfLayoutGeometry";
import {
  getColumnItemsSortedTopFirst,
  redistributeColumnQuestions,
  reflowLayoutWithFixedGapMm,
  restoreLayoutItemsByOrderIndices,
  shiftLayoutBelowFirstPageHeader,
} from "../../utils/columnRedistribute";
import PageStructurePanel from "../preview/PageStructurePanel";
import { DEFAULT_QUESTION_GAP_MM } from "../../utils/pageStructureHelpers";
import AlignmentSpacingSliders from "../preview/AlignmentSpacingSliders";
import AnswerKeyFooterPanel from "../preview/AnswerKeyFooterPanel";
import YonergePanel from "../preview/YonergePanel";
import OptikFormSidebar from "../preview/OptikFormSidebar";
import { questionsInLayoutReadingOrder } from "../../utils/optikFormOrder";
import { countOptikFormPages } from "../../utils/optikFormSettings";
import ColumnOverlaySelector from "../pdf/ColumnOverlaySelector";
import ColumnRedistributePopover, {
  type ColumnRedistributeMode,
} from "./ColumnRedistributePopover";
import { useEditorStore } from "../../store/editorStore";
import { getPaperSizePayload } from "../../utils/paperSizePayload";
import {
  emptyWrittenHeaderFieldHidden,
  emptyWrittenHeaderFieldLabels,
  emptyWrittenHeaderFieldLines,
  type WrittenHeaderFieldHidden,
  type WrittenHeaderFieldLabels,
  type WrittenHeaderFieldLines,
} from "../../constants/writtenHeaderFields";
import { bookletLetterFromGroup, buildWrittenPaperTitle } from "../../utils/writtenPaperTitle";
import { buildPdfExportPayload } from "../../utils/buildPdfExportPayload";
import { resolveThemedHeaderLogoUrl } from "../../utils/presetLogoRecolor";
import { resolveLayoutFetchSkipImages } from "../../utils/pdfPreviewFetchOptions";
import { isCorporateHeader } from "../../utils/corporateHeaderLayout";
import { mergeHeaderBadgeConfig } from "../../utils/headerBadgeByStyle";
import { resolveClassicBannerAndInfoHeightPt } from "../../utils/bannerRightMode";
import { normalizeHeaderStyleId } from "../../utils/headerStyles";
import { pdfPreviewTheme as theme } from "../../styles/pdfPreviewTheme";
import type { QuestionItem } from "../../types";
import SectionAddModal from "./SectionAddModal";
import ConfirmModal from "./ConfirmModal";
import CanvasPdfPreview from "../pdf/CanvasPdfPreview";
import PdfPreviewBannerOverlay from "../pdf/PdfPreviewBannerOverlay";
import ThemeCustomizerSidebar from "../preview/ThemeCustomizerSidebar";
import { PdfPreviewScrollSessionProvider } from "../preview/PdfPreviewScrollSessionContext";
import PdfPreviewPanelCollapseButton from "../preview/PdfPreviewPanelCollapseButton";
import PdfPreviewPanelRailButton from "../preview/PdfPreviewPanelRailButton";
import PdfPreviewPanelHeader from "../preview/PdfPreviewPanelHeader";
import { CollapseGroupProvider } from "../preview/CollapsibleCard";
import AppTopBar from "../layout/AppTopBar";
import { usePdfThumbCanvasWidthPx } from "../../hooks/useCompactViewport";
import {
  PdfPreviewThemeToggle,
  PdfPreviewUiThemeProvider,
  usePdfPreviewUi,
} from "../preview/PdfPreviewUiThemeContext";
import PdfCanvasViewer from "../pdf/PdfCanvasViewer";
import PdfPreviewZoomControl from "../pdf/PdfPreviewZoomControl";
import { maxQuestionNumberTextWidthPt } from "../../utils/questionNumberMetrics";
import { loadPdfFromBytes } from "../../utils/pdfClient";

type VerifiedPdfDoc = Awaited<ReturnType<typeof loadPdfFromBytes>>["doc"];
import QuestionVerticalDragOverlay from "../pdf/QuestionVerticalDragOverlay";
import QuestionGapIndicatorOverlay from "../pdf/QuestionGapIndicatorOverlay";
import { countSeparateAnswerKeyPages } from "../../utils/separateAnswerKeyPageCount";
import {
  applyDisplayScalePreviewToLayout,
  applyImgYTopToLayoutItem,
  layoutItemToCanvasRect,
  type QuestionDragLive,
} from "../../utils/questionVerticalDrag";
import {
  DISPLAY_SCALE_MAX_PCT,
  DISPLAY_SCALE_NEUTRAL_PCT,
  clampDisplayScalePct,
} from "../../utils/displayScale";
import {
  clampDisplayScalePctToColumn,
  tryReflowAfterQuestionScale,
} from "../../utils/displayScaleColumn";
import type { ColumnShiftDirection } from "../../utils/columnShift";
import {
  finalizePreviewLayout,
  tryColumnShiftPlacement,
  type LayoutPlacementOverride,
  type TryColumnShiftOk,
} from "../../utils/columnShiftPlacement";
import { reapplyDisplayNumbersByReadingOrder } from "../../utils/layoutDisplayNumbers";
import { questionIdsInPlacementAffectedColumns } from "../../utils/layoutYTopOverridesPayload";
import { mergeLayoutImagesFromQuestions } from "../../utils/layoutImageMerge";
import { isQuestionGapLayoutDirty } from "../../utils/questionGapReset";
import { resolveWatermarkAngleDeg } from "../../utils/visualProperties";

/** Canvas / layout — 96 DPI CSS px ↔ PDF pt */
const PREVIEW_PT_TO_PX = 96 / 72;

function previewSharpnessForQuality(q: "normal" | "high" | "best"): number {
  if (q === "best") return 2.5;
  if (q === "normal") return 1.5;
  return 2;
}

type PdfPreviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Yazılı: başlık şablonu + öğretmen satırı; deneme: cevap anahtarı ayrı sayfa şablonu */
  variant?: "test" | "written" | "trial";
};

function writtenFieldLinesPayload(lines: WrittenHeaderFieldLines) {
  return {
    ad_soyad: [...lines.ad_soyad],
    numara: [...lines.numara],
    puan: [...lines.puan],
    sinif: [...lines.sinif],
    grup: [...lines.grup],
  };
}

function writtenFieldHiddenPayload(hidden: WrittenHeaderFieldHidden) {
  return {
    ad_soyad: !!hidden.ad_soyad,
    numara: !!hidden.numara,
    puan: !!hidden.puan,
    sinif: !!hidden.sinif,
    grup: !!hidden.grup,
  };
}

function writtenFieldLabelsPayload(labels: WrittenHeaderFieldLabels) {
  return {
    ad_soyad: (labels.ad_soyad ?? "").trim(),
    numara: (labels.numara ?? "").trim(),
    puan: (labels.puan ?? "").trim(),
    sinif: (labels.sinif ?? "").trim(),
    grup: (labels.grup ?? "").trim(),
  };
}

const { colors, sizes, font, fontWeight, lineHeight, fontFamily } = theme;

const PAGES_THUMBNAILS_PANEL_ENABLED = false;

/** PDF önizleme modalı - tema ile boyutlandırma ve renklendirme */
export default function PdfPreviewModal(props: PdfPreviewModalProps) {
  if (!props.isOpen) return null;
  return createPortal(
    <PdfPreviewUiThemeProvider>
      <PdfPreviewModalContent {...props} />
    </PdfPreviewUiThemeProvider>,
    document.body,
  );
}

function PdfPreviewModalContent({ isOpen, onClose, variant = "test" }: PdfPreviewModalProps) {
  const { tokens: ui, mode: uiMode } = usePdfPreviewUi();
  const navigate = useNavigate();
  const isWritten = variant === "written";
  const isTrial = variant === "trial";
  const questions = useEditorStore((s) => s.questions);
  const testName = useEditorStore((s) => s.testName);
  const schoolName = useEditorStore((s) => s.schoolName);
  const options = useEditorStore((s) => s.options);
  const centerLineText = useEditorStore((s) => s.centerLineText);
  const centerLineBold = useEditorStore((s) => s.centerLineBold);
  const centerLineItalic = useEditorStore((s) => s.centerLineItalic);
  const centerLineTextDirection = useEditorStore((s) => s.centerLineTextDirection);
  const descriptionColumnCount = useEditorStore((s) => s.descriptionColumnCount);
  const descriptionTexts = useEditorStore((s) => s.descriptionTexts);
  const descriptionColumnDividers = useEditorStore((s) => s.descriptionColumnDividers);
  const questionGapMm = useEditorStore((s) => s.questionGapMm);
  const questionGapMinMm = useEditorStore((s) => s.questionGapMinMm);
  const autoCompactSpacing = useEditorStore((s) => s.autoCompactSpacing);
  const setQuestionGapMm = useEditorStore((s) => s.setQuestionGapMm);
  const setQuestionGapMinMm = useEditorStore((s) => s.setQuestionGapMinMm);
  const setAutoCompactSpacing = useEditorStore((s) => s.setAutoCompactSpacing);
  const headerStyleId = useEditorStore((s) => s.headerStyleId);
  const headerConfig = useEditorStore((s) => s.headerConfig);
  const themeColor = useEditorStore((s) => s.themeColor);
  const answerKeyMode = useEditorStore((s) => s.answerKeyMode);
  const optikFormEnabled = useEditorStore((s) => s.optikFormEnabled);
  const optikFormPlacement = useEditorStore((s) => s.optikFormPlacement);
  const optikFormOptionCount = useEditorStore((s) => s.optikFormOptionCount);
  const optikFormBookletType = useEditorStore((s) => s.optikFormBookletType);
  const optikFormInstructionEnabled = useEditorStore((s) => s.optikFormInstructionEnabled);
  const optikFormInstructionText = useEditorStore((s) => s.optikFormInstructionText);
  const optikFormNetRule = useEditorStore((s) => s.optikFormNetRule);
  const reorderQuestions = useEditorStore((s) => s.reorderQuestions);
  const applyQuestionLineHeightMatch = useEditorStore((s) => s.applyQuestionLineHeightMatch);
  const restoreQuestionsScaleSnapshot = useEditorStore((s) => s.restoreQuestionsScaleSnapshot);
  const setQuestionDisplayScale = useEditorStore((s) => s.setQuestionDisplayScale);
  const setQuestionsDisplayScale = useEditorStore((s) => s.setQuestionsDisplayScale);
  const sections = useEditorStore((s) => s.sections);
  const paperSize = useEditorStore((s) => s.paperSize);
  const paperWidthMm = useEditorStore((s) => s.paperWidthMm);
  const paperHeightMm = useEditorStore((s) => s.paperHeightMm);
  const orientation = useEditorStore((s) => s.orientation);
  const columns = useEditorStore((s) => s.columns);
  const targetQuestionLinePt = useEditorStore((s) => s.targetQuestionLinePt);
  const allowSlightOverflow = useEditorStore((s) => s.allowSlightOverflow);
  const setAllowSlightOverflow = useEditorStore((s) => s.setAllowSlightOverflow);
  const watermarkEnabled = useEditorStore((s) => s.watermarkEnabled);
  const watermarkSettings = useEditorStore((s) => s.watermarkSettings);
  const showColumnDivider = useEditorStore((s) => s.showColumnDivider);
  const columnDividerText = useEditorStore((s) => s.columnDividerText);
  const columnDividerColor = useEditorStore((s) => s.columnDividerColor);
  const columnDividerWidthPt = useEditorStore((s) => s.columnDividerWidthPt);
  const showColumnDividerText = useEditorStore((s) => s.showColumnDividerText);
  const showWatermark = useEditorStore((s) => s.showWatermark);
  const watermarkText = useEditorStore((s) => s.watermarkText);
  const watermarkLayout = useEditorStore((s) => s.watermarkLayout);
  const watermarkAngleDeg = useEditorStore((s) => s.watermarkAngleDeg);
  const watermarkOpacity = useEditorStore((s) => s.watermarkOpacity);
  const watermarkSize = useEditorStore((s) => s.watermarkSize);
  const watermarkLogoUrl = useEditorStore((s) => s.watermarkLogoUrl);
  const showPageFrame = useEditorStore((s) => s.showPageFrame);
  const pageFrameColorMode = useEditorStore((s) => s.pageFrameColorMode);
  const pageFrameColor = useEditorStore((s) => s.pageFrameColor);
  const pageFrameWidthPt = useEditorStore((s) => s.pageFrameWidthPt);
  const pageFrameInnerGapMm = useEditorStore((s) => s.pageFrameInnerGapMm);
  const pageFrameCornerRadiusMm = useEditorStore((s) => s.pageFrameCornerRadiusMm);
  const pageFrameLineStyle = useEditorStore((s) => s.pageFrameLineStyle);
  const marginTopMm = useEditorStore((s) => s.marginTopMm);
  const marginBottomMm = useEditorStore((s) => s.marginBottomMm);
  const marginLeftMm = useEditorStore((s) => s.marginLeftMm);
  const marginRightMm = useEditorStore((s) => s.marginRightMm);
  const questionNumberingEnabled = useEditorStore((s) => s.questionNumberingEnabled);
  const questionNumberStart = useEditorStore((s) => s.questionNumberStart);
  const questionNumberColorMode = useEditorStore((s) => s.questionNumberColorMode);
  const questionNumberFontPt = useEditorStore((s) => s.questionNumberFontPt);
  const pageNumberingEnabled = useEditorStore((s) => s.pageNumberingEnabled);
  const pageNumberStart = useEditorStore((s) => s.pageNumberStart);
  const pageNumberFormat = useEditorStore((s) => s.pageNumberFormat);
  const examType = useEditorStore((s) => s.examType);
  const classSection = useEditorStore((s) => s.classSection);
  const group = useEditorStore((s) => s.group);
  const writtenPaperOptions = useEditorStore((s) => s.writtenPaperOptions);
  const teacherNames = useEditorStore((s) => s.teacherNames);
  const writtenHeaderFieldLines = useEditorStore((s) => s.writtenHeaderFieldLines);
  const writtenHeaderFieldLabels = useEditorStore((s) => s.writtenHeaderFieldLabels);
  const writtenHeaderFieldHidden = useEditorStore((s) => s.writtenHeaderFieldHidden);
  const mergeLayoutYTopOverridesByQuestionId = useEditorStore(
    (s) => s.mergeLayoutYTopOverridesByQuestionId
  );
  const clearLayoutYTopOverrides = useEditorStore((s) => s.clearLayoutYTopOverrides);
  const clearLayoutPlacementOverrides = useEditorStore((s) => s.clearLayoutPlacementOverrides);
  const mergeLayoutPlacementOverridesByQuestionId = useEditorStore(
    (s) => s.mergeLayoutPlacementOverridesByQuestionId
  );
  const layoutPlacementOverridesByQuestionId = useEditorStore(
    (s) => s.layoutPlacementOverridesByQuestionId
  );
  const layoutYTopOverridesByQuestionIdPt = useEditorStore(
    (s) => s.layoutYTopOverridesByQuestionIdPt
  );
  const removeLayoutYTopOverridesForQuestionIds = useEditorStore(
    (s) => s.removeLayoutYTopOverridesForQuestionIds
  );
  const headerBottomGapMm = useEditorStore((s) => s.headerBottomGapMm);
  const otherPageHeaderBottomGapMm = useEditorStore((s) => s.otherPageHeaderBottomGapMm);
  const setOtherPageHeaderBottomGapMm = useEditorStore((s) => s.setOtherPageHeaderBottomGapMm);
  const setHeaderBottomGapMm = useEditorStore((s) => s.setHeaderBottomGapMm);
  const questionNumberLeftOffsetMm = useEditorStore((s) => s.questionNumberLeftOffsetMm);
  const setQuestionNumberLeftOffsetMm = useEditorStore((s) => s.setQuestionNumberLeftOffsetMm);
  const questionNumberImageGapMm = useEditorStore((s) => s.questionNumberImageGapMm);
  const setQuestionNumberImageGapMm = useEditorStore((s) => s.setQuestionNumberImageGapMm);

  const writtenTitleForPreview = useMemo(
    () =>
      buildWrittenPaperTitle({
        schoolName: schoolName ?? "",
        classSection,
        testName: testName ?? "",
        examType,
      }),
    [schoolName, classSection, testName, examType]
  );

  /** Yazılı ve deneme sınavında cevap anahtarı ayrı sayfada (footer’da değil) */
  const previewAnswerKeyMode = useMemo(() => {
    if ((isWritten || isTrial) && options.includeAnswerKey) return "separate_page" as const;
    return (answerKeyMode ?? "per_page") as "per_page" | "separate_page" | "end_of_test";
  }, [isWritten, isTrial, options.includeAnswerKey, answerKeyMode]);

  /** Seçenek açıkken en az bir imza satırı (boş da olsa); aksi halde önizleme/PDF bloğu hiç çizilmiyordu */
  const writtenTeachersForPreview = useMemo(() => {
    const mapped = teacherNames.map((t) => ({ name: t.name ?? "", title: t.title ?? "" }));
    if (!writtenPaperOptions.addTeacherName) return [];
    return mapped.length > 0 ? mapped : [{ name: "", title: "" }];
  }, [teacherNames, writtenPaperOptions.addTeacherName]);
  const writtenShowTeachers = isWritten && writtenPaperOptions.addTeacherName;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [layoutReady, setLayoutReady] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(0);
  const [selectedQuestionOrders, setSelectedQuestionOrders] = useState<number[]>([0]);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [layout, setLayout] = useState<LayoutItem[]>([]);
  const [pageWpt, setPageWpt] = useState(595.28);
  const [pageHpt, setPageHpt] = useState(841.89);
  const [quality, setQuality] = useState<"normal" | "high" | "best">("high");
  const [showThumbnailsPanel, setShowThumbnailsPanel] = useState(false);
  const [showLeftEditPanel, setShowLeftEditPanel] = useState(true);
  const [showRightThemePanel, setShowRightThemePanel] = useState(true);
  const [showOptikFormPanel, setShowOptikFormPanel] = useState(false);
  const [leftCollapseEpoch, setLeftCollapseEpoch] = useState(0);
  const [leftExpandEpoch, setLeftExpandEpoch] = useState(0);
  const thumbCanvasWidthPx = usePdfThumbCanvasWidthPx();
  const [columnAdjustEnabled, setColumnAdjustEnabled] = useState(false);
  const [columnPanel, setColumnPanel] = useState<{
    pageNum: number;
    columnIndex0: number;
    anchor: { x: number; y: number };
  } | null>(null);
  const [columnRedistBaseLayout, setColumnRedistBaseLayout] = useState<LayoutItem[] | null>(null);
  const [columnRedistPreviewActive, setColumnRedistPreviewActive] = useState(false);
  const [columnRedistMode, setColumnRedistMode] = useState<ColumnRedistributeMode>("equal");
  /** Önceki varsayılan 24 CSS px ≈ 18 pt ≈ 6,35 mm (soru boşluğu birimi: mm) */
  const [columnBottomGapMmInput, setColumnBottomGapMmInput] = useState("6.35");
  const [columnDistInlineError, setColumnDistInlineError] = useState<string | null>(null);
  const [columnShiftError, setColumnShiftError] = useState<string | null>(null);
  /** Panel açıldığı layout — Sıfırla her zaman buraya döner (state güncellemelerinden etkilenmez). */
  const columnPanelOpenLayoutRef = useRef<LayoutItem[] | null>(null);
  /** Tıklanan sütundaki order_index listesi — sütun eşlemesi hatalarında da sıfırlama doğru çalışır. */
  const [columnPanelOrderIndices, setColumnPanelOrderIndices] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<LayoutItem[]>([]);
  const baseLayoutRef = useRef<LayoutItem[]>([]);
  /** Canvas layout'u oluşturulurken kullanılan soru aralığı — export ile aynı kalsın */
  const lastLayoutGapMmRef = useRef(35);
  const scalePreviewSessionRef = useRef<{
    orderIndex: number;
    baseItem: LayoutItem;
    baseScale: number;
    baseLayout: LayoutItem[];
    placementOverrides: Record<string, LayoutPlacementOverride>;
  } | null>(null);
  const bulkScaleSessionRef = useRef<{
    mode: "all" | "selected";
    entries: Array<{
      orderIndex: number;
      questionId: string;
      baseItem: LayoutItem;
      baseScale: number;
    }>;
  } | null>(null);
  const pendingDisplayScaleRef = useRef<Record<string, number>>({});
  /** Önizleme açılışındaki ölçek snapshot — “Orijinal haline dön”. */
  const originalQuestionScaleRef = useRef<
    Record<string, { display_scale: number; ocr_font_matched?: boolean; font_line_px?: number }>
  >({});
  const numOffsetDragStartRef = useRef<number | null>(null);
  const numImageGapDragStartRef = useRef<number | null>(null);
  const headerBottomGapDragStartRef = useRef<number | null>(null);
  const headerBottomGapRafRef = useRef<number | null>(null);
  const headerBottomGapPendingRef = useRef<number | null>(null);
  const otherPageHeaderBottomGapDragStartRef = useRef<number | null>(null);
  const otherPageHeaderBottomGapRafRef = useRef<number | null>(null);
  const otherPageHeaderBottomGapPendingRef = useRef<number | null>(null);
  /** Slider commit — canlı layout yeterli; fetchLayout önizlemeyi sıfırlamasın. */
  const alignmentGapSkipFetchRef = useRef<"header" | "otherPage" | null>(null);
  const questionGapSkipFetchRef = useRef(false);
  const currentPageRef = useRef(currentPage);
  const questionGapDragStartRef = useRef<number | null>(null);
  const questionGapPendingRef = useRef<number | null>(null);
  const questionGapLayoutFetchRef = useRef(0);
  const questionGapDebounceRef = useRef<number | null>(null);
  /** Önizleme açıldığındaki soru arası boşluk + layout — Sıfırla buraya döner. */
  const questionGapInitialLayoutRef = useRef<LayoutItem[] | null>(null);
  const [questionGapInitialMm, setQuestionGapInitialMm] = useState<number | null>(null);
  const [allQuestionsScaleSliderPct, setAllQuestionsScaleSliderPct] = useState(
    DISPLAY_SCALE_NEUTRAL_PCT,
  );
  const [selectedQuestionScaleSliderPct, setSelectedQuestionScaleSliderPct] = useState(
    DISPLAY_SCALE_NEUTRAL_PCT,
  );

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    setSelectedQuestionScaleSliderPct(DISPLAY_SCALE_NEUTRAL_PCT);
  }, [selectedQuestionOrders]);

  const applyPendingDisplayScales = useCallback((qs: QuestionItem[]) => {
    const pending = pendingDisplayScaleRef.current;
    if (Object.keys(pending).length === 0) return qs;
    return qs.map((x) =>
      pending[x.id] != null ? { ...x, display_scale: pending[x.id] } : x
    );
  }, []);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const pageBlockRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollFromNavRef = useRef(false);
  const suppressPageObserverRef = useRef(false);
  const previewScrollAnchorRef = useRef<{ top: number; left: number } | null>(null);
  const gapSliderScrollSessionRef = useRef(0);
  const questionDragLiveRef = useRef<QuestionDragLive | null>(null);
  const layoutLiveRef = useRef<LayoutItem[] | null>(null);
  const alignmentPreviewLiveRef = useRef<{
    headerBottomGapMm?: number;
    otherPageHeaderBottomGapMm?: number;
    leftOffsetMm?: number;
    imageGapMm?: number;
  } | null>(null);
  const canvasRedrawersRef = useRef<Map<number, () => void>>(new Map());
  const gapOverlayRedrawersRef = useRef<Map<number, () => void>>(new Map());
  const verticalOverlayRedrawersRef = useRef<Map<number, () => void>>(new Map());
  const questionDragRedrawRafRef = useRef<number | null>(null);
  const previewRedrawRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (layout.length > 0 && layoutLiveRef.current === layoutRef.current) {
      layoutLiveRef.current = null;
    }
  }, [layout]);

  const capturePreviewScroll = useCallback(() => {
    const root = previewScrollRef.current;
    if (!root) return;
    previewScrollAnchorRef.current = {
      top: root.scrollTop,
      left: root.scrollLeft,
    };
    suppressPageObserverRef.current = true;
  }, []);

  const restorePreviewScroll = useCallback(() => {
    const root = previewScrollRef.current;
    const anchor = previewScrollAnchorRef.current;
    if (!root || !anchor) return;
    if (root.scrollTop !== anchor.top) root.scrollTop = anchor.top;
    // Yatay kaydırmayı sabitleme — ortalanmış içerikte sola/sağa sıçrama yapıyor.
    if (gapSliderScrollSessionRef.current > 0) return;
    if (root.scrollLeft !== anchor.left) root.scrollLeft = anchor.left;
  }, []);

  const releasePreviewScrollLock = useCallback(() => {
    previewScrollAnchorRef.current = null;
    suppressPageObserverRef.current = false;
  }, []);

  const beginGapSliderScrollSession = useCallback(() => {
    gapSliderScrollSessionRef.current += 1;
    if (gapSliderScrollSessionRef.current !== 1) return;
    capturePreviewScroll();
  }, [capturePreviewScroll]);

  const endGapSliderScrollSession = useCallback(() => {
    if (gapSliderScrollSessionRef.current === 0) return;
    gapSliderScrollSessionRef.current -= 1;
    if (gapSliderScrollSessionRef.current > 0) return;
    restorePreviewScroll();
    queueMicrotask(() => {
      restorePreviewScroll();
      window.requestAnimationFrame(() => {
        restorePreviewScroll();
        window.requestAnimationFrame(() => {
          restorePreviewScroll();
          releasePreviewScrollLock();
        });
      });
    });
  }, [restorePreviewScroll, releasePreviewScrollLock]);

  const scheduleAllPreviewRedraw = useCallback(() => {
    if (previewRedrawRafRef.current != null) return;
    previewRedrawRafRef.current = window.requestAnimationFrame(() => {
      previewRedrawRafRef.current = null;
      canvasRedrawersRef.current.forEach((redraw) => redraw());
      gapOverlayRedrawersRef.current.forEach((redraw) => redraw());
      verticalOverlayRedrawersRef.current.forEach((redraw) => redraw());
      if (gapSliderScrollSessionRef.current > 0) {
        restorePreviewScroll();
      }
    });
  }, [restorePreviewScroll]);

  const registerCanvasRedraw = useCallback((pageNum: number, redraw: () => void) => {
    canvasRedrawersRef.current.set(pageNum, redraw);
    return () => {
      canvasRedrawersRef.current.delete(pageNum);
    };
  }, []);

  const registerGapOverlayRedraw = useCallback((pageNum: number, redraw: () => void) => {
    gapOverlayRedrawersRef.current.set(pageNum, redraw);
    return () => {
      gapOverlayRedrawersRef.current.delete(pageNum);
    };
  }, []);

  const registerVerticalOverlayRedraw = useCallback((pageNum: number, redraw: () => void) => {
    verticalOverlayRedrawersRef.current.set(pageNum, redraw);
    return () => {
      verticalOverlayRedrawersRef.current.delete(pageNum);
    };
  }, []);

  const scheduleQuestionDragRedraw = useCallback((pageNum: number) => {
    if (questionDragRedrawRafRef.current != null) return;
    questionDragRedrawRafRef.current = window.requestAnimationFrame(() => {
      questionDragRedrawRafRef.current = null;
      canvasRedrawersRef.current.get(pageNum)?.();
      gapOverlayRedrawersRef.current.get(pageNum)?.();
    });
  }, []);

  const maxQuestionPage = layout.length > 0 ? Math.max(...layout.map((l) => l.page_num ?? 1)) : 1;
  const answerKeyItemCount = useMemo(
    () => layout.filter((l) => l.display_number != null).length,
    [layout]
  );
  const optikFormQuestions = useMemo(
    () => questionsInLayoutReadingOrder(questions, layout),
    [questions, layout]
  );
  const answerKeyPages = useMemo(() => {
    if (!options.includeAnswerKey || previewAnswerKeyMode !== "separate_page") return 0;
    return countSeparateAnswerKeyPages({
      itemCount: answerKeyItemCount,
      pageHpt,
      marginTopMm,
      marginBottomMm,
    });
  }, [
    options.includeAnswerKey,
    previewAnswerKeyMode,
    answerKeyItemCount,
    pageHpt,
    marginTopMm,
    marginBottomMm,
  ]);
  const optikFormPages = useMemo(
    () =>
      countOptikFormPages(
        optikFormEnabled,
        optikFormPlacement,
        optikFormQuestions.length,
      ),
    [optikFormEnabled, optikFormPlacement, optikFormQuestions.length],
  );
  const totalPages = maxQuestionPage + answerKeyPages + optikFormPages;

  const previewScale = PREVIEW_PT_TO_PX * zoom;
  const previewPageWpx = pageWpt * previewScale;
  const previewPageHpx = pageHpt * previewScale;

  const layoutGeometryInput: LayoutGeometryInput = useMemo(
    () => ({
      pageWpt,
      pageHpt,
      marginTopMm,
      marginBottomMm,
      marginLeftMm,
      marginRightMm,
      columns,
      columnGapMm: 8,
      pageNum: 1,
      writtenPaperHeader: isWritten,
      writtenPaperTitle: isWritten ? writtenTitleForPreview : undefined,
      writtenPaperFieldLines: isWritten ? writtenHeaderFieldLines : emptyWrittenHeaderFieldLines(),
      writtenPaperFieldHidden: isWritten ? writtenHeaderFieldHidden : emptyWrittenHeaderFieldHidden(),
      includeDescription: options.includeDescription,
      descriptionColumnCount: descriptionColumnCount ?? 1,
      descriptionTexts: descriptionTexts ?? [],
      headerStyleId,
      headerConfig,
      headerBottomGapMm,
      otherPageHeaderBottomGapMm,
      questionNumberImageGapMm,
    }),
    [
      pageWpt,
      pageHpt,
      marginTopMm,
      marginBottomMm,
      marginLeftMm,
      marginRightMm,
      columns,
      isWritten,
      writtenTitleForPreview,
      writtenHeaderFieldLines,
      writtenHeaderFieldHidden,
      options.includeDescription,
      descriptionColumnCount,
      descriptionTexts,
      headerStyleId,
      headerConfig,
      headerBottomGapMm,
      otherPageHeaderBottomGapMm,
      questionNumberImageGapMm,
    ]
  );

  const handleQuestionYTopChange = useCallback(
    (
      orderIndex: number,
      imgYTopPt: number,
      phase: "move" | "commit",
      pageNum?: number,
    ) => {
      if (phase === "move") {
        if (pageNum == null) return;
        questionDragLiveRef.current = { orderIndex, imgYTopPt, pageNum };
        scheduleQuestionDragRedraw(pageNum);
        return;
      }

      const live = questionDragLiveRef.current;
      questionDragLiveRef.current = null;
      const finalY =
        live?.orderIndex === orderIndex
          ? live.imgYTopPt
          : (layoutRef.current.find((l) => l.order_index === orderIndex)?.img_y_top_pt ??
            imgYTopPt);

      setLayout((prev) => {
        const shifted = applyImgYTopToLayoutItem(prev, orderIndex, finalY);
        const next = reapplyDisplayNumbersByReadingOrder(shifted, {
          columns,
          geometry: layoutGeometryInput,
          questionNumberingEnabled,
          questionNumberStart,
          questionNumberFontPt,
          questions,
        });
        layoutRef.current = next;
        const item = next.find((l) => l.order_index === orderIndex);
        const q = questions.find((x) => x.order_index === orderIndex);
        if (item && q) mergeLayoutYTopOverridesByQuestionId({ [q.id]: item.y_top_pt });
        return next;
      });

      const redrawPage = live?.pageNum ?? pageNum;
      if (redrawPage != null) {
        window.requestAnimationFrame(() => {
          canvasRedrawersRef.current.get(redrawPage)?.();
          gapOverlayRedrawersRef.current.get(redrawPage)?.();
        });
      }
    },
    [
      questions,
      mergeLayoutYTopOverridesByQuestionId,
      columns,
      layoutGeometryInput,
      questionNumberingEnabled,
      questionNumberStart,
      questionNumberFontPt,
      scheduleQuestionDragRedraw,
    ]
  );

  const getColumnOverlayRectsPx = useCallback(
    (pageNum: number) => {
      const gi: LayoutGeometryInput = { ...layoutGeometryInput, pageNum };
      const band = computePageColumnBand(gi);
      const tops = Array.from({ length: columns }, (_, colIdx) =>
        contentTopPtForColumn({ ...gi, pageNum }, colIdx)
      );
      return columnContentRectsPx(band, pageHpt, PREVIEW_PT_TO_PX * zoom, tops);
    },
    [layoutGeometryInput, columns, pageHpt, zoom]
  );

  const scrollToPage = useCallback((pageNum: number, behavior: ScrollBehavior = "smooth") => {
    const el = pageBlockRefs.current.get(pageNum);
    if (!el) return;
    scrollFromNavRef.current = true;
    el.scrollIntoView({ behavior, block: "start" });
    window.setTimeout(() => {
      scrollFromNavRef.current = false;
    }, 500);
  }, []);

  const scrollToQuestionRegion = useCallback(
    (orderIndex: number, behavior: ScrollBehavior = "smooth") => {
      const item = layout.find((l) => l.order_index === orderIndex);
      if (!item) return;
      const pageNum = item.page_num ?? 1;

      const scrollQuestionIntoView = () => {
        const scrollRoot = previewScrollRef.current;
        const pageBlock = pageBlockRefs.current.get(pageNum);
        if (!scrollRoot || !pageBlock) return;

        const canvasShell = pageBlock.querySelector<HTMLElement>(".pdf-preview-page-canvas-shell");
        if (!canvasShell) return;

        const rect = layoutItemToCanvasRect(
          item,
          pageHpt,
          previewScale,
          questionNumberLeftOffsetMm,
          questionNumberImageGapMm,
        );
        if (!rect) return;

        const rootRect = scrollRoot.getBoundingClientRect();
        const shellRect = canvasShell.getBoundingClientRect();
        const questionTop = shellRect.top - rootRect.top + scrollRoot.scrollTop + rect.top;
        const questionBottom = questionTop + rect.height;
        const margin = 56;
        const viewTop = scrollRoot.scrollTop;
        const viewBottom = viewTop + scrollRoot.clientHeight;

        if (questionTop >= viewTop + margin && questionBottom <= viewBottom - margin) return;

        const target = questionTop - scrollRoot.clientHeight * 0.32;
        scrollFromNavRef.current = true;
        scrollRoot.scrollTo({ top: Math.max(0, target), behavior });
        window.setTimeout(() => {
          scrollFromNavRef.current = false;
        }, 500);
      };

      if (pageNum !== currentPageRef.current) {
        setCurrentPage(pageNum);
        scrollFromNavRef.current = true;
        const pageEl = pageBlockRefs.current.get(pageNum);
        pageEl?.scrollIntoView({ behavior, block: "start" });
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(scrollQuestionIntoView);
        });
      } else {
        scrollQuestionIntoView();
      }
    },
    [
      layout,
      pageHpt,
      previewScale,
      questionNumberLeftOffsetMm,
      questionNumberImageGapMm,
    ],
  );

  const goToPage = useCallback(
    (pageNum: number, behavior: ScrollBehavior = "smooth") => {
      const clamped = Math.max(1, Math.min(totalPages, pageNum));
      setCurrentPage(clamped);
      if (clamped !== currentPageRef.current) {
        scrollToPage(clamped, behavior);
      }
    },
    [totalPages, scrollToPage]
  );

  const clearQuestionSelection = useCallback(() => {
    setSelectedQuestionOrders([]);
    setSelectedQuestion(-1);
  }, []);

  const handlePreviewPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest("[data-question-hit]")) return;
      if (target.closest("[data-column-overlay]")) return;
      if (target.closest("[data-question-size-control]")) return;
      if (target.closest("[data-column-shift-arrow]")) return;
      if (target.closest("button")) return;
      if (target.closest("input")) return;
      if (target.closest("textarea")) return;
      if (!target.closest(".pdf-preview-canvas-stage")) return;
      clearQuestionSelection();
    },
    [clearQuestionSelection],
  );

  const selectQuestionOnPage = useCallback(
    (
      idx: number,
      pageNum?: number,
      options?: { additive?: boolean; range?: boolean; skipScroll?: boolean },
    ) => {
      setSelectedQuestionOrders((prev) => {
        if (options?.range) {
          const anchor = selectedQuestion >= 0 ? selectedQuestion : (prev[0] ?? idx);
          const start = Math.min(anchor, idx);
          const end = Math.max(anchor, idx);
          const range: number[] = [];
          for (let i = start; i <= end; i += 1) range.push(i);
          return range;
        }
        if (options?.additive) {
          if (prev.includes(idx)) {
            const next = prev.filter((i) => i !== idx);
            return next.length > 0 ? next : [idx];
          }
          return [...prev, idx].sort((a, b) => a - b);
        }
        return [idx];
      });
      setSelectedQuestion(idx);
      if (options?.skipScroll) return;
      const item = layout.find((l) => l.order_index === idx);
      const targetPage = pageNum ?? item?.page_num ?? 1;
      if (targetPage !== currentPageRef.current) {
        goToPage(targetPage);
      }
    },
    [layout, goToPage, selectedQuestion],
  );

  const handleOptikQuestionNavigate = useCallback(
    (questionId: string) => {
      const q = questions.find((x) => x.id === questionId);
      if (!q) return;
      const layoutItem = layout.find((l) => l.order_index === q.order_index);
      if (!layoutItem) return;
      selectQuestionOnPage(layoutItem.order_index, undefined, { skipScroll: true });
      scrollToQuestionRegion(layoutItem.order_index);
    },
    [questions, layout, selectQuestionOnPage, scrollToQuestionRegion],
  );

  const columnPanelItems = useMemo(() => {
    if (!columnPanel || !columnRedistBaseLayout) return [];
    const gi: LayoutGeometryInput = {
      ...layoutGeometryInput,
      pageNum: columnPanel.pageNum,
    };
    const band = computePageColumnBand(gi);
    return getColumnItemsSortedTopFirst(
      columnRedistBaseLayout,
      columnPanel.pageNum,
      columnPanel.columnIndex0,
      band
    );
  }, [columnPanel, columnRedistBaseLayout, layoutGeometryInput]);

  const columnEqualDisabled = columnPanelItems.length < 1;
  const columnAnchoredDisabled = columnPanelItems.length < 3;

  const runColumnRedistribution = useCallback(() => {
    if (!columnRedistBaseLayout || !columnPanel) {
      return { ok: false as const, error: "Panel kapalı." };
    }
    const geometry: LayoutGeometryInput = {
      ...layoutGeometryInput,
      pageNum: columnPanel.pageNum,
    };
    const bottomGapPt = mmToPdfPt(Math.max(0, parseFloat(columnBottomGapMmInput) || 0));
    return redistributeColumnQuestions({
      fullLayout: columnRedistBaseLayout,
      pageNum: columnPanel.pageNum,
      columnIndex: columnPanel.columnIndex0,
      geometry,
      mode: columnRedistMode === "equal" ? "equal" : "anchored",
      bottomGapPt: columnRedistMode === "anchored" ? bottomGapPt : undefined,
    });
  }, [
    columnRedistBaseLayout,
    columnPanel,
    layoutGeometryInput,
    columnRedistMode,
    columnBottomGapMmInput,
  ]);

  const handleColumnOverlayPointerDown = useCallback(
    (pageNum: number, col0: number, clientX: number, clientY: number) => {
      const snap = JSON.parse(JSON.stringify(layout)) as LayoutItem[];
      columnPanelOpenLayoutRef.current = snap;
      const gi: LayoutGeometryInput = {
        ...layoutGeometryInput,
        pageNum,
      };
      const band = computePageColumnBand(gi);
      const inCol = getColumnItemsSortedTopFirst(snap, pageNum, col0, band);
      setColumnPanelOrderIndices(inCol.map((q) => q.order_index ?? 0));
      setColumnRedistBaseLayout(snap);
      setColumnPanel({
        pageNum,
        columnIndex0: col0,
        anchor: { x: clientX, y: clientY },
      });
      setColumnRedistPreviewActive(false);
      setColumnDistInlineError(null);
      setColumnRedistMode("equal");
    },
    [layout, layoutGeometryInput]
  );

  const handleColumnRedistPreview = useCallback(() => {
    const r = runColumnRedistribution();
    if (!r.ok) {
      setColumnDistInlineError(r.error);
      return;
    }
    setLayout(r.layout);
    setColumnRedistPreviewActive(true);
    setColumnDistInlineError(null);
  }, [runColumnRedistribution]);

  const handleColumnRedistApply = useCallback(() => {
    const r = runColumnRedistribution();
    if (!r.ok) {
      setColumnDistInlineError(r.error);
      return;
    }
    const nextLayout = r.layout;
    const qsApply = useEditorStore.getState().questions;
    const partial: Record<string, number> = {};
    for (const it of columnPanelItems) {
      const found = nextLayout.find((l) => l.order_index === it.order_index);
      const q = qsApply.find((x) => x.order_index === it.order_index);
      if (found && q) partial[q.id] = found.y_top_pt;
    }
    mergeLayoutYTopOverridesByQuestionId(partial);
    setLayout(nextLayout);
    setColumnPanel(null);
    setColumnRedistBaseLayout(null);
    columnPanelOpenLayoutRef.current = null;
    setColumnPanelOrderIndices([]);
    setColumnRedistPreviewActive(false);
    setColumnDistInlineError(null);
  }, [runColumnRedistribution, columnPanelItems, mergeLayoutYTopOverridesByQuestionId]);

  const handleColumnRedistCancel = useCallback(() => {
    if (columnRedistPreviewActive && columnRedistBaseLayout) {
      setLayout(JSON.parse(JSON.stringify(columnRedistBaseLayout)) as LayoutItem[]);
    }
    setColumnPanel(null);
    setColumnRedistBaseLayout(null);
    columnPanelOpenLayoutRef.current = null;
    setColumnPanelOrderIndices([]);
    setColumnRedistPreviewActive(false);
    setColumnDistInlineError(null);
  }, [columnRedistPreviewActive, columnRedistBaseLayout]);

  const handleColumnRedistReset = useCallback(() => {
    const openSnap = columnPanelOpenLayoutRef.current;
    if (!columnPanel || !openSnap || columnPanelOrderIndices.length === 0) return;
    const next = restoreLayoutItemsByOrderIndices(
      layout,
      openSnap,
      columnPanelOrderIndices
    );
    setLayout(next);
    const qsReset = useEditorStore.getState().questions;
    const idsToClear = columnPanelOrderIndices
      .map((oi) => qsReset.find((q) => q.order_index === oi)?.id)
      .filter((id): id is string => Boolean(id));
    removeLayoutYTopOverridesForQuestionIds(idsToClear);
    setColumnDistInlineError(null);
    setColumnRedistPreviewActive(false);
  }, [columnPanel, columnPanelOrderIndices, layout, removeLayoutYTopOverridesForQuestionIds]);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    if (!isOpen) {
      setColumnAdjustEnabled(false);
      setColumnPanel(null);
      setColumnRedistBaseLayout(null);
      columnPanelOpenLayoutRef.current = null;
      setColumnPanelOrderIndices([]);
      setColumnRedistPreviewActive(false);
      setColumnDistInlineError(null);
      questionGapInitialLayoutRef.current = null;
      setQuestionGapInitialMm(null);
    }
  }, [isOpen]);

  const applyQuestionReorder = (reorderedIds: string[], focusIndex?: number) => {
    const selectedIds = selectedQuestionOrders
      .map((i) => questions[i]?.id)
      .filter((id): id is string => Boolean(id));
    const primaryId = questions[selectedQuestion]?.id;
    clearLayoutPlacementOverrides();
    clearLayoutYTopOverrides();
    baseLayoutRef.current = [];
    reorderQuestions(reorderedIds).then(() => {
      if (focusIndex != null) {
        setSelectedQuestion(focusIndex);
        setSelectedQuestionOrders([focusIndex]);
      } else {
        const nextSelected = selectedIds
          .map((id) => reorderedIds.indexOf(id))
          .filter((i) => i >= 0)
          .sort((a, b) => a - b);
        if (nextSelected.length > 0) {
          setSelectedQuestionOrders(nextSelected);
          if (primaryId) {
            const primaryIdx = reorderedIds.indexOf(primaryId);
            if (primaryIdx >= 0) setSelectedQuestion(primaryIdx);
          }
        } else if (primaryId) {
          const idx = reorderedIds.indexOf(primaryId);
          if (idx >= 0) {
            setSelectedQuestion(idx);
            setSelectedQuestionOrders([idx]);
          }
        }
      }
      setLoading(true);
      const qs = useEditorStore.getState().questions;
      fetchLayout(undefined, qs)
        .then(() => setLoading(false))
        .catch((e) => {
          setError(e instanceof Error ? e.message : "Önizleme güncellenemedi");
          setLoading(false);
        });
    });
  };

  const fetchLayout = useCallback(
    async (
      localGapMm?: number,
      qsOverride?: QuestionItem[],
      opts?: {
        skipImages?: boolean;
        silent?: boolean;
        /** Gap slider önizlemesi — manuel Y override uygulanmaz */
        ignoreYOverrides?: boolean;
        /** Sadece layoutLiveRef güncelle; commit edilene kadar layout state sabit kalır */
        livePreviewOnly?: boolean;
      },
    ) => {
      const qs = qsOverride ?? questions;
      const qsEffective = applyPendingDisplayScales(qs);
      if (qsEffective.length === 0) return;
      const gap = localGapMm ?? questionGapMm;
      lastLayoutGapMmRef.current = gap;
      const paper = getPaperSizePayload(paperSize, paperWidthMm, paperHeightMm, orientation);
      const exportState = useEditorStore.getState();
      const skipImages = resolveLayoutFetchSkipImages(
        exportState.layoutPlacementOverridesByQuestionId,
        exportState.layoutYTopOverridesByQuestionIdPt,
        opts?.skipImages
      );
      const exportHeaderStyleId = exportState.headerStyleId;
      const exportHeaderConfig = exportState.headerConfig;
      const exportIncludeDescription =
        options.includeDescription && !isCorporateHeader(exportHeaderStyleId);
      const payload = {
        title: isWritten ? testName?.trim() || "Yazılı" : testName?.trim() || "TEST",
        school_name: schoolName?.trim() || "",
        include_answer_key: options.includeAnswerKey,
        answer_key_mode:
          (isWritten || isTrial) && options.includeAnswerKey
            ? "separate_page"
            : answerKeyMode ?? "per_page",
        columns,
        target_question_line_pt: exportState.targetQuestionLinePt ?? 10,
        allow_slight_overflow: exportState.allowSlightOverflow !== false,
        question_gap_mm: gap,
        question_gap_min_mm: gap,
        auto_compact_spacing: false,
        page_preset: paper.page_preset,
        page_width_mm: paper.page_width_mm,
        page_height_mm: paper.page_height_mm,
        orientation: paper.orientation,
        margin_top_mm: marginTopMm,
        margin_bottom_mm: marginBottomMm,
        margin_left_mm: marginLeftMm,
        margin_right_mm: marginRightMm,
        question_numbering_enabled: exportState.questionNumberingEnabled,
        question_number_start: exportState.questionNumberStart,
        question_number_color_mode: exportState.questionNumberColorMode,
        question_number_font_pt: exportState.questionNumberFontPt,
        page_numbering_enabled: exportState.pageNumberingEnabled,
        page_number_start: exportState.pageNumberStart,
        page_number_format: exportState.pageNumberFormat,
        watermark_enabled: exportState.showWatermark || exportState.watermarkEnabled,
        watermark_mode:
          exportState.watermarkLogoUrl || exportState.watermarkSettings.imageBase64
            ? "image"
            : "text",
        watermark_text: exportState.watermarkText || exportState.watermarkSettings.text,
        watermark_text_opacity_pct: exportState.showWatermark
          ? exportState.watermarkOpacity
          : exportState.watermarkSettings.textOpacityPct,
        watermark_text_size_pct: exportState.showWatermark
          ? exportState.watermarkSize
          : exportState.watermarkSettings.textSizePct,
        watermark_text_angle_deg: exportState.showWatermark
          ? resolveWatermarkAngleDeg(exportState.watermarkLayout, exportState.watermarkAngleDeg)
          : exportState.watermarkSettings.textAngleDeg,
        watermark_text_color: exportState.themeColor,
        watermark_image_base64: exportState.watermarkSettings.imageBase64,
        watermark_image_opacity_pct: exportState.showWatermark
          ? exportState.watermarkOpacity
          : exportState.watermarkSettings.imageOpacityPct,
        watermark_image_size_pct: exportState.showWatermark
          ? exportState.watermarkSize
          : exportState.watermarkSettings.imageSizePct,
        header_style_id: normalizeHeaderStyleId(exportHeaderStyleId),
        header_config: exportHeaderConfig,
        theme_color: exportState.themeColor,
        questions: qsEffective.map((q) => ({
          id: q.id,
          pdf_id: q.pdf_id,
          page_number: q.page_number,
          crop: q.crop,
          answer_key: q.answer_key,
          order_index: q.order_index,
          content_type: q.content_type ?? "question",
          explanation_caption_enabled: q.explanation_caption_enabled ?? false,
          explanation_caption_text: q.explanation_caption_text ?? "",
          explanation_caption_align: q.explanation_caption_align ?? "left",
          explanation_caption_placement: q.explanation_caption_placement ?? "above",
          explanation_caption_side_flow: q.explanation_caption_side_flow ?? "horizontal",
          explanation_caption_color: q.explanation_caption_color ?? "#0f172a",
          explanation_caption_bold: q.explanation_caption_bold ?? false,
          explanation_caption_italic: q.explanation_caption_italic ?? false,
          explanation_caption_font_pt: q.explanation_caption_font_pt ?? 9,
          explanation_caption_box_enabled: q.explanation_caption_box_enabled ?? false,
          explanation_caption_box_color: q.explanation_caption_box_color ?? "#f1f5f9",
          explanation_caption_box_corner: q.explanation_caption_box_corner ?? "rounded",
          explanation_caption_box_width: q.explanation_caption_box_width ?? "full",
          remove_background: q.remove_background ?? false,
          image_base64: q.image_base64,
          custom_gap_mm: q.custom_gap_mm,
          display_scale: q.display_scale,
          ocr_font_matched: q.ocr_font_matched,
          font_line_px: q.font_line_px,
        })),
        sections: sections.length > 0 ? sections : undefined,
        skip_images: skipImages,
        include_description: exportIncludeDescription,
        description_column_count: descriptionColumnCount ?? 1,
        description_texts: exportIncludeDescription ? (descriptionTexts ?? []) : [],
        description_column_dividers: descriptionColumnDividers,
        add_text_on_line:
          exportState.showColumnDividerText &&
          exportState.showColumnDivider &&
          !!exportState.columnDividerText.trim(),
        center_line_text: exportState.columnDividerText ?? "",
        center_line_bold: exportState.centerLineBold,
        center_line_italic: exportState.centerLineItalic,
        center_line_text_direction: exportState.centerLineTextDirection ?? "up",
        show_column_divider: exportState.showColumnDivider,
        show_column_divider_text: exportState.showColumnDividerText,
        column_divider_text: exportState.columnDividerText,
        column_divider_color: exportState.columnDividerColor,
        column_divider_width_pt: exportState.columnDividerWidthPt,
        show_watermark: exportState.showWatermark,
        watermark_layout: exportState.watermarkLayout,
        watermark_angle_deg: exportState.watermarkAngleDeg,
        watermark_opacity_pct: exportState.watermarkOpacity,
        watermark_size_pct: exportState.watermarkSize,
        watermark_logo_url: exportState.watermarkLogoUrl,
        show_page_frame: exportState.showPageFrame,
        page_frame_color_mode: exportState.pageFrameColorMode,
        page_frame_color: exportState.pageFrameColor,
        page_frame_width_pt: exportState.pageFrameWidthPt,
        page_frame_inner_gap_mm: exportState.pageFrameInnerGapMm,
        page_frame_corner_radius_mm: exportState.pageFrameCornerRadiusMm,
        page_frame_line_style: exportState.pageFrameLineStyle,
        header_bottom_gap_mm: exportState.headerBottomGapMm,
        other_page_header_bottom_gap_mm: exportState.otherPageHeaderBottomGapMm,
        question_number_left_offset_mm: exportState.questionNumberLeftOffsetMm,
        question_number_image_gap_mm: exportState.questionNumberImageGapMm,
        ...(isWritten
          ? {
              written_paper_header: true,
              written_paper_title: buildWrittenPaperTitle({
                schoolName: schoolName ?? "",
                classSection,
                testName: testName ?? "",
                examType,
              }),
              exam_type: examType || undefined,
              class_section: classSection || undefined,
              group: group !== "Grup Yok" ? group : undefined,
              teacher_names: writtenPaperOptions.addTeacherName
                ? writtenTeachersForPreview.map((t) => ({ name: t.name, title: t.title }))
                : undefined,
              written_paper_field_lines: writtenFieldLinesPayload(writtenHeaderFieldLines),
              written_paper_field_hidden: writtenFieldHiddenPayload(writtenHeaderFieldHidden),
              written_paper_field_labels: writtenFieldLabelsPayload(writtenHeaderFieldLabels),
            }
          : {}),
      };
      const data = await api.exports.layout(payload);
      const rawLayout = skipImages
        ? mergeLayoutImagesFromQuestions(data.layout, qsEffective)
        : data.layout;
      baseLayoutRef.current = rawLayout;

      const placementOv = exportState.layoutPlacementOverridesByQuestionId;
      const yOv = opts?.ignoreYOverrides
        ? {}
        : exportState.layoutYTopOverridesByQuestionIdPt;

      const geoForPlacement: LayoutGeometryInput = {
        pageWpt: data.page_w_pt,
        pageHpt: data.page_h_pt,
        marginTopMm,
        marginBottomMm,
        marginLeftMm,
        marginRightMm,
        columns,
        columnGapMm: 8,
        pageNum: currentPage,
        writtenPaperHeader: isWritten,
        writtenPaperTitle: isWritten ? writtenTitleForPreview : undefined,
        writtenPaperFieldLines: isWritten ? writtenHeaderFieldLines : emptyWrittenHeaderFieldLines(),
        writtenPaperFieldHidden: isWritten ? writtenHeaderFieldHidden : emptyWrittenHeaderFieldHidden(),
        includeDescription: options.includeDescription,
        descriptionColumnCount: descriptionColumnCount ?? 1,
        descriptionTexts: descriptionTexts ?? [],
        headerStyleId,
        headerBottomGapMm: exportState.headerBottomGapMm,
        otherPageHeaderBottomGapMm: exportState.otherPageHeaderBottomGapMm,
        questionNumberImageGapMm: exportState.questionNumberImageGapMm,
      };

      const finalized = finalizePreviewLayout({
        rawLayout,
        baseLayout: rawLayout,
        questions: qsEffective,
        placementOverrides: placementOv,
        yOverridesByQuestionId: yOv,
        geometry: geoForPlacement,
        columns,
        questionGapMinMm: gap,
        questionNumberingEnabled: exportState.questionNumberingEnabled,
        questionNumberStart: exportState.questionNumberStart,
        questionNumberFontPt: exportState.questionNumberFontPt,
      });
      const layoutToSet =
        !isWritten && !isCorporateHeader(headerStyleId)
          ? shiftLayoutBelowFirstPageHeader(finalized, geoForPlacement, columns)
          : finalized;

      layoutRef.current = layoutToSet;
      if (
        isOpen &&
        questionGapInitialLayoutRef.current === null &&
        !opts?.livePreviewOnly
      ) {
        questionGapInitialLayoutRef.current = JSON.parse(
          JSON.stringify(layoutToSet),
        ) as LayoutItem[];
        setQuestionGapInitialMm(gap);
      }
      if (opts?.livePreviewOnly) {
        layoutLiveRef.current = layoutToSet;
        setPageWpt(data.page_w_pt);
        setPageHpt(data.page_h_pt);
        scheduleAllPreviewRedraw();
        return data;
      }
      if (opts?.silent) {
        layoutLiveRef.current = layoutToSet;
      }
      setLayout(layoutToSet);
      setPageWpt(data.page_w_pt);
      setPageHpt(data.page_h_pt);
      if (opts?.silent) {
        scheduleAllPreviewRedraw();
      }
      return data;
    },
    [
      questions,
      testName,
      schoolName,
      options.includeAnswerKey,
      answerKeyMode,
      questionGapMm,
      questionGapMinMm,
      autoCompactSpacing,
      headerStyleId,
      headerConfig,
      themeColor,
      sections,
      options.includeDescription,
      descriptionColumnCount,
      descriptionTexts,
      descriptionColumnDividers,
      paperSize,
      paperWidthMm,
      paperHeightMm,
      orientation,
      columns,
      marginTopMm,
      marginBottomMm,
      marginLeftMm,
      marginRightMm,
      isWritten,
      isTrial,
      examType,
      classSection,
      group,
      writtenPaperOptions.addTeacherName,
      teacherNames,
      writtenTeachersForPreview,
      writtenHeaderFieldLines,
      writtenHeaderFieldLabels,
      writtenHeaderFieldHidden,
      options.addTextOnLine,
      centerLineText,
      centerLineBold,
      centerLineItalic,
      centerLineTextDirection,
      showColumnDivider,
      columnDividerText,
      columnDividerColor,
      columnDividerWidthPt,
      showColumnDividerText,
      showWatermark,
      watermarkText,
      watermarkLayout,
      watermarkAngleDeg,
      watermarkOpacity,
      watermarkSize,
      watermarkLogoUrl,
      showPageFrame,
      pageFrameColorMode,
      pageFrameColor,
      pageFrameWidthPt,
      pageFrameInnerGapMm,
      pageFrameCornerRadiusMm,
      pageFrameLineStyle,
      watermarkEnabled,
      watermarkSettings.mode,
      watermarkSettings.text,
      watermarkSettings.textOpacityPct,
      watermarkSettings.textSizePct,
      watermarkSettings.textAngleDeg,
      watermarkSettings.imageBase64,
      watermarkSettings.imageOpacityPct,
      watermarkSettings.imageSizePct,
      headerBottomGapMm,
      otherPageHeaderBottomGapMm,
      questionNumberFontPt,
      applyPendingDisplayScales,
      scheduleAllPreviewRedraw,
      isOpen,
    ]
  );

  const applyColumnPlacementResult = useCallback(
    (result: TryColumnShiftOk, base: LayoutItem[], qs: QuestionItem[], focusOrderIndex?: number) => {
      const geo = {
        pageWpt: layoutGeometryInput.pageWpt,
        pageHpt: layoutGeometryInput.pageHpt,
        marginTopMm: layoutGeometryInput.marginTopMm,
        marginBottomMm: layoutGeometryInput.marginBottomMm,
        marginLeftMm: layoutGeometryInput.marginLeftMm,
        marginRightMm: layoutGeometryInput.marginRightMm,
      };
      removeLayoutYTopOverridesForQuestionIds(
        questionIdsInPlacementAffectedColumns({
          placementOverrides: result.placementOverrides,
          questions: qs,
          layout: result.layout,
          baseLayout: base,
          columns,
          ...geo,
        })
      );
      mergeLayoutPlacementOverridesByQuestionId(result.placementOverrides);
      mergeLayoutYTopOverridesByQuestionId(result.yTopUpdatesByQuestionId);
      setLayout(result.layout);
      layoutRef.current = result.layout;

      if (focusOrderIndex != null) {
        const moved = result.layout.find((l) => l.order_index === focusOrderIndex);
        if (moved) goToPage(moved.page_num ?? 1);
      }
    },
    [
      layoutGeometryInput,
      columns,
      mergeLayoutPlacementOverridesByQuestionId,
      mergeLayoutYTopOverridesByQuestionId,
      removeLayoutYTopOverridesForQuestionIds,
      goToPage,
    ]
  );

  const handleColumnShift = useCallback(
    (orderIndex: number, direction: ColumnShiftDirection, options?: { force?: boolean }) => {
      setColumnShiftError(null);
      const qs = useEditorStore.getState().questions;
      const placement = useEditorStore.getState().layoutPlacementOverridesByQuestionId;
      const effectiveLayout = layoutRef.current;
      const base =
        effectiveLayout.length > 0 ? effectiveLayout : baseLayoutRef.current;

      const item = effectiveLayout.find((l) => l.order_index === orderIndex);
      const pageNum = item?.page_num ?? currentPage;

      const result = tryColumnShiftPlacement({
        baseLayout: base,
        effectiveLayout,
        questions: qs,
        pageNum,
        columns,
        maxQuestionPage,
        orderIndex,
        direction,
        geometry: { ...layoutGeometryInput, pageNum },
        questionGapMinMm,
        placementOverrides: placement,
        force: options?.force === true,
        questionNumberingEnabled,
        questionNumberStart,
        questionNumberFontPt,
      });

      if (!result.ok) {
        setColumnShiftError(result.error);
        return;
      }

      applyColumnPlacementResult(result, base, qs, orderIndex);
      layoutLiveRef.current = null;
      const session = scalePreviewSessionRef.current;
      if (session?.orderIndex === orderIndex) {
        const movedItem = result.layout.find((l) => l.order_index === orderIndex);
        if (movedItem) {
          session.baseLayout = JSON.parse(JSON.stringify(result.layout)) as LayoutItem[];
          session.baseItem = JSON.parse(JSON.stringify(movedItem)) as LayoutItem;
          session.placementOverrides = { ...result.placementOverrides };
        }
      }
      scheduleAllPreviewRedraw();
    },
    [
      layoutGeometryInput,
      columns,
      maxQuestionPage,
      questionGapMinMm,
      currentPage,
      applyColumnPlacementResult,
      questionNumberingEnabled,
      questionNumberStart,
      questionNumberFontPt,
      scheduleAllPreviewRedraw,
    ]
  );

  /**
   * Sayfa numarasını yalnızca (1) önizleme layout’u ilk kez dolduğunda veya (2) kullanıcı soldan başka soru
   * seçtiğinde o sorunun sayfasına al. Layout yeniden hesaplanınca (sütun uygula/önizle, fetchLayout vb.)
   * mevcut sayfada kal — aksi halde seçili soru 1. sayfadaysa her güncellemede 1. sayfaya sıçranıyordu.
   */
  const layoutSyncHadContentRef = useRef(false);
  const layoutSyncPrevSelectedRef = useRef(selectedQuestion);

  useEffect(() => {
    if (!isOpen) {
      layoutSyncHadContentRef.current = false;
      return;
    }
    if (layout.length === 0) {
      layoutSyncHadContentRef.current = false;
      return;
    }
    const item = layout.find((l) => l.order_index === selectedQuestion);
    if (!item) return;

    const firstLayoutContent = !layoutSyncHadContentRef.current;
    layoutSyncHadContentRef.current = true;

    const selectedChanged = layoutSyncPrevSelectedRef.current !== selectedQuestion;
    layoutSyncPrevSelectedRef.current = selectedQuestion;

    if (firstLayoutContent || selectedChanged) {
      const p = item.page_num ?? 1;
      setCurrentPage(p);
      if (firstLayoutContent) scrollToPage(p, "auto");
    }
  }, [isOpen, layout, selectedQuestion, scrollToPage]);

  /** Bölüm eklendi/düzenlendi/silindi - layout'u bölüm başlıklarıyla yeniden yükle */
  const prevSectionsRef = useRef<string>("");
  useEffect(() => {
    if (!isOpen || questions.length === 0) return;
    if (!layoutReady) {
      prevSectionsRef.current = JSON.stringify(sections);
      return;
    }
    const key = JSON.stringify(sections);
    if (prevSectionsRef.current === key) return;
    prevSectionsRef.current = key;
    clearLayoutYTopOverrides();
    setLoading(true);
    fetchLayout()
      .then(() => setLoading(false))
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Önizleme güncellenemedi");
        setLoading(false);
      });
  }, [sections, isOpen, layoutReady, questions.length, fetchLayout, clearLayoutYTopOverrides]);

  /** Yazılı başlık alanları değişince soru yerleşimini yeniden hesapla (export ile aynı y_top) */
  const writtenHeaderLayoutSigRef = useRef("");
  useEffect(() => {
    if (!isOpen) writtenHeaderLayoutSigRef.current = "";
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isWritten || questions.length === 0 || !layoutReady) return;
    const sig = JSON.stringify({
      lines: writtenHeaderFieldLines,
      hidden: writtenHeaderFieldHidden,
    });
    if (writtenHeaderLayoutSigRef.current === sig) return;
    const isInitial = writtenHeaderLayoutSigRef.current === "";
    writtenHeaderLayoutSigRef.current = sig;
    if (isInitial) return;
    clearLayoutYTopOverrides();
    setLoading(true);
    fetchLayout()
      .then(() => setLoading(false))
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Önizleme güncellenemedi");
        setLoading(false);
      });
  }, [
    isOpen,
    isWritten,
    layoutReady,
    questions.length,
    writtenHeaderFieldLines,
    writtenHeaderFieldHidden,
    fetchLayout,
    clearLayoutYTopOverrides,
  ]);

  /** Klasik banner + bilgi şeridi — 1. sayfa sorularını şeridin altına kaydır */
  const classicBannerShiftSigRef = useRef("");
  useEffect(() => {
    if (!isOpen) {
      classicBannerShiftSigRef.current = "";
      return;
    }
    if (!layoutReady || isWritten || isCorporateHeader(headerStyleId)) return;
    const current = layoutRef.current;
    if (current.length === 0) return;
    const classicH = resolveClassicBannerAndInfoHeightPt(
      mergeHeaderBadgeConfig(headerConfig, headerStyleId),
    );
    const sig = `${headerStyleId}|${options.includeDescription}|${descriptionColumnCount ?? 1}|${classicH}`;
    const shifted = shiftLayoutBelowFirstPageHeader(
      current,
      layoutGeometryInput,
      columns,
    );
    if (shifted === current) {
      classicBannerShiftSigRef.current = sig;
      return;
    }
    classicBannerShiftSigRef.current = sig;
    clearLayoutYTopOverrides();
    layoutRef.current = shifted;
    baseLayoutRef.current = JSON.parse(JSON.stringify(shifted)) as LayoutItem[];
    setLayout(shifted);
    scheduleAllPreviewRedraw();
  }, [
    isOpen,
    layoutReady,
    isWritten,
    headerStyleId,
    options.includeDescription,
    descriptionColumnCount,
    headerConfig,
    columns,
    pageWpt,
    pageHpt,
    marginTopMm,
    marginLeftMm,
    marginRightMm,
    clearLayoutYTopOverrides,
    scheduleAllPreviewRedraw,
  ]);
  // banner boşluk sürgüsü layoutGeometryInput’u değiştirir; bu effect onu kasıtlı kullanmaz

  const headerBottomGapSkipRef = useRef(true);
  useEffect(() => {
    if (!isOpen || !layoutReady || questions.length === 0) {
      if (!isOpen) headerBottomGapSkipRef.current = true;
      return;
    }
    if (headerBottomGapSkipRef.current) {
      headerBottomGapSkipRef.current = false;
      return;
    }
    if (headerBottomGapDragStartRef.current != null) return;
    if (alignmentGapSkipFetchRef.current === "header") {
      alignmentGapSkipFetchRef.current = null;
    }
  }, [headerBottomGapMm, isOpen, layoutReady, questions.length]);

  const otherPageHeaderBottomGapSkipRef = useRef(true);
  useEffect(() => {
    if (!isOpen || !layoutReady || questions.length === 0) {
      if (!isOpen) otherPageHeaderBottomGapSkipRef.current = true;
      return;
    }
    if (otherPageHeaderBottomGapSkipRef.current) {
      otherPageHeaderBottomGapSkipRef.current = false;
      return;
    }
    if (otherPageHeaderBottomGapDragStartRef.current != null) return;
    if (alignmentGapSkipFetchRef.current === "otherPage") {
      alignmentGapSkipFetchRef.current = null;
    }
  }, [otherPageHeaderBottomGapMm, isOpen, layoutReady, questions.length]);

  const questionGapSkipRef = useRef(true);
  useEffect(() => {
    if (!isOpen || !layoutReady || questions.length === 0) {
      if (!isOpen) questionGapSkipRef.current = true;
      return;
    }
    if (questionGapSkipRef.current) {
      questionGapSkipRef.current = false;
      return;
    }
    if (questionGapDragStartRef.current != null) return;
    if (questionGapSkipFetchRef.current) {
      questionGapSkipFetchRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      setLoading(true);
      const gap = questionGapMm;
      fetchLayout(gap)
        .then(() => setLoading(false))
        .catch((e) => {
          setError(e instanceof Error ? e.message : "Önizleme güncellenemedi");
          setLoading(false);
        });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [
    questionGapMm,
    questionGapMinMm,
    autoCompactSpacing,
    orientation,
    columns,
    allowSlightOverflow,
    targetQuestionLinePt,
    marginTopMm,
    marginBottomMm,
    marginLeftMm,
    marginRightMm,
    questionNumberingEnabled,
    questionNumberStart,
    questionNumberFontPt,
    isOpen,
    layoutReady,
    questions.length,
    fetchLayout,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const el = previewScrollRef.current;
    if (!el) return;
    el.style.setProperty("--banner-gap", `${headerBottomGapMm}mm`);
    el.style.setProperty("--other-page-banner-gap", `${otherPageHeaderBottomGapMm}mm`);
  }, [isOpen, headerBottomGapMm, otherPageHeaderBottomGapMm]);

  const clampQuestionGapMm = useCallback(
    (value: number) => Math.max(6, Math.min(100, Math.round(value * 2) / 2)),
    [],
  );

  const applyAlignmentGapsLiveLayout = useCallback(
    (
      gaps: {
        headerBottomGapMm?: number;
        otherPageHeaderBottomGapMm?: number;
      },
      syncReactState = false,
    ) => {
      if (!layoutReady || questions.length === 0) return;
      const base = baseLayoutRef.current;
      if (base.length === 0) return;
      const exportState = useEditorStore.getState();
      const qsEffective = applyPendingDisplayScales(questions);
      const geometry: LayoutGeometryInput = {
        ...layoutGeometryInput,
        headerBottomGapMm:
          gaps.headerBottomGapMm ??
          alignmentPreviewLiveRef.current?.headerBottomGapMm ??
          headerBottomGapMm,
        otherPageHeaderBottomGapMm:
          gaps.otherPageHeaderBottomGapMm ??
          alignmentPreviewLiveRef.current?.otherPageHeaderBottomGapMm ??
          otherPageHeaderBottomGapMm,
      };
      const rawReflowed = reflowLayoutWithFixedGapMm(base, questionGapMm, geometry);
      const layoutToSet = finalizePreviewLayout({
        rawLayout: rawReflowed,
        baseLayout: base,
        questions: qsEffective,
        placementOverrides: exportState.layoutPlacementOverridesByQuestionId,
        yOverridesByQuestionId: {},
        geometry,
        columns,
        questionGapMinMm: questionGapMm,
        questionNumberingEnabled: exportState.questionNumberingEnabled,
        questionNumberStart: exportState.questionNumberStart,
        questionNumberFontPt: exportState.questionNumberFontPt,
      });
      layoutRef.current = layoutToSet;
      if (syncReactState) {
        layoutLiveRef.current = null;
        baseLayoutRef.current = JSON.parse(JSON.stringify(layoutToSet)) as LayoutItem[];
        setLayout(layoutToSet);
        scheduleAllPreviewRedraw();
      } else {
        layoutLiveRef.current = layoutToSet;
        scheduleAllPreviewRedraw();
      }
    },
    [
      layoutReady,
      questions,
      applyPendingDisplayScales,
      layoutGeometryInput,
      columns,
      questionGapMm,
      headerBottomGapMm,
      otherPageHeaderBottomGapMm,
      scheduleAllPreviewRedraw,
      setLayout,
    ],
  );

  const fetchQuestionGapLayoutSilent = useCallback(
    async (gapMm: number) => {
      if (!layoutReady || questions.length === 0) return;
      const gen = ++questionGapLayoutFetchRef.current;
      lastLayoutGapMmRef.current = gapMm;
      try {
        await fetchLayout(gapMm, undefined, {
          silent: true,
          ignoreYOverrides: true,
          livePreviewOnly: true,
        });
      } catch (e) {
        if (gen !== questionGapLayoutFetchRef.current) return;
        setError(e instanceof Error ? e.message : "Önizleme güncellenemedi");
      }
    },
    [layoutReady, questions.length, fetchLayout],
  );

  const scheduleQuestionGapLayoutFetch = useCallback(
    (gapMm: number) => {
      if (questionGapDebounceRef.current != null) {
        window.clearTimeout(questionGapDebounceRef.current);
      }
      questionGapDebounceRef.current = window.setTimeout(() => {
        questionGapDebounceRef.current = null;
        void fetchQuestionGapLayoutSilent(gapMm);
      }, 150);
    },
    [fetchQuestionGapLayoutSilent],
  );

  const clampHeaderBottomGapMm = useCallback(
    (value: number) => Math.max(0, Math.min(50, Math.round(value * 10) / 10)),
    [],
  );

  const clampOtherPageHeaderBottomGapMm = useCallback(
    (value: number) => Math.max(0, Math.min(50, Math.round(value * 10) / 10)),
    [],
  );

  const handleHeaderBottomGapPreview = useCallback(
    (value: number) => {
      const clamped = clampHeaderBottomGapMm(value);
      alignmentPreviewLiveRef.current = {
        ...alignmentPreviewLiveRef.current,
        headerBottomGapMm: clamped,
      };
      headerBottomGapPendingRef.current = clamped;
      if (headerBottomGapRafRef.current != null) return;
      headerBottomGapRafRef.current = window.requestAnimationFrame(() => {
        headerBottomGapRafRef.current = null;
        const gap = headerBottomGapPendingRef.current;
        if (gap == null) return;
        previewScrollRef.current?.style.setProperty("--banner-gap", `${gap}mm`);
        applyAlignmentGapsLiveLayout({ headerBottomGapMm: gap }, false);
      });
    },
    [clampHeaderBottomGapMm, applyAlignmentGapsLiveLayout],
  );

  const handleHeaderBottomGapCommit = useCallback(
    (value: number) => {
      if (headerBottomGapRafRef.current != null) {
        window.cancelAnimationFrame(headerBottomGapRafRef.current);
        headerBottomGapRafRef.current = null;
      }
      headerBottomGapPendingRef.current = null;
      const clamped = clampHeaderBottomGapMm(value);
      alignmentPreviewLiveRef.current = null;
      previewScrollRef.current?.style.setProperty("--banner-gap", `${clamped}mm`);
      applyAlignmentGapsLiveLayout({ headerBottomGapMm: clamped }, true);
      if (Math.abs(useEditorStore.getState().headerBottomGapMm - clamped) > 0.0001) {
        alignmentGapSkipFetchRef.current = "header";
        setHeaderBottomGapMm(clamped);
      }
      headerBottomGapDragStartRef.current = null;
      endGapSliderScrollSession();
    },
    [clampHeaderBottomGapMm, applyAlignmentGapsLiveLayout, setHeaderBottomGapMm, endGapSliderScrollSession],
  );

  const handleHeaderBottomGapCancel = useCallback(() => {
    if (headerBottomGapRafRef.current != null) {
      window.cancelAnimationFrame(headerBottomGapRafRef.current);
      headerBottomGapRafRef.current = null;
    }
    headerBottomGapPendingRef.current = null;
    const restore =
      headerBottomGapDragStartRef.current ?? useEditorStore.getState().headerBottomGapMm;
    headerBottomGapDragStartRef.current = null;
    if (alignmentPreviewLiveRef.current) {
      const { headerBottomGapMm: _drop, ...rest } = alignmentPreviewLiveRef.current;
      alignmentPreviewLiveRef.current = Object.keys(rest).length > 0 ? rest : null;
    }
    previewScrollRef.current?.style.setProperty("--banner-gap", `${restore}mm`);
    applyAlignmentGapsLiveLayout({ headerBottomGapMm: restore }, true);
    endGapSliderScrollSession();
  }, [applyAlignmentGapsLiveLayout, endGapSliderScrollSession]);

  const handleOtherPageHeaderBottomGapPreview = useCallback(
    (value: number) => {
      const clamped = clampOtherPageHeaderBottomGapMm(value);
      alignmentPreviewLiveRef.current = {
        ...alignmentPreviewLiveRef.current,
        otherPageHeaderBottomGapMm: clamped,
      };
      otherPageHeaderBottomGapPendingRef.current = clamped;
      if (otherPageHeaderBottomGapRafRef.current != null) return;
      otherPageHeaderBottomGapRafRef.current = window.requestAnimationFrame(() => {
        otherPageHeaderBottomGapRafRef.current = null;
        const gap = otherPageHeaderBottomGapPendingRef.current;
        if (gap == null) return;
        previewScrollRef.current?.style.setProperty("--other-page-banner-gap", `${gap}mm`);
        applyAlignmentGapsLiveLayout({ otherPageHeaderBottomGapMm: gap }, false);
      });
    },
    [clampOtherPageHeaderBottomGapMm, applyAlignmentGapsLiveLayout],
  );

  const handleOtherPageHeaderBottomGapCommit = useCallback(
    (value: number) => {
      if (otherPageHeaderBottomGapRafRef.current != null) {
        window.cancelAnimationFrame(otherPageHeaderBottomGapRafRef.current);
        otherPageHeaderBottomGapRafRef.current = null;
      }
      otherPageHeaderBottomGapPendingRef.current = null;
      const clamped = clampOtherPageHeaderBottomGapMm(value);
      alignmentPreviewLiveRef.current = null;
      previewScrollRef.current?.style.setProperty("--other-page-banner-gap", `${clamped}mm`);
      applyAlignmentGapsLiveLayout({ otherPageHeaderBottomGapMm: clamped }, true);
      clearLayoutYTopOverrides();
      if (Math.abs(useEditorStore.getState().otherPageHeaderBottomGapMm - clamped) > 0.0001) {
        alignmentGapSkipFetchRef.current = "otherPage";
        setOtherPageHeaderBottomGapMm(clamped);
      }
      otherPageHeaderBottomGapDragStartRef.current = null;
      endGapSliderScrollSession();
    },
    [
      clampOtherPageHeaderBottomGapMm,
      applyAlignmentGapsLiveLayout,
      clearLayoutYTopOverrides,
      setOtherPageHeaderBottomGapMm,
      endGapSliderScrollSession,
    ],
  );

  const handleOtherPageHeaderBottomGapCancel = useCallback(() => {
    if (otherPageHeaderBottomGapRafRef.current != null) {
      window.cancelAnimationFrame(otherPageHeaderBottomGapRafRef.current);
      otherPageHeaderBottomGapRafRef.current = null;
    }
    otherPageHeaderBottomGapPendingRef.current = null;
    const restore =
      otherPageHeaderBottomGapDragStartRef.current ??
      useEditorStore.getState().otherPageHeaderBottomGapMm;
    otherPageHeaderBottomGapDragStartRef.current = null;
    if (alignmentPreviewLiveRef.current) {
      const { otherPageHeaderBottomGapMm: _drop, ...rest } = alignmentPreviewLiveRef.current;
      alignmentPreviewLiveRef.current = Object.keys(rest).length > 0 ? rest : null;
    }
    previewScrollRef.current?.style.setProperty("--other-page-banner-gap", `${restore}mm`);
    applyAlignmentGapsLiveLayout({ otherPageHeaderBottomGapMm: restore }, true);
    endGapSliderScrollSession();
  }, [applyAlignmentGapsLiveLayout, endGapSliderScrollSession]);

  const handleQuestionGapPreview = useCallback(
    (value: number) => {
      const clamped = clampQuestionGapMm(value);
      questionGapPendingRef.current = clamped;
      scheduleQuestionGapLayoutFetch(clamped);
    },
    [clampQuestionGapMm, scheduleQuestionGapLayoutFetch],
  );

  const handleQuestionGapCommit = useCallback(
    (value: number) => {
      if (questionGapDebounceRef.current != null) {
        window.clearTimeout(questionGapDebounceRef.current);
        questionGapDebounceRef.current = null;
      }
      questionGapPendingRef.current = null;
      const clamped = clampQuestionGapMm(value);
      const gen = ++questionGapLayoutFetchRef.current;
      lastLayoutGapMmRef.current = clamped;
      layoutLiveRef.current = null;
      clearLayoutYTopOverrides();
      fetchLayout(clamped, undefined, { silent: true, ignoreYOverrides: true })
        .then(() => {
          if (gen !== questionGapLayoutFetchRef.current) return;
          if (Math.abs(useEditorStore.getState().questionGapMm - clamped) > 0.0001) {
            questionGapSkipFetchRef.current = true;
            setQuestionGapMm(clamped);
          }
        })
        .catch((e) => {
          if (gen !== questionGapLayoutFetchRef.current) return;
          setError(e instanceof Error ? e.message : "Önizleme güncellenemedi");
        });
      questionGapDragStartRef.current = null;
      endGapSliderScrollSession();
    },
    [
      clampQuestionGapMm,
      fetchLayout,
      setQuestionGapMm,
      clearLayoutYTopOverrides,
      endGapSliderScrollSession,
    ],
  );

  const handleQuestionGapReset = useCallback(() => {
    if (questionGapDebounceRef.current != null) {
      window.clearTimeout(questionGapDebounceRef.current);
      questionGapDebounceRef.current = null;
    }
    questionGapLayoutFetchRef.current += 1;
    questionGapPendingRef.current = null;
    questionGapDragStartRef.current = null;
    layoutLiveRef.current = null;

    const initialGap = questionGapInitialMm ?? DEFAULT_QUESTION_GAP_MM;
    const initialLayout = questionGapInitialLayoutRef.current;

    if (initialLayout && initialLayout.length > 0) {
      const restored = JSON.parse(JSON.stringify(initialLayout)) as LayoutItem[];
      layoutRef.current = restored;
      baseLayoutRef.current = JSON.parse(JSON.stringify(restored)) as LayoutItem[];
      clearLayoutYTopOverrides();
      clearLayoutPlacementOverrides();
      setLayout(restored);
      lastLayoutGapMmRef.current = initialGap;
      if (Math.abs(useEditorStore.getState().questionGapMm - initialGap) > 0.0001) {
        questionGapSkipFetchRef.current = true;
        setQuestionGapMm(initialGap);
      }
      scheduleAllPreviewRedraw();
      endGapSliderScrollSession();
      return;
    }

    lastLayoutGapMmRef.current = initialGap;
    void fetchLayout(initialGap, undefined, { silent: true })
      .then(() => {
        if (Math.abs(useEditorStore.getState().questionGapMm - initialGap) > 0.0001) {
          questionGapSkipFetchRef.current = true;
          setQuestionGapMm(initialGap);
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Önizleme güncellenemedi");
      });
    endGapSliderScrollSession();
  }, [
    questionGapInitialMm,
    fetchLayout,
    setQuestionGapMm,
    scheduleAllPreviewRedraw,
    endGapSliderScrollSession,
    clearLayoutYTopOverrides,
    clearLayoutPlacementOverrides,
  ]);

  const handleQuestionGapCancel = useCallback(() => {
    if (questionGapDebounceRef.current != null) {
      window.clearTimeout(questionGapDebounceRef.current);
      questionGapDebounceRef.current = null;
    }
    questionGapLayoutFetchRef.current += 1;
    questionGapPendingRef.current = null;
    questionGapDragStartRef.current = null;
    layoutLiveRef.current = null;
    scheduleAllPreviewRedraw();
    endGapSliderScrollSession();
  }, [scheduleAllPreviewRedraw, endGapSliderScrollSession]);

  const clampNumOffsetMm = useCallback(
    (value: number) => Math.max(-15, Math.min(15, Math.round(value * 20) / 20)),
    []
  );

  const handleQuestionNumberLeftOffsetPreview = useCallback(
    (value: number) => {
      const clamped = clampNumOffsetMm(value);
      alignmentPreviewLiveRef.current = {
        ...alignmentPreviewLiveRef.current,
        leftOffsetMm: clamped,
      };
      scheduleAllPreviewRedraw();
    },
    [clampNumOffsetMm, scheduleAllPreviewRedraw],
  );

  const handleQuestionNumberLeftOffsetCommit = useCallback(
    (value: number) => {
      const clamped = clampNumOffsetMm(value);
      alignmentPreviewLiveRef.current = null;
      scheduleAllPreviewRedraw();
      const storeVal = useEditorStore.getState().questionNumberLeftOffsetMm;
      if (Math.abs(storeVal - clamped) > 0.0001) {
        setQuestionNumberLeftOffsetMm(clamped);
      }
      numOffsetDragStartRef.current = null;
      endGapSliderScrollSession();
    },
    [clampNumOffsetMm, setQuestionNumberLeftOffsetMm, scheduleAllPreviewRedraw, endGapSliderScrollSession],
  );

  const handleQuestionNumberLeftOffsetCancel = useCallback(() => {
    numOffsetDragStartRef.current = null;
    alignmentPreviewLiveRef.current = null;
    scheduleAllPreviewRedraw();
    endGapSliderScrollSession();
  }, [scheduleAllPreviewRedraw, endGapSliderScrollSession]);

  const clampNumImageGapMm = useCallback(
    (value: number) => Math.max(0, Math.min(10, Math.round(value * 20) / 20)),
    []
  );

  const handleQuestionNumberImageGapPreview = useCallback(
    (value: number) => {
      const clamped = clampNumImageGapMm(value);
      alignmentPreviewLiveRef.current = {
        ...alignmentPreviewLiveRef.current,
        imageGapMm: clamped,
      };
      scheduleAllPreviewRedraw();
    },
    [clampNumImageGapMm, scheduleAllPreviewRedraw],
  );

  const handleQuestionNumberImageGapCommit = useCallback(
    (value: number) => {
      const clamped = clampNumImageGapMm(value);
      alignmentPreviewLiveRef.current = null;
      scheduleAllPreviewRedraw();
      const storeVal = useEditorStore.getState().questionNumberImageGapMm;
      if (Math.abs(storeVal - clamped) > 0.0001) {
        setQuestionNumberImageGapMm(clamped);
      }
      numImageGapDragStartRef.current = null;
      endGapSliderScrollSession();
    },
    [clampNumImageGapMm, setQuestionNumberImageGapMm, scheduleAllPreviewRedraw, endGapSliderScrollSession],
  );

  const handleQuestionNumberImageGapCancel = useCallback(() => {
    numImageGapDragStartRef.current = null;
    alignmentPreviewLiveRef.current = null;
    scheduleAllPreviewRedraw();
    endGapSliderScrollSession();
  }, [scheduleAllPreviewRedraw, endGapSliderScrollSession]);

  const clearLayoutLivePreview = useCallback(() => {
    layoutLiveRef.current = null;
  }, []);

  const reflowScaledQuestionLayout = useCallback(
    (
      scaledLayout: LayoutItem[],
      orderIndex: number,
      placementOverrides: Record<string, LayoutPlacementOverride>,
    ): { layout: LayoutItem[]; placementOverrides: Record<string, LayoutPlacementOverride> } | null => {
      const exportState = useEditorStore.getState();
      const result = tryReflowAfterQuestionScale({
        rawLayout: scaledLayout,
        questions: exportState.questions,
        orderIndex,
        geometry: layoutGeometryInput,
        columns,
        maxQuestionPage,
        questionGapMinMm: questionGapMm,
        placementOverrides,
        questionNumberingEnabled: exportState.questionNumberingEnabled,
        questionNumberStart: exportState.questionNumberStart,
        questionNumberFontPt: exportState.questionNumberFontPt,
      });
      if (!result.ok) {
        setColumnShiftError(result.error);
        return null;
      }
      setColumnShiftError(null);
      return { layout: result.layout, placementOverrides: result.placementOverrides };
    },
    [layoutGeometryInput, columns, maxQuestionPage, questionGapMm, questionNumberFontPt],
  );

  const applyScalePreviewLayout = useCallback(
    (
      session: NonNullable<typeof scalePreviewSessionRef.current>,
      orderIndex: number,
      newScale: number,
    ): LayoutItem[] => {
      const factor = newScale / session.baseScale;
      const scaledLayout = applyDisplayScalePreviewToLayout(
        session.baseLayout,
        orderIndex,
        session.baseItem,
        factor,
      );
      const reflowed = reflowScaledQuestionLayout(
        scaledLayout,
        orderIndex,
        session.placementOverrides,
      );
      const nextLayout = reflowed?.layout ?? scaledLayout;
      if (reflowed) {
        session.placementOverrides = reflowed.placementOverrides;
        session.baseLayout = JSON.parse(JSON.stringify(reflowed.layout)) as LayoutItem[];
        const scaledItem = reflowed.layout.find((l) => l.order_index === orderIndex);
        if (scaledItem) {
          session.baseItem = JSON.parse(JSON.stringify(scaledItem)) as LayoutItem;
          session.baseScale = newScale;
        }
      }
      return nextLayout;
    },
    [reflowScaledQuestionLayout],
  );

  const applySingleQuestionScaleReflow = useCallback(
    async (orderIndex: number, sizePct: number) => {
      const qs = useEditorStore.getState().questions;
      const q = qs.find((x) => x.order_index === orderIndex);
      if (!q) return;

      const session = scalePreviewSessionRef.current;
      const baseItem =
        session?.orderIndex === orderIndex
          ? session.baseItem
          : layoutRef.current.find((l) => l.order_index === orderIndex);
      if (!baseItem) return;
      const baseScale =
        session?.orderIndex === orderIndex
          ? session.baseScale
          : (pendingDisplayScaleRef.current[q.id] ?? q.display_scale ?? 1);

      const clamped = clampDisplayScalePctToColumn(
        sizePct,
        baseItem,
        baseScale,
        layoutGeometryInput,
        columns,
        questionNumberFontPt,
      );
      const newScale = clamped / 100;

      delete pendingDisplayScaleRef.current[q.id];
      scalePreviewSessionRef.current = null;

      const storeScale = q.display_scale ?? 1;
      if (Math.abs(storeScale - newScale) > 0.0001) {
        setQuestionDisplayScale(q.id, newScale);
      }

      setColumnShiftError(null);
      try {
        const data = await fetchLayout(undefined, undefined, { silent: true });
        if (!data) return;

        const exportState = useEditorStore.getState();
        const rawLayout = mergeLayoutImagesFromQuestions(data.layout, exportState.questions);
        baseLayoutRef.current = rawLayout;

        const startOverrides =
          session?.orderIndex === orderIndex
            ? session.placementOverrides
            : exportState.layoutPlacementOverridesByQuestionId;

        const result = tryReflowAfterQuestionScale({
          rawLayout,
          questions: exportState.questions,
          orderIndex,
          geometry: layoutGeometryInput,
          columns,
          maxQuestionPage,
          questionGapMinMm: questionGapMm,
          placementOverrides: startOverrides,
          questionNumberingEnabled: exportState.questionNumberingEnabled,
          questionNumberStart: exportState.questionNumberStart,
          questionNumberFontPt: exportState.questionNumberFontPt,
        });

        if (!result.ok) {
          setColumnShiftError(result.error);
          return;
        }

        const pageNum = baseItem.page_num ?? 1;
        const band = computePageColumnBand({ ...layoutGeometryInput, pageNum, columns });
        const colIdx = columnIndexFromQuestionXPt(baseItem.x_pt, band);
        const existingOv = exportState.layoutPlacementOverridesByQuestionId[q.id];
        const placementOverride =
          result.placementOverrides[q.id] ??
          existingOv ?? {
            page_num: pageNum,
            column_index: colIdx,
            insert_at: "bottom" as const,
          };

        applyColumnPlacementResult(
          {
            ok: true,
            layout: result.layout,
            questionId: q.id,
            placementOverride,
            placementOverrides: result.placementOverrides,
            yTopUpdatesByQuestionId: result.yTopUpdatesByQuestionId,
          },
          rawLayout,
          exportState.questions,
          orderIndex,
        );
        clearLayoutLivePreview();
        scheduleAllPreviewRedraw();
      } catch (e) {
        setColumnShiftError(e instanceof Error ? e.message : "Soru boyutu uygulanamadı");
      }
    },
    [
      layoutGeometryInput,
      columns,
      maxQuestionPage,
      questionGapMm,
      questionNumberFontPt,
      setQuestionDisplayScale,
      fetchLayout,
      applyColumnPlacementResult,
      clearLayoutLivePreview,
      scheduleAllPreviewRedraw,
    ],
  );

  const getDisplayScaleMaxPctForOrder = useCallback(
    (orderIndex: number): number => {
      const session = scalePreviewSessionRef.current;
      const baseItem =
        session?.orderIndex === orderIndex
          ? session.baseItem
          : layoutRef.current.find((l) => l.order_index === orderIndex);
      if (!baseItem) return DISPLAY_SCALE_MAX_PCT;
      const q = useEditorStore.getState().questions.find((x) => x.order_index === orderIndex);
      const baseScale =
        session?.orderIndex === orderIndex
          ? session.baseScale
          : (pendingDisplayScaleRef.current[q?.id ?? ""] ?? q?.display_scale ?? 1);
      return clampDisplayScalePctToColumn(
        DISPLAY_SCALE_MAX_PCT,
        baseItem,
        baseScale,
        layoutGeometryInput,
        columns,
        questionNumberFontPt,
      );
    },
    [layoutGeometryInput, columns, questionNumberFontPt],
  );

  const handleQuestionDisplayScaleChange = useCallback(
    (
      orderIndex: number,
      sizePct: number,
      phase: "start" | "move" | "commit" | "cancel" | "persist"
    ) => {
      const qs = useEditorStore.getState().questions;
      const q = qs.find((x) => x.order_index === orderIndex);
      if (!q) return;

      const effectiveScale = () =>
        pendingDisplayScaleRef.current[q.id] ?? q.display_scale ?? 1;

      if (phase === "start") {
        const baseItem = layoutRef.current.find((l) => l.order_index === orderIndex);
        if (!baseItem) return;
        clearLayoutLivePreview();
        const exportState = useEditorStore.getState();
        scalePreviewSessionRef.current = {
          orderIndex,
          baseItem: JSON.parse(JSON.stringify(baseItem)) as LayoutItem,
          baseScale: effectiveScale(),
          baseLayout: JSON.parse(JSON.stringify(layoutRef.current)) as LayoutItem[],
          placementOverrides: { ...exportState.layoutPlacementOverridesByQuestionId },
        };
        return;
      }

      if (phase === "cancel") {
        delete pendingDisplayScaleRef.current[q.id];
        const session = scalePreviewSessionRef.current;
        if (session?.orderIndex === orderIndex) {
          setLayout(session.baseLayout);
          layoutRef.current = session.baseLayout;
        }
        scalePreviewSessionRef.current = null;
        clearLayoutLivePreview();
        scheduleAllPreviewRedraw();
        setColumnShiftError(null);
        return;
      }

      let session = scalePreviewSessionRef.current;
      if (!session || session.orderIndex !== orderIndex) {
        const baseItem = layoutRef.current.find((l) => l.order_index === orderIndex);
        if (!baseItem) return;
        const exportState = useEditorStore.getState();
        session = {
          orderIndex,
          baseItem: JSON.parse(JSON.stringify(baseItem)) as LayoutItem,
          baseScale: effectiveScale(),
          baseLayout: JSON.parse(JSON.stringify(layoutRef.current)) as LayoutItem[],
          placementOverrides: { ...exportState.layoutPlacementOverridesByQuestionId },
        };
        scalePreviewSessionRef.current = session;
      }

      const clamped = clampDisplayScalePctToColumn(
        sizePct,
        session.baseItem,
        session.baseScale,
        layoutGeometryInput,
        columns,
        questionNumberFontPt,
      );
      const newScale = clamped / 100;

      if (phase === "move") {
        pendingDisplayScaleRef.current[q.id] = newScale;
        const nextLayout = applyScalePreviewLayout(session, orderIndex, newScale);
        clearLayoutLivePreview();
        layoutRef.current = nextLayout;
        setLayout(nextLayout);
        scheduleAllPreviewRedraw();
        return;
      }

      if (phase === "commit") {
        pendingDisplayScaleRef.current[q.id] = newScale;
        const nextLayout = applyScalePreviewLayout(session, orderIndex, newScale);
        clearLayoutLivePreview();
        layoutRef.current = nextLayout;
        setLayout(nextLayout);
        scheduleAllPreviewRedraw();
        return;
      }

      void applySingleQuestionScaleReflow(orderIndex, clamped);
    },
    [
      layoutGeometryInput,
      columns,
      questionNumberFontPt,
      applySingleQuestionScaleReflow,
      applyScalePreviewLayout,
      clearLayoutLivePreview,
      scheduleAllPreviewRedraw,
    ],
  );

  const buildBulkScaleEntries = useCallback(
    (orderIndices: number[]) => {
      const selected = new Set(orderIndices);
      const qs = applyPendingDisplayScales(useEditorStore.getState().questions).filter((q) =>
        selected.has(q.order_index),
      );
      const entries: NonNullable<typeof bulkScaleSessionRef.current>["entries"] = [];
      for (const q of qs) {
        const baseItem = layoutRef.current.find((l) => l.order_index === q.order_index);
        if (!baseItem) continue;
        entries.push({
          orderIndex: q.order_index,
          questionId: q.id,
          baseItem: JSON.parse(JSON.stringify(baseItem)) as LayoutItem,
          baseScale: pendingDisplayScaleRef.current[q.id] ?? q.display_scale ?? 1,
        });
      }
      return entries;
    },
    [applyPendingDisplayScales],
  );

  const startAllQuestionsScaleSession = useCallback(() => {
    const qs = applyPendingDisplayScales(useEditorStore.getState().questions);
    bulkScaleSessionRef.current = {
      mode: "all",
      entries: buildBulkScaleEntries(qs.map((q) => q.order_index)),
    };
  }, [applyPendingDisplayScales, buildBulkScaleEntries]);

  const applyBulkScalePreview = useCallback(
    (pct: number, mode: "all" | "selected", setSlider: (value: number) => void) => {
      const session = bulkScaleSessionRef.current;
      if (!session || session.mode !== mode) return;
      const clamped = clampDisplayScalePct(pct);
      const factor = clamped / DISPLAY_SCALE_NEUTRAL_PCT;
      setSlider(clamped);
      setLayout((prev) => {
        let next = prev;
        for (const entry of session.entries) {
          pendingDisplayScaleRef.current[entry.questionId] = Math.max(
            0.5,
            Math.min(2, entry.baseScale * factor),
          );
          next = applyDisplayScalePreviewToLayout(next, entry.orderIndex, entry.baseItem, factor);
        }
        layoutRef.current = next;
        return next;
      });
    },
    [],
  );

  const commitBulkScale = useCallback(
    (pct: number, mode: "all" | "selected", resetSlider: () => void) => {
      const session = bulkScaleSessionRef.current;
      if (!session || session.mode !== mode) return;
      const clamped = clampDisplayScalePct(pct);
      const factor = clamped / DISPLAY_SCALE_NEUTRAL_PCT;
      const updates: Record<string, number> = {};
      for (const entry of session.entries) {
        updates[entry.questionId] = Math.max(0.5, Math.min(2, entry.baseScale * factor));
      }
      setQuestionsDisplayScale(updates);
      for (const entry of session.entries) {
        delete pendingDisplayScaleRef.current[entry.questionId];
      }
      bulkScaleSessionRef.current = null;
      resetSlider();
      // Store ölçeği + layout motoru senkron — kaydet/önizleme aynı kalsın.
      void fetchLayout(undefined, useEditorStore.getState().questions, { silent: true });
    },
    [setQuestionsDisplayScale, fetchLayout],
  );

  const cancelBulkScale = useCallback(
    (mode: "all" | "selected", resetSlider: () => void) => {
      const session = bulkScaleSessionRef.current;
      if (!session || session.mode !== mode) {
        resetSlider();
        return;
      }
      setLayout((prev) => {
        let next = prev;
        for (const entry of session.entries) {
          delete pendingDisplayScaleRef.current[entry.questionId];
          next = next.map((l) => (l.order_index === entry.orderIndex ? entry.baseItem : l));
        }
        layoutRef.current = next;
        return next;
      });
      bulkScaleSessionRef.current = null;
      resetSlider();
    },
    [],
  );

  const handleAllQuestionsScalePreview = useCallback(
    (pct: number) => applyBulkScalePreview(pct, "all", setAllQuestionsScaleSliderPct),
    [applyBulkScalePreview],
  );

  const handleAllQuestionsScaleCommit = useCallback(
    (pct: number) =>
      commitBulkScale(pct, "all", () => setAllQuestionsScaleSliderPct(DISPLAY_SCALE_NEUTRAL_PCT)),
    [commitBulkScale],
  );

  const handleAllQuestionsScaleCancel = useCallback(
    () => cancelBulkScale("all", () => setAllQuestionsScaleSliderPct(DISPLAY_SCALE_NEUTRAL_PCT)),
    [cancelBulkScale],
  );

  const startSelectedQuestionsScaleSession = useCallback(() => {
    bulkScaleSessionRef.current = {
      mode: "selected",
      entries: buildBulkScaleEntries(selectedQuestionOrders),
    };
  }, [buildBulkScaleEntries, selectedQuestionOrders]);

  const handleSelectedQuestionsScalePreview = useCallback(
    (pct: number) => {
      if (selectedQuestionOrders.length === 1) {
        const idx = selectedQuestionOrders[0]!;
        handleQuestionDisplayScaleChange(idx, pct, "move");
        const session = scalePreviewSessionRef.current;
        if (session?.orderIndex === idx) {
          setSelectedQuestionScaleSliderPct(
            clampDisplayScalePctToColumn(
              pct,
              session.baseItem,
              session.baseScale,
              layoutGeometryInput,
              columns,
              questionNumberFontPt,
            ),
          );
        } else {
          setSelectedQuestionScaleSliderPct(pct);
        }
        return;
      }
      applyBulkScalePreview(pct, "selected", setSelectedQuestionScaleSliderPct);
    },
    [
      selectedQuestionOrders,
      handleQuestionDisplayScaleChange,
      applyBulkScalePreview,
      layoutGeometryInput,
      columns,
      questionNumberFontPt,
    ],
  );

  const handleSelectedQuestionsScaleCommit = useCallback(
    (pct: number) => {
      if (selectedQuestionOrders.length === 1) {
        void applySingleQuestionScaleReflow(selectedQuestionOrders[0]!, pct);
        bulkScaleSessionRef.current = null;
        setSelectedQuestionScaleSliderPct(DISPLAY_SCALE_NEUTRAL_PCT);
        return;
      }
      commitBulkScale(pct, "selected", () =>
        setSelectedQuestionScaleSliderPct(DISPLAY_SCALE_NEUTRAL_PCT),
      );
    },
    [selectedQuestionOrders, applySingleQuestionScaleReflow, commitBulkScale],
  );

  const handleSelectedQuestionsScaleCancel = useCallback(() => {
    if (selectedQuestionOrders.length === 1) {
      handleQuestionDisplayScaleChange(selectedQuestionOrders[0]!, 0, "cancel");
      bulkScaleSessionRef.current = null;
      setSelectedQuestionScaleSliderPct(DISPLAY_SCALE_NEUTRAL_PCT);
      return;
    }
    cancelBulkScale("selected", () =>
      setSelectedQuestionScaleSliderPct(DISPLAY_SCALE_NEUTRAL_PCT),
    );
  }, [selectedQuestionOrders, handleQuestionDisplayScaleChange, cancelBulkScale]);

  const handleApplyQuestionLineHeightMatch = useCallback(async () => {
    const band = computePageColumnBand({
      ...layoutGeometryInput,
      pageNum: 1,
      columns,
    });
    const maxNum = Math.max(
      1,
      ...questions.map(
        (q) => (q.order_index ?? 0) + Math.max(1, questionNumberStart),
      ),
    );
    const availW =
      band.colWidthPt -
      maxQuestionNumberTextWidthPt(maxNum, questionNumberFontPt) -
      questionNumberImageGapPt(layoutGeometryInput) -
      2 -
      Math.max(0, mmToPdfPt(questionNumberLeftOffsetMm));

    // Sütun yerleşimini eşitleme sonrası sabitle (sola yığılmayı azaltır).
    const freeze: Record<
      string,
      { page_num: number; column_index: number; insert_at: "top" | "bottom" }
    > = {};
    const qByOrder = new Map(questions.map((q) => [q.order_index, q]));
    for (const item of layoutRef.current) {
      if (item.kind === "answer_key_page") continue;
      const q = qByOrder.get(item.order_index);
      if (!q) continue;
      const pageBand = computePageColumnBand({
        ...layoutGeometryInput,
        pageNum: item.page_num,
        columns,
      });
      freeze[q.id] = {
        page_num: item.page_num,
        column_index: columnIndexFromQuestionXPt(item.x_pt, pageBand),
        insert_at: "bottom",
      };
    }
    if (Object.keys(freeze).length > 0) {
      mergeLayoutPlacementOverridesByQuestionId(freeze);
    }

    const result = await applyQuestionLineHeightMatch({
      availWPt: Math.max(0, availW),
      targetLinePt: useEditorStore.getState().targetQuestionLinePt,
    });

    bulkScaleSessionRef.current = null;
    pendingDisplayScaleRef.current = {};
    scalePreviewSessionRef.current = null;
    setAllQuestionsScaleSliderPct(DISPLAY_SCALE_NEUTRAL_PCT);
    setSelectedQuestionScaleSliderPct(DISPLAY_SCALE_NEUTRAL_PCT);

    await fetchLayout(undefined, useEditorStore.getState().questions, {
      silent: true,
    });
    return result;
  }, [
    applyQuestionLineHeightMatch,
    fetchLayout,
    layoutGeometryInput,
    columns,
    questions,
    questionNumberStart,
    questionNumberFontPt,
    questionNumberLeftOffsetMm,
    mergeLayoutPlacementOverridesByQuestionId,
  ]);

  const handleRestoreOriginalQuestionScales = useCallback(async () => {
    const snap = originalQuestionScaleRef.current;
    if (Object.keys(snap).length === 0) return;
    restoreQuestionsScaleSnapshot(snap);
    bulkScaleSessionRef.current = null;
    pendingDisplayScaleRef.current = {};
    scalePreviewSessionRef.current = null;
    setAllQuestionsScaleSliderPct(DISPLAY_SCALE_NEUTRAL_PCT);
    setSelectedQuestionScaleSliderPct(DISPLAY_SCALE_NEUTRAL_PCT);
    await fetchLayout(undefined, useEditorStore.getState().questions, { silent: true });
  }, [restoreQuestionsScaleSnapshot, fetchLayout]);

  const selectedQuestionScaleLabel = useMemo(() => {
    if (selectedQuestionOrders.length === 0) return "Soru seçilmedi";
    if (selectedQuestionOrders.length === 1) {
      const idx = selectedQuestionOrders[0];
      const item = layout.find((l) => l.order_index === idx);
      return `Soru ${item?.display_number ?? idx + 1}`;
    }
    const nums = selectedQuestionOrders
      .map((idx) => {
        const item = layout.find((l) => l.order_index === idx);
        return item?.display_number ?? idx + 1;
      })
      .sort((a, b) => a - b);
    return `${selectedQuestionOrders.length} soru seçili (${nums.join(", ")})`;
  }, [layout, selectedQuestionOrders]);

  const selectedQuestionScaleEnabled = selectedQuestionOrders.length > 0;

  const selectedQuestionScaleMaxPct = useMemo(() => {
    if (selectedQuestionOrders.length !== 1) return DISPLAY_SCALE_MAX_PCT;
    return getDisplayScaleMaxPctForOrder(selectedQuestionOrders[0]!);
  }, [selectedQuestionOrders, getDisplayScaleMaxPctForOrder, layout]);

  const questionGapLayoutDirty = useMemo(
    () => isQuestionGapLayoutDirty(layout, questionGapInitialLayoutRef.current),
    [layout, questionGapInitialMm],
  );

  /** Sadece modal ilk açıldığında state sıfırla ve layout oluştur (her değişiklikte sıfırlamıyoruz) */
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      prevIsOpenRef.current = false;
      return;
    }
    const justOpened = !prevIsOpenRef.current;
    prevIsOpenRef.current = true;
    if (!justOpened) return;

    setError(null);
    setLayoutReady(false);
    setLayout([]);
    setSelectedQuestion(0);
    setSelectedQuestionOrders([0]);
    if (questions.length > 0) {
      setLoading(true);
      const gap = questionGapMm;
      const snap: Record<
        string,
        { display_scale: number; ocr_font_matched?: boolean; font_line_px?: number }
      > = {};
      for (const q of useEditorStore.getState().questions) {
        snap[q.id] = {
          display_scale: q.display_scale ?? 1,
          ocr_font_matched: q.ocr_font_matched ?? false,
          font_line_px: q.font_line_px,
        };
      }
      originalQuestionScaleRef.current = snap;
      fetchLayout(gap)
        .then(() => {
          setLayoutReady(true);
          setLoading(false);
        })
        .catch((e) => {
          setError(e instanceof Error ? e.message : "Önizleme yüklenemedi");
          setLoading(false);
        });
    }
    setZoom(1);
  }, [isOpen, questions.length, questionGapMm, fetchLayout]);

  const handleGeneratePreview = () => {
    setLoading(true);
    setError(null);
    fetchLayout(questionGapMm)
      .then(() => {
        setLayoutReady(true);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Önizleme yüklenemedi");
        setLoading(false);
      });
  };

  const [savingPdf, setSavingPdf] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveAlert, setSaveAlert] = useState<{ title: string; message: string } | null>(null);
  const [previewSurface, setPreviewSurface] = useState<"canvas" | "pdf">("canvas");
  const [verifyingPdf, setVerifyingPdf] = useState(false);
  const [verifyPdfError, setVerifyPdfError] = useState<string | null>(null);
  const [verifiedPdfDoc, setVerifiedPdfDoc] = useState<VerifiedPdfDoc | null>(null);
  const verifiedPdfDocRef = useRef<VerifiedPdfDoc | null>(null);
  const verifyPdfGenRef = useRef(0);

  useEffect(() => {
    if (!layoutReady || totalPages < 1) return;
    const root = previewScrollRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollFromNavRef.current || suppressPageObserverRef.current) return;
        let bestPage: number | null = null;
        let bestRatio = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const raw = (entry.target as HTMLElement).dataset.pageNum;
          const page = raw ? Number(raw) : NaN;
          if (!Number.isFinite(page)) continue;
          if (entry.intersectionRatio >= bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestPage = page;
          }
        }
        if (bestPage != null) setCurrentPage(bestPage);
      },
      { root, threshold: [0.35, 0.55, 0.75] }
    );

    for (const el of pageBlockRefs.current.values()) observer.observe(el);
    return () => observer.disconnect();
  }, [layoutReady, totalPages, previewSurface]);

  useLayoutEffect(() => {
    if (previewScrollAnchorRef.current) {
      restorePreviewScroll();
    }
  });

  const clearVerifiedPdfDoc = useCallback(() => {
    const doc = verifiedPdfDocRef.current;
    verifiedPdfDocRef.current = null;
    setVerifiedPdfDoc(null);
    if (doc) {
      try {
        void doc.destroy();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const buildLiveExportPayload = useCallback(() => {
    // Sürüklenen ölçekleri store’a yaz — aksi halde PDF eski boyutta kalır.
    const pending = pendingDisplayScaleRef.current;
    if (Object.keys(pending).length > 0) {
      setQuestionsDisplayScale({ ...pending });
      pendingDisplayScaleRef.current = {};
    }
    const s = useEditorStore.getState();
    const includeDescription =
      s.options.includeDescription && !isCorporateHeader(s.headerStyleId);
    const exportAnswerKeyMode =
      (isWritten || isTrial) && s.options.includeAnswerKey
        ? "separate_page"
        : s.answerKeyMode ?? "per_page";
    const writtenTitle = buildWrittenPaperTitle({
      schoolName: s.schoolName ?? "",
      classSection: s.classSection,
      testName: s.testName ?? "",
      examType: s.examType,
    });
    const teacherRows = s.teacherNames.map((t) => ({
      name: t.name ?? "",
      title: t.title ?? "",
    }));
    const writtenTeachers =
      !s.writtenPaperOptions.addTeacherName
        ? undefined
        : (teacherRows.length > 0 ? teacherRows : [{ name: "", title: "" }]).map((t) => ({
            name: t.name,
            title: t.title,
          }));

    const previewLayout =
      layoutLiveRef.current && layoutLiveRef.current.length > 0
        ? layoutLiveRef.current
        : layoutRef.current;

    return buildPdfExportPayload({
      questions: applyPendingDisplayScales(s.questions),
      layout: previewLayout,
      baseLayout: baseLayoutRef.current,
      lockPreviewLayout: true,
      columns: s.columns,
      targetQuestionLinePt: s.targetQuestionLinePt,
      allowSlightOverflow: s.allowSlightOverflow,
      pageWpt,
      pageHpt,
      marginTopMm: s.marginTopMm,
      marginBottomMm: s.marginBottomMm,
      marginLeftMm: s.marginLeftMm,
      marginRightMm: s.marginRightMm,
      placementOverrides: s.layoutPlacementOverridesByQuestionId,
      yOverridesByQuestionId: s.layoutYTopOverridesByQuestionIdPt,
      title: isWritten ? s.testName?.trim() || "Yazılı" : s.testName?.trim() || "TEST",
      schoolName: s.schoolName?.trim() || "",
      includeAnswerKey: s.options.includeAnswerKey,
      answerKeyMode: exportAnswerKeyMode,
      questionGapMm: lastLayoutGapMmRef.current,
      questionGapMinMm: s.questionGapMinMm,
      autoCompactSpacing: s.autoCompactSpacing,
      paperSize: s.paperSize,
      paperWidthMm: s.paperWidthMm,
      paperHeightMm: s.paperHeightMm,
      orientation: s.orientation,
      watermarkEnabled: s.watermarkEnabled,
      watermarkSettings: s.watermarkSettings,
      showColumnDivider: s.showColumnDivider,
      columnDividerText: s.columnDividerText,
      columnDividerColor: s.columnDividerColor,
      columnDividerWidthPt: s.columnDividerWidthPt,
      showColumnDividerText: s.showColumnDividerText,
      showWatermark: s.showWatermark,
      watermarkText: s.watermarkText,
      watermarkLayout: s.watermarkLayout,
      watermarkAngleDeg: s.watermarkAngleDeg,
      watermarkOpacity: s.watermarkOpacity,
      watermarkSize: s.watermarkSize,
      watermarkLogoUrl: s.watermarkLogoUrl,
      showPageFrame: s.showPageFrame,
      pageFrameColorMode: s.pageFrameColorMode,
      pageFrameColor: s.pageFrameColor,
      pageFrameWidthPt: s.pageFrameWidthPt,
      pageFrameInnerGapMm: s.pageFrameInnerGapMm,
      pageFrameCornerRadiusMm: s.pageFrameCornerRadiusMm,
      pageFrameLineStyle: s.pageFrameLineStyle,
      themeColor: s.themeColor,
      headerStyleId: s.headerStyleId,
      headerConfig: s.headerConfig,
      quality,
      sections: s.sections,
      includeDescription,
      descriptionColumnCount: s.descriptionColumnCount ?? 1,
      descriptionTexts: s.descriptionTexts ?? [],
      descriptionColumnDividers: s.descriptionColumnDividers,
      addTextOnLine:
        s.showColumnDividerText &&
        s.showColumnDivider &&
        !!s.columnDividerText.trim(),
      centerLineText: s.columnDividerText,
      centerLineBold: s.centerLineBold,
      centerLineItalic: s.centerLineItalic,
      centerLineTextDirection: s.centerLineTextDirection ?? "up",
      headerBottomGapMm: s.headerBottomGapMm,
      otherPageHeaderBottomGapMm: s.otherPageHeaderBottomGapMm,
      questionNumberLeftOffsetMm: s.questionNumberLeftOffsetMm,
      questionNumberImageGapMm: s.questionNumberImageGapMm,
      questionNumberingEnabled: s.questionNumberingEnabled,
      questionNumberStart: s.questionNumberStart,
      questionNumberColorMode: s.questionNumberColorMode,
      questionNumberFontPt: s.questionNumberFontPt,
      pageNumberingEnabled: s.pageNumberingEnabled,
      pageNumberStart: s.pageNumberStart,
      pageNumberFormat: s.pageNumberFormat,
      writtenBlock: isWritten
        ? {
            written_paper_header: true,
            written_paper_title: writtenTitle,
            exam_type: s.examType || undefined,
            class_section: s.classSection || undefined,
            group: s.group !== "Grup Yok" ? s.group : undefined,
            teacher_names: writtenTeachers,
            written_paper_field_lines: writtenFieldLinesPayload(s.writtenHeaderFieldLines),
            written_paper_field_hidden: writtenFieldHiddenPayload(s.writtenHeaderFieldHidden),
            written_paper_field_labels: writtenFieldLabelsPayload(s.writtenHeaderFieldLabels),
          }
        : undefined,
    });
  }, [
    isWritten,
    isTrial,
    pageWpt,
    pageHpt,
    quality,
    applyPendingDisplayScales,
    setQuestionsDisplayScale,
  ]);

  const buildLiveExportPayloadAsync = useCallback(async () => {
    const payload = buildLiveExportPayload();
    const hc = payload.header_config as import("../../utils/corporateHeaderLayout").HeaderConfig;
    const logoUrl = await resolveThemedHeaderLogoUrl(hc, themeColor);
    return { ...payload, header_config: { ...hc, logoUrl } };
  }, [buildLiveExportPayload, themeColor]);

  const runVerifyPdf = useCallback(async () => {
    if (questions.length === 0 || !layoutReady) return;
    const gen = ++verifyPdfGenRef.current;
    setVerifyingPdf(true);
    setVerifyPdfError(null);
    try {
      const blob = await api.exports.fromQuestions(await buildLiveExportPayloadAsync());
      if (gen !== verifyPdfGenRef.current) return;
      const bytes = await blob.arrayBuffer();
      if (gen !== verifyPdfGenRef.current) return;
      const loaded = await loadPdfFromBytes(bytes);
      if (gen !== verifyPdfGenRef.current) {
        try {
          void loaded.doc.destroy();
        } catch {
          /* ignore */
        }
        return;
      }
      clearVerifiedPdfDoc();
      verifiedPdfDocRef.current = loaded.doc;
      setVerifiedPdfDoc(loaded.doc);
    } catch (e) {
      if (gen !== verifyPdfGenRef.current) return;
      setVerifyPdfError(e instanceof Error ? e.message : "PDF önizlemesi oluşturulamadı");
    } finally {
      if (gen === verifyPdfGenRef.current) setVerifyingPdf(false);
    }
  }, [questions.length, layoutReady, buildLiveExportPayloadAsync, clearVerifiedPdfDoc]);

  useEffect(() => {
    if (!isOpen) {
      verifyPdfGenRef.current += 1;
      clearVerifiedPdfDoc();
      setPreviewSurface("canvas");
      setVerifyPdfError(null);
      scalePreviewSessionRef.current = null;
      bulkScaleSessionRef.current = null;
      pendingDisplayScaleRef.current = {};
      numOffsetDragStartRef.current = null;
      numImageGapDragStartRef.current = null;
      headerBottomGapDragStartRef.current = null;
      otherPageHeaderBottomGapDragStartRef.current = null;
      if (headerBottomGapRafRef.current != null) {
        window.cancelAnimationFrame(headerBottomGapRafRef.current);
        headerBottomGapRafRef.current = null;
      }
      if (otherPageHeaderBottomGapRafRef.current != null) {
        window.cancelAnimationFrame(otherPageHeaderBottomGapRafRef.current);
        otherPageHeaderBottomGapRafRef.current = null;
      }
      layoutLiveRef.current = null;
      alignmentPreviewLiveRef.current = null;
      gapSliderScrollSessionRef.current = 0;
      previewScrollAnchorRef.current = null;
      suppressPageObserverRef.current = false;
      questionGapSkipFetchRef.current = false;
      if (questionGapDebounceRef.current != null) {
        window.clearTimeout(questionGapDebounceRef.current);
        questionGapDebounceRef.current = null;
      }
      questionGapLayoutFetchRef.current += 1;
    }
  }, [isOpen, clearVerifiedPdfDoc]);

  useEffect(() => {
    if (previewSurface !== "pdf" || !layoutReady) return;
    const timer = window.setTimeout(() => {
      void runVerifyPdf();
    }, 350);
    return () => window.clearTimeout(timer);
    // previewSurface bilerek yok: ilk geçiş butondaki runVerifyPdf ile yapılır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    layoutReady,
    layout,
    layoutPlacementOverridesByQuestionId,
    layoutYTopOverridesByQuestionIdPt,
    quality,
    headerStyleId,
    headerConfig,
    themeColor,
    headerBottomGapMm,
    otherPageHeaderBottomGapMm,
    marginTopMm,
    showWatermark,
    watermarkLayout,
    watermarkAngleDeg,
    watermarkOpacity,
    watermarkSize,
    watermarkText,
    watermarkLogoUrl,
    showPageFrame,
    pageFrameColorMode,
    pageFrameColor,
    pageFrameWidthPt,
    pageFrameInnerGapMm,
    pageFrameCornerRadiusMm,
    pageFrameLineStyle,
    showColumnDivider,
    showColumnDividerText,
    columnDividerText,
    columnDividerColor,
    columnDividerWidthPt,
    centerLineBold,
    centerLineItalic,
    centerLineTextDirection,
    questionNumberLeftOffsetMm,
    questionNumberImageGapMm,
    runVerifyPdf,
  ]);

  useEffect(() => {
    if (previewSurface === "pdf") return;
    verifyPdfGenRef.current += 1;
    clearVerifiedPdfDoc();
  }, [previewSurface, clearVerifiedPdfDoc]);

  useEffect(() => {
    if (previewSurface !== "pdf") return;
    // Yüzey değişiminde değil; içerik değişince eski belgeyi düşür (in-flight iptal)
    verifyPdfGenRef.current += 1;
    clearVerifiedPdfDoc();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- previewSurface kasıtlı dışarıda
  }, [
    headerStyleId,
    headerConfig,
    themeColor,
    headerBottomGapMm,
    otherPageHeaderBottomGapMm,
    showWatermark,
    watermarkLayout,
    watermarkAngleDeg,
    watermarkOpacity,
    watermarkSize,
    watermarkText,
    watermarkLogoUrl,
    showPageFrame,
    pageFrameColorMode,
    pageFrameColor,
    pageFrameWidthPt,
    pageFrameInnerGapMm,
    pageFrameCornerRadiusMm,
    pageFrameLineStyle,
    showColumnDivider,
    showColumnDividerText,
    columnDividerText,
    columnDividerColor,
    columnDividerWidthPt,
    questionNumberLeftOffsetMm,
    questionNumberImageGapMm,
    clearVerifiedPdfDoc,
  ]);

  const handleSavePdf = async () => {
    if (questions.length === 0) return;
    setSavingPdf(true);
    setSaveError(null);
    setSaveAlert(null);
    try {
      const safeName = (testName?.trim() || "test").replace(/[^\w\u00C0-\u024F\u4E00-\u9FFF-]/gi, "-") || "test";
      const isElectron = Boolean(window.electronAPI?.savePdfDialog && window.electronAPI?.savePdfFile);

      let fileHandle: FileSystemFileHandle | null = null;
      if (!isElectron) {
        const savePicker = (window as Window & {
          showSaveFilePicker?: (opts: {
            suggestedName?: string;
            types?: { description: string; accept: Record<string, string[]> }[];
          }) => Promise<FileSystemFileHandle>;
        }).showSaveFilePicker;
        if (typeof savePicker === "function") {
          fileHandle = await savePicker({
            suggestedName: `${safeName}.pdf`,
            types: [
              { description: "PDF Dosyası", accept: { "application/pdf": [".pdf"] } },
            ],
          });
        }
      }

      const blob = await api.exports.fromQuestions(await buildLiveExportPayloadAsync());

      if (isElectron) {
        const filePath = await window.electronAPI!.savePdfDialog!(`${safeName}.pdf`);
        if (!filePath) return;
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
        await window.electronAPI!.savePdfFile!(filePath, btoa(binary));
      } else if (fileHandle) {
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${safeName}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
      // PDF kaydettikten sonra modal açık kalsın, ana editöre dönme
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      const raw = e instanceof Error ? e.message : String(e ?? "");
      const locked =
        /FILE_LOCKED|EBUSY|EPERM|EACCES|resource busy|locked/i.test(raw) ||
        /busy or locked/i.test(raw);
      if (locked) {
        setSaveAlert({
          title: "Dosya şu an kullanımda",
          message:
            "Kaydetmek istediğiniz PDF başka bir uygulamada (örneğin okuyucu veya Word) açık görünüyor. Lütfen o dosyayı kapatıp yeniden kaydetmeyi deneyin.",
        });
        return;
      }
      setSaveAlert({
        title: "PDF kaydedilemedi",
        message:
          "Dosya kaydedilirken bir sorun oluştu. Farklı bir konum veya dosya adı seçerek tekrar deneyebilirsiniz.",
      });
      setSaveError(null);
    } finally {
      setSavingPdf(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <PdfPreviewScrollSessionProvider
      begin={beginGapSliderScrollSession}
      end={endGapSliderScrollSession}
    >
    <div
      className={`pdf-preview-modal fixed inset-0 z-50 flex flex-col ${ui.shell}`}
      data-pdf-ui-theme={uiMode}
      style={{ fontFamily }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-preview-title"
    >
      <h1 id="pdf-preview-title" className="sr-only">
        PDF düzenleme
      </h1>
      <AppTopBar
        className="pdf-preview-top-bar"
        onModuleSelect={() => onClose()}
        leftSlot={
          <button
            type="button"
            onClick={onClose}
            className="pdf-preview-back-btn"
            aria-label="Editöre geri dön"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <span>Geri dön</span>
          </button>
        }
        extraActions={<PdfPreviewThemeToggle variant="topbar" compact />}
        hideRightActions
      />
      <div className="flex min-h-0 flex-1 overflow-hidden pdf-preview-scroll">
        {/* Sol panel - Düzenleme */}
        <div
          className={`relative flex h-full min-h-0 shrink-0 items-stretch overflow-hidden transition-[width] duration-200 ease-in-out ${
            showLeftEditPanel ? "pdf-preview-panel-left" : "pdf-preview-panel-rail"
          }`}
        >
          {showLeftEditPanel ? (
        <>
        <div
          className={`pdf-preview-panel-left-inner flex h-full min-w-0 flex-1 flex-col overflow-hidden ${ui.sidebar} ${ui.sidebarBorder}`}
        >
          <PdfPreviewPanelHeader
            title="Düzenleme paneli"
            side="left"
            onCollapseAll={() => setLeftCollapseEpoch((n) => n + 1)}
            onExpandAll={() => setLeftExpandEpoch((n) => n + 1)}
          />

          <CollapseGroupProvider closeEpoch={leftCollapseEpoch} openEpoch={leftExpandEpoch}>
          <div className="pdf-preview-panel-sections min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <PageStructurePanel
            questionGapMm={questionGapMm}
            questionGapInitialMm={questionGapInitialMm}
            questionGapLayoutDirty={questionGapLayoutDirty}
            onQuestionGapPreview={handleQuestionGapPreview}
            onQuestionGapCommit={handleQuestionGapCommit}
            onQuestionGapReset={handleQuestionGapReset}
            onQuestionGapDragStart={() => {
              questionGapDragStartRef.current = useEditorStore.getState().questionGapMm;
              beginGapSliderScrollSession();
            }}
            onQuestionGapCancel={handleQuestionGapCancel}
            allQuestionsScalePct={allQuestionsScaleSliderPct}
            onAllQuestionsScalePreview={handleAllQuestionsScalePreview}
            onAllQuestionsScaleCommit={handleAllQuestionsScaleCommit}
            onAllQuestionsScaleDragStart={startAllQuestionsScaleSession}
            onAllQuestionsScaleCancel={handleAllQuestionsScaleCancel}
            selectedQuestionScalePct={selectedQuestionScaleSliderPct}
            selectedQuestionLabel={selectedQuestionScaleLabel}
            selectedQuestionScaleEnabled={selectedQuestionScaleEnabled}
            selectedQuestionScaleMaxPct={selectedQuestionScaleMaxPct}
            onSelectedQuestionScalePreview={handleSelectedQuestionsScalePreview}
            onSelectedQuestionScaleCommit={handleSelectedQuestionsScaleCommit}
            onSelectedQuestionScaleDragStart={startSelectedQuestionsScaleSession}
            onSelectedQuestionScaleCancel={handleSelectedQuestionsScaleCancel}
            questionCount={questions.length}
            onApplyQuestionLineHeightMatch={handleApplyQuestionLineHeightMatch}
            onRestoreOriginalQuestionScales={handleRestoreOriginalQuestionScales}
          />

          {!isWritten && <YonergePanel />}

          <AnswerKeyFooterPanel />

          <AlignmentSpacingSliders
            headerBottomGapMm={headerBottomGapMm}
            otherPageHeaderBottomGapMm={otherPageHeaderBottomGapMm}
            questionNumberLeftOffsetMm={questionNumberLeftOffsetMm}
            questionNumberImageGapMm={questionNumberImageGapMm}
            onHeaderBottomGapPreview={handleHeaderBottomGapPreview}
            onHeaderBottomGapCommit={handleHeaderBottomGapCommit}
            onHeaderBottomGapDragStart={(value) => {
              headerBottomGapDragStartRef.current = value;
              beginGapSliderScrollSession();
            }}
            onHeaderBottomGapCancel={handleHeaderBottomGapCancel}
            onOtherPageHeaderBottomGapPreview={handleOtherPageHeaderBottomGapPreview}
            onOtherPageHeaderBottomGapCommit={handleOtherPageHeaderBottomGapCommit}
            onOtherPageHeaderBottomGapDragStart={(value) => {
              otherPageHeaderBottomGapDragStartRef.current = value;
              beginGapSliderScrollSession();
            }}
            onOtherPageHeaderBottomGapCancel={handleOtherPageHeaderBottomGapCancel}
            onQuestionNumberLeftOffsetPreview={handleQuestionNumberLeftOffsetPreview}
            onQuestionNumberLeftOffsetCommit={handleQuestionNumberLeftOffsetCommit}
            onQuestionNumberLeftOffsetDragStart={() => {
              numOffsetDragStartRef.current = questionNumberLeftOffsetMm;
              beginGapSliderScrollSession();
            }}
            onQuestionNumberLeftOffsetCancel={handleQuestionNumberLeftOffsetCancel}
            onQuestionNumberImageGapPreview={handleQuestionNumberImageGapPreview}
            onQuestionNumberImageGapCommit={handleQuestionNumberImageGapCommit}
            onQuestionNumberImageGapDragStart={() => {
              numImageGapDragStartRef.current = questionNumberImageGapMm;
              beginGapSliderScrollSession();
            }}
            onQuestionNumberImageGapCancel={handleQuestionNumberImageGapCancel}
          />

          {!isWritten && (
            <button
              type="button"
              onClick={() => setSectionModalOpen(true)}
              className="pdf-preview-section-add-btn w-full shrink-0 rounded-lg border py-2 text-xs font-bold"
            >
              BÖLÜM EKLE
            </button>
          )}
          </div>
          </CollapseGroupProvider>
        </div>
          <PdfPreviewPanelCollapseButton
            side="left"
            onClose={() => setShowLeftEditPanel(false)}
            closeLabel="Düzenleme panelini gizle"
          />
        </>
          ) : (
            <PdfPreviewPanelRailButton
              variant="edit"
              mode="expand"
              onClick={() => setShowLeftEditPanel(true)}
              ariaLabel="Düzenleme panelini göster"
            />
          )}
        </div>

        {!isWritten && (
          <SectionAddModal
            isOpen={sectionModalOpen}
            onClose={() => setSectionModalOpen(false)}
            selectedQuestion={selectedQuestion}
          />
        )}

        {/* Orta panel - PDF önizleme */}
        <div
          ref={containerRef}
          className={`relative flex min-w-0 flex-1 flex-col overflow-hidden ${ui.canvasArea}`}
        >
          <div
            ref={previewScrollRef}
            className="pdf-preview-scroll-area relative min-h-0 flex-1 p-6"
            onPointerDown={handlePreviewPointerDown}
          >
            {!layoutReady && !loading && !error && (
              <div
                className="pdf-preview-canvas-empty flex min-h-full min-w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-600 bg-gradient-to-br from-slate-800 via-slate-700/80 to-slate-800 p-8"
                style={{ minHeight: 400 }}
              >
                <div className="pdf-preview-canvas-empty-icon mb-6 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 p-6 shadow-lg ring-1 ring-indigo-400/20">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-100">
                  {questions.length === 0 ? "Henüz soru seçilmedi" : "PDF Önizlemesi"}
                </h3>
                <p className="mb-6 max-w-sm text-center text-sm text-slate-400">
                  {questions.length === 0
                    ? "Kırpma Aracı ile PDF'den soru ekleyin. Sorular eklendiğinde önizleme otomatik oluşturulacak."
                    : "Yukarıdaki butona tıklayarak PDF önizlemesini oluşturabilirsiniz."}
                </p>
                {questions.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate("/crop-tool");
                    }}
                    className="pdf-preview-primary-btn rounded-xl px-8 py-3 text-sm font-semibold transition"
                  >
                    Kırpma Aracına Git
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGeneratePreview}
                    className="pdf-preview-primary-btn rounded-xl px-8 py-3 text-sm font-semibold transition"
                  >
                    Önizleme Oluştur
                  </button>
                )}
              </div>
            )}
            {loading && !layoutReady && (
              <div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800/98 via-slate-900/98 to-slate-800/98"
                style={{ backgroundColor: "rgba(15, 23, 42, 0.97)" }}
              >
                <div className="mb-6 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-indigo-600/10 p-6 ring-1 ring-indigo-400/15">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="animate-pulse text-indigo-500">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
                <span className="mt-4 text-sm font-medium text-slate-300">
                  PDF önizlemesi hazırlanıyor...
                </span>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p
                  className="rounded-lg border border-rose-300 bg-rose-50 px-8 py-5 text-rose-700"
                  style={{
                    fontSize: font.base,
                    fontWeight: fontWeight.medium,
                    lineHeight: lineHeight.normal,
                  }}
                >
                  {error}
                </p>
              </div>
            )}
            {!error && layoutReady && layout.length > 0 && (
              <div className="pdf-preview-canvas-stage mx-auto flex flex-col items-center gap-2 pb-6">
                {columnShiftError && previewSurface === "canvas" && (
                  <div className="sticky top-0 z-30 mb-2 max-w-md rounded-lg border border-amber-400/80 bg-amber-950/95 px-4 py-2 text-center text-xs text-amber-100 shadow-lg">
                    {columnShiftError}
                  </div>
                )}
                {previewSurface === "pdf" && verifyPdfError && (
                  <div className="sticky top-0 z-30 mb-2 max-w-md rounded-lg border border-rose-400/80 bg-rose-950/95 px-4 py-2 text-center text-xs text-rose-100 shadow-lg">
                    {verifyPdfError}
                  </div>
                )}
                {previewSurface === "pdf" && verifyingPdf && (
                  <div className="sticky top-24 z-30 flex items-center gap-2 rounded-lg bg-slate-900/90 px-4 py-2 text-xs text-slate-200 shadow-lg">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-blue-400" />
                    Gerçek PDF oluşturuluyor…
                  </div>
                )}
                <div className="flex flex-col items-center gap-10 py-4">
                  {Array.from({ length: totalPages }, (_, i) => {
                    const pageNum = i + 1;
                    const pageGeometry: LayoutGeometryInput = {
                      ...layoutGeometryInput,
                      pageNum,
                    };
                    return (
                      <div
                        key={pageNum}
                        ref={(el) => {
                          if (el) pageBlockRefs.current.set(pageNum, el);
                          else pageBlockRefs.current.delete(pageNum);
                        }}
                        data-page-num={pageNum}
                        className="pdf-preview-page-block relative flex flex-col items-center"
                      >
                        <div className={`mb-2 ${ui.labelMuted}`}>
                          Sayfa {pageNum}
                        </div>
                        <div className={`pdf-preview-page-canvas-wrap inline-block ${ui.previewCanvasWrap}`}>
                          <div className="pdf-preview-page-canvas-shell">
                          {previewSurface === "canvas" ? (
                            <>
                              <CanvasPdfPreview
                                layout={layout}
                                pageWpt={pageWpt}
                                pageHpt={pageHpt}
                                currentPage={pageNum}
                                zoom={zoom}
                                previewSharpness={previewSharpnessForQuality(quality)}
                                selectedQuestions={selectedQuestionOrders}
                                onQuestionSelect={(idx, options) =>
                                  selectQuestionOnPage(idx, pageNum, options)
                                }
                                testTitle={testName?.trim() || "TEST"}
                                schoolName={schoolName?.trim() || ""}
                                themeColor={themeColor}
                                includeAnswerKey={options.includeAnswerKey}
                                answerKeyMode={previewAnswerKeyMode}
                                optikFormEnabled={optikFormEnabled}
                                optikFormPlacement={optikFormPlacement}
                                optikFormQuestions={optikFormQuestions}
                                optikFormOptionCount={optikFormOptionCount}
                                optikFormBookletType={optikFormBookletType}
                                optikFormInstructionEnabled={optikFormInstructionEnabled}
                                optikFormInstructionText={optikFormInstructionText}
                                optikFormNetRule={optikFormNetRule}
                                answerKeyPageCount={answerKeyPages}
                                columns={columns}
                                headerStyleId={headerStyleId}
                                headerConfig={headerConfig}
                                marginTopMm={marginTopMm}
                                marginBottomMm={marginBottomMm}
                                marginLeftMm={marginLeftMm}
                                marginRightMm={marginRightMm}
                                columnGapMm={8}
                                includeDescription={options.includeDescription}
                                descriptionColumnCount={descriptionColumnCount ?? 1}
                                descriptionTexts={descriptionTexts ?? []}
                                descriptionColumnDividers={descriptionColumnDividers}
                                addTextOnLine={
                                  showColumnDividerText &&
                                  showColumnDivider &&
                                  !!columnDividerText.trim()
                                }
                                centerLineText={columnDividerText}
                                centerLineBold={centerLineBold}
                                centerLineItalic={centerLineItalic}
                                centerLineTextDirection={centerLineTextDirection}
                                watermarkEnabled={watermarkEnabled}
                                watermarkSettings={watermarkSettings}
                                showColumnDivider={showColumnDivider}
                                columnDividerText={columnDividerText}
                                columnDividerColor={columnDividerColor}
                                columnDividerWidthPt={columnDividerWidthPt}
                                showColumnDividerText={showColumnDividerText}
                                showWatermark={showWatermark}
                                watermarkText={watermarkText}
                                watermarkLayout={watermarkLayout}
                                watermarkAngleDeg={watermarkAngleDeg}
                                watermarkOpacity={watermarkOpacity}
                                watermarkSize={watermarkSize}
                                watermarkLogoUrl={watermarkLogoUrl}
                                showPageFrame={showPageFrame}
                                pageFrameColorMode={pageFrameColorMode}
                                pageFrameColor={pageFrameColor}
                                pageFrameWidthPt={pageFrameWidthPt}
                                pageFrameInnerGapMm={pageFrameInnerGapMm}
                        pageFrameCornerRadiusMm={pageFrameCornerRadiusMm}
                                pageFrameLineStyle={pageFrameLineStyle}
                                writtenPaperHeader={isWritten}
                                writtenPaperTitle={isWritten ? writtenTitleForPreview : undefined}
                                writtenPaperFieldLines={
                                  isWritten ? writtenHeaderFieldLines : emptyWrittenHeaderFieldLines()
                                }
                                writtenPaperFieldLabels={
                                  isWritten ? writtenHeaderFieldLabels : emptyWrittenHeaderFieldLabels()
                                }
                                writtenPaperFieldHidden={
                                  isWritten ? writtenHeaderFieldHidden : emptyWrittenHeaderFieldHidden()
                                }
                                writtenPaperBookletLetter={isWritten ? bookletLetterFromGroup(group) : "A"}
                                writtenPaperShowTeachers={writtenShowTeachers}
                                writtenPaperTeachers={writtenTeachersForPreview}
                                lastQuestionPage={!isWritten ? maxQuestionPage : undefined}
                                questionNumberLeftOffsetMm={questionNumberLeftOffsetMm}
                                questionNumberImageGapMm={questionNumberImageGapMm}
                                questionNumberingEnabled={questionNumberingEnabled}
                                questionNumberColorMode={questionNumberColorMode}
                        questionNumberFontPt={questionNumberFontPt}
                                pageNumberingEnabled={pageNumberingEnabled}
                                pageNumberStart={pageNumberStart}
                                pageNumberFormat={pageNumberFormat}
                                otherPageHeaderBottomGapMm={otherPageHeaderBottomGapMm}
                                headerBottomGapMm={headerBottomGapMm}
                                interactive={false}
                                drawSelectionOutline={false}
                                drawGapIndicators={false}
                                questionDragLiveRef={questionDragLiveRef}
                                layoutLiveRef={layoutLiveRef}
                                alignmentPreviewLiveRef={alignmentPreviewLiveRef}
                                onRegisterRedraw={(redraw) => registerCanvasRedraw(pageNum, redraw)}
                                canvasFrameClassName={ui.previewPageFrame}
                              />
                              <PdfPreviewBannerOverlay
                                pageNum={pageNum}
                                headerStyleId={headerStyleId}
                                headerConfig={headerConfig}
                                themeColor={themeColor}
                                pageWpt={pageWpt}
                                marginTopMm={marginTopMm}
                                marginLeftMm={marginLeftMm}
                                marginRightMm={marginRightMm}
                                scale={previewScale}
                              />
                              <ColumnOverlaySelector
                                enabled={
                                  columnAdjustEnabled &&
                                  pageNum <= maxQuestionPage &&
                                  columns >= 1
                                }
                                columnRects={getColumnOverlayRectsPx(pageNum)}
                                selectedColumnIndex={
                                  columnPanel?.pageNum === pageNum
                                    ? columnPanel.columnIndex0
                                    : null
                                }
                                onColumnPointerDown={(col, x, y) =>
                                  handleColumnOverlayPointerDown(pageNum, col, x, y)
                                }
                              />
                              <QuestionVerticalDragOverlay
                                enabled={
                                  !columnAdjustEnabled &&
                                  !columnPanel &&
                                  pageNum <= maxQuestionPage &&
                                  layoutReady
                                }
                                layout={layout}
                                pageNum={pageNum}
                                pageHpt={pageHpt}
                                pageWpx={previewPageWpx}
                                pageHpx={previewPageHpx}
                                scale={previewScale}
                                geometry={pageGeometry}
                                questions={questions}
                                selectedOrderIndices={selectedQuestionOrders}
                                columns={columns}
                                maxQuestionPage={maxQuestionPage}
                                onSelectQuestion={(idx, options) =>
                                  selectQuestionOnPage(idx, pageNum, options)
                                }
                                onYTopChange={(idx, y, phase) =>
                                  handleQuestionYTopChange(idx, y, phase, pageNum)
                                }
                                onColumnShift={handleColumnShift}
                                onDisplayScaleChange={handleQuestionDisplayScaleChange}
                                getDisplayScaleMaxPct={getDisplayScaleMaxPctForOrder}
                                questionNumberLeftOffsetMm={questionNumberLeftOffsetMm}
                                questionNumberImageGapMm={questionNumberImageGapMm}
                                headerBottomGapMm={headerBottomGapMm}
                                otherPageHeaderBottomGapMm={otherPageHeaderBottomGapMm}
                                layoutLiveRef={layoutLiveRef}
                                alignmentPreviewLiveRef={alignmentPreviewLiveRef}
                                onRegisterRedraw={(redraw) =>
                                  registerVerticalOverlayRedraw(pageNum, redraw)
                                }
                              />
                              <QuestionGapIndicatorOverlay
                                enabled={
                                  !columnAdjustEnabled &&
                                  !columnPanel &&
                                  pageNum <= maxQuestionPage &&
                                  layoutReady
                                }
                                layout={layout}
                                pageNum={pageNum}
                                pageWpt={pageWpt}
                                pageHpt={pageHpt}
                                pageWpx={previewPageWpx}
                                pageHpx={previewPageHpx}
                                scale={previewScale}
                                marginBottomMm={marginBottomMm}
                                questionNumberLeftOffsetMm={questionNumberLeftOffsetMm}
                                columns={columns}
                                geometry={pageGeometry}
                                headerBottomGapMm={headerBottomGapMm}
                                otherPageHeaderBottomGapMm={otherPageHeaderBottomGapMm}
                                selectedQuestions={selectedQuestionOrders}
                                questionDragLiveRef={questionDragLiveRef}
                                layoutLiveRef={layoutLiveRef}
                                alignmentPreviewLiveRef={alignmentPreviewLiveRef}
                                onRegisterRedraw={(redraw) =>
                                  registerGapOverlayRedraw(pageNum, redraw)
                                }
                              />
                            </>
                          ) : (
                            <PdfCanvasViewer
                              pdfDoc={verifiedPdfDoc}
                              layout={layout}
                              pageWpt={pageWpt}
                              pageHpt={pageHpt}
                              currentPage={pageNum}
                              zoom={zoom}
                              selectedQuestions={selectedQuestionOrders}
                              onQuestionSelect={(idx, options) =>
                                selectQuestionOnPage(idx, pageNum, options)
                              }
                            />
                          )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {layoutReady && layout.length > 0 && (
            <div className="pointer-events-none absolute bottom-6 right-6 z-20">
              <PdfPreviewZoomControl
                zoom={zoom}
                onZoomIn={() => setZoom((z) => Math.min(3, z * 1.2))}
                onZoomOut={() => setZoom((z) => Math.max(0.3, z / 1.2))}
              />
            </div>
          )}

          <ColumnRedistributePopover
            open={columnPanel != null}
            anchor={columnPanel?.anchor ?? { x: 0, y: 0 }}
            boundsRef={previewScrollRef}
            displayColumnNumber={(columnPanel?.columnIndex0 ?? 0) + 1}
            mode={columnRedistMode}
            onModeChange={setColumnRedistMode}
            bottomGapMmInput={columnBottomGapMmInput}
            onBottomGapMmChange={setColumnBottomGapMmInput}
            anchoredDisabled={columnAnchoredDisabled}
            equalDisabled={columnEqualDisabled}
            inlineError={columnDistInlineError}
            onPreview={handleColumnRedistPreview}
            onApply={handleColumnRedistApply}
            onCancel={handleColumnRedistCancel}
            onReset={handleColumnRedistReset}
          />
        </div>

        {/* Optik form — PDF önizlemenin sağında */}
        {!isWritten && layoutReady && questions.length > 0 && (
          <div
            className={`relative flex h-full min-h-0 shrink-0 items-stretch overflow-hidden transition-[width] duration-200 ease-in-out ${
              showOptikFormPanel ? "pdf-preview-panel-optik-open" : "pdf-preview-panel-rail"
            }`}
          >
            {showOptikFormPanel ? (
              <>
                <PdfPreviewPanelRailButton
                  variant="optik"
                  mode="collapse"
                  onClick={() => setShowOptikFormPanel(false)}
                  ariaLabel="Optik form panelini gizle"
                />
                <div className="pdf-preview-panel-optik pdf-preview-panel-optik-inner flex min-h-0 min-w-0 flex-1 overflow-hidden">
                  <OptikFormSidebar
                    questions={optikFormQuestions}
                    onReorder={applyQuestionReorder}
                    onQuestionNavigate={handleOptikQuestionNavigate}
                  />
                </div>
              </>
            ) : (
              <PdfPreviewPanelRailButton
                variant="optik"
                mode="expand"
                onClick={() => setShowOptikFormPanel(true)}
                ariaLabel="Optik form panelini göster"
              />
            )}
          </div>
        )}

        {/* Sayfa thumbnails — optik panelin yanında (sağ) */}
        {PAGES_THUMBNAILS_PANEL_ENABLED &&
          !loading &&
          !error &&
          layoutReady &&
          layout.length > 0 &&
          totalPages > 0 && (
          <div
            className={`relative flex h-full min-h-0 shrink-0 items-stretch overflow-hidden transition-[width] duration-200 ease-in-out ${
              showThumbnailsPanel ? "pdf-preview-panel-pages" : "pdf-preview-panel-rail"
            }`}
          >
          {showThumbnailsPanel ? (
            <>
            <PdfPreviewPanelRailButton
              variant="pages"
              mode="collapse"
              onClick={() => setShowThumbnailsPanel(false)}
              ariaLabel="Sayfa panelini gizle"
            />
            <div
              className={`pdf-preview-panel-thumb pdf-preview-panel-thumb-inner flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${ui.thumbPanel}`}
            >
              <div
                className="flex shrink-0 items-center px-2 py-2"
                style={{ borderBottom: "1px solid var(--thumb-border, #475569)" }}
              >
                <span className={ui.thumbTitle}>Sayfalar</span>
              </div>
              <div
                className="flex flex-col gap-2 overflow-y-auto px-2 py-2"
                style={{ maxHeight: "100%" }}
              >
                {Array.from({ length: totalPages }, (_, i) => {
                  const pageNum = i + 1;
                  const isActive = currentPage === pageNum;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => goToPage(pageNum)}
                      className="flex w-full justify-center overflow-hidden rounded-md transition hover:opacity-95"
                      style={{ padding: 2 }}
                      aria-label={`Sayfa ${pageNum}`}
                      aria-pressed={isActive}
                    >
                      <CanvasPdfPreview
                        layout={layout}
                        pageWpt={pageWpt}
                        pageHpt={pageHpt}
                        currentPage={pageNum}
                        zoom={0.16}
                        thumbnailWidthPx={thumbCanvasWidthPx}
                        selectedQuestions={selectedQuestionOrders}
                        onQuestionSelect={() => {}}
                        testTitle={testName?.trim() || "TEST"}
                        schoolName={schoolName?.trim() || ""}
                        themeColor={themeColor}
                        includeAnswerKey={options.includeAnswerKey}
                        answerKeyMode={previewAnswerKeyMode}
                        optikFormEnabled={optikFormEnabled}
                        optikFormPlacement={optikFormPlacement}
                        optikFormQuestions={optikFormQuestions}
                        optikFormOptionCount={optikFormOptionCount}
                        optikFormBookletType={optikFormBookletType}
                        optikFormInstructionEnabled={optikFormInstructionEnabled}
                        optikFormInstructionText={optikFormInstructionText}
                        optikFormNetRule={optikFormNetRule}
                        answerKeyPageCount={answerKeyPages}
                        columns={columns}
                        headerStyleId={headerStyleId}
                        headerConfig={headerConfig}
                        marginTopMm={marginTopMm}
                        marginBottomMm={marginBottomMm}
                        marginLeftMm={marginLeftMm}
                        marginRightMm={marginRightMm}
                        columnGapMm={8}
                        interactive={false}
                        includeDescription={options.includeDescription}
                        descriptionColumnCount={descriptionColumnCount ?? 1}
                        descriptionTexts={descriptionTexts ?? []}
                        descriptionColumnDividers={descriptionColumnDividers}
                        addTextOnLine={options.addTextOnLine}
                        centerLineText={centerLineText}
                        centerLineBold={centerLineBold}
                        centerLineItalic={centerLineItalic}
                        centerLineTextDirection={centerLineTextDirection}
                        watermarkEnabled={watermarkEnabled}
                        watermarkSettings={watermarkSettings}
                        showColumnDivider={showColumnDivider}
                        columnDividerText={columnDividerText}
                        columnDividerColor={columnDividerColor}
                        columnDividerWidthPt={columnDividerWidthPt}
                        showColumnDividerText={showColumnDividerText}
                        showWatermark={showWatermark}
                        watermarkText={watermarkText}
                        watermarkLayout={watermarkLayout}
                        watermarkAngleDeg={watermarkAngleDeg}
                        watermarkOpacity={watermarkOpacity}
                        watermarkSize={watermarkSize}
                        watermarkLogoUrl={watermarkLogoUrl}
                        showPageFrame={showPageFrame}
                        pageFrameColorMode={pageFrameColorMode}
                        pageFrameColor={pageFrameColor}
                        pageFrameWidthPt={pageFrameWidthPt}
                        pageFrameInnerGapMm={pageFrameInnerGapMm}
                        pageFrameCornerRadiusMm={pageFrameCornerRadiusMm}
                        pageFrameLineStyle={pageFrameLineStyle}
                        writtenPaperHeader={isWritten}
                        writtenPaperTitle={isWritten ? writtenTitleForPreview : undefined}
                        writtenPaperFieldLines={isWritten ? writtenHeaderFieldLines : emptyWrittenHeaderFieldLines()}
                        writtenPaperFieldLabels={isWritten ? writtenHeaderFieldLabels : emptyWrittenHeaderFieldLabels()}
                        writtenPaperFieldHidden={isWritten ? writtenHeaderFieldHidden : emptyWrittenHeaderFieldHidden()}
                        writtenPaperBookletLetter={isWritten ? bookletLetterFromGroup(group) : "A"}
                        writtenPaperShowTeachers={writtenShowTeachers}
                        writtenPaperTeachers={writtenTeachersForPreview}
                        lastQuestionPage={!isWritten ? maxQuestionPage : undefined}
                        questionNumberLeftOffsetMm={questionNumberLeftOffsetMm}
                        questionNumberImageGapMm={questionNumberImageGapMm}
                        questionNumberingEnabled={questionNumberingEnabled}
                        questionNumberColorMode={questionNumberColorMode}
                        questionNumberFontPt={questionNumberFontPt}
                        pageNumberingEnabled={pageNumberingEnabled}
                        pageNumberStart={pageNumberStart}
                        pageNumberFormat={pageNumberFormat}
                        otherPageHeaderBottomGapMm={otherPageHeaderBottomGapMm}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
            </>
          ) : (
            <PdfPreviewPanelRailButton
              variant="pages"
              mode="expand"
              onClick={() => setShowThumbnailsPanel(true)}
              ariaLabel="Sayfa panelini göster"
            />
          )}
          </div>
        )}

        {/* Sağ panel — Tema & Başlık Ayarları */}
        {!isWritten && (
          <div
            className={`relative flex h-full min-h-0 shrink-0 items-stretch overflow-hidden transition-[width] duration-200 ease-in-out ${
              showRightThemePanel ? "pdf-preview-panel-theme" : "pdf-preview-panel-rail"
            }`}
          >
            {showRightThemePanel ? (
              <>
                <PdfPreviewPanelCollapseButton
                  side="right"
                  onClose={() => setShowRightThemePanel(false)}
                  closeLabel="Tema panelini gizle"
                />
                <ThemeCustomizerSidebar />
              </>
            ) : (
              <PdfPreviewPanelRailButton
                variant="theme"
                mode="expand"
                onClick={() => setShowRightThemePanel(true)}
                ariaLabel="Tema panelini göster"
              />
            )}
          </div>
        )}
      </div>

      {/* Alt bar - kırpma aracı bottom toolbar gibi */}
      <div
        className={`pdf-preview-bottom-bar grid shrink-0 grid-cols-[1fr_auto_1fr] items-center ${ui.bottomBar} ${ui.bottomBarBorder}`}
        style={{
          padding: `${sizes.gap}px var(--pdf-panel-padding)`,
          gap: sizes.gapSection,
        }}
      >
        <div className="flex items-center gap-2 justify-self-start">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
            className={ui.bottomBarBtn}
            aria-label="Önceki sayfa"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M15.75 19.5L8.25 12l7.5-7.5" clipRule="evenodd" />
            </svg>
          </button>
          <span className={`min-w-[4rem] shrink-0 text-center ${ui.bottomBarText}`}>
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => goToPage(currentPage + 1)}
            className={ui.bottomBarBtn}
            aria-label="Sonraki sayfa"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M8.25 4.5l7.5 7.5-7.5 7.5" clipRule="evenodd" />
            </svg>
          </button>
          <select
            className={ui.bottomBarSelect}
            value={currentPage}
            onChange={(e) => goToPage(Number(e.target.value))}
          >
            {Array.from({ length: totalPages },
              (_, i) => (
                <option key={i} value={i + 1}>
                  Sayfa {i + 1}
                </option>
              )
            )}
          </select>
        </div>

        {!loading && !error && layoutReady && layout.length > 0 ? (
          <div className="pdf-preview-bottom-actions flex items-center justify-center gap-1 justify-self-center rounded-lg border border-slate-200 bg-white/95 px-1.5 py-1 shadow-sm dark:border-[#30363d] dark:bg-[#21262d]">
            <button
              type="button"
              onClick={() => setPreviewSurface("canvas")}
              className={`rounded px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-wide transition ${
                previewSurface === "canvas"
                  ? "pdf-preview-bottom-actions__selected"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#30363d] dark:text-[#c9d1d9] dark:hover:bg-[#3d444d]"
              }`}
              title="Hızlı düzenleme önizlemesi"
            >
              Düzenle
            </button>
            <button
              type="button"
              onClick={() => {
                clearVerifiedPdfDoc();
                setPreviewSurface("pdf");
                if (layoutReady) void runVerifyPdf();
              }}
              className={`rounded px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-wide transition ${
                previewSurface === "pdf"
                  ? "pdf-preview-bottom-actions__selected"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#30363d] dark:text-[#c9d1d9] dark:hover:bg-[#3d444d]"
              }`}
              title="Kaydedilecek gerçek PDF (pdf.js)"
            >
              Gerçek PDF
            </button>
            {previewSurface === "pdf" && (
              <button
                type="button"
                onClick={() => void runVerifyPdf()}
                disabled={verifyingPdf}
                className="rounded px-2 py-1 text-[0.625rem] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-[#c9d1d9] dark:hover:bg-[#3d444d]"
                title="PDF önizlemesini yenile"
              >
                ↻
              </button>
            )}
            <button
              type="button"
              title="Sütun seçip dikey dağıtım"
              onClick={() => {
                if (columnAdjustEnabled) {
                  handleColumnRedistCancel();
                  setColumnAdjustEnabled(false);
                } else {
                  setColumnAdjustEnabled(true);
                }
              }}
              className={`rounded px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-wide transition ${
                columnAdjustEnabled
                  ? "pdf-preview-bottom-actions__selected"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#30363d] dark:text-[#c9d1d9] dark:hover:bg-[#3d444d]"
              }`}
            >
              Sütun
            </button>
          </div>
        ) : (
          <div className="justify-self-center" aria-hidden />
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 justify-self-end">
          <label
            className={`flex shrink-0 cursor-pointer items-center gap-1.5 ${ui.label}`}
            title="Açıkken geniş kırpmalar sütuna sığarken native boyutun %80 altına inmez"
          >
            <input
              type="checkbox"
              checked={allowSlightOverflow}
              onChange={(e) => setAllowSlightOverflow(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-400"
            />
            <span className="max-w-[11rem] text-[0.65rem] leading-tight sm:max-w-none sm:text-xs">
              Geniş Soruları Koru (Yazıyı Küçültme)
            </span>
          </label>
          <label className={`flex shrink-0 items-center gap-1.5 ${ui.label}`}>
            <span>Kalite:</span>
            <select
              value={quality}
              onChange={(e) => {
                const v = e.target.value as "normal" | "high" | "best";
                setQuality(v);
              }}
              className={`rounded px-2 py-1 text-xs ${ui.select}`}
            >
              <option value="normal">Normal (288 DPI)</option>
              <option value="high">Yüksek (432 DPI)</option>
              <option value="best">En İyi (576 DPI)</option>
            </select>
          </label>
          {saveError && (
            <span className="text-sm text-rose-400">{saveError}</span>
          )}
          <button
            type="button"
            onClick={onClose}
            className={ui.bottomBarCancel}
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSavePdf}
            disabled={loading || savingPdf || !layoutReady || questions.length === 0}
            className={ui.bottomBarPrimary}
          >
            {savingPdf ? "Kaydediliyor…" : "PDF'yi Kaydet"}
          </button>
        </div>
      </div>
    </div>
    <ConfirmModal
      open={saveAlert != null}
      mode="alert"
      variant="warning"
      title={saveAlert?.title ?? ""}
      message={saveAlert?.message ?? ""}
      confirmLabel="Anladım"
      onConfirm={() => setSaveAlert(null)}
      onCancel={() => setSaveAlert(null)}
    />
    </PdfPreviewScrollSessionProvider>
  );
}
