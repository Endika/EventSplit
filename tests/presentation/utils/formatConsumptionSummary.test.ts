import { describe, it, expect } from 'vitest'
import { formatConsumptionSummary } from '@/presentation/utils/formatConsumptionSummary'
import type { ConsumptionResult } from '@/domain/services/UserConsumptionAggregator'

const t = (key: string): string => key

const emptyResult: ConsumptionResult = {
  byFamily: { liquids: 0, bottled: 0, solids: 0, other: 0, shared: 0 },
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
      byFamily: emptyResult.byFamily,
      detail: [], brought: [{ item: 'Ice' }], shared: [], isEmpty: false,
    }
    const blocks = formatConsumptionSummary(r, t)
    expect(blocks.mode).toBe('onlyBrings')
    expect(blocks.brought).toEqual([{ item: 'Ice' }])
    expect(blocks.headlineLines).toEqual([])
    expect(blocks.closing).toBeNull()
  })

  it('returns mode "full" with headline + detail + closing when user consumes', () => {
    const r: ConsumptionResult = {
      byFamily: { liquids: 0, bottled: 11, solids: 1, other: 2, shared: 0 },
      detail: [{ item: 'Wine', quantity: 3.5, unit: 'bottles' }],
      brought: [{ item: 'Tablecloth' }],
      shared: [{ item: 'Salt' }],
      isEmpty: false,
    }
    const blocks = formatConsumptionSummary(r, t)
    expect(blocks.mode).toBe('full')
    expect(blocks.headlineLines).toEqual([
      { label: 'consumption.families.bottled', quantity: 11, unit: null },
      { label: 'consumption.families.solids', quantity: 1, unit: 'kg' },
      { label: 'consumption.families.other', quantity: 2, unit: null },
    ])
    expect(blocks.detail).toEqual([{ item: 'Wine', quantity: 3.5, unit: 'bottles' }])
    expect(blocks.brought).toEqual([{ item: 'Tablecloth' }])
    expect(blocks.shared).toEqual([{ item: 'Salt' }])
    expect(blocks.closing).toBe('consumption.closingPhrase')
  })

  it('omits empty families from headlineLines', () => {
    const r: ConsumptionResult = {
      byFamily: { liquids: 0, bottled: 6, solids: 0, other: 0, shared: 0 },
      detail: [{ item: 'Wine', quantity: 6, unit: 'bottles' }],
      brought: [], shared: [], isEmpty: false,
    }
    const blocks = formatConsumptionSummary(r, t)
    expect(blocks.headlineLines).toHaveLength(1)
    expect(blocks.headlineLines[0].label).toBe('consumption.families.bottled')
  })

  it('rounds quantities to 1 decimal (no trailing zeros)', () => {
    const r: ConsumptionResult = {
      byFamily: { liquids: 3.456, bottled: 0, solids: 0, other: 0, shared: 0 },
      detail: [{ item: 'Water', quantity: 3.456, unit: 'liters' }],
      brought: [], shared: [], isEmpty: false,
    }
    const blocks = formatConsumptionSummary(r, t)
    expect(blocks.headlineLines[0].quantity).toBe(3.5)
    expect(blocks.detail[0].quantity).toBe(3.5)
  })
})
