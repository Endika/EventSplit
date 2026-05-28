import { SHARED_UNIT, type PurchaseSnapshot } from '@/domain/entities/Purchase'
import type { EventSnapshot } from '@/domain/entities/Event'
import { unitFamily, type UnitFamily } from '@/domain/services/unitFamily'

export interface DetailLine {
  item: string
  quantity: number
  unit: string
}

export interface BroughtLine {
  item: string
}

export interface SharedLine {
  item: string
}

export interface ConsumptionResult {
  byFamily: Record<UnitFamily, number>
  detail: DetailLine[]
  brought: BroughtLine[]
  shared: SharedLine[]
  isEmpty: boolean
}

function emptyByFamily(): Record<UnitFamily, number> {
  return { liquids: 0, bottled: 0, solids: 0, other: 0, shared: 0 }
}

function addToFamily(byFamily: Record<UnitFamily, number>, unit: string, quantity: number): void {
  const fam = unitFamily(unit)
  if (fam === 'shared') return
  if (unit === 'grams') {
    byFamily.solids += quantity / 1000
  } else {
    byFamily[fam] += quantity
  }
}

function userShareOf(purchase: PurchaseSnapshot, userId: string): number | null {
  const consumer = purchase.consumers.find((c) => c.userId === userId)
  if (!consumer) return null
  const sumMul = purchase.consumers.reduce((s, c) => s + c.multiplier, 0)
  if (sumMul <= 0) return null
  return (consumer.multiplier / sumMul) * purchase.totalQuantity
}

function compute(event: EventSnapshot, userId: string): ConsumptionResult {
  const byFamily = emptyByFamily()
  const detail: DetailLine[] = []
  const brought: BroughtLine[] = []
  const shared: SharedLine[] = []

  for (const p of event.purchases) {
    if (p.deleted) continue

    if (p.kind === 'bring') {
      if (p.assignedTo === userId) brought.push({ item: p.item })
      continue
    }

    if (p.unit === SHARED_UNIT) {
      if (p.consumers.some((c) => c.userId === userId)) {
        shared.push({ item: p.item })
      }
      continue
    }

    const share = userShareOf(p, userId)
    if (share === null) continue
    detail.push({ item: p.item, quantity: share, unit: p.unit })
    addToFamily(byFamily, p.unit, share)
  }

  const isEmpty = detail.length === 0 && brought.length === 0 && shared.length === 0
  return { byFamily, detail, brought, shared, isEmpty }
}

export const UserConsumptionAggregator = { compute }
