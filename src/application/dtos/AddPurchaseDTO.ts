import { z } from 'zod'

export const AddPurchaseSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  createdBy: z.string().uuid(),
  category: z.enum(['food', 'drinks', 'snacks', 'other']),
  item: z.string().trim().min(2).max(50),
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

export type AddPurchaseInput = z.infer<typeof AddPurchaseSchema>
