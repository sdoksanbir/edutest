import type { ExamBannerData } from '../types'
import BannerLogo from '../shared/BannerLogo'
import BannerStripLines from '../shared/BannerStripLines'
import GradeBadge from '../shared/GradeBadge'
import LeafContent from '../shared/LeafContent'

type Props = { data: ExamBannerData; thumbnail?: boolean }

export default function LeafCorporate({ data, thumbnail }: Props) {
  return (
    <div className={`exam-banner__tpl exam-banner__tpl--leaf-corporate${thumbnail ? ' exam-banner__tpl--thumbnail' : ''}`}>
      <BannerStripLines position="top" />
      <div className="exam-banner__body">
        <div className="exam-banner__col exam-banner__col--logo">
          <BannerLogo src={data.logoUrl} showPlaceholder={!thumbnail} />
        </div>
        <div className="exam-banner__divider exam-banner__divider--bordo" />
        <div className="exam-banner__col exam-banner__col--center">
          <LeafContent
            subject={data.subject}
            topic={data.topic}
            subTopic={data.subTopic}
            examLabel={data.examLabel}
          />
        </div>
        <div className="exam-banner__col exam-banner__col--grade">
          <GradeBadge gradeLevel={data.gradeLevel} examType={data.examType} />
        </div>
      </div>
      <BannerStripLines position="bottom" reverse />
    </div>
  )
}
