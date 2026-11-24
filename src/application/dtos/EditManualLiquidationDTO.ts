import { z } from 'zod'
import {
  affectsField,
  amountEurosField,
  conceptField,
  entityIdField,
  eventIdField,
  liquidationIdField,
} from '@/application/dtos/fields'

export const EditManualLiquidationSchema = z.object({
  eventId: eventIdField,
  userId: entityIdField,
  liquidationId: liquidationIdField,
  concept: conceptField,
  amountEuros: amountEurosField,
  paidBy: entityIdField.nullable(),
  affects: affectsField,
})

export type EditManualLiquidationInput = z.infer<typeof EditManualLiquidationSchema>
