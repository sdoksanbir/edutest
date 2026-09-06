import type { ExamBannerData } from '../../types'
import BannerLogo from '../../shared/BannerLogo'
import BannerScoreBox from '../../shared/BannerScoreBox'
import VisualSubjectBlock from '../../shared/VisualSubjectBlock'
import ExamBadge from '../../shared/ExamBadge'

type Props = { data: ExamBannerData; thumbnail?: boolean }

export default function VisualDenemeSolid({ data, thumbnail }: Props) {
  const showScore = data.showScoreBox !== false && !thumbnail
  return (
    <div className={`exam-banner__tpl exam-banner__tpl--viz-deneme-solid${thumbnail ? ' exam-banner__tpl--thumbnail' : ''}`}>
      <div className="exam-banner__viz-triangle-br" aria-hidden />
      <div className="exam-banner__viz-red-line-top" aria-hidden />
      <div className="exam-banner__body exam-banner__body--viz-score">
        <div className="exam-banner__col exam-banner__col--logo">
          <BannerLogo src={data.logoUrl} showPlaceholder={!thumbnail} />
        </div>
        <div className="exam-banner__col exam-banner__col--center">
          {data.title ? <ExamBadge label={data.title} variant="capsule" /> : null}
          <VisualSubjectBlock subject={data.subject} topic={data.topic} subTopic={data.subTopic} pillVariant="plain" />
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
