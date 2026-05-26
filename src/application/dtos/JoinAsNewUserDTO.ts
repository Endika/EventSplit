import { z } from 'zod'
import { USER_KINDS } from '@/domain/entities/User'

export const JoinAsNewUserSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  name: z.string().trim().min(2).max(50),
  alias: z.string().trim().max(50).optional().nullable(),
  kind: z.enum(USER_KINDS).optional(),
})

export type JoinAsNewUserInput = z.infer<typeof JoinAsNewUserSchema>
