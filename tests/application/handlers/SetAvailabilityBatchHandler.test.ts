import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { JoinAsNewUserHandler } from '@/application/handlers/JoinAsNewUserHandler'
import { SetDayOptionsHandler } from '@/application/handlers/SetDayOptionsHandler'
import { SetAvailabilityBatchHandler } from '@/application/handlers/SetAvailabilityBatchHandler'
import { SetAvailabilityBatchSchema } from '@/application/dtos/SetAvailabilityBatchDTO'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

async function setup() {
  const repo = new InMemoryEventRepository()
  const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
  const join = await new JoinAsNewUserHandler(repo).execute({
    eventId: create.event.id,
    name: 'Maria',
  })
  await new SetDayOptionsHandler(repo).execute({
    eventId: create.event.id,
    options: [
      { start: '2026-06-05', end: '2026-06-05', note: null },
      { start: '2026-06-06', end: '2026-06-06', note: null },
    ],
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

  it('leaves other users votes untouched when only one row is sent', async () => {
    const ctx = await setup()
    await new SetAvailabilityBatchHandler(ctx.repo).execute({
      eventId: ctx.eventId,
      editedBy: ctx.john,
      votes: { [ctx.john]: [false, false], [ctx.maria]: [true, true] },
    })

    const result = await new SetAvailabilityBatchHandler(ctx.repo).execute({
      eventId: ctx.eventId,
      editedBy: ctx.john,
      votes: { [ctx.john]: [true, false] },
    })

    expect(result.event.availability[ctx.john]).toEqual([true, false])
    expect(result.event.availability[ctx.maria]).toEqual([true, true])
  })

  it('accepts 31 options worth of votes but not 32', () => {
    const base = { eventId: 'abc123x', editedBy: '0197c3f6-0000-7000-8000-000000000001' }
    expect(() =>
      SetAvailabilityBatchSchema.parse({
        ...base,
        votes: { '0197c3f6-0000-7000-8000-000000000001': Array(31).fill(true) },
      }),
    ).not.toThrow()
    expect(() =>
      SetAvailabilityBatchSchema.parse({
        ...base,
        votes: { '0197c3f6-0000-7000-8000-000000000001': Array(32).fill(true) },
      }),
    ).toThrow()
  })
})
