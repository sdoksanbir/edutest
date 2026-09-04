import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  DEFAULT_HEADER_BOTTOM_GAP_MM,
  DEFAULT_OTHER_PAGE_HEADER_BOTTOM_GAP_MM,
  DEFAULT_QUESTION_NUMBER_IMAGE_GAP_MM,
  DEFAULT_QUESTION_NUMBER_LEFT_OFFSET_MM,
} from "../../utils/pdfLayoutGeometry";
import { usePdfPreviewUi } from "./PdfPreviewUiThemeContext";
import CollapsibleCard from "./CollapsibleCard";

function AlignmentResetButton({
  disabled,
  onClick,
  ariaLabel,
}: {
  disabled: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="pdf-preview-reset-icon-btn disabled:cursor-not-allowed disabled:opacity-40"
      aria-label={ariaLabel}
    >
      <RotateCcw className="pdf-preview-reset-icon-btn__icon" strokeWidth={2.25} />
    </button>
  );
}

type Props = {
  headerBottomGapMm: number;
  otherPageHeaderBottomGapMm: number;
  questionNumberLeftOffsetMm: number;
  questionNumberImageGapMm: number;
  onHeaderBottomGapPreview: (value: number) => void;
  onHeaderBottomGapCommit: (value: number) => void;
  onHeaderBottomGapDragStart: (value: number) => void;
  onHeaderBottomGapCancel: () => void;
  onOtherPageHeaderBottomGapPreview: (value: number) => void;
  onOtherPageHeaderBottomGapCommit: (value: number) => void;
  onOtherPageHeaderBottomGapDragStart: (value: number) => void;
  onOtherPageHeaderBottomGapCancel: () => void;
  onQuestionNumberLeftOffsetPreview: (value: number) => void;
  onQuestionNumberLeftOffsetCommit: (value: number) => void;
  onQuestionNumberLeftOffsetDragStart: () => void;
  onQuestionNumberLeftOffsetCancel: () => void;
  onQuestionNumberImageGapPreview: (value: number) => void;
  onQuestionNumberImageGapCommit: (value: number) => void;
  onQuestionNumberImageGapDragStart: () => void;
  onQuestionNumberImageGapCancel: () => void;
};

export default function AlignmentSpacingSliders({
  headerBottomGapMm,
  otherPageHeaderBottomGapMm,
  questionNumberLeftOffsetMm,
  questionNumberImageGapMm,
  onHeaderBottomGapPreview,
  onHeaderBottomGapCommit,
  onHeaderBottomGapDragStart,
  onHeaderBottomGapCancel,
  onOtherPageHeaderBottomGapPreview,
  onOtherPageHeaderBottomGapCommit,
  onOtherPageHeaderBottomGapDragStart,
  onOtherPageHeaderBottomGapCancel,
  onQuestionNumberLeftOffsetPreview,
  onQuestionNumberLeftOffsetCommit,
  onQuestionNumberLeftOffsetDragStart,
  onQuestionNumberLeftOffsetCancel,
  onQuestionNumberImageGapPreview,
  onQuestionNumberImageGapCommit,
  onQuestionNumberImageGapDragStart,
  onQuestionNumberImageGapCancel,
}: Props) {
  const { tokens: t } = usePdfPreviewUi();
  const [headerGapMm, setHeaderGapMm] = useState(headerBottomGapMm);
  const [otherPageGapMm, setOtherPageGapMm] = useState(otherPageHeaderBottomGapMm);
  const [numOffsetMm, setNumOffsetMm] = useState(questionNumberLeftOffsetMm);
  const [numImageGapMm, setNumImageGapMm] = useState(questionNumberImageGapMm);

  const headerDragRef = useRef(false);
  const otherPageDragRef = useRef(false);
  const numOffsetDragRef = useRef(false);
  const numImageGapDragRef = useRef(false);

  useEffect(() => {
    if (!headerDragRef.current) setHeaderGapMm(headerBottomGapMm);
  }, [headerBottomGapMm]);

  useEffect(() => {
    if (!otherPageDragRef.current) setOtherPageGapMm(otherPageHeaderBottomGapMm);
  }, [otherPageHeaderBottomGapMm]);

  useEffect(() => {
    if (!numOffsetDragRef.current) setNumOffsetMm(questionNumberLeftOffsetMm);
  }, [questionNumberLeftOffsetMm]);

  useEffect(() => {
    if (!numImageGapDragRef.current) setNumImageGapMm(questionNumberImageGapMm);
  }, [questionNumberImageGapMm]);

  return (
    <CollapsibleCard title="Hizalama ve boşluklar" className="mb-0 pdf-preview-collapsible pdf-preview-alignment-sliders" defaultOpen={false}>
      <div>
        <div className="pdf-preview-slider-field">
          <div className="pdf-preview-slider-field__meta">
            <label className={`pdf-preview-slider-label pdf-preview-field-label ${t.label}`}>Başlık boşluğu</label>
            <span className={`pdf-preview-slider-field__value ${t.valueBadge}`}>
              {headerGapMm.toFixed(1).replace(/\.0$/, "")} mm
            </span>
            <AlignmentResetButton
              disabled={Math.abs(headerGapMm - DEFAULT_HEADER_BOTTOM_GAP_MM) < 0.001}
              ariaLabel="Başlık boşluğunu varsayılana sıfırla"
              onClick={() => {
                setHeaderGapMm(DEFAULT_HEADER_BOTTOM_GAP_MM);
                onHeaderBottomGapCommit(DEFAULT_HEADER_BOTTOM_GAP_MM);
              }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={50}
            step={0.1}
            value={headerGapMm}
            onPointerDown={() => {
              headerDragRef.current = true;
              onHeaderBottomGapDragStart(headerGapMm);
            }}
            onChange={(e) => {
              const v = Number(e.target.value);
              setHeaderGapMm(v);
              onHeaderBottomGapPreview(v);
            }}
            onPointerUp={(e) => {
              headerDragRef.current = false;
              onHeaderBottomGapCommit(Number(e.currentTarget.value));
            }}
            onPointerCancel={() => {
              headerDragRef.current = false;
              setHeaderGapMm(headerBottomGapMm);
              onHeaderBottomGapCancel();
            }}
            className="pdf-preview-range"
            style={{ height: 4 }}
            aria-label="Başlık boşluğu"
          />
        </div>

        <div className="pdf-preview-slider-field">
          <div className="pdf-preview-slider-field__meta">
            <label className={`pdf-preview-slider-label pdf-preview-field-label ${t.label}`}>Diğer sayfa üst boşluk</label>
            <span className={`pdf-preview-slider-field__value ${t.valueBadge}`}>
              {otherPageGapMm.toFixed(1).replace(/\.0$/, "")} mm
            </span>
            <AlignmentResetButton
              disabled={Math.abs(otherPageGapMm - DEFAULT_OTHER_PAGE_HEADER_BOTTOM_GAP_MM) < 0.001}
              ariaLabel="Diğer sayfa üst boşluğunu varsayılana sıfırla"
              onClick={() => {
                setOtherPageGapMm(DEFAULT_OTHER_PAGE_HEADER_BOTTOM_GAP_MM);
                onOtherPageHeaderBottomGapCommit(DEFAULT_OTHER_PAGE_HEADER_BOTTOM_GAP_MM);
              }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={50}
            step={0.1}
            value={otherPageGapMm}
            onPointerDown={() => {
              otherPageDragRef.current = true;
              onOtherPageHeaderBottomGapDragStart(otherPageGapMm);
            }}
            onChange={(e) => {
              const v = Number(e.target.value);
              setOtherPageGapMm(v);
              onOtherPageHeaderBottomGapPreview(v);
            }}
            onPointerUp={(e) => {
              otherPageDragRef.current = false;
              onOtherPageHeaderBottomGapCommit(Number(e.currentTarget.value));
            }}
            onPointerCancel={() => {
              otherPageDragRef.current = false;
              setOtherPageGapMm(otherPageHeaderBottomGapMm);
              onOtherPageHeaderBottomGapCancel();
            }}
            className="pdf-preview-range"
            style={{ height: 4 }}
            aria-label="Diğer sayfa üst çizgi alt boşluğu"
          />
        </div>

        <div className="pdf-preview-slider-field">
          <div className="pdf-preview-slider-field__meta">
            <label className={`pdf-preview-slider-label pdf-preview-field-label ${t.label}`}>Numara sol boşluk</label>
            <span className={`pdf-preview-slider-field__value ${t.valueBadge}`}>
              {numOffsetMm > 0 ? "+" : ""}
              {numOffsetMm.toFixed(2).replace(/\.?0+$/, "")} mm
            </span>
            <AlignmentResetButton
              disabled={Math.abs(numOffsetMm - DEFAULT_QUESTION_NUMBER_LEFT_OFFSET_MM) < 0.001}
              ariaLabel="Numara sol boşluğunu varsayılana sıfırla"
              onClick={() => {
                setNumOffsetMm(DEFAULT_QUESTION_NUMBER_LEFT_OFFSET_MM);
                onQuestionNumberLeftOffsetCommit(DEFAULT_QUESTION_NUMBER_LEFT_OFFSET_MM);
              }}
            />
          </div>
          <input
            type="range"
            min={-15}
            max={15}
            step={0.05}
            value={numOffsetMm}
            onPointerDown={() => {
              numOffsetDragRef.current = true;
              onQuestionNumberLeftOffsetDragStart();
            }}
            onChange={(e) => {
              const v = Number(e.target.value);
              setNumOffsetMm(v);
              onQuestionNumberLeftOffsetPreview(v);
            }}
            onPointerUp={(e) => {
              numOffsetDragRef.current = false;
              onQuestionNumberLeftOffsetCommit(Number(e.currentTarget.value));
            }}
            onPointerCancel={() => {
              numOffsetDragRef.current = false;
              setNumOffsetMm(questionNumberLeftOffsetMm);
              onQuestionNumberLeftOffsetCancel();
            }}
            className="pdf-preview-range"
            style={{ height: 4 }}
            aria-label="Soru numarası sol boşluğu"
          />
        </div>

        <div className="pdf-preview-slider-field">
          <div className="pdf-preview-slider-field__meta">
            <label className={`pdf-preview-slider-label pdf-preview-field-label ${t.label}`}>Numara-soru boşluk</label>
            <span className={`pdf-preview-slider-field__value ${t.valueBadge}`}>
              {numImageGapMm.toFixed(2).replace(/\.?0+$/, "")} mm
            </span>
            <AlignmentResetButton
              disabled={Math.abs(numImageGapMm - DEFAULT_QUESTION_NUMBER_IMAGE_GAP_MM) < 0.001}
              ariaLabel="Numara-soru boşluğunu varsayılana sıfırla"
              onClick={() => {
                setNumImageGapMm(DEFAULT_QUESTION_NUMBER_IMAGE_GAP_MM);
                onQuestionNumberImageGapCommit(DEFAULT_QUESTION_NUMBER_IMAGE_GAP_MM);
              }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={5}
            step={0.05}
            value={numImageGapMm}
            onPointerDown={() => {
              numImageGapDragRef.current = true;
              onQuestionNumberImageGapDragStart();
            }}
            onChange={(e) => {
              const v = Number(e.target.value);
              setNumImageGapMm(v);
              onQuestionNumberImageGapPreview(v);
            }}
            onPointerUp={(e) => {
              numImageGapDragRef.current = false;
              onQuestionNumberImageGapCommit(Number(e.currentTarget.value));
            }}
            onPointerCancel={() => {
              numImageGapDragRef.current = false;
              setNumImageGapMm(questionNumberImageGapMm);
              onQuestionNumberImageGapCancel();
            }}
            className="pdf-preview-range"
            style={{ height: 4 }}
            aria-label="Numara soru arası boşluk"
          />
        </div>
      </div>
    </CollapsibleCard>
  );
}
