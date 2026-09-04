type Props = {
  label?: string
  variant?: 'capsule' | 'plain' | 'large'
}

export default function ExamBadge({ label, variant = 'capsule' }: Props) {
  const text = label?.trim()
  if (!text) return null
  return <span className={`exam-banner__badge exam-banner__badge--${variant}`}>{text}</span>
}
