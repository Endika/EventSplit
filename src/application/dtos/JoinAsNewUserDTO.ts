import { z } from 'zod'

export const JoinAsNewUserSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  name: z.string().trim().min(2).max(50),
  alias: z.string().trim().max(50).optional().nullable(),
  kind: z.enum(['adult', 'child']).optional(),
})

export type JoinAsNewUserInput = z.infer<typeof JoinAsNewUserSchema>
