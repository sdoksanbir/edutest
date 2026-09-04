type Props = {
  correct?: number | null
  wrong?: number | null
  blank?: number | null
  compact?: boolean
}

function ScoreCell({ label, value }: { label: string; value: number | null | undefined }) {
  const hasValue = value != null
  return (
    <div className="test-banner__score-cell">
      <span className="test-banner__score-label">{label}</span>
      {hasValue ? (
        <span className="test-banner__score-value">{value}</span>
      ) : (
        <span className="test-banner__score-line" aria-hidden />
      )}
    </div>
  )
}

export default function BannerScoreBox({ correct, wrong, blank, compact = false }: Props) {
  return (
    <div className={`test-banner__score-box ${compact ? 'test-banner__score-box--compact' : ''}`}>
      <ScoreCell label="DOĞRU" value={correct} />
      <ScoreCell label="YANLIŞ" value={wrong} />
      <ScoreCell label="BOŞ" value={blank} />
    </div>
  )
}
