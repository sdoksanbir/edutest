import { useState } from "react";

import { useEditorStore } from "../../store/editorStore";

import AnswerKeyModeModal from "../modals/AnswerKeyModeModal";

import CenterLineTextModal from "../modals/CenterLineTextModal";



const optionItems = [

  { key: "includeAnswerKey" as const, label: "Teste cevap anahtarı ekle" },

  { key: "addTextOnLine" as const, label: "Çizgi üzerine yazı ekle" },

];



export default function OptionsPanel() {

  const options = useEditorStore((state) => state.options);

  const toggleOption = useEditorStore((state) => state.toggleOption);

  const themeColor = useEditorStore((state) => state.themeColor);

  const answerKeyMode = useEditorStore((state) => state.answerKeyMode);

  const centerLineText = useEditorStore((state) => state.centerLineText);

  const centerLineBold = useEditorStore((state) => state.centerLineBold);

  const centerLineItalic = useEditorStore((state) => state.centerLineItalic);

  const centerLineTextDirection = useEditorStore((state) => state.centerLineTextDirection);

  const setAnswerKeyMode = useEditorStore((state) => state.setAnswerKeyMode);

  const setCenterLineText = useEditorStore((state) => state.setCenterLineText);

  const setCenterLineBold = useEditorStore((state) => state.setCenterLineBold);

  const setCenterLineItalic = useEditorStore((state) => state.setCenterLineItalic);

  const setCenterLineTextDirection = useEditorStore((state) => state.setCenterLineTextDirection);



  const [showAnswerKeyModal, setShowAnswerKeyModal] = useState(false);

  const [showCenterLineModal, setShowCenterLineModal] = useState(false);



  const handleOptionClick = (key: (typeof optionItems)[number]["key"]) => {

    if (key === "includeAnswerKey") {

      setShowAnswerKeyModal(true);

    } else if (key === "addTextOnLine") {

      setShowCenterLineModal(true);

    }

  };



  return (

    <section className="flex min-w-0 flex-col gap-3">

      <h3 className="tq-sidebar-section-title text-slate-100">Seçenekler</h3>

      <div className="tq-options-card space-y-2">

        {optionItems.map((item) =>

          item.key === "addTextOnLine" ? (

            <div key={item.key} className="flex items-center gap-2">

              <input

                type="checkbox"

                checked={options[item.key]}

                onChange={() => {

                  if (options[item.key]) {

                    toggleOption(item.key);

                    setCenterLineText("");

                    setCenterLineBold(false);

                    setCenterLineItalic(false);

                  } else {

                    setShowCenterLineModal(true);

                  }

                }}

                className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-500"

              />

              <span

                role="button"

                tabIndex={0}

                onClick={() => setShowCenterLineModal(true)}

                onKeyDown={(e) => {

                  if (e.key === "Enter" || e.key === " ") {

                    e.preventDefault();

                    setShowCenterLineModal(true);

                  }

                }}

                className="tq-row-label cursor-pointer hover:text-white"

              >

                {item.label}

              </span>

            </div>

          ) : (

            <label key={item.key} className="flex cursor-pointer items-center gap-2">

              <input

                type="checkbox"

                checked={options[item.key]}

                onChange={() => handleOptionClick(item.key)}

                className="h-4 w-4 shrink-0 rounded border-slate-500"

              />

              <span className="tq-row-label">{item.label}</span>

            </label>

          )

        )}

      </div>



      <AnswerKeyModeModal

        open={showAnswerKeyModal}

        onClose={() => setShowAnswerKeyModal(false)}

        onConfirm={(mode) => {

          setAnswerKeyMode(mode);

          if (!options.includeAnswerKey) toggleOption("includeAnswerKey");

          setShowAnswerKeyModal(false);

        }}

        currentMode={answerKeyMode}

        themeColor={themeColor}

      />



      <CenterLineTextModal

        open={showCenterLineModal}

        onClose={() => setShowCenterLineModal(false)}

        onConfirm={(text, bold, italic, direction) => {

          setCenterLineText(text);

          setCenterLineBold(bold);

          setCenterLineItalic(italic);

          setCenterLineTextDirection(direction);

          if (!options.addTextOnLine) toggleOption("addTextOnLine");

          setShowCenterLineModal(false);

        }}

        initialText={centerLineText}

        initialBold={centerLineBold}

        initialItalic={centerLineItalic}

        initialDirection={centerLineTextDirection}

        themeColor={themeColor}

      />

    </section>

  );

}


