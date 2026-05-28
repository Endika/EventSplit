import { describe, it, expect } from 'vitest'
import { UserConsumptionAggregator } from '@/domain/services/UserConsumptionAggregator'
import type { EventSnapshot } from '@/domain/entities/Event'

function makeEvent(overrides: Partial<EventSnapshot>): EventSnapshot {
  return {
    id: 'evt',
    name: 'Test',
    description: null,
    location: null,
    generalNotes: null,
    days: [],
    chosenDay: null,
    stage: 'planning',
    availability: {},
    availabilityNote: null,
    users: [],
    purchases: [],
    expenses: [],
    history: [],
    groupOrder: [],
    subgroupOrder: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    schemaVersion: 1,
    ...overrides,
  } as EventSnapshot
}

const basePurchase = {
  id: 'p1',
  createdBy: 'u1',
  kind: 'buy' as const,
  item: 'Wine',
  quantity: 1,
  unit: 'bottles',
  dailyConsumption: 1,
  totalQuantity: 6,
  consumers: [
    { userId: 'u1', multiplier: 2 },
    { userId: 'u2', multiplier: 1 },
  ],
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
}

describe('UserConsumptionAggregator', () => {
  it('splits totalQuantity by multiplier ratio between consumers', () => {
    const event = makeEvent({ purchases: [basePurchase] })
    const u1 = UserConsumptionAggregator.compute(event, 'u1')
    const u2 = UserConsumptionAggregator.compute(event, 'u2')
    expect(u1.detail).toEqual([{ item: 'Wine', quantity: 4, unit: 'bottles' }])
    expect(u2.detail).toEqual([{ item: 'Wine', quantity: 2, unit: 'bottles' }])
  })

  it('aggregates totals by unit family', () => {
    const event = makeEvent({
      purchases: [
        { ...basePurchase, id: 'p1', item: 'Wine', unit: 'bottles', totalQuantity: 6,
          consumers: [{ userId: 'u1', multiplier: 1 }] },
        { ...basePurchase, id: 'p2', item: 'Water', unit: 'liters', totalQuantity: 4,
          consumers: [{ userId: 'u1', multiplier: 1 }] },
        { ...basePurchase, id: 'p3', item: 'Bread', unit: 'kg', totalQuantity: 0.5,
          consumers: [{ userId: 'u1', multiplier: 1 }] },
        { ...basePurchase, id: 'p4', item: 'Salt', unit: 'grams', totalQuantity: 250,
          consumers: [{ userId: 'u1', multiplier: 1 }] },
      ],
    })
    const r = UserConsumptionAggregator.compute(event, 'u1')
    expect(r.byFamily.bottled).toBe(6)
    expect(r.byFamily.liquids).toBe(4)
    expect(r.byFamily.solids).toBeCloseTo(0.75)
    expect(r.byFamily.other).toBe(0)
  })

  it('puts SHARED_UNIT items into shared bucket, not detail or byFamily', () => {
    const event = makeEvent({
      purchases: [
        { ...basePurchase, id: 'p1', item: 'Olive oil', unit: 'single', totalQuantity: 1,
          consumers: [{ userId: 'u1', multiplier: 1 }] },
      ],
    })
    const r = UserConsumptionAggregator.compute(event, 'u1')
    expect(r.detail).toEqual([])
    expect(r.shared).toEqual([{ item: 'Olive oil' }])
    expect(r.byFamily.other).toBe(0)
  })

  it('puts bring items where assignedTo === userId into brought', () => {
    const event = makeEvent({
      purchases: [
        { ...basePurchase, id: 'p1', kind: 'bring', item: 'Tablecloth', unit: 'units',
          totalQuantity: 1, assignedTo: 'u1', consumers: [] },
        { ...basePurchase, id: 'p2', kind: 'bring', item: 'Ice', unit: 'kg',
          totalQuantity: 5, assignedTo: 'u2', consumers: [] },
      ],
    })
    const r = UserConsumptionAggregator.compute(event, 'u1')
    expect(r.brought).toEqual([{ item: 'Tablecloth' }])
    expect(r.detail).toEqual([])
  })

  it('excludes soft-deleted purchases', () => {
    const event = makeEvent({
      purchases: [{ ...basePurchase, deleted: true }],
    })
    const r = UserConsumptionAggregator.compute(event, 'u1')
    expect(r.detail).toEqual([])
    expect(r.isEmpty).toBe(true)
  })

  it('returns isEmpty when user has no participation', () => {
    const event = makeEvent({
      purchases: [{ ...basePurchase, consumers: [{ userId: 'u2', multiplier: 1 }] }],
    })
    const r = UserConsumptionAggregator.compute(event, 'u1')
    expect(r.isEmpty).toBe(true)
    expect(r.detail).toEqual([])
    expect(r.brought).toEqual([])
    expect(r.shared).toEqual([])
  })

  it('handles fractional multipliers (children)', () => {
    const event = makeEvent({
      purchases: [{
        ...basePurchase, totalQuantity: 10,
        consumers: [
          { userId: 'adult', multiplier: 1 },
          { userId: 'child', multiplier: 0.5 },
        ],
      }],
    })
    const adult = UserConsumptionAggregator.compute(event, 'adult')
    const child = UserConsumptionAggregator.compute(event, 'child')
    expect(adult.detail[0].quantity).toBeCloseTo(6.667, 2)
    expect(child.detail[0].quantity).toBeCloseTo(3.333, 2)
  })
})
