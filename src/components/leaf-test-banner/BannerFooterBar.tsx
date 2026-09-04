type Props = {
  scoreCorrect?: number | null
  scoreWrong?: number | null
  scoreNet?: number | null
}

function ScorePair({ label, value }: { label: string; value: number | null | undefined }) {
  const hasValue = value != null
  return (
    <div className="ltb-corporate__footer-score-pair">
      <span className="ltb-corporate__footer-score-label">{label}</span>
      <span className="ltb-corporate__footer-score-value">
        {hasValue ? value : <span className="ltb-corporate__footer-score-empty" aria-hidden />}
      </span>
    </div>
  )
}

/** Alt bilgi şeridi — Konu adı, Sınıf/No, D-Y-NET */
export default function BannerFooterBar({ scoreCorrect, scoreWrong, scoreNet }: Props) {
  return (
    <div className="ltb-corporate__footer">
      <div className="ltb-corporate__footer-field ltb-corporate__footer-field--topic">
        <span className="ltb-corporate__footer-label">Konu adı:</span>
        <span className="ltb-corporate__footer-line" aria-hidden />
      </div>
      <div className="ltb-corporate__footer-field ltb-corporate__footer-field--class">
        <span className="ltb-corporate__footer-label">Sınıf / No:</span>
        <span className="ltb-corporate__footer-line ltb-corporate__footer-line--short" aria-hidden />
      </div>
      <div className="ltb-corporate__footer-scores">
        <ScorePair label="D" value={scoreCorrect} />
        <ScorePair label="Y" value={scoreWrong} />
        <ScorePair label="NET" value={scoreNet} />
      </div>
    </div>
  )
}
