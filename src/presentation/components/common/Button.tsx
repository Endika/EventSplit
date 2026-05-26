import type { ButtonHTMLAttributes } from 'react'

export function Button({
  variant = 'primary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }) {
  const base = 'rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:opacity-50'
  const styles =
    variant === 'primary'
      ? 'bg-gradient-to-br from-violet-500 to-teal-400 text-white hover:from-violet-400 hover:to-teal-300 shadow-lg shadow-violet-900/30'
      : 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700'
  return <button className={`${base} ${styles} ${className}`} {...rest} />
}
