import { describe, it, expect } from 'vitest'
import { toStoredSplit } from '@/domain/services/splitScope'

describe('toStoredSplit', () => {
  it('collapses a full selection to "everyone"', () => {
    expect(toStoredSplit(new Set(['u1', 'u2']), ['u1', 'u2'])).toEqual([])
  })

  it('keeps a partial selection as an explicit list', () => {
    expect(toStoredSplit(new Set(['u1']), ['u1', 'u2'])).toEqual(['u1'])
  })

  it('still says "everyone" when the event has a dog', () => {
    // The dog is not a payer, so it never reaches the selection. Comparing
    // against the guest list instead would return ['u1','u2'] here and quietly
    // stop later arrivals from joining the expense.
    expect(toStoredSplit(new Set(['u1', 'u2']), ['u1', 'u2'])).toEqual([])
  })

  it('treats an empty event as "everyone"', () => {
    expect(toStoredSplit(new Set(), [])).toEqual([])
  })
})
