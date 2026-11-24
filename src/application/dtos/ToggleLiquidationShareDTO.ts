import { z } from 'zod'
import { entityIdField, eventIdField, liquidationIdField } from '@/application/dtos/fields'

export const ToggleLiquidationShareSchema = z.object({
  eventId: eventIdField,
  userId: entityIdField,
  liquidationId: liquidationIdField,
  shareUserId: entityIdField,
})

export type ToggleLiquidationShareInput = z.infer<typeof ToggleLiquidationShareSchema>
