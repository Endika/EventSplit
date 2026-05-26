import { z } from 'zod'

export const RecoverExpenseSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  expenseId: z.string().uuid(),
  recoveredBy: z.string().uuid(),
})

export type RecoverExpenseInput = z.infer<typeof RecoverExpenseSchema>
