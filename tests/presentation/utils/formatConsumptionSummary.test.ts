import { describe, it, expect } from 'vitest'
import { formatConsumptionSummary } from '@/presentation/utils/formatConsumptionSummary'
import type { ConsumptionResult } from '@/domain/services/UserConsumptionAggregator'

const t = (key: string): string => key

const emptyResult: ConsumptionResult = {
  detail: [],
  brought: [],
  shared: [],
  isEmpty: true,
}

describe('formatConsumptionSummary', () => {
  it('returns mode "empty" for isEmpty', () => {
    expect(formatConsumptionSummary(emptyResult, t)).toEqual({
      mode: 'empty',
      emptyMessage: 'consumption.empty',
      detail: [],
      brought: [],
      shared: [],
      closing: null,
    })
  })

  it('returns mode "onlyBrings" when user only brings', () => {
    const r: ConsumptionResult = {
      detail: [],
      brought: [{ item: 'Ice' }],
      shared: [],
      isEmpty: false,
    }
    expect(formatConsumptionSummary(r, t)).toEqual({
      mode: 'onlyBrings',
      emptyMessage: null,
      detail: [],
      brought: [{ item: 'Ice' }],
      shared: [],
      closing: null,
    })
  })

  it.each([
    ['nothing at all', [], [], []],
    ['a share with something brought', [], [{ item: 'Ice' }], [{ item: 'Salt' }]],
    [
      'consumption with something brought',
      [{ item: 'Wine', quantity: 1, unit: 'kg' }],
      [{ item: 'Ice' }],
      [],
    ],
  ])('is "full" for %s', (_, detail, brought, shared) => {
    const r: ConsumptionResult = { detail, brought, shared, isEmpty: false }
    expect(formatConsumptionSummary(r, t).mode).toBe('full')
  })

  it('returns mode "full" with detail + brought + shared + closing when user consumes', () => {
    const r: ConsumptionResult = {
      detail: [{ item: 'Wine', quantity: 3.5, unit: 'bottles' }],
      brought: [{ item: 'Tablecloth' }],
      shared: [{ item: 'Salt' }],
      isEmpty: false,
    }
    const blocks = formatConsumptionSummary(r, t)
    expect(blocks.mode).toBe('full')
    expect(blocks.detail).toEqual([{ item: 'Wine', quantity: 3.5, unit: 'bottles' }])
    expect(blocks.brought).toEqual([{ item: 'Tablecloth' }])
    expect(blocks.shared).toEqual([{ item: 'Salt' }])
    expect(blocks.closing).toBe('consumption.closingPhrase')
  })

  it('omits closing when only shared (no detail)', () => {
    const r: ConsumptionResult = {
      detail: [],
      brought: [],
      shared: [{ item: 'Salt' }],
      isEmpty: false,
    }
    const blocks = formatConsumptionSummary(r, t)
    expect(blocks.mode).toBe('full')
    expect(blocks.closing).toBeNull()
  })

  it('rounds detail quantities to 1 decimal (no trailing zeros)', () => {
    const r: ConsumptionResult = {
      detail: [{ item: 'Water', quantity: 3.456, unit: 'liters' }],
      brought: [],
      shared: [],
      isEmpty: false,
    }
    const blocks = formatConsumptionSummary(r, t)
    expect(blocks.detail[0]!.quantity).toBe(3.5)
  })
})
