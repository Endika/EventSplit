import { describe, it, expect } from 'vitest'
import { heatLevel, votesPerOption, dayHeat } from '@/domain/services/availabilityHeat'
import type { DayOption } from '@/domain/value-objects/DayOption'

const day = (d: string): DayOption => ({ start: d, end: d, note: null })

describe('heatLevel', () => {
  it('is 0 with no votes and 4 with everyone', () => {
    expect(heatLevel(0, 5)).toBe(0)
    expect(heatLevel(5, 5)).toBe(4)
  })

  it('spreads the middle over three steps', () => {
    expect(heatLevel(1, 8)).toBe(1)
    expect(heatLevel(3, 8)).toBe(2)
    expect(heatLevel(5, 8)).toBe(2)
    expect(heatLevel(6, 8)).toBe(3)
    expect(heatLevel(7, 8)).toBe(3)
  })

  it('never divides by zero', () => {
    expect(heatLevel(0, 0)).toBe(0)
    expect(heatLevel(2, 0)).toBe(0)
  })

  it('a single vote is never level 0 — a voted option always reads warm', () => {
    expect(heatLevel(1, 31)).toBe(1)
  })
})

describe('votesPerOption', () => {
  it('counts votes per option for the given users only', () => {
    const options = [day('2026-06-05'), day('2026-06-06')]
    const votes = { u1: [true, false], u2: [true, true], child: [true, true] }
    expect(votesPerOption(options, votes, ['u1', 'u2'])).toEqual([2, 1])
  })

  it('treats a missing row as no votes', () => {
    expect(votesPerOption([day('2026-06-05')], {}, ['u1'])).toEqual([0])
  })
})

describe('dayHeat with overlapping options', () => {
  const options: DayOption[] = [
    { start: '2026-06-05', end: '2026-06-07', note: null }, // 1 vote
    day('2026-06-06'), // 4 votes
  ]
  const counts = [1, 4]

  it('takes the best option covering the day', () => {
    expect(dayHeat(options, counts, '2026-06-06', 4)).toEqual({
      level: 4,
      votes: 4,
      optionIndexes: [0, 1],
    })
  })

  it('a day in a single option reports that option', () => {
    expect(dayHeat(options, counts, '2026-06-05')).toEqual({
      level: 0,
      votes: 1,
      optionIndexes: [0],
    })
    expect(dayHeat(options, counts, '2026-06-05', 4)?.votes).toBe(1)
    expect(dayHeat(options, counts, '2026-06-05', 4)?.level).toBe(1)
  })

  it('a day in no option is null', () => {
    expect(dayHeat(options, counts, '2026-06-09', 4)).toBeNull()
  })
})
