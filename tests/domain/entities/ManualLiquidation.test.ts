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

  it('creates a liquidation with a payer and a trimmed concept', () => {
    const liq = ManualLiquidation.create({ ...base, concept: '  Señal casa  ' })
    expect(liq.toSnapshot()).toEqual({
      id: liq.id,
      concept: 'Señal casa',
      cents: 40000,
      currency: 'EUR',
      paidBy: 'u-javi',
      affects: base.affects,
      paidShares: [],
      createdAt: expect.any(String),
      deleted: false,
      deletedBy: null,
      deletedAt: null,
    })
    expect(liq.concept).toBe('Señal casa')
  })

  it.each([
    ['concept of 2 chars', { concept: 'ab' }, false],
    ['concept of 3 chars', { concept: 'abc' }, true],
    ['concept of 100 chars', { concept: 'a'.repeat(100) }, true],
    ['concept of 101 chars', { concept: 'a'.repeat(101) }, false],
  ])('%s', (_label, over, ok) => {
    const create = () => ManualLiquidation.create({ ...base, ...over })
    if (ok) expect(create).not.toThrow()
    else expect(create).toThrow(/concept/)
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
    const two = liq.toggleShare('u-marta')
    expect(two.toggleShare('u-endika').toSnapshot().paidShares).toEqual(['u-marta'])
  })

  it('edit replaces the fields and drops paid shares of users no longer affected', () => {
    const liq = ManualLiquidation.create(base).toggleShare('u-endika').toggleShare('u-marta')
    const next = liq.edit({
      concept: '  Señal nueva  ',
      amount: Money.fromEuros(100),
      paidBy: null,
      affects: ['u-javi', 'u-marta'],
    })
    expect(next.toSnapshot()).toEqual({
      ...liq.toSnapshot(),
      concept: 'Señal nueva',
      cents: 10000,
      paidBy: null,
      affects: ['u-javi', 'u-marta'],
      paidShares: ['u-marta'],
    })
    expect(next.concept).toBe('Señal nueva')
  })

  it('edit to "everyone" (empty affects) keeps every paid share', () => {
    const liq = ManualLiquidation.create(base).toggleShare('u-endika')
    const next = liq.edit({ ...base, affects: [] })
    expect(next.toSnapshot().paidShares).toEqual(['u-endika'])
  })

  it('edit rejects a snapshot whose paid shares are duplicated', () => {
    const liq = ManualLiquidation.restore({
      ...ManualLiquidation.create(base).toSnapshot(),
      paidShares: ['u-endika', 'u-endika'],
    })
    expect(() => liq.edit(base)).toThrow(/unique/)
  })

  it('restore backfills a legacy snapshot and keeps a soft-deleted one intact', () => {
    const legacy = {
      id: 'l-1',
      concept: 'Señal',
      cents: 20000,
      currency: 'EUR' as const,
      createdAt: '2026-01-01T00:00:00Z',
    }
    const restored = ManualLiquidation.restore(legacy as never)
    expect(restored.toSnapshot()).toEqual({
      ...legacy,
      paidBy: null,
      affects: [],
      paidShares: [],
      deleted: false,
      deletedBy: null,
      deletedAt: null,
    })
    expect(restored.id).toBe('l-1')
    expect(restored.concept).toBe('Señal')

    const deleted = {
      ...legacy,
      paidBy: 'u-javi',
      affects: ['u-javi', 'u-endika'],
      paidShares: ['u-endika'],
      deleted: true,
      deletedBy: 'u-javi',
      deletedAt: '2026-01-02T00:00:00Z',
    }
    expect(ManualLiquidation.restore(deleted).toSnapshot()).toEqual(deleted)
  })
})
