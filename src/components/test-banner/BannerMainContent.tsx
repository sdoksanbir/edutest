type Props = {
  subject: string
  topic: string
  subTopic?: string
  testType?: string
  subjectVariant?: 'pill' | 'plain' | 'strip'
}

export default function BannerMainContent({
  subject,
  topic,
  subTopic,
  testType,
  subjectVariant = 'pill',
}: Props) {
  const sub = subTopic?.trim()
  const test = testType?.trim()

  return (
    <div className="test-banner__main">
      {subject ? (
        <p
          className={`test-banner__subject test-banner__subject--${subjectVariant}`}
        >
          {subject}
        </p>
      ) : null}
      {topic ? (
        <p className="test-banner__topic" title={topic}>
          {topic}
        </p>
      ) : null}
      {sub ? (
        <p className="test-banner__subtopic" title={sub}>
          {sub}
        </p>
      ) : null}
      {test ? <p className="test-banner__test-type">{test}</p> : null}
    </div>
  )
}
