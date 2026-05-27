import { z } from 'zod'

export const AddPurchaseSchema = z.object({
  eventId: z.string().regex(/^[a-z0-9]{7}$/),
  createdBy: z.string().uuid(),
  item: z.string().trim().min(2).max(50),
  quantity: z.number().positive().max(10_000),
  unit: z.string().trim().min(1).max(30),
  dailyConsumption: z.number().positive().max(100),
  consumers: z
    .array(
      z.object({
        userId: z.string().uuid(),
        multiplier: z.number().min(0).max(10),
      }),
    )
    .min(1),
  days: z.number().int().positive(),
  assignedTo: z.string().uuid().nullable().optional(),
  group: z.string().trim().max(50).nullable().optional(),
  subgroup: z.string().trim().max(50).nullable().optional(),
})

export type AddPurchaseInput = z.infer<typeof AddPurchaseSchema>
