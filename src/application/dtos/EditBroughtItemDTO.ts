import { z } from 'zod'

export const EditBroughtItemSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  purchaseId: z.string().uuid(),
  editedBy: z.string().uuid(),
  item: z.string().trim().min(2).max(50),
  quantity: z.number().positive().max(10_000),
  unit: z.string().trim().min(1).max(30),
  group: z.string().trim().max(50).nullable().optional(),
  subgroup: z.string().trim().max(50).nullable().optional(),
  broughtBy: z.string().uuid().nullable().optional(),
})

export type EditBroughtItemInput = z.infer<typeof EditBroughtItemSchema>
