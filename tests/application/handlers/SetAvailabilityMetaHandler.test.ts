import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { SetEventDaysHandler } from '@/application/handlers/SetEventDaysHandler'
import { SetAvailabilityMetaHandler } from '@/application/handlers/SetAvailabilityMetaHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

async function setup() {
  const repo = new InMemoryEventRepository()
  const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
  await new SetEventDaysHandler(repo).execute({
    eventId: create.event.id,
    days: ['2026-06-05', '2026-06-06'],
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
      chosenDay: '2026-06-06',
    })
    expect(result.event.availabilityNote).toBe('Weekends only')
    expect(result.event.chosenDay).toBe('2026-06-06')

    const row = await repo.findById(eventId)
    expect(row?.snapshot.availabilityNote).toBe('Weekends only')
    expect(row?.snapshot.chosenDay).toBe('2026-06-06')
  })

  it('rejects a chosenDay not in days', async () => {
    const { repo, eventId, userId } = await setup()
    await expect(
      new SetAvailabilityMetaHandler(repo).execute({
        eventId,
        userId,
        note: null,
        chosenDay: '2099-01-01',
      }),
    ).rejects.toThrow(/chosenDay/)
  })

  it('rejects a user not in the event', async () => {
    const { repo, eventId } = await setup()
    await expect(
      new SetAvailabilityMetaHandler(repo).execute({
        eventId,
        userId: '00000000-0000-7000-8000-000000000000',
        note: null,
        chosenDay: '2026-06-05',
      }),
    ).rejects.toThrow(/not in event/i)
  })
})
