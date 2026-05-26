import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { JoinAsNewUserHandler } from '@/application/handlers/JoinAsNewUserHandler'
import { RemoveParticipantHandler } from '@/application/handlers/RemoveParticipantHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

describe('RemoveParticipantHandler', () => {
  it('removes a non-creator participant', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const join = await new JoinAsNewUserHandler(repo).execute({
      eventId: create.event.id, name: 'Maria',
    })
    const result = await new RemoveParticipantHandler(repo).execute({
      eventId: create.event.id,
      userId: join.newUser.id,
    })
    expect(result.event.users.map((u) => u.name)).toEqual(['John'])
    expect(result.event.history.at(-1)?.type).toBe('user_removed')
  })

  it('rejects removing the creator', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    await expect(
      new RemoveParticipantHandler(repo).execute({
        eventId: create.event.id,
        userId: create.creator.id,
      }),
    ).rejects.toThrow(/creator/i)
  })

  it('rejects removing an unknown user', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    await expect(
      new RemoveParticipantHandler(repo).execute({
        eventId: create.event.id,
        userId: '00000000-0000-7000-8000-000000000000',
      }),
    ).rejects.toThrow(/not in event/i)
  })
})
