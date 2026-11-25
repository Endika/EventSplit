import { describe, it, expect } from 'vitest'
import { buildClonePatch, type CloneSelection } from '@/domain/services/buildClonePatch'
import type { EventSnapshot } from '@/domain/entities/Event'
import type { UserSnapshot } from '@/domain/entities/User'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'

function snap(over: Partial<EventSnapshot>): EventSnapshot {
  return {
    id: 'abc123x',
    name: 'Trip',
    createdBy: 'me',
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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}
const src = snap
const tgt = snap

function sel(over: Partial<CloneSelection> = {}): CloneSelection {
  return {
    dayOptions: false,
    userIds: [],
    mergeUserIds: [],
    purchaseIds: [],
    site: { location: false, emergencyContact: false, wifiPassword: false, generalNotes: false },
    ...over,
  }
}

function user(id: string, name: string, over: Partial<UserSnapshot> = {}): UserSnapshot {
  return {
    id,
    name,
    alias: null,
    joinedAt: '2026-01-01T00:00:00.000Z',
    email: null,
    phone: null,
    allergies: [],
    dietary: null,
    notes: null,
    kind: 'adult',
    guardianId: null,
    household: null,
    ...over,
  }
}

function buy(id: string, over: Partial<PurchaseSnapshot> = {}): PurchaseSnapshot {
  return {
    id,
    createdBy: 'su1',
    kind: 'buy',
    item: 'Leche',
    quantity: 1,
    unit: 'liters',
    dailyConsumption: 0.5,
    totalQuantity: 3,
    consumers: [{ userId: 'su1', multiplier: 1 }],
    deleted: false,
    deletedBy: null,
    deletedAt: null,
    deleteReason: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    assignedTo: null,
    purchased: false,
    boughtQuantity: 0,
    group: null,
    subgroup: null,
    ...over,
  }
}

const bring = (id: string, over: Partial<PurchaseSnapshot> = {}): PurchaseSnapshot =>
  buy(id, { kind: 'bring', ...over })

const base = { clonedBy: 'me' }

describe('buildClonePatch', () => {
  it('copies the valid day options, sorted, with their notes and no votes', () => {
    const patch = buildClonePatch({
      ...base,
      source: src({
        dayOptions: [
          { start: '2026-06-12', end: '2026-06-14', note: 'casa rural' },
          { start: '2026-06-20', end: '2026-06-10', note: null },
          { start: '2026-06-05', end: '2026-06-05', note: null },
        ],
        chosenOptions: ['2026-06-05..2026-06-05'],
        availability: { su1: [true, true] },
      }),
      target: tgt({}),
      selection: sel({ dayOptions: true }),
    })
    expect(patch.dayOptions).toEqual([
      { start: '2026-06-05', end: '2026-06-05', note: null },
      { start: '2026-06-12', end: '2026-06-14', note: 'casa rural' },
    ])
  })

  it('gives every copied participant a fresh id and keeps allergies and diet', () => {
    const patch = buildClonePatch({
      ...base,
      source: src({
        users: [
          user('su1', 'Ana', {
            dietary: 'vegetariana',
            allergies: [{ name: 'gluten', severity: 'severe', notes: null }],
            email: 'ana@example.com',
            phone: '600000000',
            kind: 'child',
            guardianId: null,
            household: null,
            alias: 'prima',
          }),
        ],
      }),
      target: tgt({}),
      selection: sel({ userIds: ['su1'] }),
    })
    expect(patch.users).toHaveLength(1)
    const u = patch.users[0]!
    expect(u.id).not.toBe('su1')
    expect(u.name).toBe('Ana')
    expect(u.alias).toBe('prima')
    expect(u.kind).toBe('child')
    expect(u.dietary).toBe('vegetariana')
    expect(u.allergies).toEqual([{ name: 'gluten', severity: 'severe', notes: null }])
    expect(u.email).toBeNull()
    expect(u.phone).toBeNull()
    expect(patch.idMap.su1).toBe(u.id)
  })

  it('keeps who brings an item when that person is cloned too', () => {
    const patch = buildClonePatch({
      ...base,
      source: src({
        users: [user('su1', 'Ana')],
        purchases: [bring('sp1', { item: 'Aceite', assignedTo: 'su1' })],
      }),
      target: tgt({}),
      selection: sel({ userIds: ['su1'], purchaseIds: ['sp1'] }),
    })
    expect(patch.purchases[0]!.kind).toBe('bring')
    expect(patch.purchases[0]!.assignedTo).toBe(patch.idMap.su1)
  })

  it.each(['location', 'emergencyContact', 'wifiPassword', 'generalNotes'] as const)(
    'copies the %s site field only when it is the one ticked',
    (field) => {
      const source = src({
        location: {
          name: 'Casa rural',
          address: 'Calle X',
          lat: 1,
          lng: 2,
          postalCode: null,
          googleMapsUrl: null,
        },
        emergencyContact: '600123456',
        wifiPassword: 'hunter2',
        generalNotes: 'llevar sacos',
      })
      const site = {
        location: false,
        emergencyContact: false,
        wifiPassword: false,
        generalNotes: false,
      }
      const patch = buildClonePatch({
        ...base,
        source,
        target: tgt({}),
        selection: sel({ site: { ...site, [field]: true } }),
      })
      expect(patch.site).toEqual({ [field]: source[field] })
    },
  )

  it('carries the group order of what it copies, pruned', () => {
    const patch = buildClonePatch({
      ...base,
      source: src({
        purchases: [
          buy('sp1', { item: 'Leche', group: 'Nevera' }),
          buy('sp2', { item: 'Pan', group: 'Panadería' }),
        ],
        groupOrder: ['Nevera', 'Panadería', 'Limpieza'],
      }),
      target: tgt({}),
      selection: sel({ purchaseIds: ['sp1'] }),
    })
    expect(patch.groupOrder).toEqual(['Nevera'])
  })

  it('ignores ids that are not in the source', () => {
    const patch = buildClonePatch({
      ...base,
      source: src({}),
      target: tgt({}),
      selection: sel({ userIds: ['ghost'], purchaseIds: ['ghost'] }),
    })
    expect(patch.users).toEqual([])
    expect(patch.purchases).toEqual([])
  })

  it('caps day options at the DTO limit instead of overflowing', () => {
    const many = Array.from({ length: 40 }, (_, i) => {
      const d = `2026-06-${`${(i % 30) + 1}`.padStart(2, '0')}`
      return { start: d, end: d, note: null }
    })
    const patch = buildClonePatch({
      ...base,
      source: src({ dayOptions: many }),
      target: tgt({}),
      selection: sel({ dayOptions: true }),
    })
    expect(patch.dayOptions.length).toBeLessThanOrEqual(31)
  })

  describe('merging a duplicate participant', () => {
    const endika = (over: Partial<UserSnapshot> = {}) => user('su1', 'Endika', over)
    const twin = (over: Partial<UserSnapshot> = {}) => user('tu1', 'Endika', over)
    const merge = (over: Partial<CloneSelection> = {}) =>
      sel({ userIds: ['su1'], mergeUserIds: ['su1'], ...over })

    it('matches on the normalized name, so casing and padding still merge', () => {
      const patch = buildClonePatch({
        ...base,
        source: src({ users: [user('su1', '  ENDIKA ')] }),
        target: tgt({ users: [twin()] }),
        selection: merge(),
      })
      expect(patch.users).toEqual([])
      expect(patch.idMap.su1).toBe('tu1')
      const padded = buildClonePatch({
        ...base,
        source: src({ users: [endika()] }),
        target: tgt({ users: [user('tu1', '  eNDIKA ')] }),
        selection: merge(),
      })
      expect(padded.idMap.su1).toBe('tu1')
    })

    it('fills only the fields the target left empty', () => {
      const patch = buildClonePatch({
        ...base,
        source: src({
          users: [
            endika({
              alias: 'Endi',
              dietary: 'vegano',
              email: 'endika@example.com',
              phone: '600',
              notes: 'conduce',
            }),
          ],
        }),
        target: tgt({ users: [twin({ dietary: 'celiaco', phone: '700' })] }),
        selection: merge(),
      })
      expect(patch.profileUpdates).toEqual([
        {
          userId: 'tu1',
          update: {
            alias: 'Endi',
            email: 'endika@example.com',
            notes: 'conduce',
          },
        },
      ])
    })

    it.each(['   ', undefined as never])('treats the target value %j as empty', (blank) => {
      const patch = buildClonePatch({
        ...base,
        source: src({ users: [endika({ dietary: 'vegano' })] }),
        target: tgt({ users: [twin({ dietary: blank })] }),
        selection: merge(),
      })
      expect(patch.profileUpdates[0]!.update.dietary).toBe('vegano')
    })

    it('unions allergies instead of replacing them', () => {
      const patch = buildClonePatch({
        ...base,
        source: src({
          users: [
            endika({
              allergies: [
                { name: 'nuts', severity: 'severe', notes: null },
                { name: 'gluten', severity: 'mild', notes: null },
              ],
            }),
          ],
        }),
        target: tgt({
          users: [twin({ allergies: [{ name: 'gluten', severity: 'severe', notes: 'ojo' }] })],
        }),
        selection: merge(),
      })
      expect(patch.profileUpdates[0]!.update.allergies).toEqual([
        // The target's own severity survives; only the unknown allergen is added.
        { name: 'gluten', severity: 'severe', notes: 'ojo' },
        { name: 'nuts', severity: 'severe', notes: null },
      ])
    })

    it('emits no allergy update when the target is already at the cap', () => {
      const full = Array.from({ length: 20 }, (_, i) => ({
        name: ['gluten', 'lactose', 'egg', 'peanut', 'nuts'][i % 5] as 'gluten',
        severity: 'mild' as const,
        notes: `a${i}`,
      }))
      const patch = buildClonePatch({
        ...base,
        source: src({
          users: [endika({ allergies: [{ name: 'fish', severity: 'mild', notes: null }] })],
        }),
        target: tgt({ users: [twin({ allergies: full })] }),
        selection: merge(),
      })
      expect(patch.profileUpdates).toEqual([])
    })

    it('accumulates two source people folded into the same participant', () => {
      const patch = buildClonePatch({
        ...base,
        source: src({
          users: [endika({ dietary: 'vegano' }), user('su2', 'Endika', { alias: 'Endi' })],
        }),
        target: tgt({ users: [twin()] }),
        selection: sel({ userIds: ['su1', 'su2'], mergeUserIds: ['su1', 'su2'] }),
      })
      expect(patch.users).toEqual([])
      expect(patch.profileUpdates).toEqual([
        { userId: 'tu1', update: { dietary: 'vegano', alias: 'Endi' } },
      ])
      expect(patch.idMap).toEqual({ su1: 'tu1', su2: 'tu1' })
    })

    it('creates a new participant when merging was asked for but nobody matches', () => {
      const patch = buildClonePatch({
        ...base,
        source: src({ users: [endika()] }),
        target: tgt({ users: [user('tu1', 'Maite')] }),
        selection: merge(),
      })
      expect(patch.users).toHaveLength(1)
      expect(patch.users[0]!.name).toBe('Endika')
      expect(patch.profileUpdates).toEqual([])
      expect(patch.idMap.su1).toBe(patch.users[0]!.id)
    })
  })
})
