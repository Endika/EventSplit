import { describe, it, expect } from 'vitest'
import { pruneGroupOrder, pruneSubgroupOrder } from '@/domain/services/pruneGroupOrder'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'

// pruneGroupOrder only reads `group` and `deleted`; a minimal stub keeps the test focused.
const purchase = (group: string | null, deleted = false): PurchaseSnapshot =>
  ({ id: crypto.randomUUID(), group, deleted }) as PurchaseSnapshot

// pruneSubgroupOrder also reads `subgroup`; this stub covers all three fields.
const sub = (group: string | null, subgroup: string | null, deleted = false): PurchaseSnapshot =>
  ({ id: crypto.randomUUID(), group, subgroup, deleted }) as PurchaseSnapshot

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

describe('pruneSubgroupOrder', () => {
  it('keeps subgroups that still have a non-deleted purchase, preserving order', () => {
    const purchases = [sub('Dinner', 'Starters'), sub('Dinner', 'Mains')]
    expect(pruneSubgroupOrder(purchases, { Dinner: ['Mains', 'Starters'] })).toEqual({
      Dinner: ['Mains', 'Starters'],
    })
  })

  it('drops a subgroup whose only purchase is deleted', () => {
    const purchases = [sub('Dinner', 'Starters', true), sub('Dinner', 'Mains')]
    expect(pruneSubgroupOrder(purchases, { Dinner: ['Starters', 'Mains'] })).toEqual({
      Dinner: ['Mains'],
    })
  })

  it('drops a group key with no remaining subgroups', () => {
    const purchases = [sub('Dinner', 'Starters', true)]
    expect(pruneSubgroupOrder(purchases, { Dinner: ['Starters'] })).toEqual({})
  })

  it('drops a stale subgroup with no matching purchase', () => {
    const purchases = [sub('Dinner', 'Mains')]
    expect(pruneSubgroupOrder(purchases, { Dinner: ['Mains', 'Desserts'] })).toEqual({
      Dinner: ['Mains'],
    })
  })

  it('ignores purchases without a subgroup', () => {
    const purchases = [sub('Dinner', null), sub('Dinner', 'Mains')]
    expect(pruneSubgroupOrder(purchases, { Dinner: ['Mains'] })).toEqual({ Dinner: ['Mains'] })
  })

  it('only keeps a subgroup under the group it actually belongs to', () => {
    // 'Mains' exists in Dinner but the order lists it under Lunch — must be dropped there.
    const purchases = [sub('Dinner', 'Mains')]
    expect(pruneSubgroupOrder(purchases, { Lunch: ['Mains'] })).toEqual({})
  })
})
