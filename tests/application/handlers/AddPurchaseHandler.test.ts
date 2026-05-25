import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { AddPurchaseHandler } from '@/application/handlers/AddPurchaseHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

describe('AddPurchaseHandler', () => {
  it('adds the purchase, computes totalQuantity, appends history', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const creatorId = create.creator.id

    const result = await new AddPurchaseHandler(repo).execute({
      eventId: create.event.id,
      createdBy: creatorId,
      category: 'drinks',
      item: 'Coke',
      quantity: 3,
      unit: 'bottles',
      dailyConsumption: 2,
      consumers: [{ userId: creatorId, multiplier: 1 }],
      days: 3,
    })

    expect(result.event.purchases).toHaveLength(1)
    expect(result.event.purchases[0]!.totalQuantity).toBe(6)
    expect(result.event.history.at(-1)?.type).toBe('purchase_added')
    expect(result.version).toBe(2)
  })

  it('rejects when consumer references unknown user', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const handler = new AddPurchaseHandler(repo)
    await expect(
      handler.execute({
        eventId: create.event.id,
        createdBy: create.creator.id,
        category: 'drinks', item: 'Coke', quantity: 1, unit: 'bottles', dailyConsumption: 1,
        consumers: [{ userId: '018f4a8e-0000-7000-8000-000000000000', multiplier: 1 }],
        days: 1,
      }),
    ).rejects.toThrow(/consumer.*not in event/i)
  })
})
