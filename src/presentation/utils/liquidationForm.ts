import type { ManualLiquidationSnapshot } from '@/domain/entities/ManualLiquidation'
import { centsToInput, isPositiveNumber } from '@/presentation/utils/numbers'
import { parseDecimal } from '@/shared/utils/parseDecimal'

export interface LiquidationForm {
  concept: string
  amount: string
  paidBy: string
  affects: string[]
}

export const formOfLiquidation = (liq: ManualLiquidationSnapshot): LiquidationForm => ({
  concept: liq.concept,
  amount: centsToInput(liq.cents),
  paidBy: liq.paidBy ?? '',
  affects: [...liq.affects],
})

/** What the add and edit handlers take, or null while the form is not valid yet. */
export function liquidationPayload(form: LiquidationForm) {
  const amountEuros = parseDecimal(form.amount)
  if (form.concept.trim().length < 3 || !isPositiveNumber(amountEuros)) return null
  return {
    concept: form.concept.trim(),
    amountEuros,
    paidBy: form.paidBy === '' ? null : form.paidBy,
    affects: form.affects,
  }
}
