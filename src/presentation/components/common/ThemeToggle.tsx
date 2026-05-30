import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme, type ThemePref } from '@/presentation/hooks/useTheme'

const ICONS: Record<ThemePref, ReactElement> = {
  light: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
      <circle cx="12" cy="12" r="4" />
      <path
        strokeLinecap="round"
        d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41"
      />
    </svg>
  ),
  dark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
      />
    </svg>
  ),
  system: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path strokeLinecap="round" d="M8 20h8m-4-4v4" />
    </svg>
  ),
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const { pref, toggle } = useTheme()

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t('theme.switch', { mode: t(`theme.${pref}`) })}
      title={t('theme.switch', { mode: t(`theme.${pref}`) })}
      className={`inline-flex size-10 items-center justify-center rounded-xl border border-border bg-surface text-ink transition hover:bg-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${className}`}
    >
      {ICONS[pref]}
    </button>
  )
}
