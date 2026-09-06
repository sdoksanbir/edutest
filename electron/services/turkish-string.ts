/** Türkçe büyük/küçük harf — i→İ, ı→I, ş→Ş vb. */
export function toTurkishUpperCase(value: string): string {
  return value.toLocaleUpperCase('tr-TR')
}

export function toTurkishLowerCase(value: string): string {
  return value.toLocaleLowerCase('tr-TR')
}

/** Her kelimenin ilk harfi büyük (Türkçe) */
export function toTurkishTitleCase(value: string): string {
  return String(value ?? '').replace(/[^\s]+/g, (word) => {
    const lower = toTurkishLowerCase(word)
    if (!lower) return word
    return toTurkishUpperCase(lower.charAt(0)) + lower.slice(1)
  })
}
