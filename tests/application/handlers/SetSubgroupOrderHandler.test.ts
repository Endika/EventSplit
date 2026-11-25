import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { SetSubgroupOrderHandler } from '@/application/handlers/SetSubgroupOrderHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

describe('SetSubgroupOrderHandler', () => {
  it('persists the subgroup order under its group', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const creatorId = create.creator.id

    const result = await new SetSubgroupOrderHandler(repo).execute({
      eventId: create.event.id,
      userId: creatorId,
      group: 'Cena',
      order: ['B', 'A'],
    })

    expect(result.event.subgroupOrder['Cena']).toEqual(['B', 'A'])
  })
})
