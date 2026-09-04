import QRCode from "qrcode";
import type { OptikChoice } from "./optikFormStats";
import type { OptikFormDrawRow } from "./optikFormLayout";
import type { OptikFormBookletType, OptikFormNetRule } from "./optikFormSettings";
import {
  buildOptikFormId,
  buildOptikScanPayload,
  buildOptikScanQrText,
} from "./optikFormScanPayload";
import {
  computeOptikFormLayout,
  COMPACT_FORM_WIDTH_MM,
  estimateCompactOptikFormHeightPx,
  estimateOptikFormHeightMm,
  OPTIK_FORM_COLORS,
  ptToMm,
} from "./optikFormLayoutEngine";
import type { OptikFormLayoutResult, OptikFormMetadata } from "./optikFormTypes";
import { cornerFromMarkerId, drawFiducialCanvas } from "./optikFormFiducials";

type SharedDrawParams = {
  ctx: CanvasRenderingContext2D;
  scale: number;
  rows: OptikFormDrawRow[];
  activeOptions: OptikChoice[];
  showAnswers?: boolean;
  testTitle?: string;
  netRule?: OptikFormNetRule;
  bookletType?: OptikFormBookletType;
};

function drawQrCode(
  ctx: CanvasRenderingContext2D,
  frame: { x: number; y: number; size: number; borderW: number },
  code: { x: number; y: number; size: number },
  data: string,
) {
  ctx.fillStyle = OPTIK_FORM_COLORS.bg;
  ctx.fillRect(frame.x, frame.y, frame.size, frame.size);
  ctx.strokeStyle = OPTIK_FORM_COLORS.border;
  ctx.lineWidth = frame.borderW;
  ctx.strokeRect(frame.x, frame.y, frame.size, frame.size);

  const qr = QRCode.create(data, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const cell = code.size / n;
  ctx.fillStyle = OPTIK_FORM_COLORS.bg;
  ctx.fillRect(code.x, code.y, code.size, code.size);
  ctx.fillStyle = OPTIK_FORM_COLORS.marker;
  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) {
      if (qr.modules.get(row, col)) {
        ctx.fillRect(code.x + col * cell, code.y + row * cell, cell + 0.5, cell + 0.5);
      }
    }
  }
}

function drawBubble(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  filled: boolean,
  scale: number,
  label?: string,
  labelFontPx?: number,
) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  if (filled) {
    ctx.fillStyle = OPTIK_FORM_COLORS.marker;
    ctx.fill();
  } else {
    ctx.strokeStyle = OPTIK_FORM_COLORS.bubbleBorder;
    ctx.lineWidth = 0.4 * scale;
    ctx.stroke();
  }
  if (label) {
    ctx.fillStyle = filled ? OPTIK_FORM_COLORS.bg : OPTIK_FORM_COLORS.textMuted;
    const fontPx = labelFontPx ?? Math.max(8, r * 0.95);
    ctx.font = `600 ${fontPx}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const metrics = ctx.measureText(label);
    const ascent = metrics.actualBoundingBoxAscent ?? fontPx * 0.72;
    const descent = metrics.actualBoundingBoxDescent ?? fontPx * 0.2;
    ctx.fillText(label, cx, cy + (ascent - descent) / 2);
  }
}

function buildLayout(
  params: SharedDrawParams & {
    formWidthMm: number;
    formHeightMm: number;
    compact: boolean;
  },
): OptikFormLayoutResult {
  const formId = buildOptikFormId(params.testTitle ?? "", params.rows);
  return computeOptikFormLayout({
    formWidthMm: params.formWidthMm,
    formHeightMm: params.formHeightMm,
    scale: params.scale,
    rowCount: params.rows.length,
    activeOptions: params.activeOptions,
    formId,
    compact: params.compact,
    bookletType: params.bookletType ?? "none",
    scoringRule: params.netRule ?? "4",
    testTitle: params.testTitle,
  });
}

function drawOmrForm(
  params: SharedDrawParams & {
    x: number;
    y: number;
    formWidthMm: number;
    formHeightMm: number;
    compact: boolean;
    instructionText?: string;
    instructionEnabled?: boolean;
  },
): OptikFormMetadata {
  const {
    ctx,
    x,
    y,
    scale,
    rows,
    activeOptions,
    showAnswers = false,
    testTitle = "",
    compact,
    instructionText,
    instructionEnabled,
    bookletType = "none",
  } = params;

  const layout = buildLayout(params);
  const payload = buildOptikScanPayload({
    formId: layout.formId,
    testTitle,
    rows,
    activeOptions,
    netRule: params.netRule ?? "4",
    bookletType,
  });
  const qrText = buildOptikScanQrText(payload);
  const fs = scale;
  const sid = layout.studentIdGrid;
  const ab = layout.answersBox;
  const bubbleR = layout.bubbleDiameterPx / 2;
  const choiceFontSize = layout.bubbleLabelFontPx;
  const questionNumFontSize = layout.questionNumFontPx;

  ctx.fillStyle = OPTIK_FORM_COLORS.bg;
  ctx.fillRect(x, y, layout.widthPx, layout.heightPx);

  for (const marker of layout.markers) {
    drawFiducialCanvas(ctx, x + marker.x, y + marker.y, marker.size, cornerFromMarkerId(marker.id));
  }

  ctx.fillStyle = OPTIK_FORM_COLORS.text;
  ctx.font = `bold ${layout.formTitleFontPx}px Arial`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("CEVAP FORMU", x + (layout.header.titleX ?? sid.x), y + layout.header.titleY);

  ctx.fillStyle = OPTIK_FORM_COLORS.textMuted;
  ctx.font = `${layout.formSubtitleFontPx}px Arial`;
  ctx.textAlign = "right";
  ctx.fillText(
    `${rows.length} soru · ${activeOptions.length} şık`,
    x + (layout.header.subtitleX ?? layout.widthPx - sid.x),
    y + layout.header.titleY,
  );

  ctx.strokeStyle = OPTIK_FORM_COLORS.border;
  ctx.lineWidth = compact ? 0.8 : 1;
  ctx.beginPath();
  ctx.moveTo(x + sid.x, y + layout.header.dividerY);
  ctx.lineTo(x + ab.x + ab.w, y + layout.header.dividerY);
  ctx.stroke();

  const colW = sid.w / sid.colCount;
  const innerW = sid.bodyBorderW * 0.45;
  ctx.fillStyle = OPTIK_FORM_COLORS.bg;
  ctx.fillRect(x + sid.x, y + sid.y, sid.w, sid.h);
  ctx.strokeStyle = OPTIK_FORM_COLORS.border;
  ctx.lineWidth = sid.bodyBorderW;
  ctx.beginPath();
  ctx.moveTo(x + sid.x + sid.bodyBorderW / 2, y + sid.y + sid.headerH + sid.writeRowH);
  ctx.lineTo(x + sid.x + sid.bodyBorderW / 2, y + sid.y + sid.h - sid.bodyBorderW / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + sid.x + sid.w - sid.bodyBorderW / 2, y + sid.y + sid.headerH + sid.writeRowH);
  ctx.lineTo(x + sid.x + sid.w - sid.bodyBorderW / 2, y + sid.y + sid.h - sid.bodyBorderW / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + sid.x, y + sid.y + sid.h - sid.bodyBorderW / 2);
  ctx.lineTo(x + sid.x + sid.w, y + sid.y + sid.h - sid.bodyBorderW / 2);
  ctx.stroke();
  ctx.fillStyle = OPTIK_FORM_COLORS.panelHeader;
  ctx.fillRect(x + sid.x, y + sid.y, sid.w, sid.headerH);
  ctx.lineWidth = sid.borderW;
  ctx.beginPath();
  ctx.moveTo(x + sid.x, y + sid.y + sid.borderW / 2);
  ctx.lineTo(x + sid.x + sid.w, y + sid.y + sid.borderW / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + sid.x + sid.borderW / 2, y + sid.y);
  ctx.lineTo(x + sid.x + sid.borderW / 2, y + sid.y + sid.headerH);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + sid.x + sid.w - sid.borderW / 2, y + sid.y);
  ctx.lineTo(x + sid.x + sid.w - sid.borderW / 2, y + sid.y + sid.headerH);
  ctx.stroke();
  ctx.lineWidth = sid.headerLineW;
  ctx.beginPath();
  ctx.moveTo(x + sid.x, y + sid.y + sid.headerH - sid.headerLineW / 2);
  ctx.lineTo(x + sid.x + sid.w, y + sid.y + sid.headerH - sid.headerLineW / 2);
  ctx.stroke();
  ctx.fillStyle = OPTIK_FORM_COLORS.text;
  ctx.font = `bold ${layout.answersHeaderFontPx}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ÖĞR. NO", x + sid.x + sid.w / 2, y + sid.y + sid.headerH / 2);

  for (const cell of sid.writeCells) {
    ctx.fillStyle = OPTIK_FORM_COLORS.bg;
    ctx.fillRect(x + cell.x, y + cell.y, cell.w, cell.h);
  }
  ctx.strokeStyle = OPTIK_FORM_COLORS.border;
  ctx.lineWidth = sid.borderW;
  ctx.beginPath();
  ctx.moveTo(x + sid.x + sid.borderW / 2, y + sid.y + sid.headerH);
  ctx.lineTo(x + sid.x + sid.borderW / 2, y + sid.y + sid.headerH + sid.writeRowH);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + sid.x + sid.w - sid.borderW / 2, y + sid.y + sid.headerH);
  ctx.lineTo(x + sid.x + sid.w - sid.borderW / 2, y + sid.y + sid.headerH + sid.writeRowH);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + sid.x, y + sid.y + sid.headerH + sid.writeRowH - sid.borderW / 2);
  ctx.lineTo(x + sid.x + sid.w, y + sid.y + sid.headerH + sid.writeRowH - sid.borderW / 2);
  ctx.stroke();
  ctx.lineWidth = innerW;
  for (let i = 1; i < sid.colCount; i += 1) {
    const lx = x + sid.x + i * colW;
    ctx.beginPath();
    ctx.moveTo(lx, y + sid.y + sid.headerH);
    ctx.lineTo(lx, y + sid.y + sid.headerH + sid.writeRowH);
    ctx.stroke();
  }
  for (let i = 1; i < sid.colCount; i += 1) {
    const lx = x + sid.x + i * colW;
    ctx.strokeStyle = OPTIK_FORM_COLORS.border;
    ctx.lineWidth = innerW;
    ctx.beginPath();
    ctx.moveTo(lx, y + sid.y + sid.headerH + sid.writeRowH);
    ctx.lineTo(lx, y + sid.y + sid.h);
    ctx.stroke();
  }
  const digitRowTop = sid.y + sid.headerH + sid.writeRowH;
  const digitRowH = (sid.h - sid.headerH - sid.writeRowH) / sid.rowCount;
  ctx.strokeStyle = OPTIK_FORM_COLORS.borderLight;
  ctx.lineWidth = 0.5;
  for (let i = 1; i < sid.rowCount; i += 1) {
    const ly = y + digitRowTop + i * digitRowH;
    ctx.beginPath();
    ctx.moveTo(x + sid.x + sid.bodyBorderW, ly);
    ctx.lineTo(x + sid.x + sid.w - sid.bodyBorderW, ly);
    ctx.stroke();
  }

  for (const b of sid.bubbles) {
    drawBubble(ctx, x + b.cx, y + b.cy, bubbleR, false, scale, String(b.digit), choiceFontSize);
  }

  drawQrCode(
    ctx,
    {
      x: x + layout.qr.frame.x,
      y: y + layout.qr.frame.y,
      size: layout.qr.frame.size,
      borderW: layout.qr.frame.borderW,
    },
    {
      x: x + layout.qr.code.x,
      y: y + layout.qr.code.y,
      size: layout.qr.code.size,
    },
    qrText,
  );
  ctx.fillStyle = OPTIK_FORM_COLORS.textMuted;
  ctx.font = `${(compact ? 4 : 4.5) * fs}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    "tara",
    x + layout.qr.frame.x + layout.qr.frame.size / 2,
    y + layout.qr.labelY,
  );

  if (layout.booklet) {
    const bb = layout.booklet;
    ctx.fillStyle = OPTIK_FORM_COLORS.bg;
    ctx.fillRect(x + bb.x, y + bb.y, bb.w, bb.h);
    ctx.strokeStyle = OPTIK_FORM_COLORS.border;
    ctx.lineWidth = bb.borderW;
    ctx.strokeRect(
      x + bb.x + bb.borderW / 2,
      y + bb.y + bb.borderW / 2,
      bb.w - bb.borderW,
      bb.h - bb.borderW,
    );
    ctx.fillStyle = OPTIK_FORM_COLORS.marker;
    ctx.fillRect(
      x + bb.x + bb.borderW,
      y + bb.y + bb.borderW,
      bb.labelW,
      bb.labelH,
    );
    ctx.fillStyle = OPTIK_FORM_COLORS.bg;
    ctx.font = `600 ${bb.typeLabelFontPx}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(bb.typeLabel, x + bb.labelX, y + bb.labelY);
    for (const bubble of bb.bubbles) {
      drawBubble(
        ctx,
        x + bubble.cx,
        y + bubble.cy,
        bubble.r,
        false,
        scale,
        bubble.booklet,
        choiceFontSize,
      );
    }
  }

  ctx.fillStyle = OPTIK_FORM_COLORS.bg;
  ctx.fillRect(x + ab.x, y + ab.y, ab.w, ab.h);
  ctx.strokeStyle = OPTIK_FORM_COLORS.border;
  ctx.lineWidth = ab.bodyBorderW;
  ctx.beginPath();
  ctx.moveTo(x + ab.x + ab.bodyBorderW / 2, y + ab.y + ab.headerH);
  ctx.lineTo(x + ab.x + ab.bodyBorderW / 2, y + ab.y + ab.h - ab.bodyBorderW / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + ab.x + ab.w - ab.bodyBorderW / 2, y + ab.y + ab.headerH);
  ctx.lineTo(x + ab.x + ab.w - ab.bodyBorderW / 2, y + ab.y + ab.h - ab.bodyBorderW / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + ab.x, y + ab.y + ab.h - ab.bodyBorderW / 2);
  ctx.lineTo(x + ab.x + ab.w, y + ab.y + ab.h - ab.bodyBorderW / 2);
  ctx.stroke();
  ctx.fillStyle = OPTIK_FORM_COLORS.panelHeader;
  ctx.fillRect(x + ab.x, y + ab.y, ab.w, ab.headerH);
  ctx.lineWidth = ab.borderW;
  ctx.beginPath();
  ctx.moveTo(x + ab.x, y + ab.y + ab.borderW / 2);
  ctx.lineTo(x + ab.x + ab.w, y + ab.y + ab.borderW / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + ab.x + ab.borderW / 2, y + ab.y);
  ctx.lineTo(x + ab.x + ab.borderW / 2, y + ab.y + ab.headerH);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + ab.x + ab.w - ab.borderW / 2, y + ab.y);
  ctx.lineTo(x + ab.x + ab.w - ab.borderW / 2, y + ab.y + ab.headerH);
  ctx.stroke();
  ctx.lineWidth = ab.headerLineW;
  ctx.beginPath();
  ctx.moveTo(x + ab.x, y + ab.y + ab.headerH - ab.headerLineW / 2);
  ctx.lineTo(x + ab.x + ab.w, y + ab.y + ab.headerH - ab.headerLineW / 2);
  ctx.stroke();
  ctx.fillStyle = OPTIK_FORM_COLORS.text;
  ctx.font = `bold ${layout.answersHeaderFontPx}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CEVAPLAR", x + ab.x + ab.w / 2, y + ab.y + ab.headerH / 2);

  for (const col of layout.columns) {
    for (const row of col.rows) {
      const drawRow = rows.find((r) => r.number === row.number);
      const selected = showAnswers ? (drawRow?.answer ?? null) : null;
      const stripe = row.number % 2 === 0;

      if (stripe) {
        ctx.fillStyle = OPTIK_FORM_COLORS.rowStripe;
        ctx.fillRect(x + col.innerX, y + row.y, col.innerW, layout.rowHeightPx);
      }

      ctx.fillStyle = OPTIK_FORM_COLORS.marker;
      ctx.fillRect(
        x + row.timingMark.x,
        y + row.timingMark.y,
        row.timingMark.w,
        row.timingMark.h,
      );

      ctx.fillStyle = OPTIK_FORM_COLORS.text;
      ctx.font = `700 ${questionNumFontSize}px Arial`;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(
        `${row.number}.`,
        x + row.numX,
        y + row.y + layout.rowHeightPx / 2,
      );

      for (const bubble of row.bubbles) {
        drawBubble(
          ctx,
          x + bubble.cx,
          y + bubble.cy,
          bubbleR,
          selected === bubble.choice,
          scale,
          bubble.choice,
          choiceFontSize,
        );
      }
    }
  }

  if (ab.columnDivider) {
    ctx.strokeStyle = OPTIK_FORM_COLORS.border;
    ctx.lineWidth = ab.borderW * 0.65;
    ctx.beginPath();
    ctx.moveTo(x + ab.columnDivider.x, y + ab.columnDivider.y1);
    ctx.lineTo(x + ab.columnDivider.x, y + ab.columnDivider.y2);
    ctx.stroke();
  }

  if (instructionEnabled && instructionText?.trim()) {
    ctx.fillStyle = OPTIK_FORM_COLORS.textMuted;
    ctx.font = `${(compact ? 4 : 4.5) * fs}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(
      instructionText.trim().slice(0, 90),
      x + layout.widthPx / 2,
      y + layout.heightPx - 1.5 * fs,
    );
  }

  return layout.metadata;
}

export function estimateCompactOptikFormHeight(
  rowCount: number,
  scale: number,
  formWidthPt?: number,
  bookletType: OptikFormBookletType = "none",
  optionCount = 5,
): number {
  const formWidthMm = formWidthPt ? ptToMm(formWidthPt) : COMPACT_FORM_WIDTH_MM;
  return estimateCompactOptikFormHeightPx(
    rowCount,
    formWidthMm,
    scale,
    bookletType,
    undefined,
    optionCount,
  );
}

export function drawOptikFormCompactCanvas(
  params: SharedDrawParams & {
    x: number;
    y: number;
    width: number;
    schoolName?: string;
  },
): number {
  const formWidthMm = ptToMm(params.width / params.scale);
  const formHeightMm = estimateOptikFormHeightMm(
    params.rows.length,
    formWidthMm,
    true,
    params.bookletType ?? "none",
    undefined,
    params.activeOptions.length,
  );

  const layout = buildLayout({
    ...params,
    formWidthMm,
    formHeightMm,
    compact: true,
    testTitle: params.testTitle ?? params.schoolName ?? "",
  });

  drawOmrForm({
    ...params,
    formWidthMm,
    formHeightMm,
    compact: true,
    testTitle: params.testTitle ?? params.schoolName ?? "",
  });

  return layout.heightPx;
}

export function drawOptikFormFullPageCanvas(
  params: SharedDrawParams & {
    x: number;
    y: number;
    width: number;
    height: number;
    schoolName?: string;
    instructionText?: string;
    instructionEnabled?: boolean;
    netRule?: OptikFormNetRule;
  },
): OptikFormMetadata {
  const formWidthMm = ptToMm(params.width / params.scale);
  const formHeightMm = ptToMm(params.height / params.scale);

  return drawOmrForm({
    ...params,
    formWidthMm,
    formHeightMm,
    compact: false,
    testTitle: params.testTitle ?? params.schoolName ?? "",
    netRule: params.netRule ?? "4",
  });
}

export function getOmrFormLayoutForScan(
  widthPx: number,
  heightPx: number,
  scale: number,
  rowCount: number,
  activeOptions: OptikChoice[],
  formId: string,
  compact = false,
  bookletType: OptikFormBookletType = "none",
  netRule: OptikFormNetRule = "4",
): OptikFormMetadata {
  const layout = computeOptikFormLayout({
    formWidthMm: ptToMm(widthPx / scale),
    formHeightMm: ptToMm(heightPx / scale),
    scale,
    rowCount,
    activeOptions,
    formId,
    compact,
    bookletType,
    scoringRule: netRule,
  });
  return layout.metadata;
}

export { OPTIK_FORM_COLORS } from "./optikFormLayoutEngine";
