export const QUESTION_SELECTION_CLASS = "pdf-preview-question-highlight";
export const QUESTION_SELECTION_ACTIVE_CLASS = "pdf-preview-question-highlight--active";
export const QUESTION_SELECTION_SELECTED_CLASS = "pdf-preview-question-highlight--selected";
export const QUESTION_SELECTION_CARD_OUTSET_PX = 0;
export const QUESTION_SELECTION_PAD_PX = 0;

/** Yeşil ok uçları — görsel kenarı */
export function questionSelectionGapEndpointsPt(
  _scale: number,
  yTopPt: number,
  yBottomPt: number,
): { visualTopPt: number; visualBottomPt: number } {
  return { visualTopPt: yTopPt, visualBottomPt: yBottomPt };
}

/** Canvas seçim — görsel kenarında mavi glow */
export function drawQuestionSelectionOutline(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.fillStyle = "rgba(100, 165, 220, 0.14)";
  ctx.fill();
  ctx.strokeStyle = "rgba(100, 165, 220, 0.75)";
  ctx.lineWidth = Math.max(1, 1 * scale);
  ctx.shadowColor = "rgba(120, 180, 230, 0.38)";
  ctx.shadowBlur = 8 * scale;
  ctx.stroke();
  ctx.restore();
}
