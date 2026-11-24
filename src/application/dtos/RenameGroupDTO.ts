import { z } from 'zod'
import {
  entityIdField,
  eventIdField,
  groupKeyField,
  renamedToField,
} from '@/application/dtos/fields'

export const RenameGroupSchema = z.object({
  eventId: eventIdField,
  userId: entityIdField,
  from: groupKeyField,
  to: renamedToField,
})

export type RenameGroupInput = z.infer<typeof RenameGroupSchema>
