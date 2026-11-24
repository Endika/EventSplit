import { z } from 'zod'
import {
  affectsField,
  amountEurosField,
  conceptField,
  entityIdField,
  eventIdField,
} from '@/application/dtos/fields'

export const AddManualLiquidationSchema = z.object({
  eventId: eventIdField,
  userId: entityIdField,
  concept: conceptField,
  amountEuros: amountEurosField,
  paidBy: entityIdField.nullable(),
  affects: affectsField,
})

export type AddManualLiquidationInput = z.infer<typeof AddManualLiquidationSchema>
