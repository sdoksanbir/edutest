/** Türkçe büyük/küçük harf — i→İ, ı→I, ş→Ş vb. */
export function toTurkishUpperCase(value: string): string {
  return value.toLocaleUpperCase("tr-TR");
}

export function toTurkishLowerCase(value: string): string {
  return value.toLocaleLowerCase("tr-TR");
}
