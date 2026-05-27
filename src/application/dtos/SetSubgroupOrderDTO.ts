import { z } from 'zod'

export const SetSubgroupOrderSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  userId: z.string().uuid(),
  group: z.string().min(1).max(50),
  order: z.array(z.string()).max(50),
})

export type SetSubgroupOrderInput = z.infer<typeof SetSubgroupOrderSchema>
