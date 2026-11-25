import { describe, it, expect } from 'vitest'
import { formatOptionLabel } from '@/presentation/utils/formatOptionLabel'

const label = (start: string, end: string) => formatOptionLabel({ start, end, note: null }, 'es')

describe('formatOptionLabel', () => {
  it.each([
    ['a single day with its weekday', '2026-06-05', '2026-06-05', 'vie, 5 jun'],
    ['a same-month range collapsed', '2026-06-12', '2026-06-14', '12–14 jun'],
    ['both months when the range crosses one', '2026-06-30', '2026-07-02', '30 jun – 2 jul'],
    [
      'both months when it lands on the same month a year on',
      '2026-12-05',
      '2027-12-08',
      '5 dic – 8 dic',
    ],
  ])('writes %s', (_, start, end, expected) => {
    expect(label(start, end)).toBe(expected)
  })

  it.each([['x', '2026-06-05']])(
    'falls back to the raw key when %s..%s is not parseable',
    (start, end) => {
      expect(label(start, end)).toBe(`${start}..${end}`)
    },
  )
})
