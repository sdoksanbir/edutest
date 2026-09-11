import type { DraftFilePayload } from "../store/editorStore";
import { useEditorStore } from "../store/editorStore";
import { captureModuleLayout, ensureModuleLayouts } from "./moduleLayoutSnapshots";

export const ET_DRAFT_FORMAT = "edutest-draft";
export const ET_DRAFT_VERSION = 1;
export const ET_FILE_EXTENSION = "et";

/** Mevcut editör durumu + sorular → .et dosya içeriği */
export function buildEtDraftPayload(name: string): DraftFilePayload & {
  format: typeof ET_DRAFT_FORMAT;
  version: number;
} {
  const s = useEditorStore.getState();
  const safeName = name.trim() || s.persistedDraftName || s.testName?.trim() || "taslak";
  const moduleLayouts = ensureModuleLayouts({
    ...s.moduleLayouts,
    [s.activeLayoutModule]: captureModuleLayout(s),
  });

  return {
    format: ET_DRAFT_FORMAT,
    version: ET_DRAFT_VERSION,
    name: safeName,
    questions: s.questions,
    test_info: {
      test_name: s.testName,
      school_name: s.schoolName,
    },
    export_settings: {
      include_answer_key: s.options.includeAnswerKey,
      add_spacing: s.options.addSpacingBetweenQuestions,
      include_description: s.options.includeDescription,
      add_text_on_line: s.options.addTextOnLine,
    },
    editor_state: {
      activeTab: s.activeTab,
      testName: s.testName,
      schoolName: s.schoolName,
      trialExamCode: s.trialExamCode,
      trialBookletLabel: s.trialBookletLabel,
      trialExamCodeFontPt: s.trialExamCodeFontPt,
      trialExamCodeColor: s.trialExamCodeColor,
      trialExamCodeAlign: s.trialExamCodeAlign,
      trialExamCodePadLeftPt: s.trialExamCodePadLeftPt,
      trialBookletFontPt: s.trialBookletFontPt,
      trialBookletColor: s.trialBookletColor,
      trialTestNameBgOpacityPct: s.trialTestNameBgOpacityPct,
      trialTestNameBgColor: s.trialTestNameBgColor,
      trialBrandName: s.trialBrandName,
      trialBrandNameVisible: s.trialBrandNameVisible,
      options: { ...s.options },
      questionGapMm: s.questionGapMm,
      questionGapMinMm: s.questionGapMinMm,
      autoCompactSpacing: s.autoCompactSpacing,
      headerStyleId: s.headerStyleId,
      headerBottomGapMm: s.headerBottomGapMm,
      otherPageHeaderBottomGapMm: s.otherPageHeaderBottomGapMm,
      questionNumberLeftOffsetMm: s.questionNumberLeftOffsetMm,
      questionNumberImageGapMm: s.questionNumberImageGapMm,
      questionNumberingEnabled: s.questionNumberingEnabled,
      questionNumberStart: s.questionNumberStart,
      questionNumberColorMode: s.questionNumberColorMode,
      questionNumberFontPt: s.questionNumberFontPt,
      pageNumberingEnabled: s.pageNumberingEnabled,
      pageNumberStart: s.pageNumberStart,
      pageNumberFormat: s.pageNumberFormat,
      headerConfig: { ...s.headerConfig },
      headerTemplates: s.headerTemplates,
      themeColor: s.themeColor,
      activeLayoutModule: s.activeLayoutModule,
      moduleLayouts,
      sections: s.sections,
      testDescription: s.testDescription,
      descriptionColumnCount: s.descriptionColumnCount,
      descriptionTexts: s.descriptionTexts,
      descriptionColumnDividers: s.descriptionColumnDividers,
      descriptionBoxPadYPt: s.descriptionBoxPadYPt,
      descriptionBoxPadXPt: s.descriptionBoxPadXPt,
      answerKeyMode: s.answerKeyMode,
      optikFormEnabled: s.optikFormEnabled,
      optikFormPlacement: s.optikFormPlacement,
      optikFormOptionCount: s.optikFormOptionCount,
      optikFormBookletType: s.optikFormBookletType,
      optikFormNetRule: s.optikFormNetRule,
      optikFormInstructionEnabled: s.optikFormInstructionEnabled,
      optikFormInstructionText: s.optikFormInstructionText,
      optikFormOffsetYPt: s.optikFormOffsetYPt,
      footerInfoText: s.footerInfoText,
      centerLineText: s.centerLineText,
      centerLineBold: s.centerLineBold,
      centerLineItalic: s.centerLineItalic,
      centerLineTextDirection: s.centerLineTextDirection,
      examType: s.examType,
      classSection: s.classSection,
      group: s.group,
      writtenPaperOptions: { ...s.writtenPaperOptions },
      teacherNames: s.teacherNames,
      writtenHeaderFieldLines: { ...s.writtenHeaderFieldLines },
      writtenHeaderFieldLabels: { ...s.writtenHeaderFieldLabels },
      writtenHeaderFieldHidden: { ...s.writtenHeaderFieldHidden },
      customExamTypes: s.customExamTypes,
      paperSize: s.paperSize,
      paperWidthMm: s.paperWidthMm,
      paperHeightMm: s.paperHeightMm,
      orientation: s.orientation,
      columns: s.columns,
      targetQuestionLinePt: s.targetQuestionLinePt,
      allowSlightOverflow: s.allowSlightOverflow,
      marginTopMm: s.marginTopMm,
      marginBottomMm: s.marginBottomMm,
      marginLeftMm: s.marginLeftMm,
      marginRightMm: s.marginRightMm,
      watermarkEnabled: s.watermarkEnabled,
      watermarkSettings: { ...s.watermarkSettings },
      showColumnDivider: s.showColumnDivider,
      columnDividerText: s.columnDividerText,
      columnDividerColor: s.columnDividerColor,
      columnDividerWidthPt: s.columnDividerWidthPt,
      showColumnDividerText: s.showColumnDividerText,
      showWatermark: s.showWatermark,
      watermarkText: s.watermarkText,
      watermarkLayout: s.watermarkLayout,
      watermarkAngleDeg: s.watermarkAngleDeg,
      watermarkOpacity: s.watermarkOpacity,
      watermarkSize: s.watermarkSize,
      watermarkLogoUrl: s.watermarkLogoUrl,
      showPageFrame: s.showPageFrame,
      pageFrameColorMode: s.pageFrameColorMode,
      pageFrameColor: s.pageFrameColor,
      pageFrameWidthPt: s.pageFrameWidthPt,
      pageFrameInnerGapMm: s.pageFrameInnerGapMm,
      pageFrameCornerRadiusMm: s.pageFrameCornerRadiusMm,
      pageFrameLineStyle: s.pageFrameLineStyle,
      scratchGridCornerRadiusPt: s.scratchGridCornerRadiusPt,
      scratchGridColorMode: s.scratchGridColorMode,
      scratchGridColor: s.scratchGridColor,
    },
  };
}

export function parseEtDraftJson(raw: string): DraftFilePayload {
  const data = JSON.parse(raw) as DraftFilePayload & { format?: string };
  if (!data || !Array.isArray(data.questions)) {
    throw new Error("Geçersiz .et taslak dosyası");
  }
  if (!data.name) {
    data.name = "taslak";
  }
  return data;
}
