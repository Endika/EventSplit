import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { JoinAsNewUserHandler } from '@/application/handlers/JoinAsNewUserHandler'
import { AddExpenseHandler } from '@/application/handlers/AddExpenseHandler'
import { UpdateProfileHandler } from '@/application/handlers/UpdateProfileHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

async function eventWithTwoPeople() {
  const repo = new InMemoryEventRepository()
  const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'Iker' })
  const joined = await new JoinAsNewUserHandler(repo).execute({
    eventId: create.event.id,
    name: 'Ane',
    alias: null,
  })
  const iker = create.event.users[0]!
  const ane = joined.event.users.find((u) => u.name === 'Ane')!
  return { repo, eventId: create.event.id, iker, ane }
}

describe('turning a participant into a dog', () => {
  it('is refused once they have paid for something', async () => {
    const { repo, eventId, ane } = await eventWithTwoPeople()
    await new AddExpenseHandler(repo).execute({
      eventId,
      paidBy: ane.id,
      amountEuros: 10,
      description: 'Cena',
    })

    await expect(
      new UpdateProfileHandler(repo).execute({
        eventId,
        userId: ane.id,
        actorId: ane.id,
        kind: 'dog',
      }),
    ).rejects.toThrow(/dog/)

    const row = await repo.findById(eventId)
    expect(row!.snapshot.users.find((u) => u.id === ane.id)!.kind).toBe('adult')
  })

  it('is allowed for someone who has paid nothing', async () => {
    const { repo, eventId, ane } = await eventWithTwoPeople()
    const result = await new UpdateProfileHandler(repo).execute({
      eventId,
      userId: ane.id,
      actorId: ane.id,
      kind: 'dog',
    })
    expect(result.event.users.find((u) => u.id === ane.id)!.kind).toBe('dog')
  })

  it('still lets a dog stop being one', async () => {
    const { repo, eventId } = await eventWithTwoPeople()
    const joined = await new JoinAsNewUserHandler(repo).execute({
      eventId,
      name: 'Toby',
      alias: null,
      kind: 'dog',
    })
    const toby = joined.event.users.find((u) => u.name === 'Toby')!
    const result = await new UpdateProfileHandler(repo).execute({
      eventId,
      userId: toby.id,
      actorId: toby.id,
      kind: 'adult',
    })
    expect(result.event.users.find((u) => u.id === toby.id)!.kind).toBe('adult')
  })
})
