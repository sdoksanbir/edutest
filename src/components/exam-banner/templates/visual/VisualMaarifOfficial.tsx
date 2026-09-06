import type { ExamBannerData } from '../../types'
import BannerLogo from '../../shared/BannerLogo'

type Props = { data: ExamBannerData; thumbnail?: boolean }

export default function VisualMaarifOfficial({ data, thumbnail }: Props) {
  const institution = data.institutionName || data.schoolName
  const examInfo = [data.semester, data.writtenExamNumber].filter(Boolean).join(' ')
  const showStudent = data.showStudentInfo !== false && !thumbnail

  return (
    <div className={`exam-banner__tpl exam-banner__tpl--viz-maarif-official${thumbnail ? ' exam-banner__tpl--thumbnail' : ''}`}>
      <div className="exam-banner__viz-official-border exam-banner__viz-official-border--top" aria-hidden />
      <div className="exam-banner__viz-official-border exam-banner__viz-official-border--bottom" aria-hidden />
      <div className="exam-banner__body exam-banner__body--viz-official">
        <div className="exam-banner__col exam-banner__col--logo exam-banner__viz-official-logo">
          <BannerLogo src={data.logoUrl} showPlaceholder={!thumbnail} />
          {institution ? <p className="exam-banner__viz-official-inst">{institution}</p> : null}
        </div>
        <div className="exam-banner__col exam-banner__col--center exam-banner__viz-official-center">
          {data.subject ? <p className="exam-banner__maarif-subject">{data.subject}</p> : null}
          {examInfo ? <p className="exam-banner__viz-official-exam">{examInfo}</p> : null}
          {data.academicYear ? <p className="exam-banner__maarif-line">{data.academicYear}</p> : null}
        </div>
        {showStudent ? (
          <div className="exam-banner__viz-student-grid">
            <div className="exam-banner__viz-student-field">
              <span>Okul Adı</span>
              <span className="exam-banner__viz-student-line" />
            </div>
            <div className="exam-banner__viz-student-field">
              <span>Adı Soyadı</span>
              <span className="exam-banner__viz-student-line" />
            </div>
            <div className="exam-banner__viz-student-field">
              <span>Sınıfı</span>
              <span className="exam-banner__viz-student-line" />
            </div>
            <div className="exam-banner__viz-student-field">
              <span>No</span>
              <span className="exam-banner__viz-student-line" />
            </div>
          </div>
        ) : null}
        {!thumbnail ? (
          <div className="exam-banner__viz-puan-box">
            <span className="exam-banner__viz-puan-label">PUAN</span>
            <span className="exam-banner__viz-puan-line" />
          </div>
        ) : null}
      </div>
    </div>
  )
}
