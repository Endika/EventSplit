import { useCallback, useEffect, useState } from 'react'

export type ThemePref = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'eventsplit:theme'
const THEME_COLOR = { light: '#fff8f5', dark: '#15110e' }

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
}

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
  } catch {
    return 'system'
  }
}

function resolveDark(pref: ThemePref): boolean {
  return pref === 'dark' || (pref === 'system' && systemPrefersDark())
}

/** Applies the resolved theme to <html> and the theme-color meta. */
function apply(pref: ThemePref): void {
  if (typeof document === 'undefined') return
  const dark = resolveDark(pref)
  document.documentElement.classList.toggle('dark', dark)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? THEME_COLOR.dark : THEME_COLOR.light)
}

export function useTheme(): {
  pref: ThemePref
  isDark: boolean
  setPref: (p: ThemePref) => void
  toggle: () => void
} {
  const [pref, setPrefState] = useState<ThemePref>(readPref)

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p)
    try {
      localStorage.setItem(STORAGE_KEY, p)
    } catch {
      /* ignore */
    }
    apply(p)
  }, [])

  // Follow live system changes while on 'system'.
  useEffect(() => {
    if (pref !== 'system' || typeof window === 'undefined') return
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const onChange = () => apply('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [pref])

  // Cycle light → dark → system.
  const toggle = useCallback(() => {
    setPref(pref === 'light' ? 'dark' : pref === 'dark' ? 'system' : 'light')
  }, [pref, setPref])

  return { pref, isDark: resolveDark(pref), setPref, toggle }
}
