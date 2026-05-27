import { z } from 'zod'
import { COMMON_ALLERGENS, ALLERGEN_SEVERITIES } from '@/domain/value-objects/Allergen'
import { EVENT_STAGES, type EventSnapshot } from '@/domain/entities/Event'
import { USER_KINDS } from '@/domain/entities/User'

const AllergenSchema = z.object({
  name: z.enum(COMMON_ALLERGENS),
  severity: z.enum(ALLERGEN_SEVERITIES),
  notes: z.string().nullable().default(null),
})

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  alias: z.string().nullable().default(null),
  joinedAt: z.string(),
  email: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
  allergies: z.array(AllergenSchema).default([]),
  dietary: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
  kind: z.enum(USER_KINDS).default('adult'),
})

const PurchaseConsumerSchema = z.object({
  userId: z.string(),
  multiplier: z.number(),
})

export const PurchaseSchema = z.object({
  id: z.string(),
  createdBy: z.string(),
  kind: z.enum(['buy', 'bring']).default('buy'),
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
  subgroup: z.string().nullable().default(null),
})

export const ExpenseSchema = z.object({
  id: z.string(),
  paidBy: z.string(),
  cents: z.number(),
  currency: z.literal('EUR').default('EUR'),
  description: z.string(),
  purchaseId: z.string().nullable().default(null),
  date: z.string(),
  createdAt: z.string(),
  splitAmong: z.array(z.string()).default([]),
  purchaseLinks: z.array(z.object({ purchaseId: z.string(), quantity: z.number() })).default([]),
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
})

export const EventLocationSchema = z.object({
  name: z.string(),
  address: z.string().nullable().default(null),
  lat: z.number().nullable().default(null),
  lng: z.number().nullable().default(null),
  postalCode: z.string().nullable().default(null),
  googleMapsUrl: z.string().nullable().default(null),
})

/**
 * ⚠️ If you add, remove, or rename a field here OR in the nested schemas above,
 * bump SCHEMA_VERSION in ./schemaVersion.ts — the server-side stale-client write
 * guard relies on it. eventSnapshotShape.test.ts fails until you do.
 */
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
  groupOrder: z.array(z.string()).default([]),
  subgroupOrder: z.record(z.string(), z.array(z.string())).default({}),
  expenses: z.array(ExpenseSchema).default([]),
  editPin: z.string().nullable().default(null),
  stage: z.enum(EVENT_STAGES).default('doodle'),
  settledTransfers: z.array(z.object({ from: z.string(), to: z.string() })).default([]),
  history: z.array(HistoryEntrySchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/**
 * Parse a raw JSON value (from Supabase JSONB or localStorage) into a valid EventSnapshot,
 * filling defaults for missing fields. Throws a descriptive error if mandatory fields are missing.
 *
 * The single narrowing cast lives here: the schema keeps `history[].type` as a
 * permissive `string` (old events may carry types we no longer recognise), so
 * callers get a domain `EventSnapshot` without each one re-casting.
 */
export function parseEventSnapshot(raw: unknown): EventSnapshot {
  const result = EventSnapshotSchema.safeParse(raw)
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ')
    throw new Error(`Event snapshot validation failed: ${issues}`)
  }
  return result.data as EventSnapshot
}
