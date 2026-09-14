/** Yazılı kağıt — sol panel / başlık önizleme ayarları */

export type WrittenStudentFieldKey =
  | "ad_soyad"
  | "sinif"
  | "numara"
  | "notu"
  | "veli_imza";

export const WRITTEN_STUDENT_FIELD_OPTIONS: {
  key: WrittenStudentFieldKey;
  label: string;
}[] = [
  { key: "ad_soyad", label: "Adı Soyadı" },
  { key: "sinif", label: "Sınıfı" },
  { key: "numara", label: "Numarası" },
  { key: "notu", label: "Notu" },
  { key: "veli_imza", label: "Veli İmzası" },
];

export type WrittenBookletLetter = "A" | "B" | "C" | "D";

export type WrittenPaperUiSettings = {
  academicYear: string;
  examTitle: string;
  examDate: string;
  showFrame: boolean;
  showScoreBox: boolean;
  showExamDate: boolean;
  showBaremTable: boolean;
  /** Varsayılan kapalı — öğretmen yüklerse açılır */
  showLogo: boolean;
  logoDataUrl: string | null;
  studentFields: Record<WrittenStudentFieldKey, boolean>;
  bookletEnabled: boolean;
  bookletCount: 2 | 3 | 4;
  /** Seçili kitapçık harfi (A–D; sayıya göre sınırlı) */
  bookletLetter: WrittenBookletLetter;
  showExamDuration: boolean;
  /** Örn. "40 dk" — showExamDuration açıkken */
  examDuration: string;
  showSignatureBlock: boolean;
  showWishText: boolean;
  /** Başlık çerçevesi rengi */
  accentColor: string;
};

export function bookletLettersForCount(count: 2 | 3 | 4): WrittenBookletLetter[] {
  if (count === 2) return ["A", "B"];
  if (count === 3) return ["A", "B", "C"];
  return ["A", "B", "C", "D"];
}

export function clampBookletLetter(
  letter: string | undefined,
  count: 2 | 3 | 4,
): WrittenBookletLetter {
  const allowed = bookletLettersForCount(count);
  const up = String(letter || "A").toUpperCase() as WrittenBookletLetter;
  return allowed.includes(up) ? up : "A";
}

export function defaultWrittenPaperUi(): WrittenPaperUiSettings {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return {
    academicYear: `${yyyy}-${yyyy + 1}`,
    examTitle: "",
    examDate: `${dd}/${mm}/${yyyy}`,
    showFrame: true,
    showScoreBox: true,
    showExamDate: true,
    showBaremTable: true,
    showLogo: false,
    logoDataUrl: null,
    studentFields: {
      ad_soyad: true,
      sinif: true,
      numara: true,
      notu: false,
      veli_imza: false,
    },
    bookletEnabled: true,
    bookletCount: 2,
    bookletLetter: "A",
    showExamDuration: false,
    examDuration: "40 dk",
    showSignatureBlock: false,
    showWishText: false,
    accentColor: "#0D9488",
  };
}
