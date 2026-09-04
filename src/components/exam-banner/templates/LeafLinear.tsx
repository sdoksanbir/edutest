import type { ExamBannerData } from '../types'
import BannerLogo from '../shared/BannerLogo'
import GradeBadge from '../shared/GradeBadge'

type Props = { data: ExamBannerData; thumbnail?: boolean }

export default function LeafLinear({ data, thumbnail }: Props) {
  return (
    <div className={`exam-banner__tpl exam-banner__tpl--leaf-linear${thumbnail ? ' exam-banner__tpl--thumbnail' : ''}`}>
      <div className="exam-banner__body">
        <div className="exam-banner__col exam-banner__col--logo">
          <BannerLogo src={data.logoUrl} showPlaceholder={!thumbnail} />
        </div>
        <div className="exam-banner__divider exam-banner__divider--primary" />
        <div className="exam-banner__col exam-banner__col--center">
          {data.subject ? <p className="exam-banner__subject-plain exam-banner__subject-plain--upper">{data.subject}</p> : null}
          {data.topic ? <p className="exam-banner__topic">{data.topic}</p> : null}
          {data.examLabel ? <p className="exam-banner__exam-label exam-banner__exam-label--small">{data.examLabel}</p> : null}
        </div>
        <div className="exam-banner__col exam-banner__col--grade">
          <GradeBadge gradeLevel={data.gradeLevel} examType={data.examType} align="end" />
        </div>
      </div>
      <div className="exam-banner__linear-lines" aria-hidden>
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}
