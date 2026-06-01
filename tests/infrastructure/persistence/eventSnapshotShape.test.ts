import { describe, it, expect } from 'vitest'
import {
  EventSnapshotSchema,
  UserSchema,
  PurchaseSchema,
  ExpenseSchema,
  EventLocationSchema,
} from '@/infrastructure/persistence/EventSnapshotSchema'
import { SCHEMA_VERSION } from '@/infrastructure/persistence/schemaVersion'

// Guard for the stale-client write protection: the persisted EventSnapshot shape
// is fingerprinted here. If this test fails you changed a field (top-level or on
// a nested item) — bump SCHEMA_VERSION in schemaVersion.ts so the server-side
// guard keeps protecting the new shape, THEN update the expected keys below.
// See project memory: "EventSplit stale-client blob wipe".
const keys = (s: { shape: Record<string, unknown> }) => Object.keys(s.shape).sort()

describe('EventSnapshot shape guard', () => {
  it('matches the recorded fingerprint (bump SCHEMA_VERSION on any change)', () => {
    expect({
      event: keys(EventSnapshotSchema),
      user: keys(UserSchema),
      purchase: keys(PurchaseSchema),
      expense: keys(ExpenseSchema),
      location: keys(EventLocationSchema),
    }).toEqual({
      event: [
        'availability',
        'availabilityNote',
        'chosenDay',
        'createdAt',
        'createdBy',
        'days',
        'description',
        'editPin',
        'emergencyContact',
        'expenses',
        'generalNotes',
        'groupOrder',
        'history',
        'id',
        'location',
        'manualLiquidations',
        'name',
        'purchases',
        'settledTransfers',
        'stage',
        'subgroupOrder',
        'updatedAt',
        'users',
        'wifiPassword',
      ],
      user: [
        'alias',
        'allergies',
        'dietary',
        'email',
        'id',
        'joinedAt',
        'kind',
        'name',
        'notes',
        'phone',
      ],
      purchase: [
        'assignedTo',
        'boughtQuantity',
        'consumers',
        'createdAt',
        'createdBy',
        'dailyConsumption',
        'deleteReason',
        'deleted',
        'deletedAt',
        'deletedBy',
        'group',
        'id',
        'item',
        'kind',
        'purchased',
        'quantity',
        'subgroup',
        'totalQuantity',
        'unit',
      ],
      expense: [
        'cents',
        'createdAt',
        'currency',
        'date',
        'deleted',
        'deletedAt',
        'deletedBy',
        'description',
        'id',
        'paidBy',
        'purchaseId',
        'purchaseLinks',
        'splitAmong',
      ],
      location: ['address', 'googleMapsUrl', 'lat', 'lng', 'name', 'postalCode'],
    })
  })

  it('SCHEMA_VERSION is a positive integer', () => {
    expect(Number.isInteger(SCHEMA_VERSION)).toBe(true)
    expect(SCHEMA_VERSION).toBeGreaterThan(0)
  })
})
