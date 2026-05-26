import { z } from 'zod'

export const RevertSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  userId: z.string().uuid(),
  targetVersion: z.number().int().positive(),
})

export type RevertInput = z.infer<typeof RevertSchema>
