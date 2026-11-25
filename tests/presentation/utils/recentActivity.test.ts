import { describe, it, expect, vi, afterEach } from 'vitest'
import { formatRecentActivity } from '@/presentation/utils/recentActivity'

const NOW = new Date('2026-06-10T12:00:00Z')

describe('formatRecentActivity', () => {
  afterEach(() => vi.useRealTimers())

  it.each([
    [59.4, 'just now'],
    [59.6, '1m ago'],
    [3600, '1h ago'],
    [86400, '1d ago'],
    [604800, 'Jun 3, 2026'],
  ])('%d seconds back reads %s', (seconds, expected) => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    const iso = new Date(NOW.getTime() - seconds * 1000).toISOString()
    expect(formatRecentActivity(iso, 'en')).toBe(expected)
  })

  it('hands back a date it cannot read', () => {
    expect(formatRecentActivity('nonsense', 'en')).toBe('nonsense')
  })
})
