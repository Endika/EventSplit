import { z } from 'zod'

export const RemoveParticipantSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  userId: z.string().uuid(),
})

export type RemoveParticipantInput = z.infer<typeof RemoveParticipantSchema>
