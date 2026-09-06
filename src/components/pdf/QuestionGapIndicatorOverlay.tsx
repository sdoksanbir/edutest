import { useCallback, useEffect, useState, type RefObject } from "react";

import type { LayoutItem } from "../../api/client";

import {
  computeQuestionGapIndicators,
  type QuestionGapIndicator,
} from "../../utils/questionGapIndicators";
import {
  computePageColumnBand,
  liveAlignmentYShiftPtForItem,
  type LayoutGeometryInput,
} from "../../utils/pdfLayoutGeometry";

import type { QuestionDragLive } from "../../utils/questionVerticalDrag";



type Props = {

  enabled: boolean;

  layout: LayoutItem[];

  pageNum: number;

  pageWpt: number;

  pageHpt: number;

  pageWpx: number;

  pageHpx: number;

  scale: number;

  marginBottomMm: number;

  questionNumberLeftOffsetMm: number;
  columns: number;
  geometry: LayoutGeometryInput;
  headerBottomGapMm: number;
  otherPageHeaderBottomGapMm: number;
  selectedQuestions: number[];

  questionDragLiveRef?: RefObject<QuestionDragLive | null>;

  layoutLiveRef?: RefObject<LayoutItem[] | null>;

  alignmentPreviewLiveRef?: RefObject<{
    headerBottomGapMm?: number;
    otherPageHeaderBottomGapMm?: number;
    leftOffsetMm?: number;
    imageGapMm?: number;
  } | null>;

  onRegisterRedraw?: (redraw: () => void) => (() => void) | void;

};



function GapIndicatorGraphic({

  indicator,

  arrowSize,

  lineHalf,

  labelFontSize,

}: {

  indicator: QuestionGapIndicator;

  arrowSize: number;

  lineHalf: number;

  labelFontSize: number;

}) {

  const { lineXPx, yTopPx, yBottomPx, gapMm } = indicator;

  const dx = arrowSize * 0.55;

  const txtY = (yTopPx + yBottomPx) / 2;



  return (

    <g>

      <line

        x1={lineXPx}

        y1={yBottomPx - lineHalf}

        x2={lineXPx}

        y2={yTopPx + lineHalf}

        stroke="#ef4444"

        strokeWidth={lineHalf * 2}

      />

      <polygon

        points={`${lineXPx},${yBottomPx} ${lineXPx - dx},${yBottomPx - arrowSize} ${lineXPx + dx},${yBottomPx - arrowSize}`}

        fill="#ef4444"

      />

      <polygon

        points={`${lineXPx},${yTopPx} ${lineXPx - dx},${yTopPx + arrowSize} ${lineXPx + dx},${yTopPx + arrowSize}`}

        fill="#ef4444"

      />

      <text

        x={lineXPx + arrowSize + 4}

        y={txtY}

        fill="#dc2626"

        fontSize={labelFontSize}

        fontWeight="700"

        fontFamily="Helvetica, Arial, sans-serif"

        dominantBaseline="middle"

      >

        {gapMm} mm

      </text>

    </g>

  );

}



export default function QuestionGapIndicatorOverlay({

  enabled,

  layout,

  pageNum,

  pageWpt,

  pageHpt,

  pageWpx,

  pageHpx,

  scale,

  marginBottomMm,

  questionNumberLeftOffsetMm,
  columns,
  geometry,
  headerBottomGapMm,
  otherPageHeaderBottomGapMm,
  selectedQuestions,

  questionDragLiveRef,

  layoutLiveRef,

  alignmentPreviewLiveRef,

  onRegisterRedraw,

}: Props) {

  const compute = useCallback((): QuestionGapIndicator[] => {

    const layoutData =
      layoutLiveRef?.current && layoutLiveRef.current.length > 0
        ? layoutLiveRef.current
        : layout;
    const useLiveReflowLayout = Boolean(
      layoutLiveRef?.current && layoutLiveRef.current.length > 0,
    );
    const numOffsetMm =
      alignmentPreviewLiveRef?.current?.leftOffsetMm ?? questionNumberLeftOffsetMm;
    const live = alignmentPreviewLiveRef?.current;
    const band = computePageColumnBand({ ...geometry, pageNum });

    const dragLive =
      questionDragLiveRef?.current?.pageNum === pageNum
        ? questionDragLiveRef.current
        : null;

    return computeQuestionGapIndicators({
      layout: layoutData,
      pageNum,
      pageWpt,
      pageHpt,
      scale,
      marginBottomMm,
      questionNumberLeftOffsetMm: numOffsetMm,
      selectedQuestions,
      dragLive,
      yShiftPtForItem: useLiveReflowLayout
        ? undefined
        : (item) =>
            liveAlignmentYShiftPtForItem(item, {
              pageNum,
              columns,
              band,
              live,
              committedHeaderBottomGapMm: headerBottomGapMm,
              committedOtherPageHeaderBottomGapMm: otherPageHeaderBottomGapMm,
            }),
    });
  }, [
    layout,
    layoutLiveRef,
    alignmentPreviewLiveRef,
    pageNum,
    pageWpt,
    pageHpt,
    scale,
    marginBottomMm,
    questionNumberLeftOffsetMm,
    columns,
    geometry,
    headerBottomGapMm,
    otherPageHeaderBottomGapMm,
    selectedQuestions,
    questionDragLiveRef,
  ]);



  const [indicators, setIndicators] = useState<QuestionGapIndicator[]>(() =>

    enabled ? compute() : [],

  );



  useEffect(() => {

    if (!enabled) {

      setIndicators([]);

      return;

    }

    setIndicators(compute());

  }, [enabled, compute]);



  useEffect(() => {

    if (!enabled || !onRegisterRedraw) return;

    return onRegisterRedraw(() => {

      setIndicators(compute());

    });

  }, [

    enabled,

    onRegisterRedraw,

    compute,

  ]);



  if (!enabled || indicators.length === 0) return null;



  const arrowSize = 5 * scale;

  const lineHalf = (1.2 * scale) / 2;

  const labelFontSize = 9 * scale;



  return (

    <svg

      className="pointer-events-none absolute left-0 top-0 z-[19]"

      width={pageWpx}

      height={pageHpx}

      aria-hidden

    >

      {indicators.map((indicator, index) => (

        <GapIndicatorGraphic

          key={index}

          indicator={indicator}

          arrowSize={arrowSize}

          lineHalf={lineHalf}

          labelFontSize={labelFontSize}

        />

      ))}

    </svg>

  );

}

