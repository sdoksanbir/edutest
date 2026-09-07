/** Deneme modülü — varsayılan yönerge (1 sütun, her madde ayrı satır) */
export const DEFAULT_TRIAL_YONERGE_TEXT = [
  "<p>1. Bu testte 40 soru vardır.</p>",
  "<p>2. Cevaplarınızı, cevap kâğıdının Temel Matematik Testi için ayrılan kısmına işaretleyiniz.</p>",
].join("")

/** LGS resmi şablon — görseldeki tek sütun yönerge (ÖSYM’den bağımsız) */
export function defaultLgsYonergeHtml(questionCount = 20): string {
  const q = Math.max(1, Math.round(questionCount))
  return [
    `<p>1. Bu testte ${q} soru vardır.</p>`,
    `<p>2. Cevaplarınızı, cevap kâğıdına işaretleyiniz.</p>`,
  ].join("")
}

export function lgsOfficialDefaultInstructionLines(questionCount = 20): [string, string] {
  const q = Math.max(1, Math.round(questionCount))
  return [
    `1. Bu testte ${q} soru vardır.`,
    "2. Cevaplarınızı, cevap kâğıdına işaretleyiniz.",
  ]
}

/** HTML / düz metin yönergeden satırları çıkar (banner kutusu için) */
export function parseDescriptionInstructionLines(
  texts: string[] | undefined | null,
  fallback: [string, string],
): [string, string] {
  const plain = (texts ?? [])
    .flatMap((t) =>
      String(t ?? "")
        .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .split(/\n+/),
    )
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
  return [plain[0] || fallback[0], plain[1] || fallback[1]]
}

/** Orta kutu min genişlik referansı — "MATEMATİK TESTİ" */
export const TRIAL_TEST_NAME_MIN_SAMPLE = "MATEMATİK TESTİ"

export function isBlankDescriptionTexts(texts: string[] | undefined | null): boolean {
  if (!texts || texts.length === 0) return true
  return texts.every((t) => !(t || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
}
