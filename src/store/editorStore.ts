import { create } from "zustand";
import type {
  ExplanationCaptionAlign,
  ExplanationCaptionPlacement,
  ExplanationCaptionSideFlow,
  ExplanationCaptionBoxCorner,
  ExplanationCaptionBoxWidth,
  QuestionContentType,
  QuestionItem,
  QuestionImageTextOverlay,
  CropBox,
  FontReferenceV1,
  QuestionCaptureMeta,
  SectionRange,
  FasikulQuestionFrameSettings,
} from "../types";
import { normalizeFasikulQuestionFrame, applyFasikulPreset, DEFAULT_FASIKUL_QUESTION_FRAME, type FasikulFramePresetId } from "../utils/fasikulQuestionFrame";
import {
  clampScratchCornerRadiusPt,
  normalizeScratchGridColorHex,
  normalizeScratchGridColorMode,
  SCRATCH_COLOR_CUSTOM_DEFAULT,
  SCRATCH_COLOR_MODE_DEFAULT,
  SCRATCH_CORNER_RADIUS_DEFAULT_PT,
  FASIKUL_EMPTY_BOX_ROWS,
  type ScratchGridColorMode,
} from "../utils/questionScratchGrid";
import { clearQuestionFontMeasureForDiag } from "../utils/questionScaleDiagnostics";
import {
  manualScaleForRequestedProduct,
  nextFontMeasurementRevision,
  resetFontNormalizationFields,
  syncDisplayScaleProduct,
} from "../utils/questionScale";
import {
  LEGACY_LAYOUT_ZOOM,
  nativeSizePtFromCapture,
} from "../utils/questionCapture";
import {
  clampFontEqualizeScale,
  estimateCanonicalFontHeightFromRgba,
  loadImageDataFromBase64,
} from "../utils/morphologyFontHeight";
import { isRectContained } from "../utils/cropCoordUtils";
import { compositeImageWithTextOverlays } from "../utils/compositeQuestionImage";
import { api } from "../api/client";
import {
  getStoredPendingSelections,
  setStoredPendingSelections,
} from "./cropLocalStore";
import {
  emptyWrittenHeaderFieldHidden,
  emptyWrittenHeaderFieldLabels,
  emptyWrittenHeaderFieldLines,
  type WrittenHeaderFieldKey,
  type WrittenHeaderFieldHidden,
  type WrittenHeaderFieldLabels,
  type WrittenHeaderFieldLines,
} from "../constants/writtenHeaderFields";
import {
  defaultHeaderConfig,
  type HeaderConfig,
  type HeaderTemplate,
} from "../utils/corporateHeaderLayout";
import { normalizeHeaderStyleId } from "../utils/headerStyleIds";
import {
  applyModuleLayout,
  captureModuleLayout,
  defaultFasikulModuleLayout,
  defaultLayoutForModule,
  defaultTestModuleLayout,
  defaultTrialModuleLayout,
  ensureModuleLayouts,
  pageDecorStorePatch,
  paperLayoutModuleFromTab,
  type ModuleLayoutSnapshot,
  type PaperLayoutModule,
} from "../utils/moduleLayoutSnapshots";
import { buildFasikulThemeDefaults, buildTestThemeDefaults } from "../utils/testThemeDefaults";
import {
  HEADER_INFO_KEYS,
  patchHeaderInfo,
  pickHeaderInfoSettings,
  switchHeaderInfoTheme,
} from "../utils/headerInfoByStyle";
import {
  resolveWatermarkAngleDeg,
  stripDataUrlPrefix,
} from "../utils/visualProperties";
import {
  DEFAULT_OPTIK_INSTRUCTION,
  type OptikFormBookletType,
  type OptikFormNetRule,
  type OptikFormOptionCount,
} from "../utils/optikFormSettings";
import {
  applyOpticalFormSettings,
  type OpticalFormSettings,
} from "../utils/opticalFormSettings";

/** Draft hydrate / soft-compat — equalization feature removed */
const DEFAULT_TARGET_QUESTION_LINE_PT = 10;
function clampTargetQuestionLinePt(pt: number): number {
  if (!Number.isFinite(pt)) return DEFAULT_TARGET_QUESTION_LINE_PT;
  return Math.min(12, Math.max(8, Math.round(pt)));
}

export type SidebarTab = "written-paper" | "test-paper" | "trial-exam" | "fasikul-paper" | "settings";
export type AnswerOption = "A" | "B" | "C" | "D" | "E";

type OptionFlags = {
  includeDescription: boolean;
  addSpacingBetweenQuestions: boolean;
  includeAnswerKey: boolean;
  addTextOnLine: boolean;
};

export type WrittenPaperOptions = {
  addTeacherName: boolean;
};

/** Öğretmen adı ve unvanı - PDF sonunda imza satırı ile */
export type TeacherNameEntry = {
  name: string;
  title: string;
};

type ModalKey = "pdf-bank" | "question-editor" | "add-image" | "save-draft" | "load-draft" | "pick-draft-questions" | "google-drive";

/** Yaprak Test export options (original desktop Test Kağıdı parity) */
export type AnswerKeyMode = "per_page" | "separate_page" | "end_of_test";
export type WatermarkLayout = "diagonal" | "horizontal" | "vertical";

type EditorState = {
  activeTab: SidebarTab;
  /** Ayarlar sekmesinden önceki sekme - Tamam'a basınca buraya dönülür */
  tabBeforeSettings: SidebarTab | null;
  testName: string;
  schoolName: string;
  /** Deneme: yönerge üstü sınav kodu */
  trialExamCode: string;
  /** Deneme: yönerge üstü kitapçık etiketi (örn. A KİTAPÇIĞI) */
  trialBookletLabel: string;
  /** Deneme: sınav kodu yazı boyutu (pt) */
  trialExamCodeFontPt: number;
  /** Deneme: sınav kodu rengi (hex, boşsa tema) */
  trialExamCodeColor: string;
  /** Deneme: sınav kodu yatay hizalama */
  trialExamCodeAlign: "left" | "center" | "right";
  /** Deneme: sınav kodu sol iç boşluk (pt) */
  trialExamCodePadLeftPt: number;
  /** Deneme: kitapçık yazı boyutu (pt) */
  trialBookletFontPt: number;
  /** Deneme: kitapçık rengi (hex, boşsa tema) */
  trialBookletColor: string;
  /** Deneme: test adı kutusu arka plan opaklığı (0–100) */
  trialTestNameBgOpacityPct: number;
  /** Deneme: test adı kutusu arka plan rengi (varsayılan lacivert) */
  trialTestNameBgColor: string;
  /** Deneme: kurum adı (test/yazılı brandName’den bağımsız) */
  trialBrandName: string;
  /** Deneme: kurum adı diğer sayfa başlığında görünsün mü */
  trialBrandNameVisible: boolean;
  options: OptionFlags;
  /** Yazılı Kağıdı formu */
  examType: string;
  classSection: string;
  group: string;
  writtenPaperOptions: WrittenPaperOptions;
  /** Yazılı Kağıdı: Öğretmen adları (sayfa sonu imza bloğu) */
  teacherNames: TeacherNameEntry[];
  /** Yazılı başlık: yerleşim için satır sayısı (eski taslaklar; yeni akışta boş) */
  writtenHeaderFieldLines: WrittenHeaderFieldLines;
  /** PDF’te görünen etiket metni; boşsa varsayılan isim */
  writtenHeaderFieldLabels: WrittenHeaderFieldLabels;
  /** True ise ilgili alan PDF başlığında çizilmez */
  writtenHeaderFieldHidden: WrittenHeaderFieldHidden;
  /** Kullanıcının eklediği özel sınav tipleri */
  customExamTypes: string[];
  /** Yaprak Test: Test açıklaması metni (tek sütun için geriye uyum) */
  testDescription: string;
  /** Açıklama kutusu sütun sayısı (1–3) */
  descriptionColumnCount: 1 | 2 | 3;
  /** Sütun bazlı açıklama metinleri (HTML) */
  descriptionTexts: string[];
  /** Açıklama kutusunda 2+ sütunda sütunlar arası dikey çizgi */
  descriptionColumnDividers: boolean;
  /** Yönerge kutusu dikey iç boşluk (pt) */
  descriptionBoxPadYPt: number;
  /** Yönerge kutusu yatay iç boşluk (pt) */
  descriptionBoxPadXPt: number;
  /** Yaprak Test: Sorular arası boşluk (mm) - tercih edilen */
  questionGapMm: number;
  /** Yaprak Test: Minimum boşluk (mm) - sıkıştırma sınırı */
  questionGapMinMm: number;
  /** Yaprak Test: Otomatik sıkıştırma - boşlukları min-tercih aralığında optimize et */
  autoCompactSpacing: boolean;
  /** Yaprak Test: Cevap anahtarı modu */
  answerKeyMode: AnswerKeyMode;
  /** Optik form etkin */
  optikFormEnabled: boolean;
  /** Optik form yerleşimi */
  optikFormPlacement: AnswerKeyMode;
  optikFormOptionCount: OptikFormOptionCount;
  optikFormBookletType: OptikFormBookletType;
  optikFormNetRule: OptikFormNetRule;
  optikFormInstructionEnabled: boolean;
  optikFormInstructionText: string;
  /** Kompakt optik dikey ofset (pt); pozitif = aşağı */
  optikFormOffsetYPt: number;
  /** PDF alt bilgi metni (opsiyonel) */
  footerInfoText: string;
  /** Yaprak Test: Çizgi üzerine yazı metni */
  centerLineText: string;
  /** Yaprak Test: Çizgi yazısı kalın mı */
  centerLineBold: boolean;
  /** Yaprak Test: Çizgi yazısı italik mi */
  centerLineItalic: boolean;
  /** Yaprak Test: Çizgi yazı yönü */
  centerLineTextDirection: "up" | "down";
  /** Yaprak Test: Başlık tasarımı (style1|style2|style3|corporate) */
  headerStyleId: string;
  /** Kurumsal başlık alanları */
  headerConfig: HeaderConfig;
  /** Kayıtlı başlık taslakları */
  headerTemplates: HeaderTemplate[];
  /** Yaprak Test: Tema rengi hex */
  themeColor: string;
  /** Test / Deneme — hangi modülün başlık+yönerge canlı alanda olduğu */
  activeLayoutModule: PaperLayoutModule;
  /** Modül başına başlık + yönerge (birbirinden bağımsız) */
  moduleLayouts: Record<PaperLayoutModule, ModuleLayoutSnapshot>;
  /** Tema/stil değişiminde canvas remount için */
  headerThemeEpoch: number;
  /** Kağıt boyutu preset (Ayarlar) - PDF/önizleme sayfa boyutu */
  paperSize: string;
  /** Özel kağıt boyutu - Tam Boyutu Belirleyin seçildiğinde (mm) */
  paperWidthMm: number;
  paperHeightMm: number;
  /** Yönlendirme: "portrait" | "landscape" (Dikey | Yatay) */
  orientation: "portrait" | "landscape";
  /** Sütun sayısı (1–6), varsayılan 2 */
  columns: number;
  /**
   * Yazı eşitleme hedef puntosu (testler arası sabit görünür yazı boyutu).
   * Varsayılan 10.
   */
  targetQuestionLinePt: number;
  /**
   * true: sütun taşmasında native genişliğin %80 altına inme (hafif taşma).
   * false (varsayılan): katı availW.
   */
  allowSlightOverflow: boolean;
  /** Kenar boşlukları (mm) - üst, alt, sol, sağ */
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  /** Başlık altı — ilk soru başlangıç boşluğu (mm, 0–50) */
  headerBottomGapMm: number;
  /** Diğer sayfalar — üst çizgi ile sorular arası boşluk (mm, 0–50) */
  otherPageHeaderBottomGapMm: number;
  /** Soru numarası sol boşluk kaydırması (mm, −15…+15) — tüm sütunlar birlikte */
  questionNumberLeftOffsetMm: number;
  /** Soru numarası ile görsel arası yatay boşluk (mm) */
  questionNumberImageGapMm: number;
  /** Soru numaralandırma açık */
  questionNumberingEnabled: boolean;
  /** Başlangıç soru numarası */
  questionNumberStart: number;
  /** Soru numarası rengi */
  questionNumberColorMode: "theme" | "black";
  /** Soru numarası font boyutu (pt) */
  questionNumberFontPt: number;
  /** Sayfa numaralandırma açık */
  pageNumberingEnabled: boolean;
  /** Başlangıç sayfa numarası */
  pageNumberStart: number;
  /** Sayfa numarası biçimi */
  pageNumberFormat: "plain" | "fraction";
  /** Filigran etkin mi */
  watermarkEnabled: boolean;
  /** Filigran ayarları (Metin veya Görsel) */
  watermarkSettings: {
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
  /** Sütun ayırıcı çizgisi */
  showColumnDivider: boolean;
  columnDividerText: string;
  columnDividerColor: string;
  /** Sütun ayırıcı çizgi kalınlığı (pt) */
  columnDividerWidthPt: number;
  /** Sütun çizgisi üzerindeki dikey metin */
  showColumnDividerText: boolean;
  /** Sayfa filigranı (Görsel Özellikler paneli) */
  showWatermark: boolean;
  watermarkText: string;
  watermarkLayout: WatermarkLayout;
  watermarkAngleDeg: number;
  watermarkOpacity: number;
  watermarkSize: number;
  watermarkLogoUrl: string | null;
  /** Sayfa kenarı çerçevesi */
  showPageFrame: boolean;
  pageFrameColorMode: "theme" | "custom";
  pageFrameColor: string;
  pageFrameWidthPt: number;
  /** Çerçeve ile sorular arasındaki eşit iç boşluk (mm) */
  pageFrameInnerGapMm: number;
  pageFrameCornerRadiusMm: number;
  pageFrameLineStyle: "solid" | "dashed" | "dotted";
  /** Fasikül: soru altı kareli alan köşe yuvarlaklığı (pt) */
  scratchGridCornerRadiusPt: number;
  /** Fasikül: kareli alan rengi — siyah / tema / özel */
  scratchGridColorMode: ScratchGridColorMode;
  scratchGridColor: string;
  /** Working draft: in-memory only. Rendered in main editor. */
  questions: QuestionItem[];
  /** Kağıt hazırla: Bölüm tanımları (original-desktop SectionRange) */
  sections: SectionRange[];
  questionsLoaded: boolean;
  /** Has unsaved changes since last explicit "Taslağı Kaydet". */
  isDirty: boolean;
  /** Set when draft loaded from persistence. */
  persistedDraftName: string | null;
  openModal: ModalKey | null;
  setActiveTab: (tab: SidebarTab) => void;
  setTabBeforeSettings: (tab: SidebarTab | null) => void;
  setTestName: (value: string) => void;
  setSchoolName: (value: string) => void;
  setTrialExamCode: (value: string) => void;
  setTrialBookletLabel: (value: string) => void;
  setTrialExamCodeFontPt: (pt: number) => void;
  setTrialExamCodeColor: (color: string) => void;
  setTrialExamCodeAlign: (align: "left" | "center" | "right") => void;
  setTrialExamCodePadLeftPt: (pt: number) => void;
  setTrialBookletFontPt: (pt: number) => void;
  setTrialBookletColor: (color: string) => void;
  setTrialTestNameBgOpacityPct: (pct: number) => void;
  setTrialTestNameBgColor: (color: string) => void;
  setTrialBrandName: (value: string) => void;
  setTrialBrandNameVisible: (visible: boolean) => void;
  setExamType: (value: string) => void;
  setClassSection: (value: string) => void;
  setGroup: (value: string) => void;
  addCustomExamType: (name: string) => void;
  toggleOption: (key: keyof OptionFlags) => void;
  toggleWrittenPaperOption: (key: keyof WrittenPaperOptions) => void;
  setTeacherNames: (entries: TeacherNameEntry[]) => void;
  addTeacherName: (entry: TeacherNameEntry) => void;
  /** Mevcut satırla birleştirir; tek alan güncellerken diğerini silmez */
  updateTeacherName: (index: number, partial: Partial<TeacherNameEntry>) => void;
  removeTeacherName: (index: number) => void;
  setWrittenHeaderFieldLabel: (key: WrittenHeaderFieldKey, value: string) => void;
  setWrittenHeaderFieldHidden: (key: WrittenHeaderFieldKey, hidden: boolean) => void;
  /** PDF başlık alanı: özel etiketler, gizlilik ve çizgi satırlarını başlangıç değerlerine döndürür */
  resetWrittenHeaderToDefaults: () => void;
  setTestDescription: (value: string) => void;
  setDescriptionColumns: (
    count: 1 | 2 | 3,
    texts: string[],
    descriptionColumnDividers?: boolean
  ) => void;
  setDescriptionBoxPadYPt: (pt: number) => void;
  setDescriptionBoxPadXPt: (pt: number) => void;
  setQuestionGapMm: (value: number) => void;
  setQuestionGapMinMm: (value: number) => void;
  setAutoCompactSpacing: (value: boolean) => void;
  setAnswerKeyMode: (mode: AnswerKeyMode) => void;
  setOptikFormEnabled: (enabled: boolean) => void;
  setOptikFormPlacement: (mode: AnswerKeyMode) => void;
  setOptikFormOptionCount: (value: OptikFormOptionCount) => void;
  setOptikFormBookletType: (value: OptikFormBookletType) => void;
  setOptikFormNetRule: (value: OptikFormNetRule) => void;
  setOptikFormInstructionEnabled: (enabled: boolean) => void;
  setOptikFormInstructionText: (text: string) => void;
  setOptikFormOffsetYPt: (offsetPt: number) => void;
  setOpticalFormSettings: (settings: OpticalFormSettings) => void;
  setFooterInfoText: (value: string) => void;
  setCenterLineText: (value: string) => void;
  setCenterLineBold: (value: boolean) => void;
  setCenterLineItalic: (value: boolean) => void;
  setCenterLineTextDirection: (dir: "up" | "down") => void;
  setHeaderStyleId: (id: string) => void;
  /**
   * Test / Deneme canlı başlık+yönergeyi hedef modüle kilitle.
   * Önizleme açılışında çapraz sızıntıyı önler.
   */
  syncActiveLayoutModule: (mod: PaperLayoutModule) => void;
  /** Stil + config tek seferde (önizleme kaçırmasın) */
  applyHeaderStyleAndConfig: (styleId: string, partial: Partial<HeaderConfig>) => void;
  /** Test: aktif temayı (ve tema rozet varsayılanlarını) fabrika ayarına al */
  resetTestThemesToDefaults: () => void;
  updateHeaderConfig: (partial: Partial<HeaderConfig>) => void;
  saveHeaderTemplate: (name: string) => void;
  loadHeaderTemplate: (id: string) => void;
  removeHeaderTemplate: (id: string) => void;
  setThemeColor: (color: string) => void;
  setPaperSize: (preset: string) => void;
  setPaperSizeCustom: (widthMm: number, heightMm: number) => void;
  setOrientation: (orientation: "portrait" | "landscape") => void;
  setColumns: (columns: number) => void;
  setTargetQuestionLinePt: (pt: number) => void;
  setAllowSlightOverflow: (allow: boolean) => void;
  setMargins: (top: number, bottom: number, left: number, right: number) => void;
  setHeaderBottomGapMm: (value: number) => void;
  setOtherPageHeaderBottomGapMm: (value: number) => void;
  setQuestionNumberLeftOffsetMm: (value: number) => void;
  setQuestionNumberImageGapMm: (value: number) => void;
  setQuestionNumberingEnabled: (enabled: boolean) => void;
  setQuestionNumberStart: (value: number) => void;
  setQuestionNumberColorMode: (mode: "theme" | "black") => void;
  setQuestionNumberFontPt: (value: number) => void;
  setPageNumberingEnabled: (enabled: boolean) => void;
  setPageNumberStart: (value: number) => void;
  setPageNumberFormat: (format: "plain" | "fraction") => void;
  setWatermarkEnabled: (enabled: boolean) => void;
  setWatermarkSettings: (settings: {
    mode: "text" | "image";
    text: string;
    textOpacityPct: number;
    textSizePct: number;
    textAngleDeg: number;
    textColor: string;
    imageBase64: string | null;
    imageOpacityPct: number;
    imageSizePct: number;
  }) => void;
  setShowColumnDivider: (enabled: boolean) => void;
  setColumnDividerText: (text: string) => void;
  setColumnDividerColor: (color: string) => void;
  setColumnDividerWidthPt: (pt: number) => void;
  setShowColumnDividerText: (enabled: boolean) => void;
  setShowWatermark: (enabled: boolean) => void;
  setWatermarkText: (text: string) => void;
  setWatermarkLayout: (layout: WatermarkLayout) => void;
  setWatermarkAngleDeg: (deg: number) => void;
  setWatermarkOpacity: (pct: number) => void;
  setWatermarkSize: (pct: number) => void;
  setWatermarkLogoUrl: (url: string | null) => void;
  setShowPageFrame: (enabled: boolean) => void;
  setPageFrameColorMode: (mode: "theme" | "custom") => void;
  setPageFrameColor: (color: string) => void;
  setPageFrameWidthPt: (pt: number) => void;
  setPageFrameInnerGapMm: (mm: number) => void;
  setPageFrameCornerRadiusMm: (mm: number) => void;
  setPageFrameLineStyle: (style: "solid" | "dashed" | "dotted") => void;
  setScratchGridCornerRadiusPt: (pt: number) => void;
  setScratchGridColorMode: (mode: ScratchGridColorMode) => void;
  setScratchGridColor: (color: string) => void;
  setQuestionAnswer: (id: string, answer: AnswerOption) => Promise<void>;
  updateRemoveBackground: (id: string, removeBackground: boolean) => Promise<void>;
  removeQuestion: (id: string) => Promise<void>;
  /** Ana sayfa / taslak: tüm seçilen soruları temizle */
  clearAllQuestions: () => void;
  reorderQuestions: (orderedIds: string[]) => Promise<void>;
  /** Kağıt hazırla: İki sorunun yerini değiştir (swap) */
  swapQuestions: (indexA: number, indexB: number) => void;
  /** Kağıt hazırla: Soruyu hedef sorunun altına taşı */
  insertQuestionAfter: (fromIndex: number, targetIndex: number) => void;
  /** Kağıt hazırla: Seçili soruya display_scale uygula */
  setQuestionDisplayScale: (id: string, scale: number) => void;
  /** Kağıt hazırla: Birden fazla soruya display_scale uygula */
  setQuestionsDisplayScale: (updates: Record<string, number>) => void;
  /**
   * Toplu ölçek commit — manualScale + normalizationScale + display_scale atomik.
   * normalizationScale asla 1’e sıfırlanmaz (update içinde gelen değer korunur).
   */
  setQuestionsBulkScales: (
    updates: Record<
      string,
      { manualScale: number; normalizationScale: number; display_scale: number }
    >,
  ) => void;
  /** Manuel full-width / single-column */
  setQuestionLayoutMode: (
    id: string,
    mode: 'single-column' | 'full-width' | 'auto',
  ) => void;
  /** Önizleme ilk açılış ölçeklerine dön */
  restoreQuestionsScaleSnapshot: (
    snapshot: Record<
      string,
      {
        display_scale: number
        manualScale?: number
        normalizationScale?: number
        detected_font_px?: number | null
        ocr_font_matched?: boolean
        font_line_px?: number
      }
    >,
  ) => void;
  /**
   * OpenCV-style morphology: gövde yazı yüksekliğini ölçer,
   * tüm soruları hedef puntoya (normalizationScale) çeker; manualScale=1.
   */
  applyQuestionLineHeightMatch: (opts?: {
    availWPt?: number;
    targetLinePt?: number;
  }) => Promise<{ matched: number; total: number }>;
  fontEqualizeInProgress: boolean;
  /** Kağıt hazırla: Seçili soruya custom_gap_mm uygula */
  setQuestionCustomGapMm: (id: string, gapMm: number | null) => void;
  /** Soru | Açıklama — numaralandırma ve cevap anahtarı davranışı */
  setQuestionContentType: (id: string, contentType: QuestionContentType) => Promise<void>;
  setQuestionExplanationCaption: (
    id: string,
    patch: Partial<{
      explanation_caption_enabled: boolean;
      explanation_caption_text: string;
      explanation_caption_align: ExplanationCaptionAlign;
      explanation_caption_placement: ExplanationCaptionPlacement;
      explanation_caption_side_flow: ExplanationCaptionSideFlow;
      explanation_caption_color: string;
      explanation_caption_bold: boolean;
      explanation_caption_italic: boolean;
      explanation_caption_font_pt: number;
      explanation_caption_box_enabled: boolean;
      explanation_caption_box_color: string;
      explanation_caption_box_corner: ExplanationCaptionBoxCorner;
      explanation_caption_box_width: ExplanationCaptionBoxWidth;
    }>
  ) => Promise<void>;
  setQuestionFasikulFrame: (id: string, frame: FasikulQuestionFrameSettings) => void;
  applyFasikulFrameToQuestions: (
    questionIds: string[],
    frame: FasikulQuestionFrameSettings,
  ) => void;
  /** Fasikül: soru altı kareli alan satır sayısı (null = otomatik) */
  setQuestionScratchGridRows: (id: string, rows: number | null) => void;
  /** Fasikül: sağ tık Ekle — boş hazır tasarım kutusunu sonrasına ekle */
  insertEmptyFasikulFrameAfter: (
    afterOrderIndex: number,
    presetId: FasikulFramePresetId,
  ) => string | null;
  setSections: (sections: SectionRange[]) => void;
  addSection: (section: SectionRange) => void;
  updateSection: (index: number, section: SectionRange) => void;
  removeSection: (index: number) => void;
  updateQuestionImage: (id: string, imageBase64: string) => void;
  setQuestionFontReference: (id: string, reference?: FontReferenceV1) => void;
  /** Silgi vb. sonrası tek katman; metin katmanlarını siler. */
  flattenQuestionImageToSingleLayer: (id: string, imageBase64: string) => void;
  addQuestionImageTextOverlay: (
    id: string,
    overlay: Omit<QuestionImageTextOverlay, "id"> & { id?: string },
    /** İlk katman: sunucu sorusunda image_base64 yoksa canvas’tan gelen PNG (ön ek yok). */
    underlaySnapshotB64?: string
  ) => void;
  updateQuestionImageTextOverlay: (
    id: string,
    overlayId: string,
    patch: Partial<Pick<QuestionImageTextOverlay, "x" | "y" | "w" | "h" | "text" | "fontSizePx">>,
    options?: { skipRecompose?: boolean }
  ) => void;
  removeQuestionImageTextOverlay: (id: string, overlayId: string) => void;
  recomposeQuestionImage: (id: string) => Promise<void>;
  updateQuestionCrop: (id: string, crop: CropBox) => Promise<void>;
  updateQuestionCropAndImage: (
    id: string,
    crop: CropBox,
    imageBase64: string,
    capture?: QuestionCaptureMeta,
  ) => void;
  addQuestion: (item: QuestionItem) => void;
  /** Add multiple questions to working draft. In-memory only, sets isDirty. */
  addQuestionsToWorkingDraft: (items: QuestionItem[]) => void;
  setQuestions: (items: QuestionItem[]) => void;
  setDirty: (dirty: boolean) => void;
  setPersistedDraftName: (name: string | null) => void;
  /** Taslak dosyasından tüm özellikleri yükle (dosya veya API) */
  applyDraftPayload: (draft: DraftFilePayload) => void;
  fetchQuestions: () => Promise<void>;
  setOpenModal: (key: ModalKey | null) => void;
  /**
   * PDF önizlemede manuel dikey konum (soru id → y_top_pt, PDF pt).
   * Sıra değişince order_index kaymasına takılmamak için id anahtarı; API’ye gönderirken güncel order_index eşlenir.
   */
  layoutYTopOverridesByQuestionIdPt: Record<string, number>;
  mergeLayoutYTopOverridesByQuestionId: (partial: Record<string, number>) => void;
  clearLayoutYTopOverrides: () => void;
  removeLayoutYTopOverridesForQuestionIds: (questionIds: string[]) => void;
  /** Sütun okları: soru id → hedef sayfa/sütun (sıra değişmez) */
  layoutPlacementOverridesByQuestionId: Record<
    string,
    { page_num: number; column_index: number; insert_at: "top" | "bottom" }
  >;
  mergeLayoutPlacementOverridesByQuestionId: (
    partial: Record<
      string,
      { page_num: number; column_index: number; insert_at: "top" | "bottom" }
    >
  ) => void;
  clearLayoutPlacementOverrides: () => void;
};

/** Taslak dosyası formatı - kaydetme/yükleme için */
export type DraftFilePayload = {
  name: string;
  questions: QuestionItem[];
  notes?: string;
  test_info?: { test_title?: string; test_name?: string; school_name?: string };
  export_settings?: {
    include_answer_key?: boolean;
    add_spacing?: boolean;
    include_description?: boolean;
    add_text_on_line?: boolean;
  };
  editor_state?: {
    activeTab?: string;
    testName?: string;
    schoolName?: string;
    trialExamCode?: string;
    trialBookletLabel?: string;
    trialExamCodeFontPt?: number;
    trialExamCodeColor?: string;
    trialExamCodeAlign?: "left" | "center" | "right";
    trialExamCodePadLeftPt?: number;
    trialBookletFontPt?: number;
    trialBookletColor?: string;
    trialTestNameBgOpacityPct?: number;
    trialTestNameBgColor?: string;
    trialBrandName?: string;
    trialBrandNameVisible?: boolean;
    options?: Partial<OptionFlags>;
    questionGapMm?: number;
    questionGapMinMm?: number;
    autoCompactSpacing?: boolean;
    headerStyleId?: string;
    headerBottomGapMm?: number;
    otherPageHeaderBottomGapMm?: number;
    questionNumberLeftOffsetMm?: number;
    questionNumberImageGapMm?: number;
    questionNumberingEnabled?: boolean;
    questionNumberStart?: number;
    questionNumberColorMode?: "theme" | "black";
    questionNumberFontPt?: number;
    pageNumberingEnabled?: boolean;
    pageNumberStart?: number;
    pageNumberFormat?: "plain" | "fraction";
    headerConfig?: HeaderConfig;
    headerTemplates?: HeaderTemplate[];
    themeColor?: string;
    activeLayoutModule?: "test" | "trial" | "fasikul";
    moduleLayouts?: {
      test?: unknown;
      trial?: unknown;
      fasikul?: unknown;
    };
    sections?: SectionRange[];
    testDescription?: string;
    descriptionColumnCount?: 1 | 2 | 3;
    descriptionTexts?: string[];
    descriptionColumnDividers?: boolean;
    descriptionBoxPadYPt?: number;
    descriptionBoxPadXPt?: number;
    answerKeyMode?: AnswerKeyMode;
    optikFormEnabled?: boolean;
    optikFormPlacement?: AnswerKeyMode;
    optikFormOptionCount?: OptikFormOptionCount;
    optikFormBookletType?: OptikFormBookletType;
    optikFormNetRule?: OptikFormNetRule;
    optikFormInstructionEnabled?: boolean;
    optikFormInstructionText?: string;
    optikFormOffsetYPt?: number;
    footerInfoText?: string;
    centerLineText?: string;
    centerLineBold?: boolean;
    centerLineItalic?: boolean;
    centerLineTextDirection?: "up" | "down";
    examType?: string;
    classSection?: string;
    group?: string;
    writtenPaperOptions?: Partial<WrittenPaperOptions> & {
      /** Eski taslaklar — soru aralığı artık options.addSpacingBetweenQuestions */
      addSpacingBetweenQuestions?: boolean;
    };
    teacherNames?: TeacherNameEntry[];
    writtenHeaderFieldLines?: WrittenHeaderFieldLines;
    writtenHeaderFieldLabels?: WrittenHeaderFieldLabels;
    writtenHeaderFieldHidden?: WrittenHeaderFieldHidden;
    customExamTypes?: string[];
    paperSize?: string;
    paperWidthMm?: number;
    paperHeightMm?: number;
    orientation?: "portrait" | "landscape";
    columns?: number;
    targetQuestionLinePt?: number;
    allowSlightOverflow?: boolean;
    marginTopMm?: number;
    marginBottomMm?: number;
    marginLeftMm?: number;
    marginRightMm?: number;
    watermarkEnabled?: boolean;
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
    showColumnDivider?: boolean;
    columnDividerText?: string;
    columnDividerColor?: string;
    columnDividerWidthPt?: number;
    showColumnDividerText?: boolean;
    showWatermark?: boolean;
    watermarkText?: string;
    watermarkLayout?: WatermarkLayout;
    watermarkAngleDeg?: number;
    watermarkOpacity?: number;
    watermarkSize?: number;
    watermarkLogoUrl?: string | null;
    showPageFrame?: boolean;
    pageFrameColorMode?: "theme" | "custom";
    pageFrameColor?: string;
    pageFrameWidthPt?: number;
    pageFrameInnerGapMm?: number;
    /** @deprecated */
    pageFrameMarginMm?: number;
    /** @deprecated */
    pageFramePaddingMm?: number;
    pageFrameCornerRadiusMm?: number;
    pageFrameLineStyle?: "solid" | "dashed" | "dotted";
    scratchGridCornerRadiusPt?: number;
    scratchGridColorMode?: ScratchGridColorMode;
    scratchGridColor?: string;
  };
};

function syncVisualLegacyFields(state: {
  showColumnDivider: boolean;
  columnDividerText: string;
  columnDividerColor: string;
  showColumnDividerText: boolean;
  showWatermark: boolean;
  watermarkText: string;
  watermarkLayout: WatermarkLayout;
  watermarkAngleDeg: number;
  watermarkOpacity: number;
  watermarkSize: number;
  watermarkLogoUrl: string | null;
  options: OptionFlags;
  centerLineText: string;
  watermarkEnabled: boolean;
  watermarkSettings: EditorState["watermarkSettings"];
}): Pick<
  EditorState,
  | "options"
  | "centerLineText"
  | "watermarkEnabled"
  | "watermarkSettings"
> {
  const logoBase64 = stripDataUrlPrefix(state.watermarkLogoUrl);
  return {
    centerLineText: state.columnDividerText,
    options: {
      ...state.options,
      addTextOnLine:
        state.showColumnDividerText &&
        state.showColumnDivider &&
        !!state.columnDividerText.trim(),
    },
    watermarkEnabled: state.showWatermark,
    watermarkSettings: {
      ...state.watermarkSettings,
      mode: logoBase64 ? "image" : "text",
      text: state.watermarkText,
      textOpacityPct: state.watermarkOpacity,
      textSizePct: state.watermarkSize,
      textAngleDeg: resolveWatermarkAngleDeg(state.watermarkLayout, state.watermarkAngleDeg),
      imageBase64: logoBase64,
      imageOpacityPct: state.watermarkOpacity,
      imageSizePct: state.watermarkSize,
    },
  };
}

/** Sayfa dekoru değişince aktif modül anlığını güncelle (test/deneme/fasikül ayrımı) */
function commitPageDecorPatch(
  s: EditorState,
  patch: Partial<EditorState>,
  opts?: { syncLegacy?: boolean },
): Partial<EditorState> {
  const next = { ...s, ...patch, isDirty: true } as EditorState;
  const legacy =
    opts?.syncLegacy === false
      ? {}
      : syncVisualLegacyFields(next);
  const merged = { ...next, ...legacy } as EditorState;
  return {
    ...patch,
    ...legacy,
    isDirty: true,
    moduleLayouts: ensureModuleLayouts({
      ...s.moduleLayouts,
      [s.activeLayoutModule]: captureModuleLayout(merged),
    }),
  };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  activeTab: "test-paper",
  tabBeforeSettings: null,
  testName: "",
  schoolName: "",
  trialExamCode: "",
  trialBookletLabel: "A KİTAPÇIĞI",
  trialExamCodeFontPt: 10,
  trialExamCodeColor: "",
  trialExamCodeAlign: "left",
  trialExamCodePadLeftPt: 10,
  trialBookletFontPt: 10,
  trialBookletColor: "",
  trialTestNameBgOpacityPct: 100,
  trialTestNameBgColor: "#0A1931",
  trialBrandName: "EDUMATH",
  trialBrandNameVisible: true,
  examType: "1. Dönem 1. Yazılı",
  classSection: "",
  group: "Grup Yok",
  writtenPaperOptions: {
    addTeacherName: false,
  },
  teacherNames: [],
  writtenHeaderFieldLines: emptyWrittenHeaderFieldLines(),
  writtenHeaderFieldLabels: emptyWrittenHeaderFieldLabels(),
  writtenHeaderFieldHidden: emptyWrittenHeaderFieldHidden(),
  customExamTypes: [],
  testDescription: "",
  descriptionColumnCount: 1,
  descriptionTexts: [""],
  descriptionColumnDividers: false,
  descriptionBoxPadYPt: 5,
  descriptionBoxPadXPt: 8,
  questionGapMm: 25.0,
  questionGapMinMm: 25.0,
  autoCompactSpacing: false,
  answerKeyMode: "per_page",
  optikFormEnabled: false,
  optikFormPlacement: "end_of_test",
  optikFormOptionCount: "auto",
  optikFormBookletType: "none",
  optikFormNetRule: "4",
  optikFormInstructionEnabled: true,
  optikFormInstructionText: DEFAULT_OPTIK_INSTRUCTION,
  optikFormOffsetYPt: 0,
  footerInfoText: "",
  centerLineText: "SERKAN DOKSANBİR",
  centerLineBold: false,
  centerLineItalic: false,
  centerLineTextDirection: "up",
  headerStyleId: "style_1",
  headerConfig: defaultHeaderConfig(),
  headerTemplates: [],
  themeColor: "#1E88E5",
  activeLayoutModule: "test",
  moduleLayouts: {
    test: defaultTestModuleLayout(),
    trial: defaultTrialModuleLayout(),
    fasikul: defaultFasikulModuleLayout(),
  },
  headerThemeEpoch: 0,
  paperSize: "A4 (210 x 297 mm)",
  paperWidthMm: 210,
  paperHeightMm: 297,
  orientation: "portrait",
  columns: 2,
  targetQuestionLinePt: DEFAULT_TARGET_QUESTION_LINE_PT,
  fontEqualizeInProgress: false,
  allowSlightOverflow: false,
  marginTopMm: 10,
  marginBottomMm: 10,
  marginLeftMm: 15,
  marginRightMm: 10,
  headerBottomGapMm: 1.5,
  otherPageHeaderBottomGapMm: 1.0,
  questionNumberLeftOffsetMm: 0.5,
  questionNumberImageGapMm: 0.3,
  questionNumberingEnabled: true,
  questionNumberStart: 1,
  questionNumberColorMode: "theme",
  questionNumberFontPt: 10,
  pageNumberingEnabled: true,
  pageNumberStart: 1,
  pageNumberFormat: "plain",
  watermarkEnabled: false,
  watermarkSettings: {
    mode: "text",
    text: "",
    textOpacityPct: 20,
    textSizePct: 90,
    textAngleDeg: 45,
    textColor: "#1E88E5",  // Varsayılan tema rengi
    imageBase64: null,
    imageOpacityPct: 15,
    imageSizePct: 50,
  },
  showColumnDivider: true,
  columnDividerText: "SERKAN DOKSANBİR",
  columnDividerColor: "#DC2626",
  columnDividerWidthPt: 0.5,
  showColumnDividerText: true,
  showWatermark: false,
  watermarkText: "ANADOLU LİSESİ",
  watermarkLayout: "diagonal",
  watermarkAngleDeg: 45,
  watermarkOpacity: 25,
  watermarkSize: 50,
  watermarkLogoUrl: null,
  showPageFrame: false,
  pageFrameColorMode: "theme",
  pageFrameColor: "#1E88E5",
  pageFrameWidthPt: 1.5,
  pageFrameInnerGapMm: 3,
  pageFrameCornerRadiusMm: 2,
  pageFrameLineStyle: "solid",
  scratchGridCornerRadiusPt: SCRATCH_CORNER_RADIUS_DEFAULT_PT,
  scratchGridColorMode: SCRATCH_COLOR_MODE_DEFAULT,
  scratchGridColor: SCRATCH_COLOR_CUSTOM_DEFAULT,
  options: {
    includeDescription: false,
    addSpacingBetweenQuestions: false,
    includeAnswerKey: true,
    addTextOnLine: true,
  },
  questions: [],
  sections: [],
  questionsLoaded: false,
  isDirty: false,
  persistedDraftName: null,
  openModal: null,
  layoutYTopOverridesByQuestionIdPt: {},
  mergeLayoutYTopOverridesByQuestionId: (partial) =>
    set((s) => ({
      layoutYTopOverridesByQuestionIdPt: {
        ...s.layoutYTopOverridesByQuestionIdPt,
        ...partial,
      },
    })),
  clearLayoutYTopOverrides: () => set({ layoutYTopOverridesByQuestionIdPt: {} }),
  removeLayoutYTopOverridesForQuestionIds: (questionIds) =>
    set((s) => {
      const next = { ...s.layoutYTopOverridesByQuestionIdPt };
      for (const id of questionIds) delete next[id];
      return { layoutYTopOverridesByQuestionIdPt: next };
    }),
  layoutPlacementOverridesByQuestionId: {},
  mergeLayoutPlacementOverridesByQuestionId: (partial) =>
    set((s) => ({
      layoutPlacementOverridesByQuestionId: {
        ...s.layoutPlacementOverridesByQuestionId,
        ...partial,
      },
      isDirty: true,
    })),
  clearLayoutPlacementOverrides: () => set({ layoutPlacementOverridesByQuestionId: {} }),
  setActiveTab: (tab) =>
    set((state) => {
      const nextMod = paperLayoutModuleFromTab(tab);
      const curMod = state.activeLayoutModule;
      // Ayarlar vb. — mevcut modül anlığını kaydet, canlı temayı bozma
      if (!nextMod) {
        return {
          activeTab: tab,
          moduleLayouts: ensureModuleLayouts({
            ...state.moduleLayouts,
            [curMod]: captureModuleLayout(state),
          }),
        };
      }
      if (nextMod === curMod) {
        return { activeTab: tab };
      }
      const savedLayouts = ensureModuleLayouts({
        ...state.moduleLayouts,
        [curMod]: captureModuleLayout(state),
      });
      const applied = applyModuleLayout(
        savedLayouts[nextMod] ?? defaultLayoutForModule(nextMod),
      );
      const decorPatch = pageDecorStorePatch(applied.pageDecor);
      const options = {
        ...state.options,
        includeDescription: applied.optionsPatch.includeDescription,
      };
      const withDecor = {
        ...state,
        ...decorPatch,
        options,
      };
      return {
        activeTab: tab,
        activeLayoutModule: nextMod,
        moduleLayouts: savedLayouts,
        headerStyleId: applied.headerStyleId!,
        headerConfig: applied.headerConfig!,
        themeColor: applied.themeColor!,
        headerThemeEpoch: state.headerThemeEpoch + 1,
        testDescription: applied.testDescription!,
        descriptionColumnCount: applied.descriptionColumnCount!,
        descriptionTexts: applied.descriptionTexts!,
        descriptionColumnDividers: applied.descriptionColumnDividers!,
        descriptionBoxPadYPt: applied.descriptionBoxPadYPt!,
        descriptionBoxPadXPt: applied.descriptionBoxPadXPt!,
        options,
        ...decorPatch,
        ...syncVisualLegacyFields(withDecor),
      };
    }),
  syncActiveLayoutModule: (mod) =>
    set((state) => {
      const curMod = state.activeLayoutModule;
      // Modül değişiyorsa canlıyı eski modüle kaydet; aynı modülde kayıtlı anlığı uygula
      // (canlıya sızmış diğer modül temasını ezmek için önce kaydetmeden uygula)
      const savedLayouts = ensureModuleLayouts(
        mod !== curMod
          ? {
              ...state.moduleLayouts,
              [curMod]: captureModuleLayout(state),
            }
          : state.moduleLayouts,
      );
      const applied = applyModuleLayout(
        savedLayouts[mod] ?? defaultLayoutForModule(mod),
      );
      const styleChanged =
        mod !== curMod ||
        applied.headerStyleId !== state.headerStyleId ||
        (applied.headerConfig?.showClassicInfoBar !== false) !==
          (state.headerConfig.showClassicInfoBar !== false) ||
        !!applied.headerConfig?.useYaprakBanner !== !!state.headerConfig.useYaprakBanner ||
        !!applied.headerConfig?.useExamBanner !== !!state.headerConfig.useExamBanner ||
        !!applied.optionsPatch.includeDescription !== !!state.options.includeDescription;
      const decorPatch = pageDecorStorePatch(applied.pageDecor);
      const options = {
        ...state.options,
        includeDescription: applied.optionsPatch.includeDescription,
      };
      const withDecor = {
        ...state,
        ...decorPatch,
        options,
      };
      return {
        activeLayoutModule: mod,
        moduleLayouts: savedLayouts,
        headerStyleId: applied.headerStyleId!,
        headerConfig: applied.headerConfig!,
        themeColor: applied.themeColor!,
        headerThemeEpoch: styleChanged
          ? state.headerThemeEpoch + 1
          : state.headerThemeEpoch,
        testDescription: applied.testDescription!,
        descriptionColumnCount: applied.descriptionColumnCount!,
        descriptionTexts: applied.descriptionTexts!,
        descriptionColumnDividers: applied.descriptionColumnDividers!,
        descriptionBoxPadYPt: applied.descriptionBoxPadYPt!,
        descriptionBoxPadXPt: applied.descriptionBoxPadXPt!,
        options,
        ...decorPatch,
        ...syncVisualLegacyFields(withDecor),
      };
    }),
  setTabBeforeSettings: (tab) => set({ tabBeforeSettings: tab }),
  setTestName: (value) => set({ testName: value }),
  setSchoolName: (value) => set({ schoolName: value }),
  setTrialExamCode: (value) => set({ trialExamCode: value, isDirty: true }),
  setTrialBookletLabel: (value) => set({ trialBookletLabel: value, isDirty: true }),
  setTrialExamCodeFontPt: (pt) =>
    set({
      trialExamCodeFontPt: Math.max(7, Math.min(18, Math.round(Number(pt) * 2) / 2)),
      isDirty: true,
    }),
  setTrialExamCodeColor: (color) => set({ trialExamCodeColor: color, isDirty: true }),
  setTrialExamCodeAlign: (align) => set({ trialExamCodeAlign: align, isDirty: true }),
  setTrialExamCodePadLeftPt: (pt) =>
    set({
      trialExamCodePadLeftPt: Math.max(0, Math.min(36, Math.round(Number(pt) * 2) / 2)),
      isDirty: true,
    }),
  setTrialBookletFontPt: (pt) =>
    set({
      trialBookletFontPt: Math.max(7, Math.min(18, Math.round(Number(pt) * 2) / 2)),
      isDirty: true,
    }),
  setTrialBookletColor: (color) => set({ trialBookletColor: color, isDirty: true }),
  setTrialTestNameBgOpacityPct: (pct) =>
    set({
      trialTestNameBgOpacityPct: Math.max(0, Math.min(100, Math.round(Number(pct)))),
      isDirty: true,
    }),
  setTrialTestNameBgColor: (color) => {
    const raw = (color || "").trim();
    const c = /^#[0-9A-Fa-f]{6}$/.test(raw) ? raw.toUpperCase() : "#0A1931";
    set((state) => ({
      trialTestNameBgColor: c,
      trialExamCodeColor: c,
      themeColor: c,
      headerConfig: { ...state.headerConfig, primaryColor: c },
      isDirty: true,
    }));
  },
  setTrialBrandName: (value) => set({ trialBrandName: value, isDirty: true }),
  setTrialBrandNameVisible: (visible) =>
    set({ trialBrandNameVisible: !!visible, isDirty: true }),
  setExamType: (value) => set({ examType: value }),
  setClassSection: (value) => set({ classSection: value }),
  setGroup: (value) => set({ group: value }),
  addCustomExamType: (name) =>
    set((state) => ({
      customExamTypes: [...state.customExamTypes, name],
      examType: name,
    })),
  toggleOption: (key) =>
    set((state) => {
      const options = { ...state.options, [key]: !state.options[key] };
      const nextLive = { ...state, options };
      return {
        options,
        ...(key === "includeDescription"
          ? {
              moduleLayouts: {
                ...state.moduleLayouts,
                [state.activeLayoutModule]: captureModuleLayout(nextLive),
              },
            }
          : {}),
      };
    }),
  toggleWrittenPaperOption: (key) =>
    set((state) => ({
      writtenPaperOptions: { ...state.writtenPaperOptions, [key]: !state.writtenPaperOptions[key] },
    })),
  setTeacherNames: (entries) => set({ teacherNames: entries }),
  addTeacherName: (entry) =>
    set((s) => ({ teacherNames: [...s.teacherNames, entry] })),
  updateTeacherName: (index, partial) =>
    set((s) => ({
      teacherNames: s.teacherNames.map((e, i) =>
        i === index ? { ...e, ...partial } : e
      ),
    })),
  removeTeacherName: (index) =>
    set((s) => ({
      teacherNames: s.teacherNames.filter((_, i) => i !== index),
    })),
  setWrittenHeaderFieldLabel: (key, value) => {
    const v = value.trim().slice(0, 80);
    set((s) => ({
      writtenHeaderFieldLabels: { ...s.writtenHeaderFieldLabels, [key]: v },
      isDirty: true,
    }));
  },
  setWrittenHeaderFieldHidden: (key, hidden) =>
    set((s) => ({
      writtenHeaderFieldHidden: { ...s.writtenHeaderFieldHidden, [key]: hidden },
      isDirty: true,
    })),
  resetWrittenHeaderToDefaults: () =>
    set({
      writtenHeaderFieldLines: emptyWrittenHeaderFieldLines(),
      writtenHeaderFieldLabels: emptyWrittenHeaderFieldLabels(),
      writtenHeaderFieldHidden: emptyWrittenHeaderFieldHidden(),
      isDirty: true,
    }),
  setTestDescription: (value) =>
    set({
      testDescription: value,
      descriptionColumnCount: 1,
      descriptionTexts: [value || ""],
      descriptionColumnDividers: false,
    }),
  setDescriptionColumns: (count, texts, descriptionColumnDividers) =>
    set((s) => {
      const next = {
        ...s,
        descriptionColumnCount: count,
        descriptionTexts: texts,
        testDescription: texts[0] ?? "",
        descriptionColumnDividers: descriptionColumnDividers === true,
      };
      return {
        descriptionColumnCount: count,
        descriptionTexts: texts,
        testDescription: texts[0] ?? "",
        descriptionColumnDividers: descriptionColumnDividers === true,
        moduleLayouts: {
          ...s.moduleLayouts,
          [s.activeLayoutModule]: captureModuleLayout(next),
        },
      };
    }),
  setDescriptionBoxPadYPt: (pt) =>
    set({
      descriptionBoxPadYPt: Math.max(2, Math.min(28, Math.round(Number(pt) * 2) / 2)),
      isDirty: true,
    }),
  setDescriptionBoxPadXPt: (pt) =>
    set({
      descriptionBoxPadXPt: Math.max(2, Math.min(28, Math.round(Number(pt) * 2) / 2)),
      isDirty: true,
    }),
  setQuestionGapMm: (value) =>
    set({
      questionGapMm: value,
      questionGapMinMm: value,
      autoCompactSpacing: false,
      isDirty: true,
    }),
  setQuestionGapMinMm: (value) => set({ questionGapMinMm: value }),
  setAutoCompactSpacing: (value) => set({ autoCompactSpacing: value }),
  setAnswerKeyMode: (mode) =>
    set((s) => ({
      answerKeyMode: mode,
      // Her sayfanın altına cevap anahtarı varken optik form kapalı
      optikFormEnabled: mode === "per_page" ? false : s.optikFormEnabled,
      isDirty: true,
    })),
  setOptikFormEnabled: (enabled) =>
    set((s) => {
      if (enabled && s.answerKeyMode === "per_page" && s.options.includeAnswerKey) {
        return s;
      }
      return { optikFormEnabled: enabled, isDirty: true };
    }),
  setOptikFormPlacement: (mode) => set({ optikFormPlacement: mode, isDirty: true }),
  setOptikFormOptionCount: (value) => set({ optikFormOptionCount: value, isDirty: true }),
  setOptikFormBookletType: (value) => set({ optikFormBookletType: value, isDirty: true }),
  setOptikFormNetRule: (value) => set({ optikFormNetRule: value, isDirty: true }),
  setOptikFormInstructionEnabled: (enabled) =>
    set({ optikFormInstructionEnabled: enabled, isDirty: true }),
  setOptikFormInstructionText: (text) => set({ optikFormInstructionText: text, isDirty: true }),
  setOptikFormOffsetYPt: (offsetPt) =>
    set({
      optikFormOffsetYPt: Number.isFinite(offsetPt) ? offsetPt : 0,
      isDirty: true,
    }),
  setOpticalFormSettings: (settings) =>
    set({ ...applyOpticalFormSettings(settings), isDirty: true }),
  setFooterInfoText: (value) => set({ footerInfoText: value, isDirty: true }),
  setCenterLineText: (value) => set({ centerLineText: value }),
  setCenterLineBold: (value) =>
    set((s) => commitPageDecorPatch(s, { centerLineBold: value }, { syncLegacy: false })),
  setCenterLineItalic: (value) =>
    set((s) => commitPageDecorPatch(s, { centerLineItalic: value }, { syncLegacy: false })),
  setCenterLineTextDirection: (dir) => set({ centerLineTextDirection: dir }),
  setHeaderStyleId: (id) =>
    set((s) => ({
      headerStyleId: normalizeHeaderStyleId(id),
      headerThemeEpoch: s.headerThemeEpoch + 1,
      isDirty: true,
    })),
  applyHeaderStyleAndConfig: (styleId, partial) =>
    set((s) => {
      const headerStyleId = normalizeHeaderStyleId(styleId);
      const fromId = normalizeHeaderStyleId(s.headerStyleId);
      const switched = fromId !== headerStyleId;
      const hadTargetBag =
        Object.keys(s.headerConfig.headerInfoByStyle?.[headerStyleId] ?? {}).length > 0;

      const infoFromPartial = pickHeaderInfoSettings(partial as HeaderConfig);
      const extras: Partial<HeaderConfig> = { ...partial };
      for (const key of HEADER_INFO_KEYS) {
        delete (extras as Record<string, unknown>)[key];
      }
      delete extras.badgeByStyle;
      delete extras.headerInfoByStyle;

      let headerConfig = switchHeaderInfoTheme(
        s.headerConfig,
        fromId,
        headerStyleId,
        extras,
      );

      // Info partial: aynı temada her zaman; tema değişiminde yalnızca hedef dilim yoksa (ilk tohum)
      if (
        Object.keys(infoFromPartial).length > 0 &&
        (!switched || !hadTargetBag)
      ) {
        const bag = patchHeaderInfo(headerConfig, headerStyleId, infoFromPartial);
        headerConfig = {
          ...headerConfig,
          ...infoFromPartial,
          ...bag,
          fieldHidden: infoFromPartial.fieldHidden
            ? {
                ...(headerConfig.fieldHidden ?? {}),
                ...infoFromPartial.fieldHidden,
              }
            : headerConfig.fieldHidden,
          fieldFontSizesPt: infoFromPartial.fieldFontSizesPt
            ? {
                ...(headerConfig.fieldFontSizesPt ?? {}),
                ...infoFromPartial.fieldFontSizesPt,
              }
            : headerConfig.fieldFontSizesPt,
          fieldColors: infoFromPartial.fieldColors
            ? {
                ...(headerConfig.fieldColors ?? {}),
                ...infoFromPartial.fieldColors,
              }
            : headerConfig.fieldColors,
          fieldFontStyles: infoFromPartial.fieldFontStyles
            ? {
                ...(headerConfig.fieldFontStyles ?? {}),
                ...infoFromPartial.fieldFontStyles,
              }
            : headerConfig.fieldFontStyles,
        };
      }

      if (partial.badgeByStyle) {
        headerConfig = {
          ...headerConfig,
          badgeByStyle: {
            ...headerConfig.badgeByStyle,
            style_1: {
              ...headerConfig.badgeByStyle?.style_1,
              ...partial.badgeByStyle.style_1,
            },
            style_2: {
              ...headerConfig.badgeByStyle?.style_2,
              ...partial.badgeByStyle.style_2,
            },
            style_3: {
              ...headerConfig.badgeByStyle?.style_3,
              ...partial.badgeByStyle.style_3,
            },
            style_4: {
              ...headerConfig.badgeByStyle?.style_4,
              ...partial.badgeByStyle.style_4,
            },
          },
        };
      }

      const nextLive = {
        ...s,
        headerStyleId,
        headerConfig,
      };
      const nextThemeColor =
        (headerConfig.primaryColor || "").trim() || s.themeColor;
      return {
        headerStyleId,
        headerConfig,
        themeColor: nextThemeColor,
        headerThemeEpoch: s.headerThemeEpoch + 1,
        moduleLayouts: {
          ...s.moduleLayouts,
          [s.activeLayoutModule]: captureModuleLayout({
            ...nextLive,
            themeColor: nextThemeColor,
          }),
        },
        isDirty: true,
      };
    }),
  resetTestThemesToDefaults: () =>
    set((s) => {
      const styleId =
        s.headerConfig.useYaprakBanner || s.headerConfig.useExamBanner
          ? "style_1"
          : s.headerStyleId;
      const built =
        s.activeLayoutModule === "fasikul"
          ? buildFasikulThemeDefaults(styleId)
          : buildTestThemeDefaults(styleId);
      const nextLive = {
        ...s,
        headerStyleId: built.headerStyleId,
        headerConfig: built.headerConfig,
        themeColor: built.themeColor,
      };
      return {
        headerStyleId: built.headerStyleId,
        headerConfig: built.headerConfig,
        themeColor: built.themeColor,
        headerThemeEpoch: s.headerThemeEpoch + 1,
        moduleLayouts: {
          ...s.moduleLayouts,
          [s.activeLayoutModule]: captureModuleLayout(nextLive),
        },
        isDirty: true,
      };
    }),
  updateHeaderConfig: (partial) =>
    set((s) => {
      const infoFromPartial = pickHeaderInfoSettings(partial as HeaderConfig);
      const infoBag =
        Object.keys(infoFromPartial).length > 0
          ? patchHeaderInfo(s.headerConfig, s.headerStyleId, infoFromPartial)
          : null;

      const headerConfig: HeaderConfig = {
        ...s.headerConfig,
        ...partial,
        fieldFontSizesPt: partial.fieldFontSizesPt
          ? { ...(s.headerConfig.fieldFontSizesPt ?? {}), ...partial.fieldFontSizesPt }
          : (s.headerConfig.fieldFontSizesPt ?? {}),
        fieldColors: partial.fieldColors
          ? { ...(s.headerConfig.fieldColors ?? {}), ...partial.fieldColors }
          : (s.headerConfig.fieldColors ?? {}),
        fieldFontStyles: partial.fieldFontStyles
          ? { ...(s.headerConfig.fieldFontStyles ?? {}), ...partial.fieldFontStyles }
          : (s.headerConfig.fieldFontStyles ?? {}),
        badgeByStyle: partial.badgeByStyle
          ? {
              ...s.headerConfig.badgeByStyle,
              style_1: {
                ...s.headerConfig.badgeByStyle?.style_1,
                ...partial.badgeByStyle.style_1,
              },
              style_2: {
                ...s.headerConfig.badgeByStyle?.style_2,
                ...partial.badgeByStyle.style_2,
              },
              style_3: {
                ...s.headerConfig.badgeByStyle?.style_3,
                ...partial.badgeByStyle.style_3,
              },
              style_4: {
                ...s.headerConfig.badgeByStyle?.style_4,
                ...partial.badgeByStyle.style_4,
              },
            }
          : (s.headerConfig.badgeByStyle ?? {}),
        headerInfoByStyle: {
          ...(s.headerConfig.headerInfoByStyle ?? {}),
          ...(infoBag?.headerInfoByStyle ?? {}),
          ...(partial.headerInfoByStyle ?? {}),
          style_1: {
            ...s.headerConfig.headerInfoByStyle?.style_1,
            ...infoBag?.headerInfoByStyle?.style_1,
            ...partial.headerInfoByStyle?.style_1,
          },
          style_2: {
            ...s.headerConfig.headerInfoByStyle?.style_2,
            ...infoBag?.headerInfoByStyle?.style_2,
            ...partial.headerInfoByStyle?.style_2,
          },
          style_3: {
            ...s.headerConfig.headerInfoByStyle?.style_3,
            ...infoBag?.headerInfoByStyle?.style_3,
            ...partial.headerInfoByStyle?.style_3,
          },
          style_4: {
            ...s.headerConfig.headerInfoByStyle?.style_4,
            ...infoBag?.headerInfoByStyle?.style_4,
            ...partial.headerInfoByStyle?.style_4,
          },
        },
      };
      const nextThemeColor =
        partial.primaryColor !== undefined
          ? (String(partial.primaryColor || "").trim() || s.themeColor)
          : s.themeColor;
      const nextLive = { ...s, headerConfig, themeColor: nextThemeColor };
      return {
        headerConfig,
        themeColor: nextThemeColor,
        moduleLayouts: {
          ...s.moduleLayouts,
          [s.activeLayoutModule]: captureModuleLayout(nextLive),
        },
        isDirty: true,
      };
    }),
  saveHeaderTemplate: (name) =>
    set((s) => {
      const trimmed = name.trim()
      if (!trimmed) return s
      const tpl: HeaderTemplate = {
        id: globalThis.crypto?.randomUUID?.() ?? `ht-${Date.now()}`,
        name: trimmed,
        config: { ...s.headerConfig },
        savedAt: Date.now(),
      }
      return { headerTemplates: [...s.headerTemplates, tpl], isDirty: true }
    }),
  loadHeaderTemplate: (id) =>
    set((s) => {
      const tpl = s.headerTemplates.find((t) => t.id === id)
      if (!tpl) return s
      return {
        headerConfig: { ...defaultHeaderConfig(), ...tpl.config, fieldFontSizesPt: tpl.config.fieldFontSizesPt ?? {} },
        headerStyleId: "style_1",
        isDirty: true,
      }
    }),
  removeHeaderTemplate: (id) =>
    set((s) => ({
      headerTemplates: s.headerTemplates.filter((t) => t.id !== id),
      isDirty: true,
    })),
  setThemeColor: (color) => set({ themeColor: color }),
  setPaperSize: (preset) => set({ paperSize: preset }),
  setPaperSizeCustom: (widthMm, heightMm) =>
    set({ paperWidthMm: widthMm, paperHeightMm: heightMm }),
  setOrientation: (orientation) => set({ orientation }),
  setColumns: (columns) => set({ columns: Math.max(1, Math.min(6, columns)) }),
  setTargetQuestionLinePt: (pt) =>
    set((s) => ({
      targetQuestionLinePt: clampTargetQuestionLinePt(pt),
      // Eski OCR font_line yolu hedefe bağlı identity ile ters ölçek üretebiliyordu; temizle.
      questions: s.questions.map((q) =>
        q.ocr_font_matched
          ? { ...q, ocr_font_matched: false, font_line_px: undefined }
          : q,
      ),
      isDirty: true,
    })),
  setAllowSlightOverflow: (allow) => set({ allowSlightOverflow: allow }),
  setMargins: (top, bottom, left, right) =>
    set({ marginTopMm: top, marginBottomMm: bottom, marginLeftMm: left, marginRightMm: right }),
  setHeaderBottomGapMm: (value) =>
    set({
      headerBottomGapMm: Math.max(0, Math.min(50, Math.round(value * 10) / 10)),
      isDirty: true,
    }),
  setOtherPageHeaderBottomGapMm: (value) =>
    set({
      otherPageHeaderBottomGapMm: Math.max(0, Math.min(50, Math.round(value * 10) / 10)),
      isDirty: true,
    }),
  setQuestionNumberLeftOffsetMm: (value) =>
    set({
      questionNumberLeftOffsetMm: Math.max(-15, Math.min(15, Math.round(value * 20) / 20)),
      isDirty: true,
    }),
  setQuestionNumberImageGapMm: (value) =>
    set({
      questionNumberImageGapMm: Math.max(0, Math.min(10, Math.round(value * 20) / 20)),
      isDirty: true,
    }),
  setQuestionNumberingEnabled: (enabled) =>
    set({ questionNumberingEnabled: enabled, isDirty: true }),
  setQuestionNumberStart: (value) =>
    set({
      questionNumberStart: Math.max(1, Math.min(999, Math.round(value))),
      isDirty: true,
    }),
  setQuestionNumberColorMode: (mode) =>
    set({ questionNumberColorMode: mode, isDirty: true }),
  setQuestionNumberFontPt: (value) =>
    set({
      questionNumberFontPt: Math.max(7, Math.min(18, Math.round(value * 2) / 2)),
      isDirty: true,
    }),
  setPageNumberingEnabled: (enabled) =>
    set({ pageNumberingEnabled: enabled, isDirty: true }),
  setPageNumberStart: (value) =>
    set({
      pageNumberStart: Math.max(1, Math.min(999, Math.round(value))),
      isDirty: true,
    }),
  setPageNumberFormat: (format) => set({ pageNumberFormat: format, isDirty: true }),
  setWatermarkEnabled: (enabled) => set({ watermarkEnabled: enabled }),
  setWatermarkSettings: (settings) => set({ watermarkSettings: settings }),
  setShowColumnDivider: (enabled) =>
    set((s) => commitPageDecorPatch(s, { showColumnDivider: enabled })),
  setColumnDividerText: (text) =>
    set((s) => commitPageDecorPatch(s, { columnDividerText: text })),
  setColumnDividerColor: (color) => set({ columnDividerColor: color, isDirty: true }),
  setColumnDividerWidthPt: (pt) =>
    set((s) =>
      commitPageDecorPatch(
        s,
        {
          columnDividerWidthPt: Math.max(0.3, Math.min(4, Math.round(pt * 10) / 10)),
        },
        { syncLegacy: false },
      ),
    ),
  setShowColumnDividerText: (enabled) =>
    set((s) => commitPageDecorPatch(s, { showColumnDividerText: enabled })),
  setShowWatermark: (enabled) =>
    set((s) => commitPageDecorPatch(s, { showWatermark: enabled })),
  setWatermarkText: (text) =>
    set((s) => commitPageDecorPatch(s, { watermarkText: text })),
  setWatermarkLayout: (layout) =>
    set((s) => commitPageDecorPatch(s, { watermarkLayout: layout })),
  setWatermarkAngleDeg: (deg) =>
    set((s) =>
      commitPageDecorPatch(s, {
        watermarkAngleDeg: Math.max(-90, Math.min(90, Math.round(deg))),
      }),
    ),
  setWatermarkOpacity: (pct) =>
    set((s) =>
      commitPageDecorPatch(s, {
        watermarkOpacity: Math.max(0, Math.min(100, Math.round(pct))),
      }),
    ),
  setWatermarkSize: (pct) =>
    set((s) =>
      commitPageDecorPatch(s, {
        watermarkSize: Math.max(10, Math.min(100, Math.round(pct))),
      }),
    ),
  setWatermarkLogoUrl: (url) =>
    set((s) => commitPageDecorPatch(s, { watermarkLogoUrl: url })),
  setShowPageFrame: (enabled) =>
    set((s) =>
      commitPageDecorPatch(s, { showPageFrame: enabled }, { syncLegacy: false }),
    ),
  setPageFrameColorMode: (mode) =>
    set((s) =>
      commitPageDecorPatch(s, { pageFrameColorMode: mode }, { syncLegacy: false }),
    ),
  setPageFrameColor: (color) =>
    set((s) =>
      commitPageDecorPatch(
        s,
        { pageFrameColor: color, pageFrameColorMode: "custom" },
        { syncLegacy: false },
      ),
    ),
  setPageFrameWidthPt: (pt) =>
    set((s) =>
      commitPageDecorPatch(
        s,
        {
          pageFrameWidthPt: Math.max(0.3, Math.min(6, Math.round(pt * 10) / 10)),
        },
        { syncLegacy: false },
      ),
    ),
  setPageFrameInnerGapMm: (mm) =>
    set((s) =>
      commitPageDecorPatch(
        s,
        {
          pageFrameInnerGapMm: Math.max(0, Math.min(20, Math.round(mm * 10) / 10)),
        },
        { syncLegacy: false },
      ),
    ),
  setPageFrameCornerRadiusMm: (mm) =>
    set((s) =>
      commitPageDecorPatch(
        s,
        {
          pageFrameCornerRadiusMm: Math.max(0, Math.min(15, Math.round(mm * 10) / 10)),
        },
        { syncLegacy: false },
      ),
    ),
  setPageFrameLineStyle: (style) =>
    set((s) =>
      commitPageDecorPatch(s, { pageFrameLineStyle: style }, { syncLegacy: false }),
    ),
  setScratchGridCornerRadiusPt: (pt) =>
    set({
      scratchGridCornerRadiusPt: clampScratchCornerRadiusPt(pt),
      isDirty: true,
    }),
  setScratchGridColorMode: (mode) =>
    set({
      scratchGridColorMode: normalizeScratchGridColorMode(mode),
      isDirty: true,
    }),
  setScratchGridColor: (color) =>
    set({
      scratchGridColor: normalizeScratchGridColorHex(color),
      scratchGridColorMode: "custom",
      isDirty: true,
    }),
  setQuestionAnswer: async (id, answer) => {
    const state = useEditorStore.getState();
    const q = state.questions.find((x) => x.id === id);
    if (q?.image_base64) {
      set((s) => ({
        questions: s.questions.map((x) => (x.id === id ? { ...x, answer_key: answer } : x)),
        isDirty: true,
      }));
      return;
    }
    try {
      const updated = await api.questions.updateAnswer(id, answer);
      set((s) => ({ questions: s.questions.map((x) => (x.id === id ? updated : x)), isDirty: true }));
    } catch (e) {
      console.error("Failed to update answer:", e);
    }
  },
  updateRemoveBackground: async (id, removeBackground) => {
    const state = useEditorStore.getState();
    const q = state.questions.find((x) => x.id === id);
    if (q?.image_base64) {
      set((s) => ({
        questions: s.questions.map((x) => (x.id === id ? { ...x, remove_background: removeBackground } : x)),
        isDirty: true,
      }));
      return;
    }
    try {
      const updated = await api.questions.updateRemoveBackground(id, removeBackground);
      set((s) => ({ questions: s.questions.map((x) => (x.id === id ? updated : x)), isDirty: true }));
    } catch (e) {
      console.error("Failed to update remove background:", e);
    }
  },
  removeQuestion: async (id) => {
    const dropFromStore = () => {
      const remaining = getStoredPendingSelections().filter((s) => s.id !== id);
      setStoredPendingSelections(remaining);
      set((s) => ({
        questions: s.questions
          .filter((x) => x.id !== id)
          .map((x, i) => ({ ...x, order_index: i })),
        isDirty: true,
      }));
    };

    // Electron questionStore’dan da sil (Geri Yükle / fetchQuestions geri getirmesin)
    try {
      await api.questions.delete(id);
    } catch {
      /* yerelde yoksa sorun değil */
    }

    dropFromStore();
  },
  clearAllQuestions: () => {
    setStoredPendingSelections([]);
    set({
      questions: [],
      isDirty: true,
      layoutYTopOverridesByQuestionIdPt: {},
      layoutPlacementOverridesByQuestionId: {},
    });
    void api.questions.clearAll().catch((e) => {
      console.warn("Electron soru deposu temizlenemedi:", e);
    });
  },
  updateQuestionImage: (id, imageBase64) => {
    const q = get().questions.find((x) => x.id === id);
    if (q) clearQuestionFontMeasureForDiag(q.order_index);
    set((s) => ({
      questions: s.questions.map((x) =>
        x.id === id
          ? {
              ...x,
              image_base64: imageBase64,
              fontMeasurementRevision: nextFontMeasurementRevision(x),
              ...resetFontNormalizationFields(x),
            }
          : x
      ),
      isDirty: true,
    }));
  },
  setQuestionFontReference: (id, reference) => {
    const q = get().questions.find((x) => x.id === id);
    if (!q) return;
    clearQuestionFontMeasureForDiag(q.order_index);
    set((s) => ({
      questions: s.questions.map((x) =>
        x.id === id
          ? {
              ...x,
              fontReference: reference,
              fontMeasurementRevision: nextFontMeasurementRevision(x),
              ...resetFontNormalizationFields(x),
            }
          : x
      ),
      isDirty: true,
    }));
  },
  flattenQuestionImageToSingleLayer: (id, imageBase64) => {
    const q = get().questions.find((x) => x.id === id);
    if (q) clearQuestionFontMeasureForDiag(q.order_index);
    set((s) => ({
      questions: s.questions.map((x) =>
        x.id === id
          ? {
              ...x,
              image_base64: imageBase64,
              image_underlay_b64: undefined,
              image_text_overlays: undefined,
              fontMeasurementRevision: nextFontMeasurementRevision(x),
              ...resetFontNormalizationFields(x),
            }
          : x
      ),
      isDirty: true,
    }));
  },
  addQuestionImageTextOverlay: (id, overlay, underlaySnapshotB64) => {
    const oid = overlay.id ?? globalThis.crypto?.randomUUID?.() ?? `ov-${Date.now()}`;
    const strip = (b: string) => b.replace(/^data:image\/png;base64,/, "");
    set((s) => {
      const q = s.questions.find((x) => x.id === id);
      if (!q) return s;
      const existing = q.image_text_overlays ?? [];
      const isFirst = existing.length === 0;
      const nextOv: QuestionImageTextOverlay[] = [
        ...existing,
        {
          id: oid,
          x: overlay.x,
          y: overlay.y,
          w: overlay.w,
          h: overlay.h,
          text: overlay.text,
          fontSizePx: overlay.fontSizePx,
        },
      ];
      return {
        questions: s.questions.map((x) => {
          if (x.id !== id) return x;
          if (isFirst) {
            const raw =
              (underlaySnapshotB64 ? strip(underlaySnapshotB64) : undefined) ??
              x.image_underlay_b64 ??
              x.image_base64;
            if (!raw) return x;
            return {
              ...x,
              image_underlay_b64: strip(raw),
              image_text_overlays: nextOv,
            };
          }
          return { ...x, image_text_overlays: nextOv };
        }),
        isDirty: true,
      };
    });
    void useEditorStore.getState().recomposeQuestionImage(id);
  },
  updateQuestionImageTextOverlay: (id, overlayId, patch, options) => {
    set((s) => ({
      questions: s.questions.map((x) => {
        if (x.id !== id) return x;
        const ov = (x.image_text_overlays ?? []).map((o) =>
          o.id === overlayId ? { ...o, ...patch } : o
        );
        return { ...x, image_text_overlays: ov };
      }),
      isDirty: true,
    }));
    if (!options?.skipRecompose) void useEditorStore.getState().recomposeQuestionImage(id);
  },
  removeQuestionImageTextOverlay: (id, overlayId) => {
    set((s) => {
      const q = s.questions.find((x) => x.id === id);
      if (!q) return s;
      const nextOv = (q.image_text_overlays ?? []).filter((o) => o.id !== overlayId);
      if (nextOv.length === 0) {
        const baseOnly = q.image_underlay_b64 ?? q.image_base64;
        return {
          questions: s.questions.map((x) =>
            x.id === id
              ? {
                  ...x,
                  image_base64: baseOnly ?? x.image_base64,
                  image_underlay_b64: undefined,
                  image_text_overlays: undefined,
                }
              : x
          ),
          isDirty: true,
        };
      }
      return {
        questions: s.questions.map((x) =>
          x.id === id ? { ...x, image_text_overlays: nextOv } : x
        ),
        isDirty: true,
      };
    });
    void useEditorStore.getState().recomposeQuestionImage(id);
  },
  recomposeQuestionImage: async (id) => {
    const q = useEditorStore.getState().questions.find((x) => x.id === id);
    if (!q?.image_base64 && !q?.image_underlay_b64) return;
    const underlay = q.image_underlay_b64 ?? q.image_base64;
    if (!underlay) return;
    const overlays = q.image_text_overlays ?? [];
    try {
      const composite =
        overlays.length === 0
          ? underlay.replace(/^data:image\/png;base64,/, "")
          : await compositeImageWithTextOverlays(underlay, overlays);
      clearQuestionFontMeasureForDiag(q.order_index);
      set((s) => ({
        questions: s.questions.map((x) =>
          x.id === id
            ? {
                ...x,
                image_base64: composite,
                fontMeasurementRevision: nextFontMeasurementRevision(x),
                ...resetFontNormalizationFields(x),
              }
            : x
        ),
        isDirty: true,
      }));
    } catch (e) {
      console.error("recomposeQuestionImage failed:", e);
    }
  },
  updateQuestionCrop: async (id, crop) => {
    const state = useEditorStore.getState();
    const q = state.questions.find((x) => x.id === id);
    const fontReference =
      q?.fontReference && isRectContained(q.fontReference.sourceRectNorm, crop)
        ? q.fontReference
        : undefined;
    if (q) clearQuestionFontMeasureForDiag(q.order_index);
    if (q?.image_base64) {
      set((s) => ({
        questions: s.questions.map((x) =>
          x.id === id
            ? {
                ...x,
                crop,
                fontReference,
                fontMeasurementRevision: nextFontMeasurementRevision(x),
                ...resetFontNormalizationFields(x),
              }
            : x
        ),
        isDirty: true,
      }));
      return;
    }
    try {
      const updated = await api.questions.updateCrop(id, crop);
      set((s) => ({
        questions: s.questions.map((x) =>
          x.id === id
            ? {
                ...updated,
                fontReference,
                fontMeasurementRevision: nextFontMeasurementRevision(x),
                ...resetFontNormalizationFields(x),
              }
            : x
        ),
        isDirty: true,
      }));
    } catch (e) {
      console.error("Failed to update question crop:", e);
    }
  },
  updateQuestionCropAndImage: (id, crop, imageBase64, capture) => {
    const q = get().questions.find((x) => x.id === id);
    if (!q) return;
    clearQuestionFontMeasureForDiag(q.order_index);
    const fontReference =
      q.fontReference && isRectContained(q.fontReference.sourceRectNorm, crop)
        ? q.fontReference
        : undefined;
    set((s) => ({
      questions: s.questions.map((x) =>
        x.id === id
          ? {
              ...x,
              crop,
              image_base64: imageBase64,
              capture: capture ?? x.capture,
              fontReference,
              fontMeasurementRevision: nextFontMeasurementRevision(x),
              ...resetFontNormalizationFields(x),
            }
          : x
      ),
      isDirty: true,
    }));
  },
  reorderQuestions: async (orderedIds) => {
    const state = useEditorStore.getState();
    const byId = Object.fromEntries(state.questions.map((q) => [q.id, q]));
    const reorderedLocal = orderedIds
      .map((id, i) => {
        const q = byId[id];
        if (!q) return null;
        return { ...q, order_index: i };
      })
      .filter((q): q is QuestionItem => q != null)
      .map((q, i) => ({ ...q, order_index: i }));

    // Görseller veya istemci-only boş fasikül kutuları varsa store’u ezme
    const keepLocal = state.questions.some(
      (q) => q.image_base64 || (q.fasikulEmptyRows ?? 0) > 0,
    );
    if (keepLocal) {
      set({ questions: reorderedLocal, isDirty: true });
      return;
    }
    try {
      const { items } = await api.questions.reorder(orderedIds);
      set({ questions: items, isDirty: true });
    } catch (e) {
      console.error("Failed to reorder:", e);
    }
  },
  swapQuestions: (indexA, indexB) =>
    set((state) => {
      if (indexA < 0 || indexB < 0 || indexA >= state.questions.length || indexB >= state.questions.length)
        return state;
      const arr = [...state.questions];
      [arr[indexA], arr[indexB]] = [arr[indexB], arr[indexA]];
      return {
        questions: arr.map((q, i) => ({ ...q, order_index: i })),
        isDirty: true,
      };
    }),
  insertQuestionAfter: (fromIndex, targetIndex) =>
    set((state) => {
      if (fromIndex < 0 || targetIndex < 0 || fromIndex >= state.questions.length || targetIndex >= state.questions.length)
        return state;
      const arr = [...state.questions];
      const [moved] = arr.splice(fromIndex, 1);
      const insertAt = fromIndex < targetIndex ? targetIndex : targetIndex + 1;
      arr.splice(Math.min(insertAt, arr.length), 0, moved);
      return {
        questions: arr.map((q, i) => ({ ...q, order_index: i })),
        isDirty: true,
      };
    }),
  setQuestionDisplayScale: (id, scale) => {
    set((s) => ({
      questions: s.questions.map((x) => {
        if (x.id !== id) return x;
        const norm = x.normalizationScale ?? 1;
        const manual = manualScaleForRequestedProduct(scale, norm);
        const product = syncDisplayScaleProduct(manual, norm);
        return {
          ...x,
          manualScale: manual,
          display_scale: product,
        };
      }),
      isDirty: true,
    }));
  },
  setQuestionsDisplayScale: (updates) => {
    set((s) => ({
      questions: s.questions.map((x) => {
        if (updates[x.id] == null) return x;
        const norm = x.normalizationScale ?? 1;
        const manual = manualScaleForRequestedProduct(updates[x.id]!, norm);
        const product = syncDisplayScaleProduct(manual, norm);
        return {
          ...x,
          manualScale: manual,
          display_scale: product,
        };
      }),
      isDirty: true,
    }));
  },
  setQuestionsBulkScales: (updates) => {
    set((s) => ({
      questions: s.questions.map((x) => {
        const u = updates[x.id];
        if (!u) return x;
        const normalizationScale =
          u.normalizationScale > 0 && Number.isFinite(u.normalizationScale)
            ? u.normalizationScale
            : x.normalizationScale != null && x.normalizationScale > 0
              ? x.normalizationScale
              : 1;
        const manualScale =
          u.manualScale > 0 && Number.isFinite(u.manualScale) ? u.manualScale : 1;
        const display_scale =
          u.display_scale > 0 && Number.isFinite(u.display_scale)
            ? u.display_scale
            : syncDisplayScaleProduct(manualScale, normalizationScale);
        return {
          ...x,
          manualScale,
          normalizationScale,
          display_scale,
        };
      }),
      isDirty: true,
    }));
  },
  setQuestionLayoutMode: (id, mode) =>
    set((s) => ({
      questions: s.questions.map((x) =>
        x.id === id
          ? { ...x, layoutMode: mode === 'auto' ? 'single-column' : mode }
          : x,
      ),
      isDirty: true,
    })),
  restoreQuestionsScaleSnapshot: (snapshot) =>
    set((s) => ({
      questions: s.questions.map((x) => {
        const snap = snapshot[x.id];
        if (!snap) return x;
        const manual = (snap as { manualScale?: number }).manualScale ?? 1;
        const norm =
          (snap as { normalizationScale?: number }).normalizationScale ??
          snap.display_scale ??
          1;
        return {
          ...x,
          manualScale: manual,
          normalizationScale: norm,
          display_scale: syncDisplayScaleProduct(manual, norm),
          ocr_font_matched: snap.ocr_font_matched ?? false,
          font_line_px: snap.font_line_px,
          detected_font_px: (snap as { detected_font_px?: number | null }).detected_font_px,
        };
      }),
      isDirty: true,
    })),
  applyQuestionLineHeightMatch: async (opts) => {
    const state = get();
    if (state.fontEqualizeInProgress) {
      return { matched: 0, total: state.questions.length };
    }
    set({ fontEqualizeInProgress: true });
    try {
      const target = clampTargetQuestionLinePt(
        opts?.targetLinePt ?? state.targetQuestionLinePt ?? DEFAULT_TARGET_QUESTION_LINE_PT,
      );
      const withImage = state.questions.filter((q) => q.image_base64);
      const updates: Record<
        string,
        { manualScale: number; normalizationScale: number; display_scale: number }
      > = {};
      const detectedById: Record<string, number> = {};
      let matched = 0;

      for (const q of withImage) {
        const imageData = await loadImageDataFromBase64(q.image_base64!);
        if (!imageData) continue;
        const measured = estimateCanonicalFontHeightFromRgba(
          imageData.data,
          imageData.width,
          imageData.height,
        );
        if (!measured.ok) continue;

        const native = nativeSizePtFromCapture(
          q.capture,
          imageData.width,
          imageData.height,
          q.order_index,
        );
        const ppp =
          native.pixelsPerPdfPoint > 0 ? native.pixelsPerPdfPoint : LEGACY_LAYOUT_ZOOM;
        const detectedFontPt = measured.value.canonicalPx / ppp;
        if (!(detectedFontPt > 0)) continue;

        let normalizationScale = clampFontEqualizeScale(target / detectedFontPt);
        if (opts?.availWPt != null && opts.availWPt > 0 && native.nativeWidthPt > 0) {
          const maxByWidth = opts.availWPt / native.nativeWidthPt;
          if (Number.isFinite(maxByWidth) && maxByWidth > 0) {
            normalizationScale = Math.min(normalizationScale, maxByWidth);
            normalizationScale = clampFontEqualizeScale(normalizationScale);
          }
        }

        const manualScale = 1;
        updates[q.id] = {
          manualScale,
          normalizationScale,
          display_scale: syncDisplayScaleProduct(manualScale, normalizationScale),
        };
        detectedById[q.id] = measured.value.canonicalPx;
        matched++;
      }

      if (Object.keys(updates).length > 0) {
        set((s) => ({
          targetQuestionLinePt: target,
          questions: s.questions.map((x) => {
            const u = updates[x.id];
            if (!u) return x;
            return {
              ...x,
              ...u,
              detected_font_px: detectedById[x.id] ?? x.detected_font_px,
              ocr_font_matched: true,
              fontMeasurementRevision: nextFontMeasurementRevision(x),
            };
          }),
          isDirty: true,
        }));
      }

      return { matched, total: withImage.length || state.questions.length };
    } finally {
      set({ fontEqualizeInProgress: false });
    }
  },
  setQuestionCustomGapMm: (id, gapMm) =>
    set((s) => ({
      questions: s.questions.map((x) => (x.id === id ? { ...x, custom_gap_mm: gapMm ?? undefined } : x)),
      isDirty: true,
    })),
  setQuestionContentType: async (id, contentType) => {
    const state = useEditorStore.getState();
    const q = state.questions.find((x) => x.id === id);
    if (!q) return;
    if (q.image_base64) {
      set((s) => ({
        questions: s.questions.map((x) => (x.id === id ? { ...x, content_type: contentType } : x)),
        isDirty: true,
      }));
      return;
    }
    try {
      const updated = await api.questions.updateContentType(id, contentType);
      set((s) => ({ questions: s.questions.map((x) => (x.id === id ? updated : x)), isDirty: true }));
    } catch (e) {
      console.error("Failed to update content type:", e);
      set((s) => ({
        questions: s.questions.map((x) => (x.id === id ? { ...x, content_type: contentType } : x)),
        isDirty: true,
      }));
    }
  },
  setQuestionExplanationCaption: async (id, patch) => {
    const state = useEditorStore.getState();
    const q = state.questions.find((x) => x.id === id);
    if (!q) return;
    const body = {
      explanation_caption_enabled: patch.explanation_caption_enabled ?? q.explanation_caption_enabled ?? false,
      explanation_caption_text: patch.explanation_caption_text ?? q.explanation_caption_text ?? "",
      explanation_caption_align: (patch.explanation_caption_align ??
        q.explanation_caption_align ??
        "left") as ExplanationCaptionAlign,
      explanation_caption_placement: (patch.explanation_caption_placement ??
        q.explanation_caption_placement ??
        "above") as ExplanationCaptionPlacement,
      explanation_caption_side_flow: (patch.explanation_caption_side_flow ??
        q.explanation_caption_side_flow ??
        "horizontal") as ExplanationCaptionSideFlow,
      explanation_caption_color: patch.explanation_caption_color ?? q.explanation_caption_color ?? "#0f172a",
      explanation_caption_bold: patch.explanation_caption_bold ?? q.explanation_caption_bold ?? false,
      explanation_caption_italic: patch.explanation_caption_italic ?? q.explanation_caption_italic ?? false,
      explanation_caption_font_pt: Number(
        patch.explanation_caption_font_pt ?? q.explanation_caption_font_pt ?? 9
      ),
      explanation_caption_box_enabled:
        patch.explanation_caption_box_enabled ?? q.explanation_caption_box_enabled ?? false,
      explanation_caption_box_color: patch.explanation_caption_box_color ?? q.explanation_caption_box_color ?? "#f1f5f9",
      explanation_caption_box_corner: (patch.explanation_caption_box_corner ??
        q.explanation_caption_box_corner ??
        "rounded") as ExplanationCaptionBoxCorner,
      explanation_caption_box_width: (patch.explanation_caption_box_width ??
        q.explanation_caption_box_width ??
        "full") as ExplanationCaptionBoxWidth,
    };
    const merged: QuestionItem = { ...q, ...body };
    if (q.image_base64) {
      set((s) => ({
        questions: s.questions.map((x) => (x.id === id ? merged : x)),
        isDirty: true,
      }));
      return;
    }
    try {
      const updated = await api.questions.updateExplanationCaption(id, body);
      set((s) => ({ questions: s.questions.map((x) => (x.id === id ? updated : x)), isDirty: true }));
    } catch (e) {
      console.error("Failed to update explanation caption:", e);
      set((s) => ({
        questions: s.questions.map((x) => (x.id === id ? merged : x)),
        isDirty: true,
      }));
    }
  },
  setQuestionFasikulFrame: (id, frame) => {
    const normalized = normalizeFasikulQuestionFrame(frame);
    set((s) => ({
      questions: s.questions.map((x) =>
        x.id === id ? { ...x, fasikulFrame: normalized } : x,
      ),
      isDirty: true,
    }));
  },
  applyFasikulFrameToQuestions: (questionIds, frame) => {
    const normalized = normalizeFasikulQuestionFrame(frame);
    const idSet = new Set(questionIds);
    if (idSet.size === 0) return;
    set((s) => ({
      questions: s.questions.map((x) =>
        idSet.has(x.id) ? { ...x, fasikulFrame: normalized } : x,
      ),
      isDirty: true,
    }));
  },
  setQuestionScratchGridRows: (id, rows) =>
    set((s) => ({
      questions: s.questions.map((x) => {
        if (x.id !== id) return x;
        if (rows == null || !Number.isFinite(rows) || rows < 1) {
          const { scratchGridRows: _removed, ...rest } = x;
          void _removed;
          return rest;
        }
        return { ...x, scratchGridRows: Math.round(rows) };
      }),
      isDirty: true,
    })),
  insertEmptyFasikulFrameAfter: (afterOrderIndex, presetId) => {
    const state = get();
    const sorted = [...state.questions].sort(
      (a, b) => a.order_index - b.order_index,
    );
    const afterIdx = sorted.findIndex((q) => q.order_index === afterOrderIndex);
    if (afterIdx < 0) return null;

    const frame = {
      ...applyFasikulPreset(DEFAULT_FASIKUL_QUESTION_FRAME, presetId),
      enabled: true,
      showScratchGrid: false,
    };
    const newId = crypto.randomUUID();
    const insertAt = afterIdx + 1;
    const item: QuestionItem = {
      id: newId,
      pdf_id: "",
      page_number: 1,
      crop: { x: 0, y: 0, width: 1, height: 1 },
      answer_key: "",
      order_index: insertAt,
      content_type: "explanation",
      remove_background: false,
      /** İçi boş — görsel bağlanmaz */
      fasikulFrame: normalizeFasikulQuestionFrame(frame),
      fasikulEmptyRows: FASIKUL_EMPTY_BOX_ROWS,
    };

    const next = [
      ...sorted.slice(0, insertAt),
      item,
      ...sorted.slice(insertAt),
    ].map((q, i) => ({ ...q, order_index: i }));

    set({ questions: next, isDirty: true });
    return newId;
  },
  setSections: (sections) => set({ sections, isDirty: true }),
  addSection: (section) =>
    set((s) => ({ sections: [...s.sections, section], isDirty: true })),
  updateSection: (index, section) =>
    set((s) => ({
      sections: s.sections.map((sec, i) => (i === index ? section : sec)),
      isDirty: true,
    })),
  removeSection: (index) =>
    set((s) => ({
      sections: s.sections.filter((_, i) => i !== index),
      isDirty: true,
    })),
  addQuestion: (item) =>
    set((state) => ({ questions: [...state.questions, item], isDirty: true })),
  addQuestionsToWorkingDraft: (items) =>
    set((state) => ({
      questions: [...state.questions, ...items],
      isDirty: true,
    })),
  setQuestions: (items) => set({ questions: items, isDirty: false }),
  setDirty: (dirty) => set({ isDirty: dirty }),
  setPersistedDraftName: (name) => set({ persistedDraftName: name }),
  applyDraftPayload: (draft) => {
    set((state) => {
      const es = draft.editor_state;
      const testInfo = draft.test_info;
      const exportSettings = draft.export_settings;
      const legacyWrittenSpacing =
        es?.writtenPaperOptions &&
        typeof es.writtenPaperOptions === "object" &&
        (es.writtenPaperOptions as { addSpacingBetweenQuestions?: boolean }).addSpacingBetweenQuestions === true;
      return {
        questions: draft.questions,
        persistedDraftName: draft.name,
        isDirty: false,
        testName: es?.testName ?? testInfo?.test_title ?? testInfo?.test_name ?? state.testName,
        schoolName: es?.schoolName ?? testInfo?.school_name ?? state.schoolName,
        trialExamCode: es?.trialExamCode ?? state.trialExamCode,
        trialBookletLabel: es?.trialBookletLabel ?? state.trialBookletLabel,
        trialExamCodeFontPt: es?.trialExamCodeFontPt ?? state.trialExamCodeFontPt,
        trialExamCodeColor: es?.trialExamCodeColor ?? state.trialExamCodeColor,
        trialExamCodeAlign: es?.trialExamCodeAlign ?? state.trialExamCodeAlign,
        trialExamCodePadLeftPt: es?.trialExamCodePadLeftPt ?? state.trialExamCodePadLeftPt,
        trialBookletFontPt: es?.trialBookletFontPt ?? state.trialBookletFontPt,
        trialBookletColor: es?.trialBookletColor ?? state.trialBookletColor,
        trialTestNameBgOpacityPct:
          es?.trialTestNameBgOpacityPct ?? state.trialTestNameBgOpacityPct,
        trialTestNameBgColor: es?.trialTestNameBgColor ?? state.trialTestNameBgColor,
        trialBrandName:
          es?.trialBrandName ??
          es?.moduleLayouts?.trial?.headerConfig?.brandName ??
          (es?.activeLayoutModule === "trial"
            ? es?.headerConfig?.brandName
            : undefined) ??
          state.trialBrandName,
        trialBrandNameVisible:
          es?.trialBrandNameVisible ??
          (es?.moduleLayouts?.trial?.headerConfig?.fieldHidden?.brandName === true
            ? false
            : es?.headerConfig?.fieldHidden?.brandName === true
              ? false
              : undefined) ??
          state.trialBrandNameVisible,
        options: es?.options
          ? {
              ...state.options,
              ...es.options,
              ...(legacyWrittenSpacing && es.options.addSpacingBetweenQuestions === undefined
                ? { addSpacingBetweenQuestions: true }
                : {}),
            }
          : exportSettings
            ? {
                ...state.options,
                includeAnswerKey: exportSettings.include_answer_key ?? state.options.includeAnswerKey,
                addSpacingBetweenQuestions: exportSettings.add_spacing ?? state.options.addSpacingBetweenQuestions,
                includeDescription: exportSettings.include_description ?? state.options.includeDescription,
                addTextOnLine: exportSettings.add_text_on_line ?? state.options.addTextOnLine,
              }
            : state.options,
        questionGapMm: es?.questionGapMm ?? state.questionGapMm,
        questionGapMinMm: es?.questionGapMinMm ?? state.questionGapMinMm,
        autoCompactSpacing: es?.autoCompactSpacing ?? state.autoCompactSpacing,
        headerStyleId: es?.headerStyleId ?? state.headerStyleId,
        headerBottomGapMm: es?.headerBottomGapMm ?? state.headerBottomGapMm,
        otherPageHeaderBottomGapMm:
          es?.otherPageHeaderBottomGapMm ?? state.otherPageHeaderBottomGapMm,
        questionNumberLeftOffsetMm:
          es?.questionNumberLeftOffsetMm ?? state.questionNumberLeftOffsetMm,
        questionNumberImageGapMm:
          es?.questionNumberImageGapMm ?? state.questionNumberImageGapMm,
        questionNumberingEnabled:
          es?.questionNumberingEnabled ?? state.questionNumberingEnabled,
        questionNumberStart: es?.questionNumberStart ?? state.questionNumberStart,
        questionNumberColorMode:
          es?.questionNumberColorMode ?? state.questionNumberColorMode,
        questionNumberFontPt: es?.questionNumberFontPt ?? state.questionNumberFontPt,
        pageNumberingEnabled: es?.pageNumberingEnabled ?? state.pageNumberingEnabled,
        pageNumberStart: es?.pageNumberStart ?? state.pageNumberStart,
        pageNumberFormat: es?.pageNumberFormat ?? state.pageNumberFormat,
        headerConfig: es?.headerConfig
          ? { ...defaultHeaderConfig(), ...es.headerConfig }
          : state.headerConfig,
        headerTemplates: es?.headerTemplates ?? state.headerTemplates,
        themeColor: es?.themeColor ?? state.themeColor,
        activeLayoutModule: (() => {
          const fromEs = es?.activeLayoutModule;
          if (fromEs === "test" || fromEs === "trial" || fromEs === "fasikul") return fromEs;
          return paperLayoutModuleFromTab(es?.activeTab) ?? state.activeLayoutModule;
        })(),
        moduleLayouts: (() => {
          const liveSnap = captureModuleLayout({
            headerStyleId: es?.headerStyleId ?? state.headerStyleId,
            headerConfig: es?.headerConfig
              ? { ...defaultHeaderConfig(), ...es.headerConfig }
              : state.headerConfig,
            themeColor: es?.themeColor ?? state.themeColor,
            options: {
              includeDescription:
                es?.options?.includeDescription ??
                exportSettings?.include_description ??
                state.options.includeDescription,
            },
            testDescription: es?.testDescription ?? state.testDescription,
            descriptionColumnCount: es?.descriptionColumnCount ?? state.descriptionColumnCount,
            descriptionTexts: es?.descriptionTexts ?? state.descriptionTexts,
            descriptionColumnDividers:
              es?.descriptionColumnDividers ?? state.descriptionColumnDividers,
            descriptionBoxPadYPt: es?.descriptionBoxPadYPt ?? state.descriptionBoxPadYPt,
            descriptionBoxPadXPt: es?.descriptionBoxPadXPt ?? state.descriptionBoxPadXPt,
            showColumnDivider: es?.showColumnDivider ?? state.showColumnDivider,
            columnDividerText: es?.columnDividerText ?? state.columnDividerText,
            columnDividerWidthPt: es?.columnDividerWidthPt ?? state.columnDividerWidthPt,
            showColumnDividerText:
              es?.showColumnDividerText ??
              (es?.options?.addTextOnLine ?? state.showColumnDividerText),
            centerLineBold: es?.centerLineBold ?? state.centerLineBold,
            centerLineItalic: es?.centerLineItalic ?? state.centerLineItalic,
            showWatermark: es?.showWatermark ?? state.showWatermark,
            watermarkText: es?.watermarkText ?? state.watermarkText,
            watermarkLayout: es?.watermarkLayout ?? state.watermarkLayout,
            watermarkAngleDeg: es?.watermarkAngleDeg ?? state.watermarkAngleDeg,
            watermarkOpacity: es?.watermarkOpacity ?? state.watermarkOpacity,
            watermarkSize: es?.watermarkSize ?? state.watermarkSize,
            watermarkLogoUrl: es?.watermarkLogoUrl ?? state.watermarkLogoUrl,
            showPageFrame: es?.showPageFrame ?? state.showPageFrame,
            pageFrameColorMode: es?.pageFrameColorMode ?? state.pageFrameColorMode,
            pageFrameColor: es?.pageFrameColor ?? state.pageFrameColor,
            pageFrameWidthPt: es?.pageFrameWidthPt ?? state.pageFrameWidthPt,
            pageFrameInnerGapMm: es?.pageFrameInnerGapMm ?? state.pageFrameInnerGapMm,
            pageFrameCornerRadiusMm:
              es?.pageFrameCornerRadiusMm ?? state.pageFrameCornerRadiusMm,
            pageFrameLineStyle: es?.pageFrameLineStyle ?? state.pageFrameLineStyle,
          });
          const tabMod = paperLayoutModuleFromTab(es?.activeTab);
          const raw = es?.moduleLayouts;
          if (raw && typeof raw === "object") {
            const ensured = ensureModuleLayouts(raw);
            if (tabMod) {
              return { ...ensured, [tabMod]: liveSnap };
            }
            return ensured;
          }
          if (tabMod === "trial") {
            return {
              test: defaultTestModuleLayout(),
              trial: liveSnap,
              fasikul: defaultFasikulModuleLayout(),
            };
          }
          if (tabMod === "fasikul") {
            return {
              test: defaultTestModuleLayout(),
              trial: defaultTrialModuleLayout(),
              fasikul: liveSnap,
            };
          }
          return {
            test: liveSnap,
            trial: defaultTrialModuleLayout(),
            fasikul: defaultFasikulModuleLayout(),
          };
        })(),
        sections: es?.sections ?? state.sections,
        testDescription: es?.testDescription ?? state.testDescription,
        descriptionColumnCount: es?.descriptionColumnCount ?? (es?.testDescription != null ? 1 : state.descriptionColumnCount),
        descriptionTexts: es?.descriptionTexts ?? (es?.testDescription != null ? [es.testDescription] : state.descriptionTexts),
        // Alan yoksa çizgi kapalı (eski taslaklar); editor_state yoksa mevcut oturumu koru
        descriptionColumnDividers: es
          ? Boolean(es.descriptionColumnDividers)
          : state.descriptionColumnDividers,
        descriptionBoxPadYPt:
          es?.descriptionBoxPadYPt != null
            ? Math.max(2, Math.min(28, Number(es.descriptionBoxPadYPt)))
            : state.descriptionBoxPadYPt,
        descriptionBoxPadXPt:
          es?.descriptionBoxPadXPt != null
            ? Math.max(2, Math.min(28, Number(es.descriptionBoxPadXPt)))
            : state.descriptionBoxPadXPt,
        answerKeyMode: es?.answerKeyMode ?? state.answerKeyMode,
        optikFormEnabled: es?.optikFormEnabled ?? state.optikFormEnabled,
        optikFormPlacement: es?.optikFormPlacement ?? state.optikFormPlacement,
        optikFormOptionCount: es?.optikFormOptionCount ?? state.optikFormOptionCount,
        optikFormBookletType: es?.optikFormBookletType ?? state.optikFormBookletType,
        optikFormNetRule: es?.optikFormNetRule ?? state.optikFormNetRule,
        optikFormInstructionEnabled:
          es?.optikFormInstructionEnabled ?? state.optikFormInstructionEnabled,
        optikFormInstructionText: es?.optikFormInstructionText ?? state.optikFormInstructionText,
        optikFormOffsetYPt:
          es?.optikFormOffsetYPt != null && Number.isFinite(Number(es.optikFormOffsetYPt))
            ? Number(es.optikFormOffsetYPt)
            : state.optikFormOffsetYPt,
        footerInfoText: es?.footerInfoText ?? state.footerInfoText,
        centerLineText: es?.centerLineText ?? state.centerLineText,
        centerLineBold: es?.centerLineBold ?? state.centerLineBold,
        centerLineItalic: es?.centerLineItalic ?? state.centerLineItalic,
        centerLineTextDirection: es?.centerLineTextDirection ?? state.centerLineTextDirection,
        examType: es?.examType ?? state.examType,
        classSection: es?.classSection ?? state.classSection,
        group: es?.group ?? state.group,
        writtenPaperOptions: es?.writtenPaperOptions
          ? {
              addTeacherName:
                es.writtenPaperOptions.addTeacherName ?? state.writtenPaperOptions.addTeacherName,
            }
          : state.writtenPaperOptions,
        teacherNames: es?.teacherNames ?? state.teacherNames,
        writtenHeaderFieldLines: es?.writtenHeaderFieldLines
          ? {
              ...emptyWrittenHeaderFieldLines(),
              ...es.writtenHeaderFieldLines,
            }
          : state.writtenHeaderFieldLines,
        writtenHeaderFieldLabels: es?.writtenHeaderFieldLabels
          ? {
              ...emptyWrittenHeaderFieldLabels(),
              ...es.writtenHeaderFieldLabels,
            }
          : state.writtenHeaderFieldLabels,
        writtenHeaderFieldHidden: es?.writtenHeaderFieldHidden
          ? {
              ...emptyWrittenHeaderFieldHidden(),
              ...es.writtenHeaderFieldHidden,
            }
          : state.writtenHeaderFieldHidden,
        customExamTypes: es?.customExamTypes ?? state.customExamTypes,
        paperSize: es?.paperSize ?? state.paperSize,
        paperWidthMm: es?.paperWidthMm ?? state.paperWidthMm,
        paperHeightMm: es?.paperHeightMm ?? state.paperHeightMm,
        orientation: es?.orientation ?? state.orientation,
        columns: es?.columns ?? state.columns,
        targetQuestionLinePt:
          es?.targetQuestionLinePt != null
            ? clampTargetQuestionLinePt(es.targetQuestionLinePt)
            : state.targetQuestionLinePt,
        allowSlightOverflow: false,
        marginTopMm: es?.marginTopMm ?? state.marginTopMm,
        marginBottomMm: es?.marginBottomMm ?? state.marginBottomMm,
        marginLeftMm: es?.marginLeftMm ?? state.marginLeftMm,
        marginRightMm: es?.marginRightMm ?? state.marginRightMm,
        watermarkEnabled: es?.watermarkEnabled ?? state.watermarkEnabled,
        watermarkSettings: es?.watermarkSettings ?? state.watermarkSettings,
        showColumnDivider: es?.showColumnDivider ?? state.showColumnDivider,
        columnDividerText: es?.columnDividerText ?? es?.centerLineText ?? state.columnDividerText,
        columnDividerColor: es?.columnDividerColor ?? state.columnDividerColor,
        columnDividerWidthPt: es?.columnDividerWidthPt ?? state.columnDividerWidthPt,
        showColumnDividerText:
          es?.showColumnDividerText ??
          (es?.options?.addTextOnLine ?? state.showColumnDividerText),
        showWatermark: es?.showWatermark ?? es?.watermarkEnabled ?? state.showWatermark,
        watermarkText:
          es?.watermarkText ?? es?.watermarkSettings?.text ?? state.watermarkText,
        watermarkLayout: es?.watermarkLayout ?? state.watermarkLayout,
        watermarkAngleDeg:
          es?.watermarkAngleDeg ??
          es?.watermarkSettings?.textAngleDeg ??
          state.watermarkAngleDeg,
        watermarkOpacity:
          es?.watermarkOpacity ??
          es?.watermarkSettings?.textOpacityPct ??
          state.watermarkOpacity,
        watermarkSize:
          es?.watermarkSize ?? es?.watermarkSettings?.textSizePct ?? state.watermarkSize,
        watermarkLogoUrl:
          es?.watermarkLogoUrl ??
          (es?.watermarkSettings?.imageBase64
            ? `data:image/png;base64,${es.watermarkSettings.imageBase64}`
            : state.watermarkLogoUrl),
        showPageFrame: es?.showPageFrame ?? state.showPageFrame,
        pageFrameColorMode: es?.pageFrameColorMode ?? state.pageFrameColorMode,
        pageFrameColor: es?.pageFrameColor ?? state.pageFrameColor,
        pageFrameWidthPt: es?.pageFrameWidthPt ?? state.pageFrameWidthPt,
        pageFrameInnerGapMm:
          es?.pageFrameInnerGapMm ??
          es?.pageFrameMarginMm ??
          es?.pageFramePaddingMm ??
          state.pageFrameInnerGapMm,
        pageFrameCornerRadiusMm: es?.pageFrameCornerRadiusMm ?? state.pageFrameCornerRadiusMm,
        pageFrameLineStyle: es?.pageFrameLineStyle ?? state.pageFrameLineStyle,
        scratchGridCornerRadiusPt:
          es?.scratchGridCornerRadiusPt != null
            ? clampScratchCornerRadiusPt(es.scratchGridCornerRadiusPt)
            : state.scratchGridCornerRadiusPt,
        scratchGridColorMode:
          es?.scratchGridColorMode != null
            ? normalizeScratchGridColorMode(es.scratchGridColorMode)
            : state.scratchGridColorMode,
        scratchGridColor:
          es?.scratchGridColor != null
            ? normalizeScratchGridColorHex(es.scratchGridColor)
            : state.scratchGridColor,
      };
    });
    set((s) => ({ ...s, ...syncVisualLegacyFields(s) }));
  },
  fetchQuestions: async () => {
    try {
      const { items } = await api.questions.list();
      set((state) => {
        const virtual = state.questions.filter((q) => q.image_base64);
        const fromBackend = items.filter((b) => !virtual.some((v) => v.id === b.id));
        const merged = [...virtual, ...fromBackend].sort((a, b) => a.order_index - b.order_index);
        return {
          questions: merged.map((q, i) => ({ ...q, order_index: i })),
          questionsLoaded: true,
          isDirty: virtual.length > 0,
        };
      });
    } catch (e) {
      console.error("Failed to fetch questions:", e);
      set({ questionsLoaded: true });
    }
  },
  setOpenModal: (key) => set({ openModal: key }),
}));
