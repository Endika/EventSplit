import { describe, it, expect } from 'vitest'
import { Event, type EventSnapshot } from '@/domain/entities/Event'
import { User } from '@/domain/entities/User'

describe('Event.restore', () => {
  it('keeps every field of a fully populated snapshot', () => {
    const full: EventSnapshot = {
      id: 'abc123x',
      name: 'Trip',
      createdBy: 'u-1',
      description: 'Weekend away',
      location: {
        name: 'Casa',
        address: 'Calle 1',
        lat: 1.5,
        lng: 2.5,
        postalCode: '28001',
        googleMapsUrl: 'https://maps.example/x',
      },
      generalNotes: 'Bring towels',
      wifiPassword: 'secret',
      emergencyContact: '112',
      users: [User.create({ name: 'John' }).toSnapshot()],
      availability: { 'u-1': [true, false] },
      availabilityNote: 'weekends',
      chosenOptions: ['2026-06-05..2026-06-05'],
      dayOptions: [{ start: '2026-06-05', end: '2026-06-05', note: 'n' }],
      purchases: [],
      groupOrder: ['Cena'],
      subgroupOrder: { Cena: ['Entrantes'] },
      expenses: [],
      hasPin: true,
      stage: 'expenses',
      settledTransfers: [{ from: 'a', to: 'b' }],
      manualLiquidations: [],
      history: [
        {
          id: 'h1',
          version: 1,
          timestamp: '2026-01-01T00:00:00Z',
          type: 'event_created',
          userId: 'u-1',
          description: 'Event created: Trip',
        },
      ],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    }
    expect(Event.restore(full).toSnapshot()).toEqual(full)
  })

  it('backfills every field a legacy snapshot lacks and numbers its next history entry 1', () => {
    const legacy = {
      id: 'abc123x',
      name: 'Old trip',
      createdBy: 'user-old',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    } as EventSnapshot
    const restored = Event.restore(legacy)
    expect(restored.toSnapshot()).toEqual({
      ...legacy,
      description: null,
      location: null,
      generalNotes: null,
      wifiPassword: null,
      emergencyContact: null,
      users: [],
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
      history: [],
    })
    const joined = restored.addUser(User.create({ name: 'Maria' })).toSnapshot()
    expect(joined.history.map((h) => h.version)).toEqual([1])
  })
})
