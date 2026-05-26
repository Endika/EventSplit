import { z } from 'zod'

export const EditExpenseSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  expenseId: z.string().uuid(),
  editedBy: z.string().uuid(),
  paidBy: z.string().uuid(),
  amountEuros: z.number().positive().max(999_999.99),
  description: z.string().trim().min(3).max(100),
  splitAmong: z.array(z.string().uuid()).optional(),
  markPurchasedIds: z.array(z.string().uuid()).optional(),
  unmarkPurchasedIds: z.array(z.string().uuid()).optional(),
})

export type EditExpenseInput = z.infer<typeof EditExpenseSchema>
