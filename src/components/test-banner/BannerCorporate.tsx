import type { TestBannerData } from './testBanner.types'
import BannerLogo from './BannerLogo'
import BannerMainContent from './BannerMainContent'
import BannerGradeBadge from './BannerGradeBadge'
import BannerScoreBox from './BannerScoreBox'

type Props = {
  data: TestBannerData
  thumbnail?: boolean
}

export default function BannerCorporate({ data, thumbnail }: Props) {
  return (
    <div className={`test-banner test-banner--corporate${thumbnail ? ' test-banner--thumbnail' : ''}`}>
      <div className="test-banner__body test-banner__body--corporate">
        <div className="test-banner__corporate-left">
          <BannerLogo logoUrl={data.logoUrl} institutionName={data.institutionName} />
        </div>
        <div className="test-banner__corporate-divider" aria-hidden />
        <div className="test-banner__corporate-center">
          <BannerMainContent
            subject={data.subject}
            topic={data.topic}
            subTopic={data.subTopic}
            testType={data.testType}
            subjectVariant="plain"
          />
        </div>
        <div className="test-banner__corporate-right">
          <BannerGradeBadge
            gradeLevel={data.gradeLevel}
            examType={data.examType}
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
