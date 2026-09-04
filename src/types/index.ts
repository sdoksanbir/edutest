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
  display_scale?: number
  /** Satır yüksekliği eşlendi; yerleşim font_line_px ile boyutlandırır. */
  ocr_font_matched?: boolean
  /** Eşitlemede ölçülen / fırınlanan gövde satır yüksekliği (px). */
  font_line_px?: number
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
