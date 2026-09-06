import type { ExamBannerData } from '../types'
import BannerLogo from '../shared/BannerLogo'
import ExamBadge from '../shared/ExamBadge'

type Props = { data: ExamBannerData; thumbnail?: boolean }

export default function YksTyt({ data, thumbnail }: Props) {
  const title = data.title
  const exam = data.examType
  const sub = data.subTopic || data.topic
  return (
    <div className={`exam-banner__tpl exam-banner__tpl--yks-tyt${thumbnail ? ' exam-banner__tpl--thumbnail' : ''}`}>
      <div className="exam-banner__body">
        <div className="exam-banner__col exam-banner__col--logo">
          <BannerLogo src={data.logoUrl} showPlaceholder={!thumbnail} />
        </div>
        <div className="exam-banner__col exam-banner__col--center exam-banner__trial-center">
          {title ? <ExamBadge label={title} variant="plain" /> : null}
          {exam ? <p className="exam-banner__exam-type-huge">{exam}</p> : null}
          {sub ? <p className="exam-banner__subtopic">{sub}</p> : null}
        </div>
        {exam ? (
          <div className="exam-banner__tyt-panel" aria-hidden>
            <span>{exam}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
