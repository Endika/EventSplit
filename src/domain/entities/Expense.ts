import { uuidv7 } from 'uuidv7'
import { Money } from '@/domain/value-objects/Money'

export interface ExpenseSnapshot {
  id: string
  paidBy: string
  cents: number
  currency: 'EUR'
  description: string
  purchaseId: string | null
  date: string
  createdAt: string
  splitAmong: string[]  // empty array means "all current participants"
  deleted: boolean
  deletedBy: string | null
  deletedAt: string | null
}

export class Expense {
  private constructor(private readonly s: ExpenseSnapshot) {}

  static create(input: {
    paidBy: string
    amount: Money
    description: string
    purchaseId?: string | null
    date?: Date
    splitAmong?: string[]
  }): Expense {
    const description = input.description.trim()
    if (description.length < 3 || description.length > 100)
      throw new Error('Expense: description must be 3..100 chars')
    if (input.amount.cents <= 0) throw new Error('Expense: amount must be > 0')
    const splitAmong = input.splitAmong ?? []
    if (new Set(splitAmong).size !== splitAmong.length)
      throw new Error('Expense: splitAmong must contain unique userIds')
    return new Expense({
      id: uuidv7(),
      paidBy: input.paidBy,
      cents: input.amount.cents,
      currency: 'EUR',
      description,
      purchaseId: input.purchaseId ?? null,
      date: (input.date ?? new Date()).toISOString(),
      createdAt: new Date().toISOString(),
      splitAmong,
      deleted: false,
      deletedBy: null,
      deletedAt: null,
    })
  }

  static restore(
    s: ExpenseSnapshot | Omit<ExpenseSnapshot, 'splitAmong' | 'deleted' | 'deletedBy' | 'deletedAt'>,
  ): Expense {
    const full = s as ExpenseSnapshot
    return new Expense({
      ...full,
      splitAmong: full.splitAmong ?? [],
      deleted: full.deleted ?? false,
      deletedBy: full.deletedBy ?? null,
      deletedAt: full.deletedAt ?? null,
    })
  }

  edit(input: {
    paidBy: string
    amount: Money
    description: string
    purchaseId?: string | null
    date?: Date
    splitAmong?: string[]
  }): Expense {
    const description = input.description.trim()
    if (description.length < 3 || description.length > 100)
      throw new Error('Expense: description must be 3..100 chars')
    if (input.amount.cents <= 0) throw new Error('Expense: amount must be > 0')
    const splitAmong = input.splitAmong ?? this.s.splitAmong
    if (new Set(splitAmong).size !== splitAmong.length)
      throw new Error('Expense: splitAmong must contain unique userIds')
    return new Expense({
      ...this.s,
      paidBy: input.paidBy,
      cents: input.amount.cents,
      description,
      purchaseId: input.purchaseId ?? this.s.purchaseId,
      date: input.date ? input.date.toISOString() : this.s.date,
      splitAmong,
    })
  }

  softDelete(input: { by: string }): Expense {
    return new Expense({
      ...this.s,
      deleted: true,
      deletedBy: input.by,
      deletedAt: new Date().toISOString(),
    })
  }

  recover(): Expense {
    return new Expense({
      ...this.s,
      deleted: false,
      deletedBy: null,
      deletedAt: null,
    })
  }

  get id(): string { return this.s.id }
  get paidBy(): string { return this.s.paidBy }
  get amount(): Money { return Money.fromCents(this.s.cents) }
  get deleted(): boolean { return this.s.deleted }

  toSnapshot(): ExpenseSnapshot { return { ...this.s, splitAmong: [...this.s.splitAmong] } }
}
