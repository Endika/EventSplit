import { describe, it, expect } from 'vitest'
import { RecoverPurchaseHandler } from '@/application/handlers/RecoverPurchaseHandler'
import { addPurchase, lastEntry, makeWorld, trashPurchase } from '../../support/world'

describe('RecoverPurchaseHandler', () => {
  it('recovers only the chosen deleted purchase and records history', async () => {
    const w = await makeWorld()
    const first = await addPurchase(w, 'Coke')
    const second = await addPurchase(w, 'Beer', {
      createdBy: w.bob,
      consumers: [{ userId: w.bob, multiplier: 1 }],
    })
    await trashPurchase(w, first)
    await trashPurchase(w, second)
    const result = await new RecoverPurchaseHandler(w.repo).execute({
      eventId: w.eventId,
      purchaseId: second,
      recoveredBy: w.alice,
    })
    expect(result.event.purchases).toMatchObject([
      { id: first, deleted: true },
      { id: second, deleted: false, deletedBy: null },
    ])
    expect(lastEntry(result.event)).toEqual({
      type: 'purchase_recovered',
      userId: w.alice,
      description: 'Alice recovered Beer',
    })
  })
})
