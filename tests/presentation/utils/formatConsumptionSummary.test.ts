import { describe, it, expect } from 'vitest'
import { formatConsumptionSummary } from '@/presentation/utils/formatConsumptionSummary'
import type { ConsumptionResult } from '@/domain/services/UserConsumptionAggregator'

const t = (key: string): string => key

const emptyResult: ConsumptionResult = {
  detail: [], brought: [], shared: [], isEmpty: true,
}

describe('formatConsumptionSummary', () => {
  it('returns mode "empty" for isEmpty', () => {
    const blocks = formatConsumptionSummary(emptyResult, t)
    expect(blocks.mode).toBe('empty')
    expect(blocks.emptyMessage).toBe('consumption.empty')
  })

  it('returns mode "onlyBrings" when user only brings', () => {
    const r: ConsumptionResult = {
      detail: [], brought: [{ item: 'Ice' }], shared: [], isEmpty: false,
    }
    const blocks = formatConsumptionSummary(r, t)
    expect(blocks.mode).toBe('onlyBrings')
    expect(blocks.brought).toEqual([{ item: 'Ice' }])
    expect(blocks.closing).toBeNull()
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
      detail: [], brought: [], shared: [{ item: 'Salt' }], isEmpty: false,
    }
    const blocks = formatConsumptionSummary(r, t)
    expect(blocks.mode).toBe('full')
    expect(blocks.closing).toBeNull()
  })

  it('rounds detail quantities to 1 decimal (no trailing zeros)', () => {
    const r: ConsumptionResult = {
      detail: [{ item: 'Water', quantity: 3.456, unit: 'liters' }],
      brought: [], shared: [], isEmpty: false,
    }
    const blocks = formatConsumptionSummary(r, t)
    expect(blocks.detail[0].quantity).toBe(3.5)
  })
})
