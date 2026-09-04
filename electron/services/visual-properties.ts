import { parseHeaderConfig } from './corporate-header-layout.js'
import { clampQuestionNumberFontPt, QUESTION_NUM_FONT_PT } from './question-number-metrics.js'

export function resolveWatermarkAngleDeg(layout: string | undefined, customDeg = 45): number {
  switch (layout) {
    case 'horizontal':
      return 0
    case 'vertical':
      return 90
    default:
      return Math.max(-90, Math.min(90, customDeg))
  }
}

/** @deprecated use resolveWatermarkAngleDeg */
export function watermarkLayoutToAngleDeg(layout: string | undefined): number {
  return resolveWatermarkAngleDeg(layout, 45)
}

export function hexToRgbColor(hex: string) {
  const s = (hex || '').trim().replace(/^#/, '')
  if (s.length !== 6) return { r: 0.86, g: 0.15, b: 0.15 }
  return {
    r: parseInt(s.slice(0, 2), 16) / 255,
    g: parseInt(s.slice(2, 4), 16) / 255,
    b: parseInt(s.slice(4, 6), 16) / 255,
  }
}

export function stripDataUrlPrefix(dataUrl: unknown): string | null {
  if (typeof dataUrl !== 'string' || !dataUrl) return null
  const m = dataUrl.match(/^data:[^;]+;base64,(.+)$/)
  return m ? m[1]! : dataUrl
}

export function columnDividerTextEnabled(payload: Record<string, unknown>): boolean {
  if (!columnDividerEnabled(payload)) return false
  if (payload.show_column_divider_text != null) {
    return Boolean(payload.show_column_divider_text)
  }
  return Boolean(payload.add_text_on_line)
}

export function columnDividerEnabled(payload: Record<string, unknown>): boolean {
  if (payload.show_column_divider != null) return Boolean(payload.show_column_divider)
  return true
}

export function columnDividerText(payload: Record<string, unknown>): string {
  return String(payload.column_divider_text ?? payload.center_line_text ?? '').trim()
}

export function themePrimaryColor(payload: Record<string, unknown>): string {
  const config = parseHeaderConfig(payload.header_config)
  return String(config.primaryColor || payload.theme_color || '#1E88E5')
}

export function themeAccentColor(payload: Record<string, unknown>): string {
  const config = parseHeaderConfig(payload.header_config)
  return String(config.accentColor || '#DC2626')
}

export function columnDividerColor(payload: Record<string, unknown>): string {
  return themePrimaryColor(payload)
}

export function columnDividerWidthPt(payload: Record<string, unknown>): number {
  const raw = Number(payload.column_divider_width_pt ?? 0.5)
  if (!Number.isFinite(raw)) return 0.5
  return Math.max(0.3, Math.min(4, Math.round(raw * 10) / 10))
}

export function questionNumberingEnabled(payload: Record<string, unknown>): boolean {
  return payload.question_numbering_enabled !== false
}

export function questionNumberStart(payload: Record<string, unknown>): number {
  return Math.max(1, Number(payload.question_number_start ?? 1))
}

export function questionNumberColorMode(payload: Record<string, unknown>): 'theme' | 'black' {
  return payload.question_number_color_mode === 'black' ? 'black' : 'theme'
}

export function questionNumberFontPt(payload: Record<string, unknown>): number {
  return clampQuestionNumberFontPt(Number(payload.question_number_font_pt ?? QUESTION_NUM_FONT_PT))
}

export function pageNumberingEnabled(payload: Record<string, unknown>): boolean {
  return payload.page_numbering_enabled !== false
}

export function pageNumberStart(payload: Record<string, unknown>): number {
  return Math.max(1, Number(payload.page_number_start ?? 1))
}

export function pageNumberFormat(payload: Record<string, unknown>): 'plain' | 'fraction' {
  return payload.page_number_format === 'fraction' ? 'fraction' : 'plain'
}

export function formatPageNumberLabel(
  pageNum: number,
  totalPages: number,
  payload: Record<string, unknown>,
): string {
  const start = pageNumberStart(payload)
  const format = pageNumberFormat(payload)
  const displayPage = pageNum + start - 1
  const displayTotal = totalPages + start - 1
  if (format === 'fraction') return `${displayPage}/${displayTotal}`
  return String(displayPage)
}

export function watermarkActive(payload: Record<string, unknown>): boolean {
  if (payload.show_watermark != null) return Boolean(payload.show_watermark)
  return Boolean(payload.watermark_enabled)
}

export function watermarkTextValue(payload: Record<string, unknown>): string {
  return String(payload.watermark_text ?? '').trim()
}

export function watermarkOpacityPct(payload: Record<string, unknown>): number {
  return Number(payload.watermark_opacity_pct ?? payload.watermark_text_opacity_pct ?? 20)
}

export function watermarkSizePct(payload: Record<string, unknown>): number {
  return Number(payload.watermark_size_pct ?? payload.watermark_text_size_pct ?? 90)
}

export function watermarkAngleDeg(payload: Record<string, unknown>): number {
  const layout = String(payload.watermark_layout ?? 'diagonal')
  const rawCustom = payload.watermark_angle_deg
  const custom =
    rawCustom !== undefined && rawCustom !== null && rawCustom !== ''
      ? Number(rawCustom)
      : Number(payload.watermark_text_angle_deg ?? 45)
  return resolveWatermarkAngleDeg(layout, Number.isFinite(custom) ? custom : 45)
}

export function watermarkLogoBase64(payload: Record<string, unknown>): string | null {
  return (
    stripDataUrlPrefix(payload.watermark_logo_url) ??
    (payload.watermark_image_base64 ? String(payload.watermark_image_base64) : null)
  )
}

export function pageFrameEnabled(payload: Record<string, unknown>): boolean {
  return Boolean(payload.show_page_frame)
}

export function pageFrameColor(payload: Record<string, unknown>): string {
  const mode = String(payload.page_frame_color_mode ?? 'theme')
  const header =
    payload.header_config && typeof payload.header_config === 'object'
      ? (payload.header_config as Record<string, unknown>)
      : null
  const primary = String(header?.primaryColor ?? '').trim()
  const theme = primary || String(payload.theme_color ?? '#1E88E5')
  if (mode === 'custom') {
    return String(payload.page_frame_color ?? theme)
  }
  return theme
}

export function pageFrameWidthPt(payload: Record<string, unknown>): number {
  const raw = Number(payload.page_frame_width_pt ?? 1.5)
  if (!Number.isFinite(raw)) return 1.5
  return Math.max(0.3, Math.min(6, Math.round(raw * 10) / 10))
}

export function pageFrameInnerGapMm(payload: Record<string, unknown>): number {
  const raw = Number(
    payload.page_frame_inner_gap_mm ??
      payload.page_frame_margin_mm ??
      payload.page_frame_padding_mm ??
      3,
  )
  if (!Number.isFinite(raw)) return 3
  return Math.max(0, Math.min(20, Math.round(raw * 10) / 10))
}

export function pageFrameCornerRadiusMm(payload: Record<string, unknown>): number {
  const raw = Number(payload.page_frame_corner_radius_mm ?? 2)
  if (!Number.isFinite(raw)) return 2
  return Math.max(0, Math.min(15, Math.round(raw * 10) / 10))
}

export function pageFrameLineStyle(payload: Record<string, unknown>): 'solid' | 'dashed' | 'dotted' {
  const raw = String(payload.page_frame_line_style ?? 'solid')
  if (raw === 'dashed' || raw === 'dotted') return raw
  return 'solid'
}
