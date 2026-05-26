import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { SetEventDaysHandler } from '@/application/handlers/SetEventDaysHandler'
import { SetAvailabilityHandler } from '@/application/handlers/SetAvailabilityHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

describe('SetAvailabilityHandler', () => {
  it('rejects unknown user', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    await new SetEventDaysHandler(repo).execute({ eventId: create.event.id, days: ['2026-06-05'] })
    await expect(
      new SetAvailabilityHandler(repo).execute({
        eventId: create.event.id,
        userId: '018f4a8e-0000-7000-8000-000000000000',
        votes: [true],
      }),
    ).rejects.toThrow(/not in event/i)
  })

  it('rejects vote length mismatch', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    await new SetEventDaysHandler(repo).execute({
      eventId: create.event.id,
      days: ['2026-06-05', '2026-06-06'],
    })
    await expect(
      new SetAvailabilityHandler(repo).execute({
        eventId: create.event.id,
        userId: create.creator.id,
        votes: [true], // 1 vote vs 2 days
      }),
    ).rejects.toThrow(/length/i)
  })

  it('saves votes and bumps version', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    await new SetEventDaysHandler(repo).execute({
      eventId: create.event.id,
      days: ['2026-06-05', '2026-06-06'],
    })
    const result = await new SetAvailabilityHandler(repo).execute({
      eventId: create.event.id,
      userId: create.creator.id,
      votes: [true, false],
    })
    expect(result.event.availability[create.creator.id]).toEqual([true, false])
    expect(result.event.history.at(-1)?.type).toBe('availability_voted')
  })
})
