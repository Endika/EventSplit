import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { AddPurchaseHandler } from '@/application/handlers/AddPurchaseHandler'
import { RenameGroupHandler } from '@/application/handlers/RenameGroupHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

describe('RenameGroupHandler', () => {
  it('renames a group across its purchases', async () => {
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
    })

    const result = await new RenameGroupHandler(repo).execute({
      eventId: create.event.id,
      userId: creatorId,
      from: 'Cena',
      to: 'Cena sábado',
    })

    expect(result.event.purchases[0]!.group).toBe('Cena sábado')
  })

  it('rejects unknown user', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    await expect(
      new RenameGroupHandler(repo).execute({
        eventId: create.event.id,
        userId: '00000000-0000-7000-8000-000000000000',
        from: 'Cena',
        to: 'Comida',
      }),
    ).rejects.toThrow(/not in event/i)
  })
})
