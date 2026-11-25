import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { UpdateProfileHandler } from '@/application/handlers/UpdateProfileHandler'
import { JoinAsNewUserHandler } from '@/application/handlers/JoinAsNewUserHandler'
import { addExpense, makeWorld } from '../../support/world'
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
      allergies: [
        { name: 'gluten', severity: 'severe' },
        { name: 'nuts', severity: 'mild', notes: 'only walnuts' },
      ],
    })
    expect(result.version).toBe(2)
    const user = result.event.users.find((u) => u.id === create.creator.id)!
    expect(user.email).toBe('john@example.com')
    expect(user.allergies).toEqual([
      { name: 'gluten', severity: 'severe', notes: null },
      { name: 'nuts', severity: 'mild', notes: 'only walnuts' },
    ])
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
    const joined = await new JoinAsNewUserHandler(repo).execute({
      eventId: create.event.id,
      name: 'Maite',
    })
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

  it('lets an adult who pays and has a child in their charge edit their profile', async () => {
    const w = await makeWorld()
    await new JoinAsNewUserHandler(w.repo).execute({
      eventId: w.eventId,
      name: 'Nora',
      kind: 'child',
      guardianId: w.alice,
    })
    await addExpense(w, 'Bread')
    const handler = new UpdateProfileHandler(w.repo)
    const ids = { eventId: w.eventId, userId: w.alice, actorId: w.alice }

    await handler.execute({ ...ids, email: 'alice@example.com' })
    const result = await handler.execute({ ...ids, kind: 'adult', phone: '600111222' })
    expect(result.event.users.find((u) => u.id === w.alice)).toMatchObject({
      kind: 'adult',
      email: 'alice@example.com',
      phone: '600111222',
    })
  })

  it('saves a household and clears it again', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const handler = new UpdateProfileHandler(repo)
    const ids = { eventId: create.event.id, userId: create.creator.id, actorId: create.creator.id }

    const grouped = await handler.execute({ ...ids, household: ' García ' })
    expect(grouped.event.users[0]!.household).toBe('García')

    const cleared = await handler.execute({ ...ids, household: null })
    expect(cleared.event.users[0]!.household).toBeNull()
  })

  it('drops the household when the adult becomes a child', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'John', creatorName: 'Ana' })
    const handler = new UpdateProfileHandler(repo)
    const ids = { eventId: create.event.id, userId: create.creator.id, actorId: create.creator.id }
    await handler.execute({ ...ids, household: 'García' })
    const result = await handler.execute({ ...ids, kind: 'child' })
    expect(result.event.users[0]!.household).toBeNull()
  })
})
