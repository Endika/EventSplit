import { describe, it, expect } from 'vitest'
import { Event } from '@/domain/entities/Event'
import { User } from '@/domain/entities/User'
import type { IEventChangeNotifier } from '@/domain/ports/IEventChangeNotifier'
import { InMemoryEventRepository } from '@/infrastructure/persistence/InMemoryEventRepository'
import { NotifyingEventRepository } from '@/infrastructure/persistence/NotifyingEventRepository'

class RecordingNotifier implements IEventChangeNotifier {
  published: { eventId: string; version: number }[] = []
  publish(eventId: string, version: number): void {
    this.published.push({ eventId, version })
  }
  subscribe(): () => void {
    return () => {}
  }
}

function newSnapshot() {
  return Event.create({ name: 'Trip', creator: User.create({ name: 'John' }) }).toSnapshot()
}

describe('NotifyingEventRepository', () => {
  it('publishes the new version after a successful create', async () => {
    const notifier = new RecordingNotifier()
    const repo = new NotifyingEventRepository(new InMemoryEventRepository(), notifier)
    const snapshot = newSnapshot()

    await repo.create(snapshot)

    expect(notifier.published).toEqual([{ eventId: snapshot.id, version: 1 }])
  })

  it('publishes the new version after a successful update', async () => {
    const notifier = new RecordingNotifier()
    const repo = new NotifyingEventRepository(new InMemoryEventRepository(), notifier)
    const snapshot = newSnapshot()
    await repo.create(snapshot)

    await repo.update(snapshot.id, { ...snapshot, name: 'Renamed' }, 1, null)

    expect(notifier.published.at(-1)).toEqual({ eventId: snapshot.id, version: 2 })
  })

  it('does not publish when an update fails with a version conflict', async () => {
    const notifier = new RecordingNotifier()
    const repo = new NotifyingEventRepository(new InMemoryEventRepository(), notifier)
    const snapshot = newSnapshot()
    await repo.create(snapshot)
    notifier.published.length = 0 // ignore the create notification

    await expect(repo.update(snapshot.id, snapshot, 99, null)).rejects.toThrow()

    expect(notifier.published).toEqual([])
  })

  it('does not publish on reads', async () => {
    const notifier = new RecordingNotifier()
    const repo = new NotifyingEventRepository(new InMemoryEventRepository(), notifier)
    const snapshot = newSnapshot()
    await repo.create(snapshot)
    notifier.published.length = 0

    await repo.findById(snapshot.id)
    await repo.getVersion(snapshot.id)

    expect(notifier.published).toEqual([])
  })
})
