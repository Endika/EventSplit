import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { AddPurchaseHandler } from '@/application/handlers/AddPurchaseHandler'
import { DeletePurchaseHandler } from '@/application/handlers/DeletePurchaseHandler'
import { SetGroupOrderHandler } from '@/application/handlers/SetGroupOrderHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

async function setup() {
  const repo = new InMemoryEventRepository()
  const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
  const added = await new AddPurchaseHandler(repo).execute({
    eventId: create.event.id, createdBy: create.creator.id,
    item: 'Coke', quantity: 1, unit: 'units',
    dailyConsumption: 1, consumers: [{ userId: create.creator.id, multiplier: 1 }], days: 1,
  })
  return { repo, eventId: create.event.id, userId: create.creator.id, purchaseId: added.event.purchases[0]!.id }
}

describe('DeletePurchaseHandler', () => {
  it('soft-deletes a purchase with reason', async () => {
    const ctx = await setup()
    const result = await new DeletePurchaseHandler(ctx.repo).execute({
      eventId: ctx.eventId, purchaseId: ctx.purchaseId, deletedBy: ctx.userId, reason: 'Wrong item',
    })
    expect(result.event.purchases[0]!.deleted).toBe(true)
    expect(result.event.purchases[0]!.deleteReason).toBe('Wrong item')
    expect(result.event.history.at(-1)?.type).toBe('purchase_deleted')
  })

  it('rejects unknown purchase', async () => {
    const ctx = await setup()
    await expect(
      new DeletePurchaseHandler(ctx.repo).execute({
        eventId: ctx.eventId, purchaseId: '00000000-0000-7000-8000-000000000000', deletedBy: ctx.userId,
      }),
    ).rejects.toThrow(/not found/i)
  })

  it('rejects deleter not in event', async () => {
    const ctx = await setup()
    await expect(
      new DeletePurchaseHandler(ctx.repo).execute({
        eventId: ctx.eventId, purchaseId: ctx.purchaseId, deletedBy: '00000000-0000-7000-8000-000000000000',
      }),
    ).rejects.toThrow(/not in event/i)
  })

  it('caps the trash at 5 deleted purchases, never touching live ones', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const ids: string[] = []
    for (let i = 0; i < 8; i++) {
      const added = await new AddPurchaseHandler(repo).execute({
        eventId: create.event.id, createdBy: create.creator.id,
        item: `Item ${i}`, quantity: 1, unit: 'units', dailyConsumption: 1,
        consumers: [{ userId: create.creator.id, multiplier: 1 }], days: 1,
      })
      ids.push(added.event.purchases.at(-1)!.id)
    }
    // Delete 6 of the 8 purchases, leaving the first two alive.
    let result
    for (const id of ids.slice(2)) {
      result = await new DeletePurchaseHandler(repo).execute({
        eventId: create.event.id, purchaseId: id, deletedBy: create.creator.id,
      })
    }
    const deleted = result!.event.purchases.filter((p) => p.deleted)
    const alive = result!.event.purchases.filter((p) => !p.deleted)
    expect(deleted).toHaveLength(5)
    expect(alive.map((p) => p.id).sort()).toEqual(ids.slice(0, 2).sort())
  })

  it('prunes a group from the order when its last item is deleted', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const added = await new AddPurchaseHandler(repo).execute({
      eventId: create.event.id, createdBy: create.creator.id,
      item: 'Coke', quantity: 1, unit: 'units', dailyConsumption: 1,
      consumers: [{ userId: create.creator.id, multiplier: 1 }], days: 1, group: 'Dinner',
    })
    await new SetGroupOrderHandler(repo).execute({
      eventId: create.event.id, userId: create.creator.id, order: ['Dinner'],
    })
    const result = await new DeletePurchaseHandler(repo).execute({
      eventId: create.event.id, purchaseId: added.event.purchases[0]!.id, deletedBy: create.creator.id,
    })
    expect(result.event.groupOrder).not.toContain('Dinner')
  })
})
