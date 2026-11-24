import { z } from 'zod'
import { entityIdField, eventIdField, liquidationIdField } from '@/application/dtos/fields'

export const DeleteManualLiquidationSchema = z.object({
  eventId: eventIdField,
  userId: entityIdField,
  liquidationId: liquidationIdField,
})

export type DeleteManualLiquidationInput = z.infer<typeof DeleteManualLiquidationSchema>
