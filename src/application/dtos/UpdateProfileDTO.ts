import { z } from 'zod'
import {
  aliasField,
  dietaryField,
  emailField,
  householdField,
  notesField,
  phoneField,
  entityIdField,
  eventIdField,
  guardianIdField,
  optionalTextField,
  personNameField,
  userKindField,
} from '@/application/dtos/fields'
import { MAX_ALLERGIES } from '@/domain/entities/User'
import { COMMON_ALLERGENS, ALLERGEN_SEVERITIES } from '@/domain/value-objects/Allergen'

export const UpdateProfileSchema = z.object({
  eventId: eventIdField,
  userId: entityIdField,
  actorId: entityIdField,
  name: personNameField.optional(),
  alias: aliasField,
  email: emailField,
  phone: phoneField,
  dietary: dietaryField,
  notes: notesField,
  kind: userKindField,
  guardianId: guardianIdField,
  household: householdField,
  allergies: z
    .array(
      z.object({
        name: z.enum(COMMON_ALLERGENS),
        severity: z.enum(ALLERGEN_SEVERITIES),
        notes: optionalTextField(200),
      }),
    )
    .max(MAX_ALLERGIES)
    .optional(),
})

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
