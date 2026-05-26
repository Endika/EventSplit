import { z } from 'zod'

export const SetEventDaysSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  days: z
    .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .min(1)
    .max(14)
    .refine((arr) => new Set(arr).size === arr.length, { message: 'Duplicate dates not allowed' }),
})

export type SetEventDaysInput = z.infer<typeof SetEventDaysSchema>
