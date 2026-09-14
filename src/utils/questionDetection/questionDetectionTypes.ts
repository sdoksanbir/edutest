/** Normalize page coords (0..1) and analysis-pixel helpers for question detection. */

export type AnchorSource =
  | 'ocr+geometry'
  | 'ocr'
  | 'geometry'
  | 'sequence-recovered'

export type DetectionStatus = 'accepted' | 'review' | 'rejected'

export interface DetectedColumn {
  /** Analysis-pixel left edge */
  x: number
  width: number
  confidence: number
  index: number
}

export interface QuestionAnchor {
  number?: number
  /** Analysis pixels */
  x: number
  y: number
  width: number
  height: number
  columnIndex: number
  confidence: number
  source: AnchorSource
  ocrText?: string
  ocrConfidence?: number
  geometryScore?: number
  sequenceScore?: number
}

export interface DetectedQuestion {
  number?: number
  columnIndex: number
  /** Normalized 0..1 crop (includes question number) */
  x: number
  y: number
  width: number
  height: number
  anchorConfidence: number
  contentConfidence: number
  finalConfidence: number
  status: DetectionStatus
  source: AnchorSource
}

export interface PageAnalysis {
  pageWidth: number
  pageHeight: number
  analyzeWidth: number
  analyzeHeight: number
  contentTop: number
  contentBottom: number
  columns: DetectedColumn[]
}

export interface QuestionDetectionDebug {
  page: PageAnalysis
  ocrCandidates: Array<Record<string, unknown>>
  geometricCandidates: Array<Record<string, unknown>>
  anchors: QuestionAnchor[]
  questions: DetectedQuestion[]
  summary: {
    columns: number
    ocrCandidates: number
    geometricCandidates: number
    acceptedAnchors: number
    questions: number
    accepted: number
    review: number
    rejected: number
  }
}

export interface QuestionDetectionResult {
  questions: DetectedQuestion[]
  /** CropBox-compatible accepted + review (for drafts) */
  crops: Array<{ x: number; y: number; width: number; height: number }>
  debug: QuestionDetectionDebug
}

export interface QuestionDetectionOptions {
  maxAnalyzeWidth?: number
  enableOcr?: boolean
  debug?: boolean
}
