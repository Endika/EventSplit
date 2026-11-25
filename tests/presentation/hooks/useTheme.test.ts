import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useTheme, type ThemePref } from '@/presentation/hooks/useTheme'

const KEY = 'eventsplit:theme'

function stubSystemTheme(dark: boolean) {
  const mq = {
    matches: dark,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
  vi.stubGlobal('matchMedia', (query: string) =>
    query === '(prefers-color-scheme: dark)' ? mq : undefined,
  )
  return mq
}

const meta = () => document.querySelector('meta[name="theme-color"]')!.getAttribute('content')
const isDarkPage = () => document.documentElement.classList.contains('dark')

beforeEach(() => {
  localStorage.clear()
  document.head.innerHTML = '<meta name="theme-color" content="">'
  document.documentElement.className = ''
})
afterEach(() => vi.unstubAllGlobals())

describe('useTheme', () => {
  it.each([
    ['light', 'light'],
    ['dark', 'dark'],
    ['system', 'system'],
    ['sepia', 'system'],
    [null, 'system'],
  ])('starts from the stored preference %s as %s', (stored, expected) => {
    if (stored) localStorage.setItem(KEY, stored)
    expect(renderHook(() => useTheme()).result.current.pref).toBe(expected)
  })

  it('starts on system when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(renderHook(() => useTheme()).result.current.pref).toBe('system')
    vi.restoreAllMocks()
  })

  it.each([
    ['light', true, false, '#f2efe6'],
    ['dark', false, true, '#131210'],
    ['system', true, true, '#131210'],
    ['system', false, false, '#f2efe6'],
  ] as [ThemePref, boolean, boolean, string][])(
    'setting %s with a dark system=%s stores it and paints dark=%s',
    (pref, systemDark, dark, color) => {
      stubSystemTheme(systemDark)
      const { result } = renderHook(() => useTheme())
      act(() => result.current.setPref(pref))
      expect(result.current).toMatchObject({ pref, isDark: dark })
      expect(localStorage.getItem(KEY)).toBe(pref)
      expect(isDarkPage()).toBe(dark)
      expect(meta()).toBe(color)
    },
  )

  it('is light on a system that cannot tell its theme', () => {
    expect(renderHook(() => useTheme()).result.current.isDark).toBe(false)
  })

  it('still applies the theme when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    document.head.innerHTML = ''
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setPref('dark'))
    expect(result.current.pref).toBe('dark')
    expect(isDarkPage()).toBe(true)
    vi.restoreAllMocks()
  })

  it('cycles light, dark, system, light', () => {
    localStorage.setItem(KEY, 'light')
    const { result } = renderHook(() => useTheme())
    const seen = [1, 2, 3].map(() => {
      act(() => result.current.toggle())
      return result.current.pref
    })
    expect(seen).toEqual(['dark', 'system', 'light'])
  })

  it('follows live system changes while on system, until unmounted', () => {
    const mq = stubSystemTheme(false)
    const { unmount } = renderHook(() => useTheme())
    const onChange = mq.addEventListener.mock.calls[0]![1] as () => void
    expect(mq.addEventListener).toHaveBeenCalledWith('change', onChange)
    mq.matches = true
    onChange()
    expect(isDarkPage()).toBe(true)
    unmount()
    expect(mq.removeEventListener).toHaveBeenCalledWith('change', onChange)
  })

  it('listens to the system only while on system', () => {
    localStorage.setItem(KEY, 'light')
    const mq = stubSystemTheme(false)
    const { result } = renderHook(() => useTheme())
    expect(mq.addEventListener).not.toHaveBeenCalled()
    act(() => result.current.setPref('system'))
    expect(mq.addEventListener).toHaveBeenCalledOnce()
    act(() => result.current.setPref('light'))
    expect(mq.removeEventListener).toHaveBeenCalledOnce()
  })
})
