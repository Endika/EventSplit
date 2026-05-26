import { z } from 'zod'
import { COMMON_ALLERGENS, ALLERGEN_SEVERITIES } from '@/domain/value-objects/Allergen'
import { USER_KINDS } from '@/domain/entities/User'

export const UpdateProfileSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  userId: z.string().uuid(),
  name: z.string().trim().min(2).max(50).optional(),
  alias: z.string().trim().max(50).nullable().optional(),
  email: z.string().trim().max(100).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  dietary: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  kind: z.enum(USER_KINDS).optional(),
  allergies: z
    .array(
      z.object({
        name: z.enum(COMMON_ALLERGENS),
        severity: z.enum(ALLERGEN_SEVERITIES),
        notes: z.string().trim().max(200).nullable().optional(),
      }),
    )
    .max(20)
    .optional(),
})

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
