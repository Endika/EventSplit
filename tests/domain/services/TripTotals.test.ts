import { describe, it, expect } from 'vitest'
import { computeTripTotals } from '@/domain/services/TripTotals'

const participants = ['javi', 'endika', 'marta', 'iker']

describe('computeTripTotals', () => {
  it('sums gastos + manual outflow without counting automatic transfers', () => {
    const totals = computeTripTotals({
      participantIds: participants,
      expenses: [
        { cents: 10000, deleted: false },
        { cents: 6000, deleted: false },
      ],
      manualLiquidations: [
        { cents: 40000, paidBy: 'javi', affects: participants, paidShares: [], deleted: false },
        { cents: 40000, paidBy: null, affects: participants, paidShares: [], deleted: false },
      ],
    })
    expect(totals.totalCostCents).toBe(96000)
    expect(totals.realSpentCents).toBe(56000)
    expect(totals.pendingCents).toBe(40000)
  })

  it('counts paid shares of a pending liquidation as real outflow', () => {
    const totals = computeTripTotals({
      participantIds: participants,
      expenses: [],
      manualLiquidations: [
        {
          cents: 40000,
          paidBy: null,
          affects: participants,
          paidShares: ['endika'],
          deleted: false,
        },
      ],
    })
    expect(totals.realSpentCents).toBe(10000)
    expect(totals.pendingCents).toBe(30000)
  })

  it('ignores deleted items', () => {
    const totals = computeTripTotals({
      participantIds: participants,
      expenses: [{ cents: 10000, deleted: true }],
      manualLiquidations: [
        { cents: 40000, paidBy: 'javi', affects: participants, paidShares: [], deleted: true },
      ],
    })
    expect(totals.totalCostCents).toBe(0)
  })
})
