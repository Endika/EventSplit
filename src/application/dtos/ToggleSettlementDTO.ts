import { z } from 'zod'

export const ToggleSettlementSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  userId: z.string().uuid(),
  from: z.string().uuid(),
  to: z.string().uuid(),
})

export type ToggleSettlementInput = z.infer<typeof ToggleSettlementSchema>
