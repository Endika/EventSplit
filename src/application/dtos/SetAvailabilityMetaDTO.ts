import { z } from 'zod'
import { entityIdField, eventIdField } from '@/application/dtos/fields'
import { MAX_OPTIONS } from '@/domain/value-objects/DayOption'

export const SetAvailabilityMetaSchema = z.object({
  eventId: eventIdField,
  userId: entityIdField,
  note: z.string().trim().max(200).nullable(),
  chosenOptions: z.array(z.string()).max(MAX_OPTIONS),
})

export type SetAvailabilityMetaInput = z.infer<typeof SetAvailabilityMetaSchema>
