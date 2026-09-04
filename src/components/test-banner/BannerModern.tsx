import type { TestBannerData } from './testBanner.types'
import BannerDecorLines from './BannerDecorLines'
import BannerLogo from './BannerLogo'
import BannerMainContent from './BannerMainContent'
import BannerGradeBadge from './BannerGradeBadge'
import BannerScoreBox from './BannerScoreBox'

type Props = {
  data: TestBannerData
  thumbnail?: boolean
}

export default function BannerModern({ data, thumbnail }: Props) {
  return (
    <div className={`test-banner test-banner--modern${thumbnail ? ' test-banner--thumbnail' : ''}`}>
      <BannerDecorLines position="top" />
      <div className="test-banner__body test-banner__body--modern">
        <BannerLogo logoUrl={data.logoUrl} institutionName={data.institutionName} />
        <BannerMainContent
          subject={data.subject}
          topic={data.topic}
          subTopic={data.subTopic}
          testType={data.testType}
          subjectVariant="pill"
        />
        <BannerGradeBadge gradeLevel={data.gradeLevel} examType={data.examType} compact={thumbnail} />
        <BannerScoreBox
          correct={data.correct}
          wrong={data.wrong}
          blank={data.blank}
          compact={thumbnail}
        />
      </div>
      <BannerDecorLines position="bottom" variant="reverse" />
    </div>
  )
}
