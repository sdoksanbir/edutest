import type { LayoutItem } from "../api/client";
import { FOOTER_TOP_OFFSET_MM, mmToPdfPt } from "./pdfLayoutGeometry";
import { questionSelectionGapEndpointsPt } from "./questionSelectionOutline";
import type { QuestionDragLive } from "./questionVerticalDrag";

const PT_PER_INCH = 72;
const PT_TO_MM = 25.4 / PT_PER_INCH;

export type QuestionGapIndicator = {
  lineXPx: number;
  yTopPx: number;
  yBottomPx: number;
  gapMm: number;
};

function ptToCanvasY(pageHpt: number, yTopPt: number, scale: number): number {
  return (pageHpt - yTopPt) * scale;
}

function itemImgYTopPt(
  item: LayoutItem,
  dragLive?: QuestionDragLive | null,
  yShiftPt = 0,
): number | null {
  if (dragLive?.orderIndex === item.order_index) return dragLive.imgYTopPt;
  const base = item.img_y_top_pt ?? null;
  return base == null ? null : base + yShiftPt;
}

export function computeQuestionGapIndicators(input: {
  layout: LayoutItem[];
  pageNum: number;
  pageWpt: number;
  pageHpt: number;
  scale: number;
  marginBottomMm: number;
  questionNumberLeftOffsetMm: number;
  selectedQuestions: number[];
  dragLive?: QuestionDragLive | null;
  yShiftPtForItem?: (item: LayoutItem) => number;
}): QuestionGapIndicator[] {
  const {
    layout,
    pageNum,
    pageWpt,
    pageHpt,
    scale,
    marginBottomMm,
    questionNumberLeftOffsetMm,
    selectedQuestions,
    dragLive,
    yShiftPtForItem,
  } = input;

  const pageItems = layout.filter((l) => l.page_num === pageNum && l.kind !== "answer_key_page");
  if (pageItems.length === 0) return [];

  const midX = pageWpt / 2;
  const xOffsetPt = mmToPdfPt(questionNumberLeftOffsetMm);
  const footerTopPt = mmToPdfPt(marginBottomMm) + mmToPdfPt(FOOTER_TOP_OFFSET_MM);
  const indicators: QuestionGapIndicator[] = [];

  pageItems.forEach((item) => {
    const yShiftPt = yShiftPtForItem?.(item) ?? 0;
    const imgYTop = itemImgYTopPt(item, dragLive, yShiftPt);
    const hasImg =
      item.img_x_pt != null &&
      imgYTop != null &&
      item.img_w_pt != null &&
      item.img_h_pt != null;
    if (!hasImg) return;

    const colCenter = ((item.x_pt ?? 0) + xOffsetPt + (item.w_pt ?? 0) / 2) * scale;
    const currBottomPt = imgYTop - (item.img_h_pt ?? 0);
    const isLeft = (item.img_x_pt ?? 0) < midX;
    const below = pageItems.filter((l) => {
      const belowY = itemImgYTopPt(l, dragLive, yShiftPtForItem?.(l) ?? 0);
      return (
        l.img_x_pt != null &&
        belowY != null &&
        ((l.img_x_pt ?? 0) < midX) === isLeft &&
        belowY < imgYTop
      );
    });
    const next = below.sort(
      (a, b) =>
        (itemImgYTopPt(b, dragLive, yShiftPtForItem?.(b) ?? 0) ?? 0) -
        (itemImgYTopPt(a, dragLive, yShiftPtForItem?.(a) ?? 0) ?? 0),
    )[0];
    const yBottomPt = (next ? itemImgYTopPt(next, dragLive) : null) ?? footerTopPt;
    const gapPt = currBottomPt - yBottomPt;
    if (gapPt <= 0) return;

    const touchesSelection =
      selectedQuestions.includes(item.order_index) ||
      (next != null && selectedQuestions.includes(next.order_index));
    const endpoints = touchesSelection
      ? questionSelectionGapEndpointsPt(scale, currBottomPt, yBottomPt)
      : { visualTopPt: currBottomPt, visualBottomPt: yBottomPt };
    const gapMm = Math.round(gapPt * PT_TO_MM * 10) / 10;

    indicators.push({
      lineXPx: colCenter,
      yTopPx: ptToCanvasY(pageHpt, endpoints.visualTopPt, scale),
      yBottomPx: ptToCanvasY(pageHpt, endpoints.visualBottomPt, scale),
      gapMm,
    });
  });

  return indicators;
}
