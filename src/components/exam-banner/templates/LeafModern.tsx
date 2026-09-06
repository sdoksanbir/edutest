import type { ExamBannerData } from '../types'
import BannerLogo from '../shared/BannerLogo'
import GradeBadge from '../shared/GradeBadge'

type Props = { data: ExamBannerData; thumbnail?: boolean }

export default function LeafModern({ data, thumbnail }: Props) {
  return (
    <div className={`exam-banner__tpl exam-banner__tpl--leaf-modern${thumbnail ? ' exam-banner__tpl--thumbnail' : ''}`}>
      <div className="exam-banner__modern-block">
        <div className="exam-banner__modern-block-inner">
          <BannerLogo src={data.logoUrl} showPlaceholder={!thumbnail} className="exam-banner__logo--on-dark" />
        </div>
        <div className="exam-banner__modern-cut" aria-hidden />
      </div>
      <div className="exam-banner__body exam-banner__body--modern">
        <div className="exam-banner__col exam-banner__col--center">
          {data.examLabel ? <p className="exam-banner__exam-label">{data.examLabel}</p> : null}
          {data.subject ? <p className="exam-banner__subject-plain exam-banner__subject-plain--bold">{data.subject}</p> : null}
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
