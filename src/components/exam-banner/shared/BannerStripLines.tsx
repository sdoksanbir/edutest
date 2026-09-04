type Props = { position: 'top' | 'bottom'; reverse?: boolean }

export default function BannerStripLines({ position, reverse = false }: Props) {
  const primaryW = reverse ? 30 : 70
  return (
    <svg
      className={`exam-banner__strip exam-banner__strip--${position}`}
      viewBox="0 0 1000 3"
      preserveAspectRatio="none"
      aria-hidden
    >
      <polygon
        points={`0,0 ${primaryW * 10},0 ${primaryW * 10 + 6},3 0,3`}
        className="exam-banner__strip-primary"
      />
      <polygon
        points={`${primaryW * 10},0 1000,0 1000,3 ${primaryW * 10 + 6},3`}
        className="exam-banner__strip-secondary"
      />
    </svg>
  )
}
