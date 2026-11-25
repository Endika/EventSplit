import { describe, it, expect } from 'vitest'
import { AddBroughtItemHandler } from '@/application/handlers/AddBroughtItemHandler'
import { lastEntry, makeWorld } from '../../support/world'

describe('AddBroughtItemHandler', () => {
  it('adds bring items with and without a bringer, group and subgroup', async () => {
    const w = await makeWorld()
    const handler = new AddBroughtItemHandler(w.repo)
    const first = await handler.execute({
      eventId: w.eventId,
      createdBy: w.john,
      item: 'Tortilla',
      quantity: 2,
      unit: 'units',
      group: 'Desayuno',
      subgroup: 'Salado',
      broughtBy: w.alice,
    })
    expect(lastEntry(first.event)).toEqual({
      type: 'purchase_added',
      userId: w.john,
      description: 'John added Tortilla (from home)',
    })

    const second = await handler.execute({
      eventId: w.eventId,
      createdBy: w.bob,
      item: 'Pan',
      quantity: 1,
      unit: 'units',
    })
    expect(second.event.purchases).toMatchObject([
      {
        kind: 'bring',
        item: 'Tortilla',
        totalQuantity: 2,
        assignedTo: w.alice,
        group: 'Desayuno',
        subgroup: 'Salado',
        consumers: [],
      },
      { kind: 'bring', item: 'Pan', assignedTo: null, group: null, subgroup: null },
    ])
    expect(second.version).toBe(first.version + 1)
  })
})
