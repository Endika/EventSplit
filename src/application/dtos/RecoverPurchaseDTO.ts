import { z } from 'zod'

export const RecoverPurchaseSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  purchaseId: z.string().uuid(),
  recoveredBy: z.string().uuid(),
})

export type RecoverPurchaseInput = z.infer<typeof RecoverPurchaseSchema>
