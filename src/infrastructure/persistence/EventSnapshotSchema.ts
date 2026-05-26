import { z } from 'zod'
import { COMMON_ALLERGENS } from '@/domain/value-objects/Allergen'

const AllergenSchema = z.object({
  name: z.enum(COMMON_ALLERGENS),
  severity: z.enum(['mild', 'moderate', 'severe']),
  notes: z.string().nullable().default(null),
})

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  alias: z.string().nullable().default(null),
  joinedAt: z.string(),
  email: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
  allergies: z.array(AllergenSchema).default([]),
  dietary: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
  kind: z.enum(['adult', 'child']).default('adult'),
})

const PurchaseConsumerSchema = z.object({
  userId: z.string(),
  multiplier: z.number(),
})

const PurchaseSchema = z.object({
  id: z.string(),
  createdBy: z.string(),
  category: z.string(),
  item: z.string(),
  quantity: z.number(),
  unit: z.string(),
  dailyConsumption: z.number(),
  totalQuantity: z.number(),
  consumers: z.array(PurchaseConsumerSchema).default([]),
  deleted: z.boolean().default(false),
  deletedBy: z.string().nullable().default(null),
  deletedAt: z.string().nullable().default(null),
  deleteReason: z.string().nullable().default(null),
  createdAt: z.string(),
  assignedTo: z.string().nullable().default(null),
  purchased: z.boolean().default(false),
  boughtQuantity: z.number().default(0),
  group: z.string().nullable().default(null),
})

const ExpenseSchema = z.object({
  id: z.string(),
  paidBy: z.string(),
  cents: z.number(),
  currency: z.literal('EUR').default('EUR'),
  description: z.string(),
  purchaseId: z.string().nullable().default(null),
  date: z.string(),
  createdAt: z.string(),
  splitAmong: z.array(z.string()).default([]),
  deleted: z.boolean().default(false),
  deletedBy: z.string().nullable().default(null),
  deletedAt: z.string().nullable().default(null),
})

const HistoryEntrySchema = z.object({
  id: z.string(),
  version: z.number(),
  timestamp: z.string(),
  type: z.string(), // permissive — old events may have history types we no longer recognise
  userId: z.string(),
  description: z.string(),
  before: z.unknown().default(null),
  after: z.unknown().default(null),
  fullState: z.unknown().optional(),
})

const EventLocationSchema = z.object({
  name: z.string(),
  address: z.string().nullable().default(null),
  lat: z.number().nullable().default(null),
  lng: z.number().nullable().default(null),
  postalCode: z.string().nullable().default(null),
  googleMapsUrl: z.string().nullable().default(null),
})

export const EventSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdBy: z.string(),
  description: z.string().nullable().default(null),
  location: EventLocationSchema.nullable().default(null),
  generalNotes: z.string().nullable().default(null),
  wifiPassword: z.string().nullable().default(null),
  emergencyContact: z.string().nullable().default(null),
  users: z.array(UserSchema).default([]),
  availability: z.record(z.string(), z.array(z.boolean())).default({}),
  availabilityNote: z.string().nullable().default(null),
  chosenDay: z.string().nullable().default(null),
  days: z.array(z.string()).default([]),
  purchases: z.array(PurchaseSchema).default([]),
  expenses: z.array(ExpenseSchema).default([]),
  editPin: z.string().nullable().default(null),
  stage: z.enum(['doodle', 'shopping', 'expenses']).default('doodle'),
  settledTransfers: z.array(z.object({ from: z.string(), to: z.string() })).default([]),
  history: z.array(HistoryEntrySchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type EventSnapshotParsed = z.infer<typeof EventSnapshotSchema>

/**
 * Parse a raw JSON value (from Supabase JSONB or localStorage) into a valid EventSnapshot,
 * filling defaults for missing fields. Throws a descriptive error if mandatory fields are missing.
 */
export function parseEventSnapshot(raw: unknown): EventSnapshotParsed {
  const result = EventSnapshotSchema.safeParse(raw)
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ')
    throw new Error(`Event snapshot validation failed: ${issues}`)
  }
  return result.data
}
