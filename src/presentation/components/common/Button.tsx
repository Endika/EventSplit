import type { ButtonHTMLAttributes } from 'react'

export function Button({
  variant = 'primary',
  loading = false,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary'; loading?: boolean }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:opacity-50'
  const styles =
    variant === 'primary'
      ? 'bg-gradient-to-br from-violet-500 to-teal-400 text-white hover:from-violet-400 hover:to-teal-300 shadow-lg shadow-violet-900/30'
      : 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700'
  return (
    <button className={`${base} ${styles} ${className}`} disabled={disabled || loading} {...rest}>
      {loading && (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current"
        />
      )}
      {children}
    </button>
  )
}
