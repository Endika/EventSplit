import { z } from 'zod'
import { entityIdField, eventIdField } from '@/application/dtos/fields'

export const ToggleSettlementSchema = z.object({
  eventId: eventIdField,
  userId: entityIdField,
  from: entityIdField,
  to: entityIdField,
})

export type ToggleSettlementInput = z.infer<typeof ToggleSettlementSchema>
