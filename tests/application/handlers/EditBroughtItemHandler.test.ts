import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { AddBroughtItemHandler } from '@/application/handlers/AddBroughtItemHandler'
import { EditBroughtItemHandler } from '@/application/handlers/EditBroughtItemHandler'
import { DeletePurchaseHandler } from '@/application/handlers/DeletePurchaseHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

const STRANGER = '018f4a8e-0000-7000-8000-000000000000'

async function setup() {
  const repo = new InMemoryEventRepository()
  const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
  const added = await new AddBroughtItemHandler(repo).execute({
    eventId: create.event.id, createdBy: create.creator.id,
    item: 'Tortilla', quantity: 2, unit: 'units', group: 'Breakfast', broughtBy: create.creator.id,
  })
  return { repo, eventId: create.event.id, userId: create.creator.id, purchaseId: added.event.purchases[0]!.id }
}

describe('EditBroughtItemHandler', () => {
  it('edits a brought item and records history', async () => {
    const ctx = await setup()
    const result = await new EditBroughtItemHandler(ctx.repo).execute({
      eventId: ctx.eventId, purchaseId: ctx.purchaseId, editedBy: ctx.userId,
      item: 'Empanada', quantity: 5, unit: 'units', group: 'Lunch', broughtBy: ctx.userId,
    })
    const p = result.event.purchases[0]!
    expect(p.item).toBe('Empanada')
    expect(p.totalQuantity).toBe(5)
    expect(p.group).toBe('Lunch')
    expect(result.event.history.at(-1)?.type).toBe('purchase_edited')
  })

  it('rejects editedBy not in event', async () => {
    const ctx = await setup()
    await expect(
      new EditBroughtItemHandler(ctx.repo).execute({
        eventId: ctx.eventId, purchaseId: ctx.purchaseId, editedBy: STRANGER,
        item: 'Pan', quantity: 1, unit: 'units',
      }),
    ).rejects.toThrow(/editedBy.*not in event/i)
  })

  it('rejects broughtBy not in event', async () => {
    const ctx = await setup()
    await expect(
      new EditBroughtItemHandler(ctx.repo).execute({
        eventId: ctx.eventId, purchaseId: ctx.purchaseId, editedBy: ctx.userId,
        item: 'Pan', quantity: 1, unit: 'units', broughtBy: STRANGER,
      }),
    ).rejects.toThrow(/broughtBy.*not in event/i)
  })

  it('rejects editing a deleted purchase', async () => {
    const ctx = await setup()
    await new DeletePurchaseHandler(ctx.repo).execute({
      eventId: ctx.eventId, purchaseId: ctx.purchaseId, deletedBy: ctx.userId,
    })
    await expect(
      new EditBroughtItemHandler(ctx.repo).execute({
        eventId: ctx.eventId, purchaseId: ctx.purchaseId, editedBy: ctx.userId,
        item: 'Pan', quantity: 1, unit: 'units',
      }),
    ).rejects.toThrow(/deleted purchase/i)
  })

  it('rejects an unknown purchase', async () => {
    const ctx = await setup()
    await expect(
      new EditBroughtItemHandler(ctx.repo).execute({
        eventId: ctx.eventId, purchaseId: STRANGER, editedBy: ctx.userId,
        item: 'Pan', quantity: 1, unit: 'units',
      }),
    ).rejects.toThrow(/not found/i)
  })
})
