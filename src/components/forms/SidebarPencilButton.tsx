type Props = {
  onClick: () => void;
  /** Ekran okuyucu + tooltip */
  label?: string;
};

/** Sol panel satır sonu: metin yerine kompakt kalem — etiketlere yer açar */
export default function SidebarPencilButton({ onClick, label = "Düzenle" }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="tq-sidebar-pencil-btn"
    >
      <svg
        className="tq-sidebar-pencil-btn__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    </button>
  );
}
