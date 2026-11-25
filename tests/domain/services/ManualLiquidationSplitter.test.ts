import { describe, it, expect } from 'vitest'
import { ManualLiquidationSplitter } from '@/domain/services/ManualLiquidationSplitter'

const participants = ['javi', 'endika', 'marta', 'iker']

describe('ManualLiquidationSplitter', () => {
  it('splits per head and auto-marks the payer share as paid', () => {
    const view = ManualLiquidationSplitter.compute(
      {
        cents: 40000,
        paidBy: 'javi',
        affects: ['javi', 'endika', 'marta', 'iker'],
        paidShares: [],
      },
      participants,
    )
    expect(view.totalCents).toBe(40000)
    expect(view.shares).toHaveLength(4)
    expect(view.shares.every((s) => s.cents === 10000)).toBe(true)
    const javi = view.shares.find((s) => s.userId === 'javi')!
    expect(javi.paid).toBe(true) // payer auto-paid
    expect(view.shares.find((s) => s.userId === 'endika')!.paid).toBe(false)
  })

  it('splits among the affected participants only, dropping unknown ids', () => {
    const view = ManualLiquidationSplitter.compute(
      { cents: 1001, paidBy: null, affects: ['javi', 'ghost', 'iker'], paidShares: [] },
      participants,
    )
    expect(view.shares).toEqual([
      { userId: 'javi', cents: 501, paid: false },
      { userId: 'iker', cents: 500, paid: false },
    ])
  })

  it('has nothing to split without participants', () => {
    expect(
      ManualLiquidationSplitter.compute(
        { cents: 100, paidBy: null, affects: ['a'], paidShares: [] },
        [],
      ),
    ).toEqual({ totalCents: 0, paidCents: 0, pendingCents: 0, shares: [] })
  })

  it('treats empty affects as all participants', () => {
    const view = ManualLiquidationSplitter.compute(
      { cents: 40000, paidBy: null, affects: [], paidShares: [] },
      participants,
    )
    expect(view.shares).toHaveLength(4)
  })

  it('reflects hand-marked paid shares', () => {
    const view = ManualLiquidationSplitter.compute(
      { cents: 40000, paidBy: null, affects: participants, paidShares: ['endika'] },
      participants,
    )
    expect(view.shares.find((s) => s.userId === 'endika')!.paid).toBe(true)
    expect(view.paidCents).toBe(10000)
    expect(view.pendingCents).toBe(30000)
  })
})
