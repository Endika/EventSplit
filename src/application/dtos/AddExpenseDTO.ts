import { z } from 'zod'
import {
  amountEurosField,
  conceptField,
  entityIdField,
  eventIdField,
  purchaseLinksField,
  splitAmongField,
} from '@/application/dtos/fields'

export const AddExpenseSchema = z.object({
  eventId: eventIdField,
  paidBy: entityIdField,
  // Who entered the expense (the operator). Defaults to paidBy when omitted so the
  // history attributes the action to the person who actually recorded it, not the payer.
  createdBy: entityIdField.optional(),
  amountEuros: amountEurosField,
  description: conceptField,
  purchaseId: entityIdField.optional().nullable(),
  date: z.string().datetime().optional(),
  splitAmong: splitAmongField,
  purchaseLinks: purchaseLinksField,
})

export type AddExpenseInput = z.infer<typeof AddExpenseSchema>
