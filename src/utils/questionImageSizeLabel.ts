export type QuestionPixelSize = { w: number; h: number }

function rawBase64(value: string): string {
  return value.includes(',') ? value.split(',', 2)[1]! : value
}

function getPngSize(buf: Uint8Array): QuestionPixelSize | null {
  if (buf.length < 24) return null
  if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) return null
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  return { w: view.getUint32(16), h: view.getUint32(20) }
}

function getJpegSize(buf: Uint8Array): QuestionPixelSize | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null
  let i = 2
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) {
      i++
      continue
    }
    const marker = buf[i + 1]!
    if (marker === 0xc0 || marker === 0xc2) {
      const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
      return { h: view.getUint16(i + 5), w: view.getUint16(i + 7) }
    }
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
    const len = view.getUint16(i + 2)
    if (len < 2) break
    i += 2 + len
  }
  return null
}

/** Base64 / data-URL PNG-JPEG → piksel boyutu */
export function getImagePixelSizeFromBase64(b64: string | undefined | null): QuestionPixelSize | null {
  if (!b64) return null
  try {
    const raw = rawBase64(b64)
    const bin = atob(raw)
    const buf = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
    return getPngSize(buf) ?? getJpegSize(buf)
  } catch {
    return null
  }
}
