import type { ButtonHTMLAttributes } from 'react'

export function Button({
  variant = 'primary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }) {
  const base = 'rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50'
  const styles =
    variant === 'primary'
      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
  return <button className={`${base} ${styles} ${className}`} {...rest} />
}
