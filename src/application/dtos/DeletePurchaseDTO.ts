import { z } from 'zod'

export const DeletePurchaseSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  purchaseId: z.string().uuid(),
  deletedBy: z.string().uuid(),
  reason: z.string().trim().max(200).nullable().optional(),
})

export type DeletePurchaseInput = z.infer<typeof DeletePurchaseSchema>
