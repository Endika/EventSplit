import { describe, it, expect } from 'vitest'
import { pruneGroupOrder } from '@/domain/services/pruneGroupOrder'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'

// pruneGroupOrder only reads `group` and `deleted`; a minimal stub keeps the test focused.
const purchase = (group: string | null, deleted = false): PurchaseSnapshot =>
  ({ id: crypto.randomUUID(), group, deleted }) as PurchaseSnapshot

describe('pruneGroupOrder', () => {
  it('keeps groups that still have a non-deleted purchase, preserving order', () => {
    const purchases = [purchase('Dinner'), purchase('Breakfast')]
    expect(pruneGroupOrder(purchases, ['Breakfast', 'Dinner'])).toEqual(['Breakfast', 'Dinner'])
  })

  it('drops a group whose only purchase is deleted', () => {
    const purchases = [purchase('Dinner', true), purchase('Breakfast')]
    expect(pruneGroupOrder(purchases, ['Breakfast', 'Dinner'])).toEqual(['Breakfast'])
  })

  it('drops a stale group with no matching purchase', () => {
    const purchases = [purchase('Dinner')]
    expect(pruneGroupOrder(purchases, ['Dinner', 'Lunch'])).toEqual(['Dinner'])
  })

  it('ignores purchases without a group', () => {
    const purchases = [purchase(null), purchase('Dinner')]
    expect(pruneGroupOrder(purchases, ['Dinner'])).toEqual(['Dinner'])
  })
})
