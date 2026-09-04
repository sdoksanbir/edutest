import type { ExamBannerData } from '../types'
import BannerLogo from '../shared/BannerLogo'
import StudentInfo from '../shared/StudentInfo'

type Props = { data: ExamBannerData; thumbnail?: boolean }

export default function MaarifWritten({ data, thumbnail }: Props) {
  const institution = data.institutionName || data.schoolName
  const year = data.academicYear
  const semester = data.semester
  const written = data.writtenExamNumber
  return (
    <div className={`exam-banner__tpl exam-banner__tpl--maarif${thumbnail ? ' exam-banner__tpl--thumbnail' : ''}`}>
      <div className="exam-banner__body exam-banner__body--maarif">
        <div className="exam-banner__col exam-banner__col--logo exam-banner__maarif-logo">
          <BannerLogo src={data.logoUrl} showPlaceholder={!thumbnail} />
          {institution ? <p className="exam-banner__institution">{institution}</p> : null}
        </div>
        <div className="exam-banner__divider exam-banner__divider--thin" />
        <div className="exam-banner__col exam-banner__col--subject">
          {data.subject ? <p className="exam-banner__maarif-subject">{data.subject}</p> : null}
          {data.gradeLevel ? <p className="exam-banner__maarif-grade">{data.gradeLevel}</p> : null}
        </div>
        <div className="exam-banner__divider exam-banner__divider--thin" />
        <div className="exam-banner__col exam-banner__col--exam-info">
          {year ? <p className="exam-banner__maarif-line">{year} EĞİTİM ÖĞRETİM YILI</p> : null}
          {semester ? <p className="exam-banner__maarif-line">{semester}</p> : null}
          {written ? <p className="exam-banner__maarif-written">{written}</p> : null}
        </div>
      </div>
      <StudentInfo show={data.showStudentInfo ?? true} />
    </div>
  )
}
