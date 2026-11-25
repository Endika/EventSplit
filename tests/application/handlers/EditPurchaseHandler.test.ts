import { describe, it, expect } from 'vitest'
import { EditPurchaseHandler } from '@/application/handlers/EditPurchaseHandler'
import { addPurchase, lastEntry, makeWorld, type World } from '../../support/world'

async function setup() {
  const w = await makeWorld()
  const first = await addPurchase(w, 'Bread')
  const second = await addPurchase(w, 'Coke', {
    quantity: 3,
    unit: 'bottles',
    dailyConsumption: 2,
    days: 2,
  })
  const edit = (over: Partial<Parameters<EditPurchaseHandler['execute']>[0]> = {}) =>
    new EditPurchaseHandler(w.repo).execute({
      eventId: w.eventId,
      purchaseId: second,
      editedBy: w.alice,
      item: 'Coke',
      quantity: 3,
      unit: 'bottles',
      dailyConsumption: 2,
      consumers: [{ userId: w.john, multiplier: 1 }],
      days: 2,
      ...over,
    })
  return { w, first, second, edit }
}

describe('EditPurchaseHandler', () => {
  it('rewrites one purchase, recomputes totalQuantity and leaves the other alone', async () => {
    const { w, first, second, edit } = await setup()
    const result = await edit({
      item: 'Fanta',
      quantity: 5,
      unit: 'cans',
      dailyConsumption: 3,
      consumers: [{ userId: w.bob, multiplier: 2 }],
      days: 3,
    })
    expect(result.event.purchases).toMatchObject([
      { id: first, item: 'Bread' },
      {
        id: second,
        item: 'Fanta',
        quantity: 5,
        unit: 'cans',
        totalQuantity: 18,
        consumers: [{ userId: w.bob, multiplier: 2 }],
      },
    ])
    expect(lastEntry(result.event)).toEqual({
      type: 'purchase_edited',
      userId: w.alice,
      description: 'Alice edited Coke',
    })
  })

  type Fields = { assignedTo?: string | null; group?: string | null; subgroup?: string | null }
  const sets = (w: World): Fields => ({
    assignedTo: w.alice,
    group: 'Comida',
    subgroup: 'Bebidas',
  })
  const cleared: Fields = { assignedTo: null, group: null, subgroup: null }

  it.each([
    ['sets', sets, sets],
    ['clears when passed null', () => cleared, () => cleared],
    [
      'keeps when not provided',
      () => ({}),
      (w: World): Fields => ({ assignedTo: w.bob, group: 'Old', subgroup: 'Older' }),
    ],
  ])('%s the buyer, group and subgroup', async (_name, over, expected) => {
    const { w, edit } = await setup()
    await edit({ assignedTo: w.bob, group: 'Old', subgroup: 'Older' })
    const result = await edit(over(w))
    expect(result.event.purchases[1]).toMatchObject(expected(w))
  })
})
