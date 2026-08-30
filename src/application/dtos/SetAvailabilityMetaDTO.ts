import { z } from 'zod'
import { MAX_OPTIONS } from '@/domain/value-objects/DayOption'

export const SetAvailabilityMetaSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  userId: z.string().uuid(),
  note: z.string().trim().max(200).nullable(),
  chosenOptions: z.array(z.string()).max(MAX_OPTIONS),
})

export type SetAvailabilityMetaInput = z.infer<typeof SetAvailabilityMetaSchema>
