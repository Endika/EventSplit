import { describe, it, expect, vi, afterEach } from 'vitest'
import { formatRelative } from '@/presentation/utils/formatRelative'

const NOW = new Date('2026-06-10T12:00:00Z')
const ago = (seconds: number) => new Date(NOW.getTime() - seconds * 1000).toISOString()

describe('formatRelative', () => {
  afterEach(() => vi.useRealTimers())

  it.each([
    [0, 'now'],
    [30, '30 seconds ago'],
    [60, '1 minute ago'],
    [3600, '1 hour ago'],
  ])('%i seconds back reads %s', (seconds, expected) => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    expect(formatRelative(ago(seconds), 'en')).toBe(expected)
  })

  it('switches to a dated stamp after a day, and hands back what it cannot read', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    expect(formatRelative(ago(86400), 'en')).toMatch(/^Jun 9, 2026, \d{1,2}:\d{2}/)
    expect(formatRelative('nonsense', 'en')).toBe('nonsense')
  })

  it('stays relative, in days, for as long as asked, then shows the date alone', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    const week = { relativeFor: 604800, dateFormat: { dateStyle: 'medium' } } as const
    expect(formatRelative(ago(2 * 86400), 'es', week)).toBe('anteayer')
    expect(formatRelative(ago(6 * 86400), 'en', week)).toBe('6 days ago')
    expect(formatRelative(ago(604800), 'en', week)).toBe('Jun 3, 2026')
  })
})
