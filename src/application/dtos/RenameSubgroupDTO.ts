import { z } from 'zod'

export const RenameSubgroupSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  userId: z.string().uuid(),
  group: z.string().min(1).max(50),
  from: z.string().min(1).max(50),
  to: z.string().trim().max(50),
})

export type RenameSubgroupInput = z.infer<typeof RenameSubgroupSchema>
