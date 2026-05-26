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
}

export const VALID_UNITS = ['units', 'bottles', 'cans', 'kg', 'liters'] as const

/**
 * Sentinel unit for shared staples (salt, sugar, oil): the quantity is FIXED
 * and not multiplied by consumers/days — you only need one for the whole group.
 */
export const SHARED_UNIT = 'single'

function validateUnit(unit: string): string {
  const trimmed = unit.trim()
  if (trimmed.length < 1 || trimmed.length > 30)
    throw new Error('Purchase: unit must be 1..30 chars')
  return trimmed
}

export class Purchase {
  private constructor(private readonly s: PurchaseSnapshot) {}

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
  }): Purchase {
    const item = input.item.trim()
    if (item.length < 2 || item.length > 50) throw new Error('Purchase: item must be 2..50 chars')
    const unit = validateUnit(input.unit)
    if (input.quantity <= 0 || input.quantity > 10_000)
      throw new Error('Purchase: quantity must be in (0, 10000]')
    if (input.dailyConsumption <= 0 || input.dailyConsumption > 100)
      throw new Error('Purchase: dailyConsumption must be in (0, 100]')
    if (input.consumers.length === 0) throw new Error('Purchase: at least 1 consumer required')
    if (input.days <= 0 || !Number.isInteger(input.days))
      throw new Error('Purchase: days must be a positive integer')

    input.consumers.forEach((c) => {
      void Multiplier.of(c.multiplier) // validates
    })

    const totalDaily = input.consumers.reduce(
      (sum, c) => sum + input.dailyConsumption * c.multiplier,
      0,
    )
    const totalQuantity =
      unit === SHARED_UNIT
        ? Math.round(input.quantity * 100) / 100
        : Math.round(totalDaily * input.days * 100) / 100

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
      group: input.group?.trim() ? input.group.trim().slice(0, 50) : null,
    })
  }

  static createBring(input: {
    createdBy: string
    item: string
    quantity: number
    unit: string
    group?: string | null
    broughtBy?: string | null
  }): Purchase {
    const item = input.item.trim()
    if (item.length < 2 || item.length > 50) throw new Error('Purchase: item must be 2..50 chars')
    const unit = validateUnit(input.unit)
    if (input.quantity <= 0 || input.quantity > 10_000)
      throw new Error('Purchase: quantity must be in (0, 10000]')

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
      group: input.group?.trim() ? input.group.trim().slice(0, 50) : null,
    })
  }

  static restore(s: PurchaseSnapshot | Omit<PurchaseSnapshot, 'assignedTo' | 'purchased' | 'boughtQuantity' | 'group' | 'kind'>): Purchase {
    const { category: _legacyCategory, ...rest } = s as PurchaseSnapshot & { category?: string }
    const full = rest as PurchaseSnapshot
    const purchased = full.purchased ?? false
    return new Purchase({
      ...full,
      kind: full.kind ?? 'buy',
      assignedTo: full.assignedTo ?? null,
      purchased,
      boughtQuantity: full.boughtQuantity ?? (purchased ? full.totalQuantity : 0),
      group: full.group ?? null,
    })
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
  }): Purchase {
    const item = input.item.trim()
    if (item.length < 2 || item.length > 50) throw new Error('Purchase: item must be 2..50 chars')
    const unit = validateUnit(input.unit)
    if (input.quantity <= 0 || input.quantity > 10_000)
      throw new Error('Purchase: quantity must be in (0, 10000]')
    if (input.dailyConsumption <= 0 || input.dailyConsumption > 100)
      throw new Error('Purchase: dailyConsumption must be in (0, 100]')
    if (input.consumers.length === 0) throw new Error('Purchase: at least 1 consumer required')
    if (input.days <= 0 || !Number.isInteger(input.days))
      throw new Error('Purchase: days must be a positive integer')

    input.consumers.forEach((c) => {
      void Multiplier.of(c.multiplier)
    })

    const totalDaily = input.consumers.reduce(
      (sum, c) => sum + input.dailyConsumption * c.multiplier,
      0,
    )
    const totalQuantity =
      unit === SHARED_UNIT
        ? Math.round(input.quantity * 100) / 100
        : Math.round(totalDaily * input.days * 100) / 100

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
      group: input.group?.trim() ? input.group.trim().slice(0, 50) : null,
    })
  }

  editBring(input: {
    item: string
    quantity: number
    unit: string
    group: string | null
    broughtBy: string | null
  }): Purchase {
    const item = input.item.trim()
    if (item.length < 2 || item.length > 50) throw new Error('Purchase: item must be 2..50 chars')
    const unit = validateUnit(input.unit)
    if (input.quantity <= 0 || input.quantity > 10_000)
      throw new Error('Purchase: quantity must be in (0, 10000]')

    return new Purchase({
      ...this.s,
      kind: 'bring',
      item,
      quantity: input.quantity,
      unit,
      totalQuantity: input.quantity,
      assignedTo: input.broughtBy,
      group: input.group?.trim() ? input.group.trim().slice(0, 50) : null,
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

  get id(): string { return this.s.id }
  get kind(): 'buy' | 'bring' { return this.s.kind }
  get deleted(): boolean { return this.s.deleted }
  get deletedBy(): string | null { return this.s.deletedBy }
  get deleteReason(): string | null { return this.s.deleteReason }
  get totalQuantity(): number { return this.s.totalQuantity }
  get createdBy(): string { return this.s.createdBy }
  get assignedTo(): string | null { return this.s.assignedTo }
  get purchased(): boolean { return this.s.purchased }
  get boughtQuantity(): number { return this.s.boughtQuantity }
  get group(): string | null { return this.s.group }

  toSnapshot(): PurchaseSnapshot { return { ...this.s, consumers: [...this.s.consumers] } }
}
