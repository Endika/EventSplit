import type { EventSnapshot } from '@/domain/entities/Event'
import type { ExpenseSnapshot } from '@/domain/entities/Expense'
import type { PurchaseSnapshot } from '@/domain/entities/Purchase'
import type { UserSnapshot } from '@/domain/entities/User'

const AT = '2026-01-01T00:00:00.000Z'

export const makeUser = (id: string, over: Partial<UserSnapshot> = {}): UserSnapshot => ({
  id,
  name: id,
  guardianId: null,
  household: null,
  alias: null,
  kind: 'adult',
  joinedAt: AT,
  email: null,
  phone: null,
  allergies: [],
  dietary: null,
  notes: null,
  ...over,
})

export const makePurchase = (
  id: string,
  over: Partial<PurchaseSnapshot> = {},
): PurchaseSnapshot => ({
  id,
  createdBy: 'u1',
  kind: 'buy',
  item: id,
  quantity: 1,
  unit: 'units',
  dailyConsumption: 1,
  totalQuantity: 4,
  consumers: [{ userId: 'u1', multiplier: 1 }],
  deleted: false,
  deletedBy: null,
  deletedAt: null,
  deleteReason: null,
  createdAt: AT,
  assignedTo: null,
  purchased: false,
  boughtQuantity: 0,
  group: null,
  subgroup: null,
  ...over,
})

export const makeExpense = (id: string, over: Partial<ExpenseSnapshot> = {}): ExpenseSnapshot => ({
  id,
  paidBy: 'u1',
  cents: 1000,
  currency: 'EUR',
  description: id,
  purchaseId: null,
  date: AT,
  createdAt: AT,
  splitAmong: [],
  purchaseLinks: [],
  deleted: false,
  deletedBy: null,
  deletedAt: null,
  ...over,
})

export const makeEvent = (over: Partial<EventSnapshot> = {}): EventSnapshot => ({
  id: 'abc123x',
  name: 'Trip',
  createdBy: 'u1',
  description: null,
  location: null,
  generalNotes: null,
  wifiPassword: null,
  emergencyContact: null,
  users: [makeUser('u1'), makeUser('u2')],
  availability: {},
  availabilityNote: null,
  chosenOptions: [],
  dayOptions: [{ start: '2026-06-05', end: '2026-06-06', note: null }],
  purchases: [],
  groupOrder: [],
  subgroupOrder: {},
  expenses: [],
  hasPin: false,
  stage: 'doodle',
  settledTransfers: [],
  manualLiquidations: [],
  history: [],
  createdAt: AT,
  updatedAt: AT,
  ...over,
})

/** A valid UUID for the nth entity of a test. */
export const uid = (n: number): string => `00000000-0000-7000-8000-${String(n).padStart(12, '0')}`
