import { describe, it, expect } from 'vitest'
import { CreateEventHandler } from '@/application/handlers/CreateEventHandler'
import { SetDayOptionsHandler } from '@/application/handlers/SetDayOptionsHandler'
import { SetAvailabilityBatchHandler } from '@/application/handlers/SetAvailabilityBatchHandler'
import { SetAvailabilityMetaHandler } from '@/application/handlers/SetAvailabilityMetaHandler'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'
import type { EventSnapshot } from '@/domain/entities/Event'
import type {
  IEventRepository,
  ReadResult,
  SaveResult,
} from '@/domain/repositories/IEventRepository'
import { MAX_NOTE_LEN, MAX_OPTIONS, optionKey } from '@/domain/value-objects/DayOption'

/**
 * Counts writes without faking any behaviour: it delegates to the real
 * in-memory repository. An event is one JSONB blob and every write makes each
 * connected client re-download it, so the write count *is* the egress bill.
 */
class CountingRepository implements IEventRepository {
  updates = 0
  constructor(private readonly inner: IEventRepository) {}

  findById(id: string): Promise<ReadResult | null> {
    return this.inner.findById(id)
  }
  getVersion(id: string): Promise<number | null> {
    return this.inner.getVersion(id)
  }
  create(snapshot: EventSnapshot): Promise<SaveResult> {
    return this.inner.create(snapshot)
  }
  update(
    id: string,
    snapshot: EventSnapshot,
    expectedVersion: number,
    pin: string | null,
  ): Promise<SaveResult> {
    this.updates += 1
    return this.inner.update(id, snapshot, expectedVersion, pin)
  }
  setPin(id: string, newPin: string | null, currentPin: string | null): Promise<void> {
    return this.inner.setPin(id, newPin, currentPin)
  }
  verifyPin(id: string, pin: string): Promise<boolean> {
    return this.inner.verifyPin(id, pin)
  }
  deleteEvent(id: string, pin: string | null): Promise<void> {
    return this.inner.deleteEvent(id, pin)
  }
}

const ten = Array.from({ length: 10 }, (_, i) => ({
  start: `2026-06-${`${i + 1}`.padStart(2, '0')}`,
  end: `2026-06-${`${i + 1}`.padStart(2, '0')}`,
  note: null,
}))

describe('availability egress', () => {
  it('a full editing cycle is one write per area that changed', async () => {
    const inner = new InMemoryEventRepository()
    const create = await new CreateEventHandler(inner).execute({
      name: 'Trip',
      creatorName: 'John',
    })
    const repo = new CountingRepository(inner)

    // Ten days picked in one go: one write, not one per day tapped.
    await new SetDayOptionsHandler(repo).execute({ eventId: create.event.id, options: ten })
    expect(repo.updates).toBe(1)

    // Every vote of the cycle: one write.
    await new SetAvailabilityBatchHandler(repo).execute({
      eventId: create.event.id,
      editedBy: create.creator.id,
      votes: { [create.creator.id]: ten.map((_, i) => i % 2 === 0) },
    })
    expect(repo.updates).toBe(2)

    // Two options pinned plus the shared note: one write, not one per pin.
    await new SetAvailabilityMetaHandler(repo).execute({
      eventId: create.event.id,
      userId: create.creator.id,
      note: 'solo fines de semana',
      chosenOptions: [optionKey(ten[0]!), optionKey(ten[3]!)],
    })
    expect(repo.updates).toBe(3)
  })

  it('picking ten days costs the same single write as picking one', async () => {
    const inner = new InMemoryEventRepository()
    const create = await new CreateEventHandler(inner).execute({
      name: 'Trip',
      creatorName: 'John',
    })
    const repo = new CountingRepository(inner)
    await new SetDayOptionsHandler(repo).execute({
      eventId: create.event.id,
      options: [ten[0]!],
    })
    const afterOne = repo.updates
    await new SetDayOptionsHandler(repo).execute({ eventId: create.event.id, options: ten })
    expect(repo.updates - afterOne).toBe(1)
  })

  it('the availability part of the blob stays under 5 KB at full load', () => {
    const options = Array.from({ length: MAX_OPTIONS }, (_, i) => ({
      start: `2026-06-${`${(i % 30) + 1}`.padStart(2, '0')}`,
      end: `2026-06-${`${(i % 30) + 1}`.padStart(2, '0')}`,
      note: 'x'.repeat(MAX_NOTE_LEN),
    }))
    const weight = JSON.stringify({
      dayOptions: options,
      chosenOptions: options.slice(0, 3).map(optionKey),
      availability: { u1: options.map(() => true) },
    }).length
    // Measured: 4380 bytes with 31 options, an 80-char note on each and a full
    // vote row. That is the accepted ceiling, and the reason for both caps.
    expect(weight).toBeLessThan(5120)
  })
})
