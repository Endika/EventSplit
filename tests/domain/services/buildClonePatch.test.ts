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

const base = { clonedBy: 'me', consumptionDays: 3 }

describe('buildClonePatch', () => {
  it('copies day options with their notes and no votes', () => {
    const patch = buildClonePatch({
      ...base,
      source: src({
        dayOptions: [
          { start: '2026-06-05', end: '2026-06-05', note: null },
          { start: '2026-06-12', end: '2026-06-14', note: 'casa rural' },
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

  it('makes the cloner the only consumer and recomputes the quantity', () => {
    const patch = buildClonePatch({
      ...base,
      source: src({
        purchases: [
          buy('sp1', {
            dailyConsumption: 0.5,
            unit: 'liters',
            consumers: [
              { userId: 'su1', multiplier: 1 },
              { userId: 'su2', multiplier: 1 },
            ],
            totalQuantity: 3,
          }),
        ],
      }),
      target: tgt({}),
      selection: sel({ purchaseIds: ['sp1'] }),
    })
    const p = patch.purchases[0]!
    expect(p.consumers).toEqual([{ userId: 'me', multiplier: 1 }])
    expect(p.totalQuantity).toBe(1.5) // 0.5 * 1 consumidor * 3 días
    expect(p.purchased).toBe(false)
    expect(p.boughtQuantity).toBe(0)
    expect(p.createdBy).toBe('me')
    expect(p.id).not.toBe('sp1')
  })

  it('leaves a single-unit staple quantity untouched', () => {
    const patch = buildClonePatch({
      ...base,
      source: src({
        purchases: [buy('sp1', { item: 'Sal', unit: 'single', quantity: 2, totalQuantity: 2 })],
      }),
      target: tgt({}),
      selection: sel({ purchaseIds: ['sp1'] }),
    })
    expect(patch.purchases[0]!.quantity).toBe(2)
    expect(patch.purchases[0]!.totalQuantity).toBe(2)
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

  it('empties who brings an item when that person is not cloned', () => {
    const patch = buildClonePatch({
      ...base,
      source: src({
        users: [user('su1', 'Ana')],
        purchases: [bring('sp1', { item: 'Aceite', assignedTo: 'su1' })],
      }),
      target: tgt({}),
      selection: sel({ purchaseIds: ['sp1'] }),
    })
    expect(patch.purchases[0]!.kind).toBe('bring')
    expect(patch.purchases[0]!.assignedTo).toBeNull()
  })

  it('never copies a deleted purchase, even if selected', () => {
    const patch = buildClonePatch({
      ...base,
      source: src({ purchases: [buy('sp1', { deleted: true })] }),
      target: tgt({}),
      selection: sel({ purchaseIds: ['sp1'] }),
    })
    expect(patch.purchases).toEqual([])
  })

  it('copies only the site fields that are ticked', () => {
    const patch = buildClonePatch({
      ...base,
      source: src({
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
      }),
      target: tgt({}),
      selection: sel({
        site: {
          location: true,
          emergencyContact: false,
          wifiPassword: false,
          generalNotes: true,
        },
      }),
    })
    expect(patch.site.location?.name).toBe('Casa rural')
    expect(patch.site.generalNotes).toBe('llevar sacos')
    expect('emergencyContact' in patch.site).toBe(false)
    expect('wifiPassword' in patch.site).toBe(false)
  })

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

  it('keeps the subgroup of a copied item', () => {
    const patch = buildClonePatch({
      ...base,
      source: src({
        purchases: [buy('sp1', { group: 'Nevera', subgroup: 'Lácteos' })],
        subgroupOrder: { Nevera: ['Lácteos', 'Embutido'] },
      }),
      target: tgt({}),
      selection: sel({ purchaseIds: ['sp1'] }),
    })
    expect(patch.purchases[0]!.group).toBe('Nevera')
    expect(patch.purchases[0]!.subgroup).toBe('Lácteos')
    expect(patch.subgroupOrder).toEqual({ Nevera: ['Lácteos'] })
  })

  it('an empty selection produces an empty patch', () => {
    const patch = buildClonePatch({
      ...base,
      source: src({ dayOptions: [{ start: '2026-06-05', end: '2026-06-05', note: null }] }),
      target: tgt({}),
      selection: sel({}),
    })
    expect(patch).toMatchObject({ users: [], purchases: [], dayOptions: [], site: {} })
    expect(patch.idMap).toEqual({})
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

  it('every copied purchase gets a distinct id', () => {
    const patch = buildClonePatch({
      ...base,
      source: src({ purchases: [buy('sp1'), buy('sp2', { item: 'Pan' })] }),
      target: tgt({}),
      selection: sel({ purchaseIds: ['sp1', 'sp2'] }),
    })
    const ids = patch.purchases.map((p) => p.id)
    expect(new Set(ids).size).toBe(2)
  })
})
