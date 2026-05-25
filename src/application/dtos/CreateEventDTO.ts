import { z } from 'zod'

export const CreateEventSchema = z.object({
  name: z.string().trim().min(3).max(100),
  creatorName: z.string().trim().min(2).max(50),
  creatorAlias: z.string().trim().max(50).optional().nullable(),
})

export type CreateEventInput = z.infer<typeof CreateEventSchema>
