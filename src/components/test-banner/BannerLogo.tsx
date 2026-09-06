type Props = {
  logoUrl?: string
  institutionName?: string
  className?: string
}

export default function BannerLogo({ logoUrl, institutionName, className = '' }: Props) {
  const showInstitution = !!institutionName?.trim()

  return (
    <div className={`test-banner__logo-col ${className}`.trim()}>
      <div className="test-banner__logo-box">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={institutionName?.trim() || 'Kurum logosu'}
            className="test-banner__logo-img"
          />
        ) : (
          <div className="test-banner__logo-placeholder" aria-hidden>
            <svg viewBox="0 0 24 24" className="test-banner__logo-placeholder-icon">
              <rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="9" cy="9" r="2" fill="currentColor" opacity="0.35" />
              <path d="M5 17 L10 12 L14 15 L19 10" fill="none" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </div>
        )}
      </div>
      {showInstitution ? (
        <p className="test-banner__institution">{institutionName}</p>
      ) : null}
    </div>
  )
}
