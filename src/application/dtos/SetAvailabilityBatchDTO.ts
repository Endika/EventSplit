import { z } from 'zod'
import { MAX_OPTIONS } from '@/domain/value-objects/DayOption'

export const SetAvailabilityBatchSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  editedBy: z.string().uuid(),
  votes: z.record(z.string().uuid(), z.array(z.boolean()).max(MAX_OPTIONS)),
})

export type SetAvailabilityBatchInput = z.infer<typeof SetAvailabilityBatchSchema>
