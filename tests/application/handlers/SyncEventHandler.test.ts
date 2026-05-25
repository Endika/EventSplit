import { describe, it, expect } from 'vitest'
import { SyncEventHandler } from '@/application/handlers/SyncEventHandler'
import { Event, type EventSnapshot } from '@/domain/entities/Event'
import { User } from '@/domain/entities/User'

describe('SyncEventHandler', () => {
  const make = (): { snapshot: EventSnapshot; version: number } => {
    const e = Event.create({ name: 'Trip', creator: User.create({ name: 'John' }) })
    return { snapshot: e.toSnapshot(), version: 1 }
  }

  it('keeps local when remote version is older', () => {
    const local = make()
    const remote = { ...local, version: 0 }
    const result = new SyncEventHandler().merge({ local, remote })
    expect(result.applied).toBe(false)
    expect(result.snapshot).toBe(local.snapshot)
  })

  it('replaces local when remote version is newer', () => {
    const local = make()
    const remote = { snapshot: { ...local.snapshot, name: 'Renamed' }, version: 2 }
    const result = new SyncEventHandler().merge({ local, remote })
    expect(result.applied).toBe(true)
    expect(result.snapshot.name).toBe('Renamed')
    expect(result.version).toBe(2)
  })

  it('no-op when versions match', () => {
    const local = make()
    const result = new SyncEventHandler().merge({ local, remote: local })
    expect(result.applied).toBe(false)
  })
})
