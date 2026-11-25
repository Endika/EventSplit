import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { SetDayOptionsHandler } from '@/application/handlers/SetDayOptionsHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'
import { optionKey, type DayOption } from '@/domain/value-objects/DayOption'
import { lastEntry } from '../../support/world'
import { readEvent } from '../../support/readEvent'

const day = (d: string, note: string | null = null): DayOption => ({ start: d, end: d, note })

async function setup(options: DayOption[] = []) {
  const repo = new InMemoryEventRepository()
  const create = await new CreateEventHandler(repo).execute({ name: 'Trip', creatorName: 'John' })
  const handler = new SetDayOptionsHandler(repo)
  const eventId = create.event.id
  const userId = create.creator.id
  if (options.length > 0) await handler.execute({ eventId, options })
  return { repo, handler, eventId, userId }
}

describe('SetDayOptionsHandler', () => {
  it('saves options and adds a history entry', async () => {
    const { handler, eventId, userId } = await setup()
    const result = await handler.execute({
      eventId,
      options: [day('2026-06-05'), { start: '2026-06-12', end: '2026-06-14', note: 'casa rural' }],
    })
    expect(result.event.dayOptions).toEqual([
      day('2026-06-05'),
      { start: '2026-06-12', end: '2026-06-14', note: 'casa rural' },
    ])
    expect(lastEntry(result.event)).toEqual({
      type: 'days_set',
      userId,
      description: 'Event day options set: 2026-06-05..2026-06-05, 2026-06-12..2026-06-14',
    })
  })

  it('realigns saved votes by option key when options change', async () => {
    const { repo, handler, eventId, userId } = await setup([
      day('2026-06-05'),
      { start: '2026-06-12', end: '2026-06-14', note: null },
    ])
    const row = await readEvent(repo, eventId)
    if (!row) throw new Error('unexpected')
    row.snapshot.availability[userId] = [true, true]
    row.snapshot.availability['ragged'] = [true]
    await repo.update(eventId, row.snapshot, row.version, null)

    const result = await handler.execute({
      eventId,
      options: [
        { start: '2026-06-12', end: '2026-06-14', note: null },
        { start: '2026-06-20', end: '2026-06-21', note: null },
      ],
    })
    // A row shorter than the options it was saved against must not read past its end.
    expect(result.event.availability['ragged']).toEqual([false, false])

    expect(result.event.dayOptions.map(optionKey)).toEqual([
      '2026-06-12..2026-06-14',
      '2026-06-20..2026-06-21',
    ])
    expect(result.event.availability[userId]).toEqual([true, false])
  })

  it('drops chosen options whose option is gone', async () => {
    const { repo, handler, eventId } = await setup([
      day('2026-06-05'),
      { start: '2026-06-12', end: '2026-06-14', note: null },
    ])
    const row = await readEvent(repo, eventId)
    if (!row) throw new Error('unexpected')
    row.snapshot.chosenOptions = ['2026-06-05..2026-06-05', '2026-06-12..2026-06-14']
    await repo.update(eventId, row.snapshot, row.version, null)

    const result = await handler.execute({
      eventId,
      options: [{ start: '2026-06-12', end: '2026-06-14', note: null }],
    })
    expect(result.event.chosenOptions).toEqual(['2026-06-12..2026-06-14'])
  })

  it('rejects more than 31 options', async () => {
    const { handler, eventId } = await setup()
    const many = Array.from({ length: 32 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 6, i + 1)).toISOString().slice(0, 10)
      return day(d)
    })
    await expect(handler.execute({ eventId, options: many })).rejects.toThrow()
  })

  it('rejects a range longer than 31 days', async () => {
    const { handler, eventId } = await setup()
    await expect(
      handler.execute({
        eventId,
        options: [{ start: '2026-06-01', end: '2026-07-02', note: null }],
      }),
    ).rejects.toThrow()
  })

  it('rejects duplicate options', async () => {
    const { handler, eventId } = await setup()
    await expect(
      handler.execute({ eventId, options: [day('2026-06-05'), day('2026-06-05')] }),
    ).rejects.toThrow(/duplicate/i)
  })

  it('rejects a note longer than 80 characters', async () => {
    const { handler, eventId } = await setup()
    await expect(
      handler.execute({ eventId, options: [day('2026-06-05', 'x'.repeat(81))] }),
    ).rejects.toThrow()
  })

  it('editing only a note keeps every vote in place', async () => {
    const { repo, handler, eventId, userId } = await setup([
      { start: '2026-06-12', end: '2026-06-14', note: null },
    ])
    const row = await readEvent(repo, eventId)
    if (!row) throw new Error('unexpected')
    row.snapshot.availability[userId] = [true]
    await repo.update(eventId, row.snapshot, row.version, null)

    const result = await handler.execute({
      eventId,
      options: [{ start: '2026-06-12', end: '2026-06-14', note: 'casa rural 120 €' }],
    })

    expect(result.event.dayOptions[0]?.note).toBe('casa rural 120 €')
    expect(result.event.availability[userId]).toEqual([true])
  })
})
