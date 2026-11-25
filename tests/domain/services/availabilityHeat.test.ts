import { describe, it, expect } from 'vitest'
import { heatLevel, votesPerOption } from '@/domain/services/availabilityHeat'
import type { DayOption } from '@/domain/value-objects/DayOption'

const day = (d: string): DayOption => ({ start: d, end: d, note: null })

describe('heatLevel', () => {
  it('spreads the middle over three steps', () => {
    expect(heatLevel(1, 8)).toBe(1)
    expect(heatLevel(3, 8)).toBe(2)
    expect(heatLevel(5, 8)).toBe(2)
    expect(heatLevel(6, 8)).toBe(3)
    expect(heatLevel(7, 8)).toBe(3)
    expect([heatLevel(33, 100), heatLevel(34, 100)]).toEqual([1, 2])
    expect([heatLevel(66, 100), heatLevel(67, 100)]).toEqual([2, 3])
  })

  it('never divides by zero', () => {
    expect(heatLevel(0, 0)).toBe(0)
    expect(heatLevel(2, 0)).toBe(0)
  })
})

describe('votesPerOption', () => {
  it('counts votes per option for the given users only', () => {
    const options = [day('2026-06-05'), day('2026-06-06')]
    const votes = { u1: [true, false], u2: [true, true], child: [true, true] }
    expect(votesPerOption(options, votes, ['u1', 'u2'])).toEqual([2, 1])
  })
})
