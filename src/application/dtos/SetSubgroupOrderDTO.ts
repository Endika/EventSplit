import { z } from 'zod'
import {
  entityIdField,
  eventIdField,
  groupKeyField,
  groupOrderField,
} from '@/application/dtos/fields'

export const SetSubgroupOrderSchema = z.object({
  eventId: eventIdField,
  userId: entityIdField,
  group: groupKeyField,
  order: groupOrderField,
})

export type SetSubgroupOrderInput = z.infer<typeof SetSubgroupOrderSchema>
