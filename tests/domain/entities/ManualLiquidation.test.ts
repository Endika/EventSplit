import { describe, it, expect } from 'vitest'
import { ManualLiquidation } from '@/domain/entities/ManualLiquidation'
import { Money } from '@/domain/value-objects/Money'

describe('ManualLiquidation', () => {
  const base = {
    concept: 'Señal casa',
    amount: Money.fromEuros(400),
    paidBy: 'u-javi',
    affects: ['u-javi', 'u-endika', 'u-marta', 'u-iker'],
  }

  it('creates a pending liquidation when paidBy is null', () => {
    const liq = ManualLiquidation.create({ ...base, paidBy: null })
    const s = liq.toSnapshot()
    expect(s.paidBy).toBeNull()
    expect(s.cents).toBe(40000)
    expect(s.paidShares).toEqual([])
    expect(s.deleted).toBe(false)
  })

  it('creates a liquidation with a payer', () => {
    const liq = ManualLiquidation.create(base)
    expect(liq.toSnapshot().paidBy).toBe('u-javi')
  })

  it('rejects empty concept', () => {
    expect(() => ManualLiquidation.create({ ...base, concept: 'x' })).toThrow(/concept/i)
  })

  it('rejects non-positive amount', () => {
    expect(() => ManualLiquidation.create({ ...base, amount: Money.fromCents(0) })).toThrow(/> 0/)
  })

  it('rejects duplicate affects', () => {
    expect(() => ManualLiquidation.create({ ...base, affects: ['a', 'a'] })).toThrow(/unique/i)
  })

  it('toggles a share paid then unpaid', () => {
    const liq = ManualLiquidation.create(base).toggleShare('u-endika')
    expect(liq.toSnapshot().paidShares).toEqual(['u-endika'])
    expect(liq.toggleShare('u-endika').toSnapshot().paidShares).toEqual([])
  })

  it('soft-deletes and recovers', () => {
    const del = ManualLiquidation.create(base).softDelete({ by: 'u-javi' })
    expect(del.toSnapshot().deleted).toBe(true)
    expect(del.recover().toSnapshot().deleted).toBe(false)
  })
})
