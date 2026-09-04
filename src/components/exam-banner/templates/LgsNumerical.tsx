import type { ExamBannerData } from '../types'
import BannerLogo from '../shared/BannerLogo'
import GradeBadge from '../shared/GradeBadge'
import ExamBadge from '../shared/ExamBadge'
import StudentInfo from '../shared/StudentInfo'

type Props = { data: ExamBannerData; thumbnail?: boolean }

export default function LgsNumerical({ data, thumbnail }: Props) {
  const title = data.title
  const exam = data.examType
  const sub = data.subTopic
  return (
    <div className={`exam-banner__tpl exam-banner__tpl--lgs-numerical${thumbnail ? ' exam-banner__tpl--thumbnail' : ''}`}>
      <div className="exam-banner__lgs-num-block">
        <BannerLogo src={data.logoUrl} showPlaceholder={!thumbnail} className="exam-banner__logo--on-dark" />
      </div>
      <div className="exam-banner__body exam-banner__body--lgs-num">
        <div className="exam-banner__col exam-banner__col--center">
          {title ? <ExamBadge label={title} variant="plain" /> : null}
          {exam ? <p className="exam-banner__exam-type-large">{exam}</p> : null}
          {sub ? <p className="exam-banner__subtopic">{sub}</p> : null}
        </div>
        <div className="exam-banner__col exam-banner__col--grade">
          <GradeBadge gradeLevel={data.gradeLevel} examType={exam} align="end" />
        </div>
      </div>
      <div className="exam-banner__dot-pattern" aria-hidden />
      <StudentInfo show={data.showStudentInfo} />
    </div>
  )
}
