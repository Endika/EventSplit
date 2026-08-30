import { describe, it, expect } from 'vitest'
import {
  inferPurchaseDays,
  defaultConsumptionDays,
  DEFAULT_CONSUMPTION_DAYS,
} from '@/domain/services/inferPurchaseDays'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'

function purchase(over: Partial<PurchaseSnapshot>): PurchaseSnapshot {
  return {
    id: 'p1',
    createdBy: 'u1',
    kind: 'buy',
    item: 'Leche',
    quantity: 1,
    unit: 'liters',
    dailyConsumption: 0.5,
    totalQuantity: 3,
    consumers: [{ userId: 'u1', multiplier: 1 }],
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

describe('inferPurchaseDays', () => {
  it('reads the days back out of the total', () => {
    // 0.5 l/día × 2 personas × 3 días = 3 l
    expect(
      inferPurchaseDays(
        purchase({
          dailyConsumption: 0.5,
          consumers: [
            { userId: 'u1', multiplier: 1 },
            { userId: 'u2', multiplier: 1 },
          ],
          totalQuantity: 3,
        }),
      ),
    ).toBe(3)
  })

  it('honours multipliers', () => {
    expect(
      inferPurchaseDays(
        purchase({
          dailyConsumption: 1,
          consumers: [{ userId: 'u1', multiplier: 0.5 }],
          totalQuantity: 2,
        }),
      ),
    ).toBe(4)
  })

  it('falls back when there is nothing to divide by', () => {
    expect(inferPurchaseDays(purchase({ consumers: [] }))).toBe(DEFAULT_CONSUMPTION_DAYS)
    expect(inferPurchaseDays(purchase({ dailyConsumption: 0 }))).toBe(DEFAULT_CONSUMPTION_DAYS)
  })

  it('falls back rather than returning zero days', () => {
    expect(inferPurchaseDays(purchase({ totalQuantity: 0 }))).toBe(DEFAULT_CONSUMPTION_DAYS)
  })

  it('rounds to the nearest whole day', () => {
    expect(inferPurchaseDays(purchase({ dailyConsumption: 0.3, totalQuantity: 1 }))).toBe(3)
  })
})

describe('defaultConsumptionDays', () => {
  const opts = (dayOptions: { start: string; end: string }[], chosenOptions: string[]) => ({
    dayOptions: dayOptions.map((o) => ({ ...o, note: null })),
    chosenOptions,
  })

  it('uses the length of the pinned stretch', () => {
    expect(
      defaultConsumptionDays(
        opts([{ start: '2026-06-12', end: '2026-06-14' }], ['2026-06-12..2026-06-14']),
      ),
    ).toBe(3)
  })

  it('is 1 for a pinned single day', () => {
    expect(
      defaultConsumptionDays(
        opts([{ start: '2026-06-05', end: '2026-06-05' }], ['2026-06-05..2026-06-05']),
      ),
    ).toBe(1)
  })

  it('takes the longest when several are pinned', () => {
    expect(
      defaultConsumptionDays(
        opts(
          [
            { start: '2026-06-05', end: '2026-06-05' },
            { start: '2026-06-12', end: '2026-06-14' },
          ],
          ['2026-06-05..2026-06-05', '2026-06-12..2026-06-14'],
        ),
      ),
    ).toBe(3)
  })

  it('falls back to the old default when nothing is pinned', () => {
    expect(defaultConsumptionDays(opts([{ start: '2026-06-12', end: '2026-06-14' }], []))).toBe(
      DEFAULT_CONSUMPTION_DAYS,
    )
  })

  it('falls back with no options and with no event at all', () => {
    expect(defaultConsumptionDays(opts([], []))).toBe(DEFAULT_CONSUMPTION_DAYS)
    expect(defaultConsumptionDays(null)).toBe(DEFAULT_CONSUMPTION_DAYS)
  })

  it('ignores a pinned key that is no longer an option', () => {
    expect(
      defaultConsumptionDays(
        opts([{ start: '2026-06-12', end: '2026-06-14' }], ['2099-01-01..2099-01-01']),
      ),
    ).toBe(DEFAULT_CONSUMPTION_DAYS)
  })
})
