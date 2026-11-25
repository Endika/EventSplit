import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { JoinAsNewUserHandler } from '@/application/handlers/JoinAsNewUserHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'
import { readEvent } from '../../support/readEvent'

describe('AddParticipant via JoinAsNewUserHandler (UI shape)', () => {
  it('adds participant with name+alias+kind exactly as the modal sends', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const result = await new JoinAsNewUserHandler(repo).execute({
      eventId: create.event.id,
      name: 'Sofía',
      alias: 'Sofi',
      kind: 'child',
    })
    expect(result.event.users).toHaveLength(2)
    const sofia = result.event.users.find((u) => u.name === 'Sofía')!
    expect(sofia.kind).toBe('child')
    expect(sofia.alias).toBe('Sofi')
  })

  it('adds a dog and round-trips it through the repository', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const result = await new JoinAsNewUserHandler(repo).execute({
      eventId: create.event.id,
      name: 'Toby',
      alias: null,
      kind: 'dog',
    })
    expect(result.event.users.find((u) => u.name === 'Toby')!.kind).toBe('dog')
    const reloaded = await readEvent(repo, create.event.id)
    expect(reloaded!.snapshot.users.find((u) => u.name === 'Toby')!.kind).toBe('dog')
  })
})
