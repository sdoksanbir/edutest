/**
 * Kompakt optik form — önizlemede dikey sürükleme tutamacı.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LayoutItem } from "../../api/client";
import type { QuestionItem } from "../../types";
import { computeAnswerKeyLayout } from "../../utils/answerKeyLayout";
import type { HeaderConfig } from "../../utils/corporateHeaderLayout";
import {
  clientDeltaToOptikOffsetDelta,
  resolveCompactOptikFormPlacement,
} from "../../utils/optikFormCompactPlacement";
import { optikRowsFromLayoutItems } from "../../utils/optikFormLayout";
import {
  resolveOptikActiveOptions,
  type OptikFormBookletType,
  type OptikFormOptionCount,
} from "../../utils/optikFormSettings";

type Props = {
  enabled: boolean;
  layout: LayoutItem[];
  pageNum: number;
  pageWpt: number;
  pageHpt: number;
  pageWpx: number;
  pageHpx: number;
  scale: number;
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  columns: number;
  columnGapMm?: number;
  questions: QuestionItem[];
  sections?: import("../../types").SectionRange[];
  optionCount: OptikFormOptionCount;
  bookletType: OptikFormBookletType;
  offsetYPt: number;
  includeAnswerKey?: boolean;
  answerKeyMode?: string;
  headerStyleId?: string;
  headerConfig?: HeaderConfig;
  headerBottomGapMm?: number;
  otherPageHeaderBottomGapMm?: number;
  writtenPaperHeader?: boolean;
  onOffsetChange: (offsetYPt: number, phase: "move" | "commit") => void;
};

export default function OptikFormDragOverlay({
  enabled,
  layout,
  pageNum,
  pageWpt,
  pageHpt,
  pageWpx,
  pageHpx,
  scale,
  marginTopMm,
  marginBottomMm,
  marginLeftMm,
  marginRightMm,
  columns,
  columnGapMm = 8,
  questions,
  sections,
  optionCount,
  bookletType,
  offsetYPt,
  includeAnswerKey,
  answerKeyMode,
  headerStyleId,
  headerConfig,
  headerBottomGapMm,
  otherPageHeaderBottomGapMm,
  writtenPaperHeader,
  onOffsetChange,
}: Props) {
  const dragRef = useRef<{
    pointerId: number;
    startClientY: number;
    startOffset: number;
  } | null>(null);
  const [liveOffset, setLiveOffset] = useState<number | null>(null);

  const placement = useMemo(() => {
    if (!enabled) return null;
    const rows = optikRowsFromLayoutItems(layout, questions, sections);
    if (rows.length === 0) return null;
    const activeOpts = resolveOptikActiveOptions(questions, optionCount);

    let reservedAboveFooterPt = 0;
    if (includeAnswerKey && answerKeyMode === "end_of_test") {
      const answerKeyItems: [number, string][] = layout
        .filter((l) => l.display_number != null)
        .sort((a, b) => (a.display_number as number) - (b.display_number as number))
        .map((l) => [
          l.display_number as number,
          (l.answer_key || "?").trim().toUpperCase() || "?",
        ]);
      if (answerKeyItems.length > 0) {
        const colWApprox =
          (pageWpt -
            (marginLeftMm * 72) / 25.4 -
            (marginRightMm * 72) / 25.4) /
          Math.max(1, columns);
        const ak = computeAnswerKeyLayout({
          items: answerKeyItems,
          totalWidthPx: colWApprox,
          columnCount: 2,
          scale: 1,
        });
        reservedAboveFooterPt = ak.tableHeightPx + 6;
      }
    }

    return resolveCompactOptikFormPlacement({
      layout,
      pageWpt,
      pageHpt,
      marginTopMm,
      marginBottomMm,
      marginLeftMm,
      marginRightMm,
      columns,
      columnGapMm,
      rowCount: rows.length,
      bookletType,
      optionCount: activeOpts.length,
      reservedAboveFooterPt,
      offsetYPt: liveOffset ?? offsetYPt,
      headerStyleId,
      headerConfig,
      headerBottomGapMm,
      otherPageHeaderBottomGapMm,
      writtenPaperHeader,
    });
  }, [
    enabled,
    layout,
    questions,
    sections,
    optionCount,
    bookletType,
    pageWpt,
    pageHpt,
    marginTopMm,
    marginBottomMm,
    marginLeftMm,
    marginRightMm,
    columns,
    columnGapMm,
    offsetYPt,
    liveOffset,
    includeAnswerKey,
    answerKeyMode,
    headerStyleId,
    headerConfig,
    headerBottomGapMm,
    otherPageHeaderBottomGapMm,
    writtenPaperHeader,
  ]);

  useEffect(() => {
    if (!dragRef.current) setLiveOffset(null);
  }, [offsetYPt]);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      const dy = e.clientY - drag.startClientY;
      const next =
        drag.startOffset + clientDeltaToOptikOffsetDelta(dy, scale);
      setLiveOffset(next);
      onOffsetChange(next, "move");
    },
    [onOffsetChange, scale],
  );

  const endDrag = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      dragRef.current = null;
      const dy = e.clientY - drag.startClientY;
      const next =
        drag.startOffset + clientDeltaToOptikOffsetDelta(dy, scale);
      setLiveOffset(null);
      let reservedAboveFooterPt = 0;
      if (includeAnswerKey && answerKeyMode === "end_of_test") {
        const answerKeyItems: [number, string][] = layout
          .filter((l) => l.display_number != null)
          .sort((a, b) => (a.display_number as number) - (b.display_number as number))
          .map((l) => [
            l.display_number as number,
            (l.answer_key || "?").trim().toUpperCase() || "?",
          ]);
        if (answerKeyItems.length > 0) {
          const colWApprox =
            (pageWpt -
              (marginLeftMm * 72) / 25.4 -
              (marginRightMm * 72) / 25.4) /
            Math.max(1, columns);
          const ak = computeAnswerKeyLayout({
            items: answerKeyItems,
            totalWidthPx: colWApprox,
            columnCount: 2,
            scale: 1,
          });
          reservedAboveFooterPt = ak.tableHeightPx + 6;
        }
      }
      const rows = optikRowsFromLayoutItems(layout, questions, sections);
      const activeOpts = resolveOptikActiveOptions(questions, optionCount);
      const placed = resolveCompactOptikFormPlacement({
        layout,
        pageWpt,
        pageHpt,
        marginTopMm,
        marginBottomMm,
        marginLeftMm,
        marginRightMm,
        columns,
        columnGapMm,
        rowCount: rows.length,
        bookletType,
        optionCount: activeOpts.length,
        reservedAboveFooterPt,
        offsetYPt: next,
        headerStyleId,
        headerConfig,
        headerBottomGapMm,
        otherPageHeaderBottomGapMm,
        writtenPaperHeader,
      });
      onOffsetChange(placed?.offsetYPt ?? next, "commit");
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    },
    [
      onOffsetChange,
      onPointerMove,
      scale,
      layout,
      questions,
      optionCount,
      bookletType,
      pageWpt,
      pageHpt,
      marginTopMm,
      marginBottomMm,
      marginLeftMm,
      marginRightMm,
      columns,
      columnGapMm,
      includeAnswerKey,
      answerKeyMode,
      headerStyleId,
      headerConfig,
      headerBottomGapMm,
      otherPageHeaderBottomGapMm,
      writtenPaperHeader,
    ],
  );

  if (!enabled || !placement || placement.pageNum !== pageNum) return null;

  const left = placement.xPt * scale;
  const top = (pageHpt - placement.yTopPt) * scale;
  const width = placement.wPt * scale;
  const height = placement.hPt * scale;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[25]"
      style={{ width: pageWpx, height: pageHpx }}
    >
      <div
        className="pointer-events-auto absolute cursor-ns-resize rounded-sm border border-sky-400/70 bg-sky-500/10 hover:bg-sky-500/20"
        style={{ left, top, width, height }}
        title="Optik formu sürükleyerek yukarı/aşağı taşıyın"
        aria-label="Optik form dikey konum"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.stopPropagation();
          dragRef.current = {
            pointerId: e.pointerId,
            startClientY: e.clientY,
            startOffset: placement.offsetYPt,
          };
          setLiveOffset(placement.offsetYPt);
          window.addEventListener("pointermove", onPointerMove);
          window.addEventListener("pointerup", endDrag);
          window.addEventListener("pointercancel", endDrag);
        }}
      >
        <div className="absolute left-1/2 top-1.5 flex -translate-x-1/2 items-center gap-0.5 rounded bg-sky-600/80 px-1.5 py-0.5 text-[9px] font-semibold text-white shadow">
          <span aria-hidden>↕</span>
          Optik
        </div>
      </div>
    </div>
  );
}
