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
  SectionRange,
} from "../types";
import {
  clampTargetQuestionLinePt,
  DEFAULT_TARGET_QUESTION_LINE_PT,
  displayScaleForTargetLinePt,
  isOptionFontSource,
  measureQuestionFontScale,
  questionImageToDataUrl,
  resolveMatchedLinePx,
} from "../utils/normalizeQuestionFont";
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
   * true (varsayılan): sütun taşmasında native genişliğin %80 altına inme (hafif taşma).
   * false: katı availW.
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
  setOpticalFormSettings: (settings: OpticalFormSettings) => void;
  setFooterInfoText: (value: string) => void;
  setCenterLineText: (value: string) => void;
  setCenterLineBold: (value: boolean) => void;
  setCenterLineItalic: (value: boolean) => void;
  setCenterLineTextDirection: (dir: "up" | "down") => void;
  setHeaderStyleId: (id: string) => void;
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
  /** Önizleme ilk açılış ölçeklerine dön */
  restoreQuestionsScaleSnapshot: (
    snapshot: Record<
      string,
      { display_scale: number; ocr_font_matched?: boolean; font_line_px?: number }
    >,
  ) => void;
  /** OCR ile satır yüksekliğini ölçer; tüm testlerde aynı hedef puntoya ölçekler */
  applyQuestionLineHeightMatch: (opts?: {
    availWPt?: number;
    targetLinePt?: number;
  }) => Promise<{ matched: number; total: number }>;
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
  setSections: (sections: SectionRange[]) => void;
  addSection: (section: SectionRange) => void;
  updateSection: (index: number, section: SectionRange) => void;
  removeSection: (index: number) => void;
  updateQuestionImage: (id: string, imageBase64: string) => void;
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
    sections?: SectionRange[];
    testDescription?: string;
    descriptionColumnCount?: 1 | 2 | 3;
    descriptionTexts?: string[];
    descriptionColumnDividers?: boolean;
    answerKeyMode?: AnswerKeyMode;
    optikFormEnabled?: boolean;
    optikFormPlacement?: AnswerKeyMode;
    optikFormOptionCount?: OptikFormOptionCount;
    optikFormBookletType?: OptikFormBookletType;
    optikFormNetRule?: OptikFormNetRule;
    optikFormInstructionEnabled?: boolean;
    optikFormInstructionText?: string;
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

export const useEditorStore = create<EditorState>((set, get) => ({
  activeTab: "test-paper",
  tabBeforeSettings: null,
  testName: "",
  schoolName: "",
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
  footerInfoText: "",
  centerLineText: "SERKAN DOKSANBİR",
  centerLineBold: false,
  centerLineItalic: false,
  centerLineTextDirection: "up",
  headerStyleId: "style_1",
  headerConfig: defaultHeaderConfig(),
  headerTemplates: [],
  themeColor: "#1E88E5",
  paperSize: "A4 (210 x 297 mm)",
  paperWidthMm: 210,
  paperHeightMm: 297,
  orientation: "portrait",
  columns: 2,
  targetQuestionLinePt: DEFAULT_TARGET_QUESTION_LINE_PT,
  allowSlightOverflow: true,
  marginTopMm: 15,
  marginBottomMm: 15,
  marginLeftMm: 15,
  marginRightMm: 15,
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
  setActiveTab: (tab) => set({ activeTab: tab }),
  setTabBeforeSettings: (tab) => set({ tabBeforeSettings: tab }),
  setTestName: (value) => set({ testName: value }),
  setSchoolName: (value) => set({ schoolName: value }),
  setExamType: (value) => set({ examType: value }),
  setClassSection: (value) => set({ classSection: value }),
  setGroup: (value) => set({ group: value }),
  addCustomExamType: (name) =>
    set((state) => ({
      customExamTypes: [...state.customExamTypes, name],
      examType: name,
    })),
  toggleOption: (key) =>
    set((state) => ({
      options: { ...state.options, [key]: !state.options[key] },
    })),
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
    set({
      descriptionColumnCount: count,
      descriptionTexts: texts,
      testDescription: texts[0] ?? "",
      descriptionColumnDividers: descriptionColumnDividers === true,
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
  setAnswerKeyMode: (mode) => set({ answerKeyMode: mode, isDirty: true }),
  setOptikFormEnabled: (enabled) => set({ optikFormEnabled: enabled, isDirty: true }),
  setOptikFormPlacement: (mode) => set({ optikFormPlacement: mode, isDirty: true }),
  setOptikFormOptionCount: (value) => set({ optikFormOptionCount: value, isDirty: true }),
  setOptikFormBookletType: (value) => set({ optikFormBookletType: value, isDirty: true }),
  setOptikFormNetRule: (value) => set({ optikFormNetRule: value, isDirty: true }),
  setOptikFormInstructionEnabled: (enabled) =>
    set({ optikFormInstructionEnabled: enabled, isDirty: true }),
  setOptikFormInstructionText: (text) => set({ optikFormInstructionText: text, isDirty: true }),
  setOpticalFormSettings: (settings) =>
    set({ ...applyOpticalFormSettings(settings), isDirty: true }),
  setFooterInfoText: (value) => set({ footerInfoText: value, isDirty: true }),
  setCenterLineText: (value) => set({ centerLineText: value }),
  setCenterLineBold: (value) => set({ centerLineBold: value }),
  setCenterLineItalic: (value) => set({ centerLineItalic: value }),
  setCenterLineTextDirection: (dir) => set({ centerLineTextDirection: dir }),
  setHeaderStyleId: (id) => set({ headerStyleId: id }),
  updateHeaderConfig: (partial) =>
    set((s) => ({
      headerConfig: {
        ...s.headerConfig,
        ...partial,
        fieldFontSizesPt: partial.fieldFontSizesPt
          ? { ...(s.headerConfig.fieldFontSizesPt ?? {}), ...partial.fieldFontSizesPt }
          : (s.headerConfig.fieldFontSizesPt ?? {}),
        fieldColors: partial.fieldColors
          ? { ...(s.headerConfig.fieldColors ?? {}), ...partial.fieldColors }
          : (s.headerConfig.fieldColors ?? {}),
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
      },
      isDirty: true,
    })),
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
    set((s) => {
      const next = { ...s, showColumnDivider: enabled, isDirty: true };
      return { ...next, ...syncVisualLegacyFields(next) };
    }),
  setColumnDividerText: (text) =>
    set((s) => {
      const next = { ...s, columnDividerText: text, isDirty: true };
      return { ...next, ...syncVisualLegacyFields(next) };
    }),
  setColumnDividerColor: (color) => set({ columnDividerColor: color, isDirty: true }),
  setColumnDividerWidthPt: (pt) =>
    set({
      columnDividerWidthPt: Math.max(0.3, Math.min(4, Math.round(pt * 10) / 10)),
      isDirty: true,
    }),
  setShowColumnDividerText: (enabled) =>
    set((s) => {
      const next = { ...s, showColumnDividerText: enabled, isDirty: true };
      return { ...next, ...syncVisualLegacyFields(next) };
    }),
  setShowWatermark: (enabled) =>
    set((s) => {
      const next = { ...s, showWatermark: enabled, isDirty: true };
      return { ...next, ...syncVisualLegacyFields(next) };
    }),
  setWatermarkText: (text) =>
    set((s) => {
      const next = { ...s, watermarkText: text, isDirty: true };
      return { ...next, ...syncVisualLegacyFields(next) };
    }),
  setWatermarkLayout: (layout) =>
    set((s) => {
      const next = { ...s, watermarkLayout: layout, isDirty: true };
      return { ...next, ...syncVisualLegacyFields(next) };
    }),
  setWatermarkAngleDeg: (deg) =>
    set((s) => {
      const next = {
        ...s,
        watermarkAngleDeg: Math.max(-90, Math.min(90, Math.round(deg))),
        isDirty: true,
      };
      return { ...next, ...syncVisualLegacyFields(next) };
    }),
  setWatermarkOpacity: (pct) =>
    set((s) => {
      const next = {
        ...s,
        watermarkOpacity: Math.max(0, Math.min(100, Math.round(pct))),
        isDirty: true,
      };
      return { ...next, ...syncVisualLegacyFields(next) };
    }),
  setWatermarkSize: (pct) =>
    set((s) => {
      const next = {
        ...s,
        watermarkSize: Math.max(10, Math.min(100, Math.round(pct))),
        isDirty: true,
      };
      return { ...next, ...syncVisualLegacyFields(next) };
    }),
  setWatermarkLogoUrl: (url) =>
    set((s) => {
      const next = { ...s, watermarkLogoUrl: url, isDirty: true };
      return { ...next, ...syncVisualLegacyFields(next) };
    }),
  setShowPageFrame: (enabled) => set({ showPageFrame: enabled, isDirty: true }),
  setPageFrameColorMode: (mode) => set({ pageFrameColorMode: mode, isDirty: true }),
  setPageFrameColor: (color) =>
    set({ pageFrameColor: color, pageFrameColorMode: "custom", isDirty: true }),
  setPageFrameWidthPt: (pt) =>
    set({
      pageFrameWidthPt: Math.max(0.3, Math.min(6, Math.round(pt * 10) / 10)),
      isDirty: true,
    }),
  setPageFrameInnerGapMm: (mm) =>
    set({
      pageFrameInnerGapMm: Math.max(0, Math.min(20, Math.round(mm * 10) / 10)),
      isDirty: true,
    }),
  setPageFrameCornerRadiusMm: (mm) =>
    set({
      pageFrameCornerRadiusMm: Math.max(0, Math.min(15, Math.round(mm * 10) / 10)),
      isDirty: true,
    }),
  setPageFrameLineStyle: (style) => set({ pageFrameLineStyle: style, isDirty: true }),
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
  updateQuestionImage: (id, imageBase64) =>
    set((s) => ({
      questions: s.questions.map((x) =>
        x.id === id ? { ...x, image_base64: imageBase64 } : x
      ),
      isDirty: true,
    })),
  flattenQuestionImageToSingleLayer: (id, imageBase64) =>
    set((s) => ({
      questions: s.questions.map((x) =>
        x.id === id
          ? {
              ...x,
              image_base64: imageBase64,
              image_underlay_b64: undefined,
              image_text_overlays: undefined,
            }
          : x
      ),
      isDirty: true,
    })),
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
      set((s) => ({
        questions: s.questions.map((x) => (x.id === id ? { ...x, image_base64: composite } : x)),
        isDirty: true,
      }));
    } catch (e) {
      console.error("recomposeQuestionImage failed:", e);
    }
  },
  updateQuestionCrop: async (id, crop) => {
    const state = useEditorStore.getState();
    const q = state.questions.find((x) => x.id === id);
    if (q?.image_base64) {
      set((s) => ({
        questions: s.questions.map((x) => (x.id === id ? { ...x, crop } : x)),
        isDirty: true,
      }));
      return;
    }
    try {
      const updated = await api.questions.updateCrop(id, crop);
      set((s) => ({ questions: s.questions.map((x) => (x.id === id ? updated : x)), isDirty: true }));
    } catch (e) {
      console.error("Failed to update question crop:", e);
    }
  },
  reorderQuestions: async (orderedIds) => {
    const state = useEditorStore.getState();
    const hasPending = state.questions.some((q) => q.image_base64);
    if (hasPending) {
      const byId = Object.fromEntries(state.questions.map((q) => [q.id, q]));
      const reordered = orderedIds.map((id, i) => ({ ...byId[id]!, order_index: i }));
      set({ questions: reordered, isDirty: true });
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
  setQuestionDisplayScale: (id, scale) =>
    set((s) => ({
      questions: s.questions.map((x) => (x.id === id ? { ...x, display_scale: scale } : x)),
      isDirty: true,
    })),
  setQuestionsDisplayScale: (updates) =>
    set((s) => ({
      questions: s.questions.map((x) =>
        updates[x.id] != null ? { ...x, display_scale: updates[x.id] } : x,
      ),
      isDirty: true,
    })),
  restoreQuestionsScaleSnapshot: (snapshot) =>
    set((s) => ({
      questions: s.questions.map((x) => {
        const snap = snapshot[x.id];
        if (!snap) return x;
        return {
          ...x,
          display_scale: snap.display_scale,
          ocr_font_matched: snap.ocr_font_matched ?? false,
          font_line_px: snap.font_line_px,
        };
      }),
      isDirty: true,
    })),
  /**
   * Yazı boyutunu sabit hedef puntoya çeker (OCR satır yüksekliği).
   * display_scale = hedefPt / ölçülenPt — 8 küçültür, 12 büyütür; testler arası aynı hedef.
   * ocr_font_matched yolunu kullanmaz (hedefe bağlı identity fallback ters ölçek üretiyordu).
   */
  applyQuestionLineHeightMatch: async (opts) => {
    const state = get();
    const target = clampTargetQuestionLinePt(
      opts?.targetLinePt ?? state.targetQuestionLinePt ?? DEFAULT_TARGET_QUESTION_LINE_PT,
    );
    const questions = state.questions;
    let withImage = 0;

    const trustedScaleById = new Map<string, number>();
    const trustedScales: number[] = [];

    for (const q of questions) {
      if (!q.image_base64) continue;
      withImage += 1;
      try {
        const measure = await measureQuestionFontScale(questionImageToDataUrl(q.image_base64));
        const fromOptions = isOptionFontSource(measure.source);
        const linePx = resolveMatchedLinePx(
          measure.linePx,
          measure.imgW,
          0,
          measure.matched,
          measure.figureHeavy ?? false,
          fromOptions,
          target,
        );
        if (linePx == null) continue;
        const scale = displayScaleForTargetLinePt(linePx, target);
        if (scale == null) continue;
        trustedScaleById.set(q.id, scale);
        trustedScales.push(scale);
      } catch {
        /* tek soru ölçümü başarısız — atla */
      }
    }

    if (trustedScales.length === 0) {
      return { matched: 0, total: withImage || questions.length };
    }

    const sorted = [...trustedScales].sort((a, b) => a - b);
    const medianScale = sorted[Math.floor(sorted.length / 2)]!;

    set({
      questions: questions.map((q) => {
        if (!q.image_base64) return q;
        const scale = trustedScaleById.get(q.id) ?? medianScale;
        return {
          ...q,
          display_scale: scale,
          ocr_font_matched: false,
          font_line_px: undefined,
        };
      }),
      targetQuestionLinePt: target,
      isDirty: true,
    });

    return { matched: trustedScaleById.size, total: withImage || questions.length };
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
        sections: es?.sections ?? state.sections,
        testDescription: es?.testDescription ?? state.testDescription,
        descriptionColumnCount: es?.descriptionColumnCount ?? (es?.testDescription != null ? 1 : state.descriptionColumnCount),
        descriptionTexts: es?.descriptionTexts ?? (es?.testDescription != null ? [es.testDescription] : state.descriptionTexts),
        // Alan yoksa çizgi kapalı (eski taslaklar); editor_state yoksa mevcut oturumu koru
        descriptionColumnDividers: es
          ? Boolean(es.descriptionColumnDividers)
          : state.descriptionColumnDividers,
        answerKeyMode: es?.answerKeyMode ?? state.answerKeyMode,
        optikFormEnabled: es?.optikFormEnabled ?? state.optikFormEnabled,
        optikFormPlacement: es?.optikFormPlacement ?? state.optikFormPlacement,
        optikFormOptionCount: es?.optikFormOptionCount ?? state.optikFormOptionCount,
        optikFormBookletType: es?.optikFormBookletType ?? state.optikFormBookletType,
        optikFormNetRule: es?.optikFormNetRule ?? state.optikFormNetRule,
        optikFormInstructionEnabled:
          es?.optikFormInstructionEnabled ?? state.optikFormInstructionEnabled,
        optikFormInstructionText: es?.optikFormInstructionText ?? state.optikFormInstructionText,
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
        allowSlightOverflow: es?.allowSlightOverflow ?? state.allowSlightOverflow,
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
