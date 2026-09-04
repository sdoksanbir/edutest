import type { ExamBannerData } from '../../types'
import BannerLogo from '../../shared/BannerLogo'
import BannerScoreBox from '../../shared/BannerScoreBox'
import VisualSubjectBlock from '../../shared/VisualSubjectBlock'
import ExamBadge from '../../shared/ExamBadge'

type Props = { data: ExamBannerData; thumbnail?: boolean }

export default function VisualDenemeAngular({ data, thumbnail }: Props) {
  const showScore = data.showScoreBox !== false && !thumbnail
  return (
    <div className={`exam-banner__tpl exam-banner__tpl--viz-deneme-angular${thumbnail ? ' exam-banner__tpl--thumbnail' : ''}`}>
      <div className="exam-banner__viz-angular-lines" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <div className="exam-banner__body exam-banner__body--viz-score">
        <div className="exam-banner__col exam-banner__col--logo exam-banner__col--logo-target">
          <BannerLogo src={data.logoUrl} showPlaceholder={!thumbnail} />
          <svg className="exam-banner__viz-target" viewBox="0 0 16 16" aria-hidden>
            <circle cx="8" cy="8" r="7" fill="none" stroke="var(--banner-secondary)" strokeWidth="1.5" />
            <circle cx="8" cy="8" r="3" fill="var(--banner-secondary)" />
          </svg>
        </div>
        <div className="exam-banner__col exam-banner__col--center">
          {data.title ? <ExamBadge label={data.title} variant="plain" /> : null}
          <VisualSubjectBlock subject={data.subject} topic={data.topic} subTopic={data.subTopic} pillVariant="plain" />
        </div>
        <div className="exam-banner__col exam-banner__col--grade">
          {data.examType ? (
            <div className="exam-banner__viz-grade-box exam-banner__viz-grade-box--blue-outline">
              <span>{data.examType}</span>
            </div>
          ) : null}
          {data.gradeLevel ? <p className="exam-banner__grade-exam">{data.gradeLevel}</p> : null}
        </div>
        {showScore ? (
          <BannerScoreBox correct={data.scoreCorrect} wrong={data.scoreWrong} blank={data.scoreBlank} compact />
        ) : null}
      </div>
    </div>
  )
}
