import { z } from 'zod'

export const SetAvailabilityBatchSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  editedBy: z.string().uuid(),
  votes: z.record(z.string().uuid(), z.array(z.boolean()).max(14)),
})

export type SetAvailabilityBatchInput = z.infer<typeof SetAvailabilityBatchSchema>
