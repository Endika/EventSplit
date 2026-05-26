import { z } from 'zod'

export const AssignPurchaseSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  purchaseId: z.string().uuid(),
  editedBy: z.string().uuid(),
  assignedTo: z.string().uuid().nullable(),
  purchased: z.boolean(),
})

export type AssignPurchaseInput = z.infer<typeof AssignPurchaseSchema>
