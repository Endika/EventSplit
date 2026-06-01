import { z } from 'zod'

export const ToggleLiquidationShareSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  userId: z.string().uuid(),
  liquidationId: z.string(),
  shareUserId: z.string().uuid(),
})

export type ToggleLiquidationShareInput = z.infer<typeof ToggleLiquidationShareSchema>
