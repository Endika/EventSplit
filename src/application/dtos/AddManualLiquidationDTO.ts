import { z } from 'zod'

export const AddManualLiquidationSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  userId: z.string().uuid(),
  concept: z.string().trim().min(3).max(100),
  amountEuros: z.number().positive().max(999_999.99),
  paidBy: z.string().uuid().nullable(),
  affects: z.array(z.string().uuid()).default([]),
})

export type AddManualLiquidationInput = z.infer<typeof AddManualLiquidationSchema>
