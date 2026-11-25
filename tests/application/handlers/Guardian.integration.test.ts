import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { JoinAsNewUserHandler } from '@/application/handlers/JoinAsNewUserHandler'
import { UpdateProfileHandler } from '@/application/handlers/UpdateProfileHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

async function event() {
  const repo = new InMemoryEventRepository()
  const created = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'Ekin' })
  return { repo, eventId: created.event.id, ekin: created.event.users[0]! }
}

describe('a child in an adult’s charge', () => {
  it('refuses a dog as the adult in charge', async () => {
    const { repo, eventId } = await event()
    const dog = await new JoinAsNewUserHandler(repo).execute({
      eventId,
      name: 'Toby',
      alias: null,
      kind: 'dog',
    })
    await expect(
      new JoinAsNewUserHandler(repo).execute({
        eventId,
        name: 'Nora',
        alias: null,
        kind: 'child',
        guardianId: dog.newUser.id,
      }),
    ).rejects.toThrow(/adult/)
  })

  it('will not let the adult in charge stop being an adult', async () => {
    const { repo, eventId, ekin } = await event()
    await new JoinAsNewUserHandler(repo).execute({
      eventId,
      name: 'Nora',
      alias: null,
      kind: 'child',
      guardianId: ekin.id,
    })
    await expect(
      new UpdateProfileHandler(repo).execute({
        eventId,
        userId: ekin.id,
        actorId: ekin.id,
        kind: 'dog',
      }),
    ).rejects.toThrow(/charge|dog/)
  })

  it('leaves events written before this build untouched', async () => {
    const { repo, eventId } = await event()
    const joined = await new JoinAsNewUserHandler(repo).execute({
      eventId,
      name: 'Nora',
      alias: null,
      kind: 'child',
    })
    expect(joined.event.users.find((u) => u.name === 'Nora')!.guardianId).toBeNull()
  })
})
