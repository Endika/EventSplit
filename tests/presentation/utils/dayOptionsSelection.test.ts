import { describe, it, expect } from 'vitest'
import { MAX_OPTIONS } from '@/domain/value-objects/DayOption'
import {
  addVerdict,
  dropFromSelection,
  selectionChanged,
} from '@/presentation/utils/dayOptionsSelection'

const day = (d: string, note: string | null = null) => ({ start: d, end: d, note })
const days = (n: number) =>
  Array.from({ length: n }, (_, i) => day(`2026-07-${String(i + 1).padStart(2, '0')}`))

describe('dayOptionsSelection', () => {
  it.each([
    ['a full selection', days(MAX_OPTIONS), day('2026-07-01'), 'full'],
    ['dates already there', days(2), day('2026-07-02', 'a note'), 'duplicate'],
    ['new dates', days(2), day('2026-07-03'), 'ok'],
  ])('adding to %s is %s', (_, selection, option, verdict) => {
    expect(addVerdict(selection, option)).toBe(verdict)
  })

  it('drops by dates and leaves the rest', () => {
    const selection = days(3)
    expect(dropFromSelection(selection, day('2026-07-02', 'x'))).toEqual([
      selection[0],
      selection[2],
    ])
    expect(selection).toHaveLength(3)
  })

  it.each([
    ['the same days', days(2), days(2), false],
    ['one day less', days(1), days(2), true],
    ['another date', [day('2026-07-01'), day('2026-07-09')], days(2), true],
  ])('%s: changed is %s', (_, selection, saved, expected) => {
    expect(selectionChanged(selection, saved)).toBe(expected)
  })
})
