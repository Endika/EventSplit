import { z } from 'zod'

export const RenameGroupSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  userId: z.string().uuid(),
  from: z.string().min(1).max(50),
  to: z.string().trim().max(50),
})

export type RenameGroupInput = z.infer<typeof RenameGroupSchema>
