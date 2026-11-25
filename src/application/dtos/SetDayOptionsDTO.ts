import { z } from 'zod'
import { eventIdField } from '@/application/dtos/fields'
import {
  isValidOption,
  optionKey,
  MAX_NOTE_LEN,
  MAX_OPTIONS,
} from '@/domain/value-objects/DayOption'

// Stryker disable next-line ObjectLiteral: only the wording of the validation message
const INVALID_OPTION_ISSUE = {
  // Stryker disable next-line StringLiteral: only the wording of the validation message
  message: `Each option needs ISO dates, an end on or after its start, and at most ${MAX_OPTIONS} days`,
}

export const SetDayOptionsSchema = z.object({
  eventId: eventIdField,
  options: z
    .array(
      z.object({
        start: z.string(),
        end: z.string(),
        note: z.string().max(MAX_NOTE_LEN).nullable().default(null),
      }),
    )
    .min(1)
    .max(MAX_OPTIONS)
    .refine((os) => os.every(isValidOption), INVALID_OPTION_ISSUE)
    .refine((os) => new Set(os.map(optionKey)).size === os.length, {
      message: 'Duplicate options not allowed',
    }),
})

export type SetDayOptionsInput = z.infer<typeof SetDayOptionsSchema>
