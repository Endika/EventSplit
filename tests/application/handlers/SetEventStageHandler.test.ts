import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { SetEventStageHandler } from '@/application/handlers/SetEventStageHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

describe('SetEventStageHandler', () => {
  it('moves event from doodle to shopping', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const result = await new SetEventStageHandler(repo).execute({
      eventId: create.event.id,
      userId: create.creator.id,
      stage: 'shopping',
    })
    expect(result.event.stage).toBe('shopping')
    expect(result.version).toBe(2)
  })

  it('rejects unknown user', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    await expect(
      new SetEventStageHandler(repo).execute({
        eventId: create.event.id,
        userId: '00000000-0000-7000-8000-000000000000',
        stage: 'shopping',
      }),
    ).rejects.toThrow(/not in event/i)
  })

  it('no-op when stage equals current', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const result = await new SetEventStageHandler(repo).execute({
      eventId: create.event.id,
      userId: create.creator.id,
      stage: 'doodle', // already doodle
    })
    expect(result.version).toBe(create.version) // unchanged
  })
})
