export type ImageBalanceDiagnostics = {
  meanLuminanceBefore: number
  meanLuminanceAfter: number
  lowPercentile: number
  highPercentile: number
  dynamicRange: number
  gamma: number
  strength: number
}

export type ImageBalanceResult = {
  data: Uint8ClampedArray
  width: number
  height: number
  diagnostics: ImageBalanceDiagnostics
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
const luminance = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b

function histogramPercentile(histogram: Uint32Array, count: number, fraction: number): number {
  const target = Math.max(0, Math.min(count - 1, Math.floor((count - 1) * fraction)))
  let seen = 0
  for (let value = 0; value < histogram.length; value++) {
    seen += histogram[value]!
    if (seen > target) return value
  }
  return 255
}

/**
 * Belge görüntüsüne yalnız tonal mapping uygular.
 * Piksel sayısı, geometri ve alpha kanalı değişmez.
 */
export function balanceDocumentImageRgba(opts: {
  data: Uint8ClampedArray
  width: number
  height: number
}): ImageBalanceResult {
  const { data, width, height } = opts
  const output = new Uint8ClampedArray(data)
  const histogram = new Uint32Array(256)
  let visibleCount = 0
  let luminanceSum = 0

  for (let index = 0; index < width * height; index++) {
    const offset = index * 4
    if (data[offset + 3]! < 32) continue
    const lum = luminance(data[offset]!, data[offset + 1]!, data[offset + 2]!)
    histogram[Math.max(0, Math.min(255, Math.round(lum)))]++
    luminanceSum += lum
    visibleCount++
  }

  const meanBefore = visibleCount > 0 ? luminanceSum / visibleCount : 0
  const low = visibleCount > 0 ? histogramPercentile(histogram, visibleCount, 0.015) : 0
  const high = visibleCount > 0 ? histogramPercentile(histogram, visibleCount, 0.985) : 255
  const dynamicRange = high - low
  const gamma = Math.max(0.8, Math.min(1.25, 1 + (meanBefore - 180) / 300))
  const rangeNeed = clamp01((160 - dynamicRange) / 140)
  const meanNeed = Math.max(
    clamp01((145 - meanBefore) / 100),
    clamp01((meanBefore - 232) / 23),
  )
  const strength =
    visibleCount === 0 || dynamicRange < 12
      ? 0
      : Math.max(0.08, Math.min(0.65, 0.1 + rangeNeed * 0.42 + meanNeed * 0.13))

  let afterSum = 0
  if (strength > 0) {
    for (let index = 0; index < width * height; index++) {
      const offset = index * 4
      const alpha = data[offset + 3]!
      if (alpha < 32) continue
      const red = data[offset]!
      const green = data[offset + 1]!
      const blue = data[offset + 2]!
      const oldLum = luminance(red, green, blue)
      const normalized = clamp01((oldLum - low) / dynamicRange)
      const newLum = Math.pow(normalized, gamma) * 255
      const lumScale = oldLum > 1 ? newLum / oldLum : 0
      const targetRed = oldLum > 1 ? red * lumScale : newLum
      const targetGreen = oldLum > 1 ? green * lumScale : newLum
      const targetBlue = oldLum > 1 ? blue * lumScale : newLum
      output[offset] = Math.round(red * (1 - strength) + targetRed * strength)
      output[offset + 1] = Math.round(green * (1 - strength) + targetGreen * strength)
      output[offset + 2] = Math.round(blue * (1 - strength) + targetBlue * strength)
      output[offset + 3] = alpha
      afterSum += luminance(output[offset]!, output[offset + 1]!, output[offset + 2]!)
    }
  } else {
    afterSum = luminanceSum
  }

  return {
    data: output,
    width,
    height,
    diagnostics: {
      meanLuminanceBefore: meanBefore,
      meanLuminanceAfter: visibleCount > 0 ? afterSum / visibleCount : 0,
      lowPercentile: low,
      highPercentile: high,
      dynamicRange,
      gamma,
      strength,
    },
  }
}
