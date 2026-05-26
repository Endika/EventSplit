import { z } from 'zod'

export const SetEventStageSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  userId: z.string().uuid(),
  stage: z.enum(['doodle', 'shopping', 'expenses']),
})

export type SetEventStageInput = z.infer<typeof SetEventStageSchema>
