import { z } from 'zod'

export const SetEditPinSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  userId: z.string().uuid(),
  pin: z
    .string()
    .regex(/^\d{4,6}$/)
    .nullable(),
})

export type SetEditPinInput = z.infer<typeof SetEditPinSchema>
