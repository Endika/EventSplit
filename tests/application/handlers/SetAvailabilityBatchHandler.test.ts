import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { JoinAsNewUserHandler } from '@/application/handlers/JoinAsNewUserHandler'
import { SetEventDaysHandler } from '@/application/handlers/SetEventDaysHandler'
import { SetAvailabilityBatchHandler } from '@/application/handlers/SetAvailabilityBatchHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

async function setup() {
  const repo = new InMemoryEventRepository()
  const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
  const join = await new JoinAsNewUserHandler(repo).execute({
    eventId: create.event.id, name: 'Maria',
  })
  await new SetEventDaysHandler(repo).execute({
    eventId: create.event.id, days: ['2026-06-05', '2026-06-06'],
  })
  return { repo, eventId: create.event.id, john: create.creator.id, maria: join.newUser.id }
}

describe('SetAvailabilityBatchHandler', () => {
  it('sets availability for multiple users in one write', async () => {
    const ctx = await setup()
    const result = await new SetAvailabilityBatchHandler(ctx.repo).execute({
      eventId: ctx.eventId,
      editedBy: ctx.john,
      votes: {
        [ctx.john]: [true, false],
        [ctx.maria]: [true, true],
      },
    })
    expect(result.event.availability[ctx.john]).toEqual([true, false])
    expect(result.event.availability[ctx.maria]).toEqual([true, true])
    expect(result.event.history.at(-1)?.type).toBe('availability_voted')
  })

  it('rejects votes whose length mismatches the day count', async () => {
    const ctx = await setup()
    await expect(
      new SetAvailabilityBatchHandler(ctx.repo).execute({
        eventId: ctx.eventId,
        editedBy: ctx.john,
        votes: { [ctx.john]: [true] }, // 1 vote vs 2 days
      }),
    ).rejects.toThrow(/length/i)
  })

  it('rejects unknown user in votes', async () => {
    const ctx = await setup()
    await expect(
      new SetAvailabilityBatchHandler(ctx.repo).execute({
        eventId: ctx.eventId,
        editedBy: ctx.john,
        votes: { '00000000-0000-7000-8000-000000000000': [true, false] },
      }),
    ).rejects.toThrow(/not in event/i)
  })

  it('rejects editor not in event', async () => {
    const ctx = await setup()
    await expect(
      new SetAvailabilityBatchHandler(ctx.repo).execute({
        eventId: ctx.eventId,
        editedBy: '00000000-0000-7000-8000-000000000000',
        votes: { [ctx.john]: [true, false] },
      }),
    ).rejects.toThrow(/not in event/i)
  })
})
