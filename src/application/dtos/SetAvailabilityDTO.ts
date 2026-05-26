import { z } from 'zod'

export const SetAvailabilitySchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  userId: z.string().uuid(),
  votes: z.array(z.boolean()).min(1).max(14),
})

export type SetAvailabilityInput = z.infer<typeof SetAvailabilitySchema>
