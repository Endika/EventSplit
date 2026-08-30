import type { InputHTMLAttributes, Ref } from 'react'

/** React 19 passes `ref` as a plain prop, so no forwardRef needed — just the type. */
export function Input({
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return (
    <input
      className={`w-full rounded-xl border border-border bg-surface px-3 py-2 text-base text-ink placeholder-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand sm:text-sm ${className}`}
      {...rest}
    />
  )
}
