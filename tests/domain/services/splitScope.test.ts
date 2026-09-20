import { describe, it, expect } from 'vitest'
import { toStoredSplit } from '@/domain/services/splitScope'

describe('toStoredSplit', () => {
  it('collapses a full selection to "everyone"', () => {
    expect(toStoredSplit(new Set(['u1', 'u2']), ['u1', 'u2'])).toEqual([])
  })

  it('keeps a partial selection as an explicit list', () => {
    expect(toStoredSplit(new Set(['u1']), ['u1', 'u2'])).toEqual(['u1'])
  })

  it('can never collapse if the caller passes the guest list instead of the payers', () => {
    // This is the shape of the regression: the selection can only ever hold
    // payers, so a dog in the reference list makes the check unsatisfiable and
    // freezes every split into a literal list — and whoever joins later stops
    // being added to it. The call site must pass payingUsers(...), not users.
    expect(toStoredSplit(new Set(['u1', 'u2']), ['u1', 'u2', 'd1'])).toEqual(['u1', 'u2'])
    expect(toStoredSplit(new Set(['u1', 'u2']), ['u1', 'u2'])).toEqual([])
  })

  it('treats an empty event as "everyone"', () => {
    expect(toStoredSplit(new Set(), [])).toEqual([])
  })
})
