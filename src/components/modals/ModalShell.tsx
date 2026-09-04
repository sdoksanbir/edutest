import type { ReactNode } from 'react'

interface ModalShellProps {
  title: string
  onClose: () => void
  children: ReactNode
  dark?: boolean
  wide?: boolean
  elevated?: boolean
}

export default function ModalShell({
  title,
  onClose,
  children,
  dark = false,
  wide = false,
  elevated = false,
}: ModalShellProps) {
  return (
    <div
      className={`fixed inset-0 ${elevated ? "z-[70]" : "z-50"} flex items-center justify-center p-4 ${
        dark ? 'bg-black/60' : 'bg-slate-900/50'
      }`}
      onClick={onClose}
    >
      <div
        className={`max-h-[90vh] overflow-y-auto shadow-2xl ${
          wide ? 'max-w-4xl' : 'max-w-lg'
        } w-full rounded-xl p-5 ${
          dark ? 'bg-slate-800 text-slate-100' : 'bg-white text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2
            className={`text-base font-semibold ${
              dark ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            Kapat
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
