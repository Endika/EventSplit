import { describe, it, expect } from 'vitest'
import {
  boughtQuantity,
  hasLinkedExpense,
  isPurchaseDone,
  remainingToBuy,
} from '@/presentation/utils/purchaseProgress'
import type { EventSnapshot } from '@/domain/entities/Event'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'

function makeEvent(overrides: Partial<EventSnapshot>): EventSnapshot {
  return {
    id: 'evt', name: 'Trip', description: null, location: null,
    generalNotes: null, days: [], chosenDay: null, stage: 'planning',
    availability: {}, availabilityNote: null, users: [], purchases: [],
    expenses: [], history: [], groupOrder: [], subgroupOrder: {},
    createdAt: '2026-01-01T00:00:00.000Z', schemaVersion: 1,
    ...overrides,
  } as EventSnapshot
}

const baseBuy: PurchaseSnapshot = {
  id: 'p1', createdBy: 'u1', kind: 'buy', item: 'Mini ice creams', quantity: 1,
  unit: 'units', dailyConsumption: 1, totalQuantity: 28,
  consumers: [{ userId: 'u1', multiplier: 1 }], deleted: false, deletedBy: null,
  deletedAt: null, deleteReason: null, createdAt: '2026-01-01T00:00:00.000Z',
  assignedTo: 'u1', purchased: false, boughtQuantity: 0, group: 'Food', subgroup: null,
} as PurchaseSnapshot

const expense = (id: string, purchaseId: string, quantity: number, deleted = false) =>
  ({
    id, createdBy: 'u1', description: 'x', paidBy: 'u1',
    cents: 100, splitAmong: [], purchaseLinks: [{ purchaseId, quantity }],
    deleted, deletedBy: null, deletedAt: null, deleteReason: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  }) as never

describe('purchaseProgress', () => {
  describe('boughtQuantity', () => {
    it('sums quantities across non-deleted linked expenses', () => {
      const event = makeEvent({ expenses: [expense('e1', 'p1', 10), expense('e2', 'p1', 8)] })
      expect(boughtQuantity(event, 'p1')).toBe(18)
    })

    it('ignores deleted expenses', () => {
      const event = makeEvent({ expenses: [expense('e1', 'p1', 10), expense('e2', 'p1', 8, true)] })
      expect(boughtQuantity(event, 'p1')).toBe(10)
    })

    it('excludes the expense given in excludeExpenseId', () => {
      const event = makeEvent({ expenses: [expense('e1', 'p1', 10), expense('e2', 'p1', 8)] })
      expect(boughtQuantity(event, 'p1', { excludeExpenseId: 'e2' })).toBe(10)
    })
  })

  describe('hasLinkedExpense', () => {
    it('is false with no linking expense and true with one', () => {
      expect(hasLinkedExpense(makeEvent({}), 'p1')).toBe(false)
      expect(hasLinkedExpense(makeEvent({ expenses: [expense('e1', 'p1', 1)] }), 'p1')).toBe(true)
    })
  })

  describe('isPurchaseDone', () => {
    it('is true when the manual purchased flag is set', () => {
      expect(isPurchaseDone(makeEvent({}), { ...baseBuy, purchased: true })).toBe(true)
    })

    it('is true when linked expenses cover the full quantity (no manual flag)', () => {
      const event = makeEvent({ expenses: [expense('e1', 'p1', 28)] })
      expect(isPurchaseDone(event, baseBuy)).toBe(true)
    })

    it('is false on partial coverage', () => {
      const event = makeEvent({ expenses: [expense('e1', 'p1', 27)] })
      expect(isPurchaseDone(event, baseBuy)).toBe(false)
    })

    it('is false for bring items even when "covered"', () => {
      const event = makeEvent({ expenses: [expense('e1', 'p1', 28)] })
      expect(isPurchaseDone(event, { ...baseBuy, kind: 'bring' })).toBe(false)
    })

    it('respects excludeExpenseId (the expense being edited does not count as coverage)', () => {
      const event = makeEvent({ expenses: [expense('e1', 'p1', 28)] })
      expect(isPurchaseDone(event, baseBuy, { excludeExpenseId: 'e1' })).toBe(false)
    })
  })

  describe('remainingToBuy', () => {
    it('returns missing units when partially covered', () => {
      const event = makeEvent({ expenses: [expense('e1', 'p1', 20)] })
      expect(remainingToBuy(event, baseBuy)).toBe(8)
    })

    it('returns 0 (not 1) when fully covered — regression for the false "falta 1"', () => {
      const event = makeEvent({ expenses: [expense('e1', 'p1', 28)] })
      expect(remainingToBuy(event, baseBuy)).toBe(0)
    })

    it('returns 0 when over-covered', () => {
      const event = makeEvent({ expenses: [expense('e1', 'p1', 30)] })
      expect(remainingToBuy(event, baseBuy)).toBe(0)
    })
  })
})
