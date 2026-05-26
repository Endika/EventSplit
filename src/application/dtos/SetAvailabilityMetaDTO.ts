import { z } from 'zod'

export const SetAvailabilityMetaSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  userId: z.string().uuid(),
  note: z.string().trim().max(200).nullable(),
  chosenDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
})

export type SetAvailabilityMetaInput = z.infer<typeof SetAvailabilityMetaSchema>
