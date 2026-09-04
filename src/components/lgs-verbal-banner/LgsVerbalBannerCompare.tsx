import LgsVerbalBanner from './LgsVerbalBanner'
import type { LgsVerbalBannerCompareMode, LgsVerbalBannerProps } from './types'
import './lgs-verbal-banner.css'

const REFERENCE_SRC = '/reference/lgs-verbal.png'

type Props = LgsVerbalBannerProps & {
  compareMode?: LgsVerbalBannerCompareMode
}

/** Geliştirme — referans / vektör / overlay karşılaştırma */
export default function LgsVerbalBannerCompare({
  compareMode = 'vector',
  ...bannerProps
}: Props) {
  if (compareMode === 'reference') {
    return (
      <div className="lgs-verbal-banner-compare">
        <img className="lgs-verbal-banner-compare__reference" src={REFERENCE_SRC} alt="" style={{ opacity: 1, position: 'relative' }} />
      </div>
    )
  }

  if (compareMode === 'overlay') {
    return (
      <div className="lgs-verbal-banner-compare">
        <img className="lgs-verbal-banner-compare__reference" src={REFERENCE_SRC} alt="" aria-hidden />
        <LgsVerbalBanner {...bannerProps} className="lgs-verbal-banner-compare__vector" />
      </div>
    )
  }

  return <LgsVerbalBanner {...bannerProps} />
}
