export function cmToMm(cm: number): number {
  return Math.round(cm * 10 * 10) / 10
}
