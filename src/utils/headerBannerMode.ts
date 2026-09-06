import type { HeaderConfig } from './corporateHeaderLayout'

/** true → yaprak TestBanner (eski sistem), false → klasik canvas başlık */
export function usesYaprakTestBanner(
  config?: Pick<HeaderConfig, 'useYaprakBanner' | 'useExamBanner'> | null,
): boolean {
  return config?.useYaprakBanner === true && config?.useExamBanner !== true
}

/** true → yeni ExamBanner (9 şablon) */
export function usesExamBanner(
  config?: Pick<HeaderConfig, 'useExamBanner'> | null,
): boolean {
  return config?.useExamBanner === true
}

/** HTML/SVG banner overlay — yaprak veya exam */
export function usesHtmlBannerOverlay(
  config?: Pick<HeaderConfig, 'useYaprakBanner' | 'useExamBanner'> | null,
): boolean {
  return usesExamBanner(config) || usesYaprakTestBanner(config)
}
