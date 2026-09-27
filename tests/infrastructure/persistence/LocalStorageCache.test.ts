import { describe, it, expect, beforeEach } from 'vitest'
import { LocalStorageCache } from '@/infrastructure/persistence/LocalStorageCache'
import { Event } from '@/domain/entities/Event'
import { User } from '@/domain/entities/User'
import { UnlockedPinHolder } from '@/shared/di/UnlockedPinHolder'

describe('LocalStorageCache', () => {
  beforeEach(() => localStorage.clear())

  const sample = () =>
    Event.create({ name: 'Trip', creator: User.create({ name: 'John' }) }).toSnapshot()

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

  it('listAll returns empty array when nothing cached', () => {
    expect(new LocalStorageCache().listAll()).toEqual([])
  })

  it('listAll returns event summaries sorted by updatedAt desc', () => {
    const cache = new LocalStorageCache()
    const e1 = Event.create({ name: 'Older', creator: User.create({ name: 'John' }) }).toSnapshot()
    const e2 = Event.create({ name: 'Newer', creator: User.create({ name: 'Maria' }) }).toSnapshot()
    // Make e2 newer
    e2.updatedAt = '2026-06-01T12:00:00Z'
    e1.updatedAt = '2026-01-01T12:00:00Z'
    cache.set(e1.id, { snapshot: e1, version: 1 })
    cache.set(e2.id, { snapshot: e2, version: 1 })

    const list = cache.listAll()
    expect(list).toHaveLength(2)
    expect(list[0]!.name).toBe('Newer')
    expect(list[1]!.name).toBe('Older')
    expect(list[0]!.participantCount).toBe(1)
  })

  it('listAll skips corrupted entries', () => {
    const cache = new LocalStorageCache()
    const e = Event.create({ name: 'Good', creator: User.create({ name: 'John' }) }).toSnapshot()
    cache.set(e.id, { snapshot: e, version: 1 })
    localStorage.setItem('eventsplit.event.broken1', '{not json')
    expect(cache.listAll()).toHaveLength(1)
  })

  it('listAll ignores unrelated localStorage keys', () => {
    const cache = new LocalStorageCache()
    const e = Event.create({ name: 'Mine', creator: User.create({ name: 'John' }) }).toSnapshot()
    cache.set(e.id, { snapshot: e, version: 1 })
    localStorage.setItem('eventsplit.identity.xxxxxxx', '{"id":"x","name":"y","alias":null}')
    localStorage.setItem('some.other.key', 'whatever')
    expect(cache.listAll()).toHaveLength(1)
  })

  it('remove deletes both event and identity entries', () => {
    const cache = new LocalStorageCache()
    const e = Event.create({ name: 'Trip', creator: User.create({ name: 'John' }) }).toSnapshot()
    cache.set(e.id, { snapshot: e, version: 1 })
    cache.setIdentity(e.id, { id: 'uid', name: 'John', alias: null })
    cache.remove(e.id)
    expect(cache.get(e.id)).toBeNull()
    expect(cache.getIdentity(e.id)).toBeNull()
  })

  it('forgetting an event also forgets the PIN remembered for it, and only that one', () => {
    const cache = new LocalStorageCache()
    const pins = new UnlockedPinHolder()
    const s = sample()
    cache.set(s.id, { snapshot: s, version: 1 })
    pins.set(s.id, '1234')
    pins.set('other12', '5678')

    cache.remove(s.id)

    expect(pins.get(s.id)).toBeNull()
    expect(pins.get('other12')).toBe('5678')
  })

  it('listAll drops a PIN-protected event this device holds no PIN for', () => {
    const cache = new LocalStorageCache()
    const s = { ...sample(), hasPin: true }
    cache.set(s.id, { snapshot: s, version: 1 })

    expect(cache.listAll()).toEqual([])
    expect(cache.get(s.id)).toBeNull()
  })

  it('listAll keeps a PIN-protected event this device has the PIN for', () => {
    const cache = new LocalStorageCache()
    const pins = new UnlockedPinHolder()
    const s = { ...sample(), hasPin: true }
    cache.set(s.id, { snapshot: s, version: 1 })
    pins.set(s.id, '1234')

    const list = cache.listAll()
    expect(list).toHaveLength(1)
    expect(list[0]!.name).toBe('Trip')
  })

  it('listAll keeps a PIN-less event with no stored PIN', () => {
    const cache = new LocalStorageCache()
    const s = sample()
    cache.set(s.id, { snapshot: s, version: 1 })

    const list = cache.listAll()
    expect(list).toHaveLength(1)
    expect(list[0]!.name).toBe('Trip')
  })

  it('loads a hardcoded event snapshot literal in the shape the current version writes', () => {
    const literal = JSON.stringify({
      snapshot: {
        id: 'lit0001',
        name: 'Camping trip',
        createdBy: 'usr0001',
        description: null,
        location: null,
        generalNotes: null,
        wifiPassword: null,
        emergencyContact: null,
        users: [
          {
            id: 'usr0001',
            name: 'John',
            alias: null,
            joinedAt: '2026-01-01T10:00:00Z',
            email: null,
            phone: null,
            allergies: [],
            dietary: null,
            notes: null,
            kind: 'adult',
            guardianId: null,
          },
        ],
        availability: {},
        availabilityNote: null,
        chosenOptions: [],
        dayOptions: [],
        purchases: [],
        groupOrder: [],
        subgroupOrder: {},
        expenses: [],
        hasPin: false,
        stage: 'doodle',
        settledTransfers: [],
        manualLiquidations: [],
        history: [
          {
            id: 'hist0001',
            version: 1,
            timestamp: '2026-01-01T10:00:00Z',
            type: 'event_created',
            userId: 'usr0001',
            description: 'Event created: Camping trip',
          },
        ],
        createdAt: '2026-01-01T10:00:00Z',
        updatedAt: '2026-01-01T10:00:00Z',
      },
      version: 3,
    })
    localStorage.setItem('eventsplit.event.lit0001', literal)

    const loaded = new LocalStorageCache().get('lit0001')

    expect(loaded?.version).toBe(3)
    expect(loaded?.snapshot.name).toBe('Camping trip')
    expect(loaded?.snapshot.users).toHaveLength(1)
    expect(loaded?.snapshot.history).toHaveLength(1)
  })

  it('loads a hardcoded identity literal in the shape the current version writes', () => {
    localStorage.setItem(
      'eventsplit.identity.lit0002',
      JSON.stringify({ id: 'usr0002', name: 'Ana', alias: 'Anita' }),
    )

    expect(new LocalStorageCache().getIdentity('lit0002')).toEqual({
      id: 'usr0002',
      name: 'Ana',
      alias: 'Anita',
    })
  })

  it('dropping only the snapshot keeps the identity for that event', () => {
    const cache = new LocalStorageCache()
    const s = sample()
    cache.set(s.id, { snapshot: s, version: 1 })
    cache.setIdentity(s.id, { id: 'uid', name: 'John', alias: null })

    cache.removeSnapshot(s.id)

    expect(cache.get(s.id)).toBeNull()
    expect(cache.listAll()).toEqual([])
    expect(cache.getIdentity(s.id)?.name).toBe('John')
  })
})
