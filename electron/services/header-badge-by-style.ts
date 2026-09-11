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

export function style1BadgeDefaults(): HeaderBadgeSettings {
  return {
    bannerRightMode: 'examType',
    bannerRightSlots: ['examType', 'score'],
    testNoWidthPt: 100,
    testNoHeightPt: 22,
    testNoLabelFontPt: 15,
    testNoNumFontPt: 11,
    testNoLabelColor: '',
    testNoNumColor: '#FFFFFF',
    testNoOffsetYPt: 3,
    testNoGapXPt: 3,
    testNoOffsetXPt: 23,
    scoreBoxWidthPt: 130,
    scoreBoxHeightPt: 17,
    scoreBoxLabelFontPt: 10,
    scoreBoxOffsetYPt: 9,
    examTypeBoxManualWidthPt: 100,
    examTypeBoxManualHeightPt: 22,
    examTypeOffsetXPt: 0,
    examTypeOffsetYPt: 7,
    examType: 'SINIF',
    examTypeLine1: 'SINIF',
    examTypeLine2: '',
    examTypeLine1FontPt: 11,
    examTypeLine1Color: '#FFFFFF',
    examTypeBoxBorderStyle: 'none',
    examTypeBoxFillEnabled: true,
    examTypeBoxFillColor: '#0A1931',
  }
}

export function style2BadgeDefaults(): HeaderBadgeSettings {
  return {
    bannerRightMode: 'testNo',
    testType: 'TEST',
    testNumber: '01',
    testNoLabelFontPt: 11.5,
    testNoNumFontPt: 10,
    testNoLabelColor: '',
    testNoNumColor: '#FFFFFF',
    testNoFillColor: '',
    testNoBorderColor: '',
    testNoWidthPt: 60,
    testNoHeightPt: 18,
    scoreBoxWidthPt: 130,
    scoreBoxHeightPt: 17,
    scoreBoxLabelFontPt: 10,
    scoreBoxOffsetYPt: -1,
    scoreBoxLabelColor: '',
    scoreBoxBorderColor: '',
    scoreBoxFillColor: '#FFFFFF',
    scoreBoxBorderWidthPt: 1.25,
    scoreBoxLineWidthPt: 0.75,
    examType: 'SINIF',
    examTypeLine1: 'SINIF',
    examTypeLine2: '',
    examTypeLine1FontPt: 9,
    examTypeLine2FontPt: 10,
    examTypeLine1Color: '#FFFFFF',
    examTypeLine2Color: '',
    examTypeBoxBorderStyle: 'none',
    examTypeBoxBorderColor: '',
    examTypeBoxBorderWidthPt: 1.5,
    examTypeBoxManualWidthPt: 72,
    examTypeBoxManualHeightPt: 22,
    examTypeBoxPadXPt: 4,
    examTypeBoxPadYPt: 4,
    examTypeOffsetXPt: 0,
    examTypeOffsetYPt: 0,
    examTypeBoxFillEnabled: true,
    examTypeBoxFillColor: '#0A1931',
    examTypeTextAlign: 'center',
    examTypeDividerStyle: 'none',
    examTypeDividerColor: '',
    examTypeDividerWidthPt: 0.75,
  }
}

function stripLegacyScoreBoxDefaults(
  overlay: HeaderBadgeSettings,
): HeaderBadgeSettings {
  const next = { ...overlay }
  const w = Number(next.scoreBoxWidthPt)
  const h = Number(next.scoreBoxHeightPt)
  const f = Number(next.scoreBoxLabelFontPt)
  const testW = Number(next.testNoWidthPt)
  const labelPt = Number(next.testNoLabelFontPt)
  const numPt = Number(next.testNoNumFontPt)
  const gapX = Number(next.testNoGapXPt)
  const testOy = Number(next.testNoOffsetYPt)
  const testOx = Number(next.testNoOffsetXPt)
  const examW = Number(next.examTypeBoxManualWidthPt)
  const examOy = Number(next.examTypeOffsetYPt)
  if (w === 113 || w === 108 || w === 100) delete next.scoreBoxWidthPt
  if (h === 37 || h === 22) delete next.scoreBoxHeightPt
  if (f === 7) delete next.scoreBoxLabelFontPt
  if (testW === 72 || testW === 60) delete next.testNoWidthPt
  if (labelPt === 8 || labelPt === 11 || labelPt === 11.5) delete next.testNoLabelFontPt
  if (numPt === 10) delete next.testNoNumFontPt
  if (gapX === 4) delete next.testNoGapXPt
  if (testOy === 0) delete next.testNoOffsetYPt
  if (testOx === 0) delete next.testNoOffsetXPt
  if (examW === 72 || examW === 96) delete next.examTypeBoxManualWidthPt
  if (examOy === 0 || examOy === 4) delete next.examTypeOffsetYPt
  if (Number(next.examTypeLine1FontPt) === 9) delete next.examTypeLine1FontPt
  {
    const slots = next.bannerRightSlots
    if (
      Array.isArray(slots) &&
      slots.length === 1 &&
      slots[0] === 'score'
    ) {
      delete next.bannerRightSlots
      if (next.bannerRightMode === 'score') delete next.bannerRightMode
    }
  }
  if (next.testNoLabelColor === '#FFFFFF' || next.testNoLabelColor === '#ffffff') {
    delete next.testNoLabelColor
  }
  if (next.examTypeLine1Color === '' || next.examTypeLine1Color == null) {
    delete next.examTypeLine1Color
  }
  if (next.examTypeLine1 == null) {
    delete next.examTypeLine1
  }
  {
    const line1 = String(next.examTypeLine1 ?? '').trim()
    if (
      line1 === 'TYT-AYT' ||
      line1 === 'TYT-AYT TEST' ||
      line1 === '9. Sınıf'
    ) {
      delete next.examTypeLine1
    }
    const et = String(next.examType ?? '').trim()
    if (et === 'TYT-AYT' || et === 'TYT-AYT TEST' || et === '9. Sınıf') {
      delete next.examType
    }
  }
  {
    const fill = String(next.examTypeBoxFillColor ?? '').trim().toLowerCase()
    if (fill === '#dc2626' || fill === '#f34a2f') delete next.examTypeBoxFillColor
    if (
      next.examTypeBoxFillEnabled === false &&
      (fill === '' || fill === '#f3f4f6')
    ) {
      delete next.examTypeBoxFillEnabled
      delete next.examTypeBoxFillColor
    }
  }
  if (
    Number(next.scoreBoxOffsetYPt) === -6 ||
    Number(next.scoreBoxOffsetYPt) === 0
  ) {
    delete next.scoreBoxOffsetYPt
  }
  return next
}

export function mergeHeaderBadgeConfig(
  config: HeaderConfig,
  styleId?: string,
): HeaderConfig {
  const id = normalizeHeaderStyleId(styleId)
  const overlay = config.badgeByStyle?.[id] ?? {}
  if (id === 'style_2') {
    const next = { ...overlay }
    if (next.testNoLabelColor === '#FFFFFF' || next.testNoLabelColor === '#ffffff') {
      delete next.testNoLabelColor
    }
    return { ...config, ...style2BadgeDefaults(), ...next } as HeaderConfig
  }
  if (id === 'style_1') {
    return {
      ...config,
      ...style1BadgeDefaults(),
      ...stripLegacyScoreBoxDefaults(overlay),
    } as HeaderConfig
  }
  return Object.keys(overlay).length > 0
    ? ({ ...config, ...overlay } as HeaderConfig)
    : config
}
