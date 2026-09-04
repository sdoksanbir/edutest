import type { ExamBannerData } from '../../types'
import BannerLogo from '../../shared/BannerLogo'
import BannerScoreBox from '../../shared/BannerScoreBox'
import VisualSubjectBlock from '../../shared/VisualSubjectBlock'

type Props = { data: ExamBannerData; thumbnail?: boolean }

export default function VisualYksWave({ data, thumbnail }: Props) {
  const showScore = data.showScoreBox !== false && !thumbnail
  const panelTitle = data.title || data.examLabel
  return (
    <div className={`exam-banner__tpl exam-banner__tpl--viz-yks-wave${thumbnail ? ' exam-banner__tpl--thumbnail' : ''}`}>
      <div className="exam-banner__viz-yks-panel">
        <BannerLogo src={data.logoUrl} showPlaceholder={!thumbnail} className="exam-banner__logo--on-dark" />
        {panelTitle ? <p className="exam-banner__viz-yks-panel-title">{panelTitle}</p> : null}
      </div>
      <svg className="exam-banner__viz-wave-br" viewBox="0 0 120 60" preserveAspectRatio="none" aria-hidden>
        <path d="M0 40 C30 10 60 50 120 20 V60 H0 Z" fill="var(--banner-primary)" opacity="0.85" />
        <path d="M0 50 C40 25 70 55 120 35 V60 H0 Z" fill="var(--banner-secondary)" opacity="0.75" />
      </svg>
      <div className="exam-banner__body exam-banner__body--viz-score exam-banner__body--with-yks-panel">
        <div className="exam-banner__col exam-banner__col--center">
          <VisualSubjectBlock
            subject={data.subject}
            topic={data.topic}
            subTopic={data.subTopic}
            pillVariant="plain"
          />
        </div>
        <div className="exam-banner__col exam-banner__col--grade">
          {data.examType ? (
            <div className="exam-banner__viz-grade-box exam-banner__viz-grade-box--pill-blue">
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
