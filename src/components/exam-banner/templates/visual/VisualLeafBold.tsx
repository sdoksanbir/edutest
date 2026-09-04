import type { ExamBannerData } from '../../types'
import BannerLogo from '../../shared/BannerLogo'
import BannerScoreBox from '../../shared/BannerScoreBox'
import VisualSubjectBlock from '../../shared/VisualSubjectBlock'

type Props = { data: ExamBannerData; thumbnail?: boolean }

export default function VisualLeafBold({ data, thumbnail }: Props) {
  const showScore = data.showScoreBox !== false && !thumbnail
  return (
    <div className={`exam-banner__tpl exam-banner__tpl--viz-leaf-bold${thumbnail ? ' exam-banner__tpl--thumbnail' : ''}`}>
      <div className="exam-banner__viz-logo-panel">
        <BannerLogo src={data.logoUrl} showPlaceholder={!thumbnail} className="exam-banner__logo--on-dark" />
        <div className="exam-banner__viz-logo-panel-cut" aria-hidden />
      </div>
      <div className="exam-banner__viz-slash-right" aria-hidden />
      <div className="exam-banner__body exam-banner__body--viz-score exam-banner__body--with-left-panel">
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
            <div className="exam-banner__viz-grade-box exam-banner__viz-grade-box--blue-outline">
              <span>{data.gradeLevel}</span>
            </div>
          ) : null}
          {data.examType ? <p className="exam-banner__grade-exam">{data.examType}</p> : null}
        </div>
        {showScore ? (
          <BannerScoreBox correct={data.scoreCorrect} wrong={data.scoreWrong} blank={data.scoreBlank} compact />
        ) : null}
      </div>
    </div>
  )
}
