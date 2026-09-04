import type { AnswerOption } from "../../types";

const ALL_OPTIONS: AnswerOption[] = ["A", "B", "C", "D", "E"];

export type CropLayoutMode = "dar" | "genis";

type AnswerMarkPanelProps = {
  selectedAnswer: AnswerOption | null;
  onSelectAnswer: (answer: AnswerOption | null) => void;
  layout: CropLayoutMode;
  onLayoutChange: (layout: CropLayoutMode) => void;
  choiceCount?: 3 | 4 | 5;
  onCancel: () => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
};

function NarrowLayoutIcon() {
  return (
    <svg width="10" height="8" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="2" width="7" height="14" rx="1" />
      <rect x="14" y="2" width="7" height="14" rx="1" />
    </svg>
  );
}

function WideLayoutIcon() {
  return (
    <svg width="10" height="8" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="2" width="16" height="14" rx="1" />
    </svg>
  );
}

export default function AnswerMarkPanel({
  selectedAnswer,
  onSelectAnswer,
  layout,
  onLayoutChange,
  choiceCount = 5,
  onCancel,
  onConfirm,
  confirmDisabled = false,
}: AnswerMarkPanelProps) {
  const options = ALL_OPTIONS.slice(0, choiceCount);

  return (
    <div className="tq-answer-mark" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <div className="tq-answer-mark__row">
        <div className="tq-answer-mark__choices">
          {options.map((letter) => (
            <button
              key={letter}
              type="button"
              className={`tq-answer-mark__choice${selectedAnswer === letter ? " tq-answer-mark__choice--active" : ""}`}
              onClick={() => onSelectAnswer(selectedAnswer === letter ? null : letter)}
            >
              {letter}
            </button>
          ))}
        </div>

        <div className="tq-answer-mark__layout" role="group" aria-label="Yerleşim">
          <button
            type="button"
            className={`tq-answer-mark__layout-btn${layout === "dar" ? " tq-answer-mark__layout-btn--active" : ""}`}
            onClick={() => onLayoutChange("dar")}
            title="Dar yerleşim"
          >
            <NarrowLayoutIcon />
            Dar
          </button>
          <button
            type="button"
            className={`tq-answer-mark__layout-btn${layout === "genis" ? " tq-answer-mark__layout-btn--active" : ""}`}
            onClick={() => onLayoutChange("genis")}
            title="Geniş yerleşim"
          >
            <WideLayoutIcon />
            Geniş
          </button>
        </div>
      </div>

      <div className="tq-answer-mark__actions">
        <button type="button" className="tq-answer-mark__cancel" onClick={onCancel}>
          İptal
        </button>
        <button
          type="button"
          className="tq-answer-mark__confirm"
          disabled={confirmDisabled}
          onClick={onConfirm}
        >
          Ekle
        </button>
      </div>
    </div>
  );
}
