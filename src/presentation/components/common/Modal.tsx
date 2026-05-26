import type { ReactNode } from 'react'

export function Modal({
  open,
  title,
  children,
  dismissable = true,
  onClose,
}: {
  open: boolean
  title: string
  children: ReactNode
  dismissable?: boolean
  onClose?: () => void
}) {
  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={dismissable ? onClose : undefined}
    >
      <div
        className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-slate-900 p-6 shadow-xl ring-1 ring-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title" className="mb-4 text-lg font-semibold text-slate-100">{title}</h2>
        {children}
      </div>
    </div>
  )
}
