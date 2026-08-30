import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { JoinAsNewUserHandler } from '@/application/handlers/JoinAsNewUserHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

describe('JoinAsNewUserHandler', () => {
  it('adds the new user and bumps version', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const join = await new JoinAsNewUserHandler(repo).execute({
      eventId: create.event.id, name: 'Maria',
    })
    expect(join.event.users.map((u) => u.name)).toEqual(['John', 'Maria'])
    expect(join.version).toBe(2)
    expect(join.newUser.name).toBe('Maria')
  })

  it('retries on version conflict (refetch and apply)', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const fresh = await repo.findById(create.event.id)
    await repo.update(create.event.id, fresh!.snapshot, fresh!.version)
    const join = await new JoinAsNewUserHandler(repo).execute({
      eventId: create.event.id, name: 'Maria',
    })
    expect(join.version).toBe(3)
  })
})
