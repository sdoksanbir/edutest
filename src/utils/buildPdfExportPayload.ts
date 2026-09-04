import type { LayoutItem } from "../api/client";
import type { QuestionItem } from "../types";
import type { LayoutPlacementOverride } from "./columnShiftPlacement";
import { layoutPlacementOverridesApiPayload } from "./layoutPlacementOverridesPayload";
import { layoutYTopOverridesApiPayloadForSave } from "./layoutYTopOverridesPayload";
import { getPaperSizePayload } from "./paperSizePayload";
import { normalizeHeaderStyleId } from "./headerStyles";
import { stripDataUrlPrefix, resolveWatermarkAngleDeg } from "./visualProperties";

export type PdfExportPayloadContext = {
  questions: QuestionItem[];
  layout: LayoutItem[];
  baseLayout: LayoutItem[];
  columns: number;
  /** Sabit hedef yazı puntosu (eşitleme); varsayılan 10 */
  targetQuestionLinePt?: number;
  /** false: katı sütun ezmesi; true/undefined: %80 native taban */
  allowSlightOverflow?: boolean;
  pageWpt: number;
  pageHpt: number;
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  placementOverrides: Record<string, LayoutPlacementOverride>;
  yOverridesByQuestionId: Record<string, number>;
  title: string;
  schoolName: string;
  includeAnswerKey: boolean;
  answerKeyMode: string;
  questionGapMm: number;
  questionGapMinMm: number;
  autoCompactSpacing: boolean;
  paperSize: string;
  paperWidthMm: number;
  paperHeightMm: number;
  orientation: "portrait" | "landscape";
  watermarkEnabled: boolean;
  watermarkSettings: {
    mode: string;
    text: string;
    textOpacityPct: number;
    textSizePct: number;
    textAngleDeg: number;
    imageBase64?: string | null;
    imageOpacityPct: number;
    imageSizePct: number;
  };
  showColumnDivider: boolean;
  columnDividerText: string;
  columnDividerColor: string;
  columnDividerWidthPt: number;
  showColumnDividerText: boolean;
  showWatermark: boolean;
  watermarkText: string;
  watermarkLayout: "diagonal" | "horizontal" | "vertical";
  watermarkAngleDeg: number;
  watermarkOpacity: number;
  watermarkSize: number;
  watermarkLogoUrl: string | null;
  showPageFrame: boolean;
  pageFrameColorMode: "theme" | "custom";
  pageFrameColor: string;
  pageFrameWidthPt: number;
  pageFrameInnerGapMm: number;
  pageFrameCornerRadiusMm: number;
  pageFrameLineStyle: "solid" | "dashed" | "dotted";
  themeColor: string;
  headerStyleId: string;
  headerConfig: Record<string, unknown>;
  quality: "normal" | "high" | "best";
  sections: unknown[];
  includeDescription: boolean;
  descriptionColumnCount: number;
  descriptionTexts: string[];
  descriptionColumnDividers: boolean;
  addTextOnLine: boolean;
  centerLineText: string;
  centerLineBold: boolean;
  centerLineItalic: boolean;
  centerLineTextDirection: string;
  headerBottomGapMm: number;
  otherPageHeaderBottomGapMm: number;
  questionNumberLeftOffsetMm: number;
  questionNumberImageGapMm: number;
  questionNumberingEnabled: boolean;
  questionNumberStart: number;
  questionNumberColorMode: "theme" | "black";
  questionNumberFontPt: number;
  pageNumberingEnabled: boolean;
  pageNumberStart: number;
  pageNumberFormat: "plain" | "fraction";
  writtenBlock?: Record<string, unknown>;
  /**
   * true (varsayılan): kayıtta önizleme layout’unu kilitle (PDF = canvas).
   * false: layout’u payload’dan yeniden hesapla.
   */
  lockPreviewLayout?: boolean;
};

function mapQuestionsForExport(questions: QuestionItem[]) {
  return questions.map((q) => ({
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
  }));
}

/** PDF kaydet / gerçek PDF önizleme — aynı export payload. */
export function buildPdfExportPayload(ctx: PdfExportPayloadContext): Record<string, unknown> {
  const paper = getPaperSizePayload(
    ctx.paperSize,
    ctx.paperWidthMm,
    ctx.paperHeightMm,
    ctx.orientation
  );
  const placementPayload = layoutPlacementOverridesApiPayload(ctx.placementOverrides, ctx.questions);
  const yPayload = layoutYTopOverridesApiPayloadForSave({
    overridesByQuestionId: ctx.yOverridesByQuestionId,
    placementOverrides: ctx.placementOverrides,
    questions: ctx.questions,
    layout: ctx.layout,
    baseLayout: ctx.baseLayout,
    columns: ctx.columns,
    pageWpt: ctx.pageWpt,
    pageHpt: ctx.pageHpt,
    marginTopMm: ctx.marginTopMm,
    marginBottomMm: ctx.marginBottomMm,
    marginLeftMm: ctx.marginLeftMm,
    marginRightMm: ctx.marginRightMm,
  });

  /** Görseller questions’tan gelir — locked_layout şişmesin. */
  const lockedLayout =
    ctx.lockPreviewLayout === false || ctx.layout.length === 0
      ? undefined
      : ctx.layout.map((item) => {
          const {
            image_base64: _a,
            image_b64: _b,
            ...rest
          } = item as LayoutItem & { image_b64?: string };
          return rest;
        });

  return {
    title: ctx.title,
    school_name: ctx.schoolName,
    include_answer_key: ctx.includeAnswerKey,
    answer_key_mode: ctx.answerKeyMode,
    columns: ctx.columns,
    target_question_line_pt: ctx.targetQuestionLinePt ?? 10,
    allow_slight_overflow: ctx.allowSlightOverflow !== false,
    question_gap_mm: ctx.questionGapMm,
    question_gap_min_mm: ctx.questionGapMm,
    auto_compact_spacing: false,
    page_preset: paper.page_preset,
    page_width_mm: paper.page_width_mm,
    page_height_mm: paper.page_height_mm,
    orientation: paper.orientation,
    margin_top_mm: ctx.marginTopMm,
    margin_bottom_mm: ctx.marginBottomMm,
    margin_left_mm: ctx.marginLeftMm,
    margin_right_mm: ctx.marginRightMm,
    header_style_id: normalizeHeaderStyleId(ctx.headerStyleId),
    header_config: { ...ctx.headerConfig },
    theme_color: ctx.themeColor,
    quality: ctx.quality,
    questions: mapQuestionsForExport(ctx.questions),
    ...(lockedLayout && lockedLayout.length > 0 ? { locked_layout: lockedLayout } : {}),
    sections: ctx.sections.length > 0 ? ctx.sections : undefined,
    include_description: ctx.includeDescription,
    description_column_count: ctx.descriptionColumnCount,
    description_texts: ctx.includeDescription ? ctx.descriptionTexts : [],
    description_column_dividers: ctx.descriptionColumnDividers,
    add_text_on_line:
      ctx.showColumnDividerText &&
      ctx.showColumnDivider &&
      !!ctx.columnDividerText.trim(),
    center_line_text: ctx.columnDividerText || ctx.centerLineText,
    center_line_bold: ctx.centerLineBold,
    center_line_italic: ctx.centerLineItalic,
    center_line_text_direction: ctx.centerLineTextDirection,
    header_bottom_gap_mm: ctx.headerBottomGapMm,
    other_page_header_bottom_gap_mm: ctx.otherPageHeaderBottomGapMm,
    question_number_left_offset_mm: ctx.questionNumberLeftOffsetMm,
    question_number_image_gap_mm: ctx.questionNumberImageGapMm,
    question_numbering_enabled: ctx.questionNumberingEnabled,
    question_number_start: ctx.questionNumberStart,
    question_number_color_mode: ctx.questionNumberColorMode,
    question_number_font_pt: ctx.questionNumberFontPt,
    page_numbering_enabled: ctx.pageNumberingEnabled,
    page_number_start: ctx.pageNumberStart,
    page_number_format: ctx.pageNumberFormat,
    ...(ctx.writtenBlock ?? {}),
    ...placementPayload,
    ...yPayload,
    watermark_enabled: ctx.showWatermark || ctx.watermarkEnabled,
    watermark_mode: ctx.watermarkLogoUrl || ctx.watermarkSettings.imageBase64 ? "image" : "text",
    watermark_text: ctx.watermarkText || ctx.watermarkSettings.text,
    watermark_text_opacity_pct: ctx.showWatermark
      ? ctx.watermarkOpacity
      : ctx.watermarkSettings.textOpacityPct,
    watermark_text_size_pct: ctx.showWatermark ? ctx.watermarkSize : ctx.watermarkSettings.textSizePct,
    watermark_text_angle_deg: resolveWatermarkAngleDeg(ctx.watermarkLayout, ctx.watermarkAngleDeg),
    watermark_text_color: ctx.themeColor,
    watermark_image_base64:
      stripDataUrlPrefix(ctx.watermarkLogoUrl) ?? ctx.watermarkSettings.imageBase64,
    watermark_image_opacity_pct: ctx.showWatermark
      ? ctx.watermarkOpacity
      : ctx.watermarkSettings.imageOpacityPct,
    watermark_image_size_pct: ctx.showWatermark ? ctx.watermarkSize : ctx.watermarkSettings.imageSizePct,
    show_column_divider: ctx.showColumnDivider,
    show_column_divider_text: ctx.showColumnDividerText,
    column_divider_text: ctx.columnDividerText,
    column_divider_color: ctx.columnDividerColor,
    column_divider_width_pt: ctx.columnDividerWidthPt,
    show_watermark: ctx.showWatermark,
    watermark_layout: ctx.watermarkLayout,
    watermark_angle_deg: ctx.watermarkAngleDeg,
    watermark_opacity_pct: ctx.watermarkOpacity,
    watermark_size_pct: ctx.watermarkSize,
    watermark_logo_url: ctx.watermarkLogoUrl,
    show_page_frame: ctx.showPageFrame,
    page_frame_color_mode: ctx.pageFrameColorMode,
    page_frame_color: ctx.pageFrameColor,
    page_frame_width_pt: ctx.pageFrameWidthPt,
    page_frame_inner_gap_mm: ctx.pageFrameInnerGapMm,
    page_frame_corner_radius_mm: ctx.pageFrameCornerRadiusMm,
    page_frame_line_style: ctx.pageFrameLineStyle,
  };
}
