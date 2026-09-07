import type { HeaderStyleId } from "../../utils/headerStyles";

type Props = {
  styleId: HeaderStyleId;
  selected?: boolean;
  accentColor?: string;
  /** Kart seçimi: schematic. Canlı önizleme: detailed. */
  variant?: "schematic" | "detailed";
  /** Deneme şablon kartları — sayfa ikonu */
  schematicPreset?: "default" | "exam-sheet";
};

/** Başlık şablonu kartları — gönderilen görseldeki minimalist layout ikonları */
function SchematicIcon({
  styleId,
  selected,
  accentColor,
  schematicPreset = "default",
}: {
  styleId: HeaderStyleId;
  selected?: boolean;
  accentColor: string;
  schematicPreset?: "default" | "exam-sheet";
}) {
  const ink = selected ? accentColor : "currentColor";

  if (schematicPreset === "exam-sheet") {
    // Deneme: sayfa + üst şerit + iki satır
    return (
      <svg viewBox="0 0 72 56" className="theme-header-schematic-icon" aria-hidden>
        <rect
          x="14"
          y="8"
          width="44"
          height="40"
          rx="4"
          fill="none"
          stroke={ink}
          strokeWidth="1.75"
        />
        <rect x="18" y="12" width="36" height="8" rx="1.5" fill={ink} opacity="0.92" />
        <line
          x1="20"
          y1="28"
          x2="52"
          y2="28"
          stroke={ink}
          strokeWidth="1.65"
          strokeLinecap="round"
        />
        <line
          x1="20"
          y1="36"
          x2="46"
          y2="36"
          stroke={ink}
          strokeWidth="1.65"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (styleId === "style_1") {
    // Klasik / Standart: üst şerit + iki satır
    return (
      <svg viewBox="0 0 72 56" className="theme-header-schematic-icon" aria-hidden>
        <rect
          x="12"
          y="8"
          width="48"
          height="40"
          rx="6"
          fill="none"
          stroke={ink}
          strokeWidth="1.65"
        />
        <rect x="17" y="13" width="38" height="8" rx="2" fill={ink} opacity="0.92" />
        <line
          x1="18"
          y1="30"
          x2="54"
          y2="30"
          stroke={ink}
          strokeWidth="1.65"
          strokeLinecap="round"
        />
        <line
          x1="18"
          y1="38"
          x2="46"
          y2="38"
          stroke={ink}
          strokeWidth="1.65"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (styleId === "style_2") {
    // Minimal: ince üst şerit + tek satır
    return (
      <svg viewBox="0 0 72 56" className="theme-header-schematic-icon" aria-hidden>
        <rect
          x="12"
          y="8"
          width="48"
          height="40"
          rx="6"
          fill="none"
          stroke={ink}
          strokeWidth="1.65"
        />
        <rect x="17" y="14" width="38" height="5" rx="1.5" fill={ink} opacity="0.88" />
        <line
          x1="18"
          y1="30"
          x2="54"
          y2="30"
          stroke={ink}
          strokeWidth="1.55"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (styleId === "style_3") {
    // Blok: kalın üst şerit + iki satır
    return (
      <svg viewBox="0 0 72 56" className="theme-header-schematic-icon" aria-hidden>
        <rect
          x="12"
          y="8"
          width="48"
          height="40"
          rx="6"
          fill="none"
          stroke={ink}
          strokeWidth="1.65"
        />
        <rect x="17" y="13" width="38" height="11" rx="2" fill={ink} opacity="0.92" />
        <line
          x1="18"
          y1="33"
          x2="54"
          y2="33"
          stroke={ink}
          strokeWidth="1.65"
          strokeLinecap="round"
        />
        <line
          x1="18"
          y1="41"
          x2="44"
          y2="41"
          stroke={ink}
          strokeWidth="1.65"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // Modern / fallback: orta şerit + iki satır
  return (
    <svg viewBox="0 0 72 56" className="theme-header-schematic-icon" aria-hidden>
      <rect
        x="12"
        y="8"
        width="48"
        height="40"
        rx="6"
        fill="none"
        stroke={ink}
        strokeWidth="1.5"
      />
      <rect x="17" y="14" width="38" height="7" rx="2" fill={ink} opacity="0.75" />
      <line
        x1="18"
        y1="30"
        x2="54"
        y2="30"
        stroke={ink}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="18"
        y1="38"
        x2="48"
        y2="38"
        stroke={ink}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Tema seçim kartları / canlı önizleme */
export default function ThemeHeaderPreview({
  styleId,
  selected,
  accentColor = "#DC2626",
  variant = "schematic",
  schematicPreset = "default",
}: Props) {
  if (variant === "schematic") {
    return (
      <div
        className={`theme-header-schematic${selected ? " theme-header-schematic--selected" : ""}`}
        style={selected ? ({ ["--theme-schematic-accent" as string]: accentColor } as object) : undefined}
      >
        <SchematicIcon
          styleId={styleId}
          selected={selected}
          accentColor={accentColor}
          schematicPreset={schematicPreset}
        />
      </div>
    );
  }

  const border = selected
    ? `2px solid ${accentColor}`
    : "1px solid var(--border, rgb(203 213 225))";

  if (styleId === "style_1") {
    return (
      <svg viewBox="0 0 200 54" className="h-14 w-full rounded-md bg-white" style={{ border }}>
        <circle cx="22" cy="13" r="9" fill="#D4AF37" stroke="#9A7518" strokeWidth="0.8" />
        <text x="22" y="27" textAnchor="middle" fontSize="5" fill="#C59B27" fontWeight="bold" fontFamily="Georgia, serif">EDUMATH</text>
        <text x="22" y="32" textAnchor="middle" fontSize="3.2" fill="#C59B27" fontFamily="Georgia, serif">Y A Y I N L A R I</text>
        <line x1="42" y1="5" x2="42" y2="48" stroke="#0A1931" strokeWidth="0.9" />
        <text x="100" y="15" textAnchor="middle" fontSize="5" fill="#0A1931" fontWeight="bold">TYT-AYT TEST</text>
        <text x="100" y="30" textAnchor="middle" fontSize="12" fill="#DC2626" fontWeight="800">MATEMATİK</text>
        <line x1="70" y1="38" x2="86" y2="38" stroke="#DC2626" strokeWidth="0.6" />
        <text x="100" y="40" textAnchor="middle" fontSize="5" fill="#0A1931" fontWeight="bold">POLİNOMLAR</text>
        <line x1="114" y1="38" x2="130" y2="38" stroke="#DC2626" strokeWidth="0.6" />
        <rect x="148" y="10" width="48" height="32" rx="3" fill="none" stroke="#0A1931" strokeWidth="1.2" />
        <text x="172" y="20" textAnchor="middle" fontSize="4" fill="#0A1931">SERKAN D.</text>
        <line x1="154" y1="25" x2="190" y2="25" stroke="#DC2626" strokeWidth="0.5" />
        <text x="172" y="33" textAnchor="middle" fontSize="5" fill="#0A1931" fontWeight="bold">EDUMATH</text>
        <polygon points="0,50 88,50 94,54 0,54" fill="#DC2626" />
        <polygon points="88,50 200,50 200,54 94,54" fill="#0A1931" />
      </svg>
    );
  }

  if (styleId === "style_2") {
    // Minimal: sol boş / orta ders adı / sağda Test No + alt şeritte sağda D/Y/B
    return (
      <svg viewBox="0 0 200 48" className="h-14 w-full rounded-md bg-white" style={{ border }}>
        <rect x="4" y="4" width="58" height="16" rx="3" fill="none" stroke={accentColor} strokeWidth="1" />
        <rect x="8" y="7" width="14" height="10" rx="1.5" fill={accentColor} opacity="0.85" />
        <rect x="66" y="4" width="44" height="16" rx="2" fill={accentColor} />
        <text x="88" y="15" textAnchor="middle" fontSize="6" fill="#fff" fontWeight="bold">
          DERS
        </text>
        <rect x="114" y="4" width="82" height="16" rx="3" fill="none" stroke={accentColor} strokeWidth="1" />
        <text x="178" y="11" textAnchor="end" fontSize="5" fill={accentColor} fontWeight="700">
          TEST
        </text>
        <text x="178" y="18" textAnchor="end" fontSize="5.5" fill={accentColor} fontWeight="700">
          01
        </text>
        <rect x="4" y="24" width="192" height="20" rx="3" fill="none" stroke={accentColor} strokeWidth="1" />
        <rect x="10" y="28" width="5" height="5" rx="1.2" fill={accentColor} />
        <text x="18" y="33" fontSize="5.5" fill={accentColor} fontWeight="700">
          Konu
        </text>
        <rect x="10" y="36" width="4" height="4" rx="1" fill={accentColor} />
        <text x="17" y="40" fontSize="4.5" fill={accentColor}>
          Alt konu
        </text>
        <rect x="132" y="28" width="18" height="12" rx="2" fill="#fff" stroke="#CBD5E1" strokeWidth="0.6" />
        <text x="135" y="37" fontSize="5.5" fill="#16A34A" fontWeight="700">
          D:
        </text>
        <rect x="153" y="28" width="18" height="12" rx="2" fill="#fff" stroke="#CBD5E1" strokeWidth="0.6" />
        <text x="156" y="37" fontSize="5.5" fill="#DC2626" fontWeight="700">
          Y:
        </text>
        <rect x="174" y="28" width="18" height="12" rx="2" fill="#fff" stroke="#CBD5E1" strokeWidth="0.6" />
        <text x="177" y="37" fontSize="5.5" fill="#0F172A" fontWeight="700">
          B:
        </text>
      </svg>
    );
  }

  if (styleId === "style_3") {
    return (
      <svg viewBox="0 0 200 48" className="h-14 w-full rounded-md bg-white" style={{ border }}>
        <rect x="4" y="10" width="44" height="22" rx="11" fill="#2563eb" />
        <text x="26" y="24" textAnchor="middle" fontSize="6" fill="#fff" fontWeight="bold">DENEME 01</text>
        <text x="54" y="18" fontSize="9" fill="#1E3A8A" fontWeight="800">MATEMATİK</text>
        <text x="54" y="28" fontSize="5" fill="#6B7280">POLİNOMLAR</text>
        <rect x="54" y="32" width="28" height="6" rx="3" fill={accentColor} />
        <rect x="84" y="32" width="24" height="6" rx="3" fill="#2563eb" />
        <rect x="148" y="8" width="48" height="36" fill="none" stroke="#6b7280" strokeWidth="0.6" strokeDasharray="3 2" />
        <text x="172" y="16" textAnchor="middle" fontSize="3.5" fill="#374151">QR KOD</text>
        <rect x="158" y="20" width="28" height="20" fill="#e5e7eb" />
        <rect x="0" y="44" width="50" height="3" fill={accentColor} rx="1" />
        <rect x="54" y="44" width="146" height="3" fill="#1E3A8A" rx="1" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 200 20" className="h-14 w-full rounded-md bg-white" style={{ border }}>
      <rect x="2" y="3" width="196" height="14" fill="none" stroke="#1E3A8A" strokeWidth="0.8" />
      <circle cx="12" cy="10" r="4" fill="#e8c547" />
      <text x="20" y="12" fontSize="5" fill="#1E3A8A" fontWeight="bold">MATEMATİK</text>
      <text x="68" y="12" fontSize="4" fill="#374151">• POLİNOMLAR • TYT-AYT • TEST 01</text>
    </svg>
  );
}
