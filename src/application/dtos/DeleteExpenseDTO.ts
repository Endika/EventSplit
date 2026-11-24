import { z } from 'zod'
import { entityIdField, eventIdField } from '@/application/dtos/fields'

export const DeleteExpenseSchema = z.object({
  eventId: eventIdField,
  expenseId: entityIdField,
  deletedBy: entityIdField,
})

export type DeleteExpenseInput = z.infer<typeof DeleteExpenseSchema>
