import { z } from 'zod'
import { entityIdField, eventIdField } from '@/application/dtos/fields'

export const RemoveParticipantSchema = z.object({
  eventId: eventIdField,
  userId: entityIdField,
})

export type RemoveParticipantInput = z.infer<typeof RemoveParticipantSchema>
