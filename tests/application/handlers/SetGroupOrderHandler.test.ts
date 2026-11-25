import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { SetGroupOrderHandler } from '@/application/handlers/SetGroupOrderHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

describe('SetGroupOrderHandler', () => {
  it('persists the group order', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const creatorId = create.creator.id

    const result = await new SetGroupOrderHandler(repo).execute({
      eventId: create.event.id,
      userId: creatorId,
      order: ['B', 'A'],
    })

    expect(result.event.groupOrder).toEqual(['B', 'A'])
  })
})
