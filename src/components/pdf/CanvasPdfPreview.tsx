/**
 * Canvas-based PDF preview - original-desktop PDFPreviewWidget mantığıyla.
 * PDF blob yerine layout + soru görsellerini canvas'a çizer.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useEditorStore } from "../../store/editorStore";
import type { QuestionDragLive } from "../../utils/questionVerticalDrag";
import type { LayoutItem } from "../../api/client";
import {
  approxWrittenHeaderHeightPt,
  approxWrittenRuleDownFromInnerTopPt,
  emptyWrittenHeaderFieldHidden,
  emptyWrittenHeaderFieldLabels,
  emptyWrittenHeaderFieldLines,
  writtenHeaderBlockLayoutPt,
  writtenHeaderLabelPdfLeft,
  writtenHeaderLabelPdfPuan,
  wrapTitleLinesWithMeasure,
  type WrittenHeaderFieldHidden,
  type WrittenHeaderFieldLabels,
  type WrittenHeaderFieldLines,
} from "../../constants/writtenHeaderFields";
import {
  computeAnswerKeyLayout,
  ANSWER_KEY_LAYOUT,
} from "../../utils/answerKeyLayout";
import {
  ANSWER_KEY_NAVY_HEX,
  ANSWER_KEY_RED_HEX,
  drawSeparateAnswerKeyTableCanvas,
  SEPARATE_AK,
  separateAnswerKeyCapacity,
} from "../../utils/separateAnswerKeyTable";
import {
  drawQuestionSelectionOutline,
  questionSelectionGapEndpointsPt,
} from "../../utils/questionSelectionOutline";
import { optikRowsFromLayoutItems } from "../../utils/optikFormLayout";
import {
  drawOptikFormCompactCanvas,
  drawOptikFormFullPageCanvas,
} from "../../utils/drawOptikFormCanvas";
import {
  endOfTestOptikCompactFits,
  resolveCompactOptikFormPlacement,
} from "../../utils/optikFormCompactPlacement";
import {
  resolveOptikActiveOptions,
  type OptikFormBookletType,
  type OptikFormNetRule,
  type OptikFormOptionCount,
} from "../../utils/optikFormSettings";
import type { QuestionItem } from "../../types";
import { resolveRequestedScale } from "../../utils/questionScale";
import { fasikulFrameHidesQuestionNumber, normalizeFasikulQuestionFrame, drawFasikulFrameFillBehind, drawFasikulFramePaperTint } from "../../utils/fasikulQuestionFrame";
import {
  drawScratchGridOnCanvas,
  resolveScratchGridRectPt,
  SCRATCH_BORDER_WIDTH_PT,
  SCRATCH_CORNER_RADIUS_PT,
  SCRATCH_PAD_BOTTOM_PT,
  SCRATCH_STROKE_WIDTH_PT,
} from "../../utils/questionScratchGrid";
import {
  computeColumnImageBounds,
  IMG_COL_RIGHT_PAD_PT,
} from "../../utils/questionColumnClamp";
import {
  buildLayoutScaleDiagMeta,
  composeQuestionScaleDiagRow,
  flushQuestionScaleDiagnostics,
  getQuestionFontMeasureForDiag,
  measureInkBoundsFromImage,
  type QuestionScaleDiagRow,
} from "../../utils/questionScaleDiagnostics";
import {
  computeDescriptionLayout,
  descriptionHeaderBlockHeightPt,
  descriptionLineCenterFromTopPt,
  CLASSIC_BANNER_LINE_PT,
  CLASSIC_BANNER_RADIUS_PT,
  CLASSIC_INFO_BAR_BADGE_INSET_PT,
  DESC_BANNER_GAP_PT,
  DESC_BOX_PAD_X_DEFAULT_PT,
  DESC_BOX_PAD_Y_DEFAULT_PT,
  DESC_FONT_SIZE_PT,
} from "../../utils/descriptionBoxLayout";
import { TRIAL_TEST_NAME_MIN_SAMPLE } from "../../utils/trialYonergeDefaults";
import {
  DEFAULT_HEADER_BOTTOM_GAP_MM,
  DEFAULT_OTHER_PAGE_HEADER_BOTTOM_GAP_MM,
  DEFAULT_QUESTION_NUMBER_LEFT_OFFSET_MM,
  DEFAULT_QUESTION_NUMBER_IMAGE_GAP_MM,
  FOOTER_BOTTOM_OFFSET_MM,
  FOOTER_TOP_OFFSET_MM,
  computePageColumnBand,
  columnIndexFromQuestionXPt,
  corporateOtherPageHeaderLayoutPt,
  liveAlignmentYShiftPtForItem,
  otherPageColumnDividerStartFromTopPt,
} from "../../utils/pdfLayoutGeometry";
import {
  defaultHeaderConfig,
  isCorporateHeader,
} from "../../utils/corporateHeaderLayout";
import { isClassicTestBannerHeader } from "../../utils/headerStyleIds";
import { mergeHeaderBadgeConfig } from "../../utils/headerBadgeByStyle";
import { resolveHeaderLogoUrl } from "../../utils/presetHeaderLogos";
import { resolveThemedHeaderLogoUrl } from "../../utils/presetLogoRecolor";
import {
  formatPageNumberLabel,
  questionNumberDrawColor,
  resolveThemeAccentHex,
  resolveThemePrimaryHex,
} from "../../utils/pageStructureHelpers";
import {
  classicBannerSubjectText,
  otherPageHeaderLeftText,
  otherPageHeaderRightText,
  trialOsymOtherPageLeftText,
  trialOsymOtherPageRightText,
  visibleSubTopicText,
  visibleTopicText,
} from "../../utils/headerFieldVisibility";
import {
  drawStyle1ScoreBoxCanvas,
  drawStyle1TestNoCanvas,
  resolveBannerRightMode,
  resolveClassicBannerAndInfoHeightPt,
  resolveClassicInfoBarHeightPt,
  resolveClassicTopBannerHeightPt,
  style1ClassicDyBSizePt,
} from "../../utils/bannerRightMode";
import {
  drawExamTypeBoxBorderCanvas,
  drawExamTypeBoxFillCanvas,
  drawExamTypeTextInBox,
  resolveExamTypeBoxHeightPt,
  resolveExamTypeBoxWidthPt,
  shouldDrawExamTypeBoxContent,
} from "../../utils/examTypeBox";
import {
  canvasFontStyleCss,
  getHeaderFieldFontPt,
  headerFieldBold,
  headerFieldColor,
  headerFieldItalic,
} from "../../utils/headerFieldFonts";
import {
  CLASSIC_DYB_INSET_X_PT,
  CLASSIC_INFO_PAD_X_PT,
  CLASSIC_PDF_MATCH_FONT_FAMILY,
  CLASSIC_SUBJECT_PILL_PAD_X_DEFAULT_PT,
  CLASSIC_TEST_NO_INSET_X_PT,
  classicInfoBarTopicBlockHeightPt,
  classicInfoMarkerLayout,
  classicTextBaselineCanvas,
  layoutClassicBannerTopRow,
  layoutClassicInfoBarTopicLines,
  normalizeClassicBannerConfig,
  wrapClassicInfoBarText,
} from "../../utils/classicBannerTopRow";
import { drawClassicInstitutionBadgeCanvas, drawClassicLogoBadgeCanvas } from "../../utils/classicLeftBadge";
import {
  resolveSubjectPillFillColor,
  resolveSubjectPillTextColor,
  resolveSubjectPillTextOffsetYPt,
  clampSubjectPillPadXPt,
} from "../../utils/modernCorporateHeaderShared";
import { hexToRgbParts, resolveWatermarkAngleDeg, watermarkCanvasRotateRad } from "../../utils/visualProperties";
import {
  canvasPageFrameDash,
  effectivePageFrameCornerRadiusPt,
  pageFrameExpandGapPt,
  pageFrameRectCanvasPt,
  parsePageFrameColorMode,
  parsePageFrameLineStyle,
  resolvePageFrameColor,
} from "../../utils/pageFrame";
import {
  drawThemeFirstPageHeaderCanvas,
  drawThemeRunningHeaderCanvas,
  themeFirstPageHeaderTotalPt,
} from "../../utils/drawThemeHeadersCanvas";
import { usesHtmlBannerOverlay } from "../../utils/headerBannerMode";
import { drawFooterDecorativeStripesCanvas } from "../../utils/decorativeStripeCanvas";
import { footerPageNumberCircleRadiusPt } from "../../utils/footerBandLayout";
import { questionImageLeftPt, questionNumberLeftPt } from "../../utils/questionVerticalDrag";
import {
  questionNumberLabel,
  QUESTION_NUM_FONT_PT,
} from "../../utils/questionNumberMetrics";

const PT_PER_INCH = 72;
const DEFAULT_TARGET_QUESTION_LINE_PT = 10;
/** Ekranda sayfa boyutu (CSS) — overlay / tıklama ile aynı kalır. */
const DISPLAY_DPI = 96;
const DISPLAY_PT_TO_PX = DISPLAY_DPI / PT_PER_INCH;
/** Ana önizleme varsayılan keskinlik (buffer = CSS × sharpness × dpr). */
export const DEFAULT_PREVIEW_SHARPNESS = 2;

const PT_TO_MM = 25.4 / PT_PER_INCH;

function mmToPt(mm: number): number {
  return (mm * PT_PER_INCH) / 25.4;
}

function hexToRgb(hex: string): [number, number, number] {
  const s = (hex || "").trim().replace(/^#/, "");
  if (s.length !== 6) return [0.68, 0.8, 0.98];
  return [
    parseInt(s.slice(0, 2), 16) / 255,
    parseInt(s.slice(2, 4), 16) / 255,
    parseInt(s.slice(4, 6), 16) / 255,
  ];
}

type QuestionSelectOptions = {
  additive?: boolean;
  range?: boolean;
};

type CanvasPdfPreviewProps = {
  layout: LayoutItem[];
  pageWpt: number;
  pageHpt: number;
  currentPage: number;
  zoom: number;
  selectedQuestions: number[];
  onQuestionSelect: (index: number, options?: QuestionSelectOptions) => void;
  testTitle: string;
  schoolName: string;
  themeColor: string;
  includeAnswerKey: boolean;
  /** per_page: footer | separate_page: ayrı sayfa | end_of_test: son soru altı */
  answerKeyMode?: "per_page" | "separate_page" | "end_of_test";
  /** Optik form — önizleme çizimi */
  optikFormEnabled?: boolean;
  optikFormPlacement?: "per_page" | "separate_page" | "end_of_test";
  optikFormQuestions?: QuestionItem[];
  optikFormOptionCount?: OptikFormOptionCount;
  optikFormBookletType?: OptikFormBookletType;
  optikFormInstructionEnabled?: boolean;
  optikFormInstructionText?: string;
  optikFormNetRule?: OptikFormNetRule;
  /** Kompakt optik dikey ofset (pt); pozitif = aşağı */
  optikFormOffsetYPt?: number;
  answerKeyPageCount?: number;
  columns: number;
  /** Backend layout ile uyum için margin değerleri (mm) */
  marginTopMm?: number;
  marginBottomMm?: number;
  marginLeftMm?: number;
  marginRightMm?: number;
  columnGapMm?: number;
  headerStyleId?: string;
  headerConfig?: import("../../utils/corporateHeaderLayout").HeaderConfig;
  /** Test ile ilgili açıklama ekle - banner altında kutu */
  includeDescription?: boolean;
  /** Açıklama sütun sayısı (1–3) */
  descriptionColumnCount?: number;
  /** Sütun bazlı açıklama metinleri */
  descriptionTexts?: string[];
  /** Yönerge dikey iç boşluk (pt) */
  descriptionBoxPadYPt?: number;
  /** Yönerge yatay iç boşluk (pt) */
  descriptionBoxPadXPt?: number;
  /** 2+ sütunda açıklama kutusunda dikey ayırıcı çizgiler */
  descriptionColumnDividers?: boolean;
  /** Deneme: yönerge üstü meta (sadece deneme modülü) */
  trialDescriptionMeta?: {
    examCode: string;
    testName: string;
    bookletLabel: string;
    examCodeFontPt?: number;
    examCodeColor?: string;
    examCodeAlign?: "left" | "center" | "right";
    examCodePadLeftPt?: number;
    bookletFontPt?: number;
    bookletColor?: string;
    testNameBgOpacityPct?: number;
    testNameBgColor?: string;
  } | null;
  /** Çizgi üzerine yazı ekle */
  addTextOnLine?: boolean;
  /** Çizgi üzeri metin */
  centerLineText?: string;
  /** Çizgi üzeri kalın */
  centerLineBold?: boolean;
  /** Çizgi üzeri italik */
  centerLineItalic?: boolean;
  /** Çizgi üzeri yazı yönü */
  centerLineTextDirection?: "up" | "down";
  /** Filigran etkin */
  watermarkEnabled?: boolean;
  /** Filigran ayarları */
  watermarkSettings?: {
    mode: "text" | "image";
    text: string;
    textOpacityPct: number;
    textSizePct: number;
    textAngleDeg: number;
    textColor: string;
    imageBase64: string | null;
    imageOpacityPct: number;
    imageSizePct: number;
  };
  /** Görsel özellikler — sütun çizgisi */
  showColumnDivider?: boolean;
  columnDividerText?: string;
  columnDividerColor?: string;
  columnDividerWidthPt?: number;
  showColumnDividerText?: boolean;
  /** Görsel özellikler — filigran */
  showWatermark?: boolean;
  watermarkText?: string;
  watermarkLayout?: "diagonal" | "horizontal" | "vertical";
  watermarkAngleDeg?: number;
  watermarkOpacity?: number;
  watermarkSize?: number;
  watermarkLogoUrl?: string | null;
  /** Sayfa kenarı çerçevesi */
  showPageFrame?: boolean;
  pageFrameColorMode?: "theme" | "custom";
  pageFrameColor?: string;
  pageFrameWidthPt?: number;
  pageFrameInnerGapMm?: number;
  pageFrameCornerRadiusMm?: number;
  pageFrameLineStyle?: "solid" | "dashed" | "dotted";
  /** Thumbnail modda tıklama devre dışı, sadece görüntü */
  /** Ana önizlemede sayfa canvas çerçevesi (thumbnail’da varsayılan ince çerçeve) */
  canvasFrameClassName?: string;
  interactive?: boolean;
  /** Seçili soru mavi çerçevesi — overlay kullanılıyorsa false */
  drawSelectionOutline?: boolean;
  /** Sorular arası yeşil boşluk çizgisi — overlay kullanılıyorsa false */
  drawGapIndicators?: boolean;
  /** Fasikül: soru altı kareli çözüm alanı (boşluğa göre büyür/küçülür) */
  showQuestionScratchGrid?: boolean;
  /** Thumbnail genişliği (px) - verilirse zoom otomatik hesaplanır, sütuna tam sığar */
  thumbnailWidthPx?: number;
  /**
   * Canvas buffer keskinliği (1 ≈ eski 96 DPI). Ana önizleme 1.5–2.5; thumbnail’da 1.
   * CSS sayfa boyutu değişmez.
   */
  previewSharpness?: number;
  /** Yazılı kağıdı: üst blok başlığı (yükseklik satır sayısına göre) */
  writtenPaperHeader?: boolean;
  writtenPaperTitle?: string;
  writtenPaperFieldLines?: WrittenHeaderFieldLines;
  writtenPaperFieldLabels?: WrittenHeaderFieldLabels;
  writtenPaperFieldHidden?: WrittenHeaderFieldHidden;
  writtenPaperBookletLetter?: string;
  /** Yazılı: öğretmen adları + sağ sütun imza çizgileri (PDF ile uyumlu) */
  writtenPaperShowTeachers?: boolean;
  writtenPaperTeachers?: { name: string; title?: string }[];
  /** Deneme: son soru sayfası — TEST BİTTİ / Diğer sayfaya geçiniz (yalnızca deneme) */
  lastQuestionPage?: number;
  /** Soru numarası ile sütun sol kenarı arası (mm) */
  questionNumberLeftOffsetMm?: number;
  /** Soru numarası ile görsel arası yatay boşluk (mm) */
  questionNumberImageGapMm?: number;
  questionNumberingEnabled?: boolean;
  questionNumberColorMode?: "theme" | "black";
  questionNumberFontPt?: number;
  pageNumberingEnabled?: boolean;
  pageNumberStart?: number;
  pageNumberFormat?: "plain" | "fraction";
  /** Diğer sayfalar — üst çizgi ile sorular arası (mm) */
  otherPageHeaderBottomGapMm?: number;
  /** 1. sayfa banner ile sorular arası (mm) — commit edilmiş değer */
  headerBottomGapMm?: number;
  /** Sürükleme önizlemesi — layout commit edilmeden canvas konumu */
  questionDragLiveRef?: RefObject<QuestionDragLive | null>;
  /** Slider sürüklemesi — React state güncellenmeden layout / hizalama */
  layoutLiveRef?: RefObject<LayoutItem[] | null>;
  alignmentPreviewLiveRef?: RefObject<{
    headerBottomGapMm?: number;
    otherPageHeaderBottomGapMm?: number;
    leftOffsetMm?: number;
    imageGapMm?: number;
  } | null>;
  /** Canlı sürükleme sırasında yalnızca canvas yeniden çiz */
  onRegisterRedraw?: (redraw: () => void) => void | (() => void);
};

export default function CanvasPdfPreview({
  layout,
  pageWpt,
  pageHpt,
  currentPage,
  zoom,
  selectedQuestions,
  onQuestionSelect,
  testTitle,
  schoolName,
  themeColor,
  includeAnswerKey,
  answerKeyMode = "per_page",
  optikFormEnabled = false,
  optikFormPlacement = "end_of_test",
  optikFormQuestions = [],
  optikFormOptionCount = "auto",
  optikFormBookletType = "none",
  optikFormInstructionEnabled = true,
  optikFormInstructionText = "",
  optikFormNetRule = "4",
  optikFormOffsetYPt = 0,
  answerKeyPageCount = 0,
  columns,
  headerStyleId = "style_1",
  headerConfig = defaultHeaderConfig(),
  includeDescription = false,
  descriptionColumnCount = 1,
  descriptionTexts = [],
  descriptionBoxPadYPt = DESC_BOX_PAD_Y_DEFAULT_PT,
  descriptionBoxPadXPt = DESC_BOX_PAD_X_DEFAULT_PT,
  descriptionColumnDividers = false,
  trialDescriptionMeta = null,
  addTextOnLine = false,
  centerLineText = "",
  centerLineBold = false,
  centerLineItalic = false,
  centerLineTextDirection = "up",
  watermarkEnabled = false,
  watermarkSettings,
  showColumnDivider = true,
  columnDividerText = "",
  columnDividerColor = "#DC2626",
  columnDividerWidthPt = 0.5,
  showColumnDividerText = false,
  showWatermark = false,
  watermarkText = "",
  watermarkLayout = "diagonal",
  watermarkAngleDeg = 45,
  watermarkOpacity = 25,
  watermarkSize = 50,
  watermarkLogoUrl = null,
  showPageFrame = false,
  pageFrameColorMode = "theme",
  pageFrameColor = "#1E88E5",
  pageFrameWidthPt = 1.5,
  pageFrameInnerGapMm = 3,
  pageFrameCornerRadiusMm = 2,
  pageFrameLineStyle = "solid",
  interactive = true,
  drawSelectionOutline = true,
  drawGapIndicators = true,
  showQuestionScratchGrid = false,
  canvasFrameClassName,
  thumbnailWidthPx,
  previewSharpness = DEFAULT_PREVIEW_SHARPNESS,
  marginTopMm = 15,
  marginBottomMm = 15,
  marginLeftMm = 15,
  marginRightMm = 15,
  columnGapMm = 8,
  writtenPaperHeader = false,
  writtenPaperTitle = "",
  writtenPaperFieldLines = emptyWrittenHeaderFieldLines(),
  writtenPaperFieldLabels = emptyWrittenHeaderFieldLabels(),
  writtenPaperFieldHidden = emptyWrittenHeaderFieldHidden(),
  writtenPaperBookletLetter = "A",
  writtenPaperShowTeachers = false,
  writtenPaperTeachers = [],
  lastQuestionPage,
  questionNumberLeftOffsetMm = DEFAULT_QUESTION_NUMBER_LEFT_OFFSET_MM,
  questionNumberImageGapMm = DEFAULT_QUESTION_NUMBER_IMAGE_GAP_MM,
  questionNumberingEnabled = true,
  questionNumberColorMode = "theme",
  questionNumberFontPt = QUESTION_NUM_FONT_PT,
  pageNumberingEnabled = true,
  pageNumberStart = 1,
  pageNumberFormat = "plain",
  otherPageHeaderBottomGapMm = DEFAULT_OTHER_PAGE_HEADER_BOTTOM_GAP_MM,
  headerBottomGapMm = DEFAULT_HEADER_BOTTOM_GAP_MM,
  questionDragLiveRef,
  layoutLiveRef,
  alignmentPreviewLiveRef,
  onRegisterRedraw,
}: CanvasPdfPreviewProps) {
  /** Obje referansı bazen güncellenmese bile içerik değişiminde çizimi tetikler (ör. PUAN etiketi) */
  const writtenFieldLabelsSig = JSON.stringify(writtenPaperFieldLabels);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<Map<number, HTMLImageElement>>(new Map());
  const [watermarkImage, setWatermarkImage] = useState<HTMLImageElement | null>(null);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cfg = headerConfig ?? { logoUrl: "", presetLogoId: "5" };
    const url = resolveHeaderLogoUrl(cfg);
    if (!url) {
      setLogoImage(null);
      return;
    }

    const loadLogo = async () => {
      let finalUrl = url;
      try {
        finalUrl = await resolveThemedHeaderLogoUrl(cfg, themeColor);
      } catch {
        finalUrl = url;
      }
      if (cancelled) return;
      const img = new Image();
      img.onload = () => {
        if (!cancelled) setLogoImage(img);
      };
      img.onerror = () => {
        if (!cancelled) setLogoImage(null);
      };
      img.src = finalUrl;
    };

    void loadLogo();
    return () => {
      cancelled = true;
      setLogoImage(null);
    };
  }, [
    headerConfig?.logoUrl,
    headerConfig?.presetLogoId,
    headerConfig?.primaryColor,
    headerConfig?.accentColor,
    headerConfig?.logoUseThemeColors,
    headerConfig?.logoColorPrimary,
    headerConfig?.logoColorSecondary,
    themeColor,
  ]);

  useEffect(() => {
    const logoSrc =
      watermarkLogoUrl ||
      (watermarkSettings?.imageBase64
        ? watermarkSettings.imageBase64.startsWith("data:")
          ? watermarkSettings.imageBase64
          : `data:image/png;base64,${watermarkSettings.imageBase64}`
        : null);
    const wmActive = showWatermark || watermarkEnabled;
    if (!wmActive || !logoSrc) {
      setWatermarkImage(null);
      return;
    }
    const img = new Image();
    img.onload = () => setWatermarkImage(img);
    img.onerror = () => setWatermarkImage(null);
    img.src = logoSrc;
    return () => setWatermarkImage(null);
  }, [showWatermark, watermarkEnabled, watermarkLogoUrl, watermarkSettings?.imageBase64]);

  const effectiveZoom = thumbnailWidthPx != null
    ? thumbnailWidthPx / (pageWpt * DISPLAY_PT_TO_PX)
    : zoom;
  const scale = DISPLAY_PT_TO_PX * effectiveZoom;
  const pageWpx = pageWpt * scale;
  const pageHpx = pageHpt * scale;
  /** Thumbnail’da bellek için keskinlik 1; ana önizlemede kaliteye göre. */
  const sharpness = thumbnailWidthPx != null ? 1 : Math.max(1, Math.min(3, previewSharpness));

  // Layout + soru store görsellerini yükle (remount sonrası boş kalmasın)
  useEffect(() => {
    let cancelled = false;
    const next = new Map<number, HTMLImageElement>();
    let pending = 0;
    const sources = new Map<number, string>();
    layout.forEach((item) => {
      const b64 = item.image_base64;
      if (b64) sources.set(item.order_index, b64);
    });
    // Layout skip_images ise store'dan tamamla
    try {
      const qs = useEditorStore.getState().questions;
      for (const q of qs) {
        if (sources.has(q.order_index)) continue;
        const b64 = q.image_base64;
        if (b64) sources.set(q.order_index, b64);
      }
    } catch {
      /* store yoksa layout yeterli */
    }
    sources.forEach((b64, orderIdx) => {
      const img = new Image();
      pending++;
      img.onload = () => {
        if (cancelled) return;
        next.set(orderIdx, img);
        setImages((prev) => new Map([...prev.entries(), ...next.entries()]));
      };
      img.onerror = () => {
        if (cancelled) return;
        pending--;
        if (pending === 0) setImages((prev) => new Map([...prev.entries(), ...next.entries()]));
      };
      const prefix = b64.startsWith("data:") ? "" : "data:image/png;base64,";
      img.src = prefix + b64;
    });
    if (pending === 0 && sources.size > 0) {
      setImages(next);
    }
    return () => {
      cancelled = true;
    };
  }, [layout]);

  const ptToCanvas = useCallback(
    (xPt: number, yTopPt: number) => {
      return {
        x: xPt * scale,
        y: (pageHpt - yTopPt) * scale,
      };
    },
    [scale, pageHpt]
  );

  const draw = useCallback(() => {
    const visibleCanvas = canvasRef.current;
    const layoutData =
      layoutLiveRef?.current && layoutLiveRef.current.length > 0
        ? layoutLiveRef.current
        : layout;
    const live = alignmentPreviewLiveRef?.current;
    const useLiveReflowLayout = Boolean(
      layoutLiveRef?.current && layoutLiveRef.current.length > 0,
    );
    const numOffsetMm = live?.leftOffsetMm ?? questionNumberLeftOffsetMm;
    const numGapMm = live?.imageGapMm ?? questionNumberImageGapMm;
    const otherPageHeaderGapMm =
      live?.otherPageHeaderBottomGapMm ?? otherPageHeaderBottomGapMm;
    if (!visibleCanvas || layoutData.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const bufferScale = dpr * sharpness;
    let offscreen = offscreenRef.current;
    if (!offscreen) {
      offscreen = document.createElement("canvas");
      offscreenRef.current = offscreen;
    }
    const bufW = Math.max(1, Math.round(pageWpx * bufferScale));
    const bufH = Math.max(1, Math.round(pageHpx * bufferScale));
    if (offscreen.width !== bufW || offscreen.height !== bufH) {
      offscreen.width = bufW;
      offscreen.height = bufH;
    }
    const ctx = offscreen.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(bufferScale, 0, 0, bufferScale, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    try {

    const mlPt = mmToPt(marginLeftMm);
    const mrPt = mmToPt(marginRightMm);
    const mtPt = mmToPt(marginTopMm);
    const mbPt = mmToPt(marginBottomMm);
    const footerTopOffsetMm = FOOTER_TOP_OFFSET_MM;
    const footerBottomOffsetMm = FOOTER_BOTTOM_OFFSET_MM;
    const footerTopPt = mbPt + mmToPt(footerTopOffsetMm);
    const footerBottomPt = mbPt + mmToPt(footerBottomOffsetMm);
    const ml = mlPt * scale;
    const mr = mrPt * scale;
    const primaryHex = resolveThemePrimaryHex(headerConfig.primaryColor, themeColor);
    const accentHex = resolveThemeAccentHex(headerConfig.accentColor);
    const primary = hexToRgb(primaryHex);
    const accent = hexToRgb(accentHex);
    const primaryRgb = `rgb(${Math.round(primary[0] * 255)}, ${Math.round(primary[1] * 255)}, ${Math.round(primary[2] * 255)})`;
    const accentRgb = `rgb(${Math.round(accent[0] * 255)}, ${Math.round(accent[1] * 255)}, ${Math.round(accent[2] * 255)})`;
    const themeRgb = primaryRgb;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageWpx, pageHpx);

    const contentW = pageWpt - mlPt - mrPt;
    /** PDF `desktop_export._DIVIDER_LINE_WIDTH_PT` ile aynı — yazılı çizgiler tek kalınlık */
    const writtenRuleLw = 0.9 * scale;
    const writtenStrokeRgb = "#000000";

    const maxQuestionPage =
      layoutData.length > 0
        ? Math.max(
            1,
            ...layoutData
              .filter((l) => l.kind !== "answer_key_page")
              .map((l) => l.page_num),
          )
        : 1;
    const answerKeyItems: [number, string][] = layoutData
      .filter((l) => l.display_number != null)
      .sort((a, b) => (a.display_number as number) - (b.display_number as number))
      .map((l) => [
        l.display_number as number,
        (l.answer_key || "?").trim().toUpperCase() || "?",
      ]);
    const optikRowsEarly =
      optikFormEnabled && optikFormQuestions.length > 0
        ? optikRowsFromLayoutItems(layoutData, optikFormQuestions)
        : [];
    const optikActiveOptionsEarly = resolveOptikActiveOptions(
      optikFormQuestions,
      optikFormOptionCount,
    );
    let endOfTestOptikReservedAboveFooterPt = 0;
    if (
      includeAnswerKey &&
      answerKeyMode === "end_of_test" &&
      answerKeyItems.length > 0
    ) {
      const maxAnswerKeyWidthPt = layoutData[0]?.w_pt ?? (pageWpt - mlPt - mrPt) / columns;
      const akLayout = computeAnswerKeyLayout({
        items: answerKeyItems,
        totalWidthPx: maxAnswerKeyWidthPt,
        columnCount: 2,
        scale: 1,
      });
      endOfTestOptikReservedAboveFooterPt = akLayout.tableHeightPx + 6;
    }
    const endOfTestOptikFits =
      !optikFormEnabled ||
      optikFormPlacement !== "end_of_test" ||
      optikRowsEarly.length === 0 ||
      endOfTestOptikCompactFits({
        layout: layoutData,
        pageWpt,
        pageHpt,
        marginTopMm,
        marginBottomMm,
        marginLeftMm,
        marginRightMm,
        columns,
        columnGapMm,
        rowCount: optikRowsEarly.length,
        bookletType: optikFormBookletType,
        optionCount: optikActiveOptionsEarly.length,
        reservedAboveFooterPt: endOfTestOptikReservedAboveFooterPt,
        headerStyleId,
        headerConfig,
        headerBottomGapMm,
        otherPageHeaderBottomGapMm,
        writtenPaperHeader,
      });
    const optikTakesSeparatePage =
      !!optikFormEnabled &&
      (optikFormPlacement === "separate_page" ||
        (optikFormPlacement === "end_of_test" && !endOfTestOptikFits));
    const optikSeparatePageCount = optikTakesSeparatePage ? 1 : 0;
    /** Optik ayrı sayfadaysa cevap anahtarından önce; cevap anahtarı en sonda */
    const optikFormPageStart = maxQuestionPage + 1;
    const isOptikSeparatePage =
      optikTakesSeparatePage && currentPage === optikFormPageStart;
    const isOptikFormOnlyPage = isOptikSeparatePage;
    const isAnswerKeyOnlyPage =
      includeAnswerKey &&
      answerKeyMode === "separate_page" &&
      currentPage > maxQuestionPage + optikSeparatePageCount &&
      currentPage <= maxQuestionPage + optikSeparatePageCount + answerKeyPageCount;
    const isExtraSheetPage = isAnswerKeyOnlyPage || isOptikFormOnlyPage;

    const drawRoundRectLeft = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
      roundBottom = false,
    ) => {
      const rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + h);
      if (roundBottom) {
        ctx.lineTo(x + rr, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
      } else {
        ctx.lineTo(x, y + h);
      }
      ctx.lineTo(x, y + rr);
      ctx.quadraticCurveTo(x, y, x + rr, y);
      ctx.closePath();
    };

    const drawAnswerKeyTable = (
      areaX: number,
      tableYTop: number,
      maxAreaW: number,
      items: [number, string][],
      entriesPerRow: number,
      title: string
    ) => {
      const layout = computeAnswerKeyLayout({
        items,
        totalWidthPx: maxAreaW,
        columnCount: entriesPerRow,
        scale,
      });
      const {
        tableWidthPx,
        tableHeightPx,
        headerHeightPx,
        rowHeightPx,
        cellWidthPx,
        rowCount,
        columnCount,
      } = layout;

      const tableX = areaX;
      const tableYBottom = tableYTop + tableHeightPx;
      const akNavy = hexToRgb(ANSWER_KEY_NAVY_HEX);
      const akRed = hexToRgb(ANSWER_KEY_RED_HEX);
      const akNavyRgb = `rgb(${Math.round(akNavy[0] * 255)}, ${Math.round(akNavy[1] * 255)}, ${Math.round(akNavy[2] * 255)})`;
      const akRedRgb = `rgb(${Math.round(akRed[0] * 255)}, ${Math.round(akRed[1] * 255)}, ${Math.round(akRed[2] * 255)})`;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(tableX, tableYTop, tableWidthPx, tableHeightPx);

      const headerBg = `rgba(${Math.round(akNavy[0] * 255)}, ${Math.round(akNavy[1] * 255)}, ${Math.round(akNavy[2] * 255)}, 0.25)`;
      ctx.fillStyle = headerBg;
      ctx.fillRect(tableX, tableYTop, tableWidthPx, headerHeightPx);

      ctx.strokeStyle = akNavyRgb;
      ctx.lineWidth = ANSWER_KEY_LAYOUT.BORDER_WIDTH_PT * scale;
      ctx.strokeRect(tableX, tableYTop, tableWidthPx, tableHeightPx);

      ctx.fillStyle = akNavyRgb;
      ctx.font = `bold ${ANSWER_KEY_LAYOUT.TITLE_FONT_PT * scale}px Arial, Helvetica`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        ((title || "CEVAP ANAHTARI").trim().toUpperCase()).slice(0, 50),
        tableX + tableWidthPx / 2,
        tableYTop + headerHeightPx / 2
      );

      const cellFontSize = ANSWER_KEY_LAYOUT.CELL_FONT_PT * scale;
      ctx.font = `bold ${cellFontSize}px Arial, Helvetica`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = akRedRgb;

      for (let c = 0; c < columnCount; c++) {
        const cellCenterX = tableX + (c + 0.5) * cellWidthPx;
        for (let r = 0; r < rowCount; r++) {
          const idx = r * columnCount + c;
          if (idx >= items.length) break;
          const [num, ans] = items[idx];
          const cellCenterY =
            tableYTop +
            headerHeightPx +
            (r + 0.5) * rowHeightPx;
          const text = `${num}- ${(ans || "?").trim().toUpperCase() || "?"}`;
          ctx.font = `bold ${cellFontSize}px Arial, Helvetica`;
          ctx.fillText(text, cellCenterX, cellCenterY);
        }
      }

      ctx.strokeStyle = akNavyRgb;
      ctx.lineWidth = ANSWER_KEY_LAYOUT.GRID_LINE_WIDTH_PT * scale;
      for (let c = 1; c < columnCount; c++) {
        const lineX = tableX + c * cellWidthPx;
        ctx.beginPath();
        ctx.moveTo(lineX, tableYTop + headerHeightPx);
        ctx.lineTo(lineX, tableYBottom);
        ctx.stroke();
      }
      for (let r = 1; r <= rowCount; r++) {
        const rowY = tableYTop + headerHeightPx + r * rowHeightPx;
        ctx.beginPath();
        ctx.moveTo(tableX, rowY);
        ctx.lineTo(tableX + tableWidthPx, rowY);
        ctx.stroke();
      }
    };

    const drawRoundRectRight = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
      roundBottom = false,
    ) => {
      const rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w - rr, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
      if (roundBottom) {
        ctx.lineTo(x + w, y + h - rr);
        ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
      } else {
        ctx.lineTo(x + w, y + h);
      }
      ctx.lineTo(x, y + h);
      ctx.lineTo(x, y);
      ctx.closePath();
    };

    const drawBottomRoundRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
    ) => {
      const rr = Math.min(r, w / 2, h);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + h - rr);
      ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
      ctx.lineTo(x + rr, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
      ctx.closePath();
    };

    const drawDescriptionBoxSection = (boxYCanvas: number) => {
      const contentWPt = pageWpt - mlPt - mrPt;
      const measureText = (text: string, fontSizePt: number) => {
        ctx.font = `${fontSizePt * scale}px ${CLASSIC_PDF_MATCH_FONT_FAMILY}`;
        return ctx.measureText(text).width / scale;
      };
      const trialMeta = false;
      const layout = computeDescriptionLayout(
        {
          includeDescription: true,
          descriptionColumnCount,
          descriptionTexts,
          descriptionBoxPadYPt,
          descriptionBoxPadXPt,
          trialMetaBar: trialMeta,
        },
        contentWPt,
        measureText,
      )!;
      const { colCount, linesPerCol, boxHeightPt: boxH, padXPt } = layout;
      const pad = padXPt * scale;
      const r = 6 * scale;
      const metaHpx = 0;
      const boxHpx = boxH * scale;
      ctx.strokeStyle = themeRgb;
      ctx.fillStyle = "#ffffff";
      ctx.lineWidth = 1.0 * scale;
      ctx.beginPath();
      ctx.moveTo(ml, boxYCanvas);
      ctx.lineTo(pageWpx - mr, boxYCanvas);
      ctx.lineTo(pageWpx - mr, boxYCanvas + boxHpx - r);
      ctx.quadraticCurveTo(pageWpx - mr, boxYCanvas + boxHpx, pageWpx - mr - r, boxYCanvas + boxHpx);
      ctx.lineTo(ml + r, boxYCanvas + boxHpx);
      ctx.quadraticCurveTo(ml, boxYCanvas + boxHpx, ml, boxYCanvas + boxHpx - r);
      ctx.lineTo(ml, boxYCanvas);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const contentWpx = pageWpx - ml - mr;

      const textTop = boxYCanvas + metaHpx;
      const colW = contentWpx / colCount;
      ctx.fillStyle = "#262626";
      ctx.font = `${DESC_FONT_SIZE_PT * scale}px ${CLASSIC_PDF_MATCH_FONT_FAMILY}`;
      ctx.textBaseline = "alphabetic";
      const fontPx = DESC_FONT_SIZE_PT * scale;
      for (let colIdx = 0; colIdx < colCount; colIdx++) {
        const xLeft = ml + colIdx * colW;
        const lines = linesPerCol[colIdx] ?? [""];
        ctx.save();
        ctx.beginPath();
        ctx.rect(xLeft + pad, textTop, colW - 2 * pad, boxHpx - metaHpx);
        ctx.clip();
        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
          const centerY =
            textTop + descriptionLineCenterFromTopPt(lineIdx, layout) * scale;
          const yBaseline = classicTextBaselineCanvas(centerY, fontPx);
          const txt = (lines[lineIdx] || "").trim();
          if (!txt) continue;
          ctx.textAlign = "left";
          ctx.fillText(txt, xLeft + pad, yBaseline);
        }
        ctx.restore();
      }
      if (colCount > 1 && descriptionColumnDividers) {
        ctx.strokeStyle = themeRgb;
        ctx.lineWidth = 0.55 * scale;
        for (let b = 1; b < colCount; b += 1) {
          const xDiv = ml + b * colW;
          ctx.beginPath();
          ctx.moveTo(xDiv, textTop);
          ctx.lineTo(xDiv, boxYCanvas + boxHpx);
          ctx.stroke();
        }
      }
    };

    const pageHeaderHeightPt = (): number => {
      const contentWPt = pageWpt - mlPt - mrPt;
      if (writtenPaperHeader && (writtenPaperTitle || "").trim()) {
        if (currentPage === 1) {
          const titleMax = Math.max(100, contentW - 8);
          return approxWrittenRuleDownFromInnerTopPt(
            writtenPaperFieldLines,
            writtenPaperTitle,
            titleMax,
            writtenPaperFieldHidden
          );
        }
        return 2;
      }
      if (isCorporateHeader(headerStyleId)) {
        return currentPage === 1
          ? themeFirstPageHeaderTotalPt(
              headerStyleId,
              headerConfig,
              pageWpt,
              marginLeftMm,
              marginRightMm,
            )
          : corporateOtherPageHeaderLayoutPt(headerStyleId, otherPageHeaderGapMm);
      }
      if (currentPage === 1 && includeDescription) {
        const showInfo = headerConfig.showClassicInfoBar !== false;
        const badgeCfg = {
          ...mergeHeaderBadgeConfig(
            normalizeClassicBannerConfig(headerConfig),
            headerStyleId,
          ),
          showClassicInfoBar: showInfo,
        };
        return descriptionHeaderBlockHeightPt(
          {
            includeDescription: true,
            descriptionColumnCount,
            descriptionTexts,
            descriptionBoxPadYPt,
            descriptionBoxPadXPt,
            trialMetaBar: false,
          },
          contentWPt,
          undefined,
          resolveClassicBannerAndInfoHeightPt(badgeCfg, headerStyleId, contentWPt),
        );
      }
      if (currentPage === 1) {
        const showInfo = headerConfig.showClassicInfoBar !== false;
        return resolveClassicBannerAndInfoHeightPt(
          {
            ...mergeHeaderBadgeConfig(
              normalizeClassicBannerConfig(headerConfig),
              headerStyleId,
            ),
            showClassicInfoBar: showInfo,
          },
          headerStyleId,
          contentWPt,
        );
      }
      return 22;
    };

    if (!isExtraSheetPage && currentPage === 1 && writtenPaperHeader && (writtenPaperTitle || "").trim()) {
      const titleMaxWPt = Math.max(100, contentW - 8);
      const writtenHpt = approxWrittenHeaderHeightPt(
        writtenPaperFieldLines,
        writtenPaperTitle,
        titleMaxWPt,
        writtenPaperFieldHidden
      );
      const boxY = pageHpt - mtPt - writtenHpt;
      const boxYCanvas = (pageHpt - boxY - writtenHpt) * scale;
      const padTop = 2 * scale;
      const s = scale;

      const title = (writtenPaperTitle || "").trim();
      ctx.fillStyle = "#111827";
      ctx.font = `bold ${10 * s}px Helvetica, Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      let yText = boxYCanvas + padTop;
      const titleLineH = 11 * s;
      const maxTitlePx = (titleMaxWPt - 2) * scale;
      const titleLines = wrapTitleLinesWithMeasure(title, (t) => ctx.measureText(t).width, maxTitlePx);
      const cxTitle = ml + (contentW * scale) / 2;
      for (const ln of titleLines) {
        ctx.fillText(ln.slice(0, 220), cxTitle, yText);
        yText += titleLineH;
      }

      const rulePdfY =
        boxY + mmToPt(2) + 0.9 / 2;
      const lineYCanvas = (pageHpt - rulePdfY) * scale;
      const yFields = yText + 17 * s;
      const xLeftPx = ml;
      const cxPx = ml + (contentW * scale) / 2;
      const formLineCapX = cxPx - 26 * s;
      const formLineLenPx = 100 * s;
      const lblGap = 4 * s;
      const rowH = 11 * s;
      const rowGap = 8 * s;

      const { nAd, nNum, nSin, blockBody } = writtenHeaderBlockLayoutPt(
        writtenPaperFieldLines,
        writtenPaperFieldHidden
      );

      const adiLbl = writtenHeaderLabelPdfLeft("ad_soyad", writtenPaperFieldLabels);
      const numLbl = writtenHeaderLabelPdfLeft("numara", writtenPaperFieldLabels);
      const sinLbl = writtenHeaderLabelPdfLeft("sinif", writtenPaperFieldLabels);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#111827";

      ctx.font = `bold ${8 * s}px Helvetica, Arial`;
      const wLblSlot = Math.max(
        ctx.measureText(adiLbl).width,
        ctx.measureText(numLbl).width,
        ctx.measureText(sinLbl).width
      );
      const xLblRight = xLeftPx + wLblSlot;
      const xLine0 = xLblRight + lblGap;
      const xLineEnd = Math.min(xLine0 + formLineLenPx, formLineCapX);

      let yrCanvas = yFields;
      if (nAd > 0) {
        for (let j = 0; j < nAd; j++) {
          const yrow = yrCanvas + j * rowH;
          if (j === 0) {
            ctx.font = `bold ${8 * s}px Helvetica, Arial`;
            ctx.textAlign = "right";
            ctx.fillText(adiLbl, xLblRight, yrow);
            ctx.textAlign = "left";
          }
          ctx.font = `${8 * s}px Helvetica, Arial`;
          ctx.strokeStyle = writtenStrokeRgb;
          ctx.lineWidth = writtenRuleLw;
          ctx.beginPath();
          ctx.moveTo(xLine0, yrow + 2 * s);
          ctx.lineTo(xLineEnd, yrow + 2 * s);
          ctx.stroke();
        }
        yrCanvas += nAd * rowH;
        if (nNum || nSin) yrCanvas += rowGap;
      }
      if (nNum > 0) {
        const yNumBase = yrCanvas;
        for (let j = 0; j < nNum; j++) {
          const yrow = yNumBase + j * rowH;
          if (j === 0) {
            ctx.font = `bold ${8 * s}px Helvetica, Arial`;
            ctx.textAlign = "right";
            ctx.fillText(numLbl, xLblRight, yrow);
            ctx.textAlign = "left";
          }
          ctx.font = `${8 * s}px Helvetica, Arial`;
          ctx.strokeStyle = writtenStrokeRgb;
          ctx.lineWidth = writtenRuleLw;
          ctx.beginPath();
          ctx.moveTo(xLine0, yrow + 2 * s);
          ctx.lineTo(xLineEnd, yrow + 2 * s);
          ctx.stroke();
        }
        yrCanvas += nNum * rowH;
        if (nSin) yrCanvas += rowGap;
      }
      if (nSin > 0) {
        const ySinBase = yrCanvas;
        for (let j = 0; j < nSin; j++) {
          const yrow = ySinBase + j * rowH;
          if (j === 0) {
            ctx.font = `bold ${8 * s}px Helvetica, Arial`;
            ctx.textAlign = "right";
            ctx.fillText(sinLbl, xLblRight, yrow);
            ctx.textAlign = "left";
          }
          ctx.font = `${8 * s}px Helvetica, Arial`;
          ctx.strokeStyle = writtenStrokeRgb;
          ctx.lineWidth = writtenRuleLw;
          ctx.beginPath();
          ctx.moveTo(xLine0, yrow + 2 * s);
          ctx.lineTo(xLineEnd, yrow + 2 * s);
          ctx.stroke();
        }
      }

      const blockHPx = blockBody * scale;
      const yMid = yFields + blockHPx / 2 - 2 * s;

      const bookletLt = (writtenPaperBookletLetter || "").trim();
      if (bookletLt) {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `bold ${26 * s}px Helvetica, Arial`;
        ctx.fillStyle = themeRgb;
        ctx.fillText(bookletLt, cxPx, yMid);
      }

      if (!writtenPaperFieldHidden.puan) {
        const puanBoxSz = 40 * s;
        const puanR = 4 * s;
        const boxLeft = pageWpx - mr - puanBoxSz;
        const boxTopY = yMid - puanBoxSz / 2;

        ctx.strokeStyle = writtenStrokeRgb;
        ctx.lineWidth = writtenRuleLw;
        ctx.beginPath();
        ctx.roundRect(boxLeft, boxTopY, puanBoxSz, puanBoxSz, puanR);
        ctx.stroke();

        ctx.font = `bold ${8 * s}px Helvetica, Arial`;
        ctx.fillStyle = "#111827";
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(
          writtenHeaderLabelPdfPuan(writtenPaperFieldLabels).slice(0, 40),
          boxLeft + puanBoxSz / 2,
          boxTopY - 3 * s
        );
      }

      ctx.beginPath();
      ctx.strokeStyle = writtenStrokeRgb;
      ctx.lineWidth = writtenRuleLw;
      ctx.moveTo(ml, lineYCanvas);
      ctx.lineTo(pageWpx - mr, lineYCanvas);
      ctx.stroke();
    } else if (
      !isExtraSheetPage &&
      currentPage === 1 &&
      isCorporateHeader(headerStyleId) &&
      !usesHtmlBannerOverlay(headerConfig)
    ) {
      const headerTopCanvas = mtPt * scale;
      drawThemeFirstPageHeaderCanvas({
        ctx,
        scale,
        ml,
        mr,
        pageWpx,
        headerTopCanvas,
        contentWpt: contentW,
        config: headerConfig,
        logoImage,
        styleId: headerStyleId,
      });
    } else if (
      !isExtraSheetPage &&
      currentPage === 1 &&
      isCorporateHeader(headerStyleId) &&
      usesHtmlBannerOverlay(headerConfig)
    ) {
      /* İlk sayfa banner — PdfPreviewBannerOverlay (HTML/SVG) */
    } else if (
      !isExtraSheetPage &&
      currentPage === 1 &&
      isClassicTestBannerHeader(headerStyleId)
    ) {
      const classicCfg = normalizeClassicBannerConfig(headerConfig);
      const boxH = resolveClassicTopBannerHeightPt(classicCfg, headerStyleId);
      const totalH = boxH;
      const boxY = pageHpt - mtPt - totalH;
      const boxYCanvas = (pageHpt - boxY - totalH) * scale;
      const trialBanner = Boolean(trialDescriptionMeta);
      const midLabel = trialBanner
        ? (trialDescriptionMeta?.testName || "TEST ADI").trim().toUpperCase().slice(0, 40)
        : classicBannerSubjectText(classicCfg).slice(0, 40);
      const subjectPt = getHeaderFieldFontPt("subject", headerStyleId, classicCfg);
      const padXPt = clampSubjectPillPadXPt(
        classicCfg.subjectPillPadXPt ?? CLASSIC_SUBJECT_PILL_PAD_X_DEFAULT_PT,
      );
      const classicFont = CLASSIC_PDF_MATCH_FONT_FAMILY;
      ctx.font = `bold ${subjectPt * scale}px ${classicFont}`;
      const midLabelW = midLabel ? ctx.measureText(midLabel).width / scale : 0;
      const trialMinMidW = trialBanner
        ? ctx.measureText(TRIAL_TEST_NAME_MIN_SAMPLE).width / scale
        : 0;
      const textWidthPt = Math.max(midLabelW, trialMinMidW, trialBanner ? 0 : boxH);
      const row = layoutClassicBannerTopRow({
        contentW,
        ml: mlPt,
        textWidthPt: textWidthPt || boxH,
        padXPt,
      });
      const { leftW, midW, rightW, xLeft, xMid, xRight } = row;
      const innerH = boxH;
      const leftWpx = leftW * scale;
      const midWpx = midW * scale;
      const rightWpx = rightW * scale;
      const innerBoxYCanvas = boxYCanvas;
      const r = 6 * scale;
      const showClassicInfoBar = classicCfg.showClassicInfoBar !== false;
      const roundBottomCorners = !showClassicInfoBar && !includeDescription;

      ctx.lineWidth = 1.0 * scale;
      ctx.strokeStyle = themeRgb;
      const showClassicLeft = classicCfg.showHeaderLeft !== false;
      ctx.fillStyle = "#ffffff";
      drawRoundRectLeft(
        xLeft * scale,
        innerBoxYCanvas,
        leftWpx,
        innerH * scale,
        r,
        roundBottomCorners,
      );
      ctx.fill();
      ctx.stroke();

      if (trialBanner && trialDescriptionMeta) {
        const leftTxt = (trialDescriptionMeta.examCode || "SINAV KODU").trim().toUpperCase();
        const leftFontPt = Math.max(7, Math.min(18, trialDescriptionMeta.examCodeFontPt ?? 10));
        const leftColor = (trialDescriptionMeta.examCodeColor || "").trim() || themeRgb;
        const align = trialDescriptionMeta.examCodeAlign ?? "left";
        const padLeftPt = Math.max(0, Math.min(36, trialDescriptionMeta.examCodePadLeftPt ?? 10));
        const padRightPt = CLASSIC_TEST_NO_INSET_X_PT;
        ctx.fillStyle = leftColor;
        ctx.font = `bold ${leftFontPt * scale}px ${classicFont}`;
        ctx.textBaseline = "middle";
        const cy = innerBoxYCanvas + (innerH * scale) / 2;
        const x0 = xLeft * scale;
        const x1 = x0 + leftWpx;
        if (align === "center") {
          ctx.textAlign = "center";
          ctx.fillText(leftTxt.slice(0, 40), x0 + leftWpx / 2, cy);
        } else if (align === "right") {
          ctx.textAlign = "right";
          ctx.fillText(leftTxt.slice(0, 40), x1 - padRightPt * scale, cy);
        } else {
          ctx.textAlign = "left";
          ctx.fillText(leftTxt.slice(0, 40), x0 + padLeftPt * scale, cy);
        }
        ctx.textAlign = "left";
      } else if (showClassicLeft) {
        const leftInset = CLASSIC_TEST_NO_INSET_X_PT * scale;
        const leftContentX = xLeft * scale + leftInset;
        const leftAvailW = Math.max(1, leftWpx - leftInset * 2);
        const leftMode = String(classicCfg.headerLeftMode ?? "logo");
        const useText =
          leftMode === "publicationText" ||
          leftMode === "institutionText" ||
          leftMode === "publication_text";
        if (useText) {
          const badgeCfg = {
            ...mergeHeaderBadgeConfig(classicCfg, headerStyleId),
            primaryColor: themeRgb,
          };
          drawClassicInstitutionBadgeCanvas(
            ctx,
            leftContentX,
            innerBoxYCanvas,
            innerH * scale,
            badgeCfg,
            themeRgb,
            scale,
            classicFont,
            leftAvailW,
          );
        } else {
          const showClassicLogo =
            !!resolveHeaderLogoUrl(classicCfg) &&
            !!logoImage?.complete &&
            (logoImage.naturalWidth ?? 0) > 0;
          if (showClassicLogo) {
            const badgeCfg = {
              ...mergeHeaderBadgeConfig(classicCfg, headerStyleId),
              primaryColor: themeRgb,
              logoSizePct: classicCfg.logoSizePct ?? 100,
            };
            drawClassicLogoBadgeCanvas(
              ctx,
              logoImage!,
              leftContentX,
              innerBoxYCanvas,
              innerH * scale,
              leftAvailW,
              badgeCfg,
              scale,
            );
          }
        }
      }

      if (midW > 0) {
        const midFill =
          trialBanner && (trialDescriptionMeta?.testNameBgColor || "").trim()
            ? (trialDescriptionMeta!.testNameBgColor || "").trim()
            : classicCfg.subjectPillFillColor?.trim()
              ? resolveSubjectPillFillColor(classicCfg)
              : (themeRgb || "#0A1931");
        const opacityPct = trialBanner
          ? Math.max(0, Math.min(100, trialDescriptionMeta?.testNameBgOpacityPct ?? 100))
          : 100;
        const [mr, mg, mb] = hexToRgb(midFill);
        const alpha = opacityPct / 100;
        ctx.fillStyle = `rgba(${Math.round(mr * 255)},${Math.round(mg * 255)},${Math.round(mb * 255)},${alpha})`;
        ctx.fillRect(xMid * scale, innerBoxYCanvas, midWpx, innerH * scale);
        ctx.strokeStyle = midFill;
        ctx.globalAlpha = Math.max(alpha, 0.35);
        ctx.strokeRect(xMid * scale, innerBoxYCanvas, midWpx, innerH * scale);
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = themeRgb;
      drawRoundRectRight(
        xRight * scale,
        innerBoxYCanvas,
        rightWpx,
        innerH * scale,
        r,
        roundBottomCorners,
      );
      ctx.fill();
      ctx.stroke();

      if (trialBanner && trialDescriptionMeta) {
        const rightTxt = (trialDescriptionMeta.bookletLabel || "A KİTAPÇIĞI")
          .trim()
          .toUpperCase();
        const rightFontPt = Math.max(7, Math.min(18, trialDescriptionMeta.bookletFontPt ?? 10));
        const rightColor = (trialDescriptionMeta.bookletColor || "").trim() || themeRgb;
        ctx.fillStyle = rightColor;
        ctx.font = `bold ${rightFontPt * scale}px ${classicFont}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          rightTxt.slice(0, 40),
          xRight * scale + rightWpx / 2,
          innerBoxYCanvas + (innerH * scale) / 2,
        );
        ctx.textAlign = "left";
      }

      if (midLabel) {
        const subjectOffY = resolveSubjectPillTextOffsetYPt(classicCfg) * scale;
        const centerY = innerBoxYCanvas + (innerH * scale) / 2 + subjectOffY;
        ctx.fillStyle = resolveSubjectPillTextColor(classicCfg);
        ctx.font = `bold ${subjectPt * scale}px ${classicFont}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(
          midLabel,
          xMid * scale + midWpx / 2,
          classicTextBaselineCanvas(centerY, subjectPt * scale),
        );
      }

      const badgeConfig = {
        ...mergeHeaderBadgeConfig(classicCfg, headerStyleId),
        primaryColor: themeRgb,
      };
      const rightModeRaw = resolveBannerRightMode(badgeConfig);
      /** Minimal info bar: Sınav Türü çizilmez */
      const rightMode =
        rightModeRaw === "score" || rightModeRaw === "examType" ? "testNo" : rightModeRaw;
      if (!trialBanner) {
        if (rightMode === "testNo") {
          const testRightEdge =
            xRight * scale + rightWpx - CLASSIC_TEST_NO_INSET_X_PT * scale;
          drawStyle1TestNoCanvas(
            ctx,
            testRightEdge,
            innerBoxYCanvas,
            innerH * scale,
            badgeConfig,
            scale,
            classicFont,
          );
        }
      }

      const infoY = innerBoxYCanvas + innerH * scale + DESC_BANNER_GAP_PT * scale;
      let infoHPt = 0;
      let infoHpx = 0;
      if (showClassicInfoBar) {
      infoHPt = resolveClassicInfoBarHeightPt(badgeConfig, headerStyleId, contentW);
      const infoPadX = CLASSIC_INFO_PAD_X_PT * scale;
      const topicTxt = visibleTopicText(classicCfg);
      const subTopicTxt = visibleSubTopicText(classicCfg);
      const topicSizePt = getHeaderFieldFontPt("topic", headerStyleId, classicCfg);
      const subSizePt = getHeaderFieldFontPt("subTopic", headerStyleId, classicCfg);
      const topicSubGapPt = classicCfg.topicSubTopicGapPt ?? 3;
      const dybSize = style1ClassicDyBSizePt(badgeConfig);
      const dybGroupWPt = dybSize.wPt;
      const textMaxWPt = Math.max(
        40,
        contentW - CLASSIC_INFO_PAD_X_PT * 2 - dybGroupWPt - CLASSIC_DYB_INSET_X_PT - 8,
      );
      const topicMarker = classicInfoMarkerLayout(topicSizePt, "square").textOffsetX;
      const subMarker = classicInfoMarkerLayout(
        topicTxt ? topicSizePt : subSizePt,
        "square",
      ).textOffsetX;
      const topicBold = headerFieldBold(classicCfg, "topic", true);
      const topicItalic = headerFieldItalic(classicCfg, "topic", false);
      const subBold = headerFieldBold(classicCfg, "subTopic", false);
      const subItalic = headerFieldItalic(classicCfg, "subTopic", true);
      ctx.font = canvasFontStyleCss(topicBold, topicItalic, topicSizePt * scale, classicFont);
      const topicTexts = topicTxt
        ? wrapClassicInfoBarText(topicTxt, textMaxWPt - topicMarker, (s) => {
            ctx.font = canvasFontStyleCss(topicBold, topicItalic, topicSizePt * scale, classicFont);
            return ctx.measureText(s).width / scale;
          })
        : [];
      ctx.font = canvasFontStyleCss(subBold, subItalic, subSizePt * scale, classicFont);
      const subTexts = subTopicTxt
        ? wrapClassicInfoBarText(subTopicTxt, textMaxWPt - subMarker, (s) => {
            ctx.font = canvasFontStyleCss(subBold, subItalic, subSizePt * scale, classicFont);
            return ctx.measureText(s).width / scale;
          })
        : [];
      const topicBlockNeed = classicInfoBarTopicBlockHeightPt({
        topicFontPt: topicSizePt,
        subFontPt: subSizePt,
        topicLineCount: topicTexts.length,
        subLineCount: subTexts.length,
        gapPt: topicSubGapPt,
      });
      infoHPt = Math.max(infoHPt, topicBlockNeed + 6);
      infoHpx = infoHPt * scale;
      const infoR = includeDescription ? 0 : CLASSIC_BANNER_RADIUS_PT * scale;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = themeRgb;
      ctx.lineWidth = CLASSIC_BANNER_LINE_PT * scale;
      if (infoR <= 0) {
        ctx.beginPath();
        ctx.rect(ml, infoY, contentW * scale, infoHpx);
      } else {
        drawBottomRoundRect(ml, infoY, contentW * scale, infoHpx, infoR);
      }
      ctx.fill();
      ctx.stroke();

      const lines = layoutClassicInfoBarTopicLines({
        infoH: infoHPt,
        topicFontPt: topicSizePt,
        subFontPt: subSizePt,
        hasTopic: Boolean(topicTxt),
        hasSub: Boolean(subTopicTxt),
        gapPt: topicSubGapPt,
        topicTexts,
        subTexts,
        topicBold,
        topicItalic,
        subBold,
        subItalic,
      });
      const drawInfoTopicLine = (
        color: string,
        line: NonNullable<typeof lines.topic>,
      ) => {
        const mSize = line.marker.size * scale;
        const mRad = line.marker.radius * scale;
        const mX = ml + infoPadX;
        const mY = infoY + line.markerTopFromInfoTop * scale;
        const fontPx = line.fontPt * scale;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(mX, mY, mSize, mSize, mRad);
        ctx.fill();
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = color;
        ctx.font = canvasFontStyleCss(line.bold, line.italic, fontPx, classicFont);
        const textX = mX + line.marker.textOffsetX * scale;
        line.texts.forEach((row, i) => {
          const centerY = infoY + (line.centerFromInfoTop + i * line.fontPt) * scale;
          ctx.fillText(row, textX, classicTextBaselineCanvas(centerY, fontPx));
        });
      };
      if (lines.topic && topicTxt) {
        drawInfoTopicLine(headerFieldColor(classicCfg, "topic", themeRgb), lines.topic);
      }
      if (lines.sub && subTopicTxt) {
        drawInfoTopicLine(headerFieldColor(classicCfg, "subTopic", accentRgb), lines.sub);
      }
      const badgeInset = CLASSIC_INFO_BAR_BADGE_INSET_PT * scale;
      const rightEdge = pageWpx - mr - badgeInset;
      let dybRightEdgePt = (pageWpx - mr) / scale - CLASSIC_DYB_INSET_X_PT;
      if (rightMode === "examType" && !trialBanner && shouldDrawExamTypeBoxContent(badgeConfig)) {
        const boxHExam = resolveExamTypeBoxHeightPt(badgeConfig) * scale;
        const maxBoxWPt = contentW * 0.45;
        const boxW = resolveExamTypeBoxWidthPt(badgeConfig, maxBoxWPt) * scale;
        const boxX = rightEdge - boxW;
        const boxYExam = infoY + (infoHpx - boxHExam) / 2;
        drawExamTypeBoxFillCanvas(ctx, boxX, boxYExam, boxW, boxHExam, badgeConfig, scale);
        drawExamTypeBoxBorderCanvas(ctx, boxX, boxYExam, boxW, boxHExam, badgeConfig, scale);
        drawExamTypeTextInBox(ctx, boxX, boxYExam, boxW, boxHExam, badgeConfig, scale, classicFont);
        dybRightEdgePt = boxX / scale - 4;
      }

      const dybHPt = dybSize.hPt;
      const dybBoxW = dybSize.wPt * scale;
      const dybBoxH = dybHPt * scale;
      const dybBoxX = dybRightEdgePt * scale - dybBoxW;
      const dybBoxY = infoY + (infoHpx - dybBoxH) / 2;
      drawStyle1ScoreBoxCanvas(
        ctx,
        dybBoxX,
        dybBoxY,
        dybBoxW,
        dybBoxH,
        badgeConfig,
        scale,
        classicFont,
      );
      }

      if (includeDescription) {
        const descTop = showClassicInfoBar
          ? infoY + infoHpx + DESC_BANNER_GAP_PT * scale
          : innerBoxYCanvas + innerH * scale + DESC_BANNER_GAP_PT * scale;
        drawDescriptionBoxSection(descTop);
      }
    } else if (!isExtraSheetPage && currentPage > 1 && writtenPaperHeader) {
      const linePdfY = pageHpt - mtPt - 2;
      const yLineCanvas = (pageHpt - linePdfY) * scale;
      ctx.strokeStyle = writtenStrokeRgb;
      ctx.lineWidth = writtenRuleLw;
      ctx.beginPath();
      ctx.moveTo(ml, yLineCanvas);
      ctx.lineTo(pageWpx - mr, yLineCanvas);
      ctx.stroke();
    } else if (!isExtraSheetPage && currentPage > 1 && isCorporateHeader(headerStyleId)) {
      drawThemeRunningHeaderCanvas({
        ctx,
        scale,
        ml,
        mr,
        pageWpx,
        headerTopCanvas: mtPt * scale,
        contentWpt: contentW,
        config: headerConfig,
        styleId: headerStyleId,
        pageNum: currentPage,
        logoImage,
        otherPageHeaderBottomGapMm: otherPageHeaderGapMm,
        trialTestName: trialDescriptionMeta?.testName,
      });
    } else if (!isExtraSheetPage && currentPage > 1) {
      // Test / deneme diğer sayfalar: noktalı dolgu, dış çerçeve; yazılar beyaz zemin üstünde (çizgisiz)
      const boxHpt = 22;
      const boxY = pageHpt - mtPt - boxHpt;
      const innerBoxYCanvas = (pageHpt - boxY - boxHpt) * scale;
      const innerHPx = boxHpt * scale;
      const wPx = contentW * scale;
      const x0 = ml;
      const rPx = Math.min(5 * scale, wPx / 2 - 1, innerHPx / 2 - 1);
      const k = 0.5522847498;
      const traceOtherPageBannerPath = () => {
        ctx.beginPath();
        ctx.moveTo(x0, innerBoxYCanvas + innerHPx);
        ctx.lineTo(x0 + wPx, innerBoxYCanvas + innerHPx);
        ctx.lineTo(x0 + wPx, innerBoxYCanvas + rPx);
        ctx.bezierCurveTo(
          x0 + wPx,
          innerBoxYCanvas + rPx * (1 - k),
          x0 + wPx - rPx + k * rPx,
          innerBoxYCanvas,
          x0 + wPx - rPx,
          innerBoxYCanvas
        );
        ctx.lineTo(x0 + rPx, innerBoxYCanvas);
        ctx.bezierCurveTo(
          x0 + rPx - k * rPx,
          innerBoxYCanvas,
          x0,
          innerBoxYCanvas + rPx * (1 - k),
          x0,
          innerBoxYCanvas + rPx
        );
        ctx.lineTo(x0, innerBoxYCanvas + innerHPx);
        ctx.closePath();
      };

      traceOtherPageBannerPath();
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      traceOtherPageBannerPath();
      ctx.strokeStyle = themeRgb;
      ctx.lineWidth = 1.0 * scale;
      ctx.stroke();

      const padX = 8 * scale;
      const padW = 4 * scale;
      const padV = 3 * scale;
      const halfPx = Math.max(30 * scale, wPx / 2 - 10 * scale);
      const topicPt = getHeaderFieldFontPt("topic", headerStyleId, headerConfig, "running");
      const brandPt = getHeaderFieldFontPt("brandName", headerStyleId, headerConfig, "running");
      const otherFont = CLASSIC_PDF_MATCH_FONT_FAMILY;
      const trialOtherPage = Boolean(trialDescriptionMeta);
      ctx.font = `bold ${topicPt * scale}px ${otherFont}`;
      let titleStr = (
        trialOtherPage
          ? trialOsymOtherPageLeftText(trialDescriptionMeta?.examCode)
          : otherPageHeaderLeftText(headerConfig)
      ).slice(0, 80);
      while (titleStr.length > 1 && ctx.measureText(titleStr).width > halfPx - padX) {
        titleStr = titleStr.slice(0, -1);
      }
      const twT = ctx.measureText(titleStr).width;
      ctx.font = `bold ${brandPt * scale}px ${otherFont}`;
      let schn = (
        trialOtherPage
          ? trialOsymOtherPageRightText(headerConfig)
          : otherPageHeaderRightText(headerConfig)
      ).slice(0, 80);
      while (schn.length > 0 && ctx.measureText(schn).width > halfPx - padX) {
        schn = schn.slice(0, -1);
      }
      const twS = schn ? ctx.measureText(schn).width : 0;
      const midY = innerBoxYCanvas + innerHPx / 2;
      const bandH = Math.max(topicPt, brandPt) * scale + 2 * padV;
      const yWhiteTop = midY - bandH / 2;

      ctx.fillStyle = "#ffffff";
      if (titleStr) {
        ctx.fillRect(x0 + padX - padW, yWhiteTop, twT + 2 * padW, bandH);
      }
      if (schn) {
        ctx.fillRect(x0 + wPx - padX - twS - padW, yWhiteTop, twS + 2 * padW, bandH);
      }

      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      if (titleStr) {
        const leftColor =
          trialOtherPage && (trialDescriptionMeta?.examCodeColor || "").trim()
            ? (trialDescriptionMeta!.examCodeColor || "").trim()
            : headerFieldColor(headerConfig, "topic", "#262626");
        ctx.fillStyle = leftColor;
        ctx.font = `bold ${topicPt * scale}px ${otherFont}`;
        ctx.fillText(
          titleStr,
          x0 + padX,
          classicTextBaselineCanvas(midY, topicPt * scale),
        );
      }
      if (schn) {
        ctx.textAlign = "right";
        ctx.fillStyle = headerFieldColor(headerConfig, "brandName", "#262626");
        ctx.font = `bold ${brandPt * scale}px ${otherFont}`;
        ctx.fillText(
          schn,
          x0 + wPx - padX,
          classicTextBaselineCanvas(midY, brandPt * scale),
        );
      }
      ctx.textAlign = "left";
    }

    const dividerActive = showColumnDivider && columns > 1 && !isExtraSheetPage;
    const dividerText = (columnDividerText || centerLineText || "").trim();
    const dividerRgb = writtenPaperHeader
      ? writtenStrokeRgb
      : primaryRgb;

    // Sütun çizgileri - üst banner alt çizgisinden footer üst çizgisine; full-width bantlarında kesilir
    if (dividerActive) {
      const colGapPt = mmToPt(columnGapMm);
      const colWPt = (contentW - (columns - 1) * colGapPt) / columns;
      const linePositionsPx = Array.from({ length: columns - 1 }, (_, i) =>
        (mlPt + (i + 1) * colWPt + (i + 0.5) * colGapPt) * scale
      );
      let headerH: number;
      const otherDividerStart = otherPageColumnDividerStartFromTopPt({
        pageNum: currentPage,
        headerStyleId,
        writtenPaperHeader,
      });
      headerH = otherDividerStart ?? pageHeaderHeightPt();
      const yStart = (mtPt + headerH) * scale;
      const yEnd = (pageHpt - footerTopPt) * scale;

      const pageFw = layoutData.filter(
        (l) => l.page_num === currentPage && l.span_full_width && l.img_y_top_pt != null && l.img_h_pt != null,
      );
      // Canvas: y artar aşağıya; PDF y_top → canvas y, alt = y_top - h → daha büyük canvas y
      const skipCanvas = pageFw
        .map((l) => {
          const top = ptToCanvas(0, l.img_y_top_pt!).y;
          const bot = ptToCanvas(0, l.img_y_top_pt! - l.img_h_pt!).y;
          return { lo: Math.min(top, bot), hi: Math.max(top, bot) };
        })
        .sort((a, b) => a.lo - b.lo);

      const segs: Array<{ lo: number; hi: number }> = [];
      let cur = yStart;
      for (const b of skipCanvas) {
        if (b.lo > cur + 0.5) segs.push({ lo: cur, hi: Math.min(b.lo, yEnd) });
        cur = Math.max(cur, b.hi);
      }
      if (yEnd > cur + 0.5) segs.push({ lo: cur, hi: yEnd });
      if (segs.length === 0 && skipCanvas.length === 0) segs.push({ lo: yStart, hi: yEnd });

      ctx.strokeStyle = writtenPaperHeader ? writtenStrokeRgb : dividerRgb;
      ctx.lineWidth = columnDividerWidthPt * scale;
      linePositionsPx.forEach((lineX) => {
        for (const seg of segs) {
          if (seg.hi - seg.lo < 0.5) continue;
          ctx.beginPath();
          ctx.moveTo(lineX, seg.lo);
          ctx.lineTo(lineX, seg.hi);
          ctx.stroke();
        }
      });
    }

    // Soruları çiz (veya cevap anahtarı sayfasındaysak atla)
    const pageItems = layoutData.filter((l) => l.page_num === currentPage);
    const xOffsetPt = mmToPt(numOffsetMm);
    const alignmentBand = computePageColumnBand({
      pageWpt,
      pageHpt,
      marginTopMm,
      marginBottomMm,
      marginLeftMm,
      marginRightMm,
      columns,
      columnGapMm,
      pageNum: currentPage,
      headerStyleId,
      headerConfig,
      writtenPaperHeader,
      writtenPaperTitle,
      writtenPaperFieldLines,
      writtenPaperFieldHidden,
      includeDescription,
      descriptionColumnCount,
      descriptionTexts,
      descriptionBoxPadYPt,
      descriptionBoxPadXPt,
      trialDescriptionMetaBar: false,
      headerBottomGapMm,
      otherPageHeaderBottomGapMm,
    });

    const scaleDiagRows: QuestionScaleDiagRow[] = [];
    pageItems.forEach((item) => {
      if (item.kind === "answer_key_page") return;
      const hasImg =
        item.img_x_pt != null &&
        item.img_y_top_pt != null &&
        item.img_w_pt != null &&
        item.img_h_pt != null;
      if (!hasImg) return;

      const yShiftPt = useLiveReflowLayout
        ? 0
        : liveAlignmentYShiftPtForItem(item, {
            pageNum: currentPage,
            columns,
            band: alignmentBand,
            live,
            committedHeaderBottomGapMm: headerBottomGapMm,
            committedOtherPageHeaderBottomGapMm: otherPageHeaderBottomGapMm,
          });

      const numX = item.x_pt + xOffsetPt;
      const sec = item.section;

      const dn = item.display_number;
      let imgX = questionImageLeftPt(item, numOffsetMm, numGapMm);
      if (dn != null) {
        const numLabel = questionNumberLabel(dn);
        const numFontPt = questionNumberFontPt;
        ctx.font = `bold ${numFontPt * scale}px Helvetica, Arial`;
        const numTextWPt = ctx.measureText(numLabel).width / scale;
        imgX =
          questionNumberLeftPt(item, numOffsetMm) +
          numTextWPt +
          mmToPt(numGapMm);
      }

      const imgY =
        (questionDragLiveRef?.current?.orderIndex === item.order_index
          ? questionDragLiveRef.current.imgYTopPt
          : item.img_y_top_pt!) + yShiftPt;
      const imgW = item.img_w_pt!;
      const imgH = item.img_h_pt!;

      if (sec) {
        const secBoxH = (sec.box_h ?? 22) * scale;
        const secYTopPt = item.y_top_pt + yShiftPt;
        const { x: secX, y: secY } = ptToCanvas(numX, secYTopPt);
        const secWpx = (item.w_pt ?? 250) * scale;
        ctx.fillStyle = sec.fill_color || "#FFFFFF";
        ctx.strokeStyle = sec.line_color || "#000000";
        ctx.lineWidth = 0.8 * scale;
        ctx.beginPath();
        const r = 6 * scale;
        ctx.moveTo(secX + r, secY);
        ctx.lineTo(secX + secWpx - r, secY);
        ctx.quadraticCurveTo(secX + secWpx, secY, secX + secWpx, secY + r);
        ctx.lineTo(secX + secWpx, secY + secBoxH - r);
        ctx.quadraticCurveTo(secX + secWpx, secY + secBoxH, secX + secWpx - r, secY + secBoxH);
        ctx.lineTo(secX + r, secY + secBoxH);
        ctx.quadraticCurveTo(secX, secY + secBoxH, secX, secY + secBoxH - r);
        ctx.lineTo(secX, secY + r);
        ctx.quadraticCurveTo(secX, secY, secX + r, secY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = sec.text_color || "#000000";
        ctx.font = `bold ${(sec.font_pt ?? 12) * scale}px Arial, Helvetica`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          (sec.title || "Bölüm").slice(0, 40),
          secX + secWpx / 2,
          secY + secBoxH / 2
        );
      }

      const ec = item.explanation_caption;
      if (ec) {
        const ascentApprox = ec.font_pt * 0.72;
        const hex = ec.color_hex || "#0f172a";
        const [cr, cg, cb] = hexToRgb(hex);
        const fontStack =
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
        const fw = `${ec.bold ? "bold " : ""}${ec.italic ? "italic " : ""}`;
        ctx.font = `${fw}${ec.font_pt * scale}px ${fontStack}`;
        const sl = (ec.single_line || "").trim();
        const rd = ec.rotate_deg ?? 0;
        if (sl && rd !== 0 && ec.pivot_x_pt != null && ec.pivot_y_pt != null) {
          const { x: px, y: py } = ptToCanvas(ec.pivot_x_pt + xOffsetPt, ec.pivot_y_pt);
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate((-rd * Math.PI) / 180);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = `rgb(${Math.round(cr * 255)},${Math.round(cg * 255)},${Math.round(cb * 255)})`;
          ctx.fillText(sl, 0, 0);
          ctx.restore();
        } else if (ec.lines && ec.lines.length > 0) {
          const boxHpx = ec.h_pt * scale;
          const bgXpt = (ec.box_bg_x_pt ?? ec.x_pt) + xOffsetPt;
          const bgWpt = ec.box_bg_w_pt ?? ec.w_pt;
          const bgWpx = bgWpt * scale;
          if (ec.box_enabled && ec.box_fill_hex) {
            const [br, bgc, bb] = hexToRgb(ec.box_fill_hex);
            ctx.fillStyle = `rgb(${Math.round(br * 255)},${Math.round(bgc * 255)},${Math.round(bb * 255)})`;
            const { x: rx, y: ryTop } = ptToCanvas(bgXpt, ec.y_top_pt);
            const rnd = ec.box_rounded !== false;
            const rad = rnd ? Math.min(10, boxHpx * 0.18, bgWpx * 0.06) : 0;
            ctx.beginPath();
            if (rnd && rad > 0 && typeof ctx.roundRect === "function") {
              ctx.roundRect(rx, ryTop, bgWpx, boxHpx, rad);
            } else {
              ctx.rect(rx, ryTop, bgWpx, boxHpx);
            }
            ctx.fill();
          }
          ctx.fillStyle = `rgb(${Math.round(cr * 255)},${Math.round(cg * 255)},${Math.round(cb * 255)})`;
          const n = ec.lines.length;
          const descentApprox = ec.font_pt * 0.22;
          const textHPt = (n - 1) * ec.leading_pt + ascentApprox + descentApprox;
          const excessPt = Math.max(0, ec.h_pt - textHPt);
          const yBaselinePdf = ec.y_top_pt - excessPt / 2 - ascentApprox;
          const boxWpx = ec.w_pt * scale;
          ec.lines.forEach((line: string, i: number) => {
            const baselinePdf = yBaselinePdf - i * ec.leading_pt;
            ctx.textBaseline = "alphabetic";
            if (ec.box_enabled) {
              const cxPdf = bgXpt + bgWpt / 2;
              const { x: cx, y: cy } = ptToCanvas(cxPdf, baselinePdf);
              ctx.textAlign = "center";
              ctx.fillText(line || " ", cx, cy);
            } else {
              const { x: lx, y: ly } = ptToCanvas(ec.x_pt + xOffsetPt, baselinePdf);
              let tx = lx;
              if (ec.align === "center") {
                ctx.textAlign = "center";
                tx = lx + boxWpx / 2;
              } else if (ec.align === "right") {
                ctx.textAlign = "right";
                tx = lx + boxWpx;
              } else {
                ctx.textAlign = "left";
              }
              ctx.fillText(line || " ", tx, ly);
            }
          });
          ctx.textAlign = "left";
        }
      }

      // Fasikül: Örnek rozeti kaldırıldı — görsel yerleşim imgY’den çizilir
      const drawImgTopPt = imgY;
      const { x: cx, y: cy } = ptToCanvas(imgX, drawImgTopPt);
      const imgWpx = imgW * scale;
      const imgHpx = imgH * scale;

      const imgEl = images.get(item.order_index);

      // Teşhis: final drawImage hemen önce (yerleşim değiştirilmez)
      {
        const q = useEditorStore.getState().questions.find((x) => x.order_index === item.order_index);
        const requestedScale = q
          ? resolveRequestedScale(q)
          : Number(item.scale_diag?.requestedScale ?? 1) || 1;
        const measure = getQuestionFontMeasureForDiag(item.order_index);
        const detectedFontPx =
          measure?.detectedFontPx ?? q?.detected_font_px ?? null;
        const srcW = imgEl?.naturalWidth || item.scale_diag?.sourceWidthPx || 0;
        const srcH = imgEl?.naturalHeight || item.scale_diag?.sourceHeightPx || 0;
        const metaBase =
          item.scale_diag ??
          buildLayoutScaleDiagMeta({
            sourceWpx: srcW,
            sourceHpx: srcH,
            availWPt: item.w_pt - (item.num_slot_w_pt ?? 0),
            requestedScale,
            finalDrawWPt: imgW,
            finalDrawHPt: imgH,
            growOverflowTolerance: 1,
            manualScale: q?.manualScale ?? 1,
            normalizationScale: q?.normalizationScale ?? 1,
          });
        const naturalW = metaBase.naturalWidthPt;
        const appliedScale = naturalW > 0 ? imgW / naturalW : requestedScale;
        const limitation =
          naturalW * requestedScale - imgW > 0.05 ? ("WIDTH_LIMIT" as const) : ("NONE" as const);
        const meta = {
          ...metaBase,
          requestedScale,
          appliedScale,
          limitation,
          finalDrawWidthPt: imgW,
          finalDrawHeightPt: imgH,
          manualScale: q?.manualScale ?? metaBase.manualScale ?? 1,
          normalizationScale: q?.normalizationScale ?? metaBase.normalizationScale ?? 1,
        };
        const ink = imgEl && imgEl.complete ? measureInkBoundsFromImage(imgEl, item.order_index) : null;
        const columnBounds = computeColumnImageBounds({
          columnXPt: item.x_pt + xOffsetPt,
          columnContentWidthPt: item.w_pt,
          rightPaddingPt: IMG_COL_RIGHT_PAD_PT,
          imageXPt: imgX,
          drawWidthPt: imgW,
        });
        scaleDiagRows.push(
          composeQuestionScaleDiagRow({
            questionNo: (item.display_number ?? item.order_index + 1) as number,
            meta,
            detectedFontPx,
            targetFontPx: measure?.targetFontPt ?? DEFAULT_TARGET_QUESTION_LINE_PT,
            ink,
            columnBounds,
          }),
        );
      }

      const qForFrame = useEditorStore
        .getState()
        .questions.find((x) => x.order_index === item.order_index);
      const frameSettings = normalizeFasikulQuestionFrame(qForFrame?.fasikulFrame);
      if (frameSettings.enabled) {
        drawFasikulFrameFillBehind(ctx, {
          x: cx,
          y: cy,
          w: imgWpx,
          h: imgHpx,
          frame: frameSettings,
          padPx: 0,
        });
      }

      const pad = frameSettings.enabled
        ? Math.max(0, Math.min(imgWpx / 3, imgHpx / 3, frameSettings.innerPaddingPx || 0))
        : 0;
      const drawX = cx + pad;
      const drawY = cy + pad;
      const drawW = Math.max(1, imgWpx - pad * 2);
      const drawH = Math.max(1, imgHpx - pad * 2);

      if (imgEl && imgEl.complete) {
        ctx.drawImage(imgEl, drawX, drawY, drawW, drawH);
      } else {
        ctx.fillStyle = "#f0f0f0";
        ctx.fillRect(drawX, drawY, drawW, drawH);
      }

      if (frameSettings.enabled) {
        drawFasikulFramePaperTint(ctx, {
          x: cx,
          y: cy,
          w: imgWpx,
          h: imgHpx,
          frame: frameSettings,
        });
      }

      const dnLabel = item.display_number;
      const hideNumber = fasikulFrameHidesQuestionNumber(frameSettings);
      if (dnLabel != null && questionNumberingEnabled && !hideNumber) {
        const numLabel = questionNumberLabel(dnLabel);
        const numFontPt = questionNumberFontPt;
        ctx.fillStyle = questionNumberDrawColor(questionNumberColorMode, primaryHex);
        ctx.font = `bold ${numFontPt * scale}px Helvetica, Arial`;
        ctx.textAlign = "left";
        const numLeftPx = numX * scale;
        const numBaselineOffsetPx = numFontPt * scale * 0.85;
        ctx.textBaseline = "alphabetic";
        ctx.fillText(numLabel, numLeftPx, cy + numBaselineOffsetPx);
      }

      if (drawSelectionOutline && selectedQuestions.includes(item.order_index)) {
        drawQuestionSelectionOutline(ctx, cx, cy, imgWpx, imgHpx, scale);
      }
    });

    flushQuestionScaleDiagnostics(
      scaleDiagRows,
      scaleDiagRows.map((r) => `${r.questionNo}:${r.finalDrawWidth}:${r.requestedScale}`).join("|"),
      "canvas-preview",
    );

    // Fasikül: soru altı kareli alan — sorular arası / footer boşluğuna göre
    if (showQuestionScratchGrid) {
      const midX = pageWpt / 2;
      const dragLive = questionDragLiveRef?.current;
      const liveImgYTopPt = (it: (typeof pageItems)[number]) => {
        if (
          dragLive &&
          dragLive.pageNum === currentPage &&
          dragLive.orderIndex === it.order_index
        ) {
          return dragLive.imgYTopPt;
        }
        return it.img_y_top_pt ?? 0;
      };
      pageItems.forEach((item) => {
        if (item.kind === "answer_key_page") return;
        if (
          item.img_x_pt == null ||
          item.img_y_top_pt == null ||
          item.img_w_pt == null ||
          item.img_h_pt == null
        ) {
          return;
        }
        const yShiftPt = useLiveReflowLayout
          ? 0
          : liveAlignmentYShiftPtForItem(item, {
              pageNum: currentPage,
              columns,
              band: alignmentBand,
              live,
              committedHeaderBottomGapMm: headerBottomGapMm,
              committedOtherPageHeaderBottomGapMm: otherPageHeaderBottomGapMm,
            });
        const imgYTop = liveImgYTopPt(item) + yShiftPt;
        const imgH = item.img_h_pt;
        // Görsel alt kenarı (Örnek rozeti yok)
        const currBottomPt = imgYTop - imgH;
        const isLeft = (item.img_x_pt ?? 0) < midX;
        const below = pageItems.filter((l) => {
          if (l.img_x_pt == null || l.img_y_top_pt == null || l.img_h_pt == null) return false;
          if ((l.img_x_pt ?? 0) < midX !== isLeft) return false;
          const lShift = useLiveReflowLayout
            ? 0
            : liveAlignmentYShiftPtForItem(l, {
                pageNum: currentPage,
                columns,
                band: alignmentBand,
                live,
                committedHeaderBottomGapMm: headerBottomGapMm,
                committedOtherPageHeaderBottomGapMm: otherPageHeaderBottomGapMm,
              });
          return liveImgYTopPt(l) + lShift < imgYTop;
        });
        const next = below.sort(
          (a, b) => liveImgYTopPt(b) - liveImgYTopPt(a),
        )[0];
        let gapBottomPt = footerTopPt;
        if (next) {
          const nextShift = useLiveReflowLayout
            ? 0
            : liveAlignmentYShiftPtForItem(next, {
                pageNum: currentPage,
                columns,
                band: alignmentBand,
                live,
                committedHeaderBottomGapMm: headerBottomGapMm,
                committedOtherPageHeaderBottomGapMm: otherPageHeaderBottomGapMm,
              });
          gapBottomPt = liveImgYTopPt(next) + nextShift;
        }
        const colRightPt = item.x_pt + item.w_pt;
        const questionLeftPt = questionImageLeftPt(item, numOffsetMm, numGapMm);
        const gridWidthPt = Math.max(0, colRightPt - questionLeftPt);
        const padBottomPt = SCRATCH_PAD_BOTTOM_PT;
        const grid = resolveScratchGridRectPt({
          xPt: questionLeftPt,
          widthPt: gridWidthPt,
          questionBottomPt: currBottomPt,
          gapBottomPt,
          padBottomPt,
        });
        if (!grid) return;
        const { x: leftPx, y: topPx } = ptToCanvas(grid.x, grid.yTop);
        const cellPx = grid.cellPt * scale;
        drawScratchGridOnCanvas(
          ctx,
          {
            leftPx,
            topPx,
            widthPx: grid.width * scale,
            heightPx: grid.height * scale,
            cellPx,
            cols: grid.cols,
            rows: grid.rows,
          },
          {
            lineWidthPx: SCRATCH_STROKE_WIDTH_PT * scale,
            borderWidthPx: SCRATCH_BORDER_WIDTH_PT * scale,
            radiusPx: SCRATCH_CORNER_RADIUS_PT * scale,
          },
        );
      });
    }

    // Sorular arası ve sayfa altı boşluk göstergesi: ortada, uçları oklu çizgi + mm değeri
    if (drawGapIndicators) {
    const midX = pageWpt / 2;
    const arrowSize = 5 * scale;
    const drawGapLine = (
      lineXpt: number,
      yTopPt: number,
      yBottomPt: number,
      label: string,
      extendToSelectionBorder?: boolean,
    ) => {
      void label;
      const gapPt = yTopPt - yBottomPt;
      if (gapPt <= 0) return;
      const gapMm = Math.round(gapPt * PT_TO_MM * 10) / 10;
      const endpoints = extendToSelectionBorder
        ? questionSelectionGapEndpointsPt(scale, yTopPt, yBottomPt)
        : { visualTopPt: yTopPt, visualBottomPt: yBottomPt };
      const lineXpx = lineXpt * scale;
      const { y: yCurrBottom } = ptToCanvas(lineXpt, endpoints.visualBottomPt);
      const { y: yNextTop } = ptToCanvas(lineXpt, endpoints.visualTopPt);
      const lineHalf = (1.2 * scale) / 2;
      ctx.strokeStyle = "#ef4444";
      ctx.fillStyle = "#ef4444";
      ctx.lineWidth = 1.2 * scale;
      ctx.beginPath();
      ctx.moveTo(lineXpx, yCurrBottom - lineHalf);
      ctx.lineTo(lineXpx, yNextTop + lineHalf);
      ctx.stroke();
      const drawArrow = (tipX: number, tipY: number, pointingUp: boolean) => {
        const dx = arrowSize * 0.55;
        const dy = arrowSize * (pointingUp ? 1 : -1);
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - dx, tipY + dy);
        ctx.lineTo(tipX + dx, tipY + dy);
        ctx.closePath();
        ctx.fill();
      };
      drawArrow(lineXpx, yCurrBottom, false);
      drawArrow(lineXpx, yNextTop, true);
      ctx.fillStyle = "#dc2626";
      ctx.font = `bold ${9 * scale}px Helvetica, Arial`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const txtY = (yCurrBottom + yNextTop) / 2;
      ctx.fillText(`${gapMm} mm`, lineXpx + arrowSize + 4, txtY);
    };

    pageItems.forEach((item) => {
      if (item.kind === "answer_key_page") return;
      const hasImg =
        item.img_x_pt != null &&
        item.img_y_top_pt != null &&
        item.img_w_pt != null &&
        item.img_h_pt != null;
      if (!hasImg) return;
      const colCenter = (item.x_pt ?? 0) + xOffsetPt + (item.w_pt ?? 0) / 2;
      const currBottomPt = (item.img_y_top_pt ?? 0) - (item.img_h_pt ?? 0);
      const isLeft = (item.img_x_pt ?? 0) < midX;
      const below = pageItems.filter(
        (l) =>
          l.img_x_pt != null &&
          l.img_y_top_pt != null &&
          (l.img_x_pt ?? 0) < midX === isLeft &&
          (l.img_y_top_pt ?? 0) < (item.img_y_top_pt ?? 0)
      );
      const next = below.sort((a, b) => (b.img_y_top_pt ?? 0) - (a.img_y_top_pt ?? 0))[0];
      const yBottomPt = next?.img_y_top_pt ?? footerTopPt;
      const gapPt = currBottomPt - yBottomPt;
      if (gapPt > 0) {
        const touchesSelection =
          selectedQuestions.includes(item.order_index) ||
          (next != null && selectedQuestions.includes(next.order_index));
        if (next?.img_y_top_pt != null) {
          drawGapLine(colCenter, currBottomPt, next.img_y_top_pt, "gap", touchesSelection);
        } else {
          drawGapLine(colCenter, currBottomPt, footerTopPt, "footer", touchesSelection);
        }
      }
    });
    }

    // Yazılı: öğretmen / imza bloğu yalnızca EN SON sorunun sayfasında, sağ sütunun altında (her sayfada değil)
    if (
      !isExtraSheetPage &&
      writtenPaperHeader &&
      writtenPaperShowTeachers &&
      writtenPaperTeachers.length > 0 &&
      pageItems.length > 0 &&
      currentPage === maxQuestionPage
    ) {
      const colGapPt = mmToPt(columnGapMm);
      const colWPt = (contentW - (columns - 1) * colGapPt) / Math.max(1, columns);
      const x0 = mlPt + (columns - 1) * (colWPt + colGapPt);
      const blockW = Math.max(40, colWPt - 12);
      const innerL = x0 + 4;
      const innerR = x0 + blockW - 4;
      const midSplit = innerL + (innerR - innerL) * 0.42;
      const sigL = midSplit + 6;
      const sigR = innerR - 1;
      const yBottomLimit = footerTopPt + 25;
      const validTeachers = writtenPaperTeachers.filter((t) => t != null);
      if (validTeachers.length > 0) {
        const rowHs = validTeachers.map((t) => ((t.title || "").trim() ? 20 : 14));
        let extra = 0;
        for (let i = 1; i < rowHs.length; i += 1) {
          extra += rowHs[i] + 5;
        }
        const yLastName = yBottomLimit + 14;
        const yFirstTeacher = yLastName + extra;
        let yPdf = yFirstTeacher + 35;
        const yCv = (py: number) => (pageHpt - py) * scale;

        ctx.fillStyle = "#000000";
        ctx.textBaseline = "alphabetic";

        ctx.font = `bold ${11 * scale}px Helvetica, Arial`;
        ctx.textAlign = "center";
        ctx.fillText("BAŞARILAR", ((innerL + innerR) / 2) * scale, yCv(yPdf));
        yPdf -= 18;

        ctx.font = `bold ${7 * scale}px Helvetica, Arial`;
        ctx.textAlign = "center";
        const nameHdrCx = ((innerL + midSplit) / 2) * scale;
        const sigHdrCx = ((sigL + sigR) / 2) * scale;
        ctx.fillText("ADI SOYADI", nameHdrCx, yCv(yPdf));
        ctx.fillText("İMZA", sigHdrCx, yCv(yPdf));

        ctx.strokeStyle = writtenStrokeRgb;
        ctx.lineWidth = writtenRuleLw;
        const headerLineY = yPdf - 5;
        ctx.beginPath();
        ctx.moveTo(innerL * scale, yCv(headerLineY));
        ctx.lineTo(innerR * scale, yCv(headerLineY));
        ctx.stroke();
        yPdf = headerLineY - 12;

        for (let ti = 0; ti < validTeachers.length; ti += 1) {
          const t = validTeachers[ti];
          const name = (t.name || "").trim();
          const title = (t.title || "").trim();
          const rowH = rowHs[ti];

          ctx.font = `bold ${7 * scale}px Helvetica, Arial`;
          ctx.fillStyle = "#000000";
          ctx.textAlign = "left";
          ctx.fillText((name || "—").slice(0, 32), innerL * scale, yCv(yPdf));

          // PDF ile aynı: imza çizgisi metin altına (branş varsa branşın altına) hizalı — ReportLab descent pt
          const DESC_NAME_PT = 1.45;
          const DESC_TITLE_PT = 1.24;
          let lineY: number;
          if (title) {
            ctx.font = `${6 * scale}px Helvetica, Arial`;
            ctx.fillStyle = "rgb(89, 89, 89)";
            ctx.fillText(title.slice(0, 38), innerL * scale, yCv(yPdf - 8));
            ctx.fillStyle = "#000000";
            lineY = yPdf - 8 - DESC_TITLE_PT;
          } else {
            lineY = yPdf - DESC_NAME_PT;
          }

          ctx.strokeStyle = writtenStrokeRgb;
          ctx.lineWidth = writtenRuleLw;
          ctx.beginPath();
          ctx.moveTo(sigL * scale, yCv(lineY));
          ctx.lineTo(sigR * scale, yCv(lineY));
          ctx.stroke();

          yPdf -= rowH + 5;
        }
      }
    }

    // Çizgi üzerine yazı (sütun ayırıcıların ortasında, dikey)
    if (
      dividerActive &&
      showColumnDividerText &&
      dividerText &&
      !writtenPaperHeader
    ) {
      const colGapPt = mmToPt(columnGapMm);
      const colWPt = (contentW - (columns - 1) * colGapPt) / columns;
      const linePositionsPx = Array.from({ length: columns - 1 }, (_, i) =>
        (mlPt + (i + 1) * colWPt + (i + 0.5) * colGapPt) * scale
      );
      let headerHPt: number;
      const otherDividerStart = otherPageColumnDividerStartFromTopPt({
        pageNum: currentPage,
        headerStyleId,
        writtenPaperHeader,
      });
      headerHPt = otherDividerStart ?? pageHeaderHeightPt();
      const yStart = (mtPt + headerHPt) * scale;
      const yEnd = (pageHpt - footerTopPt) * scale;
      const cy = (yStart + yEnd) / 2;
      const txt = dividerText;
      const fs = 9 * scale;
      const fontPrefix = [
        centerLineItalic ? "italic" : "",
        centerLineBold ? "bold" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const fontCss = fontPrefix ? `${fontPrefix} ${fs}px Arial, Helvetica` : `${fs}px Arial, Helvetica`;
      const rot =
        centerLineTextDirection === "down" ? Math.PI / 2 : -Math.PI / 2;
      linePositionsPx.forEach((lineX) => {
        ctx.save();
        ctx.font = fontCss;
        const m = ctx.measureText(txt);
        const pad = 2 * scale;
        const boxW =
          m.actualBoundingBoxLeft != null && m.actualBoundingBoxRight != null
            ? m.actualBoundingBoxRight - m.actualBoundingBoxLeft
            : m.width;
        const boxH =
          m.actualBoundingBoxAscent != null && m.actualBoundingBoxDescent != null
            ? m.actualBoundingBoxAscent + m.actualBoundingBoxDescent
            : fs * 1.1;
        ctx.translate(lineX, cy);
        ctx.rotate(rot);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-boxW / 2 - pad, -boxH / 2 - pad, boxW + 2 * pad, boxH + 2 * pad);
        ctx.fillStyle = dividerRgb;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(txt, 0, 0);
        ctx.restore();
      });
    }

    // Optik form — satırları hazırla (cevap anahtarından sonra çizilir, üstüne binmesin)
    const maxAnswerKeyWidthPx = (layoutData[0]?.w_pt ?? (pageWpt - mlPt - mrPt) / columns) * scale;
    const optikRows = optikRowsEarly;
    const optikActiveOptions = optikActiveOptionsEarly;

    const drawOptikFormLayer = () => {
      if (!optikFormEnabled || optikRows.length === 0) return;

      if (isOptikFormOnlyPage) {
        const contentTopCanvasY = mtPt * scale;
        const contentHeightPx = (pageHpt - mtPt - footerTopPt) * scale;
        drawOptikFormFullPageCanvas({
          ctx,
          x: ml,
          y: contentTopCanvasY,
          width: pageWpx - ml - mr,
          height: contentHeightPx,
          scale,
          rows: optikRows,
          activeOptions: optikActiveOptions,
          testTitle,
          schoolName,
          instructionText: optikFormInstructionText,
          instructionEnabled: optikFormInstructionEnabled,
          bookletType: optikFormBookletType,
          netRule: optikFormNetRule,
          showAnswers: false,
        });
        return;
      }

      if (
        optikFormPlacement === "end_of_test" &&
        endOfTestOptikFits &&
        currentPage === maxQuestionPage &&
        !isExtraSheetPage
      ) {
        const placed = resolveCompactOptikFormPlacement({
          layout: layoutData,
          pageWpt,
          pageHpt,
          marginTopMm,
          marginBottomMm,
          marginLeftMm,
          marginRightMm,
          columns,
          columnGapMm,
          rowCount: optikRows.length,
          bookletType: optikFormBookletType,
          optionCount: optikActiveOptions.length,
          reservedAboveFooterPt: endOfTestOptikReservedAboveFooterPt,
          offsetYPt: optikFormOffsetYPt,
          headerStyleId,
          headerConfig,
          headerBottomGapMm,
          otherPageHeaderBottomGapMm,
          writtenPaperHeader,
        });
        if (!placed) return;

        drawOptikFormCompactCanvas({
          ctx,
          x: placed.xPt * scale,
          y: (pageHpt - placed.yTopPt) * scale,
          width: placed.wPt * scale,
          scale,
          rows: optikRows,
          activeOptions: optikActiveOptions,
          testTitle,
          schoolName,
          showAnswers: false,
          netRule: optikFormNetRule,
          bookletType: optikFormBookletType,
        });
      }
    };

    // Footer - end_of_test: sadece testin son sayfasında (en son sorunun peşinde)
    // separate_page: cevap anahtarı sayfasında
    // Cevap anahtarı genişliği en fazla bir sorun genişliği kadar
    if (includeAnswerKey && (answerKeyMode === "end_of_test" || isAnswerKeyOnlyPage) && answerKeyItems.length > 0) {
      if (isAnswerKeyOnlyPage) {
        const contentWPx = pageWpx - ml - mr;
        const contentTopPt = pageHpt - mtPt - SEPARATE_AK.TOP_GAP_PT;
        const availableHPt = Math.max(
          0,
          contentTopPt - (footerTopPt + mmToPt(2)),
        );
        const { capacity } = separateAnswerKeyCapacity({
          availableHeightPt: availableHPt,
          pairsPerRow: SEPARATE_AK.PAIRS_PER_ROW,
        });
        const entriesPerPage = Math.max(SEPARATE_AK.PAIRS_PER_ROW, capacity);
        const pageIdx = currentPage - maxQuestionPage - optikSeparatePageCount - 1;
        const startIdx = pageIdx * entriesPerPage;
        const chunk = answerKeyItems.slice(startIdx, startIdx + entriesPerPage);
        if (chunk.length > 0) {
          const tableYTopCanvas = (pageHpt - contentTopPt) * scale;
          drawSeparateAnswerKeyTableCanvas({
            ctx,
            x: ml,
            y: tableYTopCanvas,
            width: contentWPx,
            scale,
            items: chunk,
            title: "Cevap Anahtarı",
            pairsPerRow: SEPARATE_AK.PAIRS_PER_ROW,
          });
        }
      } else if (answerKeyMode === "end_of_test" && currentPage === maxQuestionPage) {
        const contentW = pageWpt - mlPt - mrPt;
        const colGapPt = mmToPt(8);
        const colWPt = columns > 1
          ? (contentW - (columns - 1) * colGapPt) / columns
          : contentW;
        const rightColX = columns > 1
          ? mlPt + (columns - 1) * (colWPt + colGapPt)
          : mlPt;
        const layoutForTable = computeAnswerKeyLayout({
          items: answerKeyItems,
          totalWidthPx: maxAnswerKeyWidthPx,
          columnCount: 2,
          scale,
        });
        const tableBottomY = (pageHpt - footerTopPt) * scale - 8 * scale;
        const tableYTopCanvas = tableBottomY - layoutForTable.tableHeightPx;
        drawAnswerKeyTable(rightColX * scale, tableYTopCanvas, maxAnswerKeyWidthPx, answerKeyItems, 2, "Cevap Anahtarı");
      }
    }

    drawOptikFormLayer();

    const footerTopPx = (pageHpt - footerTopPt) * scale;
    const footerBottomPx = (pageHpt - footerBottomPt) * scale;

    const showFooterAnswers = includeAnswerKey && answerKeyMode === "per_page" && pageItems.length > 0;
    const footerAnswerByCol: string[] = (() => {
      if (!showFooterAnswers) return [];
      const cols = Math.max(1, alignmentBand.columnXPt.length);
      const buckets: string[][] = Array.from({ length: cols }, () => []);
      pageItems
        .filter((i) => i.display_number != null)
        .sort((a, b) => (a.display_number as number) - (b.display_number as number))
        .forEach((i) => {
          const col = columnIndexFromQuestionXPt(i.x_pt, alignmentBand);
          buckets[col]?.push(`${i.display_number}- ${i.answer_key || "?"}`);
        });
      return buckets.map((parts) => parts.join("  "));
    })();

    const drawFooterColumnAnswers = (y: number, baseline: CanvasTextBaseline) => {
      if (!showFooterAnswers) return;
      const cols = footerAnswerByCol.length;
      const fontSize = 9 * scale;
      ctx.font = `bold ${fontSize}px Arial, Helvetica`;
      ctx.fillStyle = writtenPaperHeader
        ? writtenStrokeRgb
        : `rgb(${Math.round(hexToRgb(ANSWER_KEY_NAVY_HEX)[0] * 255)}, ${Math.round(hexToRgb(ANSWER_KEY_NAVY_HEX)[1] * 255)}, ${Math.round(hexToRgb(ANSWER_KEY_NAVY_HEX)[2] * 255)})`;
      ctx.textBaseline = baseline;
      for (let col = 0; col < cols; col++) {
        let ans = footerAnswerByCol[col] ?? "";
        if (!ans) continue;
        const colLeft = alignmentBand.columnXPt[col]! * scale;
        const colRight = (alignmentBand.columnXPt[col]! + alignmentBand.colWidthPt) * scale;
        const maxW = Math.max(8 * scale, alignmentBand.colWidthPt * scale);
        while (ans.length > 0 && ctx.measureText(ans).width > maxW) {
          ans = ans.slice(0, -1);
        }
        if (ans.length < (footerAnswerByCol[col]?.length ?? 0) && ans.length > 0) {
          ans = `${ans.slice(0, -1)}…`;
        }
        if (!ans) continue;
        if (cols === 1 || col === 0) {
          ctx.textAlign = "left";
          ctx.fillText(ans, colLeft, y);
        } else if (col === cols - 1) {
          ctx.textAlign = "right";
          ctx.fillText(ans, colRight, y);
        } else {
          ctx.textAlign = "center";
          ctx.fillText(ans, (colLeft + colRight) / 2, y);
        }
      }
    };

    if (writtenPaperHeader) {
      ctx.strokeStyle = writtenStrokeRgb;
      ctx.lineWidth = writtenRuleLw;
      ctx.beginPath();
      ctx.moveTo(ml, footerTopPx);
      ctx.lineTo(pageWpx - mr, footerTopPx);
      ctx.stroke();
      drawFooterColumnAnswers(footerTopPx - 3 * scale, "bottom");
    } else if (!isCorporateHeader(headerStyleId)) {
      ctx.strokeStyle = themeRgb;
      ctx.lineWidth = CLASSIC_BANNER_LINE_PT * scale;
      ctx.beginPath();
      ctx.moveTo(ml, footerTopPx);
      ctx.lineTo(pageWpx - mr, footerTopPx);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ml, footerBottomPx);
      ctx.lineTo(pageWpx - mr, footerBottomPx);
      ctx.stroke();
    } else {
      drawFooterDecorativeStripesCanvas({
        ctx,
        ml,
        mr,
        pageWpx,
        footerTopPx,
        footerBottomPx,
        scale,
        styleId: headerStyleId,
        primaryColor: headerConfig.primaryColor ?? "#0A1931",
        accentColor: resolveThemeAccentHex(headerConfig.accentColor),
      });
    }

    if (!writtenPaperHeader) {
      const yMid = (footerTopPx + footerBottomPx) / 2;
      const circleR =
        footerPageNumberCircleRadiusPt(footerTopPt, footerBottomPt, headerStyleId) * scale;
      const cx = (ml + pageWpx - mr) / 2;

      drawFooterColumnAnswers(yMid, "middle");

      const pg = pageNumberingEnabled
        ? formatPageNumberLabel(currentPage, maxQuestionPage, pageNumberStart, pageNumberFormat)
        : "";
      const chord = circleR * 2 * 0.72;
      let fs = 10 * scale;
      const fitsInCircle = (size: number) => {
        ctx.font = `bold ${size}px Arial, Helvetica`;
        const m = ctx.measureText(pg);
        const w = m.width;
        const asc = m.actualBoundingBoxAscent ?? size * 0.72;
        const desc = m.actualBoundingBoxDescent ?? size * 0.22;
        const h = asc + desc;
        return w <= chord && h <= chord;
      };
      while (fs >= 5 * scale && !fitsInCircle(fs)) fs -= 0.5 * scale;

      if (pageNumberingEnabled && pg) {
        ctx.beginPath();
        ctx.fillStyle = primaryRgb;
        ctx.strokeStyle = primaryRgb;
        ctx.lineWidth = 0.8 * scale;
        ctx.arc(cx, yMid, circleR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${fs}px Arial, Helvetica`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(pg, cx, yMid);
      }

      // Deneme: ara sayfalar → Diğer sayfaya geçiniz. | son soru sayfası → TEST BİTTİ.
      // Test modülünde bu yazılar yok.
      if (
        lastQuestionPage != null &&
        lastQuestionPage > 0 &&
        currentPage >= 1 &&
        currentPage <= lastQuestionPage &&
        !isExtraSheetPage
      ) {
        const rightX = pageWpx - mr;
        const endFont = Math.min(8.5 * scale, Math.max(6 * scale, (footerBottomPx - footerTopPx) * 0.28));
        ctx.fillStyle = "#111827";
        ctx.font = `italic ${endFont}px Arial, Helvetica`;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        if (currentPage === lastQuestionPage) {
          const gap = endFont * 0.35;
          ctx.fillText("TEST BİTTİ.", rightX, yMid - endFont * 0.55 - gap / 2);
          ctx.fillText("CEVAPLARINIZI KONTROL EDİNİZ.", rightX, yMid + endFont * 0.55 + gap / 2);
        } else {
          ctx.fillText("Diğer sayfaya geçiniz.", rightX, yMid);
        }
        ctx.textAlign = "left";
      }
    }

    // Filigran - tüm içeriğin üstünde
    const wmActive = showWatermark || watermarkEnabled;
    if (wmActive) {
      const w = watermarkSettings;
      const logoSrc = watermarkLogoUrl || w?.imageBase64;
      const text = (watermarkText || w?.text || "").trim();
      const opacityPct = showWatermark ? watermarkOpacity : (w?.textOpacityPct ?? 20);
      const sizePct = showWatermark ? watermarkSize : (w?.textSizePct ?? 90);
      const angleDeg = showWatermark
        ? resolveWatermarkAngleDeg(watermarkLayout, watermarkAngleDeg)
        : (w?.textAngleDeg ?? 45);

      if (logoSrc && watermarkImage?.complete) {
        const alpha = Math.max(0.01, Math.min(1, opacityPct / 100));
        const sizeFactor = Math.max(0.1, Math.min(1, sizePct / 100));
        const targetW = pageWpx * 0.7 * sizeFactor;
        const targetH = (watermarkImage.height / watermarkImage.width) * targetW;
        const x = (pageWpx - targetW) / 2;
        const y = (pageHpx - targetH) / 2;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.drawImage(watermarkImage, x, y, targetW, targetH);
        ctx.restore();
      } else if (text) {
        const alpha = Math.max(0.01, Math.min(1, opacityPct / 100));
        const sizeFactor = Math.max(0.1, Math.min(1, sizePct / 100));
        const base = Math.min(pageWpx, pageHpx) * 0.12;
        const fontSz = Math.max(10, base * sizeFactor);
        const ang = showWatermark
          ? watermarkCanvasRotateRad(watermarkLayout, watermarkAngleDeg)
          : (-angleDeg * Math.PI) / 180;
        const col = themeColor || "#1E88E5";
        const [r, g, b] = hexToRgbParts(col);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(pageWpx / 2, pageHpx / 2);
        ctx.rotate(ang);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.font = `bold ${fontSz}px Helvetica, Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text.slice(0, 80), 0, 0);
        ctx.restore();
      }
    }

    if (showPageFrame) {
      const expandPt = pageFrameExpandGapPt(showPageFrame, pageFrameInnerGapMm, mmToPt);
      const frame = pageFrameRectCanvasPt(
        pageWpt,
        pageHpt,
        mlPt,
        mrPt,
        mtPt,
        mbPt,
        expandPt
      );
      const x = frame.x * scale;
      const y = frame.y * scale;
      const w = frame.w * scale;
      const h = frame.h * scale;
      if (w > 0 && h > 0) {
        const frameColor = resolvePageFrameColor(
          parsePageFrameColorMode(pageFrameColorMode),
          pageFrameColor,
          primaryHex
        );
        const [fr, fg, fb] = hexToRgbParts(frameColor);
        const lineStyle = parsePageFrameLineStyle(pageFrameLineStyle);
        const cornerR = effectivePageFrameCornerRadiusPt(
          pageFrameCornerRadiusMm,
          frame.w,
          frame.h,
          mmToPt
        ) * scale;
        ctx.strokeStyle = `rgb(${fr},${fg},${fb})`;
        ctx.lineWidth = pageFrameWidthPt * scale;
        const dash = canvasPageFrameDash(lineStyle, scale);
        if (dash.length) ctx.setLineDash(dash);
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, cornerR);
        ctx.stroke();
        if (dash.length) ctx.setLineDash([]);
      }
    }
    const visCtx = visibleCanvas.getContext("2d");
    if (visCtx) {
      visCtx.setTransform(1, 0, 0, 1, 0, 0);
      visCtx.clearRect(0, 0, visibleCanvas.width, visibleCanvas.height);
      visCtx.imageSmoothingEnabled = true;
      visCtx.imageSmoothingQuality = "high";
      visCtx.drawImage(offscreen, 0, 0);
      visCtx.setTransform(bufferScale, 0, 0, bufferScale, 0, 0);
    }
    } catch (err) {
      console.error("CanvasPdfPreview draw error:", err);
    }
  }, [
    layout,
    currentPage,
    scale,
    pageWpt,
    pageHpt,
    pageWpx,
    pageHpx,
    sharpness,
    marginTopMm,
    marginBottomMm,
    marginLeftMm,
    marginRightMm,
    columnGapMm,
    themeColor,
    testTitle,
    schoolName,
    includeAnswerKey,
    answerKeyMode,
    optikFormEnabled,
    optikFormPlacement,
    optikFormQuestions,
    optikFormOptionCount,
    optikFormBookletType,
    optikFormInstructionEnabled,
    optikFormInstructionText,
    optikFormNetRule,
    optikFormOffsetYPt,
    answerKeyPageCount,
    columns,
    headerStyleId,
    headerConfig,
    addTextOnLine,
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
    includeDescription,
    descriptionColumnCount,
    descriptionTexts,
    descriptionBoxPadYPt,
    descriptionBoxPadXPt,
    descriptionColumnDividers,
    trialDescriptionMeta,
    images,
    selectedQuestions,
    drawSelectionOutline,
    drawGapIndicators,
    showQuestionScratchGrid,
    ptToCanvas,
    watermarkEnabled,
    watermarkSettings,
    watermarkImage,
    logoImage,
    writtenPaperHeader,
    writtenPaperTitle,
    writtenPaperFieldLines,
    writtenFieldLabelsSig,
    writtenPaperFieldHidden,
    writtenPaperBookletLetter,
    writtenPaperShowTeachers,
    writtenPaperTeachers,
    lastQuestionPage,
    questionNumberLeftOffsetMm,
    questionNumberImageGapMm,
    questionNumberingEnabled,
    questionNumberColorMode,
    questionNumberFontPt,
    pageNumberingEnabled,
    pageNumberStart,
    pageNumberFormat,
    otherPageHeaderBottomGapMm,
    headerBottomGapMm,
    layoutLiveRef,
    alignmentPreviewLiveRef,
  ]);

  const drawRef = useRef(draw);
  drawRef.current = draw;

  useLayoutEffect(() => {
    drawRef.current();
  }, [draw]);

  useEffect(() => {
    if (!onRegisterRedraw) return;
    return onRegisterRedraw(() => {
      drawRef.current();
    });
  }, [onRegisterRedraw]);

  // Canvas boyutları — draw değişiminde width/height sıfırlanmasın (slider yanıp sönmesini önler)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const bufferScale = dpr * sharpness;
    canvas.width = Math.max(1, Math.round(pageWpx * bufferScale));
    canvas.height = Math.max(1, Math.round(pageHpx * bufferScale));
    canvas.style.width = `${pageWpx}px`;
    canvas.style.height = `${pageHpx}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(bufferScale, 0, 0, bufferScale, 0, 0);
    drawRef.current();
  }, [pageWpx, pageHpx, sharpness]);

  // Tıklama ile soru seçimi
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    const layoutData =
      layoutLiveRef?.current && layoutLiveRef.current.length > 0
        ? layoutLiveRef.current
        : layout;
    const live = alignmentPreviewLiveRef?.current;
    const useLiveReflowLayout = Boolean(
      layoutLiveRef?.current && layoutLiveRef.current.length > 0,
    );
    const numOffsetMm = live?.leftOffsetMm ?? questionNumberLeftOffsetMm;
    const numGapMm = live?.imageGapMm ?? questionNumberImageGapMm;
    const alignmentBand = computePageColumnBand({
      pageWpt,
      pageHpt,
      marginTopMm,
      marginBottomMm,
      marginLeftMm,
      marginRightMm,
      columns,
      columnGapMm,
      pageNum: currentPage,
      headerStyleId,
      headerConfig,
      writtenPaperHeader,
      writtenPaperTitle,
      writtenPaperFieldLines,
      writtenPaperFieldHidden,
      includeDescription,
      descriptionColumnCount,
      descriptionTexts,
      descriptionBoxPadYPt,
      descriptionBoxPadXPt,
      trialDescriptionMetaBar: false,
      headerBottomGapMm,
      otherPageHeaderBottomGapMm,
    });
    const pageItems = layoutData.filter((l) => l.page_num === currentPage);
    for (let i = pageItems.length - 1; i >= 0; i--) {
      const item = pageItems[i];
      const hasImg =
        item.img_x_pt != null &&
        item.img_y_top_pt != null &&
        item.img_w_pt != null &&
        item.img_h_pt != null;
      if (!hasImg) continue;

      const yShiftPt = useLiveReflowLayout
        ? 0
        : liveAlignmentYShiftPtForItem(item, {
            pageNum: currentPage,
            columns,
            band: alignmentBand,
            live,
            committedHeaderBottomGapMm: headerBottomGapMm,
            committedOtherPageHeaderBottomGapMm: otherPageHeaderBottomGapMm,
          });

      const imgY =
        (questionDragLiveRef?.current?.orderIndex === item.order_index
          ? questionDragLiveRef.current.imgYTopPt
          : item.img_y_top_pt!) + yShiftPt;
      const { x, y } = ptToCanvas(
        questionImageLeftPt(item, numOffsetMm, numGapMm),
        imgY
      );
      const w = item.img_w_pt! * scale;
      const h = item.img_h_pt! * scale;

      if (relX >= x && relX <= x + w && relY >= y && relY <= y + h) {
        onQuestionSelect(item.order_index, {
          additive: e.metaKey || e.ctrlKey,
          range: e.shiftKey,
        });
        return;
      }
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <canvas
        ref={canvasRef}
        className={`block bg-white shadow-lg ${canvasFrameClassName ?? "rounded-lg border border-slate-200"} ${interactive ? "cursor-pointer" : ""}`}
        style={interactive ? {} : { pointerEvents: "none" }}
        onClick={interactive ? handleClick : undefined}
      />
    </div>
  );
}
