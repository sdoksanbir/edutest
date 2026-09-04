/** Tema 1 — orta blok içerik yüksekliği ve banner gövde ölçüsü */

import type { HeaderConfig } from './corporate-header-layout.js'
import { fieldFontPt, type HeaderFontFieldKey } from './header-field-fonts.js'
import {
  headerFieldDisplayText,
  visibleSubTopicText,
  visibleTopicText,
} from './header-field-visibility.js'
import {
  subjectPillHeightPt,
  resolveSubjectPillPadXPt,
  resolveSubjectPillPadYPt,
} from './modern-corporate-header-shared.js'
import { resolveExamTypeBoxHeightPt } from './exam-type-box.js'
import {
  resolveBannerRightMode,
  resolveScoreBoxHeightPt,
  style1TestNoHeightPt,
} from './banner-right-mode.js'

const STYLE_1_BODY_MIN_PT = 56
const STYLE_1_STRIPE_H_PT = 2.5

export const STYLE_1_BODY_EDGE_PAD_PT = 5.5

export function style1CenterContentHeightPt(
  config: HeaderConfig,
  styleId = 'style_1',
): number {
  const ff = (field: HeaderFontFieldKey) => fieldFontPt(field, styleId, config)
  const subject = headerFieldDisplayText(config, 'subject')
  const topic = visibleTopicText(config)
  const subTopic = visibleSubTopicText(config)
  const pillPadYPt = resolveSubjectPillPadYPt(config)
  const subjectTopicGap = config.subjectTopicGapPt ?? 3
  const topicSubTopicGap = config.topicSubTopicGapPt ?? 1

  const topicBlockH = (() => {
    if (!topic && !subTopic) return 0
    let h = 0
    if (topic) h += ff('topic') + 2
    if (subTopic) h += (topic ? topicSubTopicGap : 0) + ff('subTopic')
    return h
  })()

  let blockH = 0
  if (subject) blockH += subjectPillHeightPt(ff('subject'), pillPadYPt) + subjectTopicGap
  if (topicBlockH > 0) blockH += topicBlockH
  return blockH
}

function style1RightSideHeightPt(config: HeaderConfig): number {
  const mode = resolveBannerRightMode(config)
  if (mode === 'score') return resolveScoreBoxHeightPt(config)
  if (mode === 'testNo') return style1TestNoHeightPt(config)
  if (mode === 'examType') return resolveExamTypeBoxHeightPt(config)
  return 0
}

export function style1BodyHeightPt(config: HeaderConfig, styleId = 'style_1'): number {
  const content = style1CenterContentHeightPt(config, styleId)
  const rightH = style1RightSideHeightPt(config)
  const minForSideBoxes = rightH > 0 ? rightH + STYLE_1_BODY_EDGE_PAD_PT * 2 : 0
  return Math.max(
    STYLE_1_BODY_MIN_PT,
    content + STYLE_1_BODY_EDGE_PAD_PT * 2,
    minForSideBoxes,
  )
}

export function style1BannerBlockHeightPt(config: HeaderConfig, styleId = 'style_1'): number {
  return style1BodyHeightPt(config, styleId) + STYLE_1_STRIPE_H_PT * 2
}
