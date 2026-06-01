import { z } from 'zod'

export const EditManualLiquidationSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  userId: z.string().uuid(),
  liquidationId: z.string(),
  concept: z.string().trim().min(3).max(100),
  amountEuros: z.number().positive().max(999_999.99),
  paidBy: z.string().uuid().nullable(),
  affects: z.array(z.string().uuid()).default([]),
})

export type EditManualLiquidationInput = z.infer<typeof EditManualLiquidationSchema>
