import type { CSSProperties } from 'react'
import BannerModern from './BannerModern'
import BannerMinimal from './BannerMinimal'
import BannerCorporate from './BannerCorporate'
import BannerStrip from './BannerStrip'
import type { TestBannerProps } from './testBanner.types'
import './testBanner.css'

const TEMPLATE_MAP = {
  modern: BannerModern,
  minimal: BannerMinimal,
  corporate: BannerCorporate,
  strip: BannerStrip,
} as const

export default function TestBanner({
  template = 'modern',
  data,
  className = '',
  thumbnail = false,
  ariaLabel = 'Yaprak test başlık bannerı',
  colors,
}: TestBannerProps) {
  const Template = TEMPLATE_MAP[template] ?? BannerModern
  const colorStyle = {
    ...(colors?.primary ? { '--banner-primary': colors.primary } : {}),
    ...(colors?.secondary ? { '--banner-secondary': colors.secondary } : {}),
  } as CSSProperties

  return (
    <div
      className={`test-banner-root${className ? ` ${className}` : ''}`}
      style={colorStyle}
      role="img"
      aria-label={ariaLabel}
    >
      <Template data={data} thumbnail={thumbnail} />
    </div>
  )
}

export type { TestBannerProps, TestBannerData, TestBannerTemplateId } from './testBanner.types'
export { TEST_BANNER_TEMPLATE_OPTIONS, normalizeBannerTemplateId } from './testBanner.types'
