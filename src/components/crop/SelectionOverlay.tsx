import { useState } from "react";

import type { CropBox } from "../../types";

import type { AnswerOption } from "../../types";

import { normalizedRectToDisplayRect } from "../../utils/cropCoordUtils";

import { normalizeContentType } from "../../utils/questionNumbering";

import AnswerMarkPanel, { type CropLayoutMode } from "./AnswerMarkPanel";



type SelectionWithNumber = {

  id: string;

  pdf_id: string;

  page_number: number;

  crop: CropBox;

  answer_key?: string;

  number: number;

  listBadge?: string;

  content_type?: string;

  explanation_caption_enabled?: boolean;

  explanation_caption_text?: string;

  remove_background?: boolean;

  display_scale?: number;

  isLocal?: boolean;

  localPdfId?: string;

};



type SelectionOverlayProps = {

  selections: SelectionWithNumber[];

  currentPdfId: string | null;

  currentLocalPdfId: string | null;

  currentPage: number;

  displayedW: number;

  displayedH: number;

  editingSelectionId: string | null;

  choiceCount?: 3 | 4 | 5;

  onStartEdit: (sel: SelectionWithNumber) => void;

  onEndEdit: () => void;

  onAnswerChange: (sel: SelectionWithNumber, answer: AnswerOption | null) => void;

  onDelete: (sel: SelectionWithNumber) => void;

  onLayoutChange?: (sel: SelectionWithNumber, layout: CropLayoutMode) => void;

};



export default function SelectionOverlay({

  selections,

  currentPdfId,

  currentLocalPdfId,

  currentPage,

  displayedW,

  displayedH,

  editingSelectionId,

  choiceCount = 5,

  onStartEdit,

  onEndEdit,

  onAnswerChange,

  onDelete,

  onLayoutChange,

}: SelectionOverlayProps) {

  const [layout, setLayout] = useState<CropLayoutMode>("dar");



  const currentSelections = selections.filter(

    (s) =>

      s.page_number === currentPage &&

      ((!s.isLocal && s.pdf_id === currentPdfId) ||

        (s.isLocal && s.localPdfId === currentLocalPdfId))

  );



  const safeW = Math.max(1, displayedW);

  const safeH = Math.max(1, displayedH);



  return (

    <div

      className="pointer-events-none absolute left-0 top-0 z-10 overflow-visible"

      style={{ width: safeW, height: safeH }}

    >

      {currentSelections.map((sel) => {

        const rect = normalizedRectToDisplayRect(

          sel.crop as { x: number; y: number; width: number; height: number },

          safeW,

          safeH

        );

        if (rect.width <= 0 || rect.height <= 0) return null;



        const currentAnswer: AnswerOption | null =

          sel.answer_key && ["A", "B", "C", "D", "E"].includes(sel.answer_key)

            ? (sel.answer_key as AnswerOption)

            : null;

        const isEditing = editingSelectionId === sel.id;

        const isExplanation = normalizeContentType(sel.content_type) === "explanation";

        /** Eski dar=0.88 kırpmalar; yeni seçimler her zaman scale=1 → genis. */
        const activeLayout: CropLayoutMode =
          sel.display_scale != null && sel.display_scale < 0.95 ? "dar" : "genis";

        return (

          <div

            key={sel.id}

            className={`absolute overflow-visible ${isEditing ? "pointer-events-none" : "pointer-events-auto"}`}

            style={{

              left: rect.left,

              top: rect.top,

              width: rect.width,

              height: rect.height,

            }}

          >

            {!isEditing && <div className="tq-crop-selection-box absolute inset-0" />}



            {!isEditing && (

              <div

                className="absolute right-0 z-10 flex -translate-y-full gap-1.5 pointer-events-auto"

                style={{ top: 0, marginTop: -2 }}

              >

                <button

                  type="button"

                  onClick={(e) => {

                    e.stopPropagation();

                    setLayout(activeLayout);

                    onStartEdit(sel);

                  }}

                  className="rounded-md bg-slate-800/90 px-2.5 py-1 text-xs font-medium text-white shadow-sm hover:bg-slate-700"

                >

                  Düzenle

                </button>

                <button

                  type="button"

                  onClick={(e) => {

                    e.stopPropagation();

                    onDelete(sel);

                  }}

                  className="rounded-md bg-slate-800/90 px-2.5 py-1 text-xs font-medium text-white shadow-sm hover:bg-slate-700 pointer-events-auto"

                >

                  Sil

                </button>

              </div>

            )}



            {isEditing && !isExplanation && (

              <div className="absolute left-1/2 top-full z-30 mt-3 -translate-x-1/2 pointer-events-auto">

                <AnswerMarkPanel

                  selectedAnswer={currentAnswer}

                  onSelectAnswer={(a) => onAnswerChange(sel, a)}

                  layout={layout}

                  onLayoutChange={(next) => {

                    setLayout(next);

                    onLayoutChange?.(sel, next);

                  }}

                  choiceCount={choiceCount}

                  onCancel={onEndEdit}

                  onConfirm={onEndEdit}

                />

              </div>

            )}

          </div>

        );

      })}

    </div>

  );

}

