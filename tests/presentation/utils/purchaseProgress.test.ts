import { describe, it, expect } from 'vitest'
import {
  boughtQuantity,
  buyerIds,
  hasLinkedExpense,
  linkedExpenses,
  progressPercent,
  isPurchaseDone,
  remainingToBuy,
} from '@/presentation/utils/purchaseProgress'
import type { EventSnapshot } from '@/domain/entities/Event'
import type { ExpenseSnapshot } from '@/domain/entities/Expense'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'

function makeEvent(overrides: Partial<EventSnapshot>): EventSnapshot {
  return {
    id: 'evt',
    name: 'Trip',
    description: null,
    location: null,
    generalNotes: null,
    dayOptions: [],
    chosenOptions: [],
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

const baseBuy: PurchaseSnapshot = {
  id: 'p1',
  createdBy: 'u1',
  kind: 'buy',
  item: 'Mini ice creams',
  quantity: 1,
  unit: 'units',
  dailyConsumption: 1,
  totalQuantity: 28,
  consumers: [{ userId: 'u1', multiplier: 1 }],
  deleted: false,
  deletedBy: null,
  deletedAt: null,
  deleteReason: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  assignedTo: 'u1',
  purchased: false,
  boughtQuantity: 0,
  group: 'Food',
  subgroup: null,
} as PurchaseSnapshot

const expense = (id: string, purchaseId: string, quantity: number, deleted = false) =>
  ({
    id,
    createdBy: 'u1',
    description: 'x',
    paidBy: 'u1',
    cents: 100,
    splitAmong: [],
    purchaseLinks: [{ purchaseId, quantity }],
    deleted,
    deletedBy: null,
    deletedAt: null,
    deleteReason: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  }) as unknown as ExpenseSnapshot

describe('purchaseProgress', () => {
  describe('boughtQuantity', () => {
    it('sums quantities across non-deleted linked expenses', () => {
      const event = makeEvent({ expenses: [expense('e1', 'p1', 10), expense('e2', 'p1', 8)] })
      expect(boughtQuantity(event, 'p1')).toBe(18)
    })

    it('picks the link of the asked purchase among several, and 0 when there is none', () => {
      const multi = {
        ...expense('e1', 'p2', 5),
        purchaseLinks: [
          { purchaseId: 'p2', quantity: 5 },
          { purchaseId: 'p1', quantity: 3 },
        ],
      } as never
      const event = makeEvent({ expenses: [multi, expense('e2', 'p2', 7)] })
      expect(boughtQuantity(event, 'p1')).toBe(3)
      expect(boughtQuantity(event, 'p3')).toBe(0)
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

  describe('linkedExpenses', () => {
    const e1 = { ...expense('e1', 'p1', 1), paidBy: 'u1' }
    const e2 = { ...expense('e2', 'p1', 1), paidBy: 'u2' }
    const gone = expense('e3', 'p1', 1, true)
    const other = expense('e4', 'p2', 1)
    const event = makeEvent({ expenses: [e1, e2, gone, other] })

    it('skips the excluded expense', () => {
      expect(linkedExpenses(event, 'p1', { excludeExpenseId: 'e1' }).map((e) => e.id)).toEqual([
        'e2',
      ])
    })

    it('tolerates an expense without links', () => {
      const legacy = { ...e1, purchaseLinks: undefined } as never
      expect(linkedExpenses(makeEvent({ expenses: [legacy] }), 'p1')).toEqual([])
    })
  })

  describe('buyerIds', () => {
    it('lists each payer once, in order', () => {
      const event = makeEvent({
        expenses: [
          { ...expense('e1', 'p1', 1), paidBy: 'u2' },
          { ...expense('e2', 'p1', 1), paidBy: 'u1' },
          { ...expense('e3', 'p1', 1), paidBy: 'u2' },
        ],
      })
      expect(buyerIds(event, 'p1')).toEqual(['u2', 'u1'])
    })
  })

  describe('progressPercent', () => {
    it.each([
      [5, 10, 50],
      [0, 0, 100],
    ])('%s of %s -> %s', (bought, total, expected) => {
      expect(progressPercent(bought, total)).toBe(expected)
    })
  })
})
