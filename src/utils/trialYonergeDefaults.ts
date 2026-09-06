/** Deneme modülü — varsayılan yönerge (1 sütun, her madde ayrı satır) */
export const DEFAULT_TRIAL_YONERGE_TEXT = [
  "<p>1. Bu testte 40 soru vardır.</p>",
  "<p>2. Cevaplarınızı, cevap kâğıdının Temel Matematik Testi için ayrılan kısmına işaretleyiniz.</p>",
].join("")

/** Orta kutu min genişlik referansı — "MATEMATİK TESTİ" */
export const TRIAL_TEST_NAME_MIN_SAMPLE = "MATEMATİK TESTİ"

export function isBlankDescriptionTexts(texts: string[] | undefined | null): boolean {
  if (!texts || texts.length === 0) return true
  return texts.every((t) => !(t || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
}
