import { z } from 'zod'

export const AddExpenseSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  paidBy: z.string().uuid(),
  amountEuros: z.number().positive().max(999_999.99),
  description: z.string().trim().min(3).max(100),
  purchaseId: z.string().uuid().optional().nullable(),
  date: z.string().datetime().optional(),
  splitAmong: z.array(z.string().uuid()).optional(),
})

export type AddExpenseInput = z.infer<typeof AddExpenseSchema>
