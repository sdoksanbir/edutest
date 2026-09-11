/**
 * Fasikül çerçeve: soru görselindeki kağıt beyazını şeffaf / dolgu rengine çevirir
 * (Electron nativeImage — ana süreç).
 *
 * PDF’de alpha bazen güvenilir olmadığı için varsayılan strateji:
 * yakın-beyaz pikselleri çerçeve fill rengine boyamak.
 */
import { nativeImage } from 'electron'

function stripDataUrl(b64: string): string {
  const m = /^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/.exec(b64)
  return m ? m[1]! : b64
}

function parseHexRgb(hex: string | undefined): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? '').trim())
  if (!m) return null
  const n = parseInt(m[1]!, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

/** BGRA bitmap satır padding’ini kaldırır (createFromBitmap sıkı paket ister). */
function packBitmapTight(bitmap: Buffer, width: number, height: number): Buffer {
  const stride = Math.floor(bitmap.length / height)
  const rowBytes = width * 4
  if (stride === rowBytes) return bitmap
  const packed = Buffer.alloc(rowBytes * height)
  for (let y = 0; y < height; y++) {
    bitmap.copy(packed, y * rowBytes, y * stride, y * stride + rowBytes)
  }
  return packed
}

/**
 * Yakın-beyaz pikselleri fill rengine boyar (veya alpha=0).
 * PNG base64 döner; başarısız olursa orijinal.
 */
export function knockoutNearWhiteImageBase64(
  imageBase64: string,
  opts?: { threshold?: number; fillHex?: string },
): string {
  try {
    const raw = stripDataUrl(imageBase64)
    const img = nativeImage.createFromBuffer(Buffer.from(raw, 'base64'))
    if (img.isEmpty()) return imageBase64
    const { width, height } = img.getSize()
    if (!(width > 0) || !(height > 0)) return imageBase64

    const thr = Math.max(200, Math.min(255, opts?.threshold ?? 242))
    const soft = Math.max(0, thr - 22)
    const fill = parseHexRgb(opts?.fillHex)

    const bitmap = packBitmapTight(Buffer.from(img.toBitmap()), width, height)
    const rowBytes = width * 4

    for (let y = 0; y < height; y++) {
      const row = y * rowBytes
      for (let x = 0; x < width; x++) {
        const i = row + x * 4
        // Electron bitmap: BGRA
        const b = bitmap[i]!
        const g = bitmap[i + 1]!
        const r = bitmap[i + 2]!
        const minC = Math.min(r, g, b)
        const maxC = Math.max(r, g, b)
        // Griye yakın kağıt (renkli dolguları / turuncuyu koru)
        const isPaperish = maxC - minC <= 18 && minC >= soft
        if (!isPaperish) continue

        if (fill) {
          if (minC >= thr) {
            bitmap[i] = fill.b
            bitmap[i + 1] = fill.g
            bitmap[i + 2] = fill.r
            bitmap[i + 3] = 255
          } else {
            const t = (thr - minC) / Math.max(1, thr - soft)
            // t=1 → orijinal, t=0 → fill; soft bölgede fill’e karıştır
            const k = 1 - t
            bitmap[i] = Math.round(b * t + fill.b * k)
            bitmap[i + 1] = Math.round(g * t + fill.g * k)
            bitmap[i + 2] = Math.round(r * t + fill.r * k)
            bitmap[i + 3] = 255
          }
        } else if (minC >= thr) {
          bitmap[i + 3] = 0
        } else {
          const t = (thr - minC) / Math.max(1, thr - soft)
          bitmap[i + 3] = Math.round(bitmap[i + 3]! * t)
        }
      }
    }

    const out = nativeImage.createFromBitmap(bitmap, { width, height })
    if (out.isEmpty()) return imageBase64
    return out.toPNG().toString('base64')
  } catch {
    return imageBase64
  }
}
