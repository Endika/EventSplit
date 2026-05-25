import { describe, it, expect, beforeEach } from 'vitest'
import { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import { Event } from '@/domain/entities/Event'
import { User } from '@/domain/entities/User'

describe('LocalStorageCache', () => {
  beforeEach(() => localStorage.clear())

  const sample = () => Event.create({ name: 'Trip', creator: User.create({ name: 'John' }) }).toSnapshot()

  it('returns null when nothing cached', () => {
    expect(new LocalStorageCache().get('missing')).toBeNull()
  })

  it('round-trips an event', () => {
    const cache = new LocalStorageCache()
    const s = sample()
    cache.set(s.id, { snapshot: s, version: 1 })
    expect(cache.get(s.id)?.snapshot.name).toBe('Trip')
    expect(cache.get(s.id)?.version).toBe(1)
  })

  it('saves and reads the per-event user identity', () => {
    const cache = new LocalStorageCache()
    cache.setIdentity('abc1234', { id: 'uid', name: 'John', alias: null })
    expect(cache.getIdentity('abc1234')?.name).toBe('John')
  })

  it('returns null on corrupted payload', () => {
    localStorage.setItem('eventsplit.event.bad1234', '{not json')
    expect(new LocalStorageCache().get('bad1234')).toBeNull()
  })
})
