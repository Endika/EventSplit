import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { AddPurchaseHandler } from '@/application/handlers/AddPurchaseHandler'
import { RenameSubgroupHandler } from '@/application/handlers/RenameSubgroupHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

describe('RenameSubgroupHandler', () => {
  it('only renames the subgroup within the targeted group', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const creatorId = create.creator.id

    await new AddPurchaseHandler(repo).execute({
      eventId: create.event.id,
      createdBy: creatorId,
      item: 'Coke',
      quantity: 3,
      unit: 'bottles',
      dailyConsumption: 2,
      consumers: [{ userId: creatorId, multiplier: 1 }],
      days: 3,
      group: 'Cena',
      subgroup: 'Bebidas',
    })
    await new AddPurchaseHandler(repo).execute({
      eventId: create.event.id,
      createdBy: creatorId,
      item: 'Water',
      quantity: 3,
      unit: 'bottles',
      dailyConsumption: 2,
      consumers: [{ userId: creatorId, multiplier: 1 }],
      days: 3,
      group: 'Comida',
      subgroup: 'Bebidas',
    })

    const result = await new RenameSubgroupHandler(repo).execute({
      eventId: create.event.id,
      userId: creatorId,
      group: 'Cena',
      from: 'Bebidas',
      to: 'Refrescos',
    })

    const coke = result.event.purchases.find((p) => p.item === 'Coke')!
    const water = result.event.purchases.find((p) => p.item === 'Water')!
    expect(coke.subgroup).toBe('Refrescos')
    expect(water.subgroup).toBe('Bebidas')
  })
})
