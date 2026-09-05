import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { UpdateProfileHandler } from '@/application/handlers/UpdateProfileHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

describe('UpdateProfileHandler', () => {
  it('rejects unknown user', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    await expect(
      new UpdateProfileHandler(repo).execute({
        eventId: create.event.id,
        userId: '018f4a8e-0000-7000-8000-000000000000',
        actorId: create.creator.id,
        email: 'x@y.com',
      }),
    ).rejects.toThrow(/not in event/i)
  })

  it('updates allergies and bumps version', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const result = await new UpdateProfileHandler(repo).execute({
      eventId: create.event.id,
      userId: create.creator.id,
      actorId: create.creator.id,
      email: 'john@example.com',
      allergies: [{ name: 'gluten', severity: 'severe' }],
    })
    expect(result.version).toBe(2)
    const user = result.event.users.find((u) => u.id === create.creator.id)!
    expect(user.email).toBe('john@example.com')
    expect(user.allergies).toHaveLength(1)
    expect(user.allergies[0]!.name).toBe('gluten')
    expect(result.event.history.at(-1)?.type).toBe('user_profile_updated')
  })

  it('leaves untouched fields unchanged', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({
      name: 'Trip',
      creatorName: 'John',
      creatorAlias: 'cousin',
    })
    const result = await new UpdateProfileHandler(repo).execute({
      eventId: create.event.id,
      userId: create.creator.id,
      actorId: create.creator.id,
      email: 'x@y.com',
    })
    const user = result.event.users.find((u) => u.id === create.creator.id)!
    expect(user.alias).toBe('cousin')
    expect(user.allergies).toEqual([])
  })

  it('records actor as the history userId and uses self description when editing own profile', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const result = await new UpdateProfileHandler(repo).execute({
      eventId: create.event.id,
      userId: create.creator.id,
      actorId: create.creator.id,
      email: 'self@example.com',
    })
    const entry = result.event.history.at(-1)!
    expect(entry.userId).toBe(create.creator.id)
    expect(entry.description).toMatch(/updated their profile/i)
  })

  it('records actor as the history userId and credits the actor when editing someone elses profile', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const joinHandler = new (
      await import('@/application/handlers/JoinAsNewUserHandler')
    ).JoinAsNewUserHandler(repo)
    const joined = await joinHandler.execute({ eventId: create.event.id, name: 'Maite' })
    const result = await new UpdateProfileHandler(repo).execute({
      eventId: create.event.id,
      userId: joined.newUser.id,
      actorId: create.creator.id,
      email: 'edited@example.com',
    })
    const entry = result.event.history.at(-1)!
    expect(entry.userId).toBe(create.creator.id)
    expect(entry.description).toContain('John')
    expect(entry.description).toContain('Maite')
    expect(entry.description).not.toMatch(/their profile/i)
  })
})
