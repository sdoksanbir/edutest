/**
 * Optik form → gerçek PDF: canvas ile PNG üret, sayfa konumunu PDF pt olarak ver.
 */

import type { LayoutItem } from "../api/client";
import type { QuestionItem } from "../types";
import {
  drawOptikFormCompactCanvas,
  drawOptikFormFullPageCanvas,
} from "./drawOptikFormCanvas";
import { optikRowsFromLayoutItems } from "./optikFormLayout";
import {
  resolveOptikActiveOptions,
  type OptikFormBookletType,
  type OptikFormNetRule,
  type OptikFormOptionCount,
} from "./optikFormSettings";
import {
  endOfTestOptikCompactFits,
  lastColumnOptikGeom,
  maxQuestionPageFromLayout,
  resolveCompactOptikFormPlacement,
} from "./optikFormCompactPlacement";
import { FOOTER_TOP_OFFSET_MM, mmToPdfPt } from "./pdfLayoutGeometry";
import { computeAnswerKeyLayout } from "./answerKeyLayout";

const RENDER_SCALE = 2.5;

export type OptikFormPdfOverlay = {
  page_num: number;
  x_pt: number;
  /** PDF alt kenar (pdf-lib drawImage y) */
  y_pt: number;
  w_pt: number;
  h_pt: number;
  image_png_base64: string;
};

export type OptikFormExportInput = {
  enabled: boolean;
  placement: "per_page" | "separate_page" | "end_of_test";
  optionCount: OptikFormOptionCount;
  bookletType: OptikFormBookletType;
  netRule: OptikFormNetRule;
  instructionEnabled: boolean;
  instructionText: string;
  questions: QuestionItem[];
  layout: LayoutItem[];
  pageWpt: number;
  pageHpt: number;
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  columns: number;
  columnGapMm?: number;
  testTitle?: string;
  schoolName?: string;
  includeAnswerKey?: boolean;
  answerKeyMode?: "per_page" | "separate_page" | "end_of_test";
  answerKeyPageCount?: number;
  /** Kompakt optik dikey ofset (pt); pozitif = aşağı */
  offsetYPt?: number;
  headerStyleId?: string;
  headerConfig?: import("./corporateHeaderLayout").HeaderConfig;
  headerBottomGapMm?: number;
  otherPageHeaderBottomGapMm?: number;
  writtenPaperHeader?: boolean;
  sections?: import("../types").SectionRange[];
};

function stripPngDataUrl(dataUrl: string): string {
  const i = dataUrl.indexOf("base64,");
  return i >= 0 ? dataUrl.slice(i + 7) : dataUrl;
}

function canvasToPngBase64(canvas: HTMLCanvasElement): string {
  return stripPngDataUrl(canvas.toDataURL("image/png"));
}

function footerTopPt(pageHpt: number, marginBottomMm: number): number {
  return mmToPdfPt(marginBottomMm) + mmToPdfPt(FOOTER_TOP_OFFSET_MM);
}

async function renderCompactPng(input: {
  rows: ReturnType<typeof optikRowsFromLayoutItems>;
  activeOptions: ReturnType<typeof resolveOptikActiveOptions>;
  wPt: number;
  hPt: number;
  bookletType: OptikFormBookletType;
  netRule: OptikFormNetRule;
  testTitle: string;
  schoolName: string;
}): Promise<string> {
  const scale = RENDER_SCALE;
  const wPx = Math.max(1, Math.round(input.wPt * scale));
  const hPx = Math.max(1, Math.round(input.hPt * scale));
  const canvas = document.createElement("canvas");
  canvas.width = wPx;
  canvas.height = hPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, wPx, hPx);
  drawOptikFormCompactCanvas({
    ctx,
    x: 0,
    y: 0,
    width: wPx,
    scale,
    rows: input.rows,
    activeOptions: input.activeOptions,
    testTitle: input.testTitle,
    schoolName: input.schoolName,
    showAnswers: false,
    netRule: input.netRule,
    bookletType: input.bookletType,
  });
  return canvasToPngBase64(canvas);
}

async function renderFullPagePng(input: {
  rows: ReturnType<typeof optikRowsFromLayoutItems>;
  activeOptions: ReturnType<typeof resolveOptikActiveOptions>;
  wPt: number;
  hPt: number;
  bookletType: OptikFormBookletType;
  netRule: OptikFormNetRule;
  instructionEnabled: boolean;
  instructionText: string;
  testTitle: string;
  schoolName: string;
}): Promise<string> {
  const scale = RENDER_SCALE;
  const wPx = Math.max(1, Math.round(input.wPt * scale));
  const hPx = Math.max(1, Math.round(input.hPt * scale));
  const canvas = document.createElement("canvas");
  canvas.width = wPx;
  canvas.height = hPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, wPx, hPx);
  drawOptikFormFullPageCanvas({
    ctx,
    x: 0,
    y: 0,
    width: wPx,
    height: hPx,
    scale,
    rows: input.rows,
    activeOptions: input.activeOptions,
    testTitle: input.testTitle,
    schoolName: input.schoolName,
    instructionText: input.instructionText,
    instructionEnabled: input.instructionEnabled,
    bookletType: input.bookletType,
    netRule: input.netRule,
    showAnswers: false,
  });
  return canvasToPngBase64(canvas);
}

/** Önizleme ile aynı yerleşimde PDF overlay listesi */
export async function buildOptikFormPdfOverlays(
  input: OptikFormExportInput,
): Promise<OptikFormPdfOverlay[]> {
  if (!input.enabled || input.questions.length === 0) return [];
  const rows = optikRowsFromLayoutItems(input.layout, input.questions, input.sections);
  if (rows.length === 0) return [];
  const activeOptions = resolveOptikActiveOptions(input.questions, input.optionCount);
  const mq = maxQuestionPageFromLayout(input.layout);
  const ml = mmToPdfPt(input.marginLeftMm);
  const mr = mmToPdfPt(input.marginRightMm);
  const mt = mmToPdfPt(input.marginTopMm);
  const ft = footerTopPt(input.pageHpt, input.marginBottomMm);
  const testTitle = (input.testTitle || "").trim() || "TEST";
  const schoolName = (input.schoolName || "").trim();

  const renderSeparatePage = async (pageNum: number): Promise<OptikFormPdfOverlay[]> => {
    const wPt = input.pageWpt - ml - mr;
    const hPt = input.pageHpt - mt - ft;
    const image = await renderFullPagePng({
      rows,
      activeOptions,
      wPt,
      hPt,
      bookletType: input.bookletType,
      netRule: input.netRule,
      instructionEnabled: input.instructionEnabled,
      instructionText: input.instructionText,
      testTitle,
      schoolName,
    });
    if (!image) return [];
    return [
      {
        page_num: pageNum,
        x_pt: ml,
        y_pt: ft,
        w_pt: wPt,
        h_pt: hPt,
        image_png_base64: image,
      },
    ];
  };

  if (input.placement === "separate_page") {
    return renderSeparatePage(mq + 1);
  }

  if (input.placement !== "end_of_test") return [];

  let reservedAboveFooterPt = 0;
  if (input.includeAnswerKey && input.answerKeyMode === "end_of_test") {
    const answerKeyItems: [number, string][] = input.layout
      .filter((l) => l.display_number != null)
      .sort((a, b) => (a.display_number as number) - (b.display_number as number))
      .map((l) => [
        l.display_number as number,
        (l.answer_key || "?").trim().toUpperCase() || "?",
      ]);
    if (answerKeyItems.length > 0) {
      const geomPreview = lastColumnOptikGeom(input);
      const ak = computeAnswerKeyLayout({
        items: answerKeyItems,
        totalWidthPx: geomPreview.colWPt,
        columnCount: 2,
        scale: 1,
      });
      reservedAboveFooterPt = ak.tableHeightPx + 6;
    }
  }

  const fits = endOfTestOptikCompactFits({
    layout: input.layout,
    pageWpt: input.pageWpt,
    pageHpt: input.pageHpt,
    marginTopMm: input.marginTopMm,
    marginBottomMm: input.marginBottomMm,
    marginLeftMm: input.marginLeftMm,
    marginRightMm: input.marginRightMm,
    columns: input.columns,
    columnGapMm: input.columnGapMm ?? 8,
    rowCount: rows.length,
    bookletType: input.bookletType,
    optionCount: activeOptions.length,
    reservedAboveFooterPt,
    headerStyleId: input.headerStyleId,
    headerConfig: input.headerConfig,
    headerBottomGapMm: input.headerBottomGapMm,
    otherPageHeaderBottomGapMm: input.otherPageHeaderBottomGapMm,
    writtenPaperHeader: input.writtenPaperHeader,
  });

  if (!fits) {
    // Sığmıyor — sorunun altına binmesin; ayrı sayfaya taşı
    return renderSeparatePage(mq + 1);
  }

  const placed = resolveCompactOptikFormPlacement({
    layout: input.layout,
    pageWpt: input.pageWpt,
    pageHpt: input.pageHpt,
    marginTopMm: input.marginTopMm,
    marginBottomMm: input.marginBottomMm,
    marginLeftMm: input.marginLeftMm,
    marginRightMm: input.marginRightMm,
    columns: input.columns,
    columnGapMm: input.columnGapMm ?? 8,
    rowCount: rows.length,
    bookletType: input.bookletType,
    optionCount: activeOptions.length,
    reservedAboveFooterPt,
    offsetYPt: input.offsetYPt ?? 0,
    headerStyleId: input.headerStyleId,
    headerConfig: input.headerConfig,
    headerBottomGapMm: input.headerBottomGapMm,
    otherPageHeaderBottomGapMm: input.otherPageHeaderBottomGapMm,
    writtenPaperHeader: input.writtenPaperHeader,
  });
  if (!placed) return [];

  const image = await renderCompactPng({
    rows,
    activeOptions,
    wPt: placed.wPt,
    hPt: placed.hPt,
    bookletType: input.bookletType,
    netRule: input.netRule,
    testTitle,
    schoolName,
  });
  if (!image) return [];
  return [
    {
      page_num: placed.pageNum,
      x_pt: placed.xPt,
      y_pt: placed.yBottomPt,
      w_pt: placed.wPt,
      h_pt: placed.hPt,
      image_png_base64: image,
    },
  ];
}
