import { z } from 'zod'
import { EVENT_STAGES } from '@/domain/entities/Event'

export const SetEventStageSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  userId: z.string().uuid(),
  stage: z.enum(EVENT_STAGES),
})

export type SetEventStageInput = z.infer<typeof SetEventStageSchema>
