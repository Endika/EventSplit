import { describe, it, expect } from 'vitest'
import { assignedTo, buyableItems, visiblePurchases } from '@/presentation/utils/purchaseFilters'
import { makePurchase } from '../../support/eventFixtures'

const purchases = [
  makePurchase('buy-mine', { assignedTo: 'me' }),
  makePurchase('buy-other', { assignedTo: 'other' }),
  makePurchase('bring', { kind: 'bring', assignedTo: 'me' }),
  makePurchase('gone', { deleted: true, assignedTo: 'me' }),
]
const ids = (ps: { id: string }[]) => ps.map((p) => p.id)

describe('buyableItems', () => {
  it('drops deleted and brought items', () => {
    expect(ids(buyableItems(purchases))).toEqual(['buy-mine', 'buy-other'])
  })
})

describe('assignedTo', () => {
  it('keeps what is assigned to the user, and nothing for an unknown one', () => {
    expect(ids(assignedTo(purchases, 'other'))).toEqual(['buy-other'])
    expect(assignedTo(purchases, undefined)).toEqual([])
  })
})

describe('visiblePurchases', () => {
  it('returns everything unless only mine is on', () => {
    expect(ids(visiblePurchases(purchases, false, 'me'))).toEqual(ids(purchases))
  })

  it('keeps only my items when only mine is on', () => {
    expect(ids(visiblePurchases(purchases, true, 'me'))).toEqual(['buy-mine', 'bring', 'gone'])
  })
})
