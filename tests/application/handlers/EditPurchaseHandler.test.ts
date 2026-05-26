import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { AddPurchaseHandler } from '@/application/handlers/AddPurchaseHandler'
import { EditPurchaseHandler } from '@/application/handlers/EditPurchaseHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

describe('EditPurchaseHandler', () => {
  async function setup() {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const added = await new AddPurchaseHandler(repo).execute({
      eventId: create.event.id,
      createdBy: create.creator.id,
      category: 'drinks',
      item: 'Coke',
      quantity: 3,
      unit: 'bottles',
      dailyConsumption: 2,
      consumers: [{ userId: create.creator.id, multiplier: 1 }],
      days: 2,
    })
    return { repo, eventId: create.event.id, userId: create.creator.id, purchaseId: added.event.purchases[0]!.id }
  }

  it('updates quantity and unit', async () => {
    const ctx = await setup()
    const result = await new EditPurchaseHandler(ctx.repo).execute({
      eventId: ctx.eventId,
      purchaseId: ctx.purchaseId,
      editedBy: ctx.userId,
      quantity: 5,
      unit: 'cans',
      dailyConsumption: 2,
      consumers: [{ userId: ctx.userId, multiplier: 1 }],
      days: 2,
    })
    const p = result.event.purchases[0]!
    expect(p.quantity).toBe(5)
    expect(p.unit).toBe('cans')
    expect(p.category).toBe('drinks') // unchanged
    expect(p.item).toBe('Coke') // unchanged
    expect(result.event.history.at(-1)?.type).toBe('purchase_edited')
  })

  it('recomputes totalQuantity', async () => {
    const ctx = await setup()
    const result = await new EditPurchaseHandler(ctx.repo).execute({
      eventId: ctx.eventId,
      purchaseId: ctx.purchaseId,
      editedBy: ctx.userId,
      quantity: 3,
      unit: 'bottles',
      dailyConsumption: 3,
      consumers: [{ userId: ctx.userId, multiplier: 2 }],
      days: 3,
    })
    expect(result.event.purchases[0]!.totalQuantity).toBe(18) // 3*2*3
  })

  it('rejects unknown purchase id', async () => {
    const ctx = await setup()
    await expect(
      new EditPurchaseHandler(ctx.repo).execute({
        eventId: ctx.eventId,
        purchaseId: '00000000-0000-7000-8000-000000000000',
        editedBy: ctx.userId,
        quantity: 1,
        unit: 'bottles',
        dailyConsumption: 1,
        consumers: [{ userId: ctx.userId, multiplier: 1 }],
        days: 1,
      }),
    ).rejects.toThrow(/not found/i)
  })

  it('rejects when editor not in event', async () => {
    const ctx = await setup()
    await expect(
      new EditPurchaseHandler(ctx.repo).execute({
        eventId: ctx.eventId,
        purchaseId: ctx.purchaseId,
        editedBy: '00000000-0000-7000-8000-000000000000',
        quantity: 1,
        unit: 'bottles',
        dailyConsumption: 1,
        consumers: [{ userId: ctx.userId, multiplier: 1 }],
        days: 1,
      }),
    ).rejects.toThrow(/not in event/i)
  })
})
