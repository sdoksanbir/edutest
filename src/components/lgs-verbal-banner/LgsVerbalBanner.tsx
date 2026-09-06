import type { CSSProperties } from 'react'
import type { LgsVerbalBannerProps } from './types'
import './lgs-verbal-banner.css'

const VB_W = 1498
const VB_H = 92

/** Referans ölçüm haritası — viewBox 0 0 1498 92 */
const MAP = {
  outer: { x: 1, y: 4, w: 1496, h: 80, rx: 5 },
  logo: { x: 70, y: 14, w: 160, h: 58 },
  divider: { x: 300, y1: 20, y2: 75 },
  examBadge: { x: 348, y: 12, w: 137, h: 22, rx: 4 },
  examType: { x: 348, y: 54 },
  section: { x: 348, y: 72 },
  gradeBadge: { x: 765, y: 22, w: 150, h: 36, rx: 6 },
  gradeExam: { x: 840, y: 68 },
  scores: [
    { x: 1085, label: 'DOĞRU' },
    { x: 1230, label: 'YANLIŞ' },
    { x: 1360, label: 'BOŞ' },
  ] as const,
  scoreLine: { y: 62, w: 72 },
  scoreVLines: [1020, 1165, 1295],
} as const

/** Sol üst lacivert kıvrım */
const PATH_TL_NAVY =
  'M0,0 L176,0 C162,36 136,52 98,50 L36,46 C12,44 0,40 0,32 Z'

/** Sol üst bordo vurgu */
const PATH_TL_RED = 'M0,32 L34,50 C54,52 74,46 94,28 L0,32 Z'

/** Sağ alt bordo dış kıvrım */
const PATH_BR_RED =
  'M1138,92 L1498,92 L1498,44 C1468,38 1428,46 1388,56 C1348,66 1288,80 1228,88 C1190,91 1158,92 1138,92 Z'

/** Sağ alt lacivert iç kıvrım */
const PATH_BR_NAVY =
  'M1236,92 L1498,92 L1498,56 C1464,50 1426,56 1386,66 C1346,76 1286,86 1236,92 Z'

/** Sağ alt köşe bordo uç */
const PATH_BR_TIP = 'M1498,92 L1498,74 L1486,92 Z'

function scoreText(value: number | null | undefined): string {
  if (value == null) return ''
  return String(value)
}

export default function LgsVerbalBanner({
  data,
  className = '',
  thumbnail = false,
  ariaLabel = 'LGS sözel bölüm bannerı',
}: LgsVerbalBannerProps) {
  const navy = data.primaryColor || 'var(--lgs-navy)'
  const red = data.accentColor || 'var(--lgs-red)'
  const institution = data.institutionName?.trim()
  const subtitle = data.institutionSubtitle?.trim()
  const examLabel = data.examLabel?.trim()
  const examType = data.examType?.trim()
  const section = data.sectionName?.trim()
  const grade = data.gradeLevel?.trim()
  const gradeExam = data.gradeExamType?.trim() || examType

  return (
    <div
      className={`lgs-verbal-banner${thumbnail ? ' lgs-verbal-banner--thumbnail' : ''}${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={ariaLabel}
      style={
        {
          '--lgs-navy': navy,
          '--lgs-red': red,
        } as CSSProperties
      }
    >
      <svg
        className="lgs-verbal-banner__svg"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
      >
        {/* Dış çerçeve + zemin */}
        <rect
          x={MAP.outer.x}
          y={MAP.outer.y}
          width={MAP.outer.w}
          height={MAP.outer.h}
          rx={MAP.outer.rx}
          fill="#FFFFFF"
          stroke="var(--lgs-border)"
          strokeWidth={1}
        />

        {/* Köşe dekorları */}
        <path d={PATH_TL_NAVY} fill={navy} />
        <path d={PATH_TL_RED} fill={red} />
        <path d={PATH_BR_RED} fill={red} />
        <path d={PATH_BR_NAVY} fill={navy} />
        <path d={PATH_BR_TIP} fill={red} />

        {/* Dikey bordo ayırıcı */}
        <line
          x1={MAP.divider.x}
          y1={MAP.divider.y1}
          x2={MAP.divider.x}
          y2={MAP.divider.y2}
          stroke={red}
          strokeWidth={1}
        />

        {/* Logo veya kurum yazısı */}
        {data.logoUrl ? (
          <image
            href={data.logoUrl}
            x={MAP.logo.x}
            y={MAP.logo.y}
            width={MAP.logo.w}
            height={MAP.logo.h}
            preserveAspectRatio="xMidYMid meet"
          />
        ) : institution ? (
          <>
            <text
              x={150}
              y={38}
              textAnchor="middle"
              fill={navy}
              fontFamily="Poppins, Inter, Arial, sans-serif"
              fontSize={22}
              fontWeight={700}
            >
              {institution}
            </text>
            {subtitle ? (
              <text
                x={150}
                y={54}
                textAnchor="middle"
                fill="var(--lgs-text-muted)"
                fontFamily="Poppins, Inter, Arial, sans-serif"
                fontSize={8}
                fontWeight={500}
                letterSpacing="0.08em"
              >
                {subtitle}
              </text>
            ) : null}
          </>
        ) : null}

        {/* DENEME SINAVI badge */}
        {examLabel ? (
          <>
            <rect
              x={MAP.examBadge.x}
              y={MAP.examBadge.y}
              width={MAP.examBadge.w}
              height={MAP.examBadge.h}
              rx={MAP.examBadge.rx}
              fill={navy}
            />
            <text
              x={MAP.examBadge.x + MAP.examBadge.w / 2}
              y={MAP.examBadge.y + 15}
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="Poppins, Inter, Arial, sans-serif"
              fontSize={9}
              fontWeight={700}
              letterSpacing="0.04em"
            >
              {examLabel}
            </text>
          </>
        ) : null}

        {/* LGS başlık */}
        {examType ? (
          <text
            x={MAP.examType.x}
            y={MAP.examType.y}
            fill={navy}
            fontFamily="Poppins, Inter, Arial, sans-serif"
            fontSize={28}
            fontWeight={700}
          >
            {examType}
          </text>
        ) : null}

        {/* Sözel Bölüm */}
        {section ? (
          <text
            x={MAP.section.x}
            y={MAP.section.y}
            fill={navy}
            fontFamily="Poppins, Inter, Arial, sans-serif"
            fontSize={14}
            fontWeight={500}
          >
            {section}
          </text>
        ) : null}

        {/* 8. SINIF badge */}
        {grade ? (
          <>
            <rect
              x={MAP.gradeBadge.x}
              y={MAP.gradeBadge.y}
              width={MAP.gradeBadge.w}
              height={MAP.gradeBadge.h}
              rx={MAP.gradeBadge.rx}
              fill="var(--lgs-soft-red)"
            />
            <text
              x={MAP.gradeBadge.x + MAP.gradeBadge.w / 2}
              y={MAP.gradeBadge.y + 24}
              textAnchor="middle"
              fill="var(--lgs-grade-text)"
              fontFamily="Poppins, Inter, Arial, sans-serif"
              fontSize={16}
              fontWeight={700}
            >
              {grade}
            </text>
          </>
        ) : null}

        {gradeExam ? (
          <text
            x={MAP.gradeExam.x}
            y={MAP.gradeExam.y}
            textAnchor="middle"
            fill={navy}
            fontFamily="Poppins, Inter, Arial, sans-serif"
            fontSize={9}
            fontWeight={600}
          >
            {gradeExam}
          </text>
        ) : null}

        {/* Sağ skor kolonları */}
        {MAP.scoreVLines.map((x) => (
          <line
            key={x}
            x1={x}
            y1={18}
            x2={x}
            y2={74}
            stroke="var(--lgs-border)"
            strokeWidth={1}
          />
        ))}

        {MAP.scores.map(({ x, label }) => {
          const val =
            label === 'DOĞRU'
              ? data.scoreCorrect
              : label === 'YANLIŞ'
                ? data.scoreWrong
                : data.scoreBlank
          const valText = scoreText(val)
          return (
            <g key={label}>
              <text
                x={x}
                y={36}
                textAnchor="middle"
                fill={navy}
                fontFamily="Poppins, Inter, Arial, sans-serif"
                fontSize={10}
                fontWeight={700}
              >
                {label}
              </text>
              <line
                x1={x - MAP.scoreLine.w / 2}
                y1={MAP.scoreLine.y}
                x2={x + MAP.scoreLine.w / 2}
                y2={MAP.scoreLine.y}
                stroke="var(--lgs-text-muted)"
                strokeWidth={1}
                opacity={0.65}
              />
              {valText ? (
                <text
                  x={x}
                  y={MAP.scoreLine.y + 12}
                  textAnchor="middle"
                  fill={navy}
                  fontFamily="Poppins, Inter, Arial, sans-serif"
                  fontSize={11}
                  fontWeight={600}
                >
                  {valText}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export type { LgsVerbalBannerData, LgsVerbalBannerProps } from './types'
