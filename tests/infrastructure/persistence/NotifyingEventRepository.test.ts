import { describe, it, expect, vi } from 'vitest'
import type { IEventRepository } from '@/domain/repositories/IEventRepository'
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

  it('passes reads and PIN calls straight through to the inner repository without publishing', async () => {
    const notifier = new RecordingNotifier()
    const inner = {
      findById: vi.fn(async () => null),
      getVersion: vi.fn(async () => 4),
      setPin: vi.fn(async () => undefined),
      verifyPin: vi.fn(async () => true),
    }
    const repo = new NotifyingEventRepository(inner as unknown as IEventRepository, notifier)

    expect(await repo.findById('e1', '1234')).toBeNull()
    expect(await repo.getVersion('e1')).toBe(4)
    await repo.setPin('e1', '5678', '1234')
    expect(await repo.verifyPin('e1', '1234')).toBe(true)

    expect(inner.findById).toHaveBeenCalledExactlyOnceWith('e1', '1234')
    expect(inner.getVersion).toHaveBeenCalledExactlyOnceWith('e1')
    expect(inner.setPin).toHaveBeenCalledExactlyOnceWith('e1', '5678', '1234')
    expect(inner.verifyPin).toHaveBeenCalledExactlyOnceWith('e1', '1234')
    expect(notifier.published).toEqual([])
  })

  it('publishes version -1 after a delete, but nothing when the delete is refused', async () => {
    const notifier = new RecordingNotifier()
    const inner = new InMemoryEventRepository()
    const repo = new NotifyingEventRepository(inner, notifier)
    const snapshot = newSnapshot()
    await repo.create(snapshot)
    await inner.setPin(snapshot.id, '1234', null)
    notifier.published.length = 0

    await expect(repo.deleteEvent(snapshot.id, '0000')).rejects.toThrow()
    expect(notifier.published).toEqual([])

    await repo.deleteEvent(snapshot.id, '1234')
    expect(notifier.published).toEqual([{ eventId: snapshot.id, version: -1 }])
    expect(await inner.getVersion(snapshot.id)).toBeNull()
  })
})
