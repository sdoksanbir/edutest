/**
 * Fasikül soru çerçevesi başlıkları — referans görseldeki şekillerin birebir HTML/SVG hali.
 */
import type { CSSProperties } from "react";
import {
  normalizeFasikulBadgeStyle,
  clampBadgeOffsetForPosition,
  formatFasikulBadgeQuestionNumber,
  isSideLabelPosition,
  normalizeLabelPosition,
  type FasikulBadgeStyle,
  type FasikulLabelPosition,
  type FasikulLabelSideTextDir,
} from "../../utils/fasikulQuestionFrame";

function lightenHex(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function badgeLayoutClass(pos: FasikulLabelPosition): string {
  // Tamamen kutu dışında + üst boşluk (kareli alan / banner ile çakışmasın)
  switch (normalizeLabelPosition(pos)) {
    case "top-center":
      return "left-1/2 bottom-full mb-[16px] -translate-x-1/2";
    case "top-right":
      return "right-0 bottom-full mb-[16px]";
    case "middle-left":
      return "right-full top-1/2 mr-[9px]";
    case "middle-right":
      return "left-full top-1/2 ml-[9px]";
    case "bottom-left":
      return "left-0 top-full mt-[16px]";
    case "bottom-center":
      return "left-1/2 top-full mt-[16px] -translate-x-1/2";
    case "bottom-right":
      return "right-0 top-full mt-[16px]";
    case "top-left":
    default:
      return "left-0 bottom-full mb-[16px]";
  }
}

function sideBadgeTransform(
  _pos: FasikulLabelPosition,
  dir: FasikulLabelSideTextDir,
): string {
  // Layout already places badge outside; only center vertically + optional flip
  const base = "translateY(-50%)";
  return dir === "btt" ? `${base} rotate(180deg)` : base;
}

type BadgeProps = {
  label: string;
  accent: string;
  badgeStyle: FasikulBadgeStyle;
  /** ring-pill: yuvarlak içi soru no (01, 02…) */
  questionNumber?: number | null;
};

function LabelText({
  label,
  className,
  style,
}: {
  label: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`whitespace-nowrap text-[9px] font-extrabold uppercase tracking-[0.04em] ${className ?? ""}`}
      style={style}
    >
      {label}
    </span>
  );
}

/** ÖRNEK + sağda numara yuvarlağı (kırmızı skala) */
function RingPillBadge({ label, accent, questionNumber }: BadgeProps) {
  const pillBg = lightenHex(accent, 0.78);
  const num =
    questionNumber != null && Number.isFinite(questionNumber)
      ? formatFasikulBadgeQuestionNumber(questionNumber)
      : "01";
  const circle = 28;
  return (
    <div className="relative flex items-center pr-[14px]">
      <div
        className="flex h-[22px] items-center rounded-md pl-2.5 pr-4"
        style={{ background: pillBg }}
      >
        <span
          className="whitespace-nowrap uppercase tracking-[0.04em] text-[11px] font-black"
          style={{ color: accent, fontWeight: 900 }}
        >
          {label || "ÖRNEK"}
        </span>
      </div>
      <div
        className="absolute right-0 top-1/2 z-[2] flex -translate-y-1/2 items-center justify-center rounded-full font-black text-white shadow-sm"
        style={{
          width: circle,
          height: circle,
          background: accent,
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: "-0.02em",
        }}
        aria-hidden
      >
        {num}
      </div>
    </div>
  );
}

/** Eğik şerit: ÖRNEK (ring) ile aynı kutu yüksekliği / yazı (22px / 11px) */
export const SLASH_BADGE_H_PX = 22;
export const SLASH_BADGE_SLANT_PX = 8;
export const SLASH_BADGE_LEFT_RADIUS_PX = 4;
/** İki paralelkenar aynı genişlikte */
export const SLASH_BADGE_TRAIL_W_PX = 13;
/**
 * Kutu↔1. paralelkenar ve 1.↔2. paralelkenar arası aynı boşluk
 * (negatif margin = örtüşme / sıkı boşluk).
 */
export const SLASH_BADGE_TRAIL_GAP_PX = 3;

/** Örnek / Formül / Kısa Yol — eğik şerit + iki iz (aynı eğim açısı) */
function SlashTrailBadge({ label, accent }: BadgeProps) {
  const H = SLASH_BADGE_H_PX;
  const S = SLASH_BADGE_SLANT_PX;
  const R = SLASH_BADGE_LEFT_RADIUS_PX;
  const trailW = SLASH_BADGE_TRAIL_W_PX;
  const gap = SLASH_BADGE_TRAIL_GAP_PX;
  const trail1 = lightenHex(accent, 0.55);
  const trail2 = lightenHex(accent, 0.78);
  const textW = Math.max(28, Array.from(label).length * 7.2);
  const padL = 10;
  const padR = 8;
  const bodyW = padL + textW + padR;
  const mainW = bodyW + S;
  // Sol üst/alt radius; sağ kenar eğimi = S/H (izlerle aynı)
  const mainPath = [
    `M ${R} 0`,
    `L ${bodyW} 0`,
    `L ${mainW} ${H}`,
    `L ${R} ${H}`,
    `Q 0 ${H} 0 ${H - R}`,
    `L 0 ${R}`,
    `Q 0 0 ${R} 0`,
    "Z",
  ].join(" ");
  const trailPath = [
    `M 0 0`,
    `L ${trailW - S} 0`,
    `L ${trailW} ${H}`,
    `L ${S} ${H}`,
    "Z",
  ].join(" ");

  return (
    <div className="relative flex items-stretch" style={{ height: H }}>
      <div className="relative z-[1]" style={{ width: mainW, height: H }}>
        <svg width={mainW} height={H} className="absolute inset-0" aria-hidden>
          <path d={mainPath} fill={accent} />
        </svg>
        <span
          className="absolute inset-y-0 flex items-center text-white"
          style={{ left: padL, right: padR + S * 0.35 }}
        >
          <span
            className="whitespace-nowrap uppercase tracking-[0.04em] text-[11px] font-black text-white"
            style={{ fontWeight: 900 }}
          >
            {label}
          </span>
        </span>
      </div>
      <svg
        width={trailW}
        height={H}
        className="relative z-0 shrink-0"
        style={{ marginLeft: -gap }}
        aria-hidden
      >
        <path d={trailPath} fill={trail1} />
      </svg>
      <svg
        width={trailW}
        height={H}
        className="relative z-0 shrink-0"
        style={{ marginLeft: -gap }}
        aria-hidden
      >
        <path d={trailPath} fill={trail2} />
      </svg>
    </div>
  );
}

/** UNUTMA — dikdörtgen + alt-sağ katlama üçgeni */
function FoldFlagBadge({ label, accent }: BadgeProps) {
  const fold = lightenHex(accent, 0.55);
  return (
    <div className="relative">
      <div
        className="flex h-[18px] items-center px-2.5"
        style={{ background: accent }}
      >
        <LabelText label={label} className="text-white" />
      </div>
      <span
        className="absolute -bottom-[6px] right-0 h-0 w-0"
        style={{
          borderLeft: "7px solid transparent",
          borderTop: `6px solid ${fold}`,
        }}
        aria-hidden
      />
    </div>
  );
}

/** BİLGİ NOTU — düz şerit (noktalar çerçevede) */
function FlatBarBadge({ label, accent }: BadgeProps) {
  return (
    <div
      className="flex h-[16px] items-center px-2.5"
      style={{ background: accent }}
    >
      <LabelText label={label} className="text-white" />
    </div>
  );
}

/** ÖNEMLİ — sol çift chevron + şerit */
function ChevronBarBadge({ label, accent }: BadgeProps) {
  return (
    <div className="relative flex items-center pl-[14px]">
      <svg
        className="absolute left-0 top-1/2 -translate-y-1/2"
        width="18"
        height="20"
        viewBox="0 0 18 20"
        aria-hidden
      >
        <path
          d="M16 2 L6 10 L16 18"
          fill="none"
          stroke={accent}
          strokeWidth="3.2"
          strokeLinejoin="miter"
          strokeLinecap="square"
        />
        <path
          d="M11 2 L1 10 L11 18"
          fill="none"
          stroke={accent}
          strokeWidth="3.2"
          strokeLinejoin="miter"
          strokeLinecap="square"
        />
      </svg>
      <div
        className="flex h-[18px] items-center px-2.5"
        style={{ background: accent }}
      >
        <LabelText label={label} className="text-white" />
      </div>
    </div>
  );
}

/** KURAL / BİLGİ NOTU / UNUTMA — sağ dairede tik, kalem veya ünlem SVG */
function TipPillBadge({
  label,
  accent,
  circleIcon = "check",
}: BadgeProps & { circleIcon?: "check" | "pen" | "exclaim" }) {
  const circle = 28;
  const fallbackLabel =
    circleIcon === "pen" ? "BİLGİ NOTU" : circleIcon === "exclaim" ? "UNUTMA" : "KURAL";
  return (
    <div className="relative flex items-center pr-[14px]">
      <div
        className="flex h-[22px] items-center rounded-md pl-2.5 pr-4"
        style={{
          background: `linear-gradient(90deg, ${accent} 0%, ${lightenHex(accent, 0.35)} 100%)`,
        }}
      >
        <span
          className="whitespace-nowrap uppercase tracking-[0.04em] text-[11px] font-black text-white"
          style={{ fontWeight: 900 }}
        >
          {label || (circleIcon === "pen" ? "BİLGİ NOTU" : circleIcon === "exclaim" ? "UNUTMA" : "KURAL")}
        </span>
      </div>
      <div
        className="absolute right-0 top-1/2 z-[2] flex -translate-y-1/2 items-center justify-center rounded-full shadow-sm"
        style={{
          width: circle,
          height: circle,
          background: accent,
        }}
        aria-hidden
      >
        {circleIcon === "pen" ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            className="block shrink-0"
            aria-hidden
          >
            {/* Kalem */}
            <path
              d="M8.6 2.4 L11.6 5.4 L5.2 11.8 L2.4 12.2 L2.8 9.4 Z"
              fill="none"
              stroke="#fff"
              strokeWidth="1.35"
              strokeLinejoin="round"
            />
            <path
              d="M8.6 2.4 L11.6 5.4"
              fill="none"
              stroke="#fff"
              strokeWidth="1.35"
              strokeLinecap="round"
            />
            <path
              d="M7.4 3.6 L10.4 6.6"
              fill="none"
              stroke="#fff"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <path
              d="M2.6 11.4 L3.4 10.6"
              fill="none"
              stroke="#fff"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        ) : circleIcon === "exclaim" ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            className="block shrink-0"
            aria-hidden
          >
            {/* Ünlem */}
            <path
              d="M7 2.4 L7 8.6"
              fill="none"
              stroke="#fff"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <circle cx="7" cy="11.1" r="1.15" fill="#fff" />
          </svg>
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            className="block shrink-0"
            aria-hidden
          >
            <path
              d="M2.6 7.1 L5.7 10.3 L11.4 3.4"
              fill="none"
              stroke="#fff"
              strokeWidth="2.4"
              strokeLinejoin="miter"
              strokeLinecap="square"
            />
          </svg>
        )}
      </div>
    </div>
  );
}

export function FasikulFrameBadgeShape(props: BadgeProps) {
  const style = normalizeFasikulBadgeStyle(props.badgeStyle);
  switch (style) {
    case "ring-pill":
      return <RingPillBadge {...props} />;
    case "fold-flag":
      return <FoldFlagBadge {...props} />;
    case "flat-bar-dots":
      return <FlatBarBadge {...props} />;
    case "chevron-bar":
      return <ChevronBarBadge {...props} />;
    case "note-pill":
      return <TipPillBadge {...props} circleIcon="pen" />;
    case "warn-pill":
      return <TipPillBadge {...props} circleIcon="exclaim" />;
    case "tip-pill":
      return <TipPillBadge {...props} circleIcon="check" />;
    case "slash-trail":
    case "slash-corner-dot":
    default:
      return <SlashTrailBadge {...props} />;
  }
}

type ChromeProps = {
  enabled: boolean;
  borderStyle: string;
  borderWidth: number;
  borderColor: string;
  cornerRadiusPx: number;
  labelText: string;
  labelColor: string;
  badgeStyle: FasikulBadgeStyle;
  labelPosition: FasikulLabelPosition;
  labelSideTextDir?: FasikulLabelSideTextDir;
  badgeOffsetX?: number;
  badgeOffsetY?: number;
  questionNumber?: number | null;
};

/** Çerçeve kenarı + başlık + süs (nokta / köşe noktası) */
export function FasikulFrameBadgeChrome(props: ChromeProps) {
  if (!props.enabled) return null;
  const style = normalizeFasikulBadgeStyle(props.badgeStyle);
  const accent = props.labelColor || props.borderColor;
  const pos = normalizeLabelPosition(props.labelPosition);
  const side = isSideLabelPosition(pos);
  const sideDir = props.labelSideTextDir === "btt" ? "btt" : "ttb";
  const offsets = clampBadgeOffsetForPosition(
    pos,
    props.badgeOffsetX ?? 0,
    props.badgeOffsetY ?? 0,
  );
  const borderCss =
    props.borderStyle === "none"
      ? "none"
      : props.borderStyle === "double"
        ? `${Math.max(3, props.borderWidth + 1)}px double ${props.borderColor}`
        : `${props.borderWidth}px ${props.borderStyle} ${props.borderColor}`;

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-visible" aria-hidden>
      {props.borderStyle !== "none" && (
        <div
          className="absolute inset-0"
          style={{
            border: borderCss,
            borderRadius: props.cornerRadiusPx,
            background: "transparent",
          }}
        />
      )}
      {style === "flat-bar-dots" && (
        <div className="absolute right-3 top-0 z-[6] flex -translate-y-1/2 gap-[5px]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block h-[5px] w-[5px] rounded-full"
              style={{ background: accent }}
            />
          ))}
        </div>
      )}
      {style === "slash-corner-dot" && (
        <span
          className="absolute right-0 top-0 z-[6] h-[8px] w-[8px] -translate-y-1/2 translate-x-1/2 rounded-full"
          style={{ background: accent }}
        />
      )}
      <span
        className={`absolute z-10 ${badgeLayoutClass(pos)}`}
        style={
          side
            ? {
                writingMode: "vertical-rl" as const,
                textOrientation: "mixed" as const,
                transform: `${sideBadgeTransform(pos, sideDir)} translate(${offsets.badgeOffsetX}px, ${offsets.badgeOffsetY}px)`,
              }
            : {
                transform: `translate(${offsets.badgeOffsetX}px, ${offsets.badgeOffsetY}px)`,
              }
        }
      >
        <FasikulFrameBadgeShape
          label={(props.labelText || "ÖRNEK").trim()}
          accent={accent}
          badgeStyle={style}
          questionNumber={props.questionNumber}
        />
      </span>
    </div>
  );
}
