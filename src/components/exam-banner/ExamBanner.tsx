import type { CSSProperties } from 'react'
import LeafCorporate from './templates/LeafCorporate'
import LeafMinimal from './templates/LeafMinimal'
import LeafModern from './templates/LeafModern'
import LeafLinear from './templates/LeafLinear'
import YksTyt from './templates/YksTyt'
import YksAyt from './templates/YksAyt'
import LgsVerbal from './templates/LgsVerbal'
import LgsNumerical from './templates/LgsNumerical'
import MaarifWritten from './templates/MaarifWritten'
import VisualLeafPro from './templates/visual/VisualLeafPro'
import VisualLeafSoft from './templates/visual/VisualLeafSoft'
import VisualLeafBold from './templates/visual/VisualLeafBold'
import VisualLeafGeo from './templates/visual/VisualLeafGeo'
import VisualYksWave from './templates/visual/VisualYksWave'
import VisualDenemeCurve from './templates/visual/VisualDenemeCurve'
import VisualDenemeAngular from './templates/visual/VisualDenemeAngular'
import VisualDenemeSolid from './templates/visual/VisualDenemeSolid'
import VisualMaarifOfficial from './templates/visual/VisualMaarifOfficial'
import type { ExamBannerProps } from './types'
import { normalizeExamBannerTemplateId } from './types'
import './exam-banner.css'
import './exam-banner-visual.css'

const TEMPLATE_MAP = {
  'leaf-corporate': LeafCorporate,
  'leaf-minimal': LeafMinimal,
  'leaf-modern': LeafModern,
  'leaf-linear': LeafLinear,
  'yks-tyt': YksTyt,
  'yks-ayt': YksAyt,
  'lgs-verbal': LgsVerbal,
  'lgs-numerical': LgsNumerical,
  'maarif-written': MaarifWritten,
  'viz-leaf-pro': VisualLeafPro,
  'viz-leaf-soft': VisualLeafSoft,
  'viz-leaf-bold': VisualLeafBold,
  'viz-leaf-geo': VisualLeafGeo,
  'viz-yks-wave': VisualYksWave,
  'viz-deneme-curve': VisualDenemeCurve,
  'viz-deneme-angular': VisualDenemeAngular,
  'viz-deneme-solid': VisualDenemeSolid,
  'viz-maarif-official': VisualMaarifOfficial,
} as const

export default function ExamBanner({
  template = 'leaf-corporate',
  data,
  style,
  className = '',
  thumbnail = false,
  ariaLabel = 'Sınav başlık bannerı',
}: ExamBannerProps) {
  const id = normalizeExamBannerTemplateId(template)
  const Template = TEMPLATE_MAP[id] ?? LeafCorporate

  const cssVars = {
    ...(style?.primaryColor ? { '--banner-primary': style.primaryColor } : {}),
    ...(style?.secondaryColor ? { '--banner-secondary': style.secondaryColor } : {}),
    ...(style?.textColor ? { '--banner-text': style.textColor } : {}),
    ...(style?.height ? { '--banner-height': `${style.height}px` } : {}),
    ...(style?.borderRadius != null ? { '--banner-radius': `${style.borderRadius}px` } : {}),
    ...(style?.logoScale ? { '--banner-logo-scale': style.logoScale } : {}),
  } as CSSProperties

  return (
    <div
      className={`exam-banner-root test-banner${thumbnail ? ' exam-banner-root--thumbnail' : ''}${className ? ` ${className}` : ''}`}
      style={cssVars}
      role="img"
      aria-label={ariaLabel}
    >
      <Template data={data} thumbnail={thumbnail} />
    </div>
  )
}

export type { ExamBannerProps, ExamBannerData, ExamBannerTemplateId } from './types'
export { EXAM_BANNER_CATEGORIES, normalizeExamBannerTemplateId } from './types'
