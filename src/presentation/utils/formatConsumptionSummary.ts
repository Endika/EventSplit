import type { ConsumptionResult } from '@/domain/services/UserConsumptionAggregator'
import type { UnitFamily } from '@/domain/services/unitFamily'

type T = (key: string) => string

export interface HeadlineLine {
  label: string
  quantity: number
  unit: 'kg' | null
}

export interface DetailLine {
  item: string
  quantity: number
  unit: string
}

export interface ConsumptionBlocks {
  mode: 'empty' | 'onlyBrings' | 'full'
  emptyMessage: string | null
  headlineLines: HeadlineLine[]
  detail: DetailLine[]
  brought: { item: string }[]
  shared: { item: string }[]
  closing: string | null
}

const FAMILY_LABEL: Record<UnitFamily, string> = {
  liquids: 'consumption.families.liquids',
  bottled: 'consumption.families.bottled',
  solids: 'consumption.families.solids',
  other: 'consumption.families.other',
  shared: '',
}

const FAMILY_UNIT: Record<UnitFamily, 'kg' | null> = {
  liquids: null,
  bottled: null,
  solids: 'kg',
  other: null,
  shared: null,
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function formatConsumptionSummary(result: ConsumptionResult, t: T): ConsumptionBlocks {
  if (result.isEmpty) {
    return {
      mode: 'empty',
      emptyMessage: t('consumption.empty'),
      headlineLines: [],
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
      headlineLines: [],
      detail: [],
      brought: result.brought,
      shared: [],
      closing: null,
    }
  }

  const families: UnitFamily[] = ['liquids', 'bottled', 'solids', 'other']
  const headlineLines: HeadlineLine[] = families
    .filter((f) => result.byFamily[f] > 0)
    .map((f) => ({
      label: t(FAMILY_LABEL[f]),
      quantity: round1(result.byFamily[f]),
      unit: FAMILY_UNIT[f],
    }))

  return {
    mode: 'full',
    emptyMessage: null,
    headlineLines,
    detail: result.detail.map((d) => ({ ...d, quantity: round1(d.quantity) })),
    brought: result.brought,
    shared: result.shared,
    closing: result.detail.length > 0 ? t('consumption.closingPhrase') : null,
  }
}
