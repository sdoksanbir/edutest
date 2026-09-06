type Props = {
  src?: string
  alt?: string
  showPlaceholder?: boolean
  className?: string
}

export default function BannerLogo({
  src,
  alt = 'Kurum logosu',
  showPlaceholder = true,
  className = '',
}: Props) {
  return (
    <div className={`exam-banner__logo ${className}`.trim()}>
      {src ? (
        <img src={src} alt={alt} className="exam-banner__logo-img" />
      ) : showPlaceholder ? (
        <div className="exam-banner__logo-placeholder" aria-hidden>
          <svg viewBox="0 0 24 24" className="exam-banner__logo-placeholder-icon">
            <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="9" cy="9" r="2" fill="currentColor" opacity="0.3" />
          </svg>
        </div>
      ) : null}
    </div>
  )
}
