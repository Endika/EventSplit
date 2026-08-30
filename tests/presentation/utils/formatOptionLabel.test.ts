import { describe, it, expect } from 'vitest'
import { formatOptionLabel } from '@/presentation/utils/formatOptionLabel'

describe('formatOptionLabel', () => {
  it('formats a single day with its weekday', () => {
    const label = formatOptionLabel({ start: '2026-06-05', end: '2026-06-05', note: null }, 'es')
    expect(label).toMatch(/5/)
    expect(label).toMatch(/jun/i)
  })

  it('collapses a same-month range', () => {
    expect(formatOptionLabel({ start: '2026-06-12', end: '2026-06-14', note: null }, 'es')).toMatch(
      /^12.14 jun/,
    )
  })

  it('spells both months when the range crosses one', () => {
    const label = formatOptionLabel({ start: '2026-06-30', end: '2026-07-02', note: null }, 'es')
    expect(label).toMatch(/30 jun/i)
    expect(label).toMatch(/2 jul/i)
  })

  it('falls back to the raw key when the dates are not parseable', () => {
    expect(formatOptionLabel({ start: 'x', end: 'x', note: null }, 'es')).toBe('x..x')
  })
})
