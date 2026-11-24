import { z } from 'zod'
import { entityIdField, eventIdField, groupOrderField } from '@/application/dtos/fields'

export const CloneIntoEventSchema = z.object({
  targetEventId: eventIdField,
  sourceEventId: eventIdField,
  clonedBy: entityIdField,
  selection: z.object({
    dayOptions: z.boolean(),
    userIds: groupOrderField,
    mergeUserIds: groupOrderField,
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
