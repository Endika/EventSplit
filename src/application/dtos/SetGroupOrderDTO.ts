import { z } from 'zod'

export const SetGroupOrderSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  userId: z.string().uuid(),
  order: z.array(z.string()).max(50),
})

export type SetGroupOrderInput = z.infer<typeof SetGroupOrderSchema>
