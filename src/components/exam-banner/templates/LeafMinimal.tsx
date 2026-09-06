import type { ExamBannerData } from '../types'
import BannerLogo from '../shared/BannerLogo'
import GradeBadge from '../shared/GradeBadge'

type Props = { data: ExamBannerData; thumbnail?: boolean }

export default function LeafMinimal({ data, thumbnail }: Props) {
  return (
    <div className={`exam-banner__tpl exam-banner__tpl--leaf-minimal${thumbnail ? ' exam-banner__tpl--thumbnail' : ''}`}>
      <div className="exam-banner__corner exam-banner__corner--tl" aria-hidden />
      <div className="exam-banner__body">
        <div className="exam-banner__col exam-banner__col--logo">
          <BannerLogo src={data.logoUrl} showPlaceholder={!thumbnail} />
        </div>
        <div className="exam-banner__divider exam-banner__divider--thin" />
        <div className="exam-banner__col exam-banner__col--center exam-banner__minimal-text">
          {data.examLabel ? <p className="exam-banner__exam-label">{data.examLabel}</p> : null}
          {data.subject ? <p className="exam-banner__subject-plain">{data.subject}</p> : null}
          {data.topic ? <p className="exam-banner__topic">{data.topic}</p> : null}
          {data.subTopic ? <p className="exam-banner__subtopic">{data.subTopic}</p> : null}
        </div>
        <div className="exam-banner__col exam-banner__col--grade">
          <GradeBadge gradeLevel={data.gradeLevel} examType={data.examType} align="end" />
        </div>
      </div>
    </div>
  )
}
