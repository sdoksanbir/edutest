import { useCallback, useEffect, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

export type LatexSymbol = {
  label: string;
  latex: string;
  title?: string;
};

export type LatexSymbolCategory = {
  id: string;
  label: string;
  symbols: LatexSymbol[];
};

export const LATEX_SYMBOL_CATEGORIES: LatexSymbolCategory[] = [
  {
    id: "temel",
    label: "Temel",
    symbols: [
      { label: "a/b", latex: "\\frac{a}{b}", title: "Kesir" },
      { label: "x²", latex: "x^{2}", title: "Kare" },
      { label: "xⁿ", latex: "x^{n}", title: "Üs" },
      { label: "√x", latex: "\\sqrt{x}", title: "Karekök" },
      { label: "ⁿ√x", latex: "\\sqrt[n]{x}", title: "n. kök" },
      { label: "±", latex: "\\pm", title: "Artı eksi" },
      { label: "×", latex: "\\times", title: "Çarpı" },
      { label: "÷", latex: "\\div", title: "Bölü" },
      { label: "·", latex: "\\cdot", title: "Nokta çarpı" },
      { label: "∞", latex: "\\infty", title: "Sonsuz" },
    ],
  },
  {
    id: "karsilastirma",
    label: "Karşılaştırma",
    symbols: [
      { label: "=", latex: "=" },
      { label: "≠", latex: "\\neq" },
      { label: "<", latex: "<" },
      { label: ">", latex: ">" },
      { label: "≤", latex: "\\leq" },
      { label: "≥", latex: "\\geq" },
      { label: "≈", latex: "\\approx" },
      { label: "≡", latex: "\\equiv" },
    ],
  },
  {
    id: "yunan",
    label: "Yunan",
    symbols: [
      { label: "α", latex: "\\alpha" },
      { label: "β", latex: "\\beta" },
      { label: "γ", latex: "\\gamma" },
      { label: "δ", latex: "\\delta" },
      { label: "θ", latex: "\\theta" },
      { label: "π", latex: "\\pi" },
      { label: "λ", latex: "\\lambda" },
      { label: "μ", latex: "\\mu" },
      { label: "σ", latex: "\\sigma" },
      { label: "φ", latex: "\\phi" },
      { label: "Δ", latex: "\\Delta" },
      { label: "Σ", latex: "\\Sigma" },
    ],
  },
  {
    id: "trigonometri",
    label: "Trigonometri",
    symbols: [
      { label: "sin", latex: "\\sin" },
      { label: "cos", latex: "\\cos" },
      { label: "tan", latex: "\\tan" },
      { label: "cot", latex: "\\cot" },
      { label: "log", latex: "\\log" },
      { label: "ln", latex: "\\ln" },
      { label: "°", latex: "^{\\circ}", title: "Derece" },
    ],
  },
  {
    id: "calculus",
    label: "Analiz",
    symbols: [
      { label: "∫", latex: "\\int", title: "İntegral" },
      { label: "∑", latex: "\\sum", title: "Toplam" },
      { label: "∏", latex: "\\prod", title: "Çarpım" },
      { label: "lim", latex: "\\lim", title: "Limit" },
      { label: "→", latex: "\\to", title: "Yönelim" },
      { label: "∂", latex: "\\partial", title: "Kısmi türev" },
      { label: "′", latex: "'", title: "Türev" },
    ],
  },
  {
    id: "kumeler",
    label: "Kümeler",
    symbols: [
      { label: "∈", latex: "\\in" },
      { label: "∉", latex: "\\notin" },
      { label: "⊂", latex: "\\subset" },
      { label: "∪", latex: "\\cup" },
      { label: "∩", latex: "\\cap" },
      { label: "∅", latex: "\\emptyset" },
      { label: "ℕ", latex: "\\mathbb{N}" },
      { label: "ℤ", latex: "\\mathbb{Z}" },
      { label: "ℚ", latex: "\\mathbb{Q}" },
      { label: "ℝ", latex: "\\mathbb{R}" },
    ],
  },
  {
    id: "parantez",
    label: "Parantez",
    symbols: [
      { label: "( )", latex: "\\left( \\right)", title: "Parantez" },
      { label: "[ ]", latex: "\\left[ \\right]", title: "Köşeli" },
      { label: "{ }", latex: "\\left\\{ \\right\\}", title: "Süslü" },
      { label: "| |", latex: "\\left| \\right|", title: "Mutlak değer" },
      { label: "⌊ ⌋", latex: "\\lfloor \\rfloor", title: "Taban" },
      { label: "⌈ ⌉", latex: "\\lceil \\rceil", title: "Tavan" },
    ],
  },
];

type LatexFormulaLibraryProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  compact?: boolean;
  id?: string;
};

function insertAtCursor(
  textarea: HTMLTextAreaElement,
  snippet: string,
  current: string,
  onChange: (next: string) => void
) {
  const start = textarea.selectionStart ?? current.length;
  const end = textarea.selectionEnd ?? current.length;
  const next = current.slice(0, start) + snippet + current.slice(end);
  onChange(next);
  const caret = start + snippet.length;
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(caret, caret);
  });
}

function LatexPreview({ latex }: { latex: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const trimmed = latex.trim();
    if (!trimmed) {
      el.innerHTML = "";
      return;
    }
    try {
      const raw = trimmed.replace(/^\$+|\$+$/g, "").trim();
      katex.render(raw || "\\;", el, {
        displayMode: false,
        throwOnError: false,
        trust: false,
      });
    } catch {
      el.textContent = trimmed;
    }
  }, [latex]);

  return (
    <div
      ref={ref}
      className="tq-latex-lib__preview"
      aria-live="polite"
      aria-label="Formül önizlemesi"
    />
  );
}

export default function LatexFormulaLibrary({
  value,
  onChange,
  placeholder = "LaTeX formülünü yazın veya simgelerden seçin…",
  compact = false,
  id = "latex-formula-input",
}: LatexFormulaLibraryProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [activeCategory, setActiveCategory] = useState(LATEX_SYMBOL_CATEGORIES[0]!.id);

  const handleInsert = useCallback(
    (latex: string) => {
      const ta = taRef.current;
      if (!ta) {
        onChange(value + latex);
        return;
      }
      insertAtCursor(ta, latex, value, onChange);
    },
    [onChange, value]
  );

  const category =
    LATEX_SYMBOL_CATEGORIES.find((c) => c.id === activeCategory) ??
    LATEX_SYMBOL_CATEGORIES[0]!;

  return (
    <div className={`tq-latex-lib${compact ? " tq-latex-lib--compact" : ""}`}>
      <div className="tq-latex-lib__tabs" role="tablist" aria-label="Formül kategorileri">
        {LATEX_SYMBOL_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={cat.id === activeCategory}
            className={`tq-latex-lib__tab${cat.id === activeCategory ? " tq-latex-lib__tab--active" : ""}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="tq-latex-lib__symbols" role="group" aria-label={`${category.label} simgeleri`}>
        {category.symbols.map((sym) => (
          <button
            key={`${category.id}-${sym.latex}`}
            type="button"
            className="tq-latex-lib__symbol"
            title={sym.title ?? sym.latex}
            onClick={() => handleInsert(sym.latex)}
          >
            {sym.label}
          </button>
        ))}
      </div>

      <label htmlFor={id} className="tq-latex-lib__label">
        LaTeX
      </label>
      <textarea
        ref={taRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={compact ? 2 : 3}
        spellCheck={false}
        className="tq-latex-lib__input"
        placeholder={placeholder}
      />

      <p className="tq-latex-lib__preview-label">Önizleme</p>
      <LatexPreview latex={value} />
    </div>
  );
}
