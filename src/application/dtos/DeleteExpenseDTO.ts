import { z } from 'zod'

export const DeleteExpenseSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  expenseId: z.string().uuid(),
  deletedBy: z.string().uuid(),
})

export type DeleteExpenseInput = z.infer<typeof DeleteExpenseSchema>
