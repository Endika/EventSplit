import { z } from 'zod'
import {
  entityIdField,
  eventIdField,
  groupKeyField,
  renamedToField,
} from '@/application/dtos/fields'

export const RenameSubgroupSchema = z.object({
  eventId: eventIdField,
  userId: entityIdField,
  group: groupKeyField,
  from: groupKeyField,
  to: renamedToField,
})

export type RenameSubgroupInput = z.infer<typeof RenameSubgroupSchema>
