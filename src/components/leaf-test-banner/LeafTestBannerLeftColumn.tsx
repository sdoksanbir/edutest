import ThemedPresetLogoImg from '../preview/ThemedPresetLogoImg'
import { isRecolorablePresetLogo } from '../../utils/presetLogoRecolor'
import type { LeafTestBannerData } from './types'

type Props = {
  data: Pick<
    LeafTestBannerData,
    | 'showHeaderLeft'
    | 'headerLeftMode'
    | 'logoUrl'
    | 'presetLogoId'
    | 'logoPrimaryColor'
    | 'logoAccentColor'
    | 'publicationLines'
  >
  thumbnail?: boolean
}

function lineFontPt(pt: number, thumbnail: boolean): string {
  return `${thumbnail ? pt * 0.42 : pt}pt`
}

export default function LeafTestBannerLeftColumn({ data, thumbnail = false }: Props) {
  const showLeft = data.showHeaderLeft !== false

  if (!showLeft) {
    return <div className="ltb-corporate__logo ltb-corporate__logo--hidden" aria-hidden />
  }

  if (data.headerLeftMode === 'publicationText') {
    const lines = data.publicationLines ?? []
    if (lines.length === 0) {
      return <div className="ltb-corporate__logo ltb-corporate__logo--empty" aria-hidden />
    }
    return (
      <div className="ltb-corporate__logo">
        <div className="ltb-corporate__publication">
          {lines.map((line) => (
            <p
              key={line.text}
              className="ltb-corporate__publication-line"
              style={{
                fontSize: lineFontPt(line.fontPt, thumbnail),
                color: line.color,
              }}
            >
              {line.text}
            </p>
          ))}
        </div>
      </div>
    )
  }

  const logoUrl = data.logoUrl?.trim()
  const presetId = data.presetLogoId ?? '5'
  const useThemedLogo =
    !!logoUrl && presetId !== 'custom' && isRecolorablePresetLogo(presetId)

  return (
    <div className="ltb-corporate__logo">
      <div className="ltb-corporate__logo-box">
        {logoUrl ? (
          useThemedLogo ? (
            <ThemedPresetLogoImg
              url={logoUrl}
              presetId={presetId}
              primaryColor={data.logoPrimaryColor ?? '#0A1931'}
              accentColor={data.logoAccentColor ?? '#DC2626'}
              alt="Kurum logosu"
              className="ltb-corporate__logo-img"
            />
          ) : (
            <img src={logoUrl} alt="Kurum logosu" className="ltb-corporate__logo-img" />
          )
        ) : thumbnail ? null : (
          <div className="ltb-corporate__logo-ph" aria-hidden />
        )}
      </div>
    </div>
  )
}
