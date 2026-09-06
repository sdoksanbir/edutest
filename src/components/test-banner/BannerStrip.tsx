import type { TestBannerData } from './testBanner.types'
import BannerMainContent from './BannerMainContent'
import BannerGradeBadge from './BannerGradeBadge'
import BannerScoreBox from './BannerScoreBox'

type Props = {
  data: TestBannerData
  thumbnail?: boolean
}

export default function BannerStrip({ data, thumbnail }: Props) {
  return (
    <div className={`test-banner test-banner--strip${thumbnail ? ' test-banner--thumbnail' : ''}`}>
      <div className="test-banner__strip-top">
        {data.subject ? (
          <p className="test-banner__strip-subject">{data.subject}</p>
        ) : (
          <span className="test-banner__strip-subject test-banner__strip-subject--empty" />
        )}
        <BannerGradeBadge
          gradeLevel={data.gradeLevel}
          examType={data.examType}
          align="start"
          compact
        />
      </div>
      <div className="test-banner__strip-body">
        <BannerMainContent
          subject=""
          topic={data.topic}
          subTopic={data.subTopic}
          testType={data.testType}
          subjectVariant="strip"
        />
        <BannerScoreBox
          correct={data.correct}
          wrong={data.wrong}
          blank={data.blank}
          compact={thumbnail}
        />
      </div>
    </div>
  )
}
