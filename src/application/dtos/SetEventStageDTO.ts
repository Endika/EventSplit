import { z } from 'zod'
import { entityIdField, eventIdField } from '@/application/dtos/fields'
import { EVENT_STAGES } from '@/domain/entities/Event'

export const SetEventStageSchema = z.object({
  eventId: eventIdField,
  userId: entityIdField,
  stage: z.enum(EVENT_STAGES),
})

export type SetEventStageInput = z.infer<typeof SetEventStageSchema>
