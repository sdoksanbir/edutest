import type { ExamBannerData } from '../../types'
import BannerLogo from '../../shared/BannerLogo'
import BannerScoreBox from '../../shared/BannerScoreBox'
import VisualSubjectBlock from '../../shared/VisualSubjectBlock'

type Props = { data: ExamBannerData; thumbnail?: boolean }

export default function VisualLeafGeo({ data, thumbnail }: Props) {
  const showScore = data.showScoreBox !== false && !thumbnail
  const brand = data.institutionName
  return (
    <div className={`exam-banner__tpl exam-banner__tpl--viz-leaf-geo${thumbnail ? ' exam-banner__tpl--thumbnail' : ''}`}>
      <div className="exam-banner__viz-geo-bg" aria-hidden />
      <div className="exam-banner__body exam-banner__body--viz-score">
        <div className="exam-banner__col exam-banner__col--logo exam-banner__col--brand-text">
          {brand ? (
            <p className="exam-banner__viz-brand-word">{brand}</p>
          ) : (
            <BannerLogo src={data.logoUrl} showPlaceholder={!thumbnail} />
          )}
        </div>
        <div className="exam-banner__col exam-banner__col--center">
          <VisualSubjectBlock
            subject={data.subject}
            topic={data.topic}
            subTopic={data.subTopic}
            examLabel={data.examLabel}
            examLabelMuted
          />
        </div>
        <div className="exam-banner__col exam-banner__col--grade">
          {data.gradeLevel ? (
            <div className="exam-banner__viz-parallelogram">
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
