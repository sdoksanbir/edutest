type Props = { position: 'top' | 'bottom' }

/** Üst/alt lacivert çizgi — sağda kırmızı diagonal birleşim */
export default function BannerEdgeStripes({ position }: Props) {
  return (
    <svg
      className={`ltb-edge ltb-edge--${position}`}
      viewBox="0 0 1000 4"
      preserveAspectRatio="none"
      aria-hidden
    >
      <polygon points="0,0 680,0 692,4 0,4" fill="var(--banner-navy)" />
      <polygon points="680,0 1000,0 1000,4 692,4" fill="var(--banner-red)" />
    </svg>
  )
}
