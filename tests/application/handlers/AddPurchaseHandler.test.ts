import { describe, it, expect } from 'vitest'
import { AddPurchaseHandler } from '@/application/handlers/AddPurchaseHandler'
import { lastEntry, makeWorld } from '../../support/world'

describe('AddPurchaseHandler', () => {
  it('adds purchases, computes totalQuantity and appends history', async () => {
    const w = await makeWorld()
    const handler = new AddPurchaseHandler(w.repo)
    const first = await handler.execute({
      eventId: w.eventId,
      createdBy: w.john,
      item: 'Coke',
      quantity: 3,
      unit: 'bottles',
      dailyConsumption: 2,
      consumers: [{ userId: w.john, multiplier: 1 }],
      days: 3,
      group: 'Cena',
      subgroup: 'Bebidas',
      assignedTo: w.alice,
    })
    expect(lastEntry(first.event)).toEqual({
      type: 'purchase_added',
      userId: w.john,
      description: 'John added Coke',
    })

    const second = await handler.execute({
      eventId: w.eventId,
      createdBy: w.bob,
      item: 'Chips',
      quantity: 1,
      unit: 'units',
      dailyConsumption: 1,
      consumers: [{ userId: w.bob, multiplier: 1 }],
      days: 1,
    })
    expect(second.event.purchases).toMatchObject([
      { item: 'Coke', totalQuantity: 6, group: 'Cena', subgroup: 'Bebidas', assignedTo: w.alice },
      { item: 'Chips', totalQuantity: 1, group: null, subgroup: null, assignedTo: null },
    ])
    expect(second.version).toBe(first.version + 1)
  })
})
