import type { ExamBannerData } from '../../types'
import BannerLogo from '../../shared/BannerLogo'
import BannerScoreBox from '../../shared/BannerScoreBox'
import VisualSubjectBlock from '../../shared/VisualSubjectBlock'

type Props = { data: ExamBannerData; thumbnail?: boolean }

export default function VisualLeafPro({ data, thumbnail }: Props) {
  const showScore = data.showScoreBox !== false && !thumbnail
  return (
    <div className={`exam-banner__tpl exam-banner__tpl--viz-leaf-pro${thumbnail ? ' exam-banner__tpl--thumbnail' : ''}`}>
      <svg className="exam-banner__viz-deco exam-banner__viz-deco--curve-tr" viewBox="0 0 80 50" aria-hidden>
        <path d="M0 0 H80 V20 Q40 50 0 50 Z" fill="var(--banner-primary)" opacity="0.12" />
        <path d="M40 0 H80 V35 Q60 50 40 50 Z" fill="var(--banner-secondary)" opacity="0.15" />
      </svg>
      <svg className="exam-banner__viz-deco exam-banner__viz-deco--curve-br" viewBox="0 0 80 50" aria-hidden>
        <path d="M0 30 Q40 0 80 0 V50 H0 Z" fill="var(--banner-primary)" opacity="0.08" />
      </svg>
      <div className="exam-banner__body exam-banner__body--viz-score">
        <div className="exam-banner__col exam-banner__col--logo">
          <BannerLogo src={data.logoUrl} showPlaceholder={!thumbnail} />
        </div>
        <div className="exam-banner__col exam-banner__col--center">
          <VisualSubjectBlock
            subject={data.subject}
            topic={data.topic}
            subTopic={data.subTopic}
            examLabel={data.examLabel}
          />
        </div>
        <div className="exam-banner__col exam-banner__col--grade">
          {data.gradeLevel ? (
            <div className="exam-banner__viz-grade-box exam-banner__viz-grade-box--gray">
              <span>{data.gradeLevel}</span>
            </div>
          ) : null}
          {data.examType ? <p className="exam-banner__grade-exam">{data.examType}</p> : null}
        </div>
        {showScore ? (
          <BannerScoreBox
            correct={data.scoreCorrect}
            wrong={data.scoreWrong}
            blank={data.scoreBlank}
            compact={thumbnail}
          />
        ) : null}
      </div>
    </div>
  )
}
