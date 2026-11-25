import { describe, it, expect } from 'vitest'
import { formOfLiquidation, liquidationPayload } from '@/presentation/utils/liquidationForm'
import type { ManualLiquidationSnapshot } from '@/domain/entities/ManualLiquidation'

const form = { concept: ' Cena ', amount: '12,5', paidBy: 'u1', affects: ['u1', 'u2'] }

describe('liquidationForm', () => {
  it('trims, parses the amount and keeps the people', () => {
    expect(liquidationPayload(form)).toEqual({
      concept: 'Cena',
      amountEuros: 12.5,
      paidBy: 'u1',
      affects: ['u1', 'u2'],
    })
    expect(liquidationPayload({ ...form, concept: 'abc', paidBy: '' })).toMatchObject({
      concept: 'abc',
      paidBy: null,
    })
  })

  it.each([{ concept: '  ab  ' }, { amount: '0' }])('refuses %j', (over) => {
    expect(liquidationPayload({ ...form, ...over })).toBeNull()
  })

  it('fills the form from a saved liquidation, copying the people', () => {
    const liq = {
      concept: 'Cena',
      cents: 1250,
      paidBy: null,
      affects: ['u1'],
    } as ManualLiquidationSnapshot
    const filled = formOfLiquidation(liq)
    expect(filled).toEqual({ concept: 'Cena', amount: '12.5', paidBy: '', affects: ['u1'] })
    expect(filled.affects).not.toBe(liq.affects)
  })
})
