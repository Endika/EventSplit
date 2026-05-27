import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { SetEventDaysHandler } from '@/application/handlers/SetEventDaysHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'

describe('SetEventDaysHandler', () => {
  it('rejects empty days', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    await expect(
      new SetEventDaysHandler(repo).execute({ eventId: create.event.id, days: [] }),
    ).rejects.toThrow()
  })

  it('rejects duplicates', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    await expect(
      new SetEventDaysHandler(repo).execute({
        eventId: create.event.id,
        days: ['2026-06-05', '2026-06-05'],
      }),
    ).rejects.toThrow(/duplicate/i)
  })

  it('saves days and adds history entry', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    const result = await new SetEventDaysHandler(repo).execute({
      eventId: create.event.id,
      days: ['2026-06-05', '2026-06-06'],
    })
    expect(result.event.days).toEqual(['2026-06-05', '2026-06-06'])
    expect(result.event.history.at(-1)?.type).toBe('days_set')
  })

  it('aligns existing availability when days change', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    // First set 3 days
    await new SetEventDaysHandler(repo).execute({
      eventId: create.event.id,
      days: ['2026-06-05', '2026-06-06', '2026-06-07'],
    })
    // Manually inject availability into repo
    const row = await repo.findById(create.event.id)
    if (!row) throw new Error('unexpected')
    row.snapshot.availability[create.creator.id] = [true, false, true]
    await repo.update(create.event.id, row.snapshot, row.version)

    // Re-set days dropping the middle one
    const result = await new SetEventDaysHandler(repo).execute({
      eventId: create.event.id,
      days: ['2026-06-05', '2026-06-07'],
    })
    expect(result.event.availability[create.creator.id]).toEqual([true, true])
  })

  it('clears chosenDay when its day is dropped from the event', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    await new SetEventDaysHandler(repo).execute({
      eventId: create.event.id,
      days: ['2026-06-05', '2026-06-06', '2026-06-07'],
    })
    const row = await repo.findById(create.event.id)
    if (!row) throw new Error('unexpected')
    row.snapshot.chosenDay = '2026-06-06'
    await repo.update(create.event.id, row.snapshot, row.version)

    const result = await new SetEventDaysHandler(repo).execute({
      eventId: create.event.id,
      days: ['2026-06-05', '2026-06-07'],
    })
    expect(result.event.chosenDay).toBeNull()
  })

  it('keeps chosenDay when its day is still present', async () => {
    const repo = new InMemoryEventRepository()
    const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
    await new SetEventDaysHandler(repo).execute({
      eventId: create.event.id,
      days: ['2026-06-05', '2026-06-06'],
    })
    const row = await repo.findById(create.event.id)
    if (!row) throw new Error('unexpected')
    row.snapshot.chosenDay = '2026-06-05'
    await repo.update(create.event.id, row.snapshot, row.version)

    const result = await new SetEventDaysHandler(repo).execute({
      eventId: create.event.id,
      days: ['2026-06-05', '2026-06-07'],
    })
    expect(result.event.chosenDay).toBe('2026-06-05')
  })
})
