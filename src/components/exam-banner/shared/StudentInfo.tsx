type Props = {
  show?: boolean
}

/** Opsiyonel öğrenci bilgi alanı — placeholder satırlar */
export default function StudentInfo({ show }: Props) {
  if (!show) return null
  return (
    <div className="exam-banner__student-info">
      <span>Ad Soyad</span>
      <span>Sınıf</span>
      <span>No</span>
      <span>Tarih</span>
    </div>
  )
}
