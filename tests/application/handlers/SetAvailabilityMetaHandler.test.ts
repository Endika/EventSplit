import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { SetDayOptionsHandler } from '@/application/handlers/SetDayOptionsHandler'
import { SetAvailabilityMetaHandler } from '@/application/handlers/SetAvailabilityMetaHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

async function setup() {
  const repo = new InMemoryEventRepository()
  const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
  await new SetDayOptionsHandler(repo).execute({
    eventId: create.event.id,
    options: [
      { start: '2026-06-05', end: '2026-06-05', note: null },
      { start: '2026-06-06', end: '2026-06-06', note: null },
    ],
  })
  return { repo, eventId: create.event.id, userId: create.creator.id }
}

describe('SetAvailabilityMetaHandler', () => {
  it('persists note and chosen day', async () => {
    const { repo, eventId, userId } = await setup()
    const result = await new SetAvailabilityMetaHandler(repo).execute({
      eventId,
      userId,
      note: 'Weekends only',
      chosenOptions: ['2026-06-06..2026-06-06'],
    })
    expect(result.event.availabilityNote).toBe('Weekends only')
    expect(result.event.chosenOptions).toEqual(['2026-06-06..2026-06-06'])

    const row = await repo.findById(eventId)
    expect(row?.snapshot.availabilityNote).toBe('Weekends only')
    expect(row?.snapshot.chosenOptions).toEqual(['2026-06-06..2026-06-06'])
  })

  it('rejects a chosen option that is not an event option', async () => {
    const { repo, eventId, userId } = await setup()
    await expect(
      new SetAvailabilityMetaHandler(repo).execute({
        eventId,
        userId,
        note: null,
        chosenOptions: ['2099-01-01..2099-01-01'],
      }),
    ).rejects.toThrow(/chosenOptions/)
  })

  it('rejects a user not in the event', async () => {
    const { repo, eventId } = await setup()
    await expect(
      new SetAvailabilityMetaHandler(repo).execute({
        eventId,
        userId: '00000000-0000-7000-8000-000000000000',
        note: null,
        chosenOptions: ['2026-06-05..2026-06-05'],
      }),
    ).rejects.toThrow(/not in event/i)
  })
})
