import { z } from 'zod'

const EVENT_ID = /^[a-z0-9]{7}$/

export const CloneIntoEventSchema = z.object({
  targetEventId: z.string().regex(EVENT_ID),
  sourceEventId: z.string().regex(EVENT_ID),
  clonedBy: z.string().uuid(),
  selection: z.object({
    dayOptions: z.boolean(),
    userIds: z.array(z.string()).max(50),
    mergeUserIds: z.array(z.string()).max(50),
    purchaseIds: z.array(z.string()).max(500),
    site: z.object({
      location: z.boolean(),
      emergencyContact: z.boolean(),
      wifiPassword: z.boolean(),
      generalNotes: z.boolean(),
    }),
  }),
})

export type CloneIntoEventInput = z.infer<typeof CloneIntoEventSchema>
