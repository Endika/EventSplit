import { z } from 'zod'
import { entityIdField, eventIdField, liquidationIdField } from '@/application/dtos/fields'

export const RecoverManualLiquidationSchema = z.object({
  eventId: eventIdField,
  userId: entityIdField,
  liquidationId: liquidationIdField,
})

export type RecoverManualLiquidationInput = z.infer<typeof RecoverManualLiquidationSchema>
