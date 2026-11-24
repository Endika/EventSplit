import { z } from 'zod'
import { entityIdField, eventIdField } from '@/application/dtos/fields'

export const RecoverExpenseSchema = z.object({
  eventId: eventIdField,
  expenseId: entityIdField,
  recoveredBy: entityIdField,
})

export type RecoverExpenseInput = z.infer<typeof RecoverExpenseSchema>
