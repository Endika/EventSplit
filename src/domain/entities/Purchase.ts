import { uuidv7 } from 'uuidv7'
import { Multiplier } from '@/domain/value-objects/Multiplier'

export interface PurchaseConsumer {
  userId: string
  multiplier: number
}

export interface PurchaseSnapshot {
  id: string
  createdBy: string
  category: string
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
}

const VALID_CATEGORIES = ['food', 'drinks', 'snacks', 'other'] as const
const VALID_UNITS = ['units', 'bottles', 'cans', 'kg', 'liters'] as const

export class Purchase {
  private constructor(private readonly s: PurchaseSnapshot) {}

  static create(input: {
    createdBy: string
    category: string
    item: string
    quantity: number
    unit: string
    dailyConsumption: number
    consumers: PurchaseConsumer[]
    days: number
  }): Purchase {
    const item = input.item.trim()
    if (item.length < 2 || item.length > 50) throw new Error('Purchase: item must be 2..50 chars')
    if (!VALID_CATEGORIES.includes(input.category as never))
      throw new Error('Purchase: invalid category')
    if (!VALID_UNITS.includes(input.unit as never))
      throw new Error('Purchase: invalid unit')
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
    const totalQuantity = totalDaily * input.days

    return new Purchase({
      id: uuidv7(),
      createdBy: input.createdBy,
      category: input.category,
      item,
      quantity: input.quantity,
      unit: input.unit,
      dailyConsumption: input.dailyConsumption,
      totalQuantity,
      consumers: input.consumers,
      deleted: false,
      deletedBy: null,
      deletedAt: null,
      deleteReason: null,
      createdAt: new Date().toISOString(),
    })
  }

  static restore(s: PurchaseSnapshot): Purchase {
    return new Purchase(s)
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

  get id(): string { return this.s.id }
  get deleted(): boolean { return this.s.deleted }
  get deletedBy(): string | null { return this.s.deletedBy }
  get deleteReason(): string | null { return this.s.deleteReason }
  get totalQuantity(): number { return this.s.totalQuantity }
  get createdBy(): string { return this.s.createdBy }

  toSnapshot(): PurchaseSnapshot { return { ...this.s, consumers: [...this.s.consumers] } }
}
