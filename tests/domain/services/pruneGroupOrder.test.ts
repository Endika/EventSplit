import { describe, it, expect } from 'vitest'
import { pruneSubgroupOrder } from '@/domain/services/pruneGroupOrder'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'

// pruneSubgroupOrder also reads `subgroup`; this stub covers all three fields.
const sub = (group: string | null, subgroup: string | null, deleted = false): PurchaseSnapshot =>
  ({ id: crypto.randomUUID(), group, subgroup, deleted }) as PurchaseSnapshot

describe('pruneSubgroupOrder', () => {
  it('drops a subgroup whose only purchase is deleted', () => {
    const purchases = [sub('Dinner', 'Starters', true), sub('Dinner', 'Mains')]
    expect(pruneSubgroupOrder(purchases, { Dinner: ['Starters', 'Mains'] })).toEqual({
      Dinner: ['Mains'],
    })
  })

  it('appends newly-assigned subgroups after the saved order', () => {
    // only 'Mains' was saved; 'Starters' was just assigned and must follow it.
    const purchases = [sub('Dinner', 'Starters'), sub('Dinner', 'Mains')]
    expect(pruneSubgroupOrder(purchases, { Dinner: ['Mains'] })).toEqual({
      Dinner: ['Mains', 'Starters'],
    })
  })
})
