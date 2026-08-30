import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { AddPurchaseHandler } from '@/application/handlers/AddPurchaseHandler'
import { AssignPurchaseHandler } from '@/application/handlers/AssignPurchaseHandler'
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

describe('AssignPurchaseHandler', () => {
  it('assigns a buyer and marks purchased', async () => {
    const ctx = await setup()
    const result = await new AssignPurchaseHandler(ctx.repo).execute({
      eventId: ctx.eventId, purchaseId: ctx.purchaseId, editedBy: ctx.userId,
      assignedTo: ctx.userId, purchased: true,
    })
    expect(result.event.purchases[0]!.assignedTo).toBe(ctx.userId)
    expect(result.event.purchases[0]!.purchased).toBe(true)
  })

  it('can unassign (null) and unmark', async () => {
    const ctx = await setup()
    await new AssignPurchaseHandler(ctx.repo).execute({
      eventId: ctx.eventId, purchaseId: ctx.purchaseId, editedBy: ctx.userId,
      assignedTo: ctx.userId, purchased: true,
    })
    const result = await new AssignPurchaseHandler(ctx.repo).execute({
      eventId: ctx.eventId, purchaseId: ctx.purchaseId, editedBy: ctx.userId,
      assignedTo: null, purchased: false,
    })
    expect(result.event.purchases[0]!.assignedTo).toBeNull()
    expect(result.event.purchases[0]!.purchased).toBe(false)
  })

  it('rejects assignedTo not in event', async () => {
    const ctx = await setup()
    await expect(
      new AssignPurchaseHandler(ctx.repo).execute({
        eventId: ctx.eventId, purchaseId: ctx.purchaseId, editedBy: ctx.userId,
        assignedTo: '00000000-0000-7000-8000-000000000000', purchased: false,
      }),
    ).rejects.toThrow(/not in event/i)
  })
})
