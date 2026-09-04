type Props = {
  position: 'top' | 'bottom'
  variant?: 'default' | 'reverse'
}

/** Üst/alt dekoratif lacivert + bordo çizgi — saf SVG */
export default function BannerDecorLines({ position, variant = 'default' }: Props) {
  const isTop = position === 'top'
  const reverse = variant === 'reverse'
  const primaryW = reverse ? 30 : 70
  const secondaryW = 100 - primaryW

  return (
    <svg
      className={`test-banner__decor test-banner__decor--${position}`}
      viewBox="0 0 1000 4"
      preserveAspectRatio="none"
      aria-hidden
    >
      {isTop ? (
        <>
          <polygon
            points={`0,0 ${primaryW * 10},0 ${primaryW * 10 + 8},4 0,4`}
            className="test-banner__decor-primary"
          />
          <polygon
            points={`${primaryW * 10},0 1000,0 1000,4 ${primaryW * 10 + 8},4`}
            className="test-banner__decor-secondary"
          />
        </>
      ) : (
        <>
          <polygon
            points={`0,0 ${secondaryW * 10 - 8},0 ${secondaryW * 10},4 0,4`}
            className="test-banner__decor-secondary"
          />
          <polygon
            points={`${secondaryW * 10 - 8},0 1000,0 1000,4 ${secondaryW * 10},4`}
            className="test-banner__decor-primary"
          />
        </>
      )}
    </svg>
  )
}
