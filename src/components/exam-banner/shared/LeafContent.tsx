import ExamBadge from './ExamBadge'
import type { ExamBannerData } from '../types'

type Props = Pick<
  ExamBannerData,
  'subject' | 'topic' | 'subTopic' | 'examLabel' | 'title'
> & {
  subjectVariant?: 'capsule' | 'plain'
}

export default function LeafContent({
  subject,
  topic,
  subTopic,
  examLabel,
  title,
  subjectVariant = 'capsule',
}: Props) {
  return (
    <div className="exam-banner__leaf-content">
      {title ? <p className="exam-banner__title">{title}</p> : null}
      {subject ? <ExamBadge label={subject} variant={subjectVariant} /> : null}
      {topic ? (
        <p className="exam-banner__topic" title={topic}>
          {topic}
        </p>
      ) : null}
      {subTopic ? (
        <p className="exam-banner__subtopic" title={subTopic}>
          {subTopic}
        </p>
      ) : null}
      {examLabel ? <p className="exam-banner__exam-label">{examLabel}</p> : null}
    </div>
  )
}
