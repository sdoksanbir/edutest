export { QD_CONFIG } from './questionDetectionConfig'
export type {
  AnchorSource,
  DetectedColumn,
  DetectedQuestion,
  PageAnalysis,
  QuestionAnchor,
  QuestionDetectionDebug,
  QuestionDetectionOptions,
  QuestionDetectionResult,
  DetectionStatus,
} from './questionDetectionTypes'
export { detectQuestions } from './detectQuestions'
export { terminateOcrWorker } from './ocrWorker'
export { detectContentArea } from './detectContentArea'
export { detectColumns } from './detectColumns'
export { detectGeometricAnchors } from './detectGeometricAnchors'
export { fuseAnchors } from './fuseAnchors'
// Band helpers kept for experiments — NOT used by detectQuestions (anchor-first only).
export { splitColumnsIntoQuestionBands } from './splitColumnBands'
export { buildQuestionsFromBands } from './buildQuestionsFromBands'
