import { z } from 'zod'

export const DeleteManualLiquidationSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  userId: z.string().uuid(),
  liquidationId: z.string(),
})

export type DeleteManualLiquidationInput = z.infer<typeof DeleteManualLiquidationSchema>
