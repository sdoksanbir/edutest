export interface LgsOfficialBannerData {
  bookletType: string
  logoUrl?: string
  logoSizePct?: number
  showLogo?: boolean
  academicYear: string
  /** Yıl rozetinin üst satırı — kurum adı */
  institutionName?: string
  examTitle: string
  subjectName: string
  instructionLine1: string
  instructionLine2: string
  primaryColor?: string
  /** Kitapçık / yıl kapsülü arka planı — vurgu rengi */
  accentColor?: string
  yearFillColor?: string
  yearTextColor?: string
  yearFontPt?: number
  yearPadXPt?: number
  yearPadYPt?: number
  titleFontPt?: number
  titleTextColor?: string
  titleBold?: boolean
  subjectFontPt?: number
  subjectTextColor?: string
  subjectBold?: boolean
  /** Test adı yeşil bandı genişliği (viewBox) */
  subjectBandWidthPt?: number
  instructionFontPt?: number
}

export type LgsOfficialBannerProps = {
  data: LgsOfficialBannerData
  className?: string
  thumbnail?: boolean
  ariaLabel?: string
}

/** Referans oran — 925 × 272 */
export const LGS_OFFICIAL_BANNER_VIEW_W = 925
export const LGS_OFFICIAL_BANNER_VIEW_H = 272

export const LGS_OFFICIAL_GREEN = '#39B54A'
/** Kitapçık türü arka planı (referans görselden) — vurgu rengi */
export const LGS_OFFICIAL_GREEN_SOFT = '#E4F0D4'
/** Banner yazı rengi — siyah */
export const LGS_OFFICIAL_TEXT = '#000000'
export const LGS_OFFICIAL_YEAR_DEFAULT = '2026 - 2027 EĞİTİM - ÖĞRETİM YILI'
export const LGS_OFFICIAL_TITLE_DEFAULT =
  'SINAVLA ÖĞRENCİ ALACAK ORTAÖĞRETİM KURUMLARINA İLİŞKİN MERKEZİ SINAV'
export const LGS_OFFICIAL_SUBJECT_DEFAULT = 'MATEMATİK'
/** Yönerge yazı boyutu (viewBox / pt) */
export const LGS_OFFICIAL_INSTRUCTION_FONT_PT = 15

/** Eğitim yılı — olduğu gibi; ek metin eklenmez */
export function formatLgsOfficialYearLabel(raw: string | undefined | null): string {
  const y = (raw || '').trim()
  return y || LGS_OFFICIAL_YEAR_DEFAULT
}
