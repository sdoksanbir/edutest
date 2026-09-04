import { useMemo } from "react";
import QRCode from "qrcode";
import type { OptikChoice } from "../../utils/optikFormStats";
import type { OptikFormDrawRow } from "../../utils/optikFormLayout";
import {
  buildOptikFormId,
  buildOptikScanPayload,
  buildOptikScanQrText,
} from "../../utils/optikFormScanPayload";
import {
  computeOptikFormLayout,
  COMPACT_FORM_WIDTH_MM,
  COMPACT_PX_PER_MM,
  compactMarkerSizePx,
  estimateOptikFormHeightMm,
  OPTIK_FORM_COLORS,
} from "../../utils/optikFormLayoutEngine";
import type { OpticalFormSettings } from "../../utils/opticalFormSettings";
import { penaltyRuleToNetRule } from "../../utils/opticalFormSettings";
import {
  cornerFromMarkerId,
  fiducialPatternCells,
} from "../../utils/optikFormFiducials";

const FULL_PX_PER_MM = 3.5;

export type OpticalFormRendererProps = {
  rows: OptikFormDrawRow[];
  activeOptions: OptikChoice[];
  settings: OpticalFormSettings;
  testTitle?: string;
  compact?: boolean;
  formWidthMm?: number;
  className?: string;
  showAnswers?: boolean;
};

function useQrMatrix(data: string): boolean[][] | null {
  return useMemo(() => {
    try {
      const qr = QRCode.create(data, { errorCorrectionLevel: "M" });
      const n = qr.modules.size;
      const out: boolean[][] = [];
      for (let r = 0; r < n; r += 1) {
        const row: boolean[] = [];
        for (let c = 0; c < n; c += 1) {
          row.push(!!qr.modules.get(r, c));
        }
        out.push(row);
      }
      return out;
    } catch {
      return null;
    }
  }, [data]);
}

function FiducialMarker({ x, y, size, id }: { x: number; y: number; size: number; id: string }) {
  const corner = cornerFromMarkerId(id);
  const grid = fiducialPatternCells(corner);
  const n = grid.length;
  const cell = size / n;
  return (
    <g>
      <rect x={x} y={y} width={size} height={size} fill="#FFF" stroke="#000" strokeWidth={0.5} />
      {grid.map((row, r) =>
        row.map((on, c) => (
          <rect
            key={`${r}-${c}`}
            x={x + c * cell}
            y={y + r * cell}
            width={cell}
            height={cell}
            fill={on ? "#000" : "#FFF"}
          />
        )),
      )}
    </g>
  );
}

function StudentIdGrid({
  grid,
  headerFontSize,
  bubbleFontSize,
  bubbleR,
}: {
  grid: ReturnType<typeof computeOptikFormLayout>["studentIdGrid"];
  headerFontSize: number;
  bubbleFontSize: number;
  bubbleR: number;
}) {
  const colW = grid.w / grid.colCount;
  const innerW = grid.bodyBorderW * 0.45;

  return (
    <g>
      <rect
        x={grid.x}
        y={grid.y}
        width={grid.w}
        height={grid.h}
        fill={OPTIK_FORM_COLORS.bg}
      />
      <line
        x1={grid.x + grid.bodyBorderW / 2}
        y1={grid.y + grid.headerH + grid.writeRowH}
        x2={grid.x + grid.bodyBorderW / 2}
        y2={grid.y + grid.h - grid.bodyBorderW / 2}
        stroke={OPTIK_FORM_COLORS.border}
        strokeWidth={grid.bodyBorderW}
      />
      <line
        x1={grid.x + grid.w - grid.bodyBorderW / 2}
        y1={grid.y + grid.headerH + grid.writeRowH}
        x2={grid.x + grid.w - grid.bodyBorderW / 2}
        y2={grid.y + grid.h - grid.bodyBorderW / 2}
        stroke={OPTIK_FORM_COLORS.border}
        strokeWidth={grid.bodyBorderW}
      />
      <line
        x1={grid.x}
        y1={grid.y + grid.h - grid.bodyBorderW / 2}
        x2={grid.x + grid.w}
        y2={grid.y + grid.h - grid.bodyBorderW / 2}
        stroke={OPTIK_FORM_COLORS.border}
        strokeWidth={grid.bodyBorderW}
      />
      <rect
        x={grid.x}
        y={grid.y}
        width={grid.w}
        height={grid.headerH}
        fill={OPTIK_FORM_COLORS.panelHeader}
      />
      <line
        x1={grid.x}
        y1={grid.y + grid.borderW / 2}
        x2={grid.x + grid.w}
        y2={grid.y + grid.borderW / 2}
        stroke={OPTIK_FORM_COLORS.border}
        strokeWidth={grid.borderW}
      />
      <line
        x1={grid.x + grid.borderW / 2}
        y1={grid.y}
        x2={grid.x + grid.borderW / 2}
        y2={grid.y + grid.headerH}
        stroke={OPTIK_FORM_COLORS.border}
        strokeWidth={grid.borderW}
      />
      <line
        x1={grid.x + grid.w - grid.borderW / 2}
        y1={grid.y}
        x2={grid.x + grid.w - grid.borderW / 2}
        y2={grid.y + grid.headerH}
        stroke={OPTIK_FORM_COLORS.border}
        strokeWidth={grid.borderW}
      />
      <line
        x1={grid.x}
        y1={grid.y + grid.headerH - grid.headerLineW / 2}
        x2={grid.x + grid.w}
        y2={grid.y + grid.headerH - grid.headerLineW / 2}
        stroke={OPTIK_FORM_COLORS.border}
        strokeWidth={grid.headerLineW}
      />
      <text
        x={grid.x + grid.w / 2}
        y={grid.y + grid.headerH / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={OPTIK_FORM_COLORS.text}
        fontSize={headerFontSize}
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
      >
        ÖĞR. NO
      </text>

      {grid.writeCells.map((cell) => (
        <rect
          key={`w-${cell.column}`}
          x={cell.x}
          y={cell.y}
          width={cell.w}
          height={cell.h}
          fill={OPTIK_FORM_COLORS.bg}
        />
      ))}

      <line
        x1={grid.x + grid.borderW / 2}
        y1={grid.y + grid.headerH}
        x2={grid.x + grid.borderW / 2}
        y2={grid.y + grid.headerH + grid.writeRowH}
        stroke={OPTIK_FORM_COLORS.border}
        strokeWidth={grid.borderW}
      />
      <line
        x1={grid.x + grid.w - grid.borderW / 2}
        y1={grid.y + grid.headerH}
        x2={grid.x + grid.w - grid.borderW / 2}
        y2={grid.y + grid.headerH + grid.writeRowH}
        stroke={OPTIK_FORM_COLORS.border}
        strokeWidth={grid.borderW}
      />
      <line
        x1={grid.x}
        y1={grid.y + grid.headerH + grid.writeRowH - grid.borderW / 2}
        x2={grid.x + grid.w}
        y2={grid.y + grid.headerH + grid.writeRowH - grid.borderW / 2}
        stroke={OPTIK_FORM_COLORS.border}
        strokeWidth={grid.borderW}
      />

      {Array.from({ length: grid.colCount - 1 }, (_, i) => {
        const lx = grid.x + (i + 1) * colW;
        return (
          <line
            key={`write-col-${i}`}
            x1={lx}
            y1={grid.y + grid.headerH}
            x2={lx}
            y2={grid.y + grid.headerH + grid.writeRowH}
            stroke={OPTIK_FORM_COLORS.border}
            strokeWidth={innerW}
          />
        );
      })}

      {Array.from({ length: grid.colCount - 1 }, (_, i) => {
        const lx = grid.x + (i + 1) * colW;
        return (
          <line
            key={`col-${i}`}
            x1={lx}
            y1={grid.y + grid.headerH + grid.writeRowH}
            x2={lx}
            y2={grid.y + grid.h}
            stroke={OPTIK_FORM_COLORS.border}
            strokeWidth={innerW}
          />
        );
      })}

      {Array.from({ length: grid.rowCount - 1 }, (_, i) => {
        const digitRowTop = grid.y + grid.headerH + grid.writeRowH;
        const rowH = (grid.h - grid.headerH - grid.writeRowH) / grid.rowCount;
        const ly = digitRowTop + (i + 1) * rowH;
        return (
          <line
            key={`row-${i}`}
            x1={grid.x + grid.bodyBorderW}
            y1={ly}
            x2={grid.x + grid.w - grid.bodyBorderW}
            y2={ly}
            stroke={OPTIK_FORM_COLORS.borderLight}
            strokeWidth={0.5}
          />
        );
      })}

      {grid.bubbles.map((b) => (
        <g key={`${b.column}-${b.digit}`}>
          <circle
            cx={b.cx}
            cy={b.cy}
            r={bubbleR}
            fill="none"
            stroke={OPTIK_FORM_COLORS.bubbleBorder}
            strokeWidth={1}
          />
          <text
            x={b.cx}
            y={b.cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={OPTIK_FORM_COLORS.textMuted}
            fontSize={bubbleFontSize}
            fontWeight="600"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            {b.digit}
          </text>
        </g>
      ))}
    </g>
  );
}

export default function OpticalFormRenderer({
  rows,
  activeOptions,
  settings,
  testTitle = "TEST",
  compact = false,
  formWidthMm = compact ? COMPACT_FORM_WIDTH_MM : 180,
  className,
  showAnswers = false,
}: OpticalFormRendererProps) {
  const pxPerMm = compact ? COMPACT_PX_PER_MM : FULL_PX_PER_MM;

  const formId = useMemo(() => buildOptikFormId(testTitle, rows), [testTitle, rows]);

  const formHeightMm = useMemo(
    () =>
      estimateOptikFormHeightMm(
        rows.length,
        formWidthMm,
        compact,
        settings.bookletType,
        pxPerMm,
        activeOptions.length,
      ),
    [rows.length, formWidthMm, compact, settings.bookletType, pxPerMm, activeOptions.length],
  );

  const layout = useMemo(
    () =>
      computeOptikFormLayout({
        formWidthMm,
        formHeightMm,
        scale: pxPerMm,
        pxPerMm,
        rowCount: rows.length,
        activeOptions,
        formId,
        compact,
        bookletType: settings.bookletType,
        scoringRule: penaltyRuleToNetRule(settings.penaltyRule),
        testTitle,
      }),
    [
      formWidthMm,
      formHeightMm,
      pxPerMm,
      rows.length,
      activeOptions,
      formId,
      compact,
      settings.bookletType,
      settings.penaltyRule,
      testTitle,
    ],
  );

  const qrText = useMemo(() => {
    const payload = buildOptikScanPayload({
      formId,
      testTitle,
      rows,
      activeOptions,
      netRule: penaltyRuleToNetRule(settings.penaltyRule),
      bookletType: settings.bookletType,
    });
    return buildOptikScanQrText(payload);
  }, [formId, testTitle, rows, activeOptions, settings.penaltyRule, settings.bookletType]);

  const qrMatrix = useQrMatrix(qrText);
  const w = layout.widthPx;
  const h = layout.heightPx;
  const sid = layout.studentIdGrid;
  const ab = layout.answersBox;
  const bubbleR = layout.bubbleDiameterPx / 2;
  const choiceFontSize = layout.bubbleLabelFontPx;
  const questionNumFontSize = layout.questionNumFontPx;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height="auto"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      aria-label="Optik cevap formu"
    >
      <rect x={0} y={0} width={w} height={h} fill={OPTIK_FORM_COLORS.bg} />

      {layout.markers.map((m) => (
        <FiducialMarker
          key={m.id}
          x={m.x}
          y={m.y}
          size={compact ? compactMarkerSizePx(pxPerMm) : m.size}
          id={m.id}
        />
      ))}

      <text
        x={layout.header.titleX ?? sid.x}
        y={layout.header.titleY}
        textAnchor="start"
        dominantBaseline="middle"
        fill={OPTIK_FORM_COLORS.text}
        fontSize={layout.formTitleFontPx}
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
      >
        CEVAP FORMU
      </text>
      <text
        x={layout.header.subtitleX ?? w - sid.x}
        y={layout.header.titleY}
        textAnchor="end"
        dominantBaseline="middle"
        fill={OPTIK_FORM_COLORS.textMuted}
        fontSize={layout.formSubtitleFontPx}
        fontFamily="Arial, Helvetica, sans-serif"
      >
        {rows.length} soru · {activeOptions.length} şık
      </text>

      <line
        x1={sid.x}
        y1={layout.header.dividerY}
        x2={ab.x + ab.w}
        y2={layout.header.dividerY}
        stroke={OPTIK_FORM_COLORS.border}
        strokeWidth={compact ? 0.8 : 1}
      />

      <StudentIdGrid
        grid={sid}
        headerFontSize={layout.answersHeaderFontPx}
        bubbleFontSize={choiceFontSize}
        bubbleR={bubbleR}
      />

      {qrMatrix ? (
        <g>
          <rect
            x={layout.qr.frame.x}
            y={layout.qr.frame.y}
            width={layout.qr.frame.size}
            height={layout.qr.frame.size}
            fill="#fff"
            stroke={OPTIK_FORM_COLORS.border}
            strokeWidth={layout.qr.frame.borderW}
          />
          <g transform={`translate(${layout.qr.code.x}, ${layout.qr.code.y})`}>
            {qrMatrix.map((row, r) =>
              row.map((on, c) =>
                on ? (
                  <rect
                    key={`${r}-${c}`}
                    x={(c * layout.qr.code.size) / qrMatrix.length}
                    y={(r * layout.qr.code.size) / qrMatrix.length}
                    width={layout.qr.code.size / qrMatrix.length + 0.5}
                    height={layout.qr.code.size / qrMatrix.length + 0.5}
                    fill="#000"
                  />
                ) : null,
              ),
            )}
          </g>
          <text
            x={layout.qr.frame.x + layout.qr.frame.size / 2}
            y={layout.qr.labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={OPTIK_FORM_COLORS.textMuted}
            fontSize={compact ? 8 : 9}
            fontFamily="Arial, Helvetica, sans-serif"
          >
            tara
          </text>
        </g>
      ) : null}

      {layout.booklet ? (
        <g>
          <rect
            x={layout.booklet.x + layout.booklet.borderW / 2}
            y={layout.booklet.y + layout.booklet.borderW / 2}
            width={layout.booklet.w - layout.booklet.borderW}
            height={layout.booklet.h - layout.booklet.borderW}
            fill={OPTIK_FORM_COLORS.bg}
            stroke={OPTIK_FORM_COLORS.border}
            strokeWidth={layout.booklet.borderW}
          />
          <rect
            x={layout.booklet.x + layout.booklet.borderW}
            y={layout.booklet.y + layout.booklet.borderW}
            width={layout.booklet.labelW}
            height={layout.booklet.labelH}
            fill={OPTIK_FORM_COLORS.marker}
          />
          <text
            x={layout.booklet.labelX}
            y={layout.booklet.labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={OPTIK_FORM_COLORS.bg}
            fontSize={layout.booklet.typeLabelFontPx}
            fontWeight="600"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            {layout.booklet.typeLabel}
          </text>
          {layout.booklet.bubbles.map((bb) => (
            <g key={bb.booklet}>
              <circle
                cx={bb.cx}
                cy={bb.cy}
                r={bubbleR}
                fill="none"
                stroke={OPTIK_FORM_COLORS.bubbleBorder}
                strokeWidth={1}
              />
              <text
                x={bb.cx}
                y={bb.cy}
                textAnchor="middle"
                dominantBaseline="central"
                alignmentBaseline="central"
                fill={OPTIK_FORM_COLORS.textMuted}
                fontSize={choiceFontSize}
                fontWeight="600"
                fontFamily="Arial, Helvetica, sans-serif"
              >
                {bb.booklet}
              </text>
            </g>
          ))}
        </g>
      ) : null}

      <rect
        x={ab.x}
        y={ab.y}
        width={ab.w}
        height={ab.h}
        fill={OPTIK_FORM_COLORS.bg}
      />
      <line
        x1={ab.x + ab.bodyBorderW / 2}
        y1={ab.y + ab.headerH}
        x2={ab.x + ab.bodyBorderW / 2}
        y2={ab.y + ab.h - ab.bodyBorderW / 2}
        stroke={OPTIK_FORM_COLORS.border}
        strokeWidth={ab.bodyBorderW}
      />
      <line
        x1={ab.x + ab.w - ab.bodyBorderW / 2}
        y1={ab.y + ab.headerH}
        x2={ab.x + ab.w - ab.bodyBorderW / 2}
        y2={ab.y + ab.h - ab.bodyBorderW / 2}
        stroke={OPTIK_FORM_COLORS.border}
        strokeWidth={ab.bodyBorderW}
      />
      <line
        x1={ab.x}
        y1={ab.y + ab.h - ab.bodyBorderW / 2}
        x2={ab.x + ab.w}
        y2={ab.y + ab.h - ab.bodyBorderW / 2}
        stroke={OPTIK_FORM_COLORS.border}
        strokeWidth={ab.bodyBorderW}
      />
      <rect
        x={ab.x}
        y={ab.y}
        width={ab.w}
        height={ab.headerH}
        fill={OPTIK_FORM_COLORS.panelHeader}
      />
      <line
        x1={ab.x}
        y1={ab.y + ab.borderW / 2}
        x2={ab.x + ab.w}
        y2={ab.y + ab.borderW / 2}
        stroke={OPTIK_FORM_COLORS.border}
        strokeWidth={ab.borderW}
      />
      <line
        x1={ab.x + ab.borderW / 2}
        y1={ab.y}
        x2={ab.x + ab.borderW / 2}
        y2={ab.y + ab.headerH}
        stroke={OPTIK_FORM_COLORS.border}
        strokeWidth={ab.borderW}
      />
      <line
        x1={ab.x + ab.w - ab.borderW / 2}
        y1={ab.y}
        x2={ab.x + ab.w - ab.borderW / 2}
        y2={ab.y + ab.headerH}
        stroke={OPTIK_FORM_COLORS.border}
        strokeWidth={ab.borderW}
      />
      <line
        x1={ab.x}
        y1={ab.y + ab.headerH - ab.headerLineW / 2}
        x2={ab.x + ab.w}
        y2={ab.y + ab.headerH - ab.headerLineW / 2}
        stroke={OPTIK_FORM_COLORS.border}
        strokeWidth={ab.headerLineW}
      />
      <text
        x={ab.x + ab.w / 2}
        y={ab.y + ab.headerH / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={OPTIK_FORM_COLORS.text}
        fontSize={layout.answersHeaderFontPx}
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
      >
        CEVAPLAR
      </text>

      {layout.columns.map((col, ci) => (
        <g key={ci}>
          {col.rows.map((row) => {
            const answer = showAnswers
              ? (rows.find((r) => r.number === row.number)?.answer ?? null)
              : null;
            const stripe = row.number % 2 === 0;
            return (
              <g key={row.number}>
                {stripe ? (
                  <rect
                    x={col.innerX}
                    y={row.y}
                    width={col.innerW}
                    height={layout.rowHeightPx}
                    fill={OPTIK_FORM_COLORS.rowStripe}
                    opacity={0.85}
                  />
                ) : null}
                <rect
                  x={row.timingMark.x}
                  y={row.timingMark.y}
                  width={row.timingMark.w}
                  height={row.timingMark.h}
                  fill={OPTIK_FORM_COLORS.marker}
                />
                <text
                  x={row.numX}
                  y={row.y + layout.rowHeightPx / 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill={OPTIK_FORM_COLORS.text}
                  fontSize={questionNumFontSize}
                  fontWeight="700"
                  fontFamily="Arial, Helvetica, sans-serif"
                >
                  {row.number}.
                </text>
                {row.bubbles.map((b) => (
                  <g key={b.choice}>
                    <circle
                      cx={b.cx}
                      cy={b.cy}
                      r={bubbleR}
                      fill={answer === b.choice ? OPTIK_FORM_COLORS.marker : "none"}
                      stroke={OPTIK_FORM_COLORS.bubbleBorder}
                      strokeWidth={1}
                    />
                    <text
                      x={b.cx}
                      y={b.cy}
                      textAnchor="middle"
                      dominantBaseline="central"
                      alignmentBaseline="central"
                      fill={
                        answer === b.choice ? OPTIK_FORM_COLORS.bg : OPTIK_FORM_COLORS.textMuted
                      }
                      fontSize={choiceFontSize}
                      fontWeight="600"
                      fontFamily="Arial, Helvetica, sans-serif"
                    >
                      {b.choice}
                    </text>
                  </g>
                ))}
              </g>
            );
          })}
        </g>
      ))}

      {ab.columnDivider ? (
        <line
          x1={ab.columnDivider.x}
          y1={ab.columnDivider.y1}
          x2={ab.columnDivider.x}
          y2={ab.columnDivider.y2}
          stroke={OPTIK_FORM_COLORS.border}
          strokeWidth={ab.borderW * 0.65}
        />
      ) : null}

      {settings.showInstructions && settings.instructionText.trim() ? (
        <text
          x={w / 2}
          y={h - 4}
          textAnchor="middle"
          dominantBaseline="auto"
          fill={OPTIK_FORM_COLORS.textMuted}
          fontSize={compact ? 8 : 9}
          fontFamily="Arial, Helvetica, sans-serif"
        >
          {settings.instructionText.trim().slice(0, 90)}
        </text>
      ) : null}
    </svg>
  );
}
