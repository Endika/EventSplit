import { z } from 'zod'
import {
  amountEurosField,
  conceptField,
  entityIdField,
  eventIdField,
  purchaseLinksField,
  splitAmongField,
} from '@/application/dtos/fields'

export const EditExpenseSchema = z.object({
  eventId: eventIdField,
  expenseId: entityIdField,
  editedBy: entityIdField,
  paidBy: entityIdField,
  amountEuros: amountEurosField,
  description: conceptField,
  splitAmong: splitAmongField,
  purchaseLinks: purchaseLinksField,
})

export type EditExpenseInput = z.infer<typeof EditExpenseSchema>
