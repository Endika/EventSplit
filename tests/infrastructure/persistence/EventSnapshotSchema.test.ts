import { describe, it, expect } from 'vitest'
import { parseEventSnapshot } from '@/infrastructure/persistence/EventSnapshotSchema'

describe('EventSnapshotSchema', () => {
  it('parses a minimal valid snapshot and fills defaults', () => {
    const minimal = {
      id: 'abc123x',
      name: 'Test',
      createdBy: 'user1',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      users: [],
    }
    const parsed = parseEventSnapshot(minimal)
    expect(parsed.hasPin).toBe(false)
    expect(parsed.dayOptions).toEqual([])
    expect(parsed.chosenOptions).toEqual([])
    expect(parsed.availability).toEqual({})
    expect(parsed.location).toBeNull()
    expect(parsed.expenses).toEqual([])
    expect(parsed.purchases).toEqual([])
    expect(parsed.history).toEqual([])
  })

  it('fills user defaults (kind, allergies, email, etc.)', () => {
    const snapshot = {
      id: 'abc123x',
      name: 'Test',
      createdBy: 'user1',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      users: [{ id: 'u1', name: 'Old', alias: null, joinedAt: '2026-01-01T00:00:00Z' }],
    }
    const parsed = parseEventSnapshot(snapshot)
    expect(parsed.users[0]!.kind).toBe('adult')
    expect(parsed.users[0]!.allergies).toEqual([])
    expect(parsed.users[0]!.email).toBeNull()
  })

  it('fills expense splitAmong default', () => {
    const snapshot = {
      id: 'abc123x',
      name: 'Test',
      createdBy: 'user1',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      users: [],
      expenses: [
        {
          id: 'e1',
          paidBy: 'u1',
          cents: 100,
          description: 'Test',
          date: '2026-01-01T00:00:00Z',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
    }
    const parsed = parseEventSnapshot(snapshot)
    expect(parsed.expenses[0]!.splitAmong).toEqual([])
    expect(parsed.expenses[0]!.currency).toBe('EUR')
  })

  it('throws a descriptive error on missing required fields', () => {
    const bad = { id: 'abc123x' }
    expect(() => parseEventSnapshot(bad)).toThrow(/validation failed/i)
  })

  it('mirrors a real legacy event shape (from production)', () => {
    const real = {
      id: '7fv2lk2',
      days: ['2026-06-05'],
      name: 'Demo movil',
      users: [
        {
          id: '019e6345-9df0-7541-8d82-87fb7667b90b',
          name: 'Endika',
          alias: 'Endi',
          email: null,
          notes: null,
          phone: null,
          dietary: 'No pescado',
          joinedAt: '2026-05-26T07:52:47.348Z',
          allergies: [],
        },
      ],
      history: [
        {
          id: '2fe4b0d8-1d9d-4d1c-97bf-4c1bf261f772',
          type: 'event_created',
          after: { name: 'Demo movil' },
          before: null,
          userId: '019e6345-9df0-7541-8d82-87fb7667b90b',
          version: 1,
          timestamp: '2026-05-26T07:52:47.351Z',
          description: 'Event created: Demo movil',
        },
      ],
      expenses: [],
      location: null,
      createdAt: '2026-05-26T07:52:47.351Z',
      createdBy: '019e6345-9df0-7541-8d82-87fb7667b90b',
      purchases: [],
      updatedAt: '2026-05-26T09:26:19.667Z',
      description: null,
      availability: {},
      generalNotes: null,
      wifiPassword: null,
      emergencyContact: null,
    }
    const parsed = parseEventSnapshot(real)
    expect(parsed.users[0]!.kind).toBe('adult') // backfilled
    expect(parsed.hasPin).toBe(false) // backfilled
  })

  it('migrates legacy days into single-day options', () => {
    const parsed = parseEventSnapshot({
      id: 'abc123x',
      name: 'Viaje',
      createdBy: 'u1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      days: ['2026-06-05', '2026-06-06'],
      chosenDay: '2026-06-06',
      availability: { u1: [true, false] },
    })
    expect(parsed.dayOptions).toEqual([
      { start: '2026-06-05', end: '2026-06-05', note: null },
      { start: '2026-06-06', end: '2026-06-06', note: null },
    ])
    expect(parsed.chosenOptions).toEqual(['2026-06-06..2026-06-06'])
    expect(parsed.availability.u1).toEqual([true, false])
    expect('days' in parsed).toBe(false)
    expect('chosenDay' in parsed).toBe(false)
  })

  it('reads a v4 blob straight through and drops invalid options', () => {
    const parsed = parseEventSnapshot({
      id: 'abc123x',
      name: 'Viaje',
      createdBy: 'u1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      dayOptions: [
        { start: '2026-06-12', end: '2026-06-14', note: 'casa rural' },
        { start: '2026-06-20', end: '2026-06-18', note: null },
      ],
      chosenOptions: ['2026-06-12..2026-06-14', '2099-01-01..2099-01-01'],
    })
    expect(parsed.dayOptions).toEqual([
      { start: '2026-06-12', end: '2026-06-14', note: 'casa rural' },
    ])
    expect(parsed.chosenOptions).toEqual(['2026-06-12..2026-06-14'])
  })

  it('legacy chosenDay null becomes an empty chosenOptions', () => {
    const parsed = parseEventSnapshot({
      id: 'abc123x',
      name: 'Viaje',
      createdBy: 'u1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      days: ['2026-06-05'],
      chosenDay: null,
    })
    expect(parsed.chosenOptions).toEqual([])
  })

  it('sorts the options it reads', () => {
    const parsed = parseEventSnapshot({
      id: 'abc123x',
      name: 'Viaje',
      createdBy: 'u1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      dayOptions: [
        { start: '2026-06-12', end: '2026-06-14', note: null },
        { start: '2026-06-05', end: '2026-06-05', note: null },
      ],
    })
    expect(parsed.dayOptions.map((o) => o.start)).toEqual(['2026-06-05', '2026-06-12'])
  })
})
