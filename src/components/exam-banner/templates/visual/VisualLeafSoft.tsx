import type { ExamBannerData } from '../../types'
import BannerLogo from '../../shared/BannerLogo'
import BannerScoreBox from '../../shared/BannerScoreBox'
import VisualSubjectBlock from '../../shared/VisualSubjectBlock'

type Props = { data: ExamBannerData; thumbnail?: boolean }

export default function VisualLeafSoft({ data, thumbnail }: Props) {
  const showScore = data.showScoreBox !== false && !thumbnail
  return (
    <div className={`exam-banner__tpl exam-banner__tpl--viz-leaf-soft${thumbnail ? ' exam-banner__tpl--thumbnail' : ''}`}>
      <div className="exam-banner__viz-flow-lines" aria-hidden>
        <span className="exam-banner__viz-flow-line exam-banner__viz-flow-line--red" />
        <span className="exam-banner__viz-flow-line exam-banner__viz-flow-line--blue" />
      </div>
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
            pillVariant="plain"
          />
        </div>
        <div className="exam-banner__col exam-banner__col--grade">
          {data.gradeLevel ? (
            <div className="exam-banner__viz-grade-box exam-banner__viz-grade-box--red-outline">
              <span className="exam-banner__viz-grade-red">{data.gradeLevel}</span>
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
