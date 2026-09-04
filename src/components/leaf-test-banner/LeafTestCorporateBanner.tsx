import type { CSSProperties } from 'react'
import type { LeafTestCorporateBannerProps, LeafTestBannerFontSizes } from './types'
import BannerEdgeStripes from './BannerEdgeStripes'
import BannerFooterBar from './BannerFooterBar'
import LeafTestBannerLeftColumn from './LeafTestBannerLeftColumn'
import './leaf-test-corporate.css'

function ptStyle(size: number | undefined, thumbnail: boolean): string | undefined {
  if (size == null) return undefined
  const v = thumbnail ? size * 0.42 : size
  return `${v}pt`
}

function fontStyles(
  sizes: LeafTestBannerFontSizes | undefined,
  thumbnail: boolean,
): CSSProperties {
  if (!sizes) return {}
  return {
    ...(sizes.subject != null ? { ['--ltb-fs-subject' as string]: ptStyle(sizes.subject, thumbnail) } : {}),
    ...(sizes.topic != null ? { ['--ltb-fs-topic' as string]: ptStyle(sizes.topic, thumbnail) } : {}),
    ...(sizes.subTopic != null ? { ['--ltb-fs-subtopic' as string]: ptStyle(sizes.subTopic, thumbnail) } : {}),
    ...(sizes.testType != null ? { ['--ltb-fs-test-type' as string]: ptStyle(sizes.testType, thumbnail) } : {}),
    ...(sizes.gradeLevel != null ? { ['--ltb-fs-grade' as string]: ptStyle(sizes.gradeLevel, thumbnail) } : {}),
    ...(sizes.examType != null ? { ['--ltb-fs-exam-type' as string]: ptStyle(sizes.examType, thumbnail) } : {}),
    ...(sizes.testNumber != null ? { ['--ltb-fs-test-num' as string]: ptStyle(sizes.testNumber, thumbnail) } : {}),
    ...(sizes.institutionName != null
      ? { ['--ltb-fs-inst' as string]: ptStyle(sizes.institutionName, thumbnail) }
      : {}),
    ...(sizes.institutionSubtitle != null
      ? { ['--ltb-fs-inst-sub' as string]: ptStyle(sizes.institutionSubtitle, thumbnail) }
      : {}),
  }
}

export default function LeafTestCorporateBanner({
  data,
  className = '',
  thumbnail = false,
  ariaLabel = 'Yaprak test başlık bannerı',
}: LeafTestCorporateBannerProps) {
  const cssVars = {
    ...(data.primaryColor ? { '--banner-navy': data.primaryColor, '--banner-text': data.primaryColor } : {}),
    ...(data.accentColor ? { '--banner-red': data.accentColor } : {}),
    ...(data.logoScale != null ? { '--ltb-logo-scale': data.logoScale } : {}),
    ...fontStyles(data.fontSizes, thumbnail),
  } as CSSProperties

  return (
    <div
      className={`ltb-corporate test-banner${thumbnail ? ' ltb-corporate--thumbnail' : ''}${className ? ` ${className}` : ''}`}
      style={cssVars}
      role="img"
      aria-label={ariaLabel}
    >
      <BannerEdgeStripes position="top" />
      {data.subject ? (
        <p className="ltb-corporate__subject-banner" title={data.subject}>
          {data.subject}
        </p>
      ) : null}
      <div className="ltb-corporate__grid">
        <LeafTestBannerLeftColumn
          data={{
            showHeaderLeft: data.showHeaderLeft,
            headerLeftMode: data.headerLeftMode,
            logoUrl: data.logoUrl,
            presetLogoId: data.presetLogoId,
            logoPrimaryColor: data.logoPrimaryColor,
            logoAccentColor: data.logoAccentColor,
            publicationLines: data.publicationLines,
          }}
          thumbnail={thumbnail}
        />

        <div className="ltb-corporate__subject">
          {data.topic ? (
            <p className="ltb-corporate__topic" title={data.topic}>
              {data.topic}
            </p>
          ) : null}
          {data.subTopic ? (
            <p className="ltb-corporate__subtopic" title={data.subTopic}>
              {data.subTopic}
            </p>
          ) : null}
          {data.examType ? <p className="ltb-corporate__exam-type">{data.examType}</p> : null}
        </div>

        <div className="ltb-corporate__deco">
          {data.gradeLevel ? (
            <span className="ltb-corporate__grade-badge">{data.gradeLevel}</span>
          ) : null}
          <div className="ltb-corporate__test-badge">
            {data.testType ? (
              <span className="ltb-corporate__test-badge-label">{data.testType}</span>
            ) : null}
            <div className="ltb-corporate__test-badge-circle">
              {data.testNumber ? (
                <span className="ltb-corporate__test-badge-num">{data.testNumber}</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <BannerFooterBar
        scoreCorrect={data.scoreCorrect}
        scoreWrong={data.scoreWrong}
        scoreNet={data.scoreNet}
      />
      <BannerEdgeStripes position="bottom" />
    </div>
  )
}

export type { LeafTestBannerData, LeafTestCorporateBannerProps } from './types'
