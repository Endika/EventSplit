import type { ConsumptionResult } from '@/domain/services/UserConsumptionAggregator'

type T = (key: string) => string

export interface DetailLine {
  item: string
  quantity: number
  unit: string
}

export interface ConsumptionBlocks {
  mode: 'empty' | 'onlyBrings' | 'full'
  emptyMessage: string | null
  detail: DetailLine[]
  brought: { item: string }[]
  shared: { item: string }[]
  closing: string | null
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function formatConsumptionSummary(result: ConsumptionResult, t: T): ConsumptionBlocks {
  if (result.isEmpty) {
    return {
      mode: 'empty',
      emptyMessage: t('consumption.empty'),
      detail: [],
      brought: [],
      shared: [],
      closing: null,
    }
  }

  if (result.detail.length === 0 && result.shared.length === 0 && result.brought.length > 0) {
    return {
      mode: 'onlyBrings',
      emptyMessage: null,
      detail: [],
      brought: result.brought,
      shared: [],
      closing: null,
    }
  }

  return {
    mode: 'full',
    emptyMessage: null,
    detail: result.detail.map((d) => ({ ...d, quantity: round1(d.quantity) })),
    brought: result.brought,
    shared: result.shared,
    closing: result.detail.length > 0 ? t('consumption.closingPhrase') : null,
  }
}
