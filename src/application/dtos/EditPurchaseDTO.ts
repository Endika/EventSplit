import { z } from 'zod'

export const EditPurchaseSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  purchaseId: z.string().uuid(),
  editedBy: z.string().uuid(),
  quantity: z.number().positive().max(10_000),
  unit: z.enum(['units', 'bottles', 'cans', 'kg', 'liters']),
  dailyConsumption: z.number().positive().max(100),
  consumers: z
    .array(
      z.object({
        userId: z.string().uuid(),
        multiplier: z.number().min(0).max(10),
      }),
    )
    .min(1),
  days: z.number().int().positive(),
})

export type EditPurchaseInput = z.infer<typeof EditPurchaseSchema>
