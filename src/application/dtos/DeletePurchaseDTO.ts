import { z } from 'zod'
import { entityIdField, eventIdField, optionalTextField } from '@/application/dtos/fields'

export const DeletePurchaseSchema = z.object({
  eventId: eventIdField,
  purchaseId: entityIdField,
  deletedBy: entityIdField,
  reason: optionalTextField(200),
})

export type DeletePurchaseInput = z.infer<typeof DeletePurchaseSchema>
