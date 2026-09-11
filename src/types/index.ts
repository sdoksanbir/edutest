import type { FasikulQuestionFrameSettings } from '../utils/fasikulQuestionFrame'

export type { FasikulQuestionFrameSettings }

export type AnswerKey = 'A' | 'B' | 'C' | 'D' | 'E'
export type AnswerOption = AnswerKey
export type QuestionContentType = 'question' | 'explanation'
export type ExplanationCaptionAlign = 'left' | 'center' | 'right'
export type ExplanationCaptionPlacement = 'above' | 'below' | 'left' | 'right'
export type ExplanationCaptionSideFlow = 'horizontal' | 'vertical_up'
export type ExplanationCaptionBoxCorner = 'rounded' | 'sharp'
export type ExplanationCaptionBoxWidth = 'full' | 'tight'

export interface CropBox {
  x: number
  y: number
  width: number
  height: number
}

export interface FontReferenceV1 {
  version: 1
  kind: 'option-line' | 'stem-line'
  /** Kaynak PDF sayfasına / görsele göre normalize 0–1 koordinatları. */
  sourceRectNorm: CropBox
}

/** @deprecated use CropBox */
export type NormalizedCrop = CropBox

export interface QuestionImageTextOverlay {
  id: string
  x: number
  y: number
  w: number
  h: number
  text: string
  fontSizePx: number
  color?: string
  bold?: boolean
  italic?: boolean
}

/** PDF.js kırpma anı — fiziksel boyut için */
export interface QuestionCaptureMeta {
  sourcePageWidthPt: number
  sourcePageHeightPt: number
  viewportScale: number
  devicePixelRatio: number
  cropWidthPx: number
  cropHeightPx: number
  cropWidthPt: number
  cropHeightPt: number
  pixelsPerPdfPoint: number
}

export type QuestionLayoutMode = 'single-column' | 'full-width' | 'auto'

export interface QuestionItem {
  id: string
  pdf_id: string
  page_number: number
  crop: CropBox
  answer_key: string
  order_index: number
  content_type: QuestionContentType
  remove_background: boolean
  image_path?: string
  image_base64?: string
  image_underlay_b64?: string
  image_text_overlays?: QuestionImageTextOverlay[]
  localPdfId?: string
  /**
   * @deprecated Ürün = (manualScale ?? 1) * (normalizationScale ?? 1).
   * Geriye dönük uyumluluk / sync alanı.
   */
  display_scale?: number
  /** Kullanıcı kaydırıcı / ± — OCR’dan bağımsız */
  manualScale?: number
  /** Yazı eşitle (OCR) ölçeği */
  normalizationScale?: number
  /** Kullanıcının soru içinden seçtiği birincil yazı ölçüm bölgesi. */
  fontReference?: FontReferenceV1
  /** Görsel/crop/referans değişiminde async ölçüm sonucunu stale saymak için. */
  fontMeasurementRevision?: number
  /** Son OCR tespit (analiz canvas px) — teşhis */
  detected_font_px?: number | null
  /** Kırpma yakalama metadata */
  capture?: QuestionCaptureMeta
  /**
   * Sütun yerleşimi: single-column (varsayılan) | full-width (2 sütuna yay) | auto (şimdilik single)
   */
  layoutMode?: QuestionLayoutMode
  /** Satır yüksekliği eşlendi; yerleşim font_line_px ile boyutlandırır. */
  ocr_font_matched?: boolean
  /** Eşitlemede ölçülen / fırınlanan gövde satır yüksekliği (px). */
  font_line_px?: number
  /** Ortak fiziksel font hedefi teşhisi (eşitleme sonrası) */
  font_equalize_diag?: {
    userTargetFontPt: number
    effectiveTargetFontPt: number
    detectedFontHeightPt: number
    maxAppliedScale: number
    maxAchievableFontPt: number
    rawNormalizationScale: number
    normalizationScale: number
    finalFontHeightPt: number
    fontTargetErrorPt: number
    targetReached: boolean
    targetLimitation: string
    limitingQuestionNo?: number | null
  }
  custom_gap_mm?: number
  explanation_caption_enabled?: boolean
  explanation_caption_text?: string
  explanation_caption_align?: ExplanationCaptionAlign
  explanation_caption_placement?: ExplanationCaptionPlacement
  explanation_caption_side_flow?: ExplanationCaptionSideFlow
  explanation_caption_color?: string
  explanation_caption_bold?: boolean
  explanation_caption_italic?: boolean
  explanation_caption_font_pt?: number
  explanation_caption_box_enabled?: boolean
  explanation_caption_box_color?: string
  explanation_caption_box_corner?: ExplanationCaptionBoxCorner
  explanation_caption_box_width?: ExplanationCaptionBoxWidth
  /** Fasikül: soru çerçevesi / etiket (önizleme + taslak). */
  fasikulFrame?: FasikulQuestionFrameSettings
  /**
   * Fasikül: soru altı kareli alan satır sayısı.
   * Yoksa boşluğa göre otomatik; set edilirse 1…maxRows aralığında.
   */
  scratchGridRows?: number
  /**
   * Fasikül: görselsiz boş hazır tasarım kutusu (satır yüksekliği).
   * Layout bu yüksekliği kullanır; image_base64 şeffaf yer tutucu olabilir.
   */
  fasikulEmptyRows?: number
}

export interface SectionRange {
  start_idx: number
  end_idx: number
  title: string
  restart_numbering?: boolean
  start_new_page?: boolean
  fill_color?: string
  text_color?: string
  line_color?: string
  font_pt?: number
}

export interface PdfFolder {
  id: string
  name: string
  created_at: string
  parent_id?: string | null
}

export interface PdfItem {
  id: string
  filename: string
  path: string
  page_count: number
  created_at: string
  folder_id?: string | null
}

export interface DraftInfo {
  name: string
  updated_at: string
  question_count: number
}

export type ModalKey =
  | 'pdf-bank'
  | 'question-editor'
  | 'add-image'
  | 'save-draft'
  | 'load-draft'
  | 'pick-draft-questions'
  | 'google-drive'
  | null

export type SidebarTab = 'written-paper' | 'test-paper' | 'trial-exam' | 'fasikul-paper' | 'settings'
