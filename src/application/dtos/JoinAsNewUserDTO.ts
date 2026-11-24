import { z } from 'zod'
import {
  eventIdField,
  guardianIdField,
  aliasField,
  personNameField,
  userKindField,
} from '@/application/dtos/fields'

export const JoinAsNewUserSchema = z.object({
  eventId: eventIdField,
  name: personNameField,
  alias: aliasField,
  kind: userKindField,
  guardianId: guardianIdField,
})

export type JoinAsNewUserInput = z.infer<typeof JoinAsNewUserSchema>
