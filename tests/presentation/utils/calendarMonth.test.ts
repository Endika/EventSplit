import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  bandPosition,
  initialMonth,
  longDate,
  monthDays,
  monthOf,
  monthTitle,
  optionsCovering,
  shiftMonth,
  todayIso,
  weekdayNames,
} from '@/presentation/utils/calendarMonth'

const day = (start: string, end = start) => ({ start, end, note: null })

describe('monthDays', () => {
  it('lays out June 2026 starting on Monday with 6 weeks of cells', () => {
    const days = monthDays('2026-06')
    expect(days).toHaveLength(42)
    expect(days[0]).toBe('2026-06-01') // 1 June 2026 is a Monday
  })

  it('pads a month that does not start on Monday with the previous days', () => {
    // 1 July 2026 is a Wednesday, so two June cells come first
    expect(monthDays('2026-07').slice(0, 3)).toEqual(['2026-06-29', '2026-06-30', '2026-07-01'])
  })

  it('stays on 42 consecutive days across a DST change', () => {
    const days = monthDays('2026-03')
    expect(days).toHaveLength(42)
    expect(new Set(days).size).toBe(42)
    expect(days).toContain('2026-03-29')
  })
})

describe('shiftMonth and monthOf', () => {
  it('shifts across a year boundary', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
  })

  it('reads the month of an ISO day', () => {
    expect(monthOf('2026-06-05')).toBe('2026-06')
  })
})

describe('calendarMonth', () => {
  afterEach(() => vi.useRealTimers())

  it('names today with zero-padded parts', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 5, 10))
    expect(todayIso()).toBe('2026-01-05')
    expect(initialMonth([])).toBe('2026-01')
  })

  it('names the weekdays Monday first and the month in the locale', () => {
    expect(weekdayNames('en')).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
    expect(monthTitle('2026-06', 'en')).toBe('June 2026')
    expect(longDate('2026-06-05', 'en')).toBe('June 5, 2026')
  })

  it.each([
    [undefined, '2026-06-05', 'none'],
    [day('2026-06-05'), '2026-06-05', 'single'],
    [day('2026-06-05', '2026-06-07'), '2026-06-05', 'start'],
    [day('2026-06-05', '2026-06-07'), '2026-06-06', 'middle'],
    [day('2026-06-05', '2026-06-07'), '2026-06-07', 'end'],
  ])('a day inside %j at %s is %s', (option, iso, expected) => {
    expect(bandPosition(option, iso)).toBe(expected)
  })

  it('finds the options passing through a day, ends included', () => {
    const options = [day('2026-06-01', '2026-06-03'), day('2026-06-03'), day('2026-06-04')]
    expect(optionsCovering(options, '2026-06-03')).toEqual([options[0], options[1]])
    expect(optionsCovering(options, '2026-06-05')).toEqual([])
  })
})
