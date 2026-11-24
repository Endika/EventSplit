import { z } from 'zod'
import { entityIdField, eventIdField } from '@/application/dtos/fields'
import { MAX_OPTIONS } from '@/domain/value-objects/DayOption'

export const SetAvailabilityBatchSchema = z.object({
  eventId: eventIdField,
  editedBy: entityIdField,
  votes: z.record(entityIdField, z.array(z.boolean()).max(MAX_OPTIONS)),
})

export type SetAvailabilityBatchInput = z.infer<typeof SetAvailabilityBatchSchema>
