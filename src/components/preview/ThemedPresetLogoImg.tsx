import { useEffect, useState } from 'react'
import {
  isRecolorablePresetLogo,
  recolorPresetLogoFromUrl,
} from '../../utils/presetLogoRecolor'

type Props = {
  url: string
  presetId: string
  primaryColor: string
  accentColor: string
  alt: string
  className?: string
}

/** Hazır logo küçük resmi — tema renklerine göre boyanmış */
export default function ThemedPresetLogoImg({
  url,
  presetId,
  primaryColor,
  accentColor,
  alt,
  className,
}: Props) {
  const [src, setSrc] = useState(url)

  useEffect(() => {
    if (!isRecolorablePresetLogo(presetId)) {
      setSrc(url)
      return
    }
    let cancelled = false
    void recolorPresetLogoFromUrl(url, presetId, primaryColor, accentColor)
      .then((themed) => {
        if (!cancelled) setSrc(themed)
      })
      .catch(() => {
        if (!cancelled) setSrc(url)
      })
    return () => {
      cancelled = true
    }
  }, [url, presetId, primaryColor, accentColor])

  return <img src={src} alt={alt} className={className} />
}
