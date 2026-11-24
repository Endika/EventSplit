import { uuidv7 } from 'uuidv7'
import { Multiplier } from '@/domain/value-objects/Multiplier'

export interface PurchaseConsumer {
  userId: string
  multiplier: number
}

export interface PurchaseSnapshot {
  id: string
  createdBy: string
  kind: 'buy' | 'bring'
  item: string
  quantity: number
  unit: string
  dailyConsumption: number
  totalQuantity: number
  consumers: PurchaseConsumer[]
  deleted: boolean
  deletedBy: string | null
  deletedAt: string | null
  deleteReason: string | null
  createdAt: string
  assignedTo: string | null
  purchased: boolean
  boughtQuantity: number
  group: string | null
  subgroup: string | null
}

export const VALID_UNITS = [
  'units',
  'bottles',
  'cans',
  'bag',
  'tray',
  'kg',
  'grams',
  'liters',
] as const

/**
 * Sentinel unit for shared staples (salt, sugar, oil): the quantity is FIXED
 * and not multiplied by consumers/days — you only need one for the whole group.
 */
export const SHARED_UNIT = 'single'

export const ITEM_NAME_MIN = 2
export const ITEM_NAME_MAX = 50
export const UNIT_MIN = 1
export const UNIT_MAX = 30
export const QUANTITY_MAX = 10_000
export const DAILY_CONSUMPTION_MAX = 100
export const GROUP_NAME_MAX = 50

interface BringFields {
  item: string
  quantity: number
  unit: string
}

interface BuyFields extends BringFields {
  dailyConsumption: number
  consumers: PurchaseConsumer[]
  days: number
}

function validateBringFields(input: BringFields): { item: string; unit: string } {
  const item = input.item.trim()
  if (item.length < ITEM_NAME_MIN || item.length > ITEM_NAME_MAX)
    throw new Error(`Purchase: item must be ${ITEM_NAME_MIN}..${ITEM_NAME_MAX} chars`)
  const unit = input.unit.trim()
  if (unit.length < UNIT_MIN || unit.length > UNIT_MAX)
    throw new Error(`Purchase: unit must be ${UNIT_MIN}..${UNIT_MAX} chars`)
  if (input.quantity <= 0 || input.quantity > QUANTITY_MAX)
    throw new Error(`Purchase: quantity must be in (0, ${QUANTITY_MAX}]`)
  return { item, unit }
}

function validateBuyFields(input: BuyFields): {
  item: string
  unit: string
  totalQuantity: number
} {
  const { item, unit } = validateBringFields(input)
  if (input.dailyConsumption <= 0 || input.dailyConsumption > DAILY_CONSUMPTION_MAX)
    throw new Error(`Purchase: dailyConsumption must be in (0, ${DAILY_CONSUMPTION_MAX}]`)
  if (input.consumers.length === 0) throw new Error('Purchase: at least 1 consumer required')
  if (input.days <= 0 || !Number.isInteger(input.days))
    throw new Error('Purchase: days must be a positive integer')
  input.consumers.forEach((c) => {
    void Multiplier.of(c.multiplier)
  })
  return { item, unit, totalQuantity: totalQuantityFor(unit, input) }
}

function totalQuantityFor(unit: string, input: BuyFields): number {
  if (unit === SHARED_UNIT) return roundCents(input.quantity)
  const totalDaily = input.consumers.reduce(
    (sum, c) => sum + input.dailyConsumption * c.multiplier,
    0,
  )
  return roundCents(totalDaily * input.days)
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100
}

/** Trim, cap at GROUP_NAME_MAX chars, and collapse blank input to null — shared by group and subgroup. */
function normalizeGroupName(value: string | null | undefined): string | null {
  return value?.trim() ? value.trim().slice(0, GROUP_NAME_MAX) : null
}

export type LegacyPurchaseSnapshot =
  | PurchaseSnapshot
  | Omit<
      PurchaseSnapshot,
      'assignedTo' | 'purchased' | 'boughtQuantity' | 'group' | 'subgroup' | 'kind'
    >

export function backfillPurchaseSnapshot(s: LegacyPurchaseSnapshot): PurchaseSnapshot {
  const { category: _legacyCategory, ...rest } = s as PurchaseSnapshot & { category?: string }
  const full = rest as PurchaseSnapshot
  const purchased = full.purchased ?? false
  return {
    ...full,
    kind: full.kind ?? 'buy',
    assignedTo: full.assignedTo ?? null,
    purchased,
    boughtQuantity: full.boughtQuantity ?? (purchased ? full.totalQuantity : 0),
    group: full.group ?? null,
    subgroup: full.subgroup ?? null,
  }
}

export class Purchase {
  readonly id: string
  readonly kind: 'buy' | 'bring'
  readonly deleted: boolean
  readonly deletedBy: string | null
  readonly deleteReason: string | null
  readonly totalQuantity: number
  readonly createdBy: string
  readonly assignedTo: string | null
  readonly purchased: boolean
  readonly boughtQuantity: number
  readonly group: string | null
  readonly subgroup: string | null

  private constructor(private readonly s: PurchaseSnapshot) {
    this.id = s.id
    this.kind = s.kind
    this.deleted = s.deleted
    this.deletedBy = s.deletedBy
    this.deleteReason = s.deleteReason
    this.totalQuantity = s.totalQuantity
    this.createdBy = s.createdBy
    this.assignedTo = s.assignedTo
    this.purchased = s.purchased
    this.boughtQuantity = s.boughtQuantity
    this.group = s.group
    this.subgroup = s.subgroup
  }

  static create(input: {
    createdBy: string
    item: string
    quantity: number
    unit: string
    dailyConsumption: number
    consumers: PurchaseConsumer[]
    days: number
    assignedTo?: string | null
    group?: string | null
    subgroup?: string | null
  }): Purchase {
    const { item, unit, totalQuantity } = validateBuyFields(input)

    return new Purchase({
      id: uuidv7(),
      createdBy: input.createdBy,
      kind: 'buy',
      item,
      quantity: input.quantity,
      unit,
      dailyConsumption: input.dailyConsumption,
      totalQuantity,
      consumers: input.consumers,
      deleted: false,
      deletedBy: null,
      deletedAt: null,
      deleteReason: null,
      createdAt: new Date().toISOString(),
      assignedTo: input.assignedTo ?? null,
      purchased: false,
      boughtQuantity: 0,
      group: normalizeGroupName(input.group),
      subgroup: normalizeGroupName(input.subgroup),
    })
  }

  static createBring(input: {
    createdBy: string
    item: string
    quantity: number
    unit: string
    group?: string | null
    subgroup?: string | null
    broughtBy?: string | null
  }): Purchase {
    const { item, unit } = validateBringFields(input)

    return new Purchase({
      id: uuidv7(),
      createdBy: input.createdBy,
      kind: 'bring',
      item,
      quantity: input.quantity,
      unit,
      dailyConsumption: 0,
      totalQuantity: input.quantity,
      consumers: [],
      deleted: false,
      deletedBy: null,
      deletedAt: null,
      deleteReason: null,
      createdAt: new Date().toISOString(),
      assignedTo: input.broughtBy ?? null,
      purchased: false,
      boughtQuantity: 0,
      group: normalizeGroupName(input.group),
      subgroup: normalizeGroupName(input.subgroup),
    })
  }

  static restore(s: LegacyPurchaseSnapshot): Purchase {
    return new Purchase(backfillPurchaseSnapshot(s))
  }

  softDelete(input: { by: string; reason: string | null }): Purchase {
    return new Purchase({
      ...this.s,
      deleted: true,
      deletedBy: input.by,
      deletedAt: new Date().toISOString(),
      deleteReason: input.reason?.trim() || null,
    })
  }

  recover(): Purchase {
    return new Purchase({
      ...this.s,
      deleted: false,
      deletedBy: null,
      deletedAt: null,
      deleteReason: null,
    })
  }

  edit(input: {
    item: string
    quantity: number
    unit: string
    dailyConsumption: number
    consumers: PurchaseConsumer[]
    days: number
    assignedTo: string | null
    group: string | null
    subgroup?: string | null
  }): Purchase {
    const { item, unit, totalQuantity } = validateBuyFields(input)

    return new Purchase({
      ...this.s,
      kind: 'buy', // editing via the buy form converts a brought item back to buy
      item,
      quantity: input.quantity,
      unit,
      dailyConsumption: input.dailyConsumption,
      totalQuantity,
      consumers: input.consumers,
      assignedTo: input.assignedTo,
      group: normalizeGroupName(input.group),
      subgroup: normalizeGroupName(input.subgroup),
    })
  }

  editBring(input: {
    item: string
    quantity: number
    unit: string
    group: string | null
    subgroup?: string | null
    broughtBy: string | null
  }): Purchase {
    const { item, unit } = validateBringFields(input)

    return new Purchase({
      ...this.s,
      kind: 'bring',
      item,
      quantity: input.quantity,
      unit,
      totalQuantity: input.quantity,
      assignedTo: input.broughtBy,
      group: normalizeGroupName(input.group),
      subgroup: normalizeGroupName(input.subgroup),
    })
  }

  assign(input: { assignedTo: string | null; purchased: boolean }): Purchase {
    return new Purchase({
      ...this.s,
      assignedTo: input.assignedTo,
      purchased: input.purchased,
      boughtQuantity: input.purchased ? this.s.totalQuantity : 0,
    })
  }

  setBoughtQuantity(qty: number): Purchase {
    const clamped = Math.max(0, Math.min(qty, this.s.totalQuantity))
    return new Purchase({
      ...this.s,
      boughtQuantity: clamped,
      purchased: clamped >= this.s.totalQuantity && this.s.totalQuantity > 0,
    })
  }

  toSnapshot(): PurchaseSnapshot {
    return { ...this.s, consumers: [...this.s.consumers] }
  }
}
