import { describe, it, expect } from 'vitest'
import {
  optionKey,
  parseOptionKey,
  spanDays,
  isValidOption,
  sortOptions,
  expandDays,
  normalizeNote,
  MAX_SPAN_DAYS,
} from '@/domain/value-objects/DayOption'

const day = (d: string) => ({ start: d, end: d, note: null })

describe('DayOption', () => {
  it('builds and parses a key', () => {
    expect(optionKey({ start: '2026-06-05', end: '2026-06-07', note: null })).toBe(
      '2026-06-05..2026-06-07',
    )
    expect(parseOptionKey('2026-06-05..2026-06-07')).toEqual({
      start: '2026-06-05',
      end: '2026-06-07',
      note: null,
    })
    expect(parseOptionKey('nope')).toBeNull()
    expect(parseOptionKey('2026-06-05..nope')).toBeNull()
    expect(parseOptionKey('nope..2026-06-05')).toBeNull()
  })

  it('spans a DST boundary without losing or gaining a day', () => {
    // Europe/Madrid jumped to summer time on 2026-03-29
    expect(spanDays({ start: '2026-03-28', end: '2026-03-30', note: null })).toBe(3)
    expect(expandDays({ start: '2026-03-28', end: '2026-03-30', note: null })).toEqual([
      '2026-03-28',
      '2026-03-29',
      '2026-03-30',
    ])
  })

  it('rejects invalid options', () => {
    expect(isValidOption(day('2026-06-05'))).toBe(true)
    expect(isValidOption({ start: '2026-06-07', end: '2026-06-05', note: null })).toBe(false)
    expect(isValidOption({ start: 'junio', end: '2026-06-05', note: null })).toBe(false)
    expect(isValidOption({ start: '2026-06-01', end: '2026-07-02', note: null })).toBe(false)
    expect(spanDays({ start: '2026-06-01', end: '2026-07-01', note: null })).toBe(MAX_SPAN_DAYS)
    expect(isValidOption({ start: '2026-06-01', end: '2026-07-01', note: null })).toBe(true)
    expect(isValidOption({ start: '2026-06-01', end: '2026-06-01', note: 'x'.repeat(80) })).toBe(
      true,
    )
    expect(isValidOption({ start: '2026-06-01', end: '2026-06-01', note: 5 as never })).toBe(false)
  })

  it.each([['2026-02-29', '2026-03-10']])(
    'rejects %s, a date the calendar does not have',
    (iso, later) => {
      expect(isValidOption(day(iso))).toBe(false)
      expect(isValidOption({ start: '2026-06-01', end: iso, note: null })).toBe(false)
      expect(isValidOption({ start: iso, end: later, note: null })).toBe(false)
    },
  )

  it('sorts by start then end', () => {
    expect(
      sortOptions([
        { start: '2026-06-05', end: '2026-06-07', note: null },
        day('2026-06-05'),
        { start: '2026-06-08', end: '2026-06-08', note: null },
        { start: '2026-06-01', end: '2026-06-30', note: null },
      ]),
    ).toEqual([
      { start: '2026-06-01', end: '2026-06-30', note: null },
      day('2026-06-05'),
      { start: '2026-06-05', end: '2026-06-07', note: null },
      day('2026-06-08'),
    ])
  })

  it('the note is not part of the identity', () => {
    expect(optionKey({ start: '2026-06-05', end: '2026-06-05', note: 'puente' })).toBe(
      optionKey(day('2026-06-05')),
    )
    expect(isValidOption({ start: '2026-06-05', end: '2026-06-05', note: 'x'.repeat(81) })).toBe(
      false,
    )
  })

  it('normalizes notes', () => {
    expect(normalizeNote('  puente de la Almudena  ')).toBe('puente de la Almudena')
    expect(normalizeNote('   ')).toBeNull()
    expect(normalizeNote(undefined)).toBeNull()
    expect(normalizeNote('x'.repeat(200))).toHaveLength(80)
  })
})
