import { z } from 'zod'
import { eventNameField, aliasField, personNameField } from '@/application/dtos/fields'

export const CreateEventSchema = z.object({
  name: eventNameField,
  creatorName: personNameField,
  creatorAlias: aliasField,
})

export type CreateEventInput = z.infer<typeof CreateEventSchema>
