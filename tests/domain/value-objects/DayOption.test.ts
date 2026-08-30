import { describe, it, expect } from 'vitest'
import {
  optionKey,
  parseOptionKey,
  spanDays,
  isValidOption,
  sortOptions,
  expandDays,
  coversDay,
  optionsCoveringDay,
  makeRange,
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
  })

  it('counts span days inclusively', () => {
    expect(spanDays(day('2026-06-05'))).toBe(1)
    expect(spanDays({ start: '2026-06-05', end: '2026-06-07', note: null })).toBe(3)
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
  })

  it('sorts by start then end', () => {
    expect(
      sortOptions([
        { start: '2026-06-05', end: '2026-06-07', note: null },
        day('2026-06-05'),
        day('2026-06-01'),
      ]),
    ).toEqual([
      day('2026-06-01'),
      day('2026-06-05'),
      { start: '2026-06-05', end: '2026-06-07', note: null },
    ])
  })

  it('knows which options cover a day, overlaps included', () => {
    const os = [
      { start: '2026-06-05', end: '2026-06-07', note: null },
      { start: '2026-06-06', end: '2026-06-06', note: null },
    ]
    expect(coversDay(os[0], '2026-06-06')).toBe(true)
    expect(coversDay(os[1], '2026-06-05')).toBe(false)
    expect(optionsCoveringDay(os, '2026-06-06')).toEqual([0, 1])
    expect(optionsCoveringDay(os, '2026-06-09')).toEqual([])
  })

  it('makeRange orders its ends', () => {
    expect(makeRange('2026-06-09', '2026-06-05')).toEqual({
      start: '2026-06-05',
      end: '2026-06-09',
      note: null,
    })
  })

  it('the note is not part of the identity', () => {
    expect(optionKey({ start: '2026-06-05', end: '2026-06-05', note: 'puente' })).toBe(
      optionKey(day('2026-06-05')),
    )
    expect(
      isValidOption({ start: '2026-06-05', end: '2026-06-05', note: 'x'.repeat(81) }),
    ).toBe(false)
  })

  it('normalizes notes', () => {
    expect(normalizeNote('  puente de la Almudena  ')).toBe('puente de la Almudena')
    expect(normalizeNote('   ')).toBeNull()
    expect(normalizeNote(undefined)).toBeNull()
    expect(normalizeNote('x'.repeat(200))).toHaveLength(80)
  })
})
