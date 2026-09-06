import ExamBadge from './ExamBadge'

type Props = {
  subject?: string
  topic?: string
  subTopic?: string
  examLabel?: string
  pillVariant?: 'capsule' | 'plain'
  examLabelMuted?: boolean
}

export default function VisualSubjectBlock({
  subject,
  topic,
  subTopic,
  examLabel,
  pillVariant = 'capsule',
  examLabelMuted = false,
}: Props) {
  return (
    <div className="exam-banner__viz-subject">
      {examLabel ? (
        <p className={`exam-banner__viz-exam-tag${examLabelMuted ? ' exam-banner__viz-exam-tag--muted' : ''}`}>
          {examLabel}
        </p>
      ) : null}
      {subject && pillVariant === 'capsule' ? (
        <ExamBadge label={subject} variant="capsule" />
      ) : subject ? (
        <p className="exam-banner__subject-plain exam-banner__subject-plain--bold">{subject}</p>
      ) : null}
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
    </div>
  )
}
