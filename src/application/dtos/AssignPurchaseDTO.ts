import { z } from 'zod'
import { entityIdField, eventIdField } from '@/application/dtos/fields'

export const AssignPurchaseSchema = z.object({
  eventId: eventIdField,
  purchaseId: entityIdField,
  editedBy: entityIdField,
  assignedTo: entityIdField.nullable(),
  purchased: z.boolean(),
})

export type AssignPurchaseInput = z.infer<typeof AssignPurchaseSchema>
