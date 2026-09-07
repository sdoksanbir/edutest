import type { CSSProperties } from 'react'
import type { LgsOfficialBannerProps } from './types'
import {
  LGS_OFFICIAL_BANNER_VIEW_H,
  LGS_OFFICIAL_BANNER_VIEW_W,
  LGS_OFFICIAL_GREEN,
  LGS_OFFICIAL_GREEN_SOFT,
  LGS_OFFICIAL_INSTRUCTION_FONT_PT,
  LGS_OFFICIAL_TEXT,
  formatLgsOfficialYearLabel,
} from './types'
import './lgs-official-banner.css'

/** Düzenli altıgen — merkez (cx,cy), dış yarıçap r (pointy-top) */
function hexagonPath(cx: number, cy: number, r: number): string {
  const pts: string[] = []
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30)
    const x = cx + r * Math.cos(a)
    const y = cy + r * Math.sin(a)
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
  }
  return `${pts.join(' ')} Z`
}

/** Referans dalga: sola alçak → ortaya yüksel → sağa hafif dalga */
function wavePath(index: number): string {
  const baseY = 22 + index * 7.2
  const amp = 15
  const segs: string[] = []
  const step = 6
  for (let x = 0; x <= LGS_OFFICIAL_BANNER_VIEW_W; x += step) {
    const t = x / LGS_OFFICIAL_BANNER_VIEW_W
    const y =
      baseY +
      amp * Math.sin(t * Math.PI * 2.05 + 0.15) +
      amp * 0.28 * Math.sin(t * Math.PI * 4.1 + 0.4) +
      (index - 3.5) * 0.35
    segs.push(`${x === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(2)}`)
  }
  return segs.join(' ')
}

function normalizeExamTitle(title: string): string {
  return title.replace(/\s+/g, ' ').trim().toUpperCase()
}

export default function LgsOfficialBanner({
  data,
  className = '',
  thumbnail = false,
  ariaLabel = 'LGS resmi başlık bannerı',
}: LgsOfficialBannerProps) {
  const green = data.primaryColor?.trim() || LGS_OFFICIAL_GREEN
  const soft = data.accentColor?.trim() || LGS_OFFICIAL_GREEN_SOFT
  const yearFill = data.yearFillColor?.trim() || soft
  const yearText = data.yearTextColor?.trim() || LGS_OFFICIAL_TEXT
  const yearFontPt = Math.max(8, Math.min(22, data.yearFontPt ?? 17))
  const yearPadX = Math.max(4, Math.min(48, data.yearPadXPt ?? 18))
  const yearPadY = Math.max(2, Math.min(24, data.yearPadYPt ?? 8))
  const bookletRaw = (data.bookletType || '').trim().toUpperCase()
  const booklet = /^[A-D]$/.test(bookletRaw) ? bookletRaw : ''
  const titleLine = normalizeExamTitle(data.examTitle) ||
    'SINAVLA ÖĞRENCİ ALACAK ORTAÖĞRETİM KURUMLARINA İLİŞKİN MERKEZİ SINAV'
  const yearLabel = formatLgsOfficialYearLabel(data.academicYear)
  const institutionName = (data.institutionName || '').trim()
  const subject = (data.subjectName || 'MATEMATİK').trim().toUpperCase()
  const titleFontPt = Math.max(8, Math.min(28, data.titleFontPt ?? 19))
  const titleColor = data.titleTextColor?.trim() || LGS_OFFICIAL_TEXT
  const titleWeight = data.titleBold === false ? 500 : 700
  const subjectFontPt = Math.max(8, Math.min(28, data.subjectFontPt ?? 24))
  const subjectColor = data.subjectTextColor?.trim() || LGS_OFFICIAL_TEXT
  const subjectWeight = data.subjectBold === false ? 500 : 700
  const subjectBandW = Math.max(160, Math.min(893, data.subjectBandWidthPt ?? 480))
  const instrFont = Math.max(8, Math.min(22, data.instructionFontPt ?? 15))
  const line1 =
    data.instructionLine1?.trim() || '1. Bu testte 20 soru vardır.'
  const line2 =
    data.instructionLine2?.trim() ||
    '2. Cevaplarınızı, cevap kâğıdına işaretleyiniz.'

  /** Başlık / test adı / yönerge — eşit ara boşluk (PDF ile aynı formül) */
  const STACK_TOP = 112
  const STACK_BOTTOM = 256
  const INSTR_H = 52
  const titleBlockH = Math.max(16, titleFontPt)
  const bandH = Math.max(26, subjectFontPt + 14)
  const stackGap = Math.max(
    4,
    (STACK_BOTTOM - STACK_TOP - titleBlockH - bandH - INSTR_H) / 2,
  )
  const titleBaseline = STACK_TOP + titleFontPt * 0.85
  const bandY = STACK_TOP + titleBlockH + stackGap
  const instrY = bandY + bandH + stackGap
  /** İki satırlık yönerge bloğu — kutu içinde dikey ortalı */
  const instrLineGap = Math.max(instrFont * 1.3, 16)
  const instrMidY = instrY + INSTR_H / 2
  const instrBaselineNudge = instrFont * 0.35
  const instrLine1Y = instrMidY - instrLineGap / 2 + instrBaselineNudge
  const instrLine2Y = instrMidY + instrLineGap / 2 + instrBaselineNudge

  const hexCx = 58
  const hexCy = 52
  const hexR = 36
  const logoCx = 400
  const logoCy = 50
  const logoSizePct = Math.max(40, Math.min(200, data.logoSizePct ?? 100))
  const logoR = 42 * (logoSizePct / 100)
  /** Yeşil çerçeve ile logo arasında iç boşluk */
  const logoInnerPad = 8 * (logoSizePct / 100)
  /** Yeşil çerçevenin dışındaki beyaz halka */
  const logoOuterPad = 8 * (logoSizePct / 100)
  const logoInnerR = Math.max(4, logoR - logoInnerPad)
  const logoOuterR = logoR + logoOuterPad
  const showLogo = data.showLogo !== false

  return (
    <div
      className={`lgs-official-banner${thumbnail ? ' lgs-official-banner--thumbnail' : ''}${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={ariaLabel}
      style={
        {
          '--lgs-off-green': green,
          '--lgs-off-green-soft': soft,
        } as CSSProperties
      }
    >
      <svg
        className="lgs-official-banner__svg"
        viewBox={`0 0 ${LGS_OFFICIAL_BANNER_VIEW_W} ${LGS_OFFICIAL_BANNER_VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
      >
        <defs>
          <clipPath id="lgs-off-logo-clip">
            <circle cx={logoCx} cy={logoCy} r={logoInnerR} />
          </clipPath>
        </defs>

        {/* KATMAN 1 — noktalı dalgalar (arka) */}
        <g aria-hidden fill="none" stroke={green} strokeWidth={1.15} strokeLinecap="round">
          {Array.from({ length: 8 }, (_, i) => (
            <path
              key={i}
              d={wavePath(i)}
              strokeDasharray="1.4 3.6"
              opacity={0.92}
            />
          ))}
        </g>

        {/* Kitapçık rozeti — Yok seçiliyse kutu boş kalır */}
        <g>
          <path
            d={hexagonPath(hexCx, hexCy, hexR + 2.2)}
            fill="none"
            stroke={green}
            strokeWidth={1.2}
            opacity={0.55}
          />
          <path
            d={hexagonPath(hexCx, hexCy, hexR)}
            fill={soft}
            stroke={green}
            strokeWidth={1.6}
          />
          {booklet ? (
            <text
              x={hexCx}
              y={hexCy + 12}
              textAnchor="middle"
              fill={LGS_OFFICIAL_TEXT}
              fontFamily="Arial Narrow, Arial, Helvetica, sans-serif"
              fontSize={42}
              fontWeight={700}
            >
              {booklet}
            </text>
          ) : null}
        </g>

        {/* Kurum logosu — arkada opak beyaz daire */}
        {showLogo ? (
        <g>
          <circle
            cx={logoCx}
            cy={logoCy}
            r={logoOuterR}
            fill="#FFFFFF"
            stroke="none"
          />
          <circle
            cx={logoCx}
            cy={logoCy}
            r={logoR}
            fill="#FFFFFF"
            stroke={green}
            strokeWidth={1}
          />
          {data.logoUrl ? (
            <image
              href={data.logoUrl}
              x={logoCx - logoInnerR}
              y={logoCy - logoInnerR}
              width={logoInnerR * 2}
              height={logoInnerR * 2}
              preserveAspectRatio="xMidYMid meet"
              clipPath="url(#lgs-off-logo-clip)"
            />
          ) : (
            <text
              x={logoCx}
              y={logoCy + 5}
              textAnchor="middle"
              fill={green}
              fontFamily="Arial, Helvetica, sans-serif"
              fontSize={11}
              fontWeight={700}
            >
              LOGO
            </text>
          )}
        </g>
        ) : null}

        {/* Başlık rozeti — üstte kurum adı, altta eğitim yılı */}
        {(() => {
          const brandFontPt = Math.max(8, Math.min(18, yearFontPt - 1))
          const lineGap = institutionName ? 3 : 0
          const textBlockH = institutionName
            ? brandFontPt + lineGap + yearFontPt
            : yearFontPt
          const approxBrandW = institutionName
            ? institutionName.length * brandFontPt * 0.55
            : 0
          const approxYearW = yearLabel.length * yearFontPt * 0.52
          const approxTextW = Math.max(approxBrandW, approxYearW)
          const capW = Math.min(
            520,
            Math.max(180, approxTextW + yearPadX * 2),
          )
          const capH = Math.max(22, textBlockH + yearPadY * 2)
          const capX = LGS_OFFICIAL_BANNER_VIEW_W - 16 - capW
          const capY = 50 - capH / 2
          const capRx = Math.min(capH / 2, 14)
          const blockTop = capY + (capH - textBlockH) / 2
          return (
            <g>
              <rect
                x={capX}
                y={capY}
                width={capW}
                height={capH}
                rx={capRx}
                ry={capRx}
                fill={yearFill}
              />
              {institutionName ? (
                <text
                  x={capX + capW / 2}
                  y={blockTop + brandFontPt * 0.85}
                  textAnchor="middle"
                  fill={yearText}
                  fontFamily="Arial Narrow, Arial, Helvetica, sans-serif"
                  fontSize={brandFontPt}
                  fontWeight={700}
                  letterSpacing="0.03em"
                >
                  {institutionName.slice(0, 48)}
                </text>
              ) : null}
              <text
                x={capX + capW / 2}
                y={
                  blockTop +
                  (institutionName ? brandFontPt + lineGap : 0) +
                  yearFontPt * 0.85
                }
                textAnchor="middle"
                fill={yearText}
                fontFamily="Arial Narrow, Arial, Helvetica, sans-serif"
                fontSize={yearFontPt}
                fontWeight={700}
                letterSpacing="0.04em"
              >
                {yearLabel}
              </text>
            </g>
          )
        })()}

        {/* KATMAN 2 — sınav adı (tek satır) */}
        <text
          x={LGS_OFFICIAL_BANNER_VIEW_W / 2}
          y={titleBaseline}
          textAnchor="middle"
          fill={titleColor}
          fontFamily="Arial Narrow, Arial, Helvetica, sans-serif"
          fontSize={titleFontPt}
          fontWeight={titleWeight}
          letterSpacing="0.02em"
        >
          {titleLine}
        </text>

        {/* KATMAN 3 — ders bandı */}
        {(() => {
          const bandW = subjectBandW
          const bandX = (LGS_OFFICIAL_BANNER_VIEW_W - bandW) / 2
          const bandRx = 4
          return (
            <g>
              <rect
                x={bandX}
                y={bandY}
                width={bandW}
                height={bandH}
                rx={bandRx}
                ry={bandRx}
                fill={green}
              />
              <text
                x={LGS_OFFICIAL_BANNER_VIEW_W / 2}
                y={bandY + bandH / 2 + subjectFontPt * 0.35}
                textAnchor="middle"
                fill={subjectColor}
                fontFamily="Arial Narrow, Arial, Helvetica, sans-serif"
                fontSize={subjectFontPt}
                fontWeight={subjectWeight}
                letterSpacing="0.06em"
              >
                {subject}
              </text>
            </g>
          )
        })()}

        {/* KATMAN 4 — talimat kutusu (iki yana geniş) */}
        <g>
          <rect
            x={16}
            y={instrY}
            width={893}
            height={INSTR_H}
            fill="#FFFFFF"
            stroke={green}
            strokeWidth={1.4}
          />
          <text
            x={32}
            y={instrLine1Y}
            fill={LGS_OFFICIAL_TEXT}
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize={instrFont}
            fontWeight={500}
          >
            {line1}
          </text>
          <text
            x={32}
            y={instrLine2Y}
            fill={LGS_OFFICIAL_TEXT}
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize={instrFont}
            fontWeight={500}
          >
            {line2}
          </text>
        </g>
      </svg>
    </div>
  )
}

export type { LgsOfficialBannerData, LgsOfficialBannerProps } from './types'
