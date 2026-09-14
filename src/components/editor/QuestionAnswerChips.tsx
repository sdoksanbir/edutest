import { type AnswerOption, useEditorStore } from "../../store/editorStore";

type QuestionAnswerChipsProps = {
  questionId: string;
  selected?: AnswerOption;
};

const options: AnswerOption[] = ["A", "B", "C", "D", "E"];

export default function QuestionAnswerChips({ questionId, selected }: QuestionAnswerChipsProps) {
  const setQuestionAnswer = useEditorStore((state) => state.setQuestionAnswer);

  return (
    <div className="flex justify-center gap-0.5 py-0.5">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setQuestionAnswer(questionId, option)}
          className={`grid h-4 w-4 place-items-center rounded border text-[0.55rem] font-bold leading-none transition sm:h-[1.125rem] sm:w-[1.125rem] sm:text-[0.6rem] ${
            selected === option
              ? "border-orange-400 bg-orange-500 text-white shadow-md shadow-orange-950/40"
              : "border-slate-500 bg-slate-700 text-slate-100 hover:border-slate-400 hover:bg-slate-600"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
