type Props = {
  gradeLevel?: string
  examType?: string
  align?: 'center' | 'end'
}

export default function GradeBadge({ gradeLevel, examType, align = 'center' }: Props) {
  const grade = gradeLevel?.trim()
  const exam = examType?.trim()
  if (!grade && !exam) return null

  return (
    <div className={`exam-banner__grade exam-banner__grade--${align}`}>
      {grade ? <p className="exam-banner__grade-level">{grade}</p> : null}
      {exam ? <p className="exam-banner__grade-exam">{exam}</p> : null}
    </div>
  )
}
