import { describe, it, expect } from 'vitest'
import { parseEventSnapshot } from '@/infrastructure/persistence/EventSnapshotSchema'
import { COMMON_ALLERGENS, ALLERGEN_SEVERITIES } from '@/domain/value-objects/Allergen'

const T = '2026-01-01T00:00:00.000Z'
const base = { id: 'abc123x', name: 'Viaje', createdBy: 'u1', createdAt: T, updatedAt: T }

const purchase = {
  createdBy: 'u1',
  item: 'Rice',
  quantity: 1,
  unit: 'kg',
  dailyConsumption: 1,
  totalQuantity: 1,
  createdAt: T,
}
const expense = { paidBy: 'u1', cents: 100, description: 'Pan', date: T, createdAt: T }
const liquidation = { concept: 'Bizum', cents: 50, createdAt: T }

describe('parseEventSnapshot', () => {
  it('fills every top-level default of a minimal snapshot', () => {
    expect(parseEventSnapshot(base)).toEqual({
      ...base,
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
  })

  it('fills the defaults of every nested entity and drops unknown keys', () => {
    const parsed = parseEventSnapshot({
      ...base,
      location: { name: 'Casa' },
      users: [
        {
          id: 'u1',
          name: 'Old',
          joinedAt: T,
          allergies: [{ name: COMMON_ALLERGENS[0], severity: ALLERGEN_SEVERITIES[0] }],
        },
        { id: 'u2', name: 'Bare', joinedAt: T },
      ],
      dayOptions: [{ start: '2026-06-05', end: '2026-06-05' }],
      purchases: [
        { ...purchase, id: 'p1' },
        { ...purchase, id: 'p2', kind: 'bring', consumers: [{ userId: 'u1', multiplier: 2 }] },
        { ...purchase, id: 'p3', kind: 'buy' },
      ],
      expenses: [
        { ...expense, id: 'e1' },
        {
          ...expense,
          id: 'e2',
          currency: 'EUR',
          purchaseLinks: [{ purchaseId: 'p1', quantity: 2 }],
        },
      ],
      manualLiquidations: [
        { ...liquidation, id: 'm1' },
        { ...liquidation, id: 'm2', currency: 'EUR' },
      ],
      settledTransfers: [{ from: 'u1', to: 'u2', extra: 'dropped' }],
      history: [
        {
          id: 'h1',
          version: 1,
          timestamp: T,
          type: 'from_the_future',
          userId: 'u1',
          description: 'x',
          after: { name: 'dropped' },
        },
      ],
    })

    expect(parsed.location).toEqual({
      name: 'Casa',
      address: null,
      lat: null,
      lng: null,
      postalCode: null,
      googleMapsUrl: null,
    })
    expect(parsed.users).toEqual([
      {
        id: 'u1',
        name: 'Old',
        alias: null,
        joinedAt: T,
        email: null,
        phone: null,
        allergies: [{ name: COMMON_ALLERGENS[0], severity: ALLERGEN_SEVERITIES[0], notes: null }],
        dietary: null,
        notes: null,
        kind: 'adult',
        guardianId: null,
        household: null,
      },
      {
        id: 'u2',
        name: 'Bare',
        alias: null,
        joinedAt: T,
        email: null,
        phone: null,
        allergies: [],
        dietary: null,
        notes: null,
        kind: 'adult',
        guardianId: null,
        household: null,
      },
    ])
    expect(parsed.dayOptions).toEqual([{ start: '2026-06-05', end: '2026-06-05', note: null }])
    const purchaseDefaults = {
      createdBy: 'u1',
      item: 'Rice',
      quantity: 1,
      unit: 'kg',
      dailyConsumption: 1,
      totalQuantity: 1,
      deleted: false,
      deletedBy: null,
      deletedAt: null,
      deleteReason: null,
      createdAt: T,
      assignedTo: null,
      purchased: false,
      boughtQuantity: 0,
      group: null,
      subgroup: null,
    }
    expect(parsed.purchases).toEqual([
      { ...purchaseDefaults, id: 'p1', kind: 'buy', consumers: [] },
      {
        ...purchaseDefaults,
        id: 'p2',
        kind: 'bring',
        consumers: [{ userId: 'u1', multiplier: 2 }],
      },
      { ...purchaseDefaults, id: 'p3', kind: 'buy', consumers: [] },
    ])
    const expenseDefaults = {
      paidBy: 'u1',
      cents: 100,
      currency: 'EUR',
      description: 'Pan',
      purchaseId: null,
      date: T,
      createdAt: T,
      splitAmong: [],
      deleted: false,
      deletedBy: null,
      deletedAt: null,
    }
    expect(parsed.expenses).toEqual([
      { ...expenseDefaults, id: 'e1', purchaseLinks: [] },
      { ...expenseDefaults, id: 'e2', purchaseLinks: [{ purchaseId: 'p1', quantity: 2 }] },
    ])
    const liquidationDefaults = {
      concept: 'Bizum',
      cents: 50,
      currency: 'EUR',
      paidBy: null,
      affects: [],
      paidShares: [],
      createdAt: T,
      deleted: false,
      deletedBy: null,
      deletedAt: null,
    }
    expect(parsed.manualLiquidations).toEqual([
      { ...liquidationDefaults, id: 'm1' },
      { ...liquidationDefaults, id: 'm2' },
    ])
    expect(parsed.settledTransfers).toEqual([{ from: 'u1', to: 'u2' }])
    expect(parsed.history).toEqual([
      {
        id: 'h1',
        version: 1,
        timestamp: T,
        type: 'from_the_future',
        userId: 'u1',
        description: 'x',
      },
    ])
  })

  it('keeps a dog and degrades an unknown kind to adult instead of losing the event', () => {
    const user = { alias: null, joinedAt: T }
    const parsed = parseEventSnapshot({
      ...base,
      users: [
        { id: 'd1', name: 'Toby', kind: 'dog', ...user },
        { id: 'c1', name: 'Kirby', kind: 'cat', ...user },
      ],
    })

    expect(parsed.users.map((u) => [u.name, u.kind])).toEqual([
      ['Toby', 'dog'],
      ['Kirby', 'adult'],
    ])
  })

  it('reads a v4 blob straight through, dropping invalid options and sorting the rest', () => {
    const parsed = parseEventSnapshot({
      ...base,
      dayOptions: [
        { start: '2026-06-12', end: '2026-06-14', note: 'casa rural' },
        { start: '2026-06-20', end: '2026-06-18', note: null },
        { start: '2026-06-05', end: '2026-06-05', note: null },
      ],
      chosenOptions: ['2026-06-12..2026-06-14', '2099-01-01..2099-01-01'],
    })

    expect(parsed.dayOptions).toEqual([
      { start: '2026-06-05', end: '2026-06-05', note: null },
      { start: '2026-06-12', end: '2026-06-14', note: 'casa rural' },
    ])
    expect(parsed.chosenOptions).toEqual(['2026-06-12..2026-06-14'])
  })

  it.each([
    [
      'single-day options and the chosen day',
      { days: ['2026-06-05', '2026-06-06'], chosenDay: '2026-06-06' },
      ['2026-06-05', '2026-06-06'],
      ['2026-06-06..2026-06-06'],
    ],
    [
      'non-string days skipped',
      { days: ['2026-06-05', 7, null], chosenDay: '2026-06-05' },
      ['2026-06-05'],
      ['2026-06-05..2026-06-05'],
    ],
    ['a null chosenDay', { days: ['2026-06-05'], chosenDay: null }, ['2026-06-05'], []],
    ['no chosenDay', { days: ['2026-06-05'] }, ['2026-06-05'], []],
  ])('migrates legacy days: %s', (_name, legacy, starts, chosen) => {
    const parsed = parseEventSnapshot({ ...base, ...legacy })

    expect(parsed.dayOptions.map((o) => [o.start, o.end, o.note])).toEqual(
      starts.map((s) => [s, s, null]),
    )
    expect(parsed.chosenOptions).toEqual(chosen)
    expect(Object.keys(parsed)).not.toContain('days')
    expect(Object.keys(parsed)).not.toContain('chosenDay')
  })

  it('reports the path and message of at most five issues', () => {
    const run = () => parseEventSnapshot({ users: [{}] })

    expect(run).toThrow(/^Event snapshot validation failed: /)
    const issues = (() => {
      try {
        run()
      } catch (e) {
        return (e as Error).message.replace('Event snapshot validation failed: ', '').split('; ')
      }
      return []
    })()
    expect(issues).toHaveLength(5)
    expect(issues.map((i) => i.split(': ')[0])).toEqual([
      'id',
      'name',
      'createdBy',
      'users.0.id',
      'users.0.name',
    ])
  })

  it.each([[null], [[]], ['text'], [undefined]])(
    'rejects the non-object %j as a whole instead of treating it as an empty event',
    (raw) => {
      expect(() => parseEventSnapshot(raw)).toThrow(/^Event snapshot validation failed: : /)
    },
  )
})
