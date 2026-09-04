/** Grup seçimine göre kitapçık harfi (PDF ile aynı). Grup Yok → boş (ortada harf çizilmez). */
export function bookletLetterFromGroup(group: string): string {
  const grp = (group || "").trim();
  if (!grp || grp === "Grup Yok") return "";
  if (grp.includes("Grup B") || grp.includes("B)")) return "B";
  if (grp.includes("Grup C") || grp.includes("C)")) return "C";
  if (grp.includes("Grup A") || grp.includes("A)")) return "A";
  return "";
}

/** Yazılı kağıdı PDF başlık metni — WrittenPaperForm / PdfPreviewModal ile aynı kural */
export function buildWrittenPaperTitle(params: {
  schoolName: string;
  classSection: string;
  testName: string;
  examType: string;
}): string {
  const y = new Date().getFullYear();
  const parts = [`${y} - ${y + 1} EĞİTİM - ÖĞRETİM YILI`];
  if (params.schoolName?.trim()) parts.push(params.schoolName.trim().toUpperCase());
  if (params.classSection?.trim()) parts.push(`${params.classSection.trim()} SINIF`);
  if (params.testName?.trim()) parts.push(`${params.testName.trim()} DERSİ`);
  if (params.examType?.trim()) parts.push(params.examType.trim().toUpperCase());
  parts.push("SORULARI");
  return parts.join(" ");
}
