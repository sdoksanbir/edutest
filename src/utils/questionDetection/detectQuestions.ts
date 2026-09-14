import { QD_CONFIG } from './questionDetectionConfig'
import type {
  QuestionDetectionDebug,
  QuestionDetectionOptions,
  QuestionDetectionResult,
} from './questionDetectionTypes'
import { columnNumberRoi, columnNumberSearchLeft, imageToInkMap } from './inkMap'
import { detectContentArea } from './detectContentArea'
import { detectColumns } from './detectColumns'
import { detectGeometricAnchors } from './detectGeometricAnchors'
import { detectOcrAnchors } from './detectOcrAnchors'
import { fuseAnchors } from './fuseAnchors'
import { buildQuestionRegions } from './buildQuestionRegions'
import { validateDetectedQuestions } from './validateDetectedQuestions'

let runCounter = 0

/**
 * ANCHOR-FIRST pipeline (mandatory):
 * content → columns → left-ROI geometric+OCR → fuse/sequence →
 * anchor spans → ink refine ONLY → validate.
 *
 * Ink/content blobs NEVER create questions without an anchor.
 */
export async function detectQuestions(
  img: HTMLImageElement,
  options?: QuestionDetectionOptions,
): Promise<QuestionDetectionResult> {
  const runId = ++runCounter
  const maxW = options?.maxAnalyzeWidth ?? QD_CONFIG.maxAnalyzeWidth
  const enableOcr = options?.enableOcr ?? QD_CONFIG.ocrEnabledDefault
  const debug = options?.debug ?? import.meta.env.DEV

  const { ink, numberColorFg, w, h, rgba } = imageToInkMap(img, maxW)
  const { contentTop, contentBottom } = detectContentArea(ink, w, h)
  const columns = detectColumns(ink, w, h, contentTop, contentBottom)

  const geo = detectGeometricAnchors(
    numberColorFg,
    ink,
    w,
    h,
    contentTop,
    contentBottom,
    columns,
  )

  let ocrHits: Awaited<ReturnType<typeof detectOcrAnchors>> = {
    hits: [],
    debug: [],
    meta: { workerOk: false, rawTexts: [] },
  }
  if (enableOcr) {
    ocrHits = await detectOcrAnchors(
      rgba,
      ink,
      numberColorFg,
      w,
      h,
      contentTop,
      contentBottom,
      columns,
    )
  }

  const anchors = fuseAnchors(geo.anchors, ocrHits.hits, columns, h, ink, w)

  // HARD RULE: no anchor → no question
  let questions =
    anchors.length === 0
      ? []
      : buildQuestionRegions(ink, w, h, contentTop, contentBottom, columns, anchors)
  questions = validateDetectedQuestions(questions)

  const usable = questions.filter((q) => q.status === 'accepted' || q.status === 'review')
  const crops = usable.map((q) => ({
    x: q.x,
    y: q.y,
    width: q.width,
    height: q.height,
  }))

  const pageAnalysis = {
    pageWidth: img.naturalWidth || img.width,
    pageHeight: img.naturalHeight || img.height,
    analyzeWidth: w,
    analyzeHeight: h,
    contentTop,
    contentBottom,
    columns,
  }

  const rois = columns.map((c) => {
    const inkLeft = columnNumberSearchLeft(numberColorFg, ink, w, c, contentTop, contentBottom)
    const r = columnNumberRoi(c, QD_CONFIG.questionNumberRoiRatio, inkLeft)
    return { columnIndex: c.index, inkLeft, ...r }
  })

  const debugPayload: QuestionDetectionDebug = {
    page: pageAnalysis,
    ocrCandidates: ocrHits.debug,
    geometricCandidates: geo.debug,
    anchors,
    questions,
    summary: {
      columns: columns.length,
      ocrCandidates: ocrHits.debug.length,
      geometricCandidates: geo.debug.length,
      acceptedAnchors: anchors.length,
      questions: questions.length,
      accepted: questions.filter((q) => q.status === 'accepted').length,
      review: questions.filter((q) => q.status === 'review').length,
      rejected: questions.filter((q) => q.status === 'rejected').length,
    },
  }

  // Attach ROI for overlay (extend debug via summary cast is ugly — store on page via any)
  ;(debugPayload as QuestionDetectionDebug & { numberRois?: typeof rois }).numberRois = rois
  ;(debugPayload as QuestionDetectionDebug & { ocrMeta?: typeof ocrHits.meta }).ocrMeta =
    ocrHits.meta
  ;(debugPayload as QuestionDetectionDebug & { runId?: number }).runId = runId

  if (debug) {
    logDetectionDebug(runId, debugPayload, ocrHits.meta, rois)
  }

  return { questions: usable, crops, debug: debugPayload }
}

function logDetectionDebug(
  runId: number,
  d: QuestionDetectionDebug,
  ocrMeta: { workerOk: boolean; rawTexts: string[] },
  rois: Array<{ columnIndex: number; x0: number; x1: number }>,
) {
  const contentHeight = d.page.contentBottom - d.page.contentTop
  console.group(`[QUESTION DETECTION #${runId}]`)
  console.table({
    imageWidth: d.page.pageWidth,
    imageHeight: d.page.pageHeight,
    analyzeWidth: d.page.analyzeWidth,
    analyzeHeight: d.page.analyzeHeight,
    contentTop: d.page.contentTop,
    contentBottom: d.page.contentBottom,
    contentHeight,
    detectedColumnCount: d.page.columns.length,
  })
  console.table(
    d.page.columns.map((c) => ({
      index: c.index,
      x: c.x,
      y: d.page.contentTop,
      width: c.width,
      height: contentHeight,
      leftNormalized: +(c.x / d.page.analyzeWidth).toFixed(4),
      rightNormalized: +((c.x + c.width) / d.page.analyzeWidth).toFixed(4),
      confidence: c.confidence,
    })),
  )
  console.log('NUMBER ROIs', rois)
  console.log('OCR workerOk', ocrMeta.workerOk, 'rawTexts', ocrMeta.rawTexts)
  console.table(d.ocrCandidates)
  console.table(d.geometricCandidates)
  console.table(
    d.anchors.map((a) => ({
      number: a.number,
      x: a.x,
      y: a.y,
      column: a.columnIndex,
      source: a.source,
      ocrConfidence: a.ocrConfidence,
      geometryScore: a.geometryScore,
      sequenceScore: a.sequenceScore,
      finalConfidence: +a.confidence.toFixed(3),
      normX: +(a.x / d.page.analyzeWidth).toFixed(4),
      normY: +(a.y / d.page.analyzeHeight).toFixed(4),
    })),
  )
  console.table(
    d.questions.map((q) => ({
      number: q.number,
      column: q.columnIndex,
      x: +q.x.toFixed(4),
      y: +q.y.toFixed(4),
      width: +q.width.toFixed(4),
      height: +q.height.toFixed(4),
      top: +q.y.toFixed(4),
      bottom: +(q.y + q.height).toFixed(4),
      anchorConfidence: +q.anchorConfidence.toFixed(3),
      contentConfidence: +q.contentConfidence.toFixed(3),
      finalConfidence: +q.finalConfidence.toFixed(3),
      status: q.status,
    })),
  )
  console.log('[QUESTION DETECTION SUMMARY]', d.summary)
  console.groupEnd()
}
