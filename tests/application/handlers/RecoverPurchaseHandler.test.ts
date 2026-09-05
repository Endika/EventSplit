import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { AddPurchaseHandler } from '@/application/handlers/AddPurchaseHandler'
import { DeletePurchaseHandler } from '@/application/handlers/DeletePurchaseHandler'
import { RecoverPurchaseHandler } from '@/application/handlers/RecoverPurchaseHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

async function setup() {
  const repo = new InMemoryEventRepository()
  const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
  const added = await new AddPurchaseHandler(repo).execute({
    eventId: create.event.id,
    createdBy: create.creator.id,
    item: 'Coke',
    quantity: 1,
    unit: 'units',
    dailyConsumption: 1,
    consumers: [{ userId: create.creator.id, multiplier: 1 }],
    days: 1,
  })
  const purchaseId = added.event.purchases[0]!.id
  await new DeletePurchaseHandler(repo).execute({
    eventId: create.event.id,
    purchaseId,
    deletedBy: create.creator.id,
  })
  return { repo, eventId: create.event.id, userId: create.creator.id, purchaseId }
}

describe('RecoverPurchaseHandler', () => {
  it('recovers a deleted purchase and records history', async () => {
    const ctx = await setup()
    const result = await new RecoverPurchaseHandler(ctx.repo).execute({
      eventId: ctx.eventId,
      purchaseId: ctx.purchaseId,
      recoveredBy: ctx.userId,
    })
    expect(result.event.purchases[0]!.deleted).toBe(false)
    expect(result.event.purchases[0]!.deletedBy).toBeNull()
    expect(result.event.history.at(-1)?.type).toBe('purchase_recovered')
  })

  it('rejects unknown purchase', async () => {
    const ctx = await setup()
    await expect(
      new RecoverPurchaseHandler(ctx.repo).execute({
        eventId: ctx.eventId,
        purchaseId: '00000000-0000-7000-8000-000000000000',
        recoveredBy: ctx.userId,
      }),
    ).rejects.toThrow(/not found/i)
  })

  it('rejects recoveredBy not in event', async () => {
    const ctx = await setup()
    await expect(
      new RecoverPurchaseHandler(ctx.repo).execute({
        eventId: ctx.eventId,
        purchaseId: ctx.purchaseId,
        recoveredBy: '00000000-0000-7000-8000-000000000000',
      }),
    ).rejects.toThrow(/not in event/i)
  })
})
