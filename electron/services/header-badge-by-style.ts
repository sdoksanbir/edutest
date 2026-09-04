/** Başlık rozeti ayarları — tema bazında bağımsız */

import type { HeaderConfig } from './corporate-header-layout.js'
import { normalizeHeaderStyleId } from './header-styles.js'

export type HeaderBadgeSettings = Record<string, unknown>
export type HeaderBadgeByStyle = Partial<Record<string, HeaderBadgeSettings>>

const STYLE_IDS = ['style_1', 'style_2', 'style_3', 'style_4']

export function parseHeaderBadgeByStyle(raw: unknown): HeaderBadgeByStyle {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  const out: HeaderBadgeByStyle = {}
  for (const id of STYLE_IDS) {
    const bag = o[id]
    if (bag && typeof bag === 'object') out[id] = { ...(bag as HeaderBadgeSettings) }
  }
  return out
}

export function style2BadgeDefaults(): HeaderBadgeSettings {
  return {
    bannerRightMode: 'testNo',
    testType: 'TEST',
    testNumber: '01',
    testNoLabelFontPt: 8,
    testNoNumFontPt: 10,
    testNoLabelColor: '#FFFFFF',
    testNoNumColor: '',
    testNoFillColor: '',
    testNoBorderColor: '',
    testNoWidthPt: 72,
    testNoHeightPt: 22,
    scoreBoxWidthPt: 113,
    scoreBoxHeightPt: 37,
    scoreBoxLabelFontPt: 7,
    scoreBoxLabelColor: '',
    scoreBoxBorderColor: '',
    scoreBoxFillColor: '#FFFFFF',
    scoreBoxBorderWidthPt: 1.25,
    scoreBoxLineWidthPt: 0.75,
    examType: 'TYT-AYT TEST',
    examTypeLine1: 'TYT-AYT',
    examTypeLine2: 'TEST',
    examTypeLine1FontPt: 9,
    examTypeLine2FontPt: 10,
    examTypeLine1Color: '',
    examTypeLine2Color: '',
    examTypeBoxBorderStyle: 'solid',
    examTypeBoxBorderColor: '',
    examTypeBoxBorderWidthPt: 1.5,
    examTypeBoxManualWidthPt: 96,
    examTypeBoxManualHeightPt: 36,
    examTypeBoxPadXPt: 4,
    examTypeBoxPadYPt: 4,
    examTypeBoxFillEnabled: false,
    examTypeBoxFillColor: '#F3F4F6',
    examTypeTextAlign: 'center',
    examTypeDividerStyle: 'none',
    examTypeDividerColor: '',
    examTypeDividerWidthPt: 0.75,
  }
}

export function mergeHeaderBadgeConfig(
  config: HeaderConfig,
  styleId?: string,
): HeaderConfig {
  const id = normalizeHeaderStyleId(styleId)
  const overlay = config.badgeByStyle?.[id] ?? {}
  if (id === 'style_2') {
    return { ...config, ...style2BadgeDefaults(), ...overlay } as HeaderConfig
  }
  return Object.keys(overlay).length > 0
    ? ({ ...config, ...overlay } as HeaderConfig)
    : config
}
