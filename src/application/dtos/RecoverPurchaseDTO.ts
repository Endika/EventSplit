import { z } from 'zod'
import { entityIdField, eventIdField } from '@/application/dtos/fields'

export const RecoverPurchaseSchema = z.object({
  eventId: eventIdField,
  purchaseId: entityIdField,
  recoveredBy: entityIdField,
})

export type RecoverPurchaseInput = z.infer<typeof RecoverPurchaseSchema>
