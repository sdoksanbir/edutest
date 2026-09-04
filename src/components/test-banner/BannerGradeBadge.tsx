type Props = {
  gradeLevel: string
  examType?: string
  align?: 'center' | 'start'
  compact?: boolean
}

export default function BannerGradeBadge({
  gradeLevel,
  examType,
  align = 'center',
  compact = false,
}: Props) {
  const grade = gradeLevel.trim()
  const exam = examType?.trim()

  if (!grade && !exam) return null

  return (
    <div
      className={`test-banner__grade ${compact ? 'test-banner__grade--compact' : ''} test-banner__grade--align-${align}`}
    >
      {grade ? <p className="test-banner__grade-level">{grade}</p> : null}
      {exam ? <p className="test-banner__exam-type">{exam}</p> : null}
    </div>
  )
}
