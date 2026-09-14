/** Kaynak PDF badge — aynı PDF her zaman aynı renk. */

const PDF_BADGE_PALETTE: ReadonlyArray<{ bg: string; fg: string }> = [
  { bg: '#0369a1', fg: '#e0f2fe' },
  { bg: '#7c3aed', fg: '#ede9fe' },
  { bg: '#0f766e', fg: '#ccfbf1' },
  { bg: '#b45309', fg: '#ffedd5' },
  { bg: '#be185d', fg: '#fce7f3' },
  { bg: '#4338ca', fg: '#e0e7ff' },
  { bg: '#15803d', fg: '#dcfce7' },
  { bg: '#c2410c', fg: '#ffedd5' },
  { bg: '#0e7490', fg: '#cffafe' },
  { bg: '#6d28d9', fg: '#ede9fe' },
  { bg: '#a16207', fg: '#fef9c3' },
  { bg: '#1d4ed8', fg: '#dbeafe' },
]

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function pdfSourceBadgeKey(
  sourcePdfId: string | null | undefined,
  sourcePdfFilename: string | null | undefined,
): string {
  const id = sourcePdfId?.trim()
  if (id && id !== 'unknown') return id
  const name = sourcePdfFilename?.trim()
  return name && name.length > 0 ? name : 'bilinmeyen-pdf'
}

export function pdfSourceBadgeColors(key: string): { bg: string; fg: string } {
  const idx = hashString(key) % PDF_BADGE_PALETTE.length
  return PDF_BADGE_PALETTE[idx]!
}

/** Uzun PDF adını badge için kısaltır. */
export function shortenPdfBadgeLabel(filename: string, maxLen = 22): string {
  const raw = filename.trim() || 'PDF'
  const base = raw.replace(/\.pdf$/i, '')
  if (base.length <= maxLen) return base
  return `${base.slice(0, Math.max(0, maxLen - 1))}…`
}
