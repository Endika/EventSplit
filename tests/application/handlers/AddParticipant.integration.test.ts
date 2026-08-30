import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { JoinAsNewUserHandler } from '@/application/handlers/JoinAsNewUserHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

describe('AddParticipant via JoinAsNewUserHandler (UI shape)', () => {
  it('adds participant with name+alias+kind exactly as the modal sends', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const result = await new JoinAsNewUserHandler(repo).execute({
      eventId: create.event.id,
      name: 'Sofía',
      alias: null,
      kind: 'child',
    })
    expect(result.event.users).toHaveLength(2)
    const sofia = result.event.users.find((u) => u.name === 'Sofía')!
    expect(sofia.kind).toBe('child')
  })

  it('adds participant when kind is undefined (defaults to adult)', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const result = await new JoinAsNewUserHandler(repo).execute({
      eventId: create.event.id,
      name: 'Maria',
    })
    const maria = result.event.users.find((u) => u.name === 'Maria')!
    expect(maria.kind).toBe('adult')
  })

  it('adds participant with empty alias string (trimmed to null)', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const result = await new JoinAsNewUserHandler(repo).execute({
      eventId: create.event.id,
      name: 'Pedro',
      alias: '',
      kind: 'adult',
    })
    const pedro = result.event.users.find((u) => u.name === 'Pedro')!
    expect(pedro.alias).toBeNull()
  })

  it('preserves all users when adding multiple participants in sequence', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    await new JoinAsNewUserHandler(repo).execute({
      eventId: create.event.id,
      name: 'Maria',
      kind: 'adult',
    })
    await new JoinAsNewUserHandler(repo).execute({
      eventId: create.event.id,
      name: 'Sofía',
      kind: 'child',
    })
    const final = await repo.findById(create.event.id)
    expect(final?.snapshot.users.map((u) => u.name)).toEqual(['John', 'Maria', 'Sofía'])
  })
})
