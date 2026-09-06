import type { ExamBannerData } from '../../types'
import BannerLogo from '../../shared/BannerLogo'
import BannerScoreBox from '../../shared/BannerScoreBox'
import VisualSubjectBlock from '../../shared/VisualSubjectBlock'
import ExamBadge from '../../shared/ExamBadge'

type Props = { data: ExamBannerData; thumbnail?: boolean }

export default function VisualDenemeCurve({ data, thumbnail }: Props) {
  const showScore = data.showScoreBox !== false && !thumbnail
  return (
    <div className={`exam-banner__tpl exam-banner__tpl--viz-deneme-curve${thumbnail ? ' exam-banner__tpl--thumbnail' : ''}`}>
      <svg className="exam-banner__viz-wave-tl" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden>
        <path d="M0 0 H100 V15 Q50 40 0 25 Z" fill="var(--banner-primary)" />
      </svg>
      <svg className="exam-banner__viz-wave-br exam-banner__viz-wave-br--overlap" viewBox="0 0 120 60" preserveAspectRatio="none" aria-hidden>
        <path d="M0 35 C35 5 65 45 120 15 V60 H0 Z" fill="var(--banner-primary)" opacity="0.9" />
        <path d="M0 45 C45 20 75 50 120 30 V60 H0 Z" fill="var(--banner-secondary)" opacity="0.85" />
      </svg>
      <div className="exam-banner__body exam-banner__body--viz-score">
        <div className="exam-banner__col exam-banner__col--logo">
          <BannerLogo src={data.logoUrl} showPlaceholder={!thumbnail} />
        </div>
        <div className="exam-banner__col exam-banner__col--center">
          {data.title ? <ExamBadge label={data.title} variant="plain" /> : null}
          <VisualSubjectBlock subject={data.subject} topic={data.topic} subTopic={data.subTopic} pillVariant="plain" />
        </div>
        <div className="exam-banner__col exam-banner__col--grade">
          {data.gradeLevel ? <p className="exam-banner__viz-grade-red exam-banner__viz-grade-large">{data.gradeLevel}</p> : null}
          {data.examType ? <p className="exam-banner__grade-exam">{data.examType}</p> : null}
        </div>
        {showScore ? (
          <BannerScoreBox correct={data.scoreCorrect} wrong={data.scoreWrong} blank={data.scoreBlank} compact />
        ) : null}
      </div>
    </div>
  )
}
