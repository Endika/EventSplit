import { ManualLiquidationSplitter } from '@/domain/services/ManualLiquidationSplitter'

export interface TripTotals {
  /** Everything the trip costs: gastos + all manual liquidations. */
  totalCostCents: number
  /** Money actually out: gastos + manual outflow (full if paidBy set, else paid shares). */
  realSpentCents: number
  /** totalCost - realSpent. */
  pendingCents: number
}

interface TripTotalsInput {
  participantIds: string[]
  expenses: { cents: number; deleted: boolean }[]
  manualLiquidations: {
    cents: number
    paidBy: string | null
    affects: string[]
    paidShares: string[]
    deleted: boolean
  }[]
}

export function computeTripTotals(input: TripTotalsInput): TripTotals {
  const expenseCents = input.expenses.filter((e) => !e.deleted).reduce((acc, e) => acc + e.cents, 0)

  let manualTotal = 0
  let manualOutflow = 0
  for (const liq of input.manualLiquidations) {
    if (liq.deleted) continue
    manualTotal += liq.cents
    if (liq.paidBy !== null) {
      manualOutflow += liq.cents
    } else {
      manualOutflow += ManualLiquidationSplitter.compute(liq, input.participantIds).paidCents
    }
  }

  const totalCostCents = expenseCents + manualTotal
  const realSpentCents = expenseCents + manualOutflow
  return { totalCostCents, realSpentCents, pendingCents: totalCostCents - realSpentCents }
}
