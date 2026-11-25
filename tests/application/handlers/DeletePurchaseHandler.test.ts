import { describe, it, expect } from 'vitest'
import { DeletePurchaseHandler } from '@/application/handlers/DeletePurchaseHandler'
import { SetGroupOrderHandler } from '@/application/handlers/SetGroupOrderHandler'
import { addPurchase, lastEntry, makeWorld } from '../../support/world'

describe('DeletePurchaseHandler', () => {
  it('soft-deletes only the chosen purchase with its reason and records history', async () => {
    const w = await makeWorld()
    const first = await addPurchase(w, 'Coke')
    const second = await addPurchase(w, 'Beer')
    const result = await new DeletePurchaseHandler(w.repo).execute({
      eventId: w.eventId,
      purchaseId: second,
      deletedBy: w.alice,
      reason: 'Wrong item',
    })
    expect(result.event.purchases).toMatchObject([
      { id: first, deleted: false, deleteReason: null },
      { id: second, deleted: true, deletedBy: w.alice, deleteReason: 'Wrong item' },
    ])
    expect(lastEntry(result.event)).toEqual({
      type: 'purchase_deleted',
      userId: w.alice,
      description: 'Alice deleted Beer',
    })
  })

  it('caps the trash at 5 deleted purchases, never touching live ones', async () => {
    const w = await makeWorld()
    const ids: string[] = []
    for (let i = 0; i < 8; i++) ids.push(await addPurchase(w, `Item ${i}`))
    let result
    for (const id of ids.slice(2)) {
      result = await new DeletePurchaseHandler(w.repo).execute({
        eventId: w.eventId,
        purchaseId: id,
        deletedBy: w.john,
      })
    }
    const deleted = result!.event.purchases.filter((p) => p.deleted)
    const alive = result!.event.purchases.filter((p) => !p.deleted)
    expect(deleted).toHaveLength(5)
    expect(alive.map((p) => p.id).sort()).toEqual(ids.slice(0, 2).sort())
  })

  it('prunes a group from the order when its last item is deleted', async () => {
    const w = await makeWorld()
    const dinner = await addPurchase(w, 'Coke', { group: 'Dinner' })
    await addPurchase(w, 'Chips', { group: 'Snacks' })
    await new SetGroupOrderHandler(w.repo).execute({
      eventId: w.eventId,
      userId: w.john,
      order: ['Dinner', 'Snacks'],
    })
    const result = await new DeletePurchaseHandler(w.repo).execute({
      eventId: w.eventId,
      purchaseId: dinner,
      deletedBy: w.john,
    })
    expect(result.event.groupOrder).toEqual(['Snacks'])
  })
})
