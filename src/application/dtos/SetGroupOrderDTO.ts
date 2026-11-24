import { z } from 'zod'
import { entityIdField, eventIdField, groupOrderField } from '@/application/dtos/fields'

export const SetGroupOrderSchema = z.object({
  eventId: eventIdField,
  userId: entityIdField,
  order: groupOrderField,
})

export type SetGroupOrderInput = z.infer<typeof SetGroupOrderSchema>
