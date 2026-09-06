import type { TestBannerData } from './testBanner.types'
import BannerLogo from './BannerLogo'
import BannerMainContent from './BannerMainContent'
import BannerGradeBadge from './BannerGradeBadge'
import BannerScoreBox from './BannerScoreBox'

type Props = {
  data: TestBannerData
  thumbnail?: boolean
}

export default function BannerMinimal({ data, thumbnail }: Props) {
  return (
    <div className={`test-banner test-banner--minimal${thumbnail ? ' test-banner--thumbnail' : ''}`}>
      <div className="test-banner__body test-banner__body--minimal">
        <BannerLogo logoUrl={data.logoUrl} institutionName={data.institutionName} />
        <div className="test-banner__minimal-center">
          <BannerMainContent
            subject={data.subject}
            topic={data.topic}
            subTopic={data.subTopic}
            testType={data.testType}
            subjectVariant="plain"
          />
          <div className="test-banner__minimal-accent" aria-hidden />
        </div>
        <div className="test-banner__minimal-right">
          <BannerGradeBadge
            gradeLevel={data.gradeLevel}
            examType={data.examType}
            align="start"
            compact={thumbnail}
          />
          <BannerScoreBox
            correct={data.correct}
            wrong={data.wrong}
            blank={data.blank}
            compact={thumbnail}
          />
        </div>
      </div>
    </div>
  )
}
